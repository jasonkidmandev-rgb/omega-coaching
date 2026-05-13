import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Shield, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PaymentMethodSelectorProps {
  clientProtocolId: string;
  amount: string;
  currency?: string;
  description?: string;
  clientEmail?: string;
  clientName?: string;
  isPublic?: boolean;
  isTransformation?: boolean;
  enrollmentId?: number;
  tier?: string;
  promoCodeId?: number;
  promoCode?: string;
  originalAmount?: number;
  discountAmount?: number;
  vipConcierge?: boolean;
  vipConciergeFee?: number;
  planName?: string;
  onPaymentSuccess?: (method: string, orderId?: string) => void;
  onPaymentError?: (error: string) => void;
}

const PROCESSING_FEE_RATE = 0.035; // 3.5%

export function PaymentMethodSelector({
  amount,
  description,
  clientEmail,
  clientName,
  enrollmentId,
  tier,
  promoCodeId,
  promoCode,
  originalAmount,
  discountAmount,
  vipConcierge,
  vipConciergeFee,
  planName,
  onPaymentSuccess,
  onPaymentError,
}: PaymentMethodSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const createCheckout = trpc.transformation.createCheckoutSession.useMutation();

  const amountNum = parseFloat(amount);
  const processingFee = Math.round(amountNum * PROCESSING_FEE_RATE * 100) / 100;
  const grandTotal = amountNum + processingFee;

  const grandTotalFormatted = grandTotal.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const handleStripeCheckout = async () => {
    if (!enrollmentId || !tier || !clientEmail || !clientName) {
      const msg = "Missing required information. Please fill in all fields.";
      toast.error(msg);
      onPaymentError?.(msg);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createCheckout.mutateAsync({
        enrollmentId,
        tier: tier as any,
        planName: planName || description || "Coaching Program",
        amount: amountNum,
        customerEmail: clientEmail,
        customerName: clientName,
        vipConcierge: vipConcierge || false,
        vipConciergeFee: vipConciergeFee || 0,
        promoCode: promoCode || undefined,
        promoCodeId: promoCodeId || undefined,
        originalAmount: originalAmount || undefined,
        discountAmount: discountAmount || undefined,
      });

      if (result.checkoutUrl) {
        toast.info("Redirecting to secure checkout...");
        window.open(result.checkoutUrl, "_blank");
        setTimeout(() => {
          onPaymentSuccess?.("stripe", result.sessionId);
        }, 2000);
      } else {
        toast.error("Failed to create checkout session. Please try again.");
        onPaymentError?.("Failed to create checkout session. Please try again.");
      }
    } catch (err: any) {
      console.error("[PaymentMethodSelector] Stripe checkout error:", err);
      toast.error(err.message || "Payment processing failed. Please try again.");
      onPaymentError?.(err.message || "Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center pb-3">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <CreditCard className="w-5 h-5" />
          Secure Payment
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Breakdown */}
        <div className="py-3 bg-slate-50 rounded-lg px-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Program Fee</span>
            <span>${amountNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">CC Processing Fee (3.5%)</span>
            <span>${processingFee.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-slate-900">{grandTotalFormatted}</span>
          </div>
          {clientName && (
            <p className="text-xs text-muted-foreground text-center mt-1">for {clientName}</p>
          )}
        </div>

        {/* Stripe Checkout Button */}
        <Button
          onClick={handleStripeCheckout}
          disabled={isProcessing}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pay {grandTotalFormatted} with Card
            </>
          )}
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
          <Shield className="w-3.5 h-3.5 text-green-600" />
          <span>Secured by Stripe • 256-bit encryption • PCI compliant</span>
        </div>

        {/* Test Mode Notice (only in development) */}
        {import.meta.env.DEV && (
          <p className="text-xs text-center text-amber-600 bg-amber-50 rounded p-2">
            Test mode: Use card 4242 4242 4242 4242 with any future date and CVC
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentMethodSelector;
