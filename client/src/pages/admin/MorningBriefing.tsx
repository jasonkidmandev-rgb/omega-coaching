import { useState } from "react";
import { trpc } from "../../lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sun, Clock, AlertTriangle, Users, CheckCircle2, 
  Calendar, ArrowRight, RefreshCw, ChevronRight
} from "lucide-react";

export default function MorningBriefing() {
  const briefing = trpc.automation.morningBriefing.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const data = briefing.data;
  const stats = data?.stats || { totalPending: 0, dueToday: 0, overdue: 0, newClientsThisWeek: 0 };

  const formatDate = (d: any) => {
    if (!d) return "No date";
    const date = new Date(d);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0 && diffHrs <= 0) return "Due now";
    if (diffDays === 0) return `${diffHrs}h left`;
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays}d away`;
  };

  const formatFullDate = (d: any) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <AdminLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Sun className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{greeting()}, Lisa</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => briefing.refetch()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${briefing.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={stats.overdue > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className={`h-4 w-4 ${stats.overdue > 0 ? 'text-red-500' : ''}`} />
              Overdue
            </div>
            <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>
              {stats.overdue}
            </p>
          </CardContent>
        </Card>
        <Card className={stats.dueToday > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              Due Today
            </div>
            <p className={`text-2xl font-bold ${stats.dueToday > 0 ? 'text-amber-600' : ''}`}>
              {stats.dueToday}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              Total Pending
            </div>
            <p className="text-2xl font-bold">{stats.totalPending}</p>
          </CardContent>
        </Card>
        <Card className={stats.newClientsThisWeek > 0 ? "border-green-200 bg-green-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className={`h-4 w-4 ${stats.newClientsThisWeek > 0 ? 'text-green-500' : ''}`} />
              New This Week
            </div>
            <p className={`text-2xl font-bold ${stats.newClientsThisWeek > 0 ? 'text-green-600' : ''}`}>
              {stats.newClientsThisWeek}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            Task Queue {stats.totalPending > 0 && <Badge variant="secondary" className="ml-2">{stats.totalPending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="deadlines">
            Upcoming Deadlines {(data?.upcomingDeadlines?.length || 0) > 0 && <Badge variant="secondary" className="ml-2">{data?.upcomingDeadlines?.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="newclients">
            New Clients {stats.newClientsThisWeek > 0 && <Badge variant="secondary" className="ml-2">{stats.newClientsThisWeek}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Task Queue */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Task Queue</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sorted by urgency: overdue first, then due today, then upcoming
              </p>
            </CardHeader>
            <CardContent>
              {briefing.isLoading ? (
                <p className="text-muted-foreground py-8 text-center">Loading tasks...</p>
              ) : !data?.tasks?.length ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-green-600">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No pending tasks right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        task.isOverdue ? 'border-red-200 bg-red-50' :
                        task.isDueToday ? 'border-amber-200 bg-amber-50' :
                        'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          {task.isOverdue && (
                            <Badge variant="destructive" className="text-xs shrink-0">Overdue</Badge>
                          )}
                          {task.isDueToday && !task.isOverdue && (
                            <Badge className="bg-amber-500 text-xs shrink-0">Due Today</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{task.clientName}</span>
                          {task.stageName && (
                            <>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{task.stageName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {task.dueDate ? (
                          <span className={`text-xs font-medium ${
                            task.isOverdue ? 'text-red-600' :
                            task.isDueToday ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No deadline</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Deadlines */}
        <TabsContent value="deadlines">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.upcomingDeadlines?.length ? (
                <p className="text-muted-foreground text-center py-8">No upcoming deadlines this week.</p>
              ) : (
                <div className="space-y-2">
                  {data.upcomingDeadlines.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div>
                        <p className="font-medium text-sm">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-blue-600">{formatDate(d.dueDate)}</p>
                        <p className="text-xs text-muted-foreground">{formatFullDate(d.dueDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Clients */}
        <TabsContent value="newclients">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                New Clients This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.newClients?.length ? (
                <p className="text-muted-foreground text-center py-8">No new clients this week.</p>
              ) : (
                <div className="space-y-3">
                  {data.newClients.map((c: any) => (
                    <div key={c.projectId} className="flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50">
                      <div>
                        <p className="font-medium text-sm">{c.clientName}</p>
                        <p className="text-xs text-muted-foreground">{c.clientEmail}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Added {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={c.projectStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {c.projectStatus}
                        </Badge>
                        <div className="mt-1">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${c.totalTasks > 0 ? (c.completedTasks / c.totalTasks) * 100 : 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.completedTasks}/{c.totalTasks} tasks
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
