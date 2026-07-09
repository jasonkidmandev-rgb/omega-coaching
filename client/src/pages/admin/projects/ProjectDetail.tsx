import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Pause,
  SkipForward,
  Trash2,
  MessageSquare,
  Pin,
  Activity,
  Users,
  Calendar,
  FileText,
  Loader2,
  Package,
  Truck,
  ExternalLink,
  Upload,
  File,
  Image,
  Receipt,
  FileCheck,
  Pencil,
  X,
  Edit,
  GripVertical,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddTaskDialog from "./project-detail/AddTaskDialog";
import AddSubtaskDialog from "./project-detail/AddSubtaskDialog";
import AddNoteDialog from "./project-detail/AddNoteDialog";
import AddTrackingDialog from "./project-detail/AddTrackingDialog";
import UploadFileDialog from "./project-detail/UploadFileDialog";

const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-600", icon: Circle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-600", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-600", icon: CheckCircle2 },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-600", icon: AlertCircle },
  skipped: { label: "Skipped", color: "bg-slate-100 text-slate-400", icon: SkipForward },
};

const projectStatusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

const noteTypeConfig = {
  general: { label: "General", color: "bg-slate-100 text-slate-600" },
  decision: { label: "Decision", color: "bg-purple-100 text-purple-600" },
  handoff: { label: "Handoff", color: "bg-blue-100 text-blue-600" },
  issue: { label: "Issue", color: "bg-red-100 text-red-600" },
  update: { label: "Update", color: "bg-green-100 text-green-600" },
};

export default function ProjectDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const goBack = useGoBack("/admin/projects");
  const isNew = !params.id || params.id === "new";
  const projectId = isNew ? null : parseInt(params.id || "0");

  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    status: "active" as "active" | "on_hold" | "completed" | "cancelled",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    currentLifecycleStageId: undefined as number | undefined,
    assignedTeamMemberId: undefined as number | undefined,
    workflowTemplateId: undefined as number | undefined,
    clientProtocolId: undefined as number | undefined,
  });

  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddSubtaskDialogOpen, setIsAddSubtaskDialogOpen] = useState(false);
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState({ name: "", description: "", lifecycleStageId: 0 });
  const [newSubtaskData, setNewSubtaskData] = useState({ name: "", description: "" });
  const [newNoteData, setNewNoteData] = useState({ content: "", noteType: "general" as "general" | "decision" | "handoff" | "issue" | "update" });
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteData, setEditNoteData] = useState({ content: "", noteType: "general" as "general" | "decision" | "handoff" | "issue" | "update" });
  const [isAddTrackingDialogOpen, setIsAddTrackingDialogOpen] = useState(false);
  const [newTrackingData, setNewTrackingData] = useState({ trackingNumber: "", carrier: "", description: "" });
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("document");
  const [uploadDescription, setUploadDescription] = useState("");

  const trpcUtils = trpc.useUtils();

  const { data: project, refetch: refetchProject } = trpc.clientProject.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );
  const { data: lifecycleStages } = trpc.lifecycleStage.list.useQuery();
  const { data: teamMembers } = trpc.teamMember.list.useQuery();
  const { data: workflowTemplates } = trpc.workflowTemplate.list.useQuery();
  const { data: tasks, refetch: refetchTasks } = trpc.clientProject.getTasks.useQuery(
    { clientProjectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: notes, refetch: refetchNotes } = trpc.clientProject.getNotes.useQuery(
    { clientProjectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: activityLog } = trpc.clientProject.getActivityLog.useQuery(
    { clientProjectId: projectId!, limit: 20 },
    { enabled: !!projectId }
  );
  const { data: trackingInfo, refetch: refetchTrackingInfo } = trpc.clientProject.getTrackingInfo.useQuery(
    { clientProjectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: attachments, refetch: refetchAttachments } = trpc.clientProject.getAttachments.useQuery(
    { clientProjectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: clientProtocols } = trpc.clientProtocol.list.useQuery();
  const { data: clients } = trpc.clientProtocol.list.useQuery(); // Clients are stored in clientProtocol table
  
  // Get linked protocol details if project has one
  const linkedProtocol = project?.clientProtocolId 
    ? clientProtocols?.find(p => p.id === project.clientProtocolId)
    : null;

  // Mutations
  const createMutation = trpc.clientProject.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created");
      setLocation(`/admin/projects/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.clientProject.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated");
      refetchProject();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const applyTemplateMutation = trpc.clientProject.applyTemplate.useMutation({
    onSuccess: () => {
      toast.success("Workflow template applied successfully");
      refetchTasks();
      refetchProject();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createTaskMutation = trpc.clientProject.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      refetchTasks();
      setIsAddTaskDialogOpen(false);
      setNewTaskData({ name: "", description: "", lifecycleStageId: 0 });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTaskMutation = trpc.clientProject.updateTask.useMutation({
    onSuccess: () => {
      refetchTasks();
      refetchProject();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createSubtaskMutation = trpc.clientProject.createSubtask.useMutation({
    onSuccess: () => {
      toast.success("Subtask created");
      trpcUtils.clientProject.getSubtasks.invalidate();
      setIsAddSubtaskDialogOpen(false);
      setNewSubtaskData({ name: "", description: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSubtaskMutation = trpc.clientProject.updateSubtask.useMutation({
    onSuccess: () => {
      trpcUtils.clientProject.getSubtasks.invalidate();
      refetchProject();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderTasksMutation = trpc.clientProject.reorderTasks.useMutation({
    onSuccess: () => {
      refetchTasks();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderSubtasksMutation = trpc.clientProject.reorderSubtasks.useMutation({
    onSuccess: () => {
      trpcUtils.clientProject.getSubtasks.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createNoteMutation = trpc.clientProject.createNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      refetchNotes();
      setIsAddNoteDialogOpen(false);
      setNewNoteData({ content: "", noteType: "general" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteNoteMutation = trpc.clientProject.deleteNote.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      refetchNotes();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateNoteMutation = trpc.clientProject.updateNote.useMutation({
    onSuccess: () => {
      toast.success("Note updated");
      refetchNotes();
      setEditingNoteId(null);
      setEditNoteData({ content: "", noteType: "general" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Tracking Info mutations
  const createTrackingMutation = trpc.clientProject.createTrackingInfo.useMutation({
    onSuccess: () => {
      toast.success("Tracking info added");
      refetchTrackingInfo();
      setIsAddTrackingDialogOpen(false);
      setNewTrackingData({ trackingNumber: "", carrier: "", description: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTrackingMutation = trpc.clientProject.deleteTrackingInfo.useMutation({
    onSuccess: () => {
      toast.success("Tracking info deleted");
      refetchTrackingInfo();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Attachment mutations
  const createAttachmentMutation = trpc.clientProject.createAttachment.useMutation({
    onSuccess: () => {
      toast.success("File uploaded");
      refetchAttachments();
      setIsUploadDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAttachmentMutation = trpc.clientProject.deleteAttachment.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      refetchAttachments();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Load project data into form
  useEffect(() => {
    if (project) {
      setFormData({
        clientName: project.clientName,
        clientEmail: project.clientEmail || "",
        status: project.status,
        priority: project.priority,
        currentLifecycleStageId: project.currentLifecycleStageId ?? undefined,
        assignedTeamMemberId: project.assignedTeamMemberId ?? undefined,
        workflowTemplateId: project.workflowTemplateId ?? undefined,
        clientProtocolId: project.clientProtocolId ?? undefined,
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({ id: projectId!, ...formData });
    }
  };

  const toggleTaskExpanded = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getLifecycleStageName = (stageId: number | null) => {
    if (!stageId || !lifecycleStages) return "Not Set";
    const stage = lifecycleStages.find(s => s.id === stageId);
    return stage?.name || "Unknown";
  };

  const getTeamMemberName = (memberId: number | null) => {
    if (!memberId || !teamMembers) return "Unassigned";
    const member = teamMembers.find(m => m.id === memberId);
    return member?.name || "Unknown";
  };

  // Group tasks by lifecycle stage
  const tasksByStage = tasks?.reduce((acc, task) => {
    const stageId = task.lifecycleStageId;
    if (!acc[stageId]) {
      acc[stageId] = [];
    }
    acc[stageId].push(task);
    return acc;
  }, {} as Record<number, typeof tasks>) || {};

  // DnD sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle task drag end
  const handleTaskDragEnd = (event: DragEndEvent, stageId: number) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const stageTasks = tasksByStage[stageId] || [];
      const oldIndex = stageTasks.findIndex(t => t.id === active.id);
      const newIndex = stageTasks.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(stageTasks, oldIndex, newIndex);
      reorderTasksMutation.mutate({ taskIds: newOrder.map(t => t.id) });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? "New Project" : project?.clientName || "Loading..."}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew ? "Create a new client project" : "Manage client lifecycle and tasks"}
            </p>
          </div>
          {!isNew && project && (
            <Badge variant="outline" className={projectStatusConfig[project.status].color}>
              {projectStatusConfig[project.status].label}
            </Badge>
          )}
        </div>

        {/* Progress Overview (for existing projects) */}
        {!isNew && project && (project as any).progress && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Task Progress</p>
                  <div className="flex items-center gap-3">
                    <Progress value={(project as any).progress.taskProgress} className="flex-1" />
                    <span className="text-sm font-medium">{(project as any).progress.taskProgress}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(project as any).progress.completedTasks} of {(project as any).progress.totalTasks} tasks
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Subtask Progress</p>
                  <div className="flex items-center gap-3">
                    <Progress value={(project as any).progress.subtaskProgress} className="flex-1" />
                    <span className="text-sm font-medium">{(project as any).progress.subtaskProgress}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(project as any).progress.completedSubtasks} of {(project as any).progress.totalSubtasks} subtasks
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Stage</p>
                  <p className="font-medium">{getLifecycleStageName(project.currentLifecycleStageId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Assigned To</p>
                  <p className="font-medium">{getTeamMemberName(project.assignedTeamMemberId)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Protocol Card */}
        {!isNew && linkedProtocol && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Linked Protocol
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(`/admin/clients/${linkedProtocol.id}`)}
                >
                  View Protocol
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{linkedProtocol.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="secondary">{linkedProtocol.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{linkedProtocol.durationMonths} months</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{toLocaleDateStringMT(linkedProtocol.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            {!isNew && (
              <>
                <TabsTrigger value="tasks">Tasks & Subtasks</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  {isNew ? "Enter client information and select a workflow template" : "Update project information"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isNew && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="selectClient">Select Existing Client (Optional)</Label>
                        <Select
                          value="none"
                          onValueChange={(value) => {
                            if (value !== "none") {
                              const selectedClient = clients?.find(c => c.id.toString() === value);
                              if (selectedClient) {
                                setFormData({
                                  ...formData,
                                  clientName: selectedClient.clientName,
                                  clientEmail: selectedClient.clientEmail || "",
                                  clientProtocolId: selectedClient.id,
                                });
                              }
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a client or enter new details below" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Enter New Client Details --</SelectItem>
                            {clients?.filter(c => !c.deletedAt && !c.archivedAt).map(client => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.clientName} {client.clientEmail ? `(${client.clientEmail})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select an existing client to auto-fill their details, or enter new client information below
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name *</Label>
                      <Input
                        id="clientName"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lifecycleStage">Current Lifecycle Stage</Label>
                      <Select
                        value={formData.currentLifecycleStageId?.toString() || "none"}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          currentLifecycleStageId: value === "none" ? undefined : parseInt(value) 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not Set</SelectItem>
                          {lifecycleStages?.map(stage => (
                            <SelectItem key={stage.id} value={stage.id.toString()}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedTo">Assigned To</Label>
                      <Select
                        value={formData.assignedTeamMemberId?.toString() || "none"}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          assignedTeamMemberId: value === "none" ? undefined : parseInt(value) 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {teamMembers?.map(member => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientProtocol">Linked Protocol</Label>
                      <Select
                        value={formData.clientProtocolId?.toString() || "none"}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          clientProtocolId: value === "none" ? undefined : parseInt(value) 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Link to protocol (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Protocol Linked</SelectItem>
                          {clientProtocols?.filter(p => !p.deletedAt && !p.archivedAt).map(protocol => (
                            <SelectItem key={protocol.id} value={protocol.id.toString()}>
                              {protocol.clientName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isNew && (
                      <div className="space-y-2">
                        <Label htmlFor="workflowTemplate">Workflow Template</Label>
                        <Select
                          value={formData.workflowTemplateId?.toString() || "none"}
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            workflowTemplateId: value === "none" ? undefined : parseInt(value) 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Template</SelectItem>
                            {workflowTemplates?.map(template => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name} ({template.durationDays} days)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Selecting a template will automatically create tasks and subtasks
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <Save className="h-4 w-4 mr-2" />
                      {isNew ? "Create Project" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          {!isNew && (
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tasks & Subtasks</CardTitle>
                      <CardDescription>
                        Manage operational tasks for this client
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsAddTaskDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {lifecycleStages && lifecycleStages.length > 0 ? (
                    <div className="space-y-6">
                      {lifecycleStages.map(stage => {
                        const stageTasks = tasksByStage[stage.id] || [];
                        if (stageTasks.length === 0) return null;
                        
                        return (
                          <div key={stage.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.color || "#6B7280" }}
                              />
                              <h3 className="font-semibold">{stage.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {stageTasks.length} task{stageTasks.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleTaskDragEnd(event, stage.id)}
                            >
                              <SortableContext
                                items={stageTasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2 ml-5">
                                  {stageTasks.map(task => (
                                    <SortableTaskItem
                                      key={task.id}
                                      task={task}
                                      isExpanded={expandedTasks.has(task.id)}
                                      onToggleExpand={() => toggleTaskExpanded(task.id)}
                                      onStatusChange={(status) => updateTaskMutation.mutate({ id: task.id, status })}
                                      onAddSubtask={() => {
                                        setSelectedTaskId(task.id);
                                        setIsAddSubtaskDialogOpen(true);
                                      }}
                                      updateSubtaskMutation={updateSubtaskMutation}
                                      onUpdateDueDate={(dueDate) => updateTaskMutation.mutate({ id: task.id, dueDate })}
                                      teamMembers={teamMembers || []}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        );
                      })}
                      {tasks?.length === 0 && (
                        <div className="text-center py-8 space-y-4">
                          <p className="text-muted-foreground">No tasks yet. Add a task or apply a workflow template.</p>
                          {!project?.workflowTemplateId && workflowTemplates && workflowTemplates.length > 0 && (
                            <div className="flex items-center justify-center gap-2">
                              <Select
                                onValueChange={(value) => {
                                  if (projectId) {
                                    applyTemplateMutation.mutate({
                                      clientProjectId: projectId,
                                      workflowTemplateId: parseInt(value),
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-64">
                                  <SelectValue placeholder="Apply a workflow template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {workflowTemplates.map(template => (
                                    <SelectItem key={template.id} value={template.id.toString()}>
                                      {template.name} ({template.durationDays} days)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Set up lifecycle stages first to organize tasks.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tracking Tab */}
          {!isNew && (
            <TabsContent value="tracking">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Tracking Information
                      </CardTitle>
                      <CardDescription>
                        Track shipments and deliveries for this project
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsAddTrackingDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tracking
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {trackingInfo && trackingInfo.length > 0 ? (
                    <div className="space-y-4">
                      {trackingInfo.map(tracking => {
                        // Generate tracking URL based on carrier
                        const getTrackingUrl = (carrier: string | null, trackingNumber: string) => {
                          if (tracking.carrierUrl) return tracking.carrierUrl;
                          const carrierLower = (carrier || "").toLowerCase();
                          if (carrierLower.includes("ups")) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
                          if (carrierLower.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
                          if (carrierLower.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
                          if (carrierLower.includes("dhl")) return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
                          return `https://www.google.com/search?q=${trackingNumber}+tracking`;
                        };
                        const trackingUrl = getTrackingUrl(tracking.carrier, tracking.trackingNumber);
                        const statusColors = {
                          pending: "bg-slate-100 text-slate-600",
                          in_transit: "bg-blue-100 text-blue-600",
                          delivered: "bg-green-100 text-green-600",
                          exception: "bg-red-100 text-red-600",
                        };
                        return (
                          <div key={tracking.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    {tracking.trackingNumber}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  {tracking.status && (
                                    <Badge variant="secondary" className={statusColors[tracking.status as keyof typeof statusColors]}>
                                      {tracking.status.replace("_", " ")}
                                    </Badge>
                                  )}
                                </div>
                                {tracking.carrier && (
                                  <p className="text-sm text-muted-foreground">Carrier: {tracking.carrier}</p>
                                )}
                                {tracking.description && (
                                  <p className="text-sm">{tracking.description}</p>
                                )}
                                {tracking.estimatedDelivery && (
                                  <p className="text-xs text-muted-foreground">
                                    Est. Delivery: {toLocaleDateStringMT(tracking.estimatedDelivery, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (confirm("Delete this tracking info?")) {
                                    deleteTrackingMutation.mutate({ id: tracking.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No tracking information yet. Add tracking numbers for shipments.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Notes Tab */}
          {!isNew && (
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Internal Notes</CardTitle>
                      <CardDescription>
                        Document decisions, handoffs, and context
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsAddNoteDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {notes && notes.length > 0 ? (
                    <div className="space-y-4">
                      {notes.map(note => (
                        <div 
                          key={note.id} 
                          className={`border rounded-lg p-4 ${note.isPinned ? "border-amber-300 bg-amber-50" : ""}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={noteTypeConfig[note.noteType].color}>
                                {noteTypeConfig[note.noteType].label}
                              </Badge>
                              {note.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {toLocaleDateStringMT(note.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteData({ content: note.content, noteType: note.noteType });
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  if (confirm("Delete this note?")) {
                                    deleteNoteMutation.mutate({ id: note.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editNoteData.content}
                                onChange={(e) => setEditNoteData(prev => ({ ...prev, content: e.target.value }))}
                                className="min-h-[100px]"
                              />
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editNoteData.noteType}
                                  onValueChange={(value: "general" | "decision" | "handoff" | "issue" | "update") => setEditNoteData(prev => ({ ...prev, noteType: value }))}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="handoff">Handoff</SelectItem>
                                    <SelectItem value="decision">Decision</SelectItem>
                                    <SelectItem value="followup">Follow-up</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updateNoteMutation.mutate({
                                      id: note.id,
                                      content: editNoteData.content,
                                      noteType: editNoteData.noteType,
                                    });
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditNoteData({ content: "", noteType: "general" });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          )}
                          {note.authorName && (
                            <p className="text-xs text-muted-foreground mt-2">— {note.authorName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No notes yet. Add internal notes to document context and decisions.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Files Tab */}
          {!isNew && (
            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Project Files
                      </CardTitle>
                      <CardDescription>
                        Upload and manage project documents and attachments
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {attachments && attachments.length > 0 ? (
                    <div className="space-y-3">
                      {attachments.map(attachment => {
                        const categoryIcons = {
                          document: FileText,
                          image: Image,
                          receipt: Receipt,
                          packing_slip: FileCheck,
                          lab_results: FileText,
                          other: File,
                        };
                        const Icon = categoryIcons[attachment.category as keyof typeof categoryIcons] || File;
                        // Check if this is an image file
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.fileName || '');
                        
                        return (
                          <div key={attachment.id} className="border rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              {/* Image Preview for JPEG/PNG files */}
                              {isImage && attachment.s3Url ? (
                                <a
                                  href={attachment.s3Url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0"
                                >
                                  <img
                                    src={attachment.s3Url}
                                    alt={attachment.fileName || 'Image'}
                                    className="w-24 h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1 min-w-0">
                                <a
                                  href={attachment.s3Url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {attachment.fileName}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {attachment.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {attachment.category.replace("_", " ")}
                                    </Badge>
                                  )}
                                  {attachment.fileSize && (
                                    <span>{(attachment.fileSize / 1024).toFixed(1)} KB</span>
                                  )}
                                  <span>{toLocaleDateStringMT(attachment.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                                </div>
                                {attachment.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{attachment.description}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => {
                                  if (confirm("Delete this file?")) {
                                    deleteAttachmentMutation.mutate({ id: attachment.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No files uploaded yet. Upload documents, receipts, or other project files.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Packing Slip Section - only show if project has a linked protocol */}
              {linkedProtocol && (
                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Packing Slip
                        </CardTitle>
                        <CardDescription>
                          View packing slip for this client's protocol order
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`/admin/packing-slips?protocolId=${linkedProtocol.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Packing Slip
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Client:</span>
                          <span className="ml-2 font-medium">{linkedProtocol.clientName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Protocol:</span>
                          <span className="ml-2 font-medium">{'Protocol #' + linkedProtocol.id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <Badge className="ml-2" variant={linkedProtocol.status === 'approved' ? 'default' : 'secondary'}>
                            {linkedProtocol.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="ml-2">{toLocaleDateStringMT(linkedProtocol.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Activity Tab */}
          {!isNew && (
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>
                    Recent changes and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLog && activityLog.length > 0 ? (
                    <div className="space-y-3">
                      {activityLog.map(activity => (
                        <div key={activity.id} className="flex items-start gap-3 text-sm">
                          <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <p>{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {toLocaleDateStringMT(activity.createdAt)}
                              {activity.actorName && ` by ${activity.actorName}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        newTaskData={newTaskData}
        setNewTaskData={setNewTaskData}
        lifecycleStages={lifecycleStages}
        onSubmit={() => {
          if (!newTaskData.name || !newTaskData.lifecycleStageId) {
            toast.error("Please fill in required fields");
            return;
          }
          createTaskMutation.mutate({
            clientProjectId: projectId!,
            ...newTaskData,
          });
        }}
        isPending={createTaskMutation.isPending}
      />


      {/* Add Subtask Dialog */}
      <AddSubtaskDialog
        isOpen={isAddSubtaskDialogOpen}
        onOpenChange={setIsAddSubtaskDialogOpen}
        newSubtaskData={newSubtaskData}
        setNewSubtaskData={setNewSubtaskData}
        onSubmit={() => {
          if (!newSubtaskData.name || !selectedTaskId) {
            toast.error("Please fill in required fields");
            return;
          }
          createSubtaskMutation.mutate({
            projectTaskId: selectedTaskId,
            ...newSubtaskData,
          });
        }}
        isPending={createSubtaskMutation.isPending}
      />


      {/* Add Note Dialog */}
      <AddNoteDialog
        isOpen={isAddNoteDialogOpen}
        onOpenChange={setIsAddNoteDialogOpen}
        newNoteData={newNoteData}
        setNewNoteData={setNewNoteData}
        onSubmit={() => {
          if (!newNoteData.content) {
            toast.error("Please enter note content");
            return;
          }
          createNoteMutation.mutate({
            clientProjectId: projectId!,
            ...newNoteData,
          });
        }}
        isPending={createNoteMutation.isPending}
      />


      {/* Add Tracking Dialog */}
      <AddTrackingDialog
        isOpen={isAddTrackingDialogOpen}
        onOpenChange={setIsAddTrackingDialogOpen}
        newTrackingData={newTrackingData}
        setNewTrackingData={setNewTrackingData}
        onSubmit={() => {
          if (!newTrackingData.trackingNumber.trim()) {
            toast.error("Tracking number is required");
            return;
          }
          createTrackingMutation.mutate({
            clientProjectId: projectId!,
            trackingNumber: newTrackingData.trackingNumber,
            carrier: newTrackingData.carrier || undefined,
            description: newTrackingData.description || undefined,
          });
        }}
        isPending={createTrackingMutation.isPending}
      />


      {/* Upload File Dialog */}
      <UploadFileDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        uploadCategory={uploadCategory as any}
        setUploadCategory={setUploadCategory as any}
        uploadDescription={uploadDescription}
        setUploadDescription={setUploadDescription}
        onSubmit={async () => {
          if (!uploadFile) {
            toast.error("Please select a file");
            return;
          }
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(",")[1];
            createAttachmentMutation.mutate({
              clientProjectId: projectId!,
              fileName: uploadFile.name,
              fileType: uploadFile.type,
              fileSize: uploadFile.size,
              fileData: base64,
              category: uploadCategory as "document" | "image" | "receipt" | "packing_slip" | "lab_results" | "other",
              description: uploadDescription || undefined,
            });
          };
          reader.readAsDataURL(uploadFile);
        }}
        isPending={createAttachmentMutation.isPending}
      />
    </AdminLayout>
  );
}

// Helper function to check if a date is overdue
function isOverdue(dueDate: string | Date | null | undefined, status: string): boolean {
  if (!dueDate || status === "completed" || status === "skipped") return false;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < now;
}

// Helper function to check if due soon (within 2 days)
function isDueSoon(dueDate: string | Date | null | undefined, status: string): boolean {
  if (!dueDate || status === "completed" || status === "skipped") return false;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 2;
}

// Format date for display
function formatDueDate(dueDate: string | Date | null | undefined): string {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  
  return toLocaleDateStringMT(date, { month: "short", day: "numeric" });
}

// Task Item Component
function TaskItem({ 
  task, 
  isExpanded, 
  onToggleExpand, 
  onStatusChange,
  onAddSubtask,
  updateSubtaskMutation,
  onUpdateDueDate,
  teamMembers,
}: { 
  task: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: "pending" | "in_progress" | "completed" | "blocked" | "skipped") => void;
  onAddSubtask: () => void;
  updateSubtaskMutation: any;
  onUpdateDueDate?: (dueDate: string | null) => void;
  teamMembers: Array<{ id: number; name: string; email: string | null }>;
}) {
  const { data: subtasks } = trpc.clientProject.getSubtasks.useQuery({ projectTaskId: task.id });
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;
  const completedSubtasks = subtasks?.filter(s => s.status === "completed").length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const overdue = isOverdue(task.dueDate, task.status);
  const dueSoon = isDueSoon(task.dueDate, task.status);

  return (
    <div className={`border rounded-lg ${overdue ? "border-red-300 bg-red-50" : dueSoon ? "border-amber-300 bg-amber-50" : ""}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <div className="flex items-center gap-3 p-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={(checked) => onStatusChange(checked ? "completed" : "pending")}
          />
          <div className="flex-1">
            <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.name}
            </p>
            <div className="flex items-center gap-2">
              {totalSubtasks > 0 && (
                <p className="text-xs text-muted-foreground">
                  {completedSubtasks}/{totalSubtasks} subtasks
                </p>
              )}
              {task.dueDate && (
                <p className={`text-xs flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : dueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />
                  {overdue ? "Overdue: " : ""}{formatDueDate(task.dueDate)}
                </p>
              )}
            </div>
          </div>
          {overdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
          <Badge variant="secondary" className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 ml-12 space-y-3">
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            
            {/* Due Date Editor */}
            {onUpdateDueDate && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Due Date:</Label>
                <Input
                  type="date"
                  className="h-7 w-40 text-xs"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdateDueDate(e.target.value || null)}
                />
                {task.dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onUpdateDueDate(null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
            
            {subtasks && subtasks.length > 0 && (
              <div className="space-y-1">
                {subtasks.map(subtask => {
                  const subtaskOverdue = isOverdue(subtask.dueDate, subtask.status);
                  const subtaskDueSoon = isDueSoon(subtask.dueDate, subtask.status);
                  return (
                    <div 
                      key={subtask.id} 
                      className={`flex items-center gap-2 py-1 px-2 rounded ${subtaskOverdue ? "bg-red-50" : subtaskDueSoon ? "bg-amber-50" : ""}`}
                    >
                      <Checkbox
                        checked={subtask.status === "completed"}
                        onCheckedChange={(checked) => 
                          updateSubtaskMutation.mutate({ 
                            id: subtask.id, 
                            status: checked ? "completed" : "pending" 
                          })
                        }
                      />
                      <span className={`text-sm flex-1 ${subtask.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {subtask.name}
                      </span>
                      <Select
                        value={subtask.assignedTeamMemberId?.toString() || "unassigned"}
                        onValueChange={(value) => {
                          updateSubtaskMutation.mutate({
                            id: subtask.id,
                            assignedTeamMemberId: value === "unassigned" ? null : parseInt(value),
                          });
                        }}
                      >
                        <SelectTrigger className="w-[130px] h-7 text-xs">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map(member => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {subtask.dueDate && (
                        <span className={`text-xs ${subtaskOverdue ? "text-red-600" : subtaskDueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                          {subtaskOverdue ? "Overdue: " : ""}{formatDueDate(subtask.dueDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onAddSubtask}>
              <Plus className="h-3 w-3 mr-1" />
              Add Subtask
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Sortable Task Item Wrapper for drag-and-drop
function SortableTaskItem({ 
  task, 
  isExpanded, 
  onToggleExpand, 
  onStatusChange,
  onAddSubtask,
  updateSubtaskMutation,
  onUpdateDueDate,
  teamMembers,
}: { 
  task: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: "pending" | "in_progress" | "completed" | "blocked" | "skipped") => void;
  onAddSubtask: () => void;
  updateSubtaskMutation: any;
  onUpdateDueDate?: (dueDate: string | null) => void;
  teamMembers: Array<{ id: number; name: string; email: string | null }>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { data: subtasks } = trpc.clientProject.getSubtasks.useQuery({ projectTaskId: task.id });
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;
  const completedSubtasks = subtasks?.filter(s => s.status === "completed").length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const overdue = isOverdue(task.dueDate, task.status);
  const dueSoon = isDueSoon(task.dueDate, task.status);

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`border rounded-lg ${overdue ? "border-red-300 bg-red-50" : dueSoon ? "border-amber-300 bg-amber-50" : ""} ${isDragging ? "shadow-lg" : ""}`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <div className="flex items-center gap-3 p-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={(checked) => onStatusChange(checked ? "completed" : "pending")}
          />
          <div className="flex-1">
            <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
              {task.name}
            </p>
            <div className="flex items-center gap-2">
              {totalSubtasks > 0 && (
                <p className="text-xs text-muted-foreground">
                  {completedSubtasks}/{totalSubtasks} subtasks
                </p>
              )}
              {task.dueDate && (
                <p className={`text-xs flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : dueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />
                  {overdue ? "Overdue: " : ""}{formatDueDate(task.dueDate)}
                </p>
              )}
            </div>
          </div>
          {overdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
          <Badge variant="secondary" className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 ml-12 space-y-3">
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            
            {/* Due Date Editor */}
            {onUpdateDueDate && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Due Date:</Label>
                <Input
                  type="date"
                  className="h-7 w-40 text-xs"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => onUpdateDueDate(e.target.value || null)}
                />
                {task.dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onUpdateDueDate(null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
            
            {subtasks && subtasks.length > 0 && (
              <div className="space-y-1">
                {subtasks.map(subtask => {
                  const subtaskOverdue = isOverdue(subtask.dueDate, subtask.status);
                  const subtaskDueSoon = isDueSoon(subtask.dueDate, subtask.status);
                  return (
                    <div 
                      key={subtask.id} 
                      className={`flex items-center gap-2 py-1 px-2 rounded ${subtaskOverdue ? "bg-red-50" : subtaskDueSoon ? "bg-amber-50" : ""}`}
                    >
                      <Checkbox
                        checked={subtask.status === "completed"}
                        onCheckedChange={(checked) => 
                          updateSubtaskMutation.mutate({ 
                            id: subtask.id, 
                            status: checked ? "completed" : "pending" 
                          })
                        }
                      />
                      <span className={`text-sm flex-1 ${subtask.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {subtask.name}
                      </span>
                      <Select
                        value={subtask.assignedTeamMemberId?.toString() || "unassigned"}
                        onValueChange={(value) => {
                          updateSubtaskMutation.mutate({
                            id: subtask.id,
                            assignedTeamMemberId: value === "unassigned" ? null : parseInt(value),
                          });
                        }}
                      >
                        <SelectTrigger className="w-[130px] h-7 text-xs">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map(member => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {subtask.dueDate && (
                        <span className={`text-xs ${subtaskOverdue ? "text-red-600" : subtaskDueSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                          {subtaskOverdue ? "Overdue: " : ""}{formatDueDate(subtask.dueDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onAddSubtask}>
              <Plus className="h-3 w-3 mr-1" />
              Add Subtask
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
