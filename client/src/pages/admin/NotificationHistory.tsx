import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  History, Mail, Bell, AlertCircle, CheckCircle2, Clock, 
  Search, Filter, RefreshCw, ChevronLeft, ChevronRight, Eye,
  Calendar, User, XCircle, MousePointerClick, MailOpen, Send
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Delivery status badge with open/click indicators
function DeliveryBadge({ status, openedAt, clickedAt, openCount, clickCount }: { 
  status: string; 
  openedAt?: string | Date | null; 
  clickedAt?: string | Date | null;
  openCount?: number | null;
  clickCount?: number | null;
}) {
  if (status === 'failed') {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  
  if (clickedAt) {
    return (
      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
        <MousePointerClick className="h-3 w-3" />
        Clicked{clickCount && clickCount > 1 ? ` (${clickCount}x)` : ''}
      </Badge>
    );
  }
  
  if (openedAt) {
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
        <MailOpen className="h-3 w-3" />
        Opened{openCount && openCount > 1 ? ` (${openCount}x)` : ''}
      </Badge>
    );
  }
  
  if (status === 'sent') {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-700 flex items-center gap-1">
        <Send className="h-3 w-3" />
        Delivered
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Category badge component
function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    checkin: "bg-blue-100 text-blue-800",
    protocol: "bg-purple-100 text-purple-800",
    payment: "bg-green-100 text-green-800",
    shipping: "bg-orange-100 text-orange-800",
    inventory: "bg-yellow-100 text-yellow-800",
    document: "bg-gray-100 text-gray-800",
    welcome: "bg-pink-100 text-pink-800",
    announcement: "bg-indigo-100 text-indigo-800",
    digest: "bg-cyan-100 text-cyan-800",
    other: "bg-slate-100 text-slate-800",
  };
  
  return (
    <Badge variant="outline" className={colors[category] || colors.other}>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </Badge>
  );
}

// Stats card component
function StatsCard({ title, value, subtitle, icon, color }: { 
  title: string; 
  value: number | string; 
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationHistory() {
  const [activeTab, setActiveTab] = useState("inapp");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const limit = 20;

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { startDate: startOfDay(now).toISOString(), endDate: endOfDay(now).toISOString() };
      case "7days":
        return { startDate: subDays(now, 7).toISOString(), endDate: now.toISOString() };
      case "30days":
        return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() };
      case "90days":
        return { startDate: subDays(now, 90).toISOString(), endDate: now.toISOString() };
      case "all":
      default:
        return {};
    }
  };

  const dates = getDateRange();

  // Fetch email notifications with tracking data
  const { data: emailData, isLoading: emailLoading, refetch: refetchEmail } = trpc.notificationHistory.list.useQuery({
    category: category as any,
    status: status as any,
    deliveryStatus: deliveryStatus as any,
    search: search || undefined,
    ...dates,
    limit,
    offset: page * limit,
  }, {
    enabled: activeTab === "email",
  });

  // Fetch in-app notifications
  const { data: inAppData, isLoading: inAppLoading, refetch: refetchInApp } = trpc.notificationHistory.listInApp.useQuery({
    search: search || undefined,
    ...dates,
    limit,
    offset: page * limit,
  }, {
    enabled: activeTab === "inapp",
  });

  // Fetch comprehensive stats
  const { data: stats } = trpc.notificationHistory.getComprehensiveStats.useQuery(dates);

  const handleRefresh = () => {
    if (activeTab === "email") {
      refetchEmail();
    } else {
      refetchInApp();
    }
  };

  const currentData = activeTab === "email" ? emailData : inAppData;
  const isLoading = activeTab === "email" ? emailLoading : inAppLoading;
  const totalPages = currentData ? Math.ceil(currentData.total / limit) : 0;

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8 text-orange-500" />
            Notification History
          </h1>
          <p className="text-muted-foreground mt-1">
            Track email delivery, opens, clicks, and in-app notification engagement
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Total Emails"
          value={stats?.email.total || 0}
          subtitle={`${stats?.email.successRate || 0}% delivered`}
          icon={<Mail className="h-5 w-5 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatsCard
          title="Tracked"
          value={stats?.email.tracked || 0}
          subtitle="With pixel tracking"
          icon={<Eye className="h-5 w-5 text-indigo-600" />}
          color="bg-indigo-100"
        />
        <StatsCard
          title="Opened"
          value={stats?.email.opened || 0}
          subtitle={`${stats?.email.openRate || 0}% open rate`}
          icon={<MailOpen className="h-5 w-5 text-cyan-600" />}
          color="bg-cyan-100"
        />
        <StatsCard
          title="Clicked"
          value={stats?.email.clicked || 0}
          subtitle={`${stats?.email.clickRate || 0}% click rate`}
          icon={<MousePointerClick className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-100"
        />
        <StatsCard
          title="Failed"
          value={stats?.email.failed || 0}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          color="bg-red-100"
        />
        <StatsCard
          title="In-App"
          value={stats?.inApp.total || 0}
          subtitle={`${stats?.inApp.readRate || 0}% read rate`}
          icon={<Bell className="h-5 w-5 text-purple-600" />}
          color="bg-purple-100"
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Notification Log</CardTitle>
              <CardDescription>
                Browse and search through all notification history
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="inapp" className="gap-2">
                  <Bell className="h-4 w-4" />
                  In-App
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, subject..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="pl-9 w-[250px]"
                  />
                </div>

                <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>

                {activeTab === "email" && (
                  <>
                    <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="checkin">Check-in</SelectItem>
                        <SelectItem value="protocol">Protocol</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="shipping">Shipping</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="digest">Digest</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={deliveryStatus} onValueChange={(v) => { setDeliveryStatus(v); setPage(0); }}>
                      <SelectTrigger className="w-[140px]">
                        <MailOpen className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Engagement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Engagement</SelectItem>
                        <SelectItem value="sent_only">Delivered Only</SelectItem>
                        <SelectItem value="opened">Opened</SelectItem>
                        <SelectItem value="clicked">Clicked</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {/* Email Tab */}
            <TabsContent value="email" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : emailData?.notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No email notifications found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or date range</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailData?.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedNotification({ ...notification, type: 'email' })}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-full ${
                          notification.clickedAt ? 'bg-emerald-100' :
                          notification.openedAt ? 'bg-blue-100' :
                          notification.status === 'failed' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {notification.clickedAt ? (
                            <MousePointerClick className="h-4 w-4 text-emerald-600" />
                          ) : notification.openedAt ? (
                            <MailOpen className="h-4 w-4 text-blue-600" />
                          ) : notification.status === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Mail className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{notification.subject}</p>
                            <CategoryBadge category={notification.category} />
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {notification.recipientName || notification.clientName || notification.recipientEmail}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {notification.sentAt 
                                ? format(new Date(notification.sentAt), "MMM d, yyyy h:mm a")
                                : format(new Date(notification.createdAt), "MMM d, yyyy h:mm a")
                              }
                            </span>
                            {notification.openedAt && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <MailOpen className="h-3 w-3" />
                                Opened {format(new Date(notification.openedAt), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DeliveryBadge 
                          status={notification.status} 
                          openedAt={notification.openedAt}
                          clickedAt={notification.clickedAt}
                          openCount={notification.openCount}
                          clickCount={notification.clickCount}
                        />
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* In-App Tab */}
            <TabsContent value="inapp" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : inAppData?.notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No in-app notifications found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or date range</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inAppData?.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedNotification({ ...notification, type: 'inapp' })}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-full ${notification.isRead ? 'bg-gray-100' : 'bg-orange-100'}`}>
                          <Bell className={`h-4 w-4 ${notification.isRead ? 'text-gray-600' : 'text-orange-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{notification.title}</p>
                            <Badge variant="outline" className="bg-purple-100 text-purple-800">
                              {notification.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {notification.userName || notification.userEmail || `User #${notification.userId}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(notification.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={notification.isRead ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"}>
                          {notification.isRead ? "Read" : "Unread"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pagination */}
            {currentData && currentData.total > limit && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, currentData.total)} of {currentData.total} notifications
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification?.type === 'email' ? (
                <Mail className="h-5 w-5 text-blue-600" />
              ) : (
                <Bell className="h-5 w-5 text-orange-600" />
              )}
              Notification Details
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.type === 'email' ? 'Email notification details and engagement tracking' : 'In-app notification details'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              {selectedNotification.type === 'email' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                      <p className="font-medium">{selectedNotification.recipientName || selectedNotification.clientName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{selectedNotification.recipientEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Status</p>
                      <DeliveryBadge 
                        status={selectedNotification.status} 
                        openedAt={selectedNotification.openedAt}
                        clickedAt={selectedNotification.clickedAt}
                        openCount={selectedNotification.openCount}
                        clickCount={selectedNotification.clickCount}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subject</p>
                    <p className="font-medium">{selectedNotification.subject}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <CategoryBadge category={selectedNotification.category} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p>{selectedNotification.notificationType?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  
                  {/* Engagement Timeline */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-3">Engagement Timeline</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Send className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Sent</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedNotification.sentAt 
                              ? format(new Date(selectedNotification.sentAt), "MMM d, yyyy h:mm:ss a")
                              : 'Not sent yet'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {selectedNotification.openedAt ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <MailOpen className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Opened{selectedNotification.openCount > 1 ? ` (${selectedNotification.openCount} times)` : ''}</p>
                            <p className="text-xs text-muted-foreground">
                              First opened {format(new Date(selectedNotification.openedAt), "MMM d, yyyy h:mm:ss a")}
                            </p>
                          </div>
                        </div>
                      ) : selectedNotification.trackingId ? (
                        <div className="flex items-center gap-3 opacity-40">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <MailOpen className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Not opened yet</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 opacity-40">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <MailOpen className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">No tracking (sent before tracking was enabled)</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedNotification.clickedAt ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <MousePointerClick className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Clicked{selectedNotification.clickCount > 1 ? ` (${selectedNotification.clickCount} times)` : ''}</p>
                            <p className="text-xs text-muted-foreground">
                              First clicked {format(new Date(selectedNotification.clickedAt), "MMM d, yyyy h:mm:ss a")}
                            </p>
                          </div>
                        </div>
                      ) : selectedNotification.trackingId ? (
                        <div className="flex items-center gap-3 opacity-40">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <MousePointerClick className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">No link clicks yet</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Triggered By</p>
                      <p className="capitalize">{selectedNotification.triggeredBy}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created At</p>
                      <p>{format(new Date(selectedNotification.createdAt), "MMM d, yyyy h:mm:ss a")}</p>
                    </div>
                  </div>
                  
                  {selectedNotification.previewText && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Preview</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedNotification.previewText}</p>
                    </div>
                  )}
                  
                  {selectedNotification.errorMessage && (
                    <div>
                      <p className="text-sm font-medium text-red-600">Error Message</p>
                      <p className="text-sm bg-red-50 text-red-800 p-3 rounded-lg">{selectedNotification.errorMessage}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                      <p className="font-medium">{selectedNotification.userName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{selectedNotification.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="outline" className={selectedNotification.isRead ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"}>
                        {selectedNotification.isRead ? "Read" : "Unread"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedNotification.title}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                      {selectedNotification.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  {selectedNotification.message && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Message</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedNotification.message}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p>{format(new Date(selectedNotification.createdAt), "MMM d, yyyy h:mm:ss a")}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
