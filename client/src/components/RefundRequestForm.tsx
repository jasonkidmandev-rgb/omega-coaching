import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface RefundRequestFormProps {
  protocolId: number;
  clientId: string;
  onSuccess?: () => void;
}

export default function RefundRequestForm({
  protocolId,
  clientId,
  onSuccess,
}: RefundRequestFormProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createRefund = trpc.refund.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!reason.trim()) {
      setError("Please provide a reason for your refund request");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Please provide at least 10 characters for your reason");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createRefund.mutateAsync({
        protocolId,
        clientId,
        reason: reason.trim(),
      });

      if (result.success) {
        setSuccess(true);
        setReason("");
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(result.error || "Failed to submit refund request");
      }
    } catch (err) {
      setError("An error occurred while submitting your request");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Refund</CardTitle>
        <CardDescription>
          Please provide details about why you would like to request a refund. Our team will
          review your request and respond within 2-3 business days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your refund request has been submitted successfully. We'll review it and contact
                you soon.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-2">
              Reason for Refund *
            </label>
            <Textarea
              id="reason"
              placeholder="Please explain why you would like to request a refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting || success}
              className="min-h-[150px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length} / 1000 characters
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Refund requests are reviewed on a case-by-case basis. Please
              allow 2-3 business days for a response. Our team will contact you with the outcome.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || success || reason.trim().length < 10}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Refund Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
