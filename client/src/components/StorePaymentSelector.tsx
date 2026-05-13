import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, Loader2, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PricingTier {
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isDiscountable: boolean;
  maxQuantity: number;
  pricingTiers?: PricingTier[] | null;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode: string;
  phone?: string;
}

interface StorePaymentSelectorProps {
  cart: CartItem[];
  total: number;
  discountAmount: number;
  shippingFee: number;
  onPaymentSuccess?: (method: "stripe", orderId?: string) => void;
  onPaymentError?: (error: string) => void;
  onCancel?: () => void;
  shippingAddress?: ShippingAddress;
}

const PROCESSING_FEE_RATE = 0.035; // 3.5%

export default function StorePaymentSelector({
  cart,
  total,
  discountAmount,
  shippingFee,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
  shippingAddress,
}: StorePaymentSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const createStoreCheckout = trpc.orders.createStoreCheckoutSession.useMutation();

  const totalDollars = total / 100;
  const processingFee = Math.round(total * PROCESSING_FEE_RATE) / 100; // fee in dollars
  const grandTotal = totalDollars + processingFee;

  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    try {
      const result = await createStoreCheckout.mutateAsync({
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalCents: total,
        discountAmountCents: discountAmount,
        shippingFeeCents: shippingFee,
        shippingAddress: shippingAddress || undefined,
      });

      if (result.checkoutUrl) {
        toast.info("Redirecting to secure checkout...");
        window.open(result.checkoutUrl, "_blank");
        setTimeout(() => {
          onPaymentSuccess?.("stripe", result.sessionId);
        }, 2000);
      } else {
        onPaymentError?.("Failed to create checkout session. Please try again.");
      }
    } catch (err: any) {
      console.error("[StorePayment] Stripe checkout error:", err);
      onPaymentError?.(err.message || "Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="w-5 h-5" />
          Secure Payment
        </CardTitle>
        <CardDescription>
          Complete your purchase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
            <span>${((total - shippingFee + discountAmount) / 100).toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-${(discountAmount / 100).toFixed(2)}</span>
            </div>
          )}
          {shippingFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${(shippingFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>CC Processing Fee (3.5%)</span>
            <span>${processingFee.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Stripe Checkout Button */}
        <Button
          onClick={handleStripeCheckout}
          disabled={isProcessing || cart.length === 0}
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
              Pay ${grandTotal.toFixed(2)} with Card
            </>
          )}
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
          <Shield className="w-3.5 h-3.5 text-green-600" />
          <span>Secured by Stripe • 256-bit encryption • PCI compliant</span>
        </div>

        {onCancel && (
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Go Back
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
