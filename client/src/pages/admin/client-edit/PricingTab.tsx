import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneInput } from '@/components/ui/phone-input';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { StateSelect } from '@/components/ui/state-select';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Ban, CheckCircle, Clock, XCircle, RefreshCcw, DollarSign, AlertCircle, CreditCard, Banknote, Wallet, Receipt, MapPin, AlertTriangle, History, Mail, Calendar, Send, Zap } from "lucide-react";
import { FormData } from "./types";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, AlertOctagon, ArrowRight, ExternalLink } from "lucide-react";

// Payment History Section Component
function PaymentHistorySection({ clientProtocolId }: { clientProtocolId: number }) {
  const { data: events, isLoading } = trpc.paymentEvents.getByProtocol.useQuery(
    { clientProtocolId },
    { enabled: !!clientProtocolId }
  );

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "payment_received":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "payment_failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "payment_due":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case "reminder_sent":
        return <Mail className="w-4 h-4 text-amber-500" />;
      case "payment_refunded":
        return <RefreshCcw className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "payment_received": return "Payment Received";
      case "payment_failed": return "Payment Failed";
      case "payment_due": return "Payment Due";
      case "reminder_sent": return "Reminder Sent";
      case "payment_refunded": return "Refunded";
      case "payment_cancelled": return "Cancelled";
      case "status_changed": return "Status Changed";
      default: return eventType;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case "payment_received": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "payment_failed": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "payment_due": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "reminder_sent": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "payment_refunded": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg p-6 space-y-4 border border-slate-700">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-lg text-white">Payment History</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !events || events.length === 0 ? (
        <div className="text-center py-4 text-slate-400">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No payment events yet</p>
          <p className="text-xs text-slate-500">Events will appear here as they occur</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
              <div className="mt-0.5">{getEventIcon(event.eventType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getEventBadgeColor(event.eventType)}>
                    {getEventLabel(event.eventType)}
                  </Badge>
                  {event.amount && (
                    <span className="text-sm font-semibold text-green-400">
                      ${parseFloat(event.amount).toFixed(2)}
                    </span>
                  )}
                  {event.paymentMethod && (
                    <span className="text-xs text-slate-400">
                      via {event.paymentMethod === "paypal" ? "PayPal" : event.paymentMethod === "venmo" ? "Venmo" : event.paymentMethod === "cc" ? "Credit Card" : event.paymentMethod === "stripe" ? "Stripe" : event.paymentMethod.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {event.reminderType && (
                  <p className="text-xs text-slate-400 mt-1">
                    {event.reminderType.replace(/_/g, " ")} reminder
                    {event.emailSentTo && ` to ${event.emailSentTo}`}
                  </p>
                )}
                {event.notes && (
                  <p className="text-xs text-slate-400 mt-1 italic">
                    {event.notes}
                  </p>
                )}
                {/* Fee breakdown for payment_received events */}
                {event.eventType === "payment_received" && (event.grossAmount || event.feeAmount) && (
                  <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                    {event.grossAmount && (
                      <p>Gross: ${parseFloat(event.grossAmount).toFixed(2)}</p>
                    )}
                    {event.feeAmount && parseFloat(event.feeAmount) > 0 && (
                      <p className="text-red-400">Fee: -${parseFloat(event.feeAmount).toFixed(2)}</p>
                    )}
                    {event.netAmount && (
                      <p className="text-green-400 font-medium">Net: ${parseFloat(event.netAmount).toFixed(2)}</p>
                    )}
                  </div>
                )}
                {event.transactionId && (
                  <p className="text-xs text-slate-500 mt-1">
                    Ref: {event.transactionId}
                  </p>
                )}
              </div>
              <div className="text-xs text-slate-500 whitespace-nowrap">
                {format(new Date(event.createdAt), "MMM d, yyyy")}
                <br />
                {format(new Date(event.createdAt), "h:mm a")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Totals = {
  subtotal: number;
  discountableSubtotal: number;
  nonDiscountableSubtotal: number;
  clientBuysTotal: number;
  discount: number;
  coaching: number;
  total: number;
  ccFee: number;
};

type PricingTabProps = {
  clientId: number | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  totals: Totals;
  hidePricing: boolean;
  updateMutation: {
    mutate: (params: any) => void;
    isPending: boolean;
  };
  client?: {
    paymentStatus?: string | null;
    paymentReceivedAt?: Date | null;
    paymentMethod?: string | null;
    approvedAt?: Date | null;
    status?: string;
    clientName?: string;
    clientEmail?: string | null;
    shippingStreet?: string | null;
    shippingCity?: string | null;
    shippingState?: string | null;
    shippingZip?: string | null;
    shippingPhone?: string | null;
  } | null;
  onPaymentStatusChange?: () => void;
};

// Payment method options for external payments
const EXTERNAL_PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "check", label: "Check", icon: Receipt },
  { value: "zelle", label: "Zelle", icon: CreditCard },
  { value: "paypal_direct", label: "PayPal (Direct)", icon: Wallet },
  { value: "other", label: "Other", icon: DollarSign },
];

export default function PricingTab({
  clientId,
  formData,
  setFormData,
  totals,
  hidePricing,
  updateMutation,
  client,
  onPaymentStatusChange,
}: PricingTabProps) {
  const [isManualPaymentDialogOpen, setIsManualPaymentDialogOpen] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedPaymentAction, setSelectedPaymentAction] = useState<"paid" | "failed" | "refunded" | null>(null);
  
  // Enhanced payment recording state
  const [externalPaymentMethod, setExternalPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(""); // Gross amount (what client paid)
  const [feeAmount, setFeeAmount] = useState(""); // Processing fee
  const [netAmount, setNetAmount] = useState(""); // Amount received after fees
  const [shippingVerified, setShippingVerified] = useState(false);
  const [showInventoryPreview, setShowInventoryPreview] = useState(false);
  const [inventoryConfirmed, setInventoryConfirmed] = useState(false);
  const [packingSlipConfirmed, setPackingSlipConfirmed] = useState(false);

  // Coaching enrollment linked to this protocol (for status visibility)
  const enrollmentQuery = trpc.transformation.getEnrollmentByProtocolId.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );
  const enrollment = enrollmentQuery.data;

  // Reconciliation fix (admin can manually trigger when mismatch detected)
  const fixMismatchMutation = trpc.payment.fixPaymentMismatch.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onPaymentStatusChange?.();
    },
    onError: (err) => toast.error(`Fix failed: ${err.message}`),
  });

  // Inventory preview query
  const inventoryPreviewQuery = trpc.payment.previewInventoryDeductions.useQuery(
    { clientProtocolId: clientId?.toString() || "" },
    { enabled: showInventoryPreview && !!clientId }
  );

  // Packing slip preview query - shows what items will be on the packing slip
  const packingSlipPreviewQuery = trpc.packingSlip.previewForProtocol.useQuery(
    { clientProtocolId: clientId || 0 },
    { enabled: isManualPaymentDialogOpen && selectedPaymentAction === "paid" && !!clientId }
  );

  // Check if profile is complete
  const isProfileComplete = !!(
    client?.shippingStreet &&
    client?.shippingCity &&
    client?.shippingState &&
    client?.shippingZip &&
    client?.shippingPhone
  );

  // Payment mutations
  const markAsReceivedMutation = trpc.payment.markAsReceived.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded - protocol is now active and fulfillment triggered");
      setIsManualPaymentDialogOpen(false);
      resetPaymentForm();
      onPaymentStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update payment status");
    },
  });

  const markAsFailedMutation = trpc.payment.markAsFailed.useMutation({
    onSuccess: () => {
      toast.success("Payment marked as failed");
      setIsManualPaymentDialogOpen(false);
      resetPaymentForm();
      onPaymentStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update payment status");
    },
  });

  const resendConfirmationMutation = trpc.payment.resendPaymentConfirmation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Payment confirmation email sent!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend confirmation email");
    },
  });

  const markAsRefundedMutation = trpc.payment.markAsRefunded.useMutation({
    onSuccess: () => {
      toast.success("Payment marked as refunded");
      setIsManualPaymentDialogOpen(false);
      resetPaymentForm();
      onPaymentStatusChange?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update payment status");
    },
  });

  const resetPaymentForm = () => {
    setPaymentNotes("");
    setExternalPaymentMethod("cash");
    setPaymentReference("");
    setPaymentAmount("");
    setFeeAmount("");
    setNetAmount("");
    setShippingVerified(false);
    setShowInventoryPreview(false);
    setInventoryConfirmed(false);
    setPackingSlipConfirmed(false);
  };

  const handlePaymentAction = () => {
    if (!clientId || !selectedPaymentAction) return;

    const clientProtocolId = clientId.toString();

    // Build comprehensive notes for paid action
    let fullNotes = paymentNotes;
    if (selectedPaymentAction === "paid") {
      const methodLabel = EXTERNAL_PAYMENT_METHODS.find(m => m.value === externalPaymentMethod)?.label || externalPaymentMethod;
      const noteParts = [
        `Payment Method: ${methodLabel}`,
        paymentReference ? `Reference/Transaction ID: ${paymentReference}` : null,
        paymentAmount ? `Gross Amount: $${paymentAmount}` : null,
        feeAmount ? `Processing Fee: $${feeAmount}` : null,
        netAmount ? `Net Received: $${netAmount}` : null,
        paymentNotes ? `Notes: ${paymentNotes}` : null,
      ].filter(Boolean);
      fullNotes = noteParts.join(" | ");
    }

    switch (selectedPaymentAction) {
      case "paid":
        markAsReceivedMutation.mutate({ 
          clientProtocolId, 
          notes: fullNotes,
          // Fee tracking fields for accounting reconciliation
          grossAmount: paymentAmount || undefined,
          feeAmount: feeAmount || undefined,
          netAmount: netAmount || undefined,
          paymentMethod: externalPaymentMethod,
          transactionId: paymentReference || undefined,
        });
        break;
      case "failed":
        markAsFailedMutation.mutate({ clientProtocolId, reason: paymentNotes });
        break;
      case "refunded":
        markAsRefundedMutation.mutate({ clientProtocolId, reason: paymentNotes });
        break;
    }
  };

  const getPaymentStatusBadge = () => {
    const status = client?.paymentStatus || "pending";
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
            <RefreshCcw className="w-3 h-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const isActionPending = markAsReceivedMutation.isPending || markAsFailedMutation.isPending || markAsRefundedMutation.isPending;

  // Initialize payment amount from totals and trigger inventory preview
  const openRecordPaymentDialog = () => {
    setSelectedPaymentAction("paid");
    setPaymentAmount(totals.total.toFixed(2));
    setShowInventoryPreview(true);
    setIsManualPaymentDialogOpen(true);
  };

  return (
    <TabsContent value="pricing">
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Payment</CardTitle>
          <CardDescription>
            Configure pricing, discounts, and payment options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Status Section */}
          {clientId && (
            <div className="bg-slate-900 rounded-lg p-6 space-y-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Payment Status
                </h3>
                {getPaymentStatusBadge()}
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Payment Method:</span>
                  <span className="font-medium text-white">
                    {(() => {
                      const method = client?.paymentMethod || formData.paymentMethod;
                      if (!method) return "Not set";
                      if (method === "paypal") return "PayPal";
                      if (method === "venmo") return "Venmo";
                      if (method === "cc") return "Credit Card";
                      if (method === "stripe") return "Stripe (Online)";
                      return method.charAt(0).toUpperCase() + method.slice(1);
                    })()}
                  </span>
                </div>
                {client?.paymentReceivedAt && (
                  <div className="flex justify-between text-slate-300">
                    <span>Payment Received:</span>
                    <span className="font-medium text-white">
                      {new Date(client.paymentReceivedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {client?.approvedAt && (
                  <div className="flex justify-between text-slate-300">
                    <span>Protocol Approved:</span>
                    <span className="font-medium text-white">
                      {new Date(client.approvedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Completion Warning */}
              {!isProfileComplete && client?.paymentStatus !== "paid" && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">Incomplete Profile</p>
                      <p className="text-xs text-amber-300/80 mt-1">
                        Client's shipping address is incomplete. Please verify and update the shipping information below before recording payment.
                      </p>
                      <div className="mt-2 text-xs text-amber-300/60">
                        Missing: {[
                          !client?.shippingStreet && "Street",
                          !client?.shippingCity && "City",
                          !client?.shippingState && "State",
                          !client?.shippingZip && "ZIP",
                          !client?.shippingPhone && "Phone",
                        ].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Payment Override Section */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <div className="flex items-start gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Record External Payment</p>
                    <p className="text-xs text-slate-400">
                      Record payments received via cash, check, Zelle, or other methods outside the app
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {client?.paymentStatus !== "paid" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={openRecordPaymentDialog}
                    >
                      <Receipt className="w-4 h-4 mr-1" />
                      Record External Payment
                    </Button>
                  )}
                  {client?.paymentStatus === "pending" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedPaymentAction("failed");
                        setIsManualPaymentDialogOpen(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Mark as Failed
                    </Button>
                  )}
                  {client?.paymentStatus === "paid" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                        onClick={() => {
                          if (clientId) {
                            resendConfirmationMutation.mutate({ clientProtocolId: clientId });
                          }
                        }}
                        disabled={resendConfirmationMutation.isPending}
                      >
                        {resendConfirmationMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        Resend Payment Confirmation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                        onClick={() => {
                          setSelectedPaymentAction("refunded");
                          setIsManualPaymentDialogOpen(true);
                        }}
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        Mark as Refunded
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Coaching Enrollment Status (Stripe) */}
          {clientId && enrollment && (
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm text-white">Coaching Enrollment (Stripe)</h3>
                {enrollment.coachingFeePaid ? (
                  <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" /> Stripe Paid
                  </Badge>
                ) : (
                  <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                    <Clock className="w-3 h-3 mr-1" /> Not Paid
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>Enrollment ID:</span><span className="text-slate-200">#{enrollment.id}</span>
                <span>Tier:</span><span className="text-slate-200 capitalize">{enrollment.tier || "—"}</span>
                {enrollment.coachingFeeAmount && (
                  <><span>Amount:</span><span className="text-slate-200">${parseFloat(enrollment.coachingFeeAmount).toFixed(2)}</span></>
                )}
                {enrollment.coachingFeePaidAt && (
                  <><span>Paid At:</span><span className="text-slate-200">{new Date(enrollment.coachingFeePaidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>
                )}
                {enrollment.coachingFeeStripePaymentId && (
                  <><span>Stripe ID:</span><span className="text-slate-200 font-mono truncate">{enrollment.coachingFeeStripePaymentId}</span></>
                )}
              </div>

              {/* Mismatch alert: Stripe paid but protocol still pending */}
              {enrollment.coachingFeePaid && client?.paymentStatus !== "paid" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-400">Payment Sync Gap Detected</p>
                    <p className="text-xs text-red-300/80 mt-0.5">
                      Stripe recorded this payment but the protocol status was not updated. Click Fix to sync now.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 shrink-0"
                    disabled={fixMismatchMutation.isPending}
                    onClick={() => {
                      if (clientId) {
                        fixMismatchMutation.mutate({
                          clientProtocolId: clientId,
                          stripePaymentId: enrollment.coachingFeeStripePaymentId ?? undefined,
                        });
                      }
                    }}
                  >
                    {fixMismatchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Fix Now"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment History Section */}
          {clientId && <PaymentHistorySection clientProtocolId={clientId} />}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coachingPackage">Coaching Package</Label>
              <Input
                id="coachingPackage"
                value={formData.coachingPackage}
                onChange={(e) =>
                  setFormData({ ...formData, coachingPackage: e.target.value })
                }
                placeholder="Transformation 90 Day Protocol"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coachingPrice">Coaching Price ($)</Label>
              <Input
                id="coachingPrice"
                type="number"
                step="0.01"
                value={formData.coachingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, coachingPrice: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discountPercent}
                onChange={(e) =>
                  setFormData({ ...formData, discountPercent: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value: "stripe" | "paypal" | "manual" | "cc" | "other") =>
                  setFormData({ ...formData, paymentMethod: value })
                }
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="manual">Manual / External</SelectItem>
                  <SelectItem value="cc">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>



          {/* Pricing Summary */}
          {!hidePricing && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <h4 className="font-medium mb-3">Pricing Summary</h4>
              <div className="flex justify-between text-sm">
                <span>Products Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.clientBuysTotal > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Client Buys Separately:
                  </span>
                  <span className="line-through decoration-1">${totals.clientBuysTotal.toFixed(2)}</span>
                </div>
              )}
              {totals.nonDiscountableSubtotal > 0 && totals.discount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    Non-Discountable Items:
                  </span>
                  <span>${totals.nonDiscountableSubtotal.toFixed(2)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({formData.discountPercent}%):</span>
                  <span>-${totals.discount.toFixed(2)}</span>
                </div>
              )}
              {totals.coaching > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Coaching:</span>
                  <span>${totals.coaching.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total (CC +3.5%):</span>
                <span>${(totals.total + totals.ccFee).toFixed(2)}</span>
              </div>
              {hidePricing && totals.coaching > 0 && (
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Coaching Fee:</span>
                  <span>${totals.coaching.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Shipping Address */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Shipping Address
              {!isProfileComplete && (
                <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500">
                  Incomplete
                </Badge>
              )}
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shippingName">Recipient Name</Label>
                  <Input
                    id="shippingName"
                    value={formData.shippingName}
                    onChange={(e) =>
                      setFormData({ ...formData, shippingName: e.target.value })
                    }
                    placeholder="Full name for shipping"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingPhone">Phone Number *</Label>
                  <PhoneInput
                    id="shippingPhone"
                    value={formData.shippingPhone}
                    onChange={(value) =>
                      setFormData({ ...formData, shippingPhone: value })
                    }
                    showCountryCode={true}
                    className={!formData.shippingPhone ? "border-amber-500" : ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingStreet">Street Address *</Label>
                <AddressAutocomplete
                  id="shippingStreet"
                  value={formData.shippingStreet}
                  onChange={(value) => setFormData({ ...formData, shippingStreet: value })}
                  onAddressSelect={(address: AddressComponents) => {
                    setFormData({
                      ...formData,
                      shippingStreet: address.street,
                      shippingCity: address.city,
                      shippingState: address.state,
                      shippingZip: address.zip,
                      shippingCountry: address.country || 'USA'
                    });
                  }}
                  placeholder="Start typing address..."
                  className={!formData.shippingStreet ? "border-amber-500" : ""}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="shippingCity">City *</Label>
                  <Input
                    id="shippingCity"
                    value={formData.shippingCity}
                    onChange={(e) =>
                      setFormData({ ...formData, shippingCity: e.target.value })
                    }
                    placeholder="City"
                    className={!formData.shippingCity ? "border-amber-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingState">State *</Label>
                  <StateSelect
                    id="shippingState"
                    value={formData.shippingState}
                    onChange={(value) =>
                      setFormData({ ...formData, shippingState: value })
                    }
                    placeholder="Select state"
                    className={!formData.shippingState ? "border-amber-500" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingZip">ZIP Code *</Label>
                  <Input
                    id="shippingZip"
                    value={formData.shippingZip}
                    onChange={(e) =>
                      setFormData({ ...formData, shippingZip: e.target.value })
                    }
                    placeholder="90210"
                    className={!formData.shippingZip ? "border-amber-500" : ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCountry">Country</Label>
                <Input
                  id="shippingCountry"
                  value={formData.shippingCountry}
                  onChange={(e) =>
                    setFormData({ ...formData, shippingCountry: e.target.value })
                  }
                  placeholder="USA"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateMutation.mutate({
                  id: clientId!,
                  ...formData,
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              Save Pricing & Shipping
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Record External Payment Dialog */}
      <Dialog open={isManualPaymentDialogOpen} onOpenChange={(open) => {
        setIsManualPaymentDialogOpen(open);
        if (!open) resetPaymentForm();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPaymentAction === "paid" && (
                <>
                  <Receipt className="w-5 h-5 text-green-500" />
                  Record External Payment
                </>
              )}
              {selectedPaymentAction === "failed" && "Mark Payment as Failed"}
              {selectedPaymentAction === "refunded" && "Process Refund"}
            </DialogTitle>
            <DialogDescription>
              {selectedPaymentAction === "paid" && (
                <>
                  Record a payment received outside the app (cash, check, Zelle, etc.). This will mark the protocol as <strong>Active</strong> and trigger order fulfillment.
                </>
              )}
              {selectedPaymentAction === "failed" && (
                <>
                  This will mark the payment as failed. The client will need to retry payment.
                </>
              )}
              {selectedPaymentAction === "refunded" && (
                <>
                  This will mark the payment as refunded. Make sure you've processed the actual refund through your payment provider.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedPaymentAction === "paid" && (
              <>
                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={externalPaymentMethod} onValueChange={setExternalPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXTERNAL_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value} textValue={method.label}>
                          <div className="flex items-center gap-2">
                            <method.icon className="w-4 h-4" />
                            {method.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Reference */}
                <div className="space-y-2">
                  <Label htmlFor="paymentReference">
                    Reference / Transaction ID
                  </Label>
                  <Input
                    id="paymentReference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={
                      externalPaymentMethod === "paypal_direct" 
                        ? "e.g., PayPal transaction ID" 
                        : externalPaymentMethod === "check"
                        ? "e.g., Check #1234"
                        : "Reference number or ID"
                    }
                  />
                </div>

                {/* Payment Amount - Gross (what client paid) */}
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Gross Amount (What Client Paid) ($)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      // Auto-calculate net if fee is set
                      if (feeAmount) {
                        const gross = parseFloat(e.target.value) || 0;
                        const fee = parseFloat(feeAmount) || 0;
                        setNetAmount((gross - fee).toFixed(2));
                      }
                    }}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Expected: ${totals.total.toFixed(2)}
                  </p>
                </div>

                {/* Processing Fee - for accounting reconciliation */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-400">Fee Tracking for Reconciliation</span>
                    </div>
                    {externalPaymentMethod === "paypal_direct" && paymentAmount && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                        onClick={() => {
                          const gross = parseFloat(paymentAmount) || 0;
                          if (gross <= 0) return;
                          // PayPal standard rate: 3.49% + $0.49
                          const estimatedFee = gross * 0.0349 + 0.49;
                          const feeStr = estimatedFee.toFixed(2);
                          setFeeAmount(feeStr);
                          setNetAmount((gross - estimatedFee).toFixed(2));
                        }}
                      >
                        Estimate (3.49% + $0.49)
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="feeAmount" className="text-xs">Processing Fee ($)</Label>
                      <Input
                        id="feeAmount"
                        type="number"
                        step="0.01"
                        value={feeAmount}
                        onChange={(e) => {
                          setFeeAmount(e.target.value);
                          // Auto-calculate net
                          const gross = parseFloat(paymentAmount) || 0;
                          const fee = parseFloat(e.target.value) || 0;
                          setNetAmount((gross - fee).toFixed(2));
                        }}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="netAmount" className="text-xs">Net Amount Received ($)</Label>
                      <Input
                        id="netAmount"
                        type="number"
                        step="0.01"
                        value={netAmount}
                        onChange={(e) => setNetAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-8 bg-slate-800"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-400/70">
                    {externalPaymentMethod === "paypal_direct" 
                      ? "Standard rate: 3.49% + $0.49. Click Estimate for a quick calculation, or enter the actual fee from your transaction."
                      : externalPaymentMethod === "cash" || externalPaymentMethod === "check"
                      ? "No processing fees for cash/check payments. Leave blank or enter $0."
                      : "Enter the processing fee from your payment provider for accurate accounting reconciliation."
                    }
                  </p>
                </div>

                {/* Shipping Verification */}
                {!isProfileComplete && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-600">Shipping Address Incomplete</p>
                        <p className="text-xs text-amber-600/80 mt-1">
                          Please update the shipping address in the form below before recording payment.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="shippingVerified"
                    checked={shippingVerified}
                    onCheckedChange={(checked) => setShippingVerified(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="shippingVerified"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I have verified the shipping address is correct
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {client?.shippingStreet 
                        ? `${client.shippingStreet}, ${client.shippingCity}, ${client.shippingState} ${client.shippingZip}`
                        : "No shipping address on file"
                      }
                    </p>
                  </div>
                </div>

                {/* Packing Slip Preview - Shows exactly what will be shipped */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Packing Slip Preview</span>
                    <span className="text-xs text-muted-foreground">(Items that will be shipped)</span>
                  </div>
                  
                  {packingSlipPreviewQuery.isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading packing slip preview...</span>
                    </div>
                  ) : packingSlipPreviewQuery.data?.willCreatePackingSlip ? (
                    <div className="space-y-3">
                      {/* Info banner */}
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-emerald-600">Packing Slip Will Be Created</p>
                            <p className="text-xs text-emerald-600/80 mt-1">
                              {packingSlipPreviewQuery.data.totalItems} item(s) will be included in the packing slip for fulfillment.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium">Item</th>
                              <th className="text-center p-2 font-medium">Type</th>
                              <th className="text-center p-2 font-medium">Qty</th>
                              <th className="text-right p-2 font-medium">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {packingSlipPreviewQuery.data.items.map((item: any, idx: number) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">
                                  <div className="font-medium text-xs">{item.itemName}</div>
                                </td>
                                <td className="text-center p-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 capitalize">
                                    {item.itemType}
                                  </span>
                                </td>
                                <td className="text-center p-2">
                                  <span className="font-mono">{item.quantity}</span>
                                </td>
                                <td className="text-right p-2">
                                  <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 dark:bg-slate-800 border-t">
                            <tr>
                              <td colSpan={3} className="p-2 font-medium text-right">Total:</td>
                              <td className="p-2 font-bold text-right">${packingSlipPreviewQuery.data.totalAmount.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Confirmation checkbox */}
                      <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                          id="packingSlipConfirmed"
                          checked={packingSlipConfirmed}
                          onCheckedChange={(checked) => setPackingSlipConfirmed(checked === true)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="packingSlipConfirmed"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I confirm these are the correct items to ship
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Review the items above carefully. If incorrect, go to Protocol Items tab and adjust the enabled items.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>No packing slip will be created for this order.</span>
                      </div>
                      <p className="text-xs mt-1 ml-6">
                        {packingSlipPreviewQuery.data?.reason || 'No shippable items in protocol'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Inventory Deduction Preview */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Inventory Deduction Preview</span>
                  </div>
                  
                  {inventoryPreviewQuery.isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading inventory...</span>
                    </div>
                  ) : inventoryPreviewQuery.data?.items && inventoryPreviewQuery.data.items.length > 0 ? (
                    <div className="space-y-3">
                      {/* Warning banners */}
                      {inventoryPreviewQuery.data.hasInsufficientStock && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertOctagon className="w-4 h-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-600">Insufficient Stock</p>
                              <p className="text-xs text-red-600/80 mt-1">
                                Some items don't have enough inventory. Proceeding will result in negative stock.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {inventoryPreviewQuery.data.hasLowStockWarnings && !inventoryPreviewQuery.data.hasInsufficientStock && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-600">Low Stock Warning</p>
                              <p className="text-xs text-amber-600/80 mt-1">
                                Some items will fall below their low stock threshold after this order.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items table */}
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium">Item</th>
                              <th className="text-center p-2 font-medium">Current</th>
                              <th className="text-center p-2 font-medium"></th>
                              <th className="text-center p-2 font-medium">After</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryPreviewQuery.data.items.map((item, idx) => (
                              <tr key={idx} className={`border-t ${
                                !item.hasEnoughStock ? 'bg-red-50 dark:bg-red-900/20' : 
                                item.lowStockWarning ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                              }`}>
                                <td className="p-2">
                                  <div className="font-medium text-xs">{item.inventoryItemName}</div>
                                  <div className="text-xs text-muted-foreground">{item.protocolItemName}</div>
                                </td>
                                <td className="text-center p-2">
                                  <span className="font-mono">{item.currentStock}</span>
                                </td>
                                <td className="text-center p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-red-500 text-xs">-{item.quantityToDeduct}</span>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                </td>
                                <td className="text-center p-2">
                                  <span className={`font-mono ${
                                    !item.hasEnoughStock ? 'text-red-600 font-bold' : 
                                    item.lowStockWarning ? 'text-amber-600' : 'text-green-600'
                                  }`}>
                                    {item.newStock}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Confirmation checkbox */}
                      <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                          id="inventoryConfirmed"
                          checked={inventoryConfirmed}
                          onCheckedChange={(checked) => setInventoryConfirmed(checked === true)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="inventoryConfirmed"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            I confirm the inventory deductions above
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {inventoryPreviewQuery.data.totalItemsToDeduct} item(s) will be deducted from inventory
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>No inventory items will be deducted for this order.</span>
                      </div>
                      <p className="text-xs mt-1 ml-6">
                        Protocol items may not be mapped to inventory, or all items are excluded.
                      </p>
                    </div>
                  )}

                  {/* Unmapped Items Warning */}
                  {(inventoryPreviewQuery.data as any)?.unmappedItems && (inventoryPreviewQuery.data as any).unmappedItems.length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="w-full">
                          <p className="text-sm font-medium text-orange-600">
                            {(inventoryPreviewQuery.data as any).unmappedItems.length} Unmapped Item{(inventoryPreviewQuery.data as any).unmappedItems.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-orange-600/80 mt-1">
                            These protocol items are NOT mapped to inventory and will NOT be deducted. Go to Inventory → Mapping to fix.
                          </p>
                          <div className="mt-2 space-y-1">
                            {(inventoryPreviewQuery.data as any).unmappedItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1">
                                <span className="text-orange-700 dark:text-orange-300 font-medium">{item.protocolItemName}</span>
                                <span className="text-orange-600 dark:text-orange-400">qty: {item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Notes field for all actions */}
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">
                {selectedPaymentAction === "paid" ? "Additional Notes (optional)" : "Reason (optional)"}
              </Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder={
                  selectedPaymentAction === "paid"
                    ? "Any additional notes about this payment..."
                    : selectedPaymentAction === "failed"
                    ? "e.g., Payment declined by bank"
                    : "e.g., Client requested refund"
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsManualPaymentDialogOpen(false);
                resetPaymentForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentAction}
              disabled={
                isActionPending || 
                (selectedPaymentAction === "paid" && !shippingVerified) ||
                (selectedPaymentAction === "paid" && inventoryPreviewQuery.data?.items && inventoryPreviewQuery.data.items.length > 0 && !inventoryConfirmed) ||
                (selectedPaymentAction === "paid" && packingSlipPreviewQuery.data?.willCreatePackingSlip && !packingSlipConfirmed)
              }
              className={
                selectedPaymentAction === "paid"
                  ? "bg-green-600 hover:bg-green-700"
                  : selectedPaymentAction === "failed"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }
            >
              {isActionPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedPaymentAction === "paid" && "Record Payment"}
              {selectedPaymentAction === "failed" && "Mark as Failed"}
              {selectedPaymentAction === "refunded" && "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
