import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Loader2, AlertCircle, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomOrderPaymentSuccess() {
  const params = useParams<{ id: string }>();
  const orderId = parseInt(params.id || "0");
  const [status, setStatus] = useState<"loading" | "success" | "already_paid" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const capturePayment = trpc.customOrders.capturePaymentPublic.useMutation({
    onSuccess: (data) => {
      setOrderNumber(data.orderNumber || "");
      setStatus("success");
    },
    onError: (error) => {
      if (error.message.includes("already") || error.message.includes("paid")) {
        setStatus("already_paid");
      } else {
        setErrorMessage(error.message);
        setStatus("error");
      }
    },
  });

  useEffect(() => {
    if (orderId > 0) {
      capturePayment.mutate({ id: orderId });
    } else {
      setErrorMessage("Invalid order ID");
      setStatus("error");
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-orange-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Processing Payment...</h1>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="bg-green-50 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Successful!</h1>
            <p className="text-gray-600">
              Thank you for your payment. Your order{orderNumber ? ` (${orderNumber})` : ""} has been confirmed and is now being processed.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Package className="h-5 w-5" />
                <span className="font-medium">What happens next?</span>
              </div>
              <p className="text-sm text-gray-600">
                You'll receive a confirmation email shortly. Our team will prepare your order and notify you when it ships.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>
        )}

        {status === "already_paid" && (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Already Confirmed</h1>
            <p className="text-gray-600">
              This order has already been paid. No further action is needed.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="bg-red-50 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Issue</h1>
            <p className="text-gray-600">
              {errorMessage || "There was an issue processing your payment. Please contact support."}
            </p>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact us at support@peptidecoach.pro
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
