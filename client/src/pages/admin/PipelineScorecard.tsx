import { useState } from "react";
import { trpc } from "../../lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, Clock, AlertTriangle, Users, Phone,
  TrendingUp, RefreshCw, ChevronRight, Flame,
  UserCheck, Calendar, ExternalLink, MessageSquare
} from "lucide-react";

export default function PipelineScorecard() {
  const scorecard = trpc.automation.pipelineScorecard.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const data = scorecard.data;
  const stats = data?.stats || {
    totalProspects: 0,
    overdueFollowUps: 0,
    hotLeadCount: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    weeklyNewProspects: 0,
  };

  const formatTimeAgo = (d: any) => {
    if (!d) return "Never";
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const formatOverdue = (hours: number) => {
    if (hours <= 0) return "Upcoming";
    if (hours < 24) return `${hours}h overdue`;
    const days = Math.floor(hours / 24);
    return `${days}d overdue`;
  };

  const formatDate = (d: any) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      new: "New",
      contacted: "Contacted",
      clicked: "Clicked",
      viewing: "Viewing",
      engaged: "Engaged",
      waiting_on_client: "Waiting",
      ready_for_consult: "Ready for Consult",
      enrolled: "Enrolled",
      not_ready: "Not Ready",
      declined: "Declined",
      stalled: "Stalled",
    };
    return labels[s] || s;
  };

  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-700",
      contacted: "bg-sky-100 text-sky-700",
      clicked: "bg-indigo-100 text-indigo-700",
      viewing: "bg-purple-100 text-purple-700",
      engaged: "bg-amber-100 text-amber-700",
      waiting_on_client: "bg-yellow-100 text-yellow-700",
      ready_for_consult: "bg-green-100 text-green-700",
      enrolled: "bg-emerald-100 text-emerald-700",
      not_ready: "bg-gray-100 text-gray-600",
      declined: "bg-red-100 text-red-700",
      stalled: "bg-orange-100 text-orange-700",
    };
    return colors[s] || "bg-gray-100 text-gray-600";
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
          <div className="p-2 bg-orange-100 rounded-lg">
            <Target className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{greeting()}, Shannon</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline Scorecard &mdash;{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scorecard.refetch()}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${scorecard.isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className={stats.overdueFollowUps > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className={`h-4 w-4 ${stats.overdueFollowUps > 0 ? "text-red-500" : ""}`} />
              Overdue
            </div>
            <p className={`text-2xl font-bold ${stats.overdueFollowUps > 0 ? "text-red-600" : ""}`}>
              {stats.overdueFollowUps}
            </p>
          </CardContent>
        </Card>
        <Card className={stats.hotLeadCount > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Flame className={`h-4 w-4 ${stats.hotLeadCount > 0 ? "text-amber-500" : ""}`} />
              Hot Leads
            </div>
            <p className={`text-2xl font-bold ${stats.hotLeadCount > 0 ? "text-amber-600" : ""}`}>
              {stats.hotLeadCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              Active Prospects
            </div>
            <p className="text-2xl font-bold">{stats.totalProspects}</p>
          </CardContent>
        </Card>
        <Card className={stats.weeklyNewProspects > 0 ? "border-green-200 bg-green-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className={`h-4 w-4 ${stats.weeklyNewProspects > 0 ? "text-green-500" : ""}`} />
              New This Week
            </div>
            <p className={`text-2xl font-bold ${stats.weeklyNewProspects > 0 ? "text-green-600" : ""}`}>
              {stats.weeklyNewProspects}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Conversion Rate
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.conversionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <UserCheck className="h-4 w-4 text-purple-500" />
              Conversions (30d)
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {data?.recentConversions?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overdue">
        <TabsList>
          <TabsTrigger value="overdue">
            Overdue Callbacks{" "}
            {stats.overdueFollowUps > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.overdueFollowUps}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="followups">
            Follow-Up Queue{" "}
            {(data?.followUpQueue?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {data?.followUpQueue?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hot">
            Hot Leads{" "}
            {stats.hotLeadCount > 0 && (
              <Badge className="ml-2 bg-amber-500">
                {stats.hotLeadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conversions">
            Recent Conversions
          </TabsTrigger>
        </TabsList>

        {/* Overdue Callbacks */}
        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Overdue Callbacks
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Prospects with past-due follow-up dates. Contact these first.
              </p>
            </CardHeader>
            <CardContent>
              {scorecard.isLoading ? (
                <p className="text-muted-foreground py-8 text-center">Loading...</p>
              ) : !data?.overdueCallbacks?.length ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-green-600">All caught up!</p>
                  <p className="text-sm text-muted-foreground">
                    No overdue callbacks right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.overdueCallbacks.map((p: any) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        p.hoursOverdue >= 72
                          ? "border-red-300 bg-red-50"
                          : p.hoursOverdue >= 24
                          ? "border-orange-200 bg-orange-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/admin/prospects/${p.id}`}
                            className="font-medium text-sm truncate hover:underline text-blue-700"
                          >
                            {p.name}
                          </a>
                          <Badge className={`text-xs ${statusColor(p.status)}`}>
                            {statusLabel(p.status)}
                          </Badge>
                          {p.hoursOverdue >= 72 && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </span>
                          {p.source && (
                            <span className="text-xs text-muted-foreground">
                              via {p.source}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {p.followUpCount} follow-ups
                          </span>
                        </div>
                        {p.thingsToKnow && (
                          <p className="text-xs text-amber-700 mt-1 truncate max-w-md">
                            {p.thingsToKnow}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span
                          className={`text-xs font-medium ${
                            p.hoursOverdue >= 72
                              ? "text-red-600"
                              : p.hoursOverdue >= 24
                              ? "text-orange-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {formatOverdue(p.hoursOverdue)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due: {formatDate(p.nextFollowUpAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Up Queue */}
        <TabsContent value="followups">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Follow-Up Queue
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                All scheduled follow-ups, sorted by urgency (overdue first, then upcoming)
              </p>
            </CardHeader>
            <CardContent>
              {scorecard.isLoading ? (
                <p className="text-muted-foreground py-8 text-center">Loading...</p>
              ) : !data?.followUpQueue?.length ? (
                <p className="text-muted-foreground text-center py-8">
                  No scheduled follow-ups.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.followUpQueue.map((p: any) => {
                    const isOverdue = p.hoursOverdue > 0;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isOverdue
                            ? "border-red-200 bg-red-50"
                            : "border-gray-100 bg-gray-50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/admin/prospects/${p.id}`}
                              className="font-medium text-sm truncate hover:underline text-blue-700"
                            >
                              {p.name}
                            </a>
                            <Badge className={`text-xs ${statusColor(p.status)}`}>
                              {statusLabel(p.status)}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {p.phone || p.email || "No contact"}
                            </span>
                            {p.source && (
                              <span className="text-xs text-muted-foreground">
                                via {p.source}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {p.followUpCount} follow-ups
                            </span>
                          </div>
                          {p.thingsToKnow && (
                            <p className="text-xs text-amber-700 mt-1 truncate max-w-md">
                              {p.thingsToKnow}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {isOverdue ? (
                            <span className="text-xs font-medium text-red-600">
                              {formatOverdue(p.hoursOverdue)}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-blue-600">
                              {formatDate(p.nextFollowUpAt)}
                            </span>
                          )}
                          {p.lastContactedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Last contact: {formatTimeAgo(p.lastContactedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hot Leads */}
        <TabsContent value="hot">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                Hot Leads
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Prospects who are engaged, ready for consult, or waiting on client
              </p>
            </CardHeader>
            <CardContent>
              {scorecard.isLoading ? (
                <p className="text-muted-foreground py-8 text-center">Loading...</p>
              ) : !data?.hotLeads?.length ? (
                <p className="text-muted-foreground text-center py-8">
                  No hot leads at the moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.hotLeads.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/admin/prospects/${p.id}`}
                            className="font-medium text-sm truncate hover:underline text-blue-700"
                          >
                            {p.name}
                          </a>
                          <Badge className={`text-xs ${statusColor(p.status)}`}>
                            {statusLabel(p.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {p.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {p.phone}
                            </span>
                          )}
                          {p.email && (
                            <span className="text-xs text-muted-foreground">
                              {p.email}
                            </span>
                          )}
                          {p.source && (
                            <span className="text-xs text-muted-foreground">
                              via {p.source}
                            </span>
                          )}
                        </div>
                        {p.thingsToKnow && (
                          <p className="text-xs text-amber-700 mt-1 truncate max-w-md">
                            {p.thingsToKnow}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {p.followUpCount} contacts
                        </div>
                        {p.totalClicks > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.totalClicks} clicks
                          </p>
                        )}
                        {p.lastContactedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Last: {formatTimeAgo(p.lastContactedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Conversions */}
        <TabsContent value="conversions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-500" />
                Recent Conversions (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scorecard.isLoading ? (
                <p className="text-muted-foreground py-8 text-center">Loading...</p>
              ) : !data?.recentConversions?.length ? (
                <p className="text-muted-foreground text-center py-8">
                  No conversions in the last 30 days.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recentConversions.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{c.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {c.email && (
                            <span className="text-xs text-muted-foreground">
                              {c.email}
                            </span>
                          )}
                          {c.source && (
                            <span className="text-xs text-muted-foreground">
                              via {c.source}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <Badge className="bg-emerald-600 text-white text-xs">
                          {c.tier || "N/A"}
                        </Badge>
                        {c.coachingFeeAmount && (
                          <p className="text-xs font-medium text-emerald-700 mt-0.5">
                            ${Number(c.coachingFeeAmount).toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.daysToConvert}d to convert
                        </p>
                        {c.enrolledAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.enrolledAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
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
