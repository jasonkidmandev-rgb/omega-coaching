import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, RefreshCw, CreditCard, Calendar, Truck } from "lucide-react";

interface PaymentStatusWidgetProps {
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | null;
  paymentMethod: "stripe" | "paypal" | "venmo" | "cc" | "manual" | "other" | null;
  amount?: string;
  currency?: string;
  paymentDate?: Date | string | null;
  estimatedDeliveryDays?: number;
}

// PayPal Logo SVG Component
const PayPalLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#253B80"/>
    <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132l-.004.026-.875 5.551-.248 1.574a.694.694 0 0 0 .686.804h4.82c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.05c.346 1.524.346 3.15-.611 4.348z" fill="#179BD7"/>
  </svg>
);

// Venmo Logo SVG Component
const VenmoLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.214 1.5c.93 1.535 1.35 3.117 1.35 5.117 0 6.378-5.448 14.668-9.87 20.483H4.692L1.5 3.255l7.425-.698 1.89 15.143c1.757-2.864 3.93-7.353 3.93-10.423 0-1.908-.326-3.21-.885-4.28L21.214 1.5z" fill="#3D95CE"/>
  </svg>
);

/**
 * Payment Status Widget
 * Displays payment status, method, and estimated delivery for clients
 */
export function PaymentStatusWidget({
  paymentStatus,
  paymentMethod,
  amount,
  currency = "USD",
  paymentDate,
  estimatedDeliveryDays = 5,
}: PaymentStatusWidgetProps) {
  const getStatusConfig = () => {
    switch (paymentStatus) {
      case "paid":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          label: "Payment Received",
          badgeClass: "bg-green-100 text-green-800 border-green-200",
          description: "Your payment has been confirmed",
        };
      case "pending":
        return {
          icon: <Clock className="w-6 h-6 text-yellow-500" />,
          label: "Payment Pending",
          badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
          description: "Awaiting payment confirmation",
        };
      case "failed":
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          label: "Payment Failed",
          badgeClass: "bg-red-100 text-red-800 border-red-200",
          description: "There was an issue with your payment",
        };
      case "refunded":
        return {
          icon: <RefreshCw className="w-6 h-6 text-blue-500" />,
          label: "Refunded",
          badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
          description: "Your payment has been refunded",
        };
      default:
        return {
          icon: <CreditCard className="w-6 h-6 text-gray-400" />,
          label: "No Payment",
          badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
          description: "Payment not yet initiated",
        };
    }
  };

  const getPaymentMethodDisplay = () => {
    switch (paymentMethod) {
      case "stripe":
        return {
          icon: <CreditCard className="w-5 h-5 text-indigo-600" />,
          label: "Stripe",
        };
      case "paypal":
        return {
          icon: <PayPalLogo className="w-5 h-5" />,
          label: "PayPal (Legacy)",
        };
      case "venmo":
        return {
          icon: <VenmoLogo className="w-5 h-5" />,
          label: "Venmo (Legacy)",
        };
      case "cc":
      case "manual":
        return {
          icon: <CreditCard className="w-5 h-5 text-gray-600" />,
          label: paymentMethod === "cc" ? "Credit Card" : "Manual Payment",
        };
      default:
        return {
          icon: <CreditCard className="w-5 h-5 text-gray-400" />,
          label: "Other",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const methodDisplay = getPaymentMethodDisplay();

  // Calculate estimated delivery date
  const getEstimatedDelivery = () => {
    if (paymentStatus !== "paid" || !paymentDate) return null;
    const paidDate = typeof paymentDate === "string" ? new Date(paymentDate) : paymentDate;
    const deliveryDate = new Date(paidDate);
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDeliveryDays);
    return deliveryDate;
  };

  const estimatedDelivery = getEstimatedDelivery();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {statusConfig.icon}
            Payment Status
          </CardTitle>
          <Badge className={statusConfig.badgeClass} variant="outline">
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription>{statusConfig.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        {amount && (
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-semibold text-lg">
              ${parseFloat(amount).toFixed(2)} {currency}
            </span>
          </div>
        )}

        {/* Payment Method */}
        {paymentMethod && (
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Payment Method</span>
            <div className="flex items-center gap-2">
              {methodDisplay.icon}
              <span className="font-medium">{methodDisplay.label}</span>
            </div>
          </div>
        )}

        {/* Payment Date */}
        {paymentDate && paymentStatus === "paid" && (
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payment Date
            </span>
            <span className="font-medium">
              {new Date(paymentDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Estimated Delivery */}
        {estimatedDelivery && (
          <div className="flex items-center justify-between py-2 bg-green-50 rounded-lg px-3">
            <span className="text-sm text-green-700 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Estimated Delivery
            </span>
            <span className="font-semibold text-green-800">
              {estimatedDelivery.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Action prompts based on status */}
        {paymentStatus === "pending" && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Action Required:</strong> Please complete your payment to proceed with your protocol.
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>Payment Issue:</strong> Please try again or contact support for assistance.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
