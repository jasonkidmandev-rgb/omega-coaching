import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Clock,
  Plus,
  Zap,
  Eye,
  UserCheck,
  UserX,
  Ban,
  MessageSquare,
  MousePointerClick,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


// Prospect card component
function ProspectCard({ prospect, onClick, isDragging }: { prospect: any; onClick: () => void; isDragging?: boolean }) {
  const lastContact = prospect.lastContactDate
    ? toLocaleDateStringMT(prospect.lastContactDate, { month: "short", day: "numeric" })
    : null;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border ${isDragging ? "shadow-lg ring-2 ring-primary opacity-90" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{prospect.name || "Unnamed"}</p>
            {prospect.source && (
              <p className="text-xs text-muted-foreground truncate">{prospect.source.replace(/_/g, " ")}</p>
            )}
          </div>
          {prospect.customStatus && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
              {prospect.customStatus}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {prospect.phone && (
            <span className="flex items-center gap-1 truncate">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.phoneDisplay || prospect.phone}</span>
            </span>
          )}
          {!prospect.phone && prospect.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.email}</span>
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          {lastContact && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {lastContact}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Draggable prospect card wrapper
function DraggableProspectCard({ prospect, onClick }: { prospect: any; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `prospect-${prospect.id}`,
    data: { type: "prospect", prospect, status: prospect.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProspectCard prospect={prospect} onClick={onClick} />
    </div>
  );
}

// Droppable column component
function KanbanColumn({
  statusKey,
  label,
  prospects,
  color,
  icon: Icon,
  headerBg,
  isCustom,
  customColor,
  onCardClick,
}: {
  statusKey: string;
  label: string;
  prospects: any[];
  color: string;
  icon?: any;
  headerBg: string;
  isCustom?: boolean;
  customColor?: string;
  onCardClick: (prospect: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${statusKey}`,
    data: { type: "column", statusKey },
  });

  const prospectIds = prospects.map((p: any) => `prospect-${p.id}`);

  return (
    <div
      className={`flex flex-col min-w-[260px] max-w-[280px] rounded-lg border ${isOver ? "ring-2 ring-primary bg-primary/5" : "bg-muted/30"}`}
      style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}
    >
      {/* Column Header */}
      <div className={`px-3 py-2.5 rounded-t-lg border-b ${headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {isCustom ? (
            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: customColor }} />
          ) : Icon ? (
            <Icon className={`h-4 w-4 ${color}`} />
          ) : null}
          <span className={`font-semibold text-sm ${color}`}>{label}</span>
        </div>
        <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5">
          {prospects.length}
        </Badge>
      </div>

      {/* Column Body - Droppable */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
      >
        <SortableContext items={prospectIds} strategy={verticalListSortingStrategy}>
          {prospects.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
              Drop prospects here
            </div>
          ) : (
            prospects.map((prospect: any) => (
              <DraggableProspectCard
                key={prospect.id}
                prospect={prospect}
                onClick={() => onCardClick(prospect)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  prospects: any[];
  customStatuses: Array<{ name: string; color: string; enumValue: string }>;
  onCardClick: (prospect: any) => void;
  onStatusChange: (prospectId: number, newStatus: string, customStatus?: string) => void;
  statusOrder?: string[];
}

export default function KanbanBoard({
  prospects,
  customStatuses,
  onCardClick,
  onStatusChange,
  statusOrder,
}: KanbanBoardProps) {
  const [activeProspect, setActiveProspect] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build columns from built-in statuses + custom statuses
  const columns = useMemo(() => {
    const builtIn = [
      { key: "new", label: "New", icon: Plus, color: "text-blue-700", headerBg: "bg-blue-100 border-blue-300" },
      { key: "engaged", label: "Engaged", icon: Zap, color: "text-orange-700", headerBg: "bg-orange-100 border-orange-300" },
      { key: "waiting_on_client", label: "Waiting", icon: Clock, color: "text-amber-700", headerBg: "bg-amber-100 border-amber-300" },
      { key: "ready_for_consult", label: "Ready", icon: UserCheck, color: "text-green-700", headerBg: "bg-green-100 border-green-300" },
      { key: "not_ready", label: "Not Ready", icon: Ban, color: "text-slate-700", headerBg: "bg-slate-100 border-slate-300" },
      { key: "contacted", label: "Contacted", icon: MessageSquare, color: "text-yellow-700", headerBg: "bg-yellow-100 border-yellow-300" },
      { key: "clicked", label: "Clicked", icon: MousePointerClick, color: "text-cyan-700", headerBg: "bg-cyan-100 border-cyan-300" },
      { key: "viewing", label: "Viewing", icon: Eye, color: "text-purple-700", headerBg: "bg-purple-100 border-purple-300" },
      { key: "enrolled", label: "Enrolled", icon: UserCheck, color: "text-emerald-700", headerBg: "bg-emerald-100 border-emerald-300" },
      { key: "declined", label: "Declined", icon: UserX, color: "text-red-700", headerBg: "bg-red-100 border-red-300" },
      { key: "stalled", label: "Stalled", icon: Clock, color: "text-gray-700", headerBg: "bg-gray-100 border-gray-300" },
    ].map(c => ({ ...c, isCustom: false, customColor: undefined }));

    const custom = customStatuses.map(cs => ({
      key: `custom:${cs.name}`,
      label: cs.name,
      icon: null as any,
      color: cs.color,
      headerBg: "border-gray-300",
      isCustom: true,
      customColor: cs.color,
    }));

    const all = [...builtIn, ...custom];

    // Apply saved order if available
    if (statusOrder && statusOrder.length > 0) {
      const ordered = statusOrder
        .map(key => all.find(c => c.key === key))
        .filter(Boolean) as typeof all;
      const remaining = all.filter(c => !statusOrder.includes(c.key));
      return [...ordered, ...remaining];
    }

    return all;
  }, [customStatuses, statusOrder]);

  // Group prospects by their effective status column
  const prospectsByColumn = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    columns.forEach(col => { grouped[col.key] = []; });

    prospects.forEach((p: any) => {
      if (p.customStatus) {
        const customKey = `custom:${p.customStatus}`;
        if (grouped[customKey]) {
          grouped[customKey].push(p);
        } else {
          // Custom status column doesn't exist, fall back to db status
          if (grouped[p.status]) {
            grouped[p.status].push(p);
          }
        }
      } else {
        if (grouped[p.status]) {
          grouped[p.status].push(p);
        }
      }
    });

    return grouped;
  }, [prospects, columns]);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const prospectId = Number(String(active.id).replace("prospect-", ""));
    const prospect = prospects.find((p: any) => p.id === prospectId);
    setActiveProspect(prospect || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveProspect(null);

    if (!over) return;

    const prospectId = Number(String(active.id).replace("prospect-", ""));
    const prospect = prospects.find((p: any) => p.id === prospectId);
    if (!prospect) return;

    // Determine the target column
    let targetColumnKey: string | null = null;

    if (String(over.id).startsWith("column-")) {
      targetColumnKey = String(over.id).replace("column-", "");
    } else if (String(over.id).startsWith("prospect-")) {
      // Dropped on another prospect - find which column that prospect is in
      const overProspectId = Number(String(over.id).replace("prospect-", ""));
      const overProspect = prospects.find((p: any) => p.id === overProspectId);
      if (overProspect) {
        if (overProspect.customStatus) {
          targetColumnKey = `custom:${overProspect.customStatus}`;
        } else {
          targetColumnKey = overProspect.status;
        }
      }
    }

    if (!targetColumnKey) return;

    // Determine current column of the dragged prospect
    const currentColumnKey = prospect.customStatus
      ? `custom:${prospect.customStatus}`
      : prospect.status;

    if (targetColumnKey === currentColumnKey) return;

    // Determine the new status and custom status
    if (targetColumnKey.startsWith("custom:")) {
      const customName = targetColumnKey.replace("custom:", "");
      const cs = customStatuses.find(c => c.name === customName);
      if (cs) {
        onStatusChange(prospectId, cs.enumValue, customName);
      }
    } else {
      onStatusChange(prospectId, targetColumnKey, undefined);
    }
  }

  // Only show columns that have prospects OR are in the active pipeline
  const visibleColumns = columns;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
        {visibleColumns.map(col => (
          <KanbanColumn
            key={col.key}
            statusKey={col.key}
            label={col.label}
            prospects={prospectsByColumn[col.key] || []}
            color={col.color}
            icon={col.icon}
            headerBg={col.headerBg}
            isCustom={col.isCustom}
            customColor={col.customColor}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Drag Overlay - shows a preview of the card being dragged */}
      <DragOverlay>
        {activeProspect ? (
          <div className="w-[260px]">
            <ProspectCard prospect={activeProspect} onClick={() => {}} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
