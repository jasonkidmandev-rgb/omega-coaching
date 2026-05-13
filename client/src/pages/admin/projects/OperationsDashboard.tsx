import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  FolderKanban,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  Bell,
  BellRing,
  GripVertical,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const statusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Pause },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-300", icon: AlertCircle },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "High", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
};

// Draggable project card component
function DraggableProjectCard({ 
  project, 
  onClick 
}: { 
  project: any; 
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `project-${project.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-2 border rounded-lg bg-background hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <p className="text-sm font-medium truncate">{project.clientName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress 
              value={(project as any).progress?.taskProgress || 0} 
              className="h-1 flex-1" 
            />
            <span className="text-xs text-muted-foreground">
              {(project as any).progress?.taskProgress || 0}%
            </span>
          </div>
          {project.priority !== "normal" && (
            <Badge 
              variant="secondary" 
              className={`${priorityConfig[project.priority as keyof typeof priorityConfig].color} text-xs mt-1`}
            >
              {priorityConfig[project.priority as keyof typeof priorityConfig].label}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable stage column component
function DroppableStageColumn({ 
  stage, 
  projects, 
  onProjectClick 
}: { 
  stage: any; 
  projects: any[]; 
  onProjectClick: (projectId: number) => void;
}) {
  return (
    <Card className="min-h-[300px]">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color || "#6B7280" }}
          />
          <CardTitle className="text-sm">{stage.name}</CardTitle>
        </div>
        <CardDescription className="text-xs">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <SortableContext
          items={projects.map(p => `project-${p.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map(project => (
            <DraggableProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project.id)}
            />
          ))}
        </SortableContext>
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Drop projects here
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function OperationsDashboard() {
  const [, setLocation] = useLocation();
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>("all");
  const [activeProject, setActiveProject] = useState<any>(null);

  const { data: projects, refetch: refetchProjects } = trpc.clientProject.list.useQuery();
  const { data: lifecycleStages } = trpc.lifecycleStage.list.useQuery();
  const { data: teamMembers } = trpc.teamMember.list.useQuery();
  
  const updateLifecycleStageMutation = trpc.clientProject.update.useMutation({
    onSuccess: () => {
      refetchProjects();
      toast.success("Project moved to new stage");
    },
    onError: (error: any) => {
      toast.error("Failed to update project stage: " + error.message);
    },
  });

  // Drag and drop sensors
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

  // Stats calculations
  const stats = useMemo(() => {
    if (!projects) return {
      total: 0,
      active: 0,
      onHold: 0,
      completed: 0,
      urgent: 0,
      avgProgress: 0,
    };

    const activeProjects = projects.filter(p => p.status === "active");
    const totalProgress = activeProjects.reduce((sum, p) => sum + ((p as any).progress?.taskProgress || 0), 0);

    return {
      total: projects.length,
      active: activeProjects.length,
      onHold: projects.filter(p => p.status === "on_hold").length,
      completed: projects.filter(p => p.status === "completed").length,
      urgent: projects.filter(p => p.priority === "urgent").length,
      avgProgress: activeProjects.length > 0 ? Math.round(totalProgress / activeProjects.length) : 0,
    };
  }, [projects]);

  // Projects by lifecycle stage
  const projectsByStage = useMemo(() => {
    if (!projects || !lifecycleStages) return {};
    
    const grouped: Record<number, typeof projects> = {};
    lifecycleStages.forEach(stage => {
      grouped[stage.id] = projects.filter(p => 
        p.currentLifecycleStageId === stage.id && 
        p.status === "active" &&
        (teamMemberFilter === "all" || p.assignedTeamMemberId?.toString() === teamMemberFilter)
      );
    });
    return grouped;
  }, [projects, lifecycleStages, teamMemberFilter]);

  // Projects by team member
  const projectsByTeamMember = useMemo(() => {
    if (!projects || !teamMembers) return {};
    
    const grouped: Record<number, typeof projects> = {};
    teamMembers.forEach(member => {
      grouped[member.id] = projects.filter(p => 
        p.assignedTeamMemberId === member.id && 
        p.status === "active"
      );
    });
    // Unassigned projects
    grouped[0] = projects.filter(p => !p.assignedTeamMemberId && p.status === "active");
    return grouped;
  }, [projects, teamMembers]);

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

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const projectId = parseInt(event.active.id.toString().replace('project-', ''));
    const project = projects?.find(p => p.id === projectId);
    setActiveProject(project);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = parseInt(active.id.toString().replace('project-', ''));
    
    // Find which stage the project was dropped on
    // The over.id could be another project or the stage container
    let targetStageId: number | null = null;
    
    // Check if dropped over another project
    if (over.id.toString().startsWith('project-')) {
      const overProjectId = parseInt(over.id.toString().replace('project-', ''));
      const overProject = projects?.find(p => p.id === overProjectId);
      targetStageId = overProject?.currentLifecycleStageId || null;
    } else {
      // Dropped on stage container
      targetStageId = parseInt(over.id.toString().replace('stage-', ''));
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Operations Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Team coordination and project overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={teamMemberFilter} onValueChange={setTeamMemberFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {teamMembers?.map(member => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setLocation("/admin/projects/new")}>
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
            <TabsTrigger value="workload">Team Workload</TabsTrigger>
            <TabsTrigger value="urgent">Urgent Items</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Pipeline View with Drag and Drop */}
          <TabsContent value="pipeline">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Drag and drop projects between stages to update their lifecycle status instantly.
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {lifecycleStages?.map(stage => {
                  const stageProjects = projectsByStage[stage.id] || [];
                  return (
                    <DroppableStageColumn
                      key={stage.id}
                      stage={stage}
                      projects={stageProjects}
                      onProjectClick={(projectId) => setLocation(`/admin/projects/${projectId}`)}
                    />
                  );
                })}
              </div>
              <DragOverlay>
                {activeProject ? (
                  <div className="p-2 border rounded-lg bg-background shadow-lg">
                    <p className="text-sm font-medium">{activeProject.clientName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={(activeProject as any).progress?.taskProgress || 0} 
                        className="h-1 flex-1" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {(activeProject as any).progress?.taskProgress || 0}%
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          {/* Team Workload View */}
          <TabsContent value="workload">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Unassigned first */}
              {projectsByTeamMember[0]?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      Unassigned
                    </CardTitle>
                    <CardDescription>
                      {projectsByTeamMember[0].length} project{projectsByTeamMember[0].length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {projectsByTeamMember[0].map(project => (
                      <div
                        key={project.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/admin/projects/${project.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{project.clientName}</p>
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: getLifecycleStageColor(project.currentLifecycleStageId),
                              color: getLifecycleStageColor(project.currentLifecycleStageId),
                            }}
                          >
                            {getLifecycleStageName(project.currentLifecycleStageId)}
                          </Badge>
                        </div>
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
                    ))}
                  </CardContent>
                </Card>
              )}
              
              {/* Team members */}
              {teamMembers?.map(member => {
                const memberProjects = projectsByTeamMember[member.id] || [];
                return (
                  <Card key={member.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {member.name}
                      </CardTitle>
                      <CardDescription>
                        {memberProjects.length} active project{memberProjects.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {memberProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No active projects
                        </p>
                      ) : (
                        memberProjects.map(project => (
                          <div
                            key={project.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                            onClick={() => setLocation(`/admin/projects/${project.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{project.clientName}</p>
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: getLifecycleStageColor(project.currentLifecycleStageId),
                                  color: getLifecycleStageColor(project.currentLifecycleStageId),
                                }}
                              >
                                {getLifecycleStageName(project.currentLifecycleStageId)}
                              </Badge>
                            </div>
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
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Urgent Items */}
          <TabsContent value="urgent">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Urgent & High Priority Items
                </CardTitle>
                <CardDescription>
                  Projects and tasks requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects?.filter(p => p.priority === "urgent" || p.priority === "high").map(project => (
                    <div
                      key={project.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/admin/projects/${project.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{project.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {getLifecycleStageName(project.currentLifecycleStageId)} • 
                            Assigned to {getTeamMemberName(project.assignedTeamMemberId)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityConfig[project.priority as keyof typeof priorityConfig].color}>
                            {priorityConfig[project.priority as keyof typeof priorityConfig].label}
                          </Badge>
                          <Badge variant="outline" className={statusConfig[project.status as keyof typeof statusConfig].color}>
                            {statusConfig[project.status as keyof typeof statusConfig].label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Progress 
                          value={(project as any).progress?.taskProgress || 0} 
                          className="h-2 flex-1" 
                        />
                        <span className="text-sm text-muted-foreground">
                          {(project as any).progress?.taskProgress || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {projects?.filter(p => p.priority === "urgent" || p.priority === "high").length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No urgent or high priority items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>
                  Projects with upcoming target dates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects?.filter(p => p.targetEndDate && p.status === "active")
                    .sort((a, b) => new Date(a.targetEndDate!).getTime() - new Date(b.targetEndDate!).getTime())
                    .map(project => {
                      const targetDate = new Date(project.targetEndDate!);
                      const daysUntil = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntil < 0;
                      const isUrgent = daysUntil <= 7 && daysUntil >= 0;
                      
                      return (
                        <div
                          key={project.id}
                          className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/admin/projects/${project.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{project.clientName}</p>
                              <p className="text-sm text-muted-foreground">
                                {getLifecycleStageName(project.currentLifecycleStageId)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : ''}`}>
                                {targetDate.toLocaleDateString()}
                              </p>
                              <p className={`text-sm ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                {isOverdue ? `${Math.abs(daysUntil)} days overdue` : 
                                 daysUntil === 0 ? 'Due today' :
                                 daysUntil === 1 ? 'Due tomorrow' :
                                 `${daysUntil} days left`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {projects?.filter(p => p.targetEndDate && p.status === "active").length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No projects with target dates
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Team Notifications
                </CardTitle>
                <CardDescription>
                  Recent updates and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No new notifications
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
