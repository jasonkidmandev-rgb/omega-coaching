import { useState } from "react";
import { trpc } from "@/lib/trpc";
import KanbanBoard from "./KanbanBoard";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Filter,
  Plus,
  MessageSquare,
  Send,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Phone,
  Mail,
  Clock,
  MousePointerClick,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Users,
  TrendingUp,
  ChevronRight,
  Copy,
  ExternalLink,
  Pause,
  Play,
  Ban,
  FileText,
  Notebook,
  CalendarClock,
  CircleDot,
  Settings,
  Lightbulb,
  Check,
  X,
  AlertCircle,
  Save,
  Zap,
  EyeOff,
  ListFilter,
  Bookmark,
  Star,
  Palette,
  GripVertical,
  BarChart3,
  ArrowRightLeft,
  LayoutGrid,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Phone number formatting helper
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Status badge colors
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  new: { label: "New", variant: "outline", color: "bg-blue-100 text-blue-800 border-blue-200" },
  contacted: { label: "Contacted", variant: "secondary", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  clicked: { label: "Clicked Link", variant: "default", color: "bg-green-100 text-green-800 border-green-200" },
  viewing: { label: "Viewing", variant: "default", color: "bg-purple-100 text-purple-800 border-purple-200" },
  enrolled: { label: "Enrolled", variant: "default", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  declined: { label: "Declined", variant: "destructive", color: "bg-red-100 text-red-800 border-red-200" },
  stalled: { label: "Stalled", variant: "outline", color: "bg-gray-100 text-gray-800 border-gray-200" },
  engaged: { label: "Engaged", variant: "default", color: "bg-orange-100 text-orange-800 border-orange-200" },
  waiting_on_client: { label: "Waiting on Client", variant: "secondary", color: "bg-amber-100 text-amber-800 border-amber-200" },
  ready_for_consult: { label: "Ready for Consult", variant: "default", color: "bg-green-100 text-green-800 border-green-200" },
  not_ready: { label: "Not Ready", variant: "outline", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

// Engagement type config for display
const engagementTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
  phone_call: { label: "Phone Call", icon: "📞", color: "text-blue-600" },
  email_sent: { label: "Email Sent", icon: "📧", color: "text-indigo-600" },
  email_received: { label: "Email Received", icon: "📨", color: "text-purple-600" },
  meeting: { label: "Meeting", icon: "🤝", color: "text-green-600" },
  voicemail: { label: "Voicemail", icon: "📱", color: "text-orange-600" },
  note: { label: "Note", icon: "📝", color: "text-gray-600" },
  status_change: { label: "Status Change", icon: "🔄", color: "text-amber-600" },
  follow_up_scheduled: { label: "Follow-up Scheduled", icon: "📅", color: "text-teal-600" },
  other: { label: "Other", icon: "📌", color: "text-slate-600" },
  sms_link_click: { label: "SMS Link Click", icon: "🔗", color: "text-cyan-600" },
  page_view: { label: "Page View", icon: "👁", color: "text-violet-600" },
  masterclass_view: { label: "Masterclass View", icon: "🎓", color: "text-pink-600" },
  tier_view: { label: "Tier View", icon: "📊", color: "text-rose-600" },
  enrollment_start: { label: "Enrollment Started", icon: "✏️", color: "text-lime-600" },
  enrollment_complete: { label: "Enrollment Complete", icon: "✅", color: "text-emerald-600" },
};

function StatusBadge({ status, customStatus, customStatuses }: { status: string; customStatus?: string | null; customStatuses?: Array<{ name: string; color: string; enumValue: string }> }) {
  if (customStatus) {
    const cs = customStatuses?.find(c => c.name === customStatus);
    if (cs) {
      return <Badge style={{ backgroundColor: cs.color + '20', color: cs.color, borderColor: cs.color + '40' }} className="font-medium">{customStatus}</Badge>;
    }
    return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-medium">{customStatus}</Badge>;
  }
  const config = statusConfig[status] || statusConfig.new;
  return <Badge className={`${config.color} font-medium`}>{config.label}</Badge>;
}

// Sortable status card component for drag-and-drop reordering
function SortableStatusCard({ id, label, count, icon: Icon, color, bgColor, isCustom, customColor, isActive, onClick }: {
  id: string;
  label: string;
  count: number;
  icon?: any;
  color?: string;
  bgColor?: string;
  isCustom?: boolean;
  customColor?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow min-w-[90px] ${isActive ? 'ring-2 ring-primary' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <span {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                <GripVertical className="h-3 w-3" />
              </span>
              {isCustom ? (
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: customColor }} />
              ) : Icon ? (
                <Icon className={`h-4 w-4 ${color}`} />
              ) : null}
            </div>
            <span className="text-2xl font-bold">{String(count)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Prospects() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [selectedProspects, setSelectedProspects] = useState<number[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", source: "", notes: "", accessCode: "",
  });
  const [smsData, setSmsData] = useState({
    templateKey: "", customMessage: "", destination: "/transformation",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showEngagementForm, setShowEngagementForm] = useState(false);
  const [engagementData, setEngagementData] = useState({
    eventType: "phone_call" as string,
    notes: "",
    duration: "",
    outcome: "",
  });
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [showCustomStatusDialog, setShowCustomStatusDialog] = useState(false);
  const [customStatusMode, setCustomStatusMode] = useState<"add" | "edit" | "manage">("manage");
  const [editingCustomStatusIndex, setEditingCustomStatusIndex] = useState<number | null>(null);
  const [newCustomStatusName, setNewCustomStatusName] = useState("");
  const [newCustomStatusColor, setNewCustomStatusColor] = useState("#6366f1");
  const [newCustomStatusEnum, setNewCustomStatusEnum] = useState("new");
  const [thingsToKnowText, setThingsToKnowText] = useState("");
  const [thingsToKnowEditing, setThingsToKnowEditing] = useState(false);
  const [activeView, setActiveView] = useState<string>("active_pipeline");
  const [deleteCustomStatusIndex, setDeleteCustomStatusIndex] = useState<number | null>(null);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("new");
  const [bulkCustomStatusTarget, setBulkCustomStatusTarget] = useState<string | undefined>(undefined);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDuplicateScanner, setShowDuplicateScanner] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<any[]>([]);

  const scanDuplicates = trpc.prospect.scanDuplicates.useQuery(undefined, {
    enabled: showDuplicateScanner,
  });

  const mergeProspects = trpc.prospect.mergeProspects.useMutation({
    onSuccess: (result) => {
      toast.success(`Merged into prospect #${result.keptId} — ${result.fieldsUpdated} fields updated`);
      utils.prospect.list.invalidate();
      scanDuplicates.refetch();
    },
    onError: (err) => toast.error(`Merge failed: ${err.message}`),
  });
  
  // Queries
  const smsStatus = trpc.prospect.getSmsStatus.useQuery();
  // Always fetch all prospects so client-side smart views work
  const prospectList = trpc.prospect.list.useQuery({ status: "all" as any });
  const stats = trpc.prospect.getStats.useQuery();
  const templates = trpc.prospect.getTemplates.useQuery();
  const prospectDetail = trpc.prospect.getById.useQuery(
    { id: selectedProspect?.id },
    { enabled: !!selectedProspect?.id && showDetailDialog }
  );
  
  // Mutations
  const createProspect = trpc.prospect.create.useMutation({
    onSuccess: (data: any) => {
      if (data.merged) {
        toast.info(`Duplicate detected — merged with existing prospect: ${data.message}`, { duration: 6000 });
      } else {
        toast.success("Prospect added — new prospect has been added to the pipeline.");
      }
      setShowAddDialog(false);
      resetForm();
      prospectList.refetch();
      stats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const updateProspect = trpc.prospect.update.useMutation({
    onSuccess: () => {
      toast.success("Prospect updated");
      setShowAddDialog(false);
      resetForm();
      prospectList.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const deleteProspect = trpc.prospect.delete.useMutation({
    onSuccess: () => {
      toast.success("Prospect deleted");
      setShowDeleteDialog(false);
      setSelectedProspect(null);
      prospectList.refetch();
      stats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const sendSms = trpc.prospect.sendSms.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.smsConfigured ? "SMS sent! Message delivered via Twilio." : "SMS logged (Twilio not configured yet).");
      } else {
        toast.info(data.message || "SMS logged");
      }
      setShowSmsDialog(false);
      setSmsData({ templateKey: "", customMessage: "", destination: "/transformation" });
      prospectList.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Engagement & Status mutations
  const addEngagement = trpc.prospect.addEngagement.useMutation({
    onSuccess: () => {
      toast.success("Engagement logged");
      setShowEngagementForm(false);
      setEngagementData({ eventType: "phone_call", notes: "", duration: "", outcome: "" });
      prospectDetail.refetch();
      prospectList.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });
  
  const updateProspectStatus = trpc.prospect.updateProspectStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      prospectDetail.refetch();
      prospectList.refetch();
      stats.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });
  
  const appendNote = trpc.prospect.appendNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNewNote("");
      prospectDetail.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const editNote = trpc.prospect.editNote.useMutation({
    onSuccess: () => {
      toast.success("Note updated");
      setEditingNoteId(null);
      setEditingNoteText("");
      prospectDetail.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteNote = trpc.prospect.deleteNote.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      setDeleteNoteId(null);
      prospectDetail.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateThingsToKnow = trpc.prospect.updateThingsToKnow.useMutation({
    onSuccess: () => {
      toast.success("Things to know saved");
      setThingsToKnowEditing(false);
      prospectDetail.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Custom statuses from site settings
  const customStatusesQuery = trpc.settings.get.useQuery({ key: "prospect_custom_statuses" });
  const saveSetting = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success(customStatusMode === "edit" ? "Custom status updated" : deleteCustomStatusIndex !== null ? "Custom status deleted" : "Custom status added");
      setNewCustomStatusName("");
      setNewCustomStatusColor("#6366f1");
      setNewCustomStatusEnum("new");
      setEditingCustomStatusIndex(null);
      setCustomStatusMode("manage");
      customStatusesQuery.refetch();
      stats.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const customStatuses: Array<{ name: string; color: string; enumValue: string }> = (() => {
    try {
      const raw = customStatusesQuery.data;
      if (!raw) return [];
      // settings.get returns the raw string value directly
      return JSON.parse(typeof raw === 'string' ? raw : (raw as any)?.value || '[]');
    } catch { return []; }
  })();
  
  const bulkUpdateStatus = trpc.prospect.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Status updated for ${data.count} prospect${data.count !== 1 ? 's' : ''}`);
      setShowBulkStatusDialog(false);
      setSelectedProspects([]);
      prospectList.refetch();
      stats.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const analytics = trpc.prospect.getPipelineAnalytics.useQuery(undefined, { enabled: showAnalytics });

  // Status box order from site settings
  const statusOrderQuery = trpc.settings.get.useQuery({ key: "prospect_status_order" });
  const saveStatusOrder = trpc.settings.set.useMutation({
    onSuccess: () => { statusOrderQuery.refetch(); },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const migrateLegacyNotes = trpc.prospect.migrateLegacyNotes.useMutation({
    onSuccess: (data) => {
      toast.success(`Legacy notes migrated: ${data.migrated} prospects updated, ${data.skipped} already had notes.`);
      prospectList.refetch();
      if (selectedProspect?.id) prospectDetail.refetch();
    },
    onError: (err) => toast.error(`Migration failed: ${err.message}`),
  });

  const bulkSendSms = trpc.prospect.bulkSendSms.useMutation({
    onSuccess: (data) => {
      toast.success(`Bulk SMS: ${data.totalSent} sent, ${data.totalFailed} failed. ${data.smsConfigured ? "Messages delivered via Twilio." : "Messages logged (Twilio not configured yet)."}`);
      setSelectedProspects([]);
      prospectList.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  function resetForm() {
    setFormData({ name: "", email: "", phone: "", source: "", notes: "", accessCode: "" });
    setIsEditing(false);
  }
  
  function openEditDialog(prospect: any) {
    setFormData({
      name: prospect.name || "",
      email: prospect.email || "",
      phone: prospect.phoneDisplay || prospect.phone || "",
      source: prospect.source || "",
      notes: prospect.notes || "",
      accessCode: prospect.accessCode || "",
    });
    setSelectedProspect(prospect);
    setIsEditing(true);
    setShowAddDialog(true);
  }
  
  function openSmsDialog(prospect: any) {
    setSelectedProspect(prospect);
    setSmsData({ templateKey: "", customMessage: "", destination: "/transformation" });
    setShowSmsDialog(true);
  }
  
  const rawProspects = prospectList.data || [];
  const smsConfigured = smsStatus.data?.configured || false;
  const statsData = stats.data;

  // Smart view filtering (client-side for composite views)
  const PASSIVE_STATUSES = ['viewing', 'stalled', 'declined'];
  const filteredProspects = (() => {
    if (activeView === 'active_pipeline') {
      return rawProspects.filter((p: any) => !PASSIVE_STATUSES.includes(p.status));
    }
    if (activeView === 'watch_list') {
      return rawProspects.filter((p: any) => PASSIVE_STATUSES.includes(p.status));
    }
    // For individual built-in status filter via card click
    // Show prospects whose DB status matches AND who don't have a custom status
    if (statusFilter !== 'all' && !statusFilter.startsWith('custom:')) {
      return rawProspects.filter((p: any) => p.status === statusFilter && !p.customStatus);
    }
    // For custom status filter via card click
    if (statusFilter.startsWith('custom:')) {
      const customName = statusFilter.replace('custom:', '');
      return rawProspects.filter((p: any) => p.customStatus === customName);
    }
    return rawProspects;
  })();
  const prospects = filteredProspects;
  
  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Filter className="h-8 w-8 text-primary" />
              Lead Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage pre-sales leads and send personalized SMS outreach
            </p>
          </div>
          <div className="flex gap-2">
            {selectedProspects.length > 0 && (
              <>
              <Button
                variant="outline"
                onClick={() => setShowBulkStatusDialog(true)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Change Status ({selectedProspects.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  bulkSendSms.mutate({
                    prospectIds: selectedProspects,
                    destination: "/transformation",
                  });
                }}
                disabled={bulkSendSms.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send SMS to {selectedProspects.length} selected
              </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("This will copy any original notes into the engagement timeline so they show up in the detail view. No data will be deleted. Continue?")) {
                  migrateLegacyNotes.mutate();
                }
              }}
              disabled={migrateLegacyNotes.isPending}
              title="Copy original prospect notes into the engagement timeline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${migrateLegacyNotes.isPending ? 'animate-spin' : ''}`} />
              {migrateLegacyNotes.isPending ? 'Migrating...' : 'Sync Notes'}
            </Button>
            <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showAnalytics ? 'Hide Analytics' : 'Analytics'}
            </Button>
            <Button 
              variant={showDuplicateScanner ? "default" : "outline"}
              onClick={() => setShowDuplicateScanner(!showDuplicateScanner)}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {showDuplicateScanner ? 'Hide Scanner' : 'Duplicate Scanner'}
            </Button>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Prospect
            </Button>
          </div>
        </div>
        
        {/* Duplicate Scanner Panel */}
        {showDuplicateScanner && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-orange-600" />
                Duplicate Scanner
              </CardTitle>
              <CardDescription>Scan for potential duplicate records by name, email, or phone</CardDescription>
            </CardHeader>
            <CardContent>
              {scanDuplicates.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Scanning for duplicates...
                </div>
              ) : scanDuplicates.data?.duplicateGroups?.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Check className="h-4 w-4" />
                  No duplicates found. Your pipeline is clean!
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-orange-800 font-medium">
                    Found {scanDuplicates.data?.duplicateGroups?.length || 0} potential duplicate group(s)
                  </p>
                  {scanDuplicates.data?.duplicateGroups?.map((group: any, i: number) => (
                    <div key={i} className="bg-white rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          Match: {group.matchType} — "{group.matchValue}"
                        </span>
                        <Badge variant="outline" className="text-orange-700 border-orange-300">
                          {group.prospects.length} records
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">ID</TableHead>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Phone</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.prospects.map((p: any, j: number) => (
                            <TableRow key={p.id} className={j === 0 ? 'bg-green-50' : ''}>
                              <TableCell className="text-xs">#{p.id}</TableCell>
                              <TableCell className="text-xs font-medium">{p.name}</TableCell>
                              <TableCell className="text-xs">{p.email || 'none'}</TableCell>
                              <TableCell className="text-xs">{p.phone || 'none'}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{p.status}</Badge></TableCell>
                              <TableCell>
                                {j === 0 ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Keep</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 text-xs"
                                    disabled={mergeProspects.isPending}
                                    onClick={() => {
                                      if (confirm(`Merge #${p.id} (${p.name}) into #${group.prospects[0].id} (${group.prospects[0].name})?`)) {
                                        mergeProspects.mutate({ keepId: group.prospects[0].id, deleteId: p.id });
                                      }
                                    }}
                                  >
                                    Merge Into #{group.prospects[0].id}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SMS Configuration Banner */}
        {!smsConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">SMS Not Configured</h3>
              <p className="text-sm text-amber-700 mt-1">
                Twilio credentials are not set up yet. You can still add prospects and compose messages — they'll be logged and ready to send once you configure Twilio in Settings.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                <strong>To configure:</strong> Go to Settings and add your Twilio Account SID, Auth Token, and Phone Number.
              </p>
            </div>
          </div>
        )}
        
        {/* Dynamic Status Boxes with Drag-and-Drop Reordering */}
        {(() => {
          const builtInStatuses = [
            { key: "new", label: "New", countKey: "newCount", icon: Plus, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
            { key: "engaged", label: "Engaged", countKey: "engagedCount", icon: Zap, color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200" },
            { key: "waiting_on_client", label: "Waiting", countKey: "waitingOnClientCount", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200" },
            { key: "ready_for_consult", label: "Ready", countKey: "readyForConsultCount", icon: UserCheck, color: "text-green-600", bgColor: "bg-green-50 border-green-200" },
            { key: "not_ready", label: "Not Ready", countKey: "notReadyCount", icon: Ban, color: "text-slate-600", bgColor: "bg-slate-50 border-slate-200" },
            { key: "contacted", label: "Contacted", countKey: "contactedCount", icon: MessageSquare, color: "text-yellow-600", bgColor: "bg-yellow-50 border-yellow-200" },
            { key: "clicked", label: "Clicked", countKey: "clickedCount", icon: MousePointerClick, color: "text-cyan-600", bgColor: "bg-cyan-50 border-cyan-200" },
            { key: "viewing", label: "Viewing", countKey: "viewingCount", icon: Eye, color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200" },
            { key: "enrolled", label: "Enrolled", countKey: "enrolledCount", icon: UserCheck, color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200" },
            { key: "declined", label: "Declined", countKey: "declinedCount", icon: UserX, color: "text-red-600", bgColor: "bg-red-50 border-red-200" },
            { key: "stalled", label: "Stalled", countKey: "stalledCount", icon: Clock, color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200" },
          ];
          const customStatusCards = customStatuses.map((cs) => ({
            key: `custom:${cs.name}`,
            label: cs.name,
            countKey: "",
            icon: null as any,
            color: cs.color,
            bgColor: "",
            isCustom: true,
            customColor: cs.color,
          }));
          
          // Combine all status cards
          const allCards = [...builtInStatuses.map(s => ({ ...s, isCustom: false, customColor: undefined })), ...customStatusCards];
          
          // Apply saved order
          const savedOrder: string[] = (() => {
            try {
              const raw = statusOrderQuery.data;
              if (!raw) return [];
              return JSON.parse(typeof raw === 'string' ? raw : (raw as any)?.value || '[]');
            } catch { return []; }
          })();
          
          const orderedCards = savedOrder.length > 0
            ? [...savedOrder.map(key => allCards.find(c => c.key === key)).filter(Boolean), ...allCards.filter(c => !savedOrder.includes(c.key))] as typeof allCards
            : allCards;
          
          const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const oldIndex = orderedCards.findIndex(c => c.key === active.id);
              const newIndex = orderedCards.findIndex(c => c.key === over.id);
              const newOrder = arrayMove(orderedCards, oldIndex, newIndex);
              saveStatusOrder.mutate({ key: "prospect_status_order", value: JSON.stringify(newOrder.map(c => c.key)) });
            }
          };
          
          return (
            <div className="flex flex-wrap gap-2 items-stretch">
              {/* Total card - always first, not sortable */}
              <Card 
                className={`cursor-pointer hover:shadow-md transition-shadow min-w-[100px] ${statusFilter === 'all' && activeView === 'all' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => { setStatusFilter('all'); setActiveView('all'); }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Users className="h-4 w-4 text-slate-600" />
                    <span className="text-2xl font-bold">{String(statsData?.prospects?.total || 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </CardContent>
              </Card>
              {/* Sortable status cards */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedCards.map(c => c.key)} strategy={horizontalListSortingStrategy}>
                  {orderedCards.map((stat) => {
                    const count = stat.isCustom
                      ? (statsData?.customStatusCounts?.[stat.label] || 0)
                      : (Number(statsData?.prospects?.[stat.countKey]) || 0);
                    const isActive = statusFilter === stat.key;
                    return (
                      <SortableStatusCard
                        key={stat.key}
                        id={stat.key}
                        label={stat.label}
                        count={count}
                        icon={stat.isCustom ? undefined : stat.icon}
                        color={stat.isCustom ? undefined : stat.color}
                        bgColor={stat.bgColor}
                        isCustom={stat.isCustom}
                        customColor={stat.customColor}
                        isActive={isActive}
                        onClick={() => { setStatusFilter(stat.key); setActiveView(''); }}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          );
        })()}

        {/* Smart Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground mr-1">View:</span>
          {[
            { key: "active_pipeline", label: "Active Pipeline", icon: Zap, description: "Working leads" },
            { key: "watch_list", label: "Watch List", icon: EyeOff, description: "Passive leads" },
            { key: "all", label: "All Prospects", icon: Users, description: "Everything" },
          ].map((view) => (
            <Button
              key={view.key}
              variant={activeView === view.key ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => {
                setActiveView(view.key);
                setStatusFilter(view.key === "all" ? "all" : view.key);
              }}
            >
              <view.icon className="h-3.5 w-3.5 mr-1" />
              {view.label}
            </Button>
          ))}
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => { setShowCustomStatusDialog(true); setCustomStatusMode("manage"); }}
          >
            <Settings className="h-3.5 w-3.5 mr-1" /> Manage Statuses
          </Button>
        </div>
        
        {/* Pipeline Analytics Panel */}
        {showAnalytics && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Pipeline Analytics
              </CardTitle>
              <CardDescription>Conversion funnel and prospect flow overview</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading analytics...</p>
              ) : analytics.data ? (
                <div className="space-y-6">
                  {/* Conversion Funnel */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Status Distribution (Conversion Funnel)</h4>
                    <div className="space-y-2">
                      {analytics.data.statusDistribution.map((item, idx) => {
                        const maxCount = Math.max(...analytics.data!.statusDistribution.map(d => d.count), 1);
                        const percentage = Math.round((item.count / maxCount) * 100);
                        const config = statusConfig[item.dbStatus];
                        const cs = customStatuses.find(c => c.name === item.label);
                        const barColor = cs ? cs.color : (config ? undefined : '#6366f1');
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs font-medium w-32 text-right truncate">{item.label}</span>
                            <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${!barColor ? (config?.color?.replace('text-', 'bg-').replace('-600', '-500') || 'bg-slate-400') : ''}`}
                                style={{ width: `${Math.max(percentage, 3)}%`, ...(barColor ? { backgroundColor: barColor } : {}) }}
                              />
                            </div>
                            <span className="text-sm font-bold w-8 text-right">{item.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Weekly Trend */}
                  {analytics.data.weeklyTrend.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Weekly New Prospects (Last 8 Weeks)</h4>
                      <div className="flex items-end gap-1 h-32">
                        {analytics.data.weeklyTrend.map((week, idx) => {
                          const maxNew = Math.max(...analytics.data!.weeklyTrend.map(w => w.newProspects), 1);
                          const height = Math.max((week.newProspects / maxNew) * 100, 5);
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs font-bold">{week.newProspects}</span>
                              <div
                                className="w-full bg-primary/70 rounded-t"
                                style={{ height: `${height}%` }}
                              />
                              <span className="text-[10px] text-muted-foreground truncate w-full text-center">{week.weekLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-2xl font-bold">{statsData?.prospects?.total || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Prospects</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">{Number(statsData?.prospects?.enrolledCount) || 0}</p>
                      <p className="text-xs text-muted-foreground">Enrolled</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{analytics.data.avgStatusChangeVelocity || '—'}</p>
                      <p className="text-xs text-muted-foreground">Avg Days Between Changes</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No analytics data available yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="templates">SMS Templates</TabsTrigger>
          </TabsList>
          
          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {activeView === 'active_pipeline' && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Zap className="h-3 w-3 mr-1" /> Active Pipeline
                  </Badge>
                )}
                {activeView === 'watch_list' && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    <EyeOff className="h-3 w-3 mr-1" /> Watch List
                  </Badge>
                )}
                {statusFilter !== 'all' && !activeView.startsWith('active') && !activeView.startsWith('watch') && (
                  <Badge variant="outline">
                    {statusFilter.startsWith('custom:') ? statusFilter.replace('custom:', '') : statusConfig[statusFilter]?.label || statusFilter}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { prospectList.refetch(); stats.refetch(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""}
              </span>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProspects(filteredProspects.map((p: any) => p.id));
                          } else {
                            setSelectedProspects([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Journey</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>SMS Sent</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Last Click</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Filter className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No prospects yet</p>
                        <p className="text-sm">Add your first prospect to start building your pipeline.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    prospects.map((prospect: any) => (
                      <TableRow key={prospect.id} className={prospect.smsOptOut ? "opacity-50" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProspects.includes(prospect.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProspects([...selectedProspects, prospect.id]);
                              } else {
                                setSelectedProspects(selectedProspects.filter((id) => id !== prospect.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            className="font-medium text-left hover:text-primary hover:underline"
                            onClick={() => { setSelectedProspect(prospect); setShowDetailDialog(true); }}
                          >
                            {prospect.name}
                          </button>
                          {!!prospect.smsOptOut && (
                            <Badge variant="outline" className="ml-2 text-xs text-red-600 border-red-200">Opted Out</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {prospect.phoneDisplay || prospect.phone}
                            </div>
                            {prospect.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {prospect.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={prospect.status} customStatus={prospect.customStatus} customStatuses={customStatuses} /></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-xs">
                            {prospect.linkedEnrollment ? (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-700 w-fit">
                                {prospect.linkedEnrollment.tier?.replace('_', ' ') || 'Enrolled'}
                                {prospect.linkedEnrollment.amount ? ` · $${Number(prospect.linkedEnrollment.amount).toLocaleString()}` : ''}
                              </Badge>
                            ) : prospect.linkedClient ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 w-fit">Client</Badge>
                            ) : (
                              <span className="text-muted-foreground">Prospect only</span>
                            )}
                            {prospect.linkedProject ? (
                              <div className="flex items-center gap-1">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${prospect.linkedProject.status === 'active' ? 'bg-green-500' : prospect.linkedProject.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                                <span className="text-muted-foreground">
                                  Stage {prospect.linkedProject.lifecycleStage || '?'}
                                  {prospect.linkedProject.assignedCoachName ? ` · ${prospect.linkedProject.assignedCoachName}` : ''}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{prospect.source || "—"}</TableCell>
                        <TableCell className="text-sm">{prospect.totalSmsSent}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prospect.lastContactedAt ? new Date(prospect.lastContactedAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prospect.lastClickedAt ? new Date(prospect.lastClickedAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openSmsDialog(prospect)}>
                                <Send className="h-4 w-4 mr-2" /> Send SMS
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedProspect(prospect); setShowDetailDialog(true); }}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(prospect)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => { setSelectedProspect(prospect); setShowDeleteDialog(true); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          {/* Kanban Board Tab */}
          <TabsContent value="kanban" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {activeView === 'active_pipeline' && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Zap className="h-3 w-3 mr-1" /> Active Pipeline
                  </Badge>
                )}
                {activeView === 'watch_list' && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    <EyeOff className="h-3 w-3 mr-1" /> Watch List
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { prospectList.refetch(); stats.refetch(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""}
              </span>
            </div>
            <KanbanBoard
              prospects={filteredProspects}
              customStatuses={customStatuses}
              onCardClick={(prospect) => { setSelectedProspect(prospect); setShowDetailDialog(true); }}
              onStatusChange={(prospectId, newStatus, customStatusName) => {
                updateProspectStatus.mutate({
                  id: prospectId,
                  status: newStatus as any,
                  customStatus: customStatusName || null,
                });
              }}
              statusOrder={(() => {
                try {
                  const raw = statusOrderQuery.data;
                  if (!raw) return [];
                  return JSON.parse(typeof raw === 'string' ? raw : (raw as any)?.value || '[]');
                } catch { return []; }
              })()}
            />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <SmsTemplatesTab />
          </TabsContent>
        </Tabs>
        
        {/* Add/Edit Prospect Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetForm(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Prospect" : "Add New Prospect"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Update prospect information." : "Add a new prospect to your pipeline. You can send them an SMS right after."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  type="email"
                />
              </div>
              <div>
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="How did you find them?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_referral">Personal Referral</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="event">Event/Workshop</SelectItem>
                    <SelectItem value="existing_client">Existing Client</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any context about this prospect..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
              <Button
                onClick={() => {
                  if (isEditing && selectedProspect) {
                    updateProspect.mutate({ id: selectedProspect.id, ...formData });
                  } else {
                    createProspect.mutate(formData);
                  }
                }}
                disabled={!formData.name || !formData.phone || createProspect.isPending || updateProspect.isPending}
              >
                {isEditing ? "Save Changes" : "Add Prospect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Send SMS Dialog */}
        <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Send SMS to {selectedProspect?.name}
              </DialogTitle>
              <DialogDescription>
                Sending to: {selectedProspect?.phoneDisplay || selectedProspect?.phone}
                {!smsConfigured && (
                  <span className="block text-amber-600 mt-1">
                    Twilio not configured — message will be logged but not delivered.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Message Template</Label>
                <Select
                  value={smsData.templateKey}
                  onValueChange={(v) => setSmsData({ ...smsData, templateKey: v, customMessage: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template or write custom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Message</SelectItem>
                    {(templates.data || []).filter((t: any) => t.isActive).map((t: any) => (
                      <SelectItem key={t.templateKey} value={t.templateKey}>
                        {t.name} ({t.category.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {smsData.templateKey === "custom" && (
                <div>
                  <Label>Custom Message</Label>
                  <Textarea
                    value={smsData.customMessage}
                    onChange={(e) => setSmsData({ ...smsData, customMessage: e.target.value })}
                    placeholder="Hey {{name}}, check out our coaching programs: {{link}}"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available variables: {"{{name}}"}, {"{{link}}"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {smsData.customMessage.length}/160 characters ({Math.ceil(smsData.customMessage.length / 160) || 1} SMS segment{Math.ceil(smsData.customMessage.length / 160) > 1 ? "s" : ""})
                  </p>
                </div>
              )}
              
              {smsData.templateKey && smsData.templateKey !== "custom" && (
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                  <p className="text-sm">
                    {(() => {
                      const template = (templates.data || []).find((t: any) => t.templateKey === smsData.templateKey);
                      if (!template) return "";
                      return template.body
                        .replace(/\{\{name\}\}/g, selectedProspect?.name?.split(" ")[0] || "")
                        .replace(/\{\{link\}\}/g, "[tracked link]")

                    })()}
                  </p>
                </div>
              )}
              
              <div>
                <Label>Link Destination</Label>
                <Select value={smsData.destination} onValueChange={(v) => setSmsData({ ...smsData, destination: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/transformation">Transformation Entry Page</SelectItem>
                    <SelectItem value="/transformation/select-tier">Tier Selection Page</SelectItem>
                    <SelectItem value="/launchpad">Launchpad Hub</SelectItem>
                    <SelectItem value="/">Home Page</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Where the tracked link in the SMS will take them.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSmsDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  sendSms.mutate({
                    prospectId: selectedProspect.id,
                    templateKey: smsData.templateKey === "custom" ? undefined : smsData.templateKey || undefined,
                    customMessage: smsData.templateKey === "custom" ? smsData.customMessage : undefined,
                    destination: smsData.destination,
                  });
                }}
                disabled={sendSms.isPending || (smsData.templateKey === "custom" && !smsData.customMessage)}
              >
                <Send className="h-4 w-4 mr-2" />
                {smsConfigured ? "Send SMS" : "Log SMS (Not Configured)"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Prospect Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={(open) => { setShowDetailDialog(open); if (!open) { setShowEngagementForm(false); setNewNote(""); } }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedProspect?.name}
              </DialogTitle>
              <DialogDescription>
                Added {selectedProspect?.createdAt ? new Date(selectedProspect.createdAt).toLocaleDateString() : ""}
                {selectedProspect?.source && ` • Source: ${selectedProspect.source}`}
              </DialogDescription>
            </DialogHeader>
            
            {prospectDetail.data && (
              <div className="space-y-4">
                {/* Things to Know Box */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5 text-amber-800">
                      <Lightbulb className="h-4 w-4" /> Things to Know About This Client
                    </h4>
                    {!thingsToKnowEditing ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-700" onClick={() => {
                        setThingsToKnowText(prospectDetail.data?.thingsToKnow || "");
                        setThingsToKnowEditing(true);
                      }}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setThingsToKnowEditing(false)}>
                          <X className="h-3 w-3" />
                        </Button>
                        <Button size="sm" className="h-7 text-xs" disabled={updateThingsToKnow.isPending} onClick={() => {
                          updateThingsToKnow.mutate({ prospectId: selectedProspect.id, thingsToKnow: thingsToKnowText });
                        }}>
                          <Save className="h-3 w-3 mr-1" /> Save
                        </Button>
                      </div>
                    )}
                  </div>
                  {thingsToKnowEditing ? (
                    <Textarea
                      value={thingsToKnowText}
                      onChange={(e) => setThingsToKnowText(e.target.value)}
                      placeholder="Key info about this client that should always be visible..."
                      className="min-h-[60px] bg-white text-sm"
                    />
                  ) : (
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">
                      {prospectDetail.data.thingsToKnow || <span className="text-amber-600 italic">Click Edit to add important notes about this client...</span>}
                    </p>
                  )}
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg flex-wrap">
                  <CircleDot className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Status:</Label>
                  <Select
                    key={`prospect-status-${prospectDetail.data.status}-${prospectDetail.data.customStatus || ''}`}
                    value={prospectDetail.data.customStatus ? `custom:${prospectDetail.data.customStatus}` : prospectDetail.data.status}
                    onValueChange={(val) => {
                      if (val.startsWith("custom:")) {
                        const customName = val.replace("custom:", "");
                        const cs = customStatuses.find(c => c.name === customName);
                        updateProspectStatus.mutate({ 
                          prospectId: selectedProspect.id, 
                          status: (cs?.enumValue || "new") as any,
                          customStatus: customName 
                        });
                      } else {
                        updateProspectStatus.mutate({ prospectId: selectedProspect.id, status: val as any });
                      }
                    }}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" textValue="New"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> New</span></SelectItem>
                      <SelectItem value="engaged" textValue="Engaged"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /> Engaged</span></SelectItem>
                      <SelectItem value="waiting_on_client" textValue="Waiting on Client"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Waiting on Client</span></SelectItem>
                      <SelectItem value="ready_for_consult" textValue="Ready for Consult"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Ready for Consult</span></SelectItem>
                      <SelectItem value="not_ready" textValue="Not Ready"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" /> Not Ready</span></SelectItem>
                      <SelectItem value="contacted" textValue="Contacted"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Contacted</span></SelectItem>
                      <SelectItem value="enrolled" textValue="Enrolled"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Enrolled</span></SelectItem>
                      <SelectItem value="declined" textValue="Declined"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Declined</span></SelectItem>
                      {customStatuses.map((cs) => (
                        <SelectItem key={cs.name} value={`custom:${cs.name}`} textValue={cs.name}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cs.color }} />
                            {cs.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <StatusBadge status={prospectDetail.data.status} customStatus={prospectDetail.data.customStatus} customStatuses={customStatuses} />
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                    setNewCustomStatusName("");
                    setNewCustomStatusColor("#6366f1");
                    setNewCustomStatusEnum("new");
                    setCustomStatusMode("add");
                    setShowCustomStatusDialog(true);
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Custom Status
                  </Button>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="font-medium">{prospectDetail.data.phoneDisplay || prospectDetail.data.phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{prospectDetail.data.email || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tracking Token</Label>
                    <p className="font-mono text-xs break-all">{prospectDetail.data.trackingToken}</p>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 min-w-0">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{prospectDetail.data.totalSmsSent}</p>
                      <p className="text-xs text-muted-foreground">SMS Sent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{prospectDetail.data.totalClicks}</p>
                      <p className="text-xs text-muted-foreground">Link Clicks</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{prospectDetail.data.followUpCount}</p>
                      <p className="text-xs text-muted-foreground">Follow-ups</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-sm font-medium truncate">
                        {prospectDetail.data.followUpPaused ? "Paused" : "Active"}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">Auto Follow-up</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Action Toolbar */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Log Engagement
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { type: "phone_call", label: "Phone Call", icon: <Phone className="h-3.5 w-3.5" /> },
                      { type: "email_sent", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
                      { type: "meeting", label: "Meeting", icon: <Users className="h-3.5 w-3.5" /> },
                      { type: "voicemail", label: "Voicemail", icon: <Phone className="h-3.5 w-3.5" /> },
                      { type: "follow_up_scheduled", label: "Follow-up", icon: <CalendarClock className="h-3.5 w-3.5" /> },
                      { type: "other", label: "Other", icon: <FileText className="h-3.5 w-3.5" /> },
                    ].map((action) => (
                      <Button
                        key={action.type}
                        variant={showEngagementForm && engagementData.eventType === action.type ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setEngagementData({ ...engagementData, eventType: action.type });
                          setShowEngagementForm(true);
                        }}
                      >
                        {action.icon}
                        <span className="ml-1">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                  
                  {/* Engagement Form */}
                  {showEngagementForm && (
                    <div className="mt-3 p-3 border rounded-lg bg-slate-50 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs">{engagementTypeConfig[engagementData.eventType]?.label || engagementData.eventType}</Badge>
                      </div>
                      <Textarea
                        placeholder="Notes about this interaction..."
                        value={engagementData.notes}
                        onChange={(e) => setEngagementData({ ...engagementData, notes: e.target.value })}
                        rows={2}
                      />
                      <div className="flex gap-3">
                        {(engagementData.eventType === "phone_call" || engagementData.eventType === "meeting") && (
                          <div className="flex-1">
                            <Label className="text-xs">Duration (min)</Label>
                            <Input
                              type="number"
                              placeholder="Minutes"
                              value={engagementData.duration}
                              onChange={(e) => setEngagementData({ ...engagementData, duration: e.target.value })}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <Label className="text-xs">Outcome</Label>
                          <Input
                            placeholder="e.g., Left voicemail, Scheduled follow-up"
                            value={engagementData.outcome}
                            onChange={(e) => setEngagementData({ ...engagementData, outcome: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setShowEngagementForm(false)}>Cancel</Button>
                        <Button
                          size="sm"
                          disabled={addEngagement.isPending}
                          onClick={() => addEngagement.mutate({
                            prospectId: selectedProspect.id,
                            eventType: engagementData.eventType as any,
                            notes: engagementData.notes || undefined,
                            duration: engagementData.duration ? parseInt(engagementData.duration) : undefined,
                            outcome: engagementData.outcome || undefined,
                          })}
                        >
                          {addEngagement.isPending ? "Saving..." : "Save Engagement"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Running Notes */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Notebook className="h-4 w-4" /> Notes
                  </h4>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newNote.trim()) {
                          appendNote.mutate({ prospectId: selectedProspect.id, note: newNote.trim() });
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={!newNote.trim() || appendNote.isPending}
                      onClick={() => appendNote.mutate({ prospectId: selectedProspect.id, note: newNote.trim() })}
                    >
                      {appendNote.isPending ? "..." : "Add"}
                    </Button>
                  </div>
                  {/* Legacy notes from original prospect creation - show if they exist */}
                  {prospectDetail.data.notes && !prospectDetail.data._legacyNotesMigrated && (
                    <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-amber-700">Original Notes</span>
                        <span className="text-xs text-amber-500">(from when prospect was created)</span>
                      </div>
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">{prospectDetail.data.notes}</p>
                    </div>
                  )}
                  {/* Individual note entries from engagement history */}
                  {(() => {
                    const noteEntries = (prospectDetail.data.engagement || []).filter((e: any) => e.eventType === "note");
                    if (noteEntries.length === 0 && !prospectDetail.data.notes) return <p className="text-sm text-muted-foreground">No notes yet.</p>;
                    if (noteEntries.length === 0) return null;
                    return (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {noteEntries.map((note: any) => (
                          <div key={note.id} className="text-sm border rounded p-2 bg-slate-50 group">
                            {editingNoteId === note.id ? (
                              <div className="flex gap-2">
                                <Input
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  className="text-sm h-8"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && editingNoteText.trim()) {
                                      editNote.mutate({ engagementId: note.id, note: editingNoteText.trim() });
                                    }
                                    if (e.key === "Escape") { setEditingNoteId(null); setEditingNoteText(""); }
                                  }}
                                />
                                <Button size="sm" className="h-8" disabled={editNote.isPending} onClick={() => editNote.mutate({ engagementId: note.id, note: editingNoteText.trim() })}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{note.loggedBy}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.notes || ""); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => setDeleteNoteId(note.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-muted-foreground">{note.notes}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                {/* SMS History */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" /> SMS History
                  </h4>
                  {prospectDetail.data.messages?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages sent yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {prospectDetail.data.messages?.map((msg: any) => (
                        <div key={msg.id} className="text-sm border rounded p-2">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant={msg.status === "delivered" || msg.status === "sent" ? "default" : msg.status === "not_configured" ? "secondary" : "destructive"} className="text-xs">
                              {msg.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground break-words whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Engagement History */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <MousePointerClick className="h-4 w-4" /> Engagement History
                  </h4>
                  {prospectDetail.data.engagement?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No engagement tracked yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {prospectDetail.data.engagement?.map((evt: any) => {
                        const config = engagementTypeConfig[evt.eventType] || engagementTypeConfig.other;
                        return (
                          <div key={evt.id} className="text-sm border rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span>{config.icon}</span>
                                <span className={`font-medium ${config.color}`}>{config.label}</span>
                                {evt.loggedBy && <span className="text-xs text-muted-foreground">by {evt.loggedBy}</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(evt.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {evt.notes && <p className="text-muted-foreground text-xs mt-1">{evt.notes}</p>}
                            {(evt.duration || evt.outcome) && (
                              <div className="flex gap-3 mt-1">
                                {evt.duration && <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{evt.duration} min</span>}
                                {evt.outcome && <span className="text-xs text-muted-foreground">Outcome: {evt.outcome}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => openEditDialog(selectedProspect)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button onClick={() => { setShowDetailDialog(false); openSmsDialog(selectedProspect); }}>
                <Send className="h-4 w-4 mr-2" /> Send SMS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Custom Status Management Dialog */}
        <Dialog open={showCustomStatusDialog} onOpenChange={(open) => {
          setShowCustomStatusDialog(open);
          if (!open) { setCustomStatusMode("manage"); setEditingCustomStatusIndex(null); setDeleteCustomStatusIndex(null); }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {customStatusMode === "manage" ? "Manage Custom Statuses" : customStatusMode === "add" ? "Add Custom Status" : "Edit Custom Status"}
              </DialogTitle>
              <DialogDescription>
                {customStatusMode === "manage" ? "View, edit, or delete your custom statuses. Click + to add new ones." : customStatusMode === "add" ? "Create a new custom status option." : "Update this custom status."}
              </DialogDescription>
            </DialogHeader>

            {customStatusMode === "manage" && (
              <div className="space-y-3">
                {customStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No custom statuses yet. Click the button below to add one.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customStatuses.map((cs, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cs.color }} />
                          <div>
                            <p className="text-sm font-medium">{cs.name}</p>
                            <p className="text-xs text-muted-foreground">Maps to: {statusConfig[cs.enumValue]?.label || cs.enumValue}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                            setEditingCustomStatusIndex(idx);
                            setNewCustomStatusName(cs.name);
                            setNewCustomStatusColor(cs.color);
                            setNewCustomStatusEnum(cs.enumValue);
                            setCustomStatusMode("edit");
                          }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => setDeleteCustomStatusIndex(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full" variant="outline" onClick={() => {
                  setNewCustomStatusName("");
                  setNewCustomStatusColor("#6366f1");
                  setNewCustomStatusEnum("new");
                  setCustomStatusMode("add");
                }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Custom Status
                </Button>
              </div>
            )}

            {(customStatusMode === "add" || customStatusMode === "edit") && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Status Name</Label>
                  <Input
                    value={newCustomStatusName}
                    onChange={(e) => setNewCustomStatusName(e.target.value)}
                    placeholder="e.g., Follow-up Needed"
                  />
                </div>
                <div>
                  <Label className="text-sm">Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="color"
                      value={newCustomStatusColor}
                      onChange={(e) => setNewCustomStatusColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{newCustomStatusColor}</span>
                    <Badge style={{ backgroundColor: newCustomStatusColor + '20', color: newCustomStatusColor, borderColor: newCustomStatusColor + '40' }} className="font-medium">
                      {newCustomStatusName || 'Preview'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Maps to built-in status</Label>
                  <Select value={newCustomStatusEnum} onValueChange={(v) => setNewCustomStatusEnum(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="engaged">Engaged</SelectItem>
                      <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                      <SelectItem value="ready_for_consult">Ready for Consult</SelectItem>
                      <SelectItem value="not_ready">Not Ready</SelectItem>
                      <SelectItem value="enrolled">Enrolled</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Used for filtering and pipeline grouping.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setCustomStatusMode("manage"); setEditingCustomStatusIndex(null); }}>Back</Button>
                  <Button
                    disabled={!newCustomStatusName.trim() || saveSetting.isPending}
                    onClick={() => {
                      if (customStatusMode === "edit" && editingCustomStatusIndex !== null) {
                        const updated = [...customStatuses];
                        updated[editingCustomStatusIndex] = { name: newCustomStatusName.trim(), color: newCustomStatusColor, enumValue: newCustomStatusEnum };
                        saveSetting.mutate({ key: "prospect_custom_statuses", value: JSON.stringify(updated) });
                      } else {
                        const updated = [...customStatuses, { name: newCustomStatusName.trim(), color: newCustomStatusColor, enumValue: newCustomStatusEnum }];
                        saveSetting.mutate({ key: "prospect_custom_statuses", value: JSON.stringify(updated) });
                      }
                    }}
                  >
                    {saveSetting.isPending ? "Saving..." : customStatusMode === "edit" ? "Save Changes" : "Add Status"}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {customStatusMode === "manage" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCustomStatusDialog(false)}>Close</Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Custom Status Confirmation */}
        <AlertDialog open={deleteCustomStatusIndex !== null} onOpenChange={(open) => { if (!open) setDeleteCustomStatusIndex(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Custom Status</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the custom status "{deleteCustomStatusIndex !== null ? customStatuses[deleteCustomStatusIndex]?.name : ''}"? 
                Prospects using this status will keep their underlying built-in status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (deleteCustomStatusIndex !== null) {
                    const updated = customStatuses.filter((_, i) => i !== deleteCustomStatusIndex);
                    saveSetting.mutate({ key: "prospect_custom_statuses", value: JSON.stringify(updated) });
                    setDeleteCustomStatusIndex(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Note Confirmation */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => { if (!open) setDeleteNoteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this note? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (deleteNoteId && selectedProspect) {
                    deleteNote.mutate({ engagementId: deleteNoteId, prospectId: selectedProspect.id });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Status Change Dialog */}
        <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Bulk Status Change</DialogTitle>
              <DialogDescription>
                Change the status of {selectedProspects.length} selected prospect{selectedProspects.length !== 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">New Status</Label>
                <Select value={bulkStatusTarget} onValueChange={(v) => {
                  setBulkStatusTarget(v);
                  setBulkCustomStatusTarget(undefined);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="engaged">Engaged</SelectItem>
                    <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                    <SelectItem value="ready_for_consult">Ready for Consult</SelectItem>
                    <SelectItem value="not_ready">Not Ready</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="viewing">Viewing</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="stalled">Stalled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {customStatuses.length > 0 && (
                <div>
                  <Label className="text-sm">Or use custom status</Label>
                  <Select value={bulkCustomStatusTarget || "__none__"} onValueChange={(v) => {
                    if (v === "__none__") {
                      setBulkCustomStatusTarget(undefined);
                    } else {
                      const cs = customStatuses.find(c => c.name === v);
                      if (cs) {
                        setBulkStatusTarget(cs.enumValue);
                        setBulkCustomStatusTarget(cs.name);
                      }
                    }
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (use built-in)</SelectItem>
                      {customStatuses.map((cs) => (
                        <SelectItem key={cs.name} value={cs.name} textValue={cs.name}>
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cs.color }} />
                            {cs.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkStatusDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  bulkUpdateStatus.mutate({
                    prospectIds: selectedProspects,
                    status: bulkStatusTarget as any,
                    customStatus: bulkCustomStatusTarget,
                  });
                }}
                disabled={bulkUpdateStatus.isPending}
              >
                {bulkUpdateStatus.isPending ? 'Updating...' : `Update ${selectedProspects.length} Prospect${selectedProspects.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Prospect</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedProspect?.name}</strong>? This will also delete all SMS history and engagement data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteProspect.mutate({ id: selectedProspect.id })}
                disabled={deleteProspect.isPending}
              >
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// SMS Templates sub-tab component
function SmsTemplatesTab() {
  const templates = trpc.prospect.getTemplates.useQuery();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    templateKey: "", name: "", description: "", body: "",
    category: "custom" as string, isDefault: false, sendAfterHours: null as number | null,
  });
  
  const createTemplate = trpc.prospect.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      setShowEditDialog(false);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const updateTemplate = trpc.prospect.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      setShowEditDialog(false);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const deleteTemplate = trpc.prospect.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  
  function openNewTemplate() {
    setEditingTemplate(null);
    setTemplateForm({
      templateKey: "", name: "", description: "", body: "",
      category: "custom", isDefault: false, sendAfterHours: null,
    });
    setShowEditDialog(true);
  }
  
  function openEditTemplate(t: any) {
    setEditingTemplate(t);
    setTemplateForm({
      templateKey: t.templateKey,
      name: t.name,
      description: t.description || "",
      body: t.body,
      category: t.category,
      isDefault: t.isDefault,
      sendAfterHours: t.sendAfterHours,
    });
    setShowEditDialog(true);
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">SMS Message Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize the messages sent to prospects. Use {"{{name}}"} and {"{{link}}"} as variables.
          </p>
        </div>
        <Button onClick={openNewTemplate}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>
      
      <div className="grid gap-3">
        {(templates.data || []).map((t: any) => (
          <Card key={t.id} className={!t.isActive ? "opacity-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{t.name}</h4>
                    <Badge variant="outline" className="text-xs">{t.category.replace("_", " ")}</Badge>
                    {t.isDefault && <Badge className="text-xs bg-blue-100 text-blue-800">Default</Badge>}
                    {!t.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    {t.sendAfterHours && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> After {t.sendAfterHours}h
                      </Badge>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                  <p className="text-sm bg-slate-50 rounded p-2 font-mono">{t.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.body.length} chars • {Math.ceil(t.body.length / 160)} SMS segment{Math.ceil(t.body.length / 160) > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1 ml-3">
                  <Button variant="ghost" size="sm" onClick={() => openEditTemplate(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => {
                      if (confirm(`Delete template "${t.name}"?`)) {
                        deleteTemplate.mutate({ id: t.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Template Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New SMS Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template Key</Label>
                <Input
                  value={templateForm.templateKey}
                  onChange={(e) => setTemplateForm({ ...templateForm, templateKey: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                  placeholder="my_template"
                  disabled={!!editingTemplate}
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Template Name"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="What is this template for?"
              />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                placeholder="Hey {{name}}, check out our programs: {{link}}"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {"{{name}}"} (first name), {"{{link}}"} (tracked link)
              </p>
              <p className="text-xs text-muted-foreground">
                {templateForm.body.length}/160 chars • {Math.ceil(templateForm.body.length / 160) || 1} segment{Math.ceil(templateForm.body.length / 160) > 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={templateForm.category} onValueChange={(v) => setTemplateForm({ ...templateForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_outreach">Initial Outreach</SelectItem>
                    <SelectItem value="follow_up">Follow-Up</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Auto-send After (hours)</Label>
                <Input
                  type="number"
                  value={templateForm.sendAfterHours ?? ""}
                  onChange={(e) => setTemplateForm({ ...templateForm, sendAfterHours: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="e.g., 48"
                />
                <p className="text-xs text-muted-foreground mt-1">For follow-up automation</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editingTemplate) {
                  updateTemplate.mutate({ id: editingTemplate.id, ...templateForm } as any);
                } else {
                  createTemplate.mutate(templateForm as any);
                }
              }}
              disabled={!templateForm.templateKey || !templateForm.name || !templateForm.body}
            >
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
