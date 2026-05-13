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
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  FileText,
  Download,
} from "lucide-react";
import { useState, useMemo } from "react";

export default function Reports() {
  const [timeRange, setTimeRange] = useState<string>("30");
  
  const { data: projects } = trpc.clientProject.list.useQuery();
  const { data: lifecycleStages } = trpc.lifecycleStage.list.useQuery();
  const { data: teamMembers } = trpc.teamMember.list.useQuery();
  const { data: allTasks } = trpc.clientProject.getAllTasks.useQuery();
  
  // Calculate client progress metrics
  const clientMetrics = useMemo(() => {
    if (!projects) return null;
    
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    const activeProjects = projects.filter(p => p.status === "active");
    const completedProjects = projects.filter(p => p.status === "completed");
    const onHoldProjects = projects.filter(p => p.status === "on_hold");
    
    // Projects created in time range
    const newProjects = projects.filter(p => new Date(p.createdAt) >= startDate);
    
    // Average progress
    const avgProgress = activeProjects.length > 0
      ? activeProjects.reduce((sum, p) => sum + ((p as any).progress?.taskProgress || 0), 0) / activeProjects.length
      : 0;
    
    // Projects by lifecycle stage
    const byStage: Record<number, number> = {};
    activeProjects.forEach(p => {
      if (p.currentLifecycleStageId) {
        byStage[p.currentLifecycleStageId] = (byStage[p.currentLifecycleStageId] || 0) + 1;
      }
    });
    
    return {
      total: projects.length,
      active: activeProjects.length,
      completed: completedProjects.length,
      onHold: onHoldProjects.length,
      newInPeriod: newProjects.length,
      avgProgress: Math.round(avgProgress),
      byStage,
    };
  }, [projects, timeRange]);
  
  // Calculate team performance metrics
  const teamMetrics = useMemo(() => {
    if (!teamMembers || !allTasks || !projects) return null;
    
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    const memberStats = teamMembers.map(member => {
      const assignedTasks = allTasks.filter(t => t.assignedTeamMemberId === member.id);
      const completedTasks = assignedTasks.filter(t => 
        t.status === "completed" && 
        t.completedAt && 
        new Date(t.completedAt) >= startDate
      );
      const overdueTasks = assignedTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < now && 
        t.status !== "completed"
      );
      const pendingTasks = assignedTasks.filter(t => 
        t.status === "pending" || t.status === "in_progress"
      );
      
      // Calculate on-time completion rate
      const completedWithDue = completedTasks.filter(t => t.dueDate);
      const onTimeCompletions = completedWithDue.filter(t => 
        t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)
      );
      const onTimeRate = completedWithDue.length > 0 
        ? Math.round((onTimeCompletions.length / completedWithDue.length) * 100)
        : 100;
      
      // Get assigned projects
      const assignedProjects = projects.filter(p => p.assignedTeamMemberId === member.id);
      
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        totalAssigned: assignedTasks.length,
        completedInPeriod: completedTasks.length,
        overdue: overdueTasks.length,
        pending: pendingTasks.length,
        onTimeRate,
        projectsAssigned: assignedProjects.length,
      };
    });
    
    // Overall stats
    const totalCompleted = memberStats.reduce((sum, m) => sum + m.completedInPeriod, 0);
    const totalOverdue = memberStats.reduce((sum, m) => sum + m.overdue, 0);
    const avgOnTimeRate = memberStats.length > 0
      ? Math.round(memberStats.reduce((sum, m) => sum + m.onTimeRate, 0) / memberStats.length)
      : 100;
    
    return {
      members: memberStats.sort((a, b) => b.completedInPeriod - a.completedInPeriod),
      totalCompleted,
      totalOverdue,
      avgOnTimeRate,
    };
  }, [teamMembers, allTasks, projects, timeRange]);
  
  // Task completion trends
  const taskTrends = useMemo(() => {
    if (!allTasks) return [];
    
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const trends: { date: string; completed: number; created: number }[] = [];
    
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const completed = allTasks.filter(t => 
        t.completedAt && 
        new Date(t.completedAt).toISOString().split('T')[0] === dateStr
      ).length;
      
      const created = allTasks.filter(t => 
        new Date(t.createdAt).toISOString().split('T')[0] === dateStr
      ).length;
      
      trends.push({ date: dateStr, completed, created });
    }
    
    return trends;
  }, [allTasks, timeRange]);
  
  const getLifecycleStageName = (stageId: number | null) => {
    if (!stageId || !lifecycleStages) return "Unknown";
    const stage = lifecycleStages.find(s => s.id === stageId);
    return stage?.name || "Unknown";
  };
  
  const getLifecycleStageColor = (stageId: number | null) => {
    if (!stageId || !lifecycleStages) return "#6B7280";
    const stage = lifecycleStages.find(s => s.id === stageId);
    return stage?.color || "#6B7280";
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Client progress and team performance insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold">{clientMetrics?.active || 0}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +{clientMetrics?.newInPeriod || 0} new
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">{clientMetrics?.avgProgress || 0}%</p>
                  <Progress value={clientMetrics?.avgProgress || 0} className="h-2 mt-2 w-24" />
                </div>
                <Target className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                  <p className="text-2xl font-bold">{teamMetrics?.totalCompleted || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    in last {timeRange} days
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On-Time Rate</p>
                  <p className="text-2xl font-bold">{teamMetrics?.avgOnTimeRate || 0}%</p>
                  <p className={`text-xs flex items-center gap-1 mt-1 ${
                    (teamMetrics?.avgOnTimeRate || 0) >= 80 ? "text-green-600" : "text-amber-600"
                  }`}>
                    {(teamMetrics?.avgOnTimeRate || 0) >= 80 
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />
                    }
                    {(teamMetrics?.avgOnTimeRate || 0) >= 80 ? "Good" : "Needs improvement"}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">Client Progress</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          {/* Client Progress Tab */}
          <TabsContent value="clients">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Projects by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Projects by Status</CardTitle>
                  <CardDescription>Current distribution of client projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{clientMetrics?.active || 0}</span>
                        <Progress 
                          value={clientMetrics?.total ? (clientMetrics.active / clientMetrics.total) * 100 : 0} 
                          className="h-2 w-24" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{clientMetrics?.completed || 0}</span>
                        <Progress 
                          value={clientMetrics?.total ? (clientMetrics.completed / clientMetrics.total) * 100 : 0} 
                          className="h-2 w-24" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span>On Hold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{clientMetrics?.onHold || 0}</span>
                        <Progress 
                          value={clientMetrics?.total ? (clientMetrics.onHold / clientMetrics.total) * 100 : 0} 
                          className="h-2 w-24" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Projects by Lifecycle Stage */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Projects by Stage</CardTitle>
                  <CardDescription>Where clients are in their journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lifecycleStages?.map(stage => {
                      const count = clientMetrics?.byStage[stage.id] || 0;
                      const percentage = clientMetrics?.active 
                        ? (count / clientMetrics.active) * 100 
                        : 0;
                      return (
                        <div key={stage.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: stage.color || "#6B7280" }}
                            />
                            <span className="text-sm">{stage.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{count}</span>
                            <Progress 
                              value={percentage} 
                              className="h-2 w-20" 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Performing Clients */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Client Progress Overview</CardTitle>
                  <CardDescription>Active clients sorted by progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projects
                      ?.filter(p => p.status === "active")
                      .sort((a, b) => ((b as any).progress?.taskProgress || 0) - ((a as any).progress?.taskProgress || 0))
                      .slice(0, 10)
                      .map(project => (
                        <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-2 h-8 rounded"
                              style={{ backgroundColor: getLifecycleStageColor(project.currentLifecycleStageId) }}
                            />
                            <div>
                              <p className="font-medium">{project.clientName}</p>
                              <p className="text-sm text-muted-foreground">
                                {getLifecycleStageName(project.currentLifecycleStageId)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold">{(project as any).progress?.taskProgress || 0}%</p>
                              <p className="text-xs text-muted-foreground">
                                {(project as any).progress?.completedTasks || 0}/{(project as any).progress?.totalTasks || 0} tasks
                              </p>
                            </div>
                            <Progress 
                              value={(project as any).progress?.taskProgress || 0} 
                              className="h-2 w-24" 
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Team Performance Tab */}
          <TabsContent value="team">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Leaderboard */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Team Performance Leaderboard
                  </CardTitle>
                  <CardDescription>Tasks completed in the last {timeRange} days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamMetrics?.members.map((member, index) => (
                      <div 
                        key={member.id} 
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          index === 0 ? "bg-amber-50 border-amber-200" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? "bg-amber-500 text-white" :
                            index === 1 ? "bg-slate-400 text-white" :
                            index === 2 ? "bg-amber-700 text-white" :
                            "bg-slate-200 text-slate-600"
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{member.completedInPeriod}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{member.pending}</p>
                            <p className="text-xs text-muted-foreground">In Progress</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-lg font-bold ${member.overdue > 0 ? "text-red-600" : "text-green-600"}`}>
                              {member.overdue}
                            </p>
                            <p className="text-xs text-muted-foreground">Overdue</p>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <p className={`text-lg font-bold ${
                              member.onTimeRate >= 80 ? "text-green-600" : "text-amber-600"
                            }`}>
                              {member.onTimeRate}%
                            </p>
                            <p className="text-xs text-muted-foreground">On-Time</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!teamMetrics?.members || teamMetrics.members.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No team members found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Overdue Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Overdue Tasks Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-red-600">{teamMetrics?.totalOverdue || 0}</p>
                    <p className="text-muted-foreground">Total overdue tasks</p>
                  </div>
                  <div className="space-y-2 mt-4">
                    {teamMetrics?.members
                      .filter(m => m.overdue > 0)
                      .sort((a, b) => b.overdue - a.overdue)
                      .map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm">{member.name}</span>
                          <Badge variant="destructive">{member.overdue} overdue</Badge>
                        </div>
                      ))}
                    {teamMetrics?.members.filter(m => m.overdue > 0).length === 0 && (
                      <div className="text-center py-4 text-green-600">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                        No overdue tasks!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Workload Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Workload Distribution</CardTitle>
                  <CardDescription>Tasks assigned per team member</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamMetrics?.members.map(member => {
                      const maxTasks = Math.max(...(teamMetrics?.members.map(m => m.totalAssigned) || [1]));
                      return (
                        <div key={member.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{member.name}</span>
                            <span className="font-medium">{member.totalAssigned} tasks</span>
                          </div>
                          <Progress 
                            value={(member.totalAssigned / maxTasks) * 100} 
                            className="h-2" 
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trends</CardTitle>
                <CardDescription>Daily task activity over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1">
                  {taskTrends.slice(-30).map((day, index) => {
                    const maxValue = Math.max(...taskTrends.map(d => Math.max(d.completed, d.created)), 1);
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-0.5">
                          <div 
                            className="w-full bg-green-500 rounded-t"
                            style={{ height: `${(day.completed / maxValue) * 150}px` }}
                            title={`${day.completed} completed`}
                          />
                          <div 
                            className="w-full bg-blue-500 rounded-b"
                            style={{ height: `${(day.created / maxValue) * 150}px` }}
                            title={`${day.created} created`}
                          />
                        </div>
                        {index % 5 === 0 && (
                          <span className="text-xs text-muted-foreground rotate-45 origin-left">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-sm">Created</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
