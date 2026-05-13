import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MousePointerClick, Eye, TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function EmailEngagement() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "all">("week");
  
  const { data: stats, isLoading, refetch } = trpc.emailEngagement.getStats.useQuery({ period });
  const { data: recentEvents } = trpc.emailEngagement.getRecentEvents.useQuery({ limit: 50 });

  const openRate = stats?.openRate?.toFixed(1) || "0";
  const clickRate = stats?.clickRate?.toFixed(1) || "0";

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Email Engagement</h1>
          <p className="text-muted-foreground">
            Track email opens, clicks, and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total emails sent in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Opens</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.uniqueOpens || 0}</div>
            <p className="text-xs text-muted-foreground">
              {openRate}% open rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.totalClicks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {clickRate}% click-through rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalSent && stats.totalSent > 0 
                ? Math.round(((stats.uniqueOpens + stats.totalClicks * 2) / stats.totalSent) * 50) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Weighted engagement metric
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest email engagement events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="opens">Opens</TabsTrigger>
              <TabsTrigger value="clicks">Clicks</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <RecentEventsTable events={recentEvents?.events || []} />
            </TabsContent>
            <TabsContent value="opens" className="mt-4">
              <RecentEventsTable events={(recentEvents?.events || []).filter(e => e.eventType === 'open')} />
            </TabsContent>
            <TabsContent value="clicks" className="mt-4">
              <RecentEventsTable events={(recentEvents?.events || []).filter(e => e.eventType === 'click')} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}

function RecentEventsTable({ events }: { events: Array<{
  id: number;
  trackingId: string;
  eventType: string;
  linkUrl?: string | null;
  linkName?: string | null;
  createdAt: Date | string;
}> }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No events found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Tracking ID</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              <Badge variant={event.eventType === 'open' ? 'secondary' : 'default'}>
                {event.eventType === 'open' ? (
                  <><Eye className="h-3 w-3 mr-1" /> Open</>
                ) : (
                  <><MousePointerClick className="h-3 w-3 mr-1" /> Click</>
                )}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {event.trackingId.slice(0, 16)}...
            </TableCell>
            <TableCell className="max-w-[300px] truncate">
              {event.linkName || event.linkUrl || '-'}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {format(new Date(event.createdAt), 'MMM d, h:mm a')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}