import { AlertCircle, CheckCircle, Clock } from "lucide-react";

type StatusBadgeProps = {
  status: string;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft: {
      label: "Draft",
      className: "bg-slate-100 text-slate-700",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    pending_approval: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock className="h-3 w-3" />,
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    active: {
      label: "Active",
      className: "bg-blue-100 text-blue-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    completed: {
      label: "Completed",
      className: "bg-purple-100 text-purple-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}
