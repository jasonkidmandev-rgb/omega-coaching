import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mail, Bell, CheckCircle, XCircle, Clock, AlertTriangle, 
  RefreshCw, Filter, ChevronDown, ChevronUp, Package, 
  CreditCard, FileText, User, Calendar, Megaphone
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface NotificationHistoryTabProps {
  clientId: number;
  isSubTab?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  checkin: <Bell className="h-4 w-4" />,
  protocol: <FileText className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  shipping: <Package className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  welcome: <User className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
  digest: <Calendar className="h-4 w-4" />,
  other: <Mail className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  checkin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  protocol: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  payment: "bg-green-500/10 text-green-600 border-green-500/20",
  shipping: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  inventory: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  document: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  welcome: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  announcement: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  digest: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusIcons: Record<string, React.ReactNode> = {
  sent: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  bounced: <AlertTriangle className="h-4 w-4 text-orange-500" />,
};

export default function NotificationHistoryTab({ clientId, isSubTab = false }: NotificationHistoryTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Fetch notification history
  const { data: historyData, isLoading, refetch } = trpc.notificationHistory.getByClient.useQuery({
    clientProtocolId: clientId,
    category: categoryFilter !== "all" ? categoryFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: 100,
  });
  
  // Fetch stats
  const { data: stats } = trpc.notificationHistory.getStats.useQuery({
    clientProtocolId: clientId,
  });

  if (isLoading) {
    const loadingContent = (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
    if (isSubTab) return loadingContent;
    return <TabsContent value="notifications">{loadingContent}</TabsContent>;
  }

  const notifications = historyData?.notifications || [];

  const mainContent = (
    <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.byStatus?.sent || 0}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.byStatus?.failed || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.byCategory?.checkin || 0}</p>
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Notification History
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="checkin">Check-ins</SelectItem>
                  <SelectItem value="protocol">Protocol</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="announcement">Announcements</SelectItem>
                  <SelectItem value="digest">Digests</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
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
            </div>

            {/* Notification List */}
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No notifications found</p>
                <p className="text-sm">Automated emails to this client will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === notification.id ? null : notification.id)}
                    >
                      <div className="mt-1">
                        {statusIcons[notification.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${categoryColors[notification.category]}`}
                          >
                            {categoryIcons[notification.category]}
                            <span className="ml-1 capitalize">{notification.category}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {notification.notificationType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="font-medium text-sm mt-1 truncate">
                          {notification.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>To: {notification.recipientEmail}</span>
                          <span>•</span>
                          <span>
                            {notification.sentAt 
                              ? formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })
                              : 'Not sent'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedId === notification.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedId === notification.id && (
                      <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                        {notification.previewText && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                            <p className="text-muted-foreground">{notification.previewText}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Created:</span>{' '}
                            {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                          </div>
                          {notification.sentAt && (
                            <div>
                              <span className="text-muted-foreground">Sent:</span>{' '}
                              {format(new Date(notification.sentAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Triggered by:</span>{' '}
                            <span className="capitalize">{notification.triggeredBy}</span>
                          </div>
                          {notification.relatedEntityType && (
                            <div>
                              <span className="text-muted-foreground">Related:</span>{' '}
                              {notification.relatedEntityType} #{notification.relatedEntityId}
                            </div>
                          )}
                        </div>
                        {notification.errorMessage && (
                          <div className="p-2 bg-red-500/10 rounded text-red-600 text-xs">
                            <span className="font-medium">Error:</span> {notification.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination info */}
            {historyData && historyData.total > notifications.length && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Showing {notifications.length} of {historyData.total} notifications
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  );

  if (isSubTab) return mainContent;
  return <TabsContent value="notifications">{mainContent}</TabsContent>;
}
