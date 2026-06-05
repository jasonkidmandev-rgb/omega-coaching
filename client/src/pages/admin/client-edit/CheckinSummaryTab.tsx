import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import {
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock,
  BarChart3, Target, Flame, AlertTriangle, MessageSquare
} from "lucide-react";
import { formatMT } from "@/lib/timezone";

interface CheckinSummaryTabProps {
  clientId: number;
  clientName: string;
}

export default function CheckinSummaryTab({ clientId, clientName }: CheckinSummaryTabProps) {
  const { data, isLoading, error } = trpc.checkin.getClientSummary.useQuery(
    { clientProtocolId: clientId },
    { enabled: !!clientId }
  );

  // Format trend data for chart
  const chartData = useMemo(() => {
    if (!data?.trendData || data.trendData.length === 0) return [];
    return data.trendData.map((point, index) => ({
      label: point.weekNumber ? `Wk ${point.weekNumber}` : `#${index + 1}`,
      date: point.date ? formatMT(point.date, "MMM d") : "",
      q1Score: point.q1Score,
      overallScore: point.overallScore,
      lowestScore: point.lowestScore,
    }));
  }, [data?.trendData]);

  // Determine trend direction
  const trend = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const recent = chartData.slice(-3);
    const earlier = chartData.slice(0, Math.min(3, chartData.length - 1));
    const recentAvg = recent.reduce((s, d) => s + (d.q1Score || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((s, d) => s + (d.q1Score || 0), 0) / earlier.length;
    const diff = recentAvg - earlierAvg;
    if (diff > 0.5) return "up";
    if (diff < -0.5) return "down";
    return "stable";
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-red-500">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>Failed to load check-in summary: {error.message}</p>
      </Card>
    );
  }

  if (!data?.hasData) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No Check-In Data Yet</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {data?.schedule
            ? "Check-ins are enabled but no responses have been received yet. Data will appear here once the client submits their first check-in."
            : "Check-ins have not been enabled for this client. Enable them in the Check-In Settings sub-tab to start tracking progress."}
        </p>
      </Card>
    );
  }

  const { stats, latestCheckin, trendData } = data;

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          subtitle={`${stats.totalCompleted} of ${stats.totalSent} sent`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color={stats.completionRate >= 75 ? "green" : stats.completionRate >= 50 ? "yellow" : "red"}
        />
        <StatCard
          title="Avg Score"
          value={stats.averageScore !== null ? `${stats.averageScore}/10` : "N/A"}
          subtitle={stats.averageScore !== null && stats.averageScore >= 7 ? "Good" : stats.averageScore !== null && stats.averageScore >= 5 ? "Fair" : stats.averageScore !== null ? "Needs attention" : "No scores yet"}
          icon={<Target className="h-4 w-4" />}
          color={stats.averageScore !== null && stats.averageScore >= 7 ? "green" : stats.averageScore !== null && stats.averageScore >= 5 ? "yellow" : stats.averageScore !== null ? "red" : "gray"}
        />
        <StatCard
          title="Current Streak"
          value={`${stats.currentStreak}`}
          subtitle={`Best: ${stats.longestStreak} weeks`}
          icon={<Flame className="h-4 w-4" />}
          color={stats.currentStreak >= 4 ? "green" : stats.currentStreak >= 2 ? "yellow" : "gray"}
        />
        <StatCard
          title="Status"
          value={stats.totalPending > 0 ? "Pending" : stats.totalIncomplete > 0 ? "Incomplete" : "Up to Date"}
          subtitle={stats.lastResponseAt ? `Last: ${formatMT(stats.lastResponseAt, "MMM d, yyyy")}` : "No responses"}
          icon={stats.totalPending > 0 ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          color={stats.totalPending > 0 ? "yellow" : stats.totalIncomplete > 0 ? "red" : "green"}
        />
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Overall Experience Score Trend
                {trend === "up" && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs"><TrendingUp className="h-3 w-3 mr-1" />Improving</Badge>}
                {trend === "down" && <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs"><TrendingDown className="h-3 w-3 mr-1" />Declining</Badge>}
                {trend === "stable" && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">Stable</Badge>}
              </CardTitle>
              <span className="text-xs text-gray-500">{chartData.length} check-in{chartData.length !== 1 ? "s" : ""}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#888" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fontSize: 11, fill: "#888" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-semibold text-gray-800">{d.label} &middot; {d.date}</p>
                          <div className="mt-1.5 space-y-1">
                            {d.q1Score !== null && (
                              <p className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                                Q1 Score: <span className="font-semibold">{d.q1Score}/10</span>
                              </p>
                            )}
                            {d.overallScore !== null && (
                              <p className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                Overall: <span className="font-semibold">{d.overallScore}/10</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "Alert", position: "insideTopRight", fontSize: 10, fill: "#ef4444" }} />
                  <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.3} />
                  <Area
                    type="monotone"
                    dataKey="q1Score"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              Question 1: &ldquo;On a scale of 1-10, how happy are you with your overall experience so far?&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Latest Check-In */}
      {latestCheckin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              Latest Check-In Response
              <span className="text-xs text-gray-500 font-normal ml-auto">
                {latestCheckin.submittedAt ? formatMT(latestCheckin.submittedAt, "MMM d, yyyy 'at' h:mm a") + " MT" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestCheckin.responses?.map((response: any, idx: number) => (
                <div key={idx} className="border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">{response.questionText}</p>
                  {response.questionType === "scale" && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (response.scaleValue || 0) >= 7 ? "bg-green-500" :
                            (response.scaleValue || 0) >= 5 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${((response.scaleValue || 0) / 10) * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${
                        (response.scaleValue || 0) >= 7 ? "text-green-600" :
                        (response.scaleValue || 0) >= 5 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {response.scaleValue}/10
                      </span>
                    </div>
                  )}
                  {response.questionType === "text" && response.textValue && (
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-md px-3 py-2 italic">
                      {response.textValue}
                    </p>
                  )}
                  {response.questionType === "checkbox" && (
                    <div className="flex items-center gap-1.5">
                      {response.booleanValue ? (
                        <><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm text-green-700">Yes</span></>
                      ) : (
                        <><XCircle className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-500">No</span></>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {latestCheckin.overallScore !== null && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">Overall Score</span>
                <Badge variant={latestCheckin.overallScore >= 7 ? "default" : latestCheckin.overallScore >= 5 ? "secondary" : "destructive"} className="text-sm">
                  {latestCheckin.overallScore}/10
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check-In History Table */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Check-In History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Week</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Q1 Score</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Overall</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trendData].reverse().map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-1.5 px-2 text-gray-700">
                        {item.date ? formatMT(item.date, "MMM d, yyyy") : "-"}
                      </td>
                      <td className="py-1.5 px-2 text-center text-gray-600">
                        {item.weekNumber || "-"}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {item.q1Score !== null ? (
                          <span className={`font-semibold ${
                            item.q1Score >= 7 ? "text-green-600" :
                            item.q1Score >= 5 ? "text-yellow-600" : "text-red-600"
                          }`}>{item.q1Score}/10</span>
                        ) : "-"}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {item.overallScore !== null ? (
                          <span className={`font-semibold ${
                            item.overallScore >= 7 ? "text-green-600" :
                            item.overallScore >= 5 ? "text-yellow-600" : "text-red-600"
                          }`}>{item.overallScore}/10</span>
                        ) : "-"}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {item.hasLowScore && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Low
                          </Badge>
                        )}
                        {!item.hasLowScore && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-200">
                            Good
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "green" | "yellow" | "red" | "gray";
}) {
  const colorClasses = {
    green: "text-green-600 bg-green-50 border-green-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    red: "text-red-600 bg-red-50 border-red-200",
    gray: "text-gray-500 bg-gray-50 border-gray-200",
  };

  return (
    <Card className={`border ${colorClasses[color].split(" ").slice(2).join(" ")}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={colorClasses[color].split(" ")[0]}>{icon}</span>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        </div>
        <p className={`text-xl font-bold ${colorClasses[color].split(" ")[0]}`}>{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
