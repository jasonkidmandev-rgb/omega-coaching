import { useParams } from "wouter";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomOrderPaymentCancelled() {
  const params = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="bg-amber-50 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Cancelled</h1>
        <p className="text-gray-600">
          Your payment was not completed. No charges have been made to your account.
        </p>
        <p className="text-sm text-gray-500">
          If you'd like to complete your payment, please use the original invoice link from your email. 
          If you need help, contact us at support@peptidecoach.pro
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
