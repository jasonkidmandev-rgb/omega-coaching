import { CheckCircle, Circle, ArrowRight } from "lucide-react";

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface ClientProgressIndicatorProps {
  status: string;
  hasApproved: boolean;
  hasOrders: boolean;
  hasPackingSlip: boolean;
  packingSlipStatus?: string;
}

export function ClientProgressIndicator({
  status,
  hasApproved,
  hasOrders,
  hasPackingSlip,
  packingSlipStatus,
}: ClientProgressIndicatorProps) {
  const steps: ProgressStep[] = [
    {
      id: "review",
      label: "Review Protocol",
      completed: true, // If they're seeing this, they've reviewed
      current: !hasApproved,
    },
    {
      id: "approve",
      label: "Approve Protocol",
      completed: hasApproved,
      current: hasApproved && !hasOrders,
    },
    {
      id: "payment",
      label: "Complete Payment",
      completed: hasOrders,
      current: hasOrders && hasPackingSlip && packingSlipStatus !== 'complete',
    },
    {
      id: "fulfillment",
      label: "Order Shipped",
      completed: packingSlipStatus === 'complete',
      current: packingSlipStatus === 'complete',
    },
  ];

  // Find current step index
  const currentIndex = steps.findIndex(s => s.current);

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Progress</h3>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  step.completed
                    ? "bg-green-500 text-white"
                    : step.current
                    ? "bg-orange-500 text-white ring-2 ring-orange-200"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-xs mt-1 text-center max-w-[80px] ${
                  step.completed
                    ? "text-green-600 font-medium"
                    : step.current
                    ? "text-orange-600 font-medium"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  steps[index + 1].completed || steps[index + 1].current
                    ? "bg-green-300"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
