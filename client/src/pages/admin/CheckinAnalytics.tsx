import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarCheck, Users, Clock, CheckCircle2, AlertTriangle, 
  TrendingUp, Mail, BarChart3, Activity, ArrowRight, Download,
  ChevronDown, ChevronRight, Shield, BookOpen
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EngagementLevel = 'full_coaching' | 'self_guided_checkins' | 'protocol_only';

function filterByEngagement<T extends { engagementLevel?: EngagementLevel | null }>(
  items: T[] | undefined,
  level: 'full_coaching' | 'self_guided_checkins'
): T[] {
  if (!items) return [];
  if (level === 'self_guided_checkins') {
    // Only clients explicitly set to self_guided_checkins
    return items.filter(item => item.engagementLevel === 'self_guided_checkins');
  }
  // Full Coaching: includes full_coaching, protocol_only, null, undefined — everything that isn't self_guided
  return items.filter(item => item.engagementLevel !== 'self_guided_checkins');
}

// Compute summary stats from a filtered set of check-ins
function computeSummary(checkins: Array<{
  status: string | null;
  overallScore: number | null;
  hasLowScore: boolean | null;
  sentAt: string | Date | null;
}>) {
  const total = checkins.length;
  const pending = checkins.filter(c => c.status === 'pending').length;
  const submitted = checkins.filter(c => c.status === 'submitted').length;
  const reviewed = checkins.filter(c => c.status === 'reviewed').length;
  const expired = checkins.filter(c => c.status === 'incomplete').length;
  const lowScore = checkins.filter(c => c.hasLowScore).length;
  const sent = checkins.filter(c => c.sentAt).length;
  const responded = submitted + reviewed;
  const responseRate = sent > 0 ? Math.round((responded / sent) * 100) : 0;
  const scored = checkins.filter(c => c.overallScore !== null);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scored.length * 10) / 10
    : 0;
  return { total, pending, submitted, reviewed, expired, lowScore, responseRate, avgScore, responded };
}

// Reusable summary cards component
function SummaryCards({ summary, enabledCount, variant }: {
  summary: ReturnType<typeof computeSummary>;
  enabledCount: number;
  variant: 'primary' | 'secondary';
}) {
  const accentColor = variant === 'primary' ? 'text-orange-600' : 'text-purple-600';
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white border rounded-lg p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Clients</p>
        <p className={`text-2xl font-bold ${accentColor}`}>{enabledCount}</p>
      </div>
      <div className="bg-white border rounded-lg p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Response Rate</p>
        <p className="text-2xl font-bold text-green-600">{summary.responseRate}%</p>
      </div>
      <div className="bg-white border rounded-lg p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Avg Score</p>
        <p className="text-2xl font-bold text-blue-600">{summary.avgScore || 'N/A'}</p>
      </div>
      <div className="bg-white border rounded-lg p-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low Scores</p>
        <p className="text-2xl font-bold text-red-600">{summary.lowScore}</p>
      </div>
    </div>
  );
}

// Reusable pending clients list
function PendingClientsList({ clients }: {
  clients: Array<{
    clientProtocolId: number | null;
    clientName: string | null;
    clientEmail: string | null;
    sentAt: string | Date | null;
    dueAt: string | Date | null;
  }>;
}) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
        <p>All clients have responded!</p>
        <p className="text-sm">No pending check-ins at this time</p>
      </div>
    );
  }
  return (
    <div className="divide-y">
      {clients.map((client, index) => (
        <div key={index} className="py-3 flex items-center justify-between">
          <div>
            <p className="font-medium">{client.clientName || 'Unknown Client'}</p>
            <p className="text-sm text-muted-foreground">{client.clientEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Sent {client.sentAt ? formatDistanceToNow(new Date(client.sentAt), { addSuffix: true }) : 'N/A'}
            </p>
            {client.dueAt && (
              <p className="text-xs text-yellow-600">
                Due {format(new Date(client.dueAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <Link href={`/admin/clients/${client.clientProtocolId}`}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

// Reusable recent activity list
function RecentActivityList({ activities }: {
  activities: Array<{
    id: number;
    clientProtocolId: number | null;
    clientName: string | null;
    status: string | null;
    overallScore: number | null;
    hasLowScore: boolean | null;
    submittedAt: string | Date | null;
    createdAt: string | Date | null;
  }>;
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No check-in activity yet</p>
      </div>
    );
  }
  return (
    <div className="divide-y">
      {activities.map((activity, index) => (
        <div key={index} className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              activity.status === 'reviewed' ? 'bg-green-500' :
              activity.status === 'submitted' ? 'bg-blue-500' :
              activity.status === 'pending' ? 'bg-yellow-500' :
              'bg-gray-400'
            }`} />
            <div>
              <p className="font-medium">{activity.clientName || 'Unknown Client'}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {activity.status}
                {activity.overallScore !== null && ` • Score: ${activity.overallScore}/10`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activity.hasLowScore && (
              <Badge variant="destructive" className="text-xs">Low Score</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {activity.submittedAt 
                ? formatDistanceToNow(new Date(activity.submittedAt), { addSuffix: true })
                : activity.createdAt 
                  ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                  : 'N/A'
              }
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Reusable schedule table
function ScheduleTable({ schedules }: {
  schedules: Array<{
    clientProtocolId: number | null;
    clientName: string | null;
    currentStreak: number | null;
    longestStreak: number | null;
    totalResponses: number | null;
    totalSent: number | null;
    nextScheduledAt: string | Date | null;
  }>;
}) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No clients in this tier have check-ins enabled</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-2 font-medium">Client</th>
            <th className="pb-2 font-medium text-center">Current Streak</th>
            <th className="pb-2 font-medium text-center">Best Streak</th>
            <th className="pb-2 font-medium text-center">Response Rate</th>
            <th className="pb-2 font-medium">Next Check-In</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule, index) => {
            const responseRate = schedule.totalSent && schedule.totalSent > 0
              ? Math.round((schedule.totalResponses || 0) / schedule.totalSent * 100)
              : 0;
            return (
              <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3">
                  <p className="font-medium">{schedule.clientName || 'Unknown Client'}</p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.totalResponses || 0} of {schedule.totalSent || 0} responded
                  </p>
                </td>
                <td className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-lg font-bold ${(schedule.currentStreak || 0) >= 4 ? 'text-green-600' : (schedule.currentStreak || 0) >= 2 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {schedule.currentStreak || 0}
                    </span>
                    {(schedule.currentStreak || 0) >= 4 && <span className="text-lg">🔥</span>}
                  </div>
                </td>
                <td className="py-3 text-center">
                  <span className="text-sm text-muted-foreground">{schedule.longestStreak || 0}</span>
                </td>
                <td className="py-3 text-center">
                  <Badge variant={responseRate >= 80 ? 'default' : responseRate >= 50 ? 'secondary' : 'outline'}
                         className={responseRate >= 80 ? 'bg-green-100 text-green-800' : responseRate >= 50 ? 'bg-yellow-100 text-yellow-800' : ''}>
                    {responseRate}%
                  </Badge>
                </td>
                <td className="py-3">
                  <p className="text-sm">
                    {schedule.nextScheduledAt 
                      ? format(new Date(schedule.nextScheduledAt), 'MMM d, h:mm a')
                      : 'Not scheduled'
                    }
                  </p>
                </td>
                <td className="py-3">
                  <Link href={`/admin/clients/${schedule.clientProtocolId}`}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CheckinAnalytics() {
  const { data: analytics, isLoading } = trpc.checkin.analytics.getDashboard.useQuery();
  const [selfGuidedExpanded, setSelfGuidedExpanded] = useState(false);
  const exportMutation = trpc.checkin.exportCsv.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${data.filename}`);
    },
    onError: (error) => {
      toast.error(`Export Failed: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Check-In Analytics</h1>
              <p className="text-muted-foreground">Track response rates and client engagement</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Filter data by engagement level
  const fcSchedules = filterByEngagement(analytics?.enabledSchedules, 'full_coaching');
  const sgSchedules = filterByEngagement(analytics?.enabledSchedules, 'self_guided_checkins');
  const fcPending = filterByEngagement(analytics?.clientsWithPending, 'full_coaching');
  const sgPending = filterByEngagement(analytics?.clientsWithPending, 'self_guided_checkins');
  const fcActivity = filterByEngagement(analytics?.recentActivity, 'full_coaching');
  const sgActivity = filterByEngagement(analytics?.recentActivity, 'self_guided_checkins');

  // Build a map of clientProtocolId -> engagementLevel from enabledSchedules
  const engagementMap = new Map<number, EngagementLevel>();
  analytics?.enabledSchedules?.forEach(s => {
    if (s.clientProtocolId && s.engagementLevel) {
      engagementMap.set(s.clientProtocolId, s.engagementLevel as EngagementLevel);
    }
  });

  // Use allCheckins from the analytics data (they now include engagementLevel)
  // We need to compute separate summaries - use the raw data arrays
  const allCheckins = (analytics as any)?._allCheckins;
  
  // Fallback: compute from what we have
  const fcCheckins = allCheckins 
    ? allCheckins.filter((c: any) => c.engagementLevel !== 'self_guided_checkins')
    : [];
  const sgCheckins = allCheckins
    ? allCheckins.filter((c: any) => c.engagementLevel === 'self_guided_checkins')
    : [];

  const fcSummary = computeSummary(fcCheckins);
  const sgSummary = computeSummary(sgCheckins);

  // Overall summary (from backend, used as fallback)
  const overallSummary = analytics?.summary || {
    totalEnabled: 0,
    totalCheckins: 0,
    pendingCheckins: 0,
    submittedCheckins: 0,
    reviewedCheckins: 0,
    expiredCheckins: 0,
    lowScoreCheckins: 0,
    responseRate: 0,
    avgScore: 0,
  };

  // If we don't have allCheckins from backend, use overall summary for FC
  const hasSplitData = allCheckins && allCheckins.length > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Check-In Analytics</h1>
            <p className="text-muted-foreground">Track response rates and client engagement</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exportMutation.isPending}>
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportMutation.mutate({ type: 'responses' })}>
                Export All Responses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportMutation.mutate({ type: 'schedules' })}>
                Export Schedules & Streaks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportMutation.mutate({ type: 'analytics' })}>
                Export Analytics Summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ============================================================ */}
        {/* FULL COACHING SECTION - Priority */}
        {/* ============================================================ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-orange-500 pb-2">
            <Shield className="h-6 w-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Full Coaching</h2>
              <p className="text-sm text-muted-foreground">Active coaching clients — priority review</p>
            </div>
            <Badge className="bg-orange-100 text-orange-800 ml-auto">{fcSchedules.length} clients</Badge>
          </div>

          {/* FC Summary Cards */}
          {hasSplitData ? (
            <SummaryCards summary={fcSummary} enabledCount={fcSchedules.length} variant="primary" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Clients</p>
                <p className="text-2xl font-bold text-orange-600">{fcSchedules.length}</p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Response Rate</p>
                <p className="text-2xl font-bold text-green-600">{overallSummary.responseRate}%</p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Avg Score</p>
                <p className="text-2xl font-bold text-blue-600">{overallSummary.avgScore || 'N/A'}</p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low Scores</p>
                <p className="text-2xl font-bold text-red-600">{overallSummary.lowScoreCheckins}</p>
              </div>
            </div>
          )}

          {/* FC Status Breakdown + Weekly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Check-In Status Breakdown</CardTitle>
                <CardDescription>Full Coaching clients only</CardDescription>
              </CardHeader>
              <CardContent>
                {hasSplitData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>Pending Response</span>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{fcSummary.pending}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Submitted (Awaiting Review)</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">{fcSummary.submitted}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Reviewed</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">{fcSummary.reviewed}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span>Expired (No Response)</span>
                      </div>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">{fcSummary.expired}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>Pending Response</span>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{overallSummary.pendingCheckins}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Submitted (Awaiting Review)</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">{overallSummary.submittedCheckins}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Reviewed</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">{overallSummary.reviewedCheckins}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span>Expired (No Response)</span>
                      </div>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">{overallSummary.expiredCheckins}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Trend (Last 4 Weeks)</CardTitle>
                <CardDescription>Response rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.weeklyStats && analytics.weeklyStats.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.weeklyStats.map((week, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{week.week}</span>
                          <span className="text-muted-foreground">
                            {week.responded}/{week.sent} responded ({week.responseRate}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${week.responseRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No check-in data yet</p>
                    <p className="text-sm">Weekly trends will appear once check-ins are sent</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FC Pending Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Responses — Full Coaching
              </CardTitle>
              <CardDescription>Full coaching clients who haven't responded yet</CardDescription>
            </CardHeader>
            <CardContent>
              <PendingClientsList clients={fcPending} />
            </CardContent>
          </Card>

          {/* FC Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Recent Activity — Full Coaching
              </CardTitle>
              <CardDescription>Latest check-in submissions and reviews from full coaching clients</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivityList activities={fcActivity} />
            </CardContent>
          </Card>

          {/* FC Schedule Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-orange-500" />
                Full Coaching Clients — Streaks & Schedules
              </CardTitle>
              <CardDescription>All full coaching clients receiving weekly check-in reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleTable schedules={fcSchedules} />
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* SELF-GUIDED + CHECK-INS SECTION - Collapsible */}
        {/* ============================================================ */}
        <div className="space-y-4">
          <button
            onClick={() => setSelfGuidedExpanded(!selfGuidedExpanded)}
            className="w-full flex items-center gap-3 border-b-2 border-purple-300 pb-2 hover:border-purple-500 transition-colors text-left"
          >
            {selfGuidedExpanded ? (
              <ChevronDown className="h-5 w-5 text-purple-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-purple-600" />
            )}
            <BookOpen className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-700">Self-Guided + Check-Ins</h2>
              <p className="text-sm text-muted-foreground">Optional review — expand to see self-guided client check-ins</p>
            </div>
            <Badge className="bg-purple-100 text-purple-800 ml-auto">{sgSchedules.length} clients</Badge>
          </button>

          {selfGuidedExpanded && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* SG Summary Cards */}
              {hasSplitData ? (
                <SummaryCards summary={sgSummary} enabledCount={sgSchedules.length} variant="secondary" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Clients</p>
                    <p className="text-2xl font-bold text-purple-600">{sgSchedules.length}</p>
                  </div>
                  <div className="bg-white border rounded-lg p-3 col-span-3">
                    <p className="text-xs text-muted-foreground">Self-guided clients have check-ins enabled but are not in active coaching</p>
                  </div>
                </div>
              )}

              {/* SG Pending Clients */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Responses — Self-Guided
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PendingClientsList clients={sgPending} />
                </CardContent>
              </Card>

              {/* SG Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Recent Activity — Self-Guided
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentActivityList activities={sgActivity} />
                </CardContent>
              </Card>

              {/* SG Schedule Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-purple-500" />
                    Self-Guided Clients — Streaks & Schedules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScheduleTable schedules={sgSchedules} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
