import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Eye,
  Edit,
  ExternalLink,
  Copy,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Calendar,
  User,
  Package,
  Mail,
  Download,
  CheckSquare,
  Square,
  Send,
  Trash2,
  Archive,
  AlertTriangle,
} from "lucide-react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { format } from "date-fns";

type StatusFilter = 'all' | 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed';
type PaymentFilter = 'all' | 'pending' | 'paid' | 'partial';
type DurationFilter = 'all' | 'protocol_only' | '1_month' | '3_months' | '12_months';

export default function ClientProtocols() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkReminderDialogOpen, setBulkReminderDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: clients, isLoading, refetch } = trpc.clientProtocol.list.useQuery({ filter: 'active' });
  const { data: allItems } = trpc.protocolItem.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  
  const updateMutation = trpc.clientProtocol.update.useMutation();
  const sendPaymentLinkMutation = trpc.clientProtocol.sendPaymentLink.useMutation();

  // Filter and search protocols
  const filteredProtocols = useMemo(() => {
    if (!clients) return [];

    return clients.filter((client) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        client.clientName.toLowerCase().includes(searchLower) ||
        (client.clientEmail && client.clientEmail.toLowerCase().includes(searchLower));

      // Status filter
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      // Payment filter
      const matchesPayment = paymentFilter === 'all' || 
        (paymentFilter === 'paid' && client.paymentStatus === 'paid') ||
        (paymentFilter === 'pending' && (!client.paymentStatus || client.paymentStatus === 'pending')) ||
        (paymentFilter === 'partial' && (client.paymentStatus as string) === 'partial');

      // Duration filter
      const matchesDuration = durationFilter === 'all' ||
        (durationFilter === 'protocol_only' && client.durationMonths === 0) ||
        (durationFilter === '1_month' && client.durationMonths === 1) ||
        (durationFilter === '3_months' && client.durationMonths === 3) ||
        (durationFilter === '12_months' && client.durationMonths === 12);

      return matchesSearch && matchesStatus && matchesPayment && matchesDuration;
    });
  }, [clients, searchQuery, statusFilter, paymentFilter, durationFilter]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProtocols.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProtocols.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const isAllSelected = filteredProtocols.length > 0 && selectedIds.length === filteredProtocols.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredProtocols.length;

  // Bulk status change
  const handleBulkStatusChange = async () => {
    if (!newStatus || selectedIds.length === 0) return;
    
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await updateMutation.mutateAsync({ id, status: newStatus as "draft" | "pending_approval" | "approved" | "active" | "completed" });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsProcessing(false);
    setBulkStatusDialogOpen(false);
    setSelectedIds([]);
    setNewStatus("");
    refetch();

    if (errorCount === 0) {
      toast.success(`Successfully updated ${successCount} protocol(s)`);
    } else {
      toast.warning(`Updated ${successCount} protocol(s), ${errorCount} failed`);
    }
  };

  // Bulk send reminders
  const handleBulkSendReminders = async () => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        await sendPaymentLinkMutation.mutateAsync({ id });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsProcessing(false);
    setBulkReminderDialogOpen(false);
    setSelectedIds([]);

    if (errorCount === 0) {
      toast.success(`Successfully sent ${successCount} reminder(s)`);
    } else {
      toast.warning(`Sent ${successCount} reminder(s), ${errorCount} failed`);
    }
  };

  // Export selected protocols to CSV
  const handleExportCSV = () => {
    const selectedProtocols = filteredProtocols.filter(p => selectedIds.includes(p.id));
    
    const headers = ['Client Name', 'Email', 'Status', 'Payment Status', 'Duration', 'Created', 'Updated'];
    const rows = selectedProtocols.map(p => [
      p.clientName,
      p.clientEmail || '',
      p.status,
      p.paymentStatus || 'pending',
      getDurationDisplay(p.durationMonths),
      format(new Date(p.createdAt), "yyyy-MM-dd"),
      p.updatedAt ? format(new Date(p.updatedAt), "yyyy-MM-dd") : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `client-protocols-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success(`Exported ${selectedProtocols.length} protocol(s) to CSV`);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700"><AlertCircle className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get payment badge styling
  const getPaymentBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-100 text-amber-700">Partial</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Pending</Badge>;
    }
  };

  // Get duration display
  const getDurationDisplay = (months: number) => {
    if (months === 0) return "Protocol Only";
    if (months === 1) return "1 month";
    return `${months} months`;
  };

  // Copy protocol link
  const copyProtocolLink = (token: string) => {
    const link = `${window.location.origin}/protocol/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Protocol link copied to clipboard");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Client Protocols
            </h1>
            <p className="text-muted-foreground">
              View and manage all client protocols with quick access to edit and preview
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Filter */}
              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>

              {/* Duration Filter */}
              <Select value={durationFilter} onValueChange={(v) => setDurationFilter(v as DurationFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Durations</SelectItem>
                  <SelectItem value="protocol_only">Protocol Only</SelectItem>
                  <SelectItem value="1_month">1 Month</SelectItem>
                  <SelectItem value="3_months">3 Months</SelectItem>
                  <SelectItem value="12_months">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filters summary */}
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || durationFilter !== 'all') && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery("")}>
                    Search: {searchQuery} <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter('all')}>
                    Status: {statusFilter.replace('_', ' ')} <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {paymentFilter !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setPaymentFilter('all')}>
                    Payment: {paymentFilter} <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {durationFilter !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setDurationFilter('all')}>
                    Duration: {durationFilter.replace('_', ' ')} <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter('all');
                    setPaymentFilter('all');
                    setDurationFilter('all');
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedIds.length} protocol(s) selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkStatusDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkReminderDialogOpen(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminders
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProtocols.length} of {clients?.length || 0} protocols
          </p>
        </div>

        {/* Protocols Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={10} columns={8} />
              </div>
            ) : filteredProtocols.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No protocols found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || durationFilter !== 'all'
                    ? "Try adjusting your filters"
                    : "Create a new client to get started"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                      />
                    </TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProtocols.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${selectedIds.includes(client.id) ? 'bg-primary/5' : ''}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(client.id)}
                          onCheckedChange={() => toggleSelect(client.id)}
                          aria-label={`Select ${client.clientName}`}
                        />
                      </TableCell>
                      <TableCell onClick={() => setLocation(`/admin/clients/${client.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{client.clientName}</p>
                              {!client.isActiveVersion && (
                                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />Superseded
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{client.clientEmail || "No email"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getDurationDisplay(client.durationMonths)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>{getPaymentBadge(client.paymentStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(client.createdAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {client.updatedAt ? format(new Date(client.updatedAt), "MMM d, yyyy") : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/admin/clients/${client.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Protocol
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/protocol/${client.accessToken}`, '_blank')}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview as Client
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => copyProtocolLink(client.accessToken)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/protocol/${client.accessToken}`, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open in New Tab
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedIds.length} Protocol(s)</DialogTitle>
            <DialogDescription>
              Select a new status to apply to all selected protocols.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={!newStatus || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Reminders Dialog */}
      <Dialog open={bulkReminderDialogOpen} onOpenChange={setBulkReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Reminders</DialogTitle>
            <DialogDescription>
              This will send payment reminder emails to {selectedIds.length} client(s). 
              Only clients with pending payments will receive the reminder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Reminder Email Preview</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Each client will receive a personalized email with their protocol link and payment instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkSendReminders} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminders
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
