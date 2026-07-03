import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  FolderKanban,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  XCircle,
  GripVertical,
  LayoutGrid,
  List,
  ListTodo,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

const statusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Pause },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
};

// Draggable project card component for Kanban view
function DraggableProjectCard({ 
  project, 
  onClick,
  teamMembers,
  onUpdateProject,
}: { 
  project: any; 
  onClick: () => void;
  teamMembers: any[];
  onUpdateProject: (id: number, data: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: `project-${project.id}` });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const priority = priorityConfig[project.priority as keyof typeof priorityConfig];
  const assignedMember = teamMembers?.find((m: any) => m.id === project.assignedTeamMemberId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors group shadow-sm"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded flex-shrink-0 mt-0.5"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="cursor-pointer" onClick={onClick}>
            <p className="text-sm font-medium truncate">{project.clientName}</p>
            {project.clientEmail && (
              <p className="text-xs text-muted-foreground truncate">{project.clientEmail}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Progress 
                value={(project as any).progress?.taskProgress || 0} 
                className="h-1.5 flex-1" 
              />
              <span className="text-xs text-muted-foreground">
                {(project as any).progress?.taskProgress || 0}%
              </span>
            </div>
          </div>
          {/* Inline edit row: priority + team member */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {/* Priority inline selector */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer hover:opacity-80 transition-opacity ${priority.color}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {priority.label}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-0.5">
                  {Object.entries(priorityConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${project.priority === key ? 'bg-muted font-medium' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (project.priority !== key) {
                          onUpdateProject(project.id, { priority: key });
                        }
                      }}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${cfg.color.split(' ')[0]}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Team member inline selector */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-muted bg-muted/50 text-muted-foreground cursor-pointer hover:opacity-80 transition-opacity truncate max-w-[100px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Users className="h-2.5 w-2.5 flex-shrink-0" />
                  {assignedMember ? assignedMember.name.split(' ')[0] : 'Assign'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  <button
                    className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${!project.assignedTeamMemberId ? 'bg-muted font-medium' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateProject(project.id, { assignedTeamMemberId: null });
                    }}
                  >
                    <span className="text-muted-foreground">Unassigned</span>
                  </button>
                  {teamMembers?.map((member: any) => (
                    <button
                      key={member.id}
                      className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${project.assignedTeamMemberId === member.id ? 'bg-muted font-medium' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (project.assignedTeamMemberId !== member.id) {
                          onUpdateProject(project.id, { assignedTeamMemberId: member.id });
                        }
                      }}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

// Droppable stage column component for Kanban view
function DroppableStageColumn({ 
  stage, 
  projects, 
  onProjectClick,
  isOver,
  teamMembers,
  onUpdateProject,
}: { 
  stage: any; 
  projects: any[]; 
  onProjectClick: (projectId: number) => void;
  isOver: boolean;
  teamMembers: any[];
  onUpdateProject: (id: number, data: any) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
    data: { stageId: stage.id },
  });

  return (
    <Card 
      ref={setNodeRef}
      className={`min-h-[400px] flex flex-col transition-all duration-200 ${
        isOver 
          ? "ring-2 ring-blue-400 bg-blue-50/50 shadow-lg" 
          : ""
      }`}
    >
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color || "#6B7280" }}
          />
          <CardTitle className="text-sm truncate">{stage.name}</CardTitle>
        </div>
        <CardDescription className="text-xs">
          {projects.length} client{projects.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 overflow-y-auto">
        {projects.map(project => (
          <DraggableProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick(project.id)}
            teamMembers={teamMembers}
            onUpdateProject={onUpdateProject}
          />
        ))}
        {projects.length === 0 && (
          <div className={`text-center py-8 rounded-lg border-2 border-dashed transition-colors ${
            isOver ? "border-blue-400 bg-blue-50" : "border-transparent"
          }`}>
            <p className="text-xs text-muted-foreground">
              Drop clients here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectList() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [activeProject, setActiveProject] = useState<any>(null);
  const [overStageId, setOverStageId] = useState<number | null>(null);

  const { data: projects, refetch } = trpc.clientProject.list.useQuery();
  const { data: lifecycleStages } = trpc.lifecycleStage.list.useQuery();
  const { data: teamMembers } = trpc.teamMember.list.useQuery();

  const deleteMutation = trpc.clientProject.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const backfillTemplatesMutation = trpc.clientProject.backfillTemplates.useMutation({
    onSuccess: (data) => {
      toast.success(`Applied workflow templates to ${data.applied} projects. ${data.skipped} skipped.`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateLifecycleStageMutation = trpc.clientProject.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Client moved to new stage");
    },
    onError: (error: any) => {
      toast.error("Failed to update stage: " + error.message);
    },
  });

  const inlineUpdateMutation = trpc.clientProject.update.useMutation({
    onSuccess: (_data, variables) => {
      refetch();
      if (variables.priority) toast.success(`Priority updated to ${variables.priority}`);
      else if (variables.assignedTeamMemberId !== undefined) toast.success("Team member updated");
      else toast.success("Updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleInlineUpdate = useCallback((projectId: number, data: any) => {
    inlineUpdateMutation.mutate({ id: projectId, ...data });
  }, [inlineUpdateMutation]);

  // Drag and drop sensors - use PointerSensor with a small distance threshold
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = parseInt(event.active.id.toString().replace('project-', ''));
    const project = projects?.find(p => p.id === projectId);
    setActiveProject(project || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverStageId(null);
      return;
    }

    // Determine which stage we're hovering over
    const overId = over.id.toString();
    if (overId.startsWith('stage-')) {
      setOverStageId(parseInt(overId.replace('stage-', '')));
    } else if (overId.startsWith('project-')) {
      // Hovering over a project card — find its stage
      const overProjectId = parseInt(overId.replace('project-', ''));
      const overProject = projects?.find(p => p.id === overProjectId);
      setOverStageId(overProject?.currentLifecycleStageId || null);
    } else {
      setOverStageId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    setOverStageId(null);

    if (!over) return;

    const projectId = parseInt(active.id.toString().replace('project-', ''));
    
    // Determine target stage
    let targetStageId: number | null = null;
    const overId = over.id.toString();
    
    if (overId.startsWith('stage-')) {
      targetStageId = parseInt(overId.replace('stage-', ''));
    } else if (overId.startsWith('project-')) {
      const overProjectId = parseInt(overId.replace('project-', ''));
      const overProject = projects?.find(p => p.id === overProjectId);
      targetStageId = overProject?.currentLifecycleStageId || null;
    }

    if (!targetStageId) return;

    const project = projects?.find(p => p.id === projectId);
    if (!project || project.currentLifecycleStageId === targetStageId) return;

    // Update the project's lifecycle stage
    updateLifecycleStageMutation.mutate({
      id: projectId,
      currentLifecycleStageId: targetStageId,
    });
  };

  const handleDragCancel = () => {
    setActiveProject(null);
    setOverStageId(null);
  };

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    return projects.filter(project => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!project.clientName.toLowerCase().includes(query) &&
            !project.clientEmail?.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }
      
      // Stage filter
      if (stageFilter !== "all" && project.currentLifecycleStageId?.toString() !== stageFilter) {
        return false;
      }
      
      return true;
    });
  }, [projects, searchQuery, statusFilter, stageFilter]);

  // Projects by lifecycle stage for Kanban view
  const projectsByStage = useMemo(() => {
    if (!projects || !lifecycleStages) return {};
    
    const grouped: Record<number, typeof projects> = {};
    lifecycleStages.forEach(stage => {
      grouped[stage.id] = projects.filter(p => 
        p.currentLifecycleStageId === stage.id && 
        p.status === "active" &&
        (searchQuery === "" || 
          p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
    return grouped;
  }, [projects, lifecycleStages, searchQuery]);

  const getLifecycleStageName = (stageId: number | null) => {
    if (!stageId || !lifecycleStages) return "Not Set";
    const stage = lifecycleStages.find(s => s.id === stageId);
    return stage?.name || "Unknown";
  };

  const getLifecycleStageColor = (stageId: number | null) => {
    if (!stageId || !lifecycleStages) return "#6B7280";
    const stage = lifecycleStages.find(s => s.id === stageId);
    return stage?.color || "#6B7280";
  };

  const getTeamMemberName = (memberId: number | null) => {
    if (!memberId || !teamMembers) return "Unassigned";
    const member = teamMembers.find(m => m.id === memberId);
    return member?.name || "Unknown";
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the project for "${name}"? This will also delete all tasks, subtasks, and notes.`)) {
      deleteMutation.mutate({ id });
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!projects) return { active: 0, onHold: 0, completed: 0, total: 0 };
    return {
      active: projects.filter(p => p.status === "active").length,
      onHold: projects.filter(p => p.status === "on_hold").length,
      completed: projects.filter(p => p.status === "completed").length,
      total: projects.length,
    };
  }, [projects]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client Projects</h1>
            <p className="text-muted-foreground mt-1">
              Back-office client management and lifecycle tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                Table
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => backfillTemplatesMutation.mutate()}
              disabled={backfillTemplatesMutation.isPending}
            >
              <ListTodo className="h-4 w-4 mr-2" />
              {backfillTemplatesMutation.isPending ? "Applying..." : "Backfill Templates"}
            </Button>
            <Button onClick={() => setLocation("/admin/projects/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FolderKanban className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.onHold}</p>
                </div>
                <Pause className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {viewMode === "table" && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      {lifecycleStages?.map(stage => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Drag and drop clients between stages to update their lifecycle status instantly. Grab the grip handle on the left side of each card.
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 overflow-x-auto pb-4">
                {lifecycleStages?.map(stage => {
                  const stageProjects = projectsByStage[stage.id] || [];
                  return (
                    <DroppableStageColumn
                      key={stage.id}
                      stage={stage}
                      projects={stageProjects}
                      onProjectClick={(projectId) => setLocation(`/admin/projects/${projectId}`)}
                      isOver={overStageId === stage.id}
                      teamMembers={teamMembers || []}
                      onUpdateProject={handleInlineUpdate}
                    />
                  );
                })}
              </div>
              <DragOverlay dropAnimation={null}>
                {activeProject ? (
                  <div className="p-3 border rounded-lg bg-background shadow-xl w-56 rotate-2">
                    <p className="text-sm font-medium">{activeProject.clientName}</p>
                    {activeProject.clientEmail && (
                      <p className="text-xs text-muted-foreground truncate">{activeProject.clientEmail}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Progress 
                        value={(activeProject as any).progress?.taskProgress || 0} 
                        className="h-1.5 flex-1" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {(activeProject as any).progress?.taskProgress || 0}%
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredProjects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Lifecycle Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => {
                      const status = statusConfig[project.status as keyof typeof statusConfig];
                      const priority = priorityConfig[project.priority as keyof typeof priorityConfig];
                      const progress = (project as any).progress;
                      
                      return (
                        <TableRow 
                          key={project.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/projects/${project.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{project.clientName}</p>
                              {project.clientEmail && (
                                <p className="text-sm text-muted-foreground">{project.clientEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{ 
                                    borderColor: getLifecycleStageColor(project.currentLifecycleStageId),
                                    color: getLifecycleStageColor(project.currentLifecycleStageId),
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getLifecycleStageColor(project.currentLifecycleStageId) }}
                                  />
                                  {getLifecycleStageName(project.currentLifecycleStageId)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1" align="start">
                                <div className="space-y-0.5 max-h-64 overflow-y-auto">
                                  {lifecycleStages?.map((stage) => (
                                    <button
                                      key={stage.id}
                                      className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                                        project.currentLifecycleStageId === stage.id ? 'bg-muted font-medium' : ''
                                      }`}
                                      onClick={() => {
                                        if (project.currentLifecycleStageId !== stage.id) {
                                          updateLifecycleStageMutation.mutate({
                                            id: project.id,
                                            currentLifecycleStageId: stage.id,
                                          });
                                        }
                                      }}
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: stage.color || '#6B7280' }}
                                      />
                                      {stage.name}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={priority.color}>
                              {priority.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {progress?.taskProgress || 0}%
                                </span>
                              </div>
                              <Progress value={progress?.taskProgress || 0} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {getTeamMemberName(project.assignedTeamMemberId)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" aria-label="Project actions menu">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/admin/projects/${project.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(project.id, project.clientName);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderKanban className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No projects found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "all" || stageFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first client project to get started"}
                  </p>
                  {!searchQuery && statusFilter === "all" && stageFilter === "all" && (
                    <Button onClick={() => setLocation("/admin/projects/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
