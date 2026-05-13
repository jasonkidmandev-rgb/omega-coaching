import React, { useEffect } from "react";
import { useSearchParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const [, setLocation] = useLocation();
  const reason = searchParams.get("reason") || "Payment could not be processed";
  const method = searchParams.get("method") || "unknown";

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Payment Failed</CardTitle>
          <CardDescription>We couldn't process your payment</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Reason:</strong> {reason}
            </p>
          </div>

          {/* What Went Wrong */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">What might have happened:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600">•</span>
                <span>Your payment method was declined by your bank</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600">•</span>
                <span>There's insufficient funds in your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600">•</span>
                <span>Your payment information doesn't match your bank records</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600">•</span>
                <span>The payment session expired</span>
              </li>
            </ul>
          </div>

          {/* Venmo-Specific Note */}
          {method === "venmo" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
              <strong>Venmo Note:</strong> Make sure you have a Venmo account and sufficient funds. If you're having
              trouble, please try again or contact support.
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <Button onClick={() => window.history.back()} className="w-full bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </div>

          {/* Troubleshooting */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Troubleshooting Tips:</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Try a different payment method</li>
              <li>• Check your payment information is correct</li>
              <li>• Contact your bank to verify the transaction</li>
              <li>• Clear your browser cache and try again</li>
            </ul>
          </div>

          {/* Support */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-600">
              Still having issues?{" "}
              <a href="mailto:omega@omegalongevity.com" className="text-blue-600 hover:underline">
                Contact our support team
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
