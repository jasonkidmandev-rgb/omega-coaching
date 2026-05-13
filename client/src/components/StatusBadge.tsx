import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Pause,
  Play,
  Archive,
  Send,
  FileText,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProtocolStatus = "draft" | "pending_approval" | "approved" | "active" | "completed" | "archived";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partial";

interface StatusBadgeProps {
  status: string;
  type?: "protocol" | "payment" | "generic";
  size?: "sm" | "md";
  showIcon?: boolean;
}

const protocolStatusConfig: Record<ProtocolStatus, { label: string; icon: any; className: string }> = {
  draft: {
    label: "Draft",
    icon: FileText,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  pending_approval: {
    label: "Pending Approval",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  active: {
    label: "Active",
    icon: Play,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; icon: any; className: string }> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-700 border-red-200",
  },
  refunded: {
    label: "Refunded",
    icon: DollarSign,
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  partial: {
    label: "Partial",
    icon: AlertCircle,
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

export function StatusBadge({
  status,
  type = "generic",
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  let config;

  if (type === "protocol") {
    config = protocolStatusConfig[status as ProtocolStatus];
  } else if (type === "payment") {
    config = paymentStatusConfig[status as PaymentStatus];
  }

  if (!config) {
    return (
      <Badge variant="outline" className="capitalize">
        {status.replace(/_/g, " ")}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        config.className,
        size === "sm" && "text-xs px-1.5 py-0"
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}

// Convenience components
export function ProtocolStatusBadge({ status, ...props }: Omit<StatusBadgeProps, "type"> & { status: ProtocolStatus }) {
  return <StatusBadge status={status} type="protocol" {...props} />;
}

export function PaymentStatusBadge({ status, ...props }: Omit<StatusBadgeProps, "type"> & { status: PaymentStatus }) {
  return <StatusBadge status={status} type="payment" {...props} />;
}
