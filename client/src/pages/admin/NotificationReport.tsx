import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mail, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, RefreshCw, Download, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export default function NotificationReport() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  const { data: stats, isLoading, refetch } = trpc.notificationHistory.getStats.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const { data: recentNotifications } = trpc.notificationHistory.getRecent.useQuery({
    limit: 20,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const deliveryRate = stats?.total ? Math.round((stats.sent / stats.total) * 100) : 0;
  const failureRate = stats?.total ? Math.round((stats.failed / stats.total) * 100) : 0;

  const categoryColors: Record<string, string> = {
    checkin: "bg-blue-100 text-blue-800",
    payment: "bg-green-100 text-green-800",
    protocol: "bg-purple-100 text-purple-800",
    shipping: "bg-orange-100 text-orange-800",
    digest: "bg-cyan-100 text-cyan-800",
    welcome: "bg-pink-100 text-pink-800",
    reminder: "bg-yellow-100 text-yellow-800",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    sent: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <XCircle className="h-4 w-4 text-red-600" />,
    pending: <Clock className="h-4 w-4 text-yellow-600" />,
  };

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-orange-500" />
              Notification Delivery Report
            </h1>
            <p className="text-muted-foreground">Monitor email delivery rates and communication health</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time Range:</span>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as "7" | "30" | "90")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Category:</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="checkin">Check-in</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="protocol">Protocol</SelectItem>
              <SelectItem value="shipping">Shipping</SelectItem>
              <SelectItem value="digest">Digest</SelectItem>
              <SelectItem value="welcome">Welcome</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Emails</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-500" />
              {isLoading ? "..." : stats?.total || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In the last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Delivery Rate</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {deliveryRate >= 95 ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500" />
              )}
              {deliveryRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.sent || 0} successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Deliveries</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              {isLoading ? "..." : stats?.failed || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {failureRate}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Clock className="h-6 w-6 text-yellow-500" />
              {isLoading ? "..." : stats?.pending || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Email distribution by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {stats?.byCategory && Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="text-center p-4 rounded-lg bg-gray-100 border">
                <Badge className={categoryColors[category] || "bg-gray-100 text-gray-800"}>
                  {category}
                </Badge>
                <p className="text-2xl font-bold mt-2">{count as number}</p>
                <p className="text-xs text-muted-foreground">emails</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Last 20 email notifications sent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentNotifications?.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  {statusIcons[notification.status]}
                  <div>
                    <p className="font-medium">{notification.subject}</p>
                    <p className="text-sm text-muted-foreground">{notification.recipientEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={categoryColors[notification.category] || "bg-gray-100 text-gray-800"}>
                    {notification.category}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>
            ))}
            {(!recentNotifications || recentNotifications.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notifications found for this period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}