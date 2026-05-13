import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Clock, Loader2, FileUp, Download, Search, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  transactionId: string;
  type: string;
  name: string;
  email: string;
  status: string;
}

interface ReconciliationCompareResult {
  matched: Array<{
    imported: ImportedTransaction;
    recorded: any;
    matchType: "exact" | "amount" | "name";
  }>;
  unmatchedImported: ImportedTransaction[];
  unmatchedRecorded: any[];
}

export default function PaymentReconciliation() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [reconcileAction, setReconcileAction] = useState<"approve" | "reject" | null>(null);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("pending");
  
  // CSV Import state
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [compareResult, setCompareResult] = useState<ReconciliationCompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch pending reconciliation items
  const { data: reconciliationData, refetch } = trpc.paymentReconciliation.getPendingReconciliation.useQuery({
    limit,
    offset,
  });

  // Fetch summary
  const { data: summaryData } = trpc.paymentReconciliation.getSummary.useQuery();
  
  // Fetch all payment events for comparison
  const paymentEventsQuery = trpc.paymentEvents.getAll.useQuery({
    limit: 1000,
    eventType: "payment_received",
  });
  
  // CSV parsing functions
  const parsePayPalCSV = (content: string): ImportedTransaction[] => {
    const lines = content.split("\n");
    const transactions: ImportedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanFields = fields.map(f => f.replace(/^"|"$/g, "").trim());
      if (cleanFields.length >= 13) {
        const gross = parseFloat(cleanFields[7]?.replace(/[^0-9.-]/g, "") || "0");
        if (gross > 0) {
          transactions.push({
            date: cleanFields[0],
            description: cleanFields[4] || "Payment",
            amount: gross,
            transactionId: cleanFields[12],
            type: cleanFields[4],
            name: cleanFields[3],
            email: cleanFields[10],
            status: cleanFields[5],
          });
        }
      }
    }
    return transactions;
  };

  const parseVenmoCSV = (content: string): ImportedTransaction[] => {
    const lines = content.split("\n");
    const transactions: ImportedTransaction[] = [];
    let dataStartIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("ID,") || lines[i].includes("Datetime,")) {
        dataStartIndex = i + 1;
        break;
      }
    }
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanFields = fields.map(f => f.replace(/^"|"$/g, "").trim());
      if (cleanFields.length >= 8) {
        const amount = parseFloat(cleanFields[7]?.replace(/[^0-9.-]/g, "") || "0");
        if (amount > 0) {
          transactions.push({
            date: cleanFields[1],
            description: cleanFields[4] || "Payment",
            amount: amount,
            transactionId: cleanFields[0],
            type: cleanFields[2],
            name: cleanFields[5],
            email: "",
            status: cleanFields[3],
          });
        }
      }
    }
    return transactions;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let transactions: ImportedTransaction[] = [];
      if (content.includes("PayPal") || content.includes("From Email Address")) {
        transactions = parsePayPalCSV(content);
        toast.success(`Imported ${transactions.length} transactions`);
      } else if (content.includes("Venmo") || content.includes("@")) {
        transactions = parseVenmoCSV(content);
        toast.success(`Imported ${transactions.length} Venmo transactions`);
      } else {
        transactions = parsePayPalCSV(content);
        toast.info(`Imported ${transactions.length} transactions (generic format)`);
      }
      setImportedTransactions(transactions);
      setCompareResult(null);
    };
    reader.readAsText(file);
  };

  const runComparison = () => {
    if (importedTransactions.length === 0) {
      toast.error("Please import transactions first");
      return;
    }
    setIsComparing(true);
    const recordedPayments = (paymentEventsQuery.data?.events || []) as any[];
    const result: ReconciliationCompareResult = {
      matched: [],
      unmatchedImported: [...importedTransactions],
      unmatchedRecorded: [...recordedPayments],
    };
    // Match by transaction ID first
    for (const imported of importedTransactions) {
      const matchIndex = result.unmatchedRecorded.findIndex(
        r => r.transactionId && r.transactionId === imported.transactionId
      );
      if (matchIndex !== -1) {
        result.matched.push({ imported, recorded: result.unmatchedRecorded[matchIndex], matchType: "exact" });
        result.unmatchedRecorded.splice(matchIndex, 1);
        result.unmatchedImported = result.unmatchedImported.filter(t => t.transactionId !== imported.transactionId);
      }
    }
    // Match by amount and date
    for (const imported of [...result.unmatchedImported]) {
      const matchIndex = result.unmatchedRecorded.findIndex(r => {
        const recordedAmount = parseFloat(r.grossAmount || r.amount || "0");
        const amountMatch = Math.abs(recordedAmount - imported.amount) < 0.01;
        const importedDate = new Date(imported.date);
        const recordedDate = new Date(r.createdAt);
        const daysDiff = Math.abs((importedDate.getTime() - recordedDate.getTime()) / (1000 * 60 * 60 * 24));
        return amountMatch && daysDiff <= 3;
      });
      if (matchIndex !== -1) {
        result.matched.push({ imported, recorded: result.unmatchedRecorded[matchIndex], matchType: "amount" });
        result.unmatchedRecorded.splice(matchIndex, 1);
        result.unmatchedImported = result.unmatchedImported.filter(t => t.transactionId !== imported.transactionId);
      }
    }
    setCompareResult(result);
    setIsComparing(false);
    toast.success(`Comparison complete: ${result.matched.length} matched, ${result.unmatchedImported.length} unmatched imports, ${result.unmatchedRecorded.length} unmatched records`);
  };

  const exportComparisonResults = () => {
    if (!compareResult) return;
    let csv = "Type,Status,Imported Date,Imported Amount,Imported Name,Recorded Client,Recorded Amount,Transaction ID,Match Type\n";
    for (const match of compareResult.matched) {
      csv += `Matched,✓,${match.imported.date},${match.imported.amount},${match.imported.name},${match.recorded.clientName || ""},${match.recorded.grossAmount || match.recorded.amount},${match.imported.transactionId},${match.matchType}\n`;
    }
    for (const imported of compareResult.unmatchedImported) {
      csv += `Unmatched Import,⚠,${imported.date},${imported.amount},${imported.name},,,,\n`;
    }
    for (const recorded of compareResult.unmatchedRecorded) {
      csv += `Unmatched Record,⚠,,,${recorded.clientName || ""},${recorded.grossAmount || recorded.amount},${recorded.transactionId || ""},\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-reconciliation-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reconciliation report exported");
  };

  // Mutations
  const approveMutation = trpc.paymentReconciliation.approvePayment.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Payment approved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve payment");
    },
  });

  const rejectMutation = trpc.paymentReconciliation.rejectPayment.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Payment rejected");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject payment");
    },
  });

  const bulkReconcileMutation = trpc.paymentReconciliation.bulkReconcile.useMutation({
    onSuccess: (data) => {
      setIsProcessing(false);
      setReconcileDialogOpen(false);
      setSelectedIds([]);
      refetch();
      toast.success(`${data.successful} payment(s) ${reconcileAction === "approve" ? "approved" : "rejected"}`);
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error(error.message || "Failed to process reconciliation");
    },
  });

  const handleBulkReconcile = () => {
    if (selectedIds.length === 0 || !reconcileAction) return;
    setIsProcessing(true);
    bulkReconcileMutation.mutate({
      protocolIds: selectedIds,
      action: reconcileAction,
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (reconciliationData?.items) {
      if (selectedIds.length === reconciliationData.items.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(reconciliationData.items.map((item) => item.id));
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Payment Reconciliation</h1>
            <p className="text-gray-600 mt-2">Review pending payments and compare with Venmo exports</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending Payments</TabsTrigger>
            <TabsTrigger value="compare">CSV Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="compare" className="space-y-4">
            {/* CSV Import Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-blue-500" />
                  Import & Compare Transactions
                </CardTitle>
                <CardDescription>
                  Upload a CSV export from Venmo to compare against recorded payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                    <FileUp className="w-4 h-4 mr-2" />
                    Upload Venmo CSV
                  </Button>
                  <Button onClick={runComparison} disabled={importedTransactions.length === 0 || isComparing}>
                    {isComparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Run Comparison
                  </Button>
                  {compareResult && (
                    <Button onClick={exportComparisonResults} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Results
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-blue-600">{importedTransactions.length}</div>
                      <p className="text-xs text-blue-800">Imported</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-purple-600">{paymentEventsQuery.data?.events?.length || 0}</div>
                      <p className="text-xs text-purple-800">Recorded</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-green-600">{compareResult?.matched.length || 0}</div>
                      <p className="text-xs text-green-800">Matched</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50">
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-amber-600">{compareResult ? compareResult.unmatchedImported.length + compareResult.unmatchedRecorded.length : 0}</div>
                      <p className="text-xs text-amber-800">Discrepancies</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
            
            {/* Comparison Results */}
            {compareResult && (
              <div className="space-y-4">
                {compareResult.matched.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Matched Transactions ({compareResult.matched.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Match Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareResult.matched.slice(0, 10).map((match, i) => (
                            <TableRow key={i}>
                              <TableCell>{match.imported.date}</TableCell>
                              <TableCell>{match.imported.name}</TableCell>
                              <TableCell>${match.imported.amount.toFixed(2)}</TableCell>
                              <TableCell><Badge variant="outline">{match.matchType === "exact" ? "ID Match" : "Amount Match"}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {compareResult.matched.length > 10 && <p className="text-sm text-gray-500 mt-2">...and {compareResult.matched.length - 10} more</p>}
                    </CardContent>
                  </Card>
                )}
                
                {compareResult.unmatchedImported.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader>
                      <CardTitle className="text-amber-600 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Unmatched Imports ({compareResult.unmatchedImported.length})
                      </CardTitle>
                      <CardDescription>Transactions in your import that aren't recorded in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Transaction ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareResult.unmatchedImported.slice(0, 10).map((tx, i) => (
                            <TableRow key={i}>
                              <TableCell>{tx.date}</TableCell>
                              <TableCell>{tx.name}</TableCell>
                              <TableCell className="text-amber-600 font-semibold">${tx.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-xs">{tx.transactionId}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                
                {compareResult.unmatchedRecorded.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        Unmatched Records ({compareResult.unmatchedRecorded.length})
                      </CardTitle>
                      <CardDescription>Payments recorded in the system that aren't in your import</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareResult.unmatchedRecorded.slice(0, 10).map((record, i) => (
                            <TableRow key={i}>
                              <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>{record.clientName || "Unknown"}</TableCell>
                              <TableCell className="text-red-600 font-semibold">${parseFloat(record.grossAmount || record.amount || "0").toFixed(2)}</TableCell>
                              <TableCell>{record.paymentMethod || "Unknown"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending" className="space-y-4">

        {/* Summary Cards */}
        {summaryData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.totalPending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Overdue 3+ Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summaryData.overdue3Days}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Overdue 7+ Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summaryData.overdue7Days}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-blue-900">{selectedIds.length} items selected</CardTitle>
                  <CardDescription className="text-blue-800">
                    Choose an action to reconcile these payments
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setReconcileAction("approve");
                      setReconcileDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setReconcileAction("reject");
                      setReconcileDialogOpen(true);
                    }}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Pending Reconciliation Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Reconciliation</CardTitle>
            <CardDescription>
              {reconciliationData?.items?.length || 0} of {reconciliationData?.total || 0} pending payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reconciliationData?.items && reconciliationData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            reconciliationData.items.length > 0 &&
                            selectedIds.length === reconciliationData.items.length
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.clientName}</TableCell>
                        <TableCell>{item.clientEmail || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.paymentMethod === "paypal" ? "PayPal" : item.paymentMethod === "venmo" ? "Venmo" : "Other"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={item.daysOverdue > 7 ? "text-red-600 font-semibold" : item.daysOverdue > 3 ? "text-yellow-600 font-semibold" : ""}>
                            {item.daysOverdue} days
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate({ protocolId: item.id })}
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => rejectMutation.mutate({ protocolId: item.id })}
                              disabled={rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No pending reconciliation items</div>
            )}

            {/* Pagination */}
            {reconciliationData && reconciliationData.total > limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Page {Math.floor(offset / limit) + 1} of {Math.ceil(reconciliationData.total / limit)}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOffset(offset + limit)}
                    disabled={!reconciliationData.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reconciliation Confirmation Dialog */}
      <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reconcileAction === "approve" ? "Approve Payments?" : "Reject Payments?"}
            </DialogTitle>
            <DialogDescription>
              This will {reconcileAction === "approve" ? "mark" : "mark as failed"} {selectedIds.length} payment(s).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkReconcile}
              disabled={isProcessing}
              variant={reconcileAction === "approve" ? "default" : "destructive"}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
