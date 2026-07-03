/**
 * Shannon's Enhanced Pipeline Kanban Board
 * Full pipeline: New → Contacted → Consult Booked → Discovery Done → Enrolled → Strategy Pending → Active
 * Enhanced with: follow-up indicators, enrollment tracking, pending task counts, post-discovery stages
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  Clock,
  UserPlus,
  MessageSquare,
  CalendarCheck,
  UserCheck,
  Activity,
  Search,
  StickyNote,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  ListTodo,
  TrendingUp,
  Timer,
  ArrowRight,
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
import { useLocation } from "wouter";

// Extended pipeline stages with post-discovery tracking
const PIPELINE_STAGES = [
  {
    key: "new",
    label: "New Leads",
    icon: UserPlus,
    color: "text-blue-700",
    headerBg: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    description: "Fresh leads, not yet contacted",
  },
  {
    key: "contacted",
    label: "Contacted",
    icon: MessageSquare,
    color: "text-amber-700",
    headerBg: "bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-800",
    description: "Reached out, awaiting response",
  },
  {
    key: "ready_for_consult",
    label: "Consult Booked",
    icon: CalendarCheck,
    color: "text-purple-700",
    headerBg: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800",
    description: "Discovery session scheduled",
  },
  {
    key: "enrolled",
    label: "Post-Discovery",
    icon: DollarSign,
    color: "text-orange-700",
    headerBg: "bg-orange-50 border-orange-200",
    badgeColor: "bg-orange-100 text-orange-800",
    description: "Discovery done — follow up to enroll",
  },
  {
    key: "engaged",
    label: "Active Client",
    icon: Activity,
    color: "text-emerald-700",
    headerBg: "bg-emerald-50 border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-800",
    description: "Enrolled & in program",
  },
];

// Helper: days since a date
function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// Enhanced Prospect card with follow-up indicators
function ProspectCard({ prospect, onClick, isDragging }: { prospect: any; onClick: () => void; isDragging?: boolean }) {
  const lastContact = prospect.lastContactedAt
    ? toLocaleDateStringMT(prospect.lastContactedAt, { month: "short", day: "numeric" })
    : null;
  const daysSinceContact = daysSince(prospect.lastContactedAt);
  const daysSinceCreated = daysSince(prospect.createdAt);
  const hasEnrollment = !!prospect.linkedEnrollment;
  const enrollmentPaid = prospect.linkedEnrollment?.paid;
  const hasProject = !!prospect.linkedProject;

  // Determine urgency level
  let urgency: "none" | "warning" | "critical" = "none";
  if (daysSinceContact !== null && daysSinceContact > 14) urgency = "critical";
  else if (daysSinceContact !== null && daysSinceContact > 7) urgency = "warning";
  else if (daysSinceContact === null && daysSinceCreated !== null && daysSinceCreated > 3) urgency = "warning";

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border-l-[3px] ${
        urgency === "critical" ? "border-l-red-500" :
        urgency === "warning" ? "border-l-amber-400" :
        hasEnrollment ? "border-l-green-400" : "border-l-transparent"
      } ${isDragging ? "shadow-lg ring-2 ring-primary opacity-90" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        {/* Name + urgency badge */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{prospect.name || "Unnamed"}</p>
            {prospect.source && (
              <p className="text-[10px] text-muted-foreground truncate">{prospect.source.replace(/_/g, " ")}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {urgency === "critical" && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{daysSinceContact}d
              </Badge>
            )}
            {urgency === "warning" && (
              <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                <Timer className="h-2.5 w-2.5 mr-0.5" />{daysSinceContact ?? daysSinceCreated}d
              </Badge>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {prospect.phone && (
            <span className="flex items-center gap-0.5 truncate">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.phoneDisplay || prospect.phone}</span>
            </span>
          )}
          {!prospect.phone && prospect.email && (
            <span className="flex items-center gap-0.5 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.email}</span>
            </span>
          )}
        </div>

        {/* Status indicators row */}
        <div className="flex items-center justify-between text-[10px] gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            {lastContact && (
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" /> {lastContact}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasEnrollment && (
              <Badge className={`text-[9px] px-1 py-0 ${enrollmentPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"} hover:bg-opacity-100`}>
                {enrollmentPaid ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <DollarSign className="h-2.5 w-2.5 mr-0.5" />}
                {enrollmentPaid ? "Paid" : "Unpaid"}
              </Badge>
            )}
            {hasProject && (
              <Badge className="text-[9px] px-1 py-0 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                <ListTodo className="h-2.5 w-2.5 mr-0.5" />Project
              </Badge>
            )}
            {prospect.thingsToKnow && (
              <StickyNote className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Draggable wrapper
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

// Droppable column with enhanced header stats
function PipelineColumn({
  stage,
  prospects,
  onCardClick,
}: {
  stage: typeof PIPELINE_STAGES[0];
  prospects: any[];
  onCardClick: (prospect: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.key}`,
    data: { type: "column", statusKey: stage.key },
  });

  const prospectIds = prospects.map((p: any) => `prospect-${p.id}`);
  const Icon = stage.icon;

  // Column-level stats
  const staleCount = prospects.filter((p: any) => {
    const d = daysSince(p.lastContactedAt);
    return d !== null && d > 7;
  }).length;
  const paidCount = prospects.filter((p: any) => p.linkedEnrollment?.paid).length;

  return (
    <div
      className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-lg border ${isOver ? "ring-2 ring-primary bg-primary/5" : "bg-muted/20"}`}
      style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}
    >
      {/* Column Header */}
      <div className={`px-3 py-2.5 rounded-t-lg border-b ${stage.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${stage.color}`} />
            <span className={`font-semibold text-sm ${stage.color}`}>{stage.label}</span>
          </div>
          <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5">
            {prospects.length}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{stage.description}</p>
        {/* Mini stats */}
        {(staleCount > 0 || paidCount > 0) && (
          <div className="flex items-center gap-2 mt-1">
            {staleCount > 0 && (
              <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> {staleCount} stale
              </span>
            )}
            {paidCount > 0 && (
              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> {paidCount} paid
              </span>
            )}
          </div>
        )}
      </div>

      {/* Column Body */}
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

// Enhanced Quick detail dialog
function ProspectQuickView({
  prospect,
  onClose,
}: {
  prospect: any;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: engagement } = trpc.prospect.getEngagement.useQuery(
    { prospectId: prospect.id },
    { enabled: !!prospect.id }
  );
  const updateThingsToKnow = trpc.prospect.updateThingsToKnow.useMutation({
    onSuccess: () => {
      utils.prospect.list.invalidate();
      toast.success("Notes saved");
    },
  });
  const [notes, setNotes] = useState(prospect.thingsToKnow || "");

  const daysSinceContact = daysSince(prospect.lastContactedAt);
  const daysSinceCreated = daysSince(prospect.createdAt);
  const hasEnrollment = !!prospect.linkedEnrollment;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold">{prospect.name}</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          {prospect.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {prospect.email}
            </span>
          )}
          {prospect.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {prospect.phoneDisplay || prospect.phone}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline">{prospect.customStatus || prospect.status}</Badge>
          {prospect.source && (
            <Badge variant="secondary" className="text-xs">{prospect.source.replace(/_/g, " ")}</Badge>
          )}
          {daysSinceContact !== null && (
            <Badge className={`text-xs ${daysSinceContact > 7 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}>
              Last contact: {daysSinceContact}d ago
            </Badge>
          )}
          {daysSinceCreated !== null && (
            <Badge variant="outline" className="text-xs">
              In pipeline: {daysSinceCreated}d
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Enrollment & Project Status */}
      {(hasEnrollment || prospect.linkedProject) && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Client Journey Status</Label>
          <div className="grid grid-cols-2 gap-2">
            {hasEnrollment && (
              <div className={`rounded-lg p-2 text-xs ${prospect.linkedEnrollment.paid ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                <div className="font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {prospect.linkedEnrollment.paid ? "Coaching Fee Paid" : "Awaiting Payment"}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  Tier: {prospect.linkedEnrollment.tier || "N/A"}
                  {prospect.linkedEnrollment.amount && ` · $${prospect.linkedEnrollment.amount}`}
                </div>
              </div>
            )}
            {prospect.linkedProject && (
              <div className="rounded-lg p-2 text-xs bg-indigo-50 border border-indigo-200">
                <div className="font-medium flex items-center gap-1">
                  <ListTodo className="h-3 w-3" />
                  Project: {prospect.linkedProject.status}
                </div>
                {prospect.linkedProject.assignedCoachName && (
                  <div className="text-muted-foreground mt-0.5">
                    Coach: {prospect.linkedProject.assignedCoachName}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-Up Action Needed */}
      {(daysSinceContact === null || daysSinceContact > 3) && prospect.status !== "engaged" && (
        <div className="rounded-lg p-3 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Follow-Up Needed
          </div>
          <p className="text-xs text-amber-700 mt-1">
            {daysSinceContact === null
              ? "No contact recorded yet. Reach out to this prospect."
              : `Last contacted ${daysSinceContact} days ago. Time to follow up.`}
          </p>
        </div>
      )}

      {/* Things to Know */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Things to Know</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key notes about this prospect..."
          className="min-h-[70px] text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateThingsToKnow.mutate({ prospectId: prospect.id, thingsToKnow: notes })}
          disabled={updateThingsToKnow.isPending}
        >
          Save Notes
        </Button>
      </div>

      {/* Recent Activity */}
      {engagement && engagement.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Recent Activity</Label>
          <ScrollArea className="max-h-[160px]">
            <div className="space-y-2">
              {engagement.slice(0, 10).map((e: any) => (
                <div key={e.id} className="text-xs border rounded p-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{e.eventType?.replace(/_/g, " ")}</Badge>
                    <span className="text-muted-foreground">
                      {toLocaleDateStringMT(e.createdAt, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {e.notes && <p className="mt-1 text-muted-foreground">{e.notes}</p>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => { onClose(); setLocation(`/admin/prospects/${prospect.id}`); }}
        >
          Full Profile <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Pipeline Summary Stats Bar
function PipelineStats({ prospects }: { prospects: any[] }) {
  const total = prospects.length;
  const stale = prospects.filter((p: any) => {
    const d = daysSince(p.lastContactedAt);
    return d !== null && d > 7;
  }).length;
  const enrolled = prospects.filter((p: any) => !!p.linkedEnrollment).length;
  const paid = prospects.filter((p: any) => p.linkedEnrollment?.paid).length;
  const needsFollowUp = prospects.filter((p: any) => {
    const d = daysSince(p.lastContactedAt);
    return (d === null && p.status !== "new") || (d !== null && d > 3);
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-bold">{total}</div>
        <div className="text-xs text-muted-foreground">In Pipeline</div>
      </div>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-bold text-amber-600">{needsFollowUp}</div>
        <div className="text-xs text-muted-foreground">Need Follow-Up</div>
      </div>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-bold text-red-600">{stale}</div>
        <div className="text-xs text-muted-foreground">Stale (7d+)</div>
      </div>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-bold text-blue-600">{enrolled}</div>
        <div className="text-xs text-muted-foreground">Enrolled</div>
      </div>
      <div className="rounded-lg border p-3 text-center">
        <div className="text-2xl font-bold text-green-600">{paid}</div>
        <div className="text-xs text-muted-foreground">Paid</div>
      </div>
    </div>
  );
}

// Follow-Up Queue tab content
function FollowUpQueue({ prospects, onCardClick }: { prospects: any[]; onCardClick: (p: any) => void }) {
  const needsFollowUp = useMemo(() => {
    return prospects
      .filter((p: any) => {
        if (p.status === "engaged") return false;
        const d = daysSince(p.lastContactedAt);
        return (d === null && p.status !== "new") || (d !== null && d > 3);
      })
      .sort((a: any, b: any) => {
        const dA = daysSince(a.lastContactedAt) ?? 999;
        const dB = daysSince(b.lastContactedAt) ?? 999;
        return dB - dA; // Most stale first
      });
  }, [prospects]);

  if (needsFollowUp.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mb-3 text-green-500" />
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm">No prospects need follow-up right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {needsFollowUp.length} prospects need follow-up, sorted by most stale first.
      </p>
      {needsFollowUp.map((p: any) => {
        const d = daysSince(p.lastContactedAt);
        return (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onCardClick(p)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d !== null && d > 14 ? "bg-red-500" : d !== null && d > 7 ? "bg-amber-500" : "bg-yellow-400"}`} />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.status.replace(/_/g, " ")} · {p.source?.replace(/_/g, " ") || "unknown source"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {p.linkedEnrollment && (
                <Badge className={`text-[10px] ${p.linkedEnrollment.paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {p.linkedEnrollment.paid ? "Paid" : "Unpaid"}
                </Badge>
              )}
              <Badge variant={d !== null && d > 7 ? "destructive" : "secondary"} className="text-xs">
                {d !== null ? `${d}d ago` : "Never contacted"}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main Kanban Page
export default function ShannonKanban() {
  const [search, setSearch] = useState("");
  const [activeProspect, setActiveProspect] = useState<any>(null);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [, setLocation] = useLocation();

  const { data: prospectData, isLoading } = trpc.prospect.list.useQuery();
  const utils = trpc.useUtils();

  const updateStatus = trpc.prospect.updateProspectStatus.useMutation({
    onSuccess: () => {
      utils.prospect.list.invalidate();
      toast.success("Status updated");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const allProspects = prospectData || [];

  // Filter prospects to only show those in Shannon's pipeline stages
  const pipelineStatusKeys = PIPELINE_STAGES.map(s => s.key);
  const filteredProspects = useMemo(() => {
    let list = allProspects.filter((p: any) =>
      pipelineStatusKeys.includes(p.status) ||
      ['waiting_on_client', 'clicked', 'viewing', 'not_ready'].includes(p.status)
    );

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        (p.name?.toLowerCase().includes(q)) ||
        (p.email?.toLowerCase().includes(q)) ||
        (p.phone?.includes(q))
      );
    }

    return list;
  }, [allProspects, search]);

  // Group by pipeline stage
  const prospectsByStage = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    PIPELINE_STAGES.forEach(s => { grouped[s.key] = []; });

    filteredProspects.forEach((p: any) => {
      const status = p.status;
      if (grouped[status]) {
        grouped[status].push(p);
      } else {
        if (['waiting_on_client', 'clicked', 'viewing'].includes(status)) {
          grouped['contacted'].push(p);
        } else if (status === 'not_ready') {
          grouped['new'].push(p);
        } else {
          grouped['new'].push(p);
        }
      }
    });

    return grouped;
  }, [filteredProspects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const prospectId = Number(String(active.id).replace("prospect-", ""));
    const prospect = filteredProspects.find((p: any) => p.id === prospectId);
    setActiveProspect(prospect || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveProspect(null);

    if (!over) return;

    const prospectId = Number(String(active.id).replace("prospect-", ""));
    const prospect = filteredProspects.find((p: any) => p.id === prospectId);
    if (!prospect) return;

    let targetColumnKey: string | null = null;

    if (String(over.id).startsWith("column-")) {
      targetColumnKey = String(over.id).replace("column-", "");
    } else if (String(over.id).startsWith("prospect-")) {
      const overProspectId = Number(String(over.id).replace("prospect-", ""));
      const overProspect = filteredProspects.find((p: any) => p.id === overProspectId);
      if (overProspect) {
        targetColumnKey = overProspect.status;
      }
    }

    if (!targetColumnKey) return;
    if (targetColumnKey === prospect.status) return;

    updateStatus.mutate({
      prospectId,
      status: targetColumnKey as any,
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-6 w-6" /> Shannon's Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag prospects between stages. Click a card for details and follow-up actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prospects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => utils.prospect.list.invalidate()}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin/prospects")}
            >
              Full Pipeline View
            </Button>
          </div>
        </div>

        {/* Pipeline Stats */}
        <PipelineStats prospects={filteredProspects} />

        {/* Tabs: Kanban Board + Follow-Up Queue */}
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban" className="flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban Board
            </TabsTrigger>
            <TabsTrigger value="followup" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Follow-Up Queue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {PIPELINE_STAGES.map(stage => (
                    <PipelineColumn
                      key={stage.key}
                      stage={stage}
                      prospects={prospectsByStage[stage.key] || []}
                      onCardClick={(p) => setSelectedProspect(p)}
                    />
                  ))}
                </div>

                <DragOverlay>
                  {activeProspect ? (
                    <div className="w-[260px]">
                      <ProspectCard prospect={activeProspect} onClick={() => {}} isDragging />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="followup" className="mt-3">
            <FollowUpQueue
              prospects={filteredProspects}
              onCardClick={(p) => setSelectedProspect(p)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick View Dialog */}
      <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prospect Quick View</DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <ProspectQuickView
              prospect={selectedProspect}
              onClose={() => setSelectedProspect(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
