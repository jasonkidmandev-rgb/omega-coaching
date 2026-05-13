import { LucideIcon, FileText, Users, Package, Search, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-2">
          {action && (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoClientsEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No clients yet"
      description="Create your first client protocol to get started with health coaching."
      action={{ label: "Create Client", onClick: onCreateClick }}
    />
  );
}

export function NoTemplatesEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No templates yet"
      description="Templates help you quickly create protocols for new clients."
      action={{ label: "Create Template", onClick: onCreateClick }}
    />
  );
}

export function NoItemsEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No protocol items"
      description="Add peptides, supplements, and supplies to your library."
      action={{ label: "Add Item", onClick: onCreateClick }}
    />
  );
}

export function NoSearchResultsEmptyState({ query, onClearClick }: { query: string; onClearClick: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
      action={{ label: "Clear Search", onClick: onClearClick }}
    />
  );
}
