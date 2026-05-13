import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  BarChart3, TrendingUp, Users, Package, Clock, AlertTriangle,
  CheckCircle2, ArrowRight, Timer, UserCheck, Truck, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function KPIDashboard() {
  const { data, isLoading, refetch } = trpc.kpi.getDashboard.useQuery(undefined, {
    refetchInterval: 120000, // refresh every 2 min
  });

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 75) return "text-green-600";
    if (rate >= 50) return "text-yellow-600";
    if (rate >= 25) return "text-orange-600";
    return "text-red-600";
  };

  const getConversionBg = (rate: number) => {
    if (rate >= 75) return "bg-green-100";
    if (rate >= 50) return "bg-yellow-100";
    if (rate >= 25) return "bg-orange-100";
    return "bg-red-100";
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded" />)}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const pipeline = data?.pipeline || { total: 0, byStage: [] };
  const conversion = data?.conversion || { discoveryToEnrollment: 0, enrollmentToStrategy: 0, strategyToKickoff: 0 };
  const tasks = data?.tasks || { total: 0, overdue: 0, completedThisWeek: 0, avgCompletionDays: 0, byTeamMember: [] };
  const fulfillment = data?.fulfillment || { pendingSlips: 0, backorderedItems: 0, avgFulfillmentDays: 0, shippedThisWeek: 0 };
  const stageTimings = data?.stageTimings || [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: "KPI Dashboard" }]} />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KPI Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time business performance metrics</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Top-level KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Pipeline</span>
              </div>
              <div className="text-2xl font-bold">{pipeline.total}</div>
              <p className="text-xs text-gray-500">{pipeline.byStage.length} stages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Overdue Tasks</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{tasks.overdue}</div>
              <p className="text-xs text-gray-500">of {tasks.total} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Completed (7d)</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{tasks.completedThisWeek}</div>
              <p className="text-xs text-gray-500">avg {tasks.avgCompletionDays}d to complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Fulfillment</span>
              </div>
              <div className="text-2xl font-bold">{fulfillment.pendingSlips}</div>
              <p className="text-xs text-gray-500">{fulfillment.backorderedItems} backordered</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="conversion" className="space-y-4">
          <TabsList>
            <TabsTrigger value="conversion">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline Breakdown</TabsTrigger>
            <TabsTrigger value="team">Team Workload</TabsTrigger>
            <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
          </TabsList>

          {/* Conversion Funnel Tab */}
          <TabsContent value="conversion" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Discovery → Enrollment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Discovery → Enrollment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getConversionColor(conversion.discoveryToEnrollment)}`}>
                    {conversion.discoveryToEnrollment}%
                  </div>
                  <Progress value={conversion.discoveryToEnrollment} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">Prospects who enroll in a program</p>
                </CardContent>
              </Card>

              {/* Enrollment → Strategy */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Enrollment → Strategy Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getConversionColor(conversion.enrollmentToStrategy)}`}>
                    {conversion.enrollmentToStrategy}%
                  </div>
                  <Progress value={conversion.enrollmentToStrategy} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">Enrolled clients who book strategy</p>
                </CardContent>
              </Card>

              {/* Strategy → Kickoff */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Strategy → Kickoff Call
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getConversionColor(conversion.strategyToKickoff)}`}>
                    {conversion.strategyToKickoff}%
                  </div>
                  <Progress value={conversion.strategyToKickoff} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">Strategy clients who start kickoff</p>
                </CardContent>
              </Card>
            </div>

            {/* Stage Timings */}
            {stageTimings.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Average Time Between Stages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stageTimings.map((timing: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{timing.fromStage}</Badge>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <Badge variant="outline">{timing.toStage}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">{timing.avgDays} days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pipeline Breakdown Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Prospects by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipeline.byStage.map((stage: any, i: number) => {
                    const pct = pipeline.total > 0 ? Math.round((stage.count / pipeline.total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{formatStage(stage.stage)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{stage.count}</span>
                            <span className="text-xs text-gray-500">({pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Workload Tab */}
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Task Distribution by Team Member</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks.byTeamMember.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No pending tasks assigned to team members</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.byTeamMember.map((tm: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <span className="font-medium text-sm">{tm.name}</span>
                            {tm.overdue > 0 && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                {tm.overdue} overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{tm.pending}</span>
                            <span className="text-xs text-gray-500">pending</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Task Health Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Pending</span>
                    <span className="font-bold">{tasks.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Overdue</span>
                    <span className="font-bold text-red-600">{tasks.overdue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Completed This Week</span>
                    <span className="font-bold text-green-600">{tasks.completedThisWeek}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Completion Time</span>
                    <span className="font-bold">{tasks.avgCompletionDays} days</span>
                  </div>
                  {tasks.total > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Health Score</span>
                        <span>{tasks.total > 0 ? Math.round(((tasks.total - tasks.overdue) / tasks.total) * 100) : 100}%</span>
                      </div>
                      <Progress value={tasks.total > 0 ? ((tasks.total - tasks.overdue) / tasks.total) * 100 : 100} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fulfillment Tab */}
          <TabsContent value="fulfillment" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-gray-500 uppercase">Pending</span>
                  </div>
                  <div className="text-2xl font-bold">{fulfillment.pendingSlips}</div>
                  <p className="text-xs text-gray-500">packing slips</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-gray-500 uppercase">Backordered</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{fulfillment.backorderedItems}</div>
                  <p className="text-xs text-gray-500">items</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-500 uppercase">Shipped (7d)</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{fulfillment.shippedThisWeek}</div>
                  <p className="text-xs text-gray-500">this week</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-gray-500 uppercase">Avg Fulfillment</span>
                  </div>
                  <div className="text-2xl font-bold">{fulfillment.avgFulfillmentDays}</div>
                  <p className="text-xs text-gray-500">days to ship</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
