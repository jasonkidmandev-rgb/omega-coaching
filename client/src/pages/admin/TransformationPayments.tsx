import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  Mail,
  User,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Crown,
  Sparkles,
  Package,
  ExternalLink,
  Trash2,
} from "lucide-react";

type PaymentStatus = "pending" | "verified" | "rejected";

interface PendingPayment {
  id: number | string;
  enrollmentId: number;
  clientName: string;
  clientEmail: string;
  tier: string;
  amount: number;
  paymentMethod: string;
  venmoUsername: string | null;
  promoCode: string | null;
  originalAmount: number | null;
  discountAmount: number | null;
  status: PaymentStatus;
  adminNotes: string | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
  createdAt: string;
  source?: 'venmo_pending' | 'auto_verified';
  transactionId?: string | null;
}

export default function TransformationPayments() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PendingPayment | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch pending payments
  const { data: payments, isLoading, refetch } = trpc.transformation.getPendingPayments.useQuery();
  
  // Mutations
  const verifyPayment = trpc.transformation.verifyPendingPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment verified successfully!");
      refetch();
      setShowVerifyDialog(false);
      setSelectedPayment(null);
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to verify payment");
    },
  });

  const rejectPayment = trpc.transformation.rejectPendingPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment rejected");
      refetch();
      setShowVerifyDialog(false);
      setSelectedPayment(null);
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject payment");
    },
  });

  const deletePayment = trpc.transformation.deletePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment record deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete payment record");
    },
  });

  // Filter payments
  const filteredPayments = (payments || []).filter((payment: PendingPayment) => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      payment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.venmoUsername?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = (payments || []).filter((p: PendingPayment) => p.status === "pending").length;
  const autoVerifiedCount = (payments || []).filter((p: PendingPayment) => p.source === "auto_verified").length;

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "elite": return <Crown className="h-4 w-4 text-purple-500" />;
      case "flagship": return <Sparkles className="h-4 w-4 text-amber-500" />;
      default: return <Package className="h-4 w-4 text-slate-500" />;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      elite: "bg-purple-100 text-purple-700 border-purple-200",
      flagship: "bg-amber-100 text-amber-700 border-amber-200",
      essentials: "bg-slate-100 text-slate-700 border-slate-200",
    };
    const names: Record<string, string> = {
      elite: "Elite ($10,000)",
      flagship: "Flagship ($2,500)",
      essentials: "Essentials ($1,000)",
    };
    return (
      <Badge className={`${colors[tier] || colors.essentials} border`}>
        {getTierIcon(tier)}
        <span className="ml-1">{names[tier] || tier}</span>
      </Badge>
    );
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "verified":
        return <Badge className="bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 border border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
    }
  };

  const handleVerify = () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    verifyPayment.mutate({
      paymentId: Number(selectedPayment.id),
      adminNotes: adminNotes || undefined,
    });
    setIsProcessing(false);
  };

  const handleReject = () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    rejectPayment.mutate({
      paymentId: Number(selectedPayment.id),
      adminNotes: adminNotes || undefined,
    });
    setIsProcessing(false);
  };

  return (
    <AdminLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Header - mobile responsive */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 sm:py-0 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="text-gray-600 hover:text-gray-900 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Admin</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="hidden sm:block h-6 w-px bg-gray-200" />
              <h1 className="text-base sm:text-lg font-semibold text-gray-900">
                Coaching Payments
              </h1>
              <div className="flex gap-1.5 flex-wrap">
                {pendingCount > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs">
                    {pendingCount} pending
                  </Badge>
                )}
                {autoVerifiedCount > 0 && (
                  <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                    {autoVerifiedCount} auto-verified
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-gray-600 self-end sm:self-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Filters - mobile responsive */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or Venmo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="shrink-0 text-xs sm:text-sm"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                  className={`shrink-0 text-xs sm:text-sm ${statusFilter === "pending" ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Pending
                </Button>
                <Button
                  variant={statusFilter === "verified" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("verified")}
                  className={`shrink-0 text-xs sm:text-sm ${statusFilter === "verified" ? "bg-green-500 hover:bg-green-600" : ""}`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Verified
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("rejected")}
                  className={`shrink-0 text-xs sm:text-sm ${statusFilter === "rejected" ? "bg-red-500 hover:bg-red-600" : ""}`}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Rejected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-500">
                {statusFilter === "pending" 
                  ? "No pending payments awaiting verification"
                  : "No payments match your search criteria"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredPayments.map((payment: PendingPayment) => (
              <Card key={payment.id} className={`hover:shadow-md transition-shadow ${payment.status === "pending" ? "border-yellow-200 bg-yellow-50/30" : ""}`}>
                <CardContent className="pt-4 sm:pt-6 pb-4">
                  <div className="space-y-3">
                    {/* Name + Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{payment.clientName}</h3>
                      {getTierBadge(payment.tier)}
                      {getStatusBadge(payment.status)}
                    </div>
                    
                    {/* Details - stacked on mobile, grid on desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 min-w-0">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{payment.clientEmail || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4 shrink-0" />
                        <span className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</span>
                        {payment.promoCode && (
                          <span className="text-green-600 text-xs">
                            ({payment.promoCode} -${payment.discountAmount?.toLocaleString()})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="capitalize">{payment.paymentMethod}</span>
                        {payment.venmoUsername && (
                          <span className="text-blue-600">@{payment.venmoUsername}</span>
                        )}
                        {payment.source === 'auto_verified' && (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">Auto</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {payment.adminNotes && (
                      <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
                        <strong>Notes:</strong> {payment.adminNotes}
                      </div>
                    )}

                    {/* Action buttons - full width on mobile */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {payment.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50 flex-1 sm:flex-none"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowVerifyDialog(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowVerifyDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {payment.paymentMethod === "venmo" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open("https://venmo.com/", "_blank")}
                          className="flex-1 sm:flex-none"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open Venmo
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                        onClick={() => setDeleteTarget(payment)}
                        title="Delete test/dummy payment record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Verify/Reject Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="bg-white max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              Verify Payment
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Review and verify this transformation payment
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{selectedPayment.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Program:</span>
                  {getTierBadge(selectedPayment.tier)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-green-600">${selectedPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span>{selectedPayment.paymentMethod}</span>
                </div>
                {selectedPayment.venmoUsername && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Venmo:</span>
                    <span className="text-blue-600">@{selectedPayment.venmoUsername}</span>
                  </div>
                )}
              </div>

              {selectedPayment.paymentMethod === "venmo" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800 text-sm sm:text-base">Venmo Verification Required</p>
                      <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                        Please check your Venmo account to confirm you received ${selectedPayment.amount.toLocaleString()} 
                        {selectedPayment.venmoUsername && ` from @${selectedPayment.venmoUsername}`}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (optional)
                </label>
                <Textarea
                  placeholder="Add any notes about this verification..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowVerifyDialog(false);
                setSelectedPayment(null);
                setAdminNotes("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
              onClick={handleReject}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              onClick={handleVerify}
              disabled={isProcessing}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Verify Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="bg-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Payment Record
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              This is intended for removing test/dummy records.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-3 py-2">
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{deleteTarget.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">${deleteTarget.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="capitalize">{deleteTarget.status}</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {deleteTarget.source === "auto_verified"
                  ? "This will clear the payment fields on the enrollment (marking it unpaid). Only do this for test enrollments — a real client would lose their paid status."
                  : "This will permanently delete this payment record. This cannot be undone."}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deletePayment.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.source === "auto_verified") {
                  deletePayment.mutate({ source: "auto_verified", enrollmentId: deleteTarget.enrollmentId });
                } else {
                  deletePayment.mutate({ source: "venmo_pending", paymentId: Number(deleteTarget.id) });
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deletePayment.isPending ? "Deleting..." : "Delete Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
