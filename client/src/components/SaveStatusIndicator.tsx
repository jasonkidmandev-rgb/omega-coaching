import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveStatusIndicatorProps {
  isSaving: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;
  className?: string;
  /** Show a more compact version */
  compact?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 5) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function SaveStatusIndicator({
  isSaving,
  hasChanges,
  lastSaved,
  className,
  compact = false,
}: SaveStatusIndicatorProps) {
  if (isSaving) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
        <span className="text-blue-600 font-medium">Saving...</span>
      </span>
    );
  }

  if (hasChanges) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-amber-600 font-medium">Unsaved changes</span>
      </span>
    );
  }

  if (lastSaved) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        <span className="text-green-700 font-medium">
          {compact ? "Saved" : "Saved"}{" "}
          <span className="text-muted-foreground font-normal">
            {formatRelativeTime(lastSaved)}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Clock className="h-3.5 w-3.5" />
      <span>No changes</span>
    </span>
  );
}
