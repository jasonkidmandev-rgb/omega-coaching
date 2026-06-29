import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { toLocaleDateStringMT } from "../../lib/timezone";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2,
  Play, User, RefreshCw, Filter, ChevronRight, Calendar,
  ArrowRight, UserCog, ListChecks, UserCheck, Repeat2, Layers
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// Lifecycle stage names
const STAGE_NAMES: Record<number, string> = {
  1: "Intake",
  2: "Consult",
  3: "Protocol Build",
  4: "Billing",
  5: "Fulfillment",
  6: "Onboarding",
  7: "Active Protocol",
  8: "Completion",
};

function formatRelativeDate(d: any) {
  if (!d) return "No due date";
  const date = new Date(d);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1 || (diffDays === 0 && diffHrs < 0)) return "Overdue";
  if (diffDays === 0 && diffHrs <= 0) return "Due now";
  if (diffDays === 0) return `${diffHrs}h left`;
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays}d away`;
}

function formatFullDate(d: any) {
  if (!d) return "";
  return toLocaleDateStringMT(d, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function isOverdue(d: any) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

function isDueToday(d: any) {
  if (!d) return false;
  const date = new Date(d);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function TaskCard({ task, onComplete, onStart, onReassign, isCompleting, isStarting, assigneeName, teamMembers, showReassign }: {
  task: any;
  onComplete: (id: number, isSubtask: boolean) => void;
  onStart: (id: number, isSubtask: boolean) => void;
  onReassign?: (id: number, teamMemberId: number, isSubtask: boolean) => void;
  isCompleting: boolean;
  isStarting: boolean;
  assigneeName?: string;
  teamMembers?: any[];
  showReassign?: boolean;
}) {
  const [, navigate] = useLocation();
  const overdue = isOverdue(task.dueDate);
  const dueToday = isDueToday(task.dueDate);
  const isSubtask = !!task.isSubtask;

  return (
    <Card className={`transition-all ${overdue ? 'border-red-300 bg-red-50/50' : dueToday ? 'border-amber-300 bg-amber-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isSubtask && (
                <Badge variant="outline" className="text-xs border-teal-300 text-teal-600 bg-teal-50">
                  <Layers className="h-3 w-3 mr-1" />
                  Subtask
                </Badge>
              )}
              {task.status === "in_progress" ? (
                <Badge variant="default" className="bg-blue-100 text-blue-700 text-xs">In Progress</Badge>
              ) : overdue ? (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              ) : dueToday ? (
                <Badge variant="default" className="bg-amber-100 text-amber-700 text-xs">Due Today</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Pending</Badge>
              )}
              {task.isRequired ? (
                <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">Required</Badge>
              ) : null}
              <Badge variant="outline" className="text-xs">
                {STAGE_NAMES[task.lifecycleStageId] || `Stage ${task.lifecycleStageId}`}
              </Badge>
              {assigneeName && (
                <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                  <UserCheck className="h-3 w-3 mr-1" />
                  {assigneeName}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm truncate">{task.name}</h3>
            {isSubtask && task.parentTaskName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Part of: {task.parentTaskName}
              </p>
            )}
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {task.clientName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.clientName}
                </span>
              )}
              {task.dueDate && (
                <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : dueToday ? 'text-amber-600 font-medium' : ''}`}>
                  <Clock className="h-3 w-3" />
                  {formatRelativeDate(task.dueDate)}
                </span>
              )}
            </div>
            {/* Reassignment dropdown */}
            {showReassign && onReassign && teamMembers && teamMembers.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Repeat2 className="h-3 w-3 text-muted-foreground" />
                <Select
                  value={task.assignedTeamMemberId?.toString() || ""}
                  onValueChange={(val) => {
                    const newMemberId = parseInt(val);
                    if (newMemberId && newMemberId !== task.assignedTeamMemberId) {
                      onReassign(task.id, newMemberId, isSubtask);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs w-[160px]">
                    <SelectValue placeholder="Reassign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id.toString()} className="text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {task.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => onStart(task.id, isSubtask)}
                disabled={isStarting}
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              className="text-xs h-7 bg-green-600 hover:bg-green-700"
              onClick={() => onComplete(task.id, isSubtask)}
              disabled={isCompleting}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </Button>
            {task.clientProjectId && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => navigate(`/admin/projects/${task.clientProjectId}`)}
              >
                <ChevronRight className="h-3 w-3" />
                View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyActionItems() {
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [filterMember, setFilterMember] = useState<string>("all");

  // Fetch current user's action items
  const myItems = trpc.actionItems.myItems.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Fetch all action items (admin view)
  const allItems = trpc.actionItems.all.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: activeTab === "all-tasks",
  });

  // Team members list
  const teamMembers = trpc.teamMember.list.useQuery();

  // Task mutations
  const completeTask = trpc.actionItems.completeTask.useMutation({
    onSuccess: () => { myItems.refetch(); allItems.refetch(); },
  });
  const startTask = trpc.actionItems.startTask.useMutation({
    onSuccess: () => { myItems.refetch(); allItems.refetch(); },
  });
  const reassignTask = trpc.actionItems.reassignTask.useMutation({
    onSuccess: () => { myItems.refetch(); allItems.refetch(); toast.success("Task reassigned successfully"); },
    onError: (err) => { toast.error(`Failed to reassign task: ${err.message}`); },
  });

  // Subtask mutations
  const completeSubtask = trpc.actionItems.completeSubtask.useMutation({
    onSuccess: () => { myItems.refetch(); allItems.refetch(); },
  });
  const startSubtask = trpc.actionItems.startSubtask.useMutation({
    onSuccess: () => { myItems.refetch(); allItems.refetch(); },
  });
  const reassignSubtask = trpc.actionItems.reassignSubtask.useMutation({
    onSuccess: () => { myItems.refetch(); allItems.refetch(); toast.success("Subtask reassigned successfully"); },
    onError: (err) => { toast.error(`Failed to reassign subtask: ${err.message}`); },
  });

  // Unified handlers that dispatch to task or subtask mutations
  const handleComplete = (id: number, isSubtask: boolean) => {
    if (isSubtask) {
      completeSubtask.mutate({ subtaskId: id });
    } else {
      completeTask.mutate({ taskId: id });
    }
  };
  const handleStart = (id: number, isSubtask: boolean) => {
    if (isSubtask) {
      startSubtask.mutate({ subtaskId: id });
    } else {
      startTask.mutate({ taskId: id });
    }
  };
  const handleReassign = (id: number, teamMemberId: number, isSubtask: boolean) => {
    if (isSubtask) {
      reassignSubtask.mutate({ subtaskId: id, teamMemberId });
    } else {
      reassignTask.mutate({ taskId: id, teamMemberId });
    }
  };

  const myTaskList = myItems.data?.items || [];
  const myTeamMember = myItems.data?.teamMember;
  const allTaskList = allItems.data?.items || [];
  const allMembers = allItems.data?.members || teamMembers.data || [];

  // Filter all tasks by team member
  const filteredAllTasks = filterMember === "all"
    ? allTaskList
    : allTaskList.filter(t => t.assignedTeamMemberId === parseInt(filterMember));

  // Stats
  const myOverdue = myTaskList.filter(t => isOverdue(t.dueDate)).length;
  const myDueToday = myTaskList.filter(t => isDueToday(t.dueDate)).length;
  const myInProgress = myTaskList.filter(t => t.status === "in_progress").length;

  const allOverdue = allTaskList.filter(t => isOverdue(t.dueDate)).length;
  const allDueToday = allTaskList.filter(t => isDueToday(t.dueDate)).length;

  // Group tasks by team member for the overview
  const tasksByMember = allMembers.map(member => ({
    member,
    tasks: allTaskList.filter(t => t.assignedTeamMemberId === member.id),
    overdue: allTaskList.filter(t => t.assignedTeamMemberId === member.id && isOverdue(t.dueDate)).length,
  })).filter(g => g.tasks.length > 0);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const isAnyCompleting = completeTask.isPending || completeSubtask.isPending;
  const isAnyStarting = startTask.isPending || startSubtask.isPending;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ListChecks className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {myTeamMember ? `${greeting()}, ${myTeamMember.name}` : "My Action Items"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {" — "}
                {myTaskList.length === 0 ? "All caught up!" : `${myTaskList.length} items need your attention`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { myItems.refetch(); allItems.refetch(); }}>
            <RefreshCw className={`h-4 w-4 mr-2 ${myItems.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-tasks" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              My Tasks
              {myTaskList.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{myTaskList.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all-tasks" className="gap-1.5">
              <UserCog className="h-4 w-4" />
              All Team Tasks
              {allTaskList.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{allTaskList.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="team-overview" className="gap-1.5">
              <User className="h-4 w-4" />
              Team Overview
            </TabsTrigger>
          </TabsList>

          {/* MY TASKS TAB */}
          <TabsContent value="my-tasks" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={myOverdue > 0 ? "border-red-200 bg-red-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <AlertTriangle className={`h-4 w-4 ${myOverdue > 0 ? 'text-red-500' : ''}`} />
                    Overdue
                  </div>
                  <p className={`text-2xl font-bold ${myOverdue > 0 ? 'text-red-600' : ''}`}>{myOverdue}</p>
                </CardContent>
              </Card>
              <Card className={myDueToday > 0 ? "border-amber-200 bg-amber-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Due Today
                  </div>
                  <p className="text-2xl font-bold">{myDueToday}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Play className="h-4 w-4 text-blue-500" />
                    In Progress
                  </div>
                  <p className="text-2xl font-bold">{myInProgress}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <ClipboardCheck className="h-4 w-4" />
                    Total Pending
                  </div>
                  <p className="text-2xl font-bold">{myTaskList.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Task List */}
            {myItems.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading your tasks...</div>
            ) : myTaskList.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">All Caught Up!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {myTeamMember
                      ? "You have no pending action items right now."
                      : "Your user account is not linked to a team member. Ask your admin to link your account in Team settings."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Overdue first, then due today, then rest */}
                {myTaskList
                  .sort((a: any, b: any) => {
                    const aOverdue = isOverdue(a.dueDate) ? 0 : 1;
                    const bOverdue = isOverdue(b.dueDate) ? 0 : 1;
                    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
                    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    return aDate - bDate;
                  })
                  .map((task: any) => (
                    <TaskCard
                      key={`${task.isSubtask ? 'sub' : 'task'}-${task.id}`}
                      task={task}
                      onComplete={handleComplete}
                      onStart={handleStart}
                      onReassign={handleReassign}
                      isCompleting={isAnyCompleting}
                      isStarting={isAnyStarting}
                      assigneeName={myTeamMember?.name}
                      teamMembers={teamMembers.data || []}
                      showReassign={true}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* ALL TASKS TAB */}
          <TabsContent value="all-tasks" className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {allMembers.map((m: any) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">{filteredAllTasks.length} tasks</Badge>
              {allOverdue > 0 && (
                <Badge variant="destructive">{allOverdue} overdue</Badge>
              )}
            </div>

            {/* All Tasks List */}
            {allItems.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading all tasks...</div>
            ) : filteredAllTasks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">No Pending Tasks</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filterMember === "all" ? "All team members are caught up!" : "This team member has no pending tasks."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAllTasks
                  .sort((a: any, b: any) => {
                    const aOverdue = isOverdue(a.dueDate) ? 0 : 1;
                    const bOverdue = isOverdue(b.dueDate) ? 0 : 1;
                    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
                    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    return aDate - bDate;
                  })
                  .map((task: any) => {
                    const assignedMember = allMembers.find((m: any) => m.id === task.assignedTeamMemberId);
                    return (
                      <TaskCard
                        key={`${task.isSubtask ? 'sub' : 'task'}-${task.id}`}
                        task={task}
                        onComplete={handleComplete}
                        onStart={handleStart}
                        onReassign={handleReassign}
                        isCompleting={isAnyCompleting}
                        isStarting={isAnyStarting}
                        assigneeName={assignedMember?.name}
                        teamMembers={allMembers}
                        showReassign={true}
                      />
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* TEAM OVERVIEW TAB */}
          <TabsContent value="team-overview" className="space-y-4">
            {tasksByMember.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">Team is All Caught Up!</h3>
                  <p className="text-sm text-muted-foreground mt-1">No pending tasks across the team.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tasksByMember.map(({ member, tasks, overdue }) => (
                  <Card key={member.id} className={overdue > 0 ? "border-red-200" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {member.name}
                        </CardTitle>
                        <div className="flex gap-1.5">
                          <Badge variant="outline">{tasks.length} tasks</Badge>
                          {overdue > 0 && <Badge variant="destructive">{overdue} overdue</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {tasks.slice(0, 5).map((task: any) => (
                          <div key={`${task.isSubtask ? 'sub' : 'task'}-${task.id}`} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                {task.isSubtask && (
                                  <Layers className="h-3 w-3 text-teal-500 shrink-0" />
                                )}
                                <p className="truncate font-medium">{task.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">{task.clientName}</p>
                            </div>
                            <span className={`text-xs shrink-0 ml-2 ${isOverdue(task.dueDate) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {formatRelativeDate(task.dueDate)}
                            </span>
                          </div>
                        ))}
                        {tasks.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            +{tasks.length - 5} more tasks
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
