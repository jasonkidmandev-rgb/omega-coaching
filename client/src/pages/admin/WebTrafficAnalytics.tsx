import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Eye,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  TrendingUp,
  ExternalLink,
  Clock,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Date range helper
function getDateRange(range: string) {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// Friendly page name mapping
function getPageName(path: string): string {
  const names: Record<string, string> = {
    "/": "Homepage",
    "/launchpad": "Launchpad Hub",
    "/community": "Community Choice",
    "/transformation": "Transformation Entry",
    "/transformation/journey": "Transformation Journey (Deprecated)",
    "/transformation/verify": "Transformation Verify",
    "/transformation/checkout": "Transformation Checkout",
    "/tier-selection": "Tier Selection",
    "/masterclass": "Masterclass",
    "/store": "Store",
    "/partners": "Partners",
    "/terms": "Terms of Service",
    "/privacy": "Privacy Policy",
  };
  return names[path] || path;
}

// Device icon helper
function DeviceIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "mobile":
      return <Smartphone className={className} />;
    case "tablet":
      return <Tablet className={className} />;
    default:
      return <Monitor className={className} />;
  }
}

// Simple sparkline bar chart
function MiniBarChart({ data, maxVal }: { data: number[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((val, i) => (
        <div
          key={i}
          className="bg-orange-500/70 rounded-t-sm min-w-[3px] flex-1"
          style={{ height: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`, minHeight: val > 0 ? "2px" : "0px" }}
        />
      ))}
    </div>
  );
}

export default function WebTrafficAnalytics() {
  return (
    <>
      <WebTrafficAnalyticsContent />
    </>
  );
}

function WebTrafficAnalyticsContent() {
  const [dateRange, setDateRange] = useState("30d");
  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Fetch all data
  const { data: stats, isLoading: statsLoading } = trpc.webTraffic.getStats.useQuery(
    { startDate, endDate },
    { refetchInterval: 60000 }
  );
  const { data: topPages, isLoading: pagesLoading } = trpc.webTraffic.getTopPages.useQuery(
    { startDate, endDate, limit: 20 },
    { refetchInterval: 60000 }
  );
  const { data: referrers, isLoading: referrersLoading } = trpc.webTraffic.getReferrers.useQuery(
    { startDate, endDate, limit: 20 },
    { refetchInterval: 60000 }
  );
  const { data: dailyTrend } = trpc.webTraffic.getDailyTrend.useQuery(
    { startDate, endDate },
    { refetchInterval: 60000 }
  );
  const { data: deviceBreakdown } = trpc.webTraffic.getDeviceBreakdown.useQuery(
    { startDate, endDate },
    { refetchInterval: 60000 }
  );
  const { data: keyPageStats } = trpc.webTraffic.getPageStats.useQuery(
    { startDate, endDate, paths: ["/", "/community", "/transformation", "/launchpad", "/masterclass"] },
    { refetchInterval: 60000 }
  );
  const { data: recentViews } = trpc.webTraffic.getRecentViews.useQuery(
    { limit: 30 },
    { refetchInterval: 15000 }
  );

  const utils = trpc.useUtils();
  const handleRefresh = () => {
    utils.webTraffic.invalidate();
  };

  // Calculate avg page views per session
  const avgPagesPerSession = stats && stats.totalSessions > 0
    ? (stats.totalPageViews / stats.totalSessions).toFixed(1)
    : "0";

  // Trend chart data
  const trendViews = dailyTrend?.map((d) => d.views) || [];
  const trendMax = Math.max(...trendViews, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-orange-500" />
            Web Traffic Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track page views, visitor sources, and engagement across your site
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="border-gray-200 text-gray-600">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Page Views</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {statsLoading ? "..." : (stats?.totalPageViews || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {trendViews.length > 0 && (
              <div className="mt-3">
                <MiniBarChart data={trendViews} maxVal={trendMax} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Visitors</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {statsLoading ? "..." : (stats?.uniqueVisitors || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {statsLoading ? "..." : (stats?.totalSessions || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pages / Session</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{avgPagesPerSession}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Pages Spotlight */}
      {keyPageStats && keyPageStats.length > 0 && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Key Pages Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {keyPageStats.map((page) => (
                <div key={page.path} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-600">{getPageName(page.path)}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Views</span>
                      <span className="text-gray-900 font-semibold">{page.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Visitors</span>
                      <span className="text-gray-900 font-semibold">{page.uniqueVisitors.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sessions</span>
                      <span className="text-gray-900 font-semibold">{page.sessions.toLocaleString()}</span>
                    </div>
                    {page.devices.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {page.devices.map((d) => (
                          <Badge key={d.deviceType} variant="outline" className="text-xs border-gray-300 text-gray-600">
                            <DeviceIcon type={d.deviceType} className="h-3 w-3 mr-1" />
                            {d.count}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="pages" className="space-y-4">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger value="pages" className="text-gray-600 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Top Pages
          </TabsTrigger>
          <TabsTrigger value="referrers" className="text-gray-600 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Traffic Sources
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-gray-600 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Devices & Browsers
          </TabsTrigger>
          <TabsTrigger value="live" className="text-gray-600 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Live Feed
          </TabsTrigger>
        </TabsList>

        {/* Top Pages Tab */}
        <TabsContent value="pages">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg">All Pages</CardTitle>
            </CardHeader>
            <CardContent>
              {pagesLoading ? (
                <div className="text-gray-500 text-center py-8">Loading...</div>
              ) : !topPages || topPages.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No page view data yet</p>
                  <p className="text-gray-500 text-sm mt-1">Data will appear as visitors browse your site</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-sm text-gray-500 pb-3 font-medium">Page</th>
                        <th className="text-right text-sm text-gray-500 pb-3 font-medium">Views</th>
                        <th className="text-right text-sm text-gray-500 pb-3 font-medium">Visitors</th>
                        <th className="text-right text-sm text-gray-500 pb-3 font-medium hidden sm:table-cell">Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.map((page, i) => {
                        const maxViews = topPages[0]?.views || 1;
                        const pct = (page.views / maxViews) * 100;
                        return (
                          <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900">{getPageName(page.path)}</span>
                                <span className="text-xs text-gray-500">{page.path}</span>
                              </div>
                            </td>
                            <td className="text-right text-sm text-gray-900 font-semibold py-3">
                              {page.views.toLocaleString()}
                            </td>
                            <td className="text-right text-sm text-gray-600 py-3">
                              {page.uniqueVisitors.toLocaleString()}
                            </td>
                            <td className="text-right py-3 hidden sm:table-cell w-40">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traffic Sources Tab */}
        <TabsContent value="referrers">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-blue-600" />
                Where Visitors Come From
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referrersLoading ? (
                <div className="text-gray-500 text-center py-8">Loading...</div>
              ) : !referrers || referrers.length === 0 ? (
                <div className="text-center py-12">
                  <ExternalLink className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No referrer data yet</p>
                  <p className="text-gray-500 text-sm mt-1">Data will appear as visitors arrive from external sources</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrers.map((ref, i) => {
                    const maxViews = referrers[0]?.views || 1;
                    const pct = (ref.views / maxViews) * 100;
                    const isDirect = ref.referrerDomain === "Direct / None";
                    return (
                      <div key={i} className="relative">
                        <div
                          className="absolute inset-0 bg-blue-500/5 rounded-lg"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isDirect ? "bg-gray-100" : "bg-blue-500/10"}`}>
                              {isDirect ? (
                                <ArrowUpRight className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Globe className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm text-gray-900 font-medium">{ref.referrerDomain}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-sm text-gray-900 font-semibold">{ref.views.toLocaleString()}</span>
                              <span className="text-xs text-gray-500 ml-1">views</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-gray-600">{ref.uniqueVisitors.toLocaleString()}</span>
                              <span className="text-xs text-gray-500 ml-1">visitors</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Device Types */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base">Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceBreakdown?.devices && deviceBreakdown.devices.length > 0 ? (
                  <div className="space-y-3">
                    {deviceBreakdown.devices.map((d, i) => {
                      const total = deviceBreakdown.devices.reduce((sum, x) => sum + x.count, 0);
                      const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DeviceIcon type={d.deviceType} className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-900 capitalize">{d.deviceType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 font-semibold">{d.count.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Browsers */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base">Browsers</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceBreakdown?.browsers && deviceBreakdown.browsers.length > 0 ? (
                  <div className="space-y-3">
                    {deviceBreakdown.browsers.map((b, i) => {
                      const total = deviceBreakdown.browsers.reduce((sum, x) => sum + x.count, 0);
                      const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : "0";
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{b.browser}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 font-semibold">{b.count.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Operating Systems */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-base">Operating Systems</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceBreakdown?.os && deviceBreakdown.os.length > 0 ? (
                  <div className="space-y-3">
                    {deviceBreakdown.os.map((o, i) => {
                      const total = deviceBreakdown.os.reduce((sum, x) => sum + x.count, 0);
                      const pct = total > 0 ? ((o.count / total) * 100).toFixed(1) : "0";
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">{o.os}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 font-semibold">{o.count.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Feed Tab */}
        <TabsContent value="live">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Recent Visitors
                <span className="text-xs text-gray-500 font-normal ml-2">(auto-refreshes every 15s)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recentViews || recentViews.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No recent visits</p>
                  <p className="text-gray-500 text-sm mt-1">Live visitor data will appear here as people browse your site</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {recentViews.map((view) => (
                    <div key={view.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <DeviceIcon type={view.deviceType || "desktop"} className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-sm text-gray-900">{getPageName(view.path)}</span>
                          <span className="text-xs text-gray-500 ml-2">{view.path}</span>
                          {view.referrerDomain && (
                            <span className="text-xs text-blue-600 ml-2">
                              via {view.referrerDomain}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {view.browser && (
                          <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                            {view.browser}
                          </Badge>
                        )}
                        {view.os && (
                          <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                            {view.os}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {view.createdAt ? toLocaleDateStringMT(view.createdAt) : ""}
                        </span>
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
  );
}

