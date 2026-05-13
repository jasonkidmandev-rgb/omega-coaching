import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown,
  BarChart3, Users, Calendar, Timer, Target
} from "lucide-react";
import { format, subDays, differenceInHours, startOfWeek, endOfWeek } from "date-fns";

interface CheckinAnalyticsProps {
  className?: string;
}

export default function CheckinAnalytics({ className }: CheckinAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("30");
  
  // Fetch all check-ins
  const { data: allCheckins, isLoading } = trpc.checkin.list.useQuery({});
  
  // Fetch enabled schedules for active client count
  const { data: enabledSchedules } = trpc.checkin.schedules.getAllEnabled.useQuery();
  
  // Calculate analytics
  const analytics = useMemo(() => {
    if (!allCheckins) return null;
    
    const days = parseInt(timeRange);
    const cutoffDate = subDays(new Date(), days);
    
    // Filter check-ins within time range
    const recentCheckins = allCheckins.filter(c => 
      new Date(c.createdAt || c.sentAt || 0) >= cutoffDate
    );
    
    // Basic counts
    const total = recentCheckins.length;
    const completed = recentCheckins.filter(c => c.status === 'submitted' || c.status === 'reviewed').length;
    const pending = recentCheckins.filter(c => c.status === 'pending').length;
    const incomplete = recentCheckins.filter(c => c.status === 'incomplete').length;
    const reviewed = recentCheckins.filter(c => c.status === 'reviewed').length;
    
    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Average response time (hours from sentAt to submittedAt)
    const completedWithTimes = recentCheckins.filter(c => 
      (c.status === 'submitted' || c.status === 'reviewed') && c.sentAt && c.submittedAt
    );
    const avgResponseTime = completedWithTimes.length > 0
      ? Math.round(completedWithTimes.reduce((sum, c) => 
          sum + differenceInHours(new Date(c.submittedAt!), new Date(c.sentAt!)), 0
        ) / completedWithTimes.length)
      : 0;
    
    // Average score
    const withScores = recentCheckins.filter(c => c.overallScore !== null);
    const avgScore = withScores.length > 0
      ? (withScores.reduce((sum, c) => sum + (c.overallScore || 0), 0) / withScores.length).toFixed(1)
      : "N/A";
    
    // Low score count (5 or below)
    const lowScoreCount = recentCheckins.filter(c => c.hasLowScore || (c.overallScore !== null && c.overallScore <= 5)).length;
    
    // Weekly trends (last 4 weeks)
    const weeklyData: { week: string; completed: number; total: number; rate: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekEnd = endOfWeek(subDays(new Date(), i * 7));
      const weekCheckins = allCheckins.filter(c => {
        const date = new Date(c.createdAt || c.sentAt || 0);
        return date >= weekStart && date <= weekEnd;
      });
      const weekCompleted = weekCheckins.filter(c => c.status === 'submitted' || c.status === 'reviewed').length;
      weeklyData.push({
        week: format(weekStart, 'MMM d'),
        completed: weekCompleted,
        total: weekCheckins.length,
        rate: weekCheckins.length > 0 ? Math.round((weekCompleted / weekCheckins.length) * 100) : 0,
      });
    }
    
    // Trend direction
    const currentWeekRate = weeklyData[3]?.rate || 0;
    const previousWeekRate = weeklyData[2]?.rate || 0;
    const trendDirection = currentWeekRate > previousWeekRate ? 'up' : currentWeekRate < previousWeekRate ? 'down' : 'stable';
    
    return {
      total,
      completed,
      pending,
      incomplete,
      reviewed,
      completionRate,
      avgResponseTime,
      avgScore,
      lowScoreCount,
      weeklyData,
      trendDirection,
      activeClients: enabledSchedules?.length || 0,
    };
  }, [allCheckins, enabledSchedules, timeRange]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
    );
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          No check-in data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Check-in Analytics
        </h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Completion Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-green-600">{analytics.completionRate}%</span>
              {analytics.trendDirection === 'up' && (
                <TrendingUp className="h-5 w-5 text-green-500" />
              )}
              {analytics.trendDirection === 'down' && (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {analytics.completed} of {analytics.total} completed
            </p>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Avg Response Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-blue-600">
              {analytics.avgResponseTime}h
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Time to complete check-in
            </p>
          </CardContent>
        </Card>

        {/* Average Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Average Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-orange-600">
              {analytics.avgScore}/10
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Across all responses
            </p>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-purple-600">
              {analytics.activeClients}
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              With check-ins enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Breakdown</CardTitle>
            <CardDescription>Check-in status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Reviewed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{analytics.reviewed}</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    {analytics.total > 0 ? Math.round((analytics.reviewed / analytics.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>Awaiting Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{analytics.completed - analytics.reviewed}</span>
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                    {analytics.total > 0 ? Math.round(((analytics.completed - analytics.reviewed) / analytics.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{analytics.pending}</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    {analytics.total > 0 ? Math.round((analytics.pending / analytics.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Incomplete</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{analytics.incomplete}</span>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                    {analytics.total > 0 ? Math.round((analytics.incomplete / analytics.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Attention Required
            </CardTitle>
            <CardDescription>Items that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.lowScoreCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Low Score Alerts</span>
                  </div>
                  <Badge variant="destructive">{analytics.lowScoreCount}</Badge>
                </div>
              )}
              {analytics.pending > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Pending Check-ins</span>
                  </div>
                  <Badge className="bg-blue-500">{analytics.pending}</Badge>
                </div>
              )}
              {(analytics.completed - analytics.reviewed) > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Awaiting Review</span>
                  </div>
                  <Badge className="bg-orange-500">{analytics.completed - analytics.reviewed}</Badge>
                </div>
              )}
              {analytics.lowScoreCount === 0 && analytics.pending === 0 && (analytics.completed - analytics.reviewed) === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>All caught up! No items need attention.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Trend</CardTitle>
          <CardDescription>Completion rates over the last 4 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 h-32">
            {analytics.weeklyData.map((week, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100px' }}>
                  <div 
                    className="absolute bottom-0 w-full bg-orange-500 rounded-t-lg transition-all"
                    style={{ height: `${week.rate}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{week.week}</p>
                  <p className="text-sm font-semibold">{week.rate}%</p>
                  <p className="text-xs text-muted-foreground">{week.completed}/{week.total}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
