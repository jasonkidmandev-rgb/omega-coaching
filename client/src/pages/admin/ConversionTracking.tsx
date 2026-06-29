import { trpc } from "../../lib/trpc";
import { toLocaleDateStringMT } from "../../lib/timezone";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Users, Clock, DollarSign, ArrowRight,
  RefreshCw, BarChart3, Target
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  clicked: "Clicked Link",
  viewing: "Viewing",
  engaged: "Engaged",
  waiting_on_client: "Waiting on Client",
  ready_for_consult: "Ready for Consult",
  enrolled: "Enrolled",
  not_ready: "Not Ready",
  declined: "Declined",
  stalled: "Stalled",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-cyan-100 text-cyan-700",
  clicked: "bg-indigo-100 text-indigo-700",
  viewing: "bg-purple-100 text-purple-700",
  engaged: "bg-violet-100 text-violet-700",
  waiting_on_client: "bg-amber-100 text-amber-700",
  ready_for_consult: "bg-orange-100 text-orange-700",
  enrolled: "bg-green-100 text-green-700",
  not_ready: "bg-gray-100 text-gray-700",
  declined: "bg-red-100 text-red-700",
  stalled: "bg-yellow-100 text-yellow-700",
};

const TIER_LABELS: Record<string, string> = {
  elite: "Elite",
  flagship: "Flagship",
  essentials: "Essentials",
  advanced: "Advanced",
  recovery: "Recovery",
  immunity: "Immunity",
  longevity: "Longevity",
  mitochondria: "Mitochondria",
  functional_health_elite: "Functional Health Elite",
};

export default function ConversionTracking() {
  const metrics = trpc.automation.conversionMetrics.useQuery(undefined, {
    refetchInterval: 120000,
  });

  const data = metrics.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  // Calculate the max count for the funnel visualization
  const maxCount = data?.pipeline?.reduce((max: number, p: any) => Math.max(max, p.count), 0) || 1;

  return (
    <AdminLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Conversion Tracking</h1>
            <p className="text-sm text-muted-foreground">
              Prospect-to-client pipeline performance and sales cycle metrics
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => metrics.refetch()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${metrics.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              Total Prospects
            </div>
            <p className="text-2xl font-bold">{data?.totalProspects || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4 text-green-500" />
              Converted
            </div>
            <p className="text-2xl font-bold text-green-600">{data?.totalConverted || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Conversion Rate
            </div>
            <p className="text-2xl font-bold">{data?.conversionRate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              Avg Days to Convert
            </div>
            <p className="text-2xl font-bold">{data?.averageDays || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : !data?.pipeline?.length ? (
              <p className="text-muted-foreground text-center py-8">No pipeline data yet.</p>
            ) : (
              <div className="space-y-2">
                {data.pipeline.map((stage: any) => (
                  <div key={stage.status} className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <Badge className={`text-xs ${STATUS_COLORS[stage.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[stage.status] || stage.status}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-6 relative">
                        <div
                          className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max((stage.count / maxCount) * 100, 8)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{stage.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Conversion by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.tierBreakdown?.length ? (
              <p className="text-muted-foreground text-center py-8">No tier data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.tierBreakdown.map((tier: any) => (
                  <div key={tier.tier} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {TIER_LABELS[tier.tier] || tier.tier}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {tier.count} enrolled
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{tier.avgDays}</span> avg days
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-green-600">{formatCurrency(tier.totalRevenue)}</span> revenue
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {data?.monthlyTrend && data.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Conversion Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.monthlyTrend.map((m: any) => (
                <div key={m.month} className="text-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </p>
                  <p className="text-xl font-bold text-blue-600">{m.conversions}</p>
                  <p className="text-xs text-muted-foreground">{m.avgDays}d avg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Recent Conversions (Last 90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recentConversions?.length ? (
            <p className="text-muted-foreground text-center py-8">No recent conversions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2 font-medium">Tier</th>
                    <th className="pb-2 font-medium">Days to Convert</th>
                    <th className="pb-2 font-medium">Coaching Fee</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentConversions.map((r: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="py-2 text-muted-foreground">{r.source || '-'}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {TIER_LABELS[r.tier] || r.tier}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <span className={`font-medium ${r.daysToConvert <= 7 ? 'text-green-600' : r.daysToConvert <= 14 ? 'text-amber-600' : 'text-red-600'}`}>
                          {r.daysToConvert}d
                        </span>
                      </td>
                      <td className="py-2 font-medium">
                        {r.coachingFeeAmount ? formatCurrency(Number(r.coachingFeeAmount)) : '-'}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary" className="text-xs">
                          {r.enrollmentStatus?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {r.enrolledAt ? toLocaleDateStringMT(r.enrolledAt, { month: 'short', day: 'numeric' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
