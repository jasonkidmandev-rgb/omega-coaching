import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, FileText, Package, AlertTriangle, CheckCircle, 
  Clock, Eye, MessageSquare, TrendingUp, TrendingDown, RefreshCw,
  ChevronRight, User, Calendar
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { toast } from "sonner";

export default function OperationsDashboard() {
  
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch check-in stats
  const { data: checkinStats, isLoading: loadingCheckins, refetch: refetchCheckins } = 
    trpc.checkin.getStats.useQuery();
  
  // Fetch pending check-in reviews
  const { data: pendingReviews, isLoading: loadingPending, refetch: refetchPending } = 
    trpc.checkin.getPendingReviews.useQuery();
  
  // Fetch inventory stats
  const { data: inventoryStats, isLoading: loadingInventory, refetch: refetchInventory } = 
    trpc.clientInventory.getStats.useQuery();
  
  // Fetch low inventory items
  const { data: lowInventory, isLoading: loadingLowInventory, refetch: refetchLowInventory } = 
    trpc.clientInventory.getBulkLowInventory.useQuery();
  
  const handleRefreshAll = () => {
    refetchCheckins();
    refetchPending();
    refetchInventory();
    refetchLowInventory();
    toast.success("Dashboard data has been refreshed");
  };
  
  const getScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">N/A</Badge>;
    if (score <= 5) return <Badge variant="destructive">{score}/10</Badge>;
    if (score <= 7) return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">{score}/10</Badge>;
    return <Badge variant="secondary" className="bg-green-500/20 text-green-600">{score}/10</Badge>;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running_low':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">Running Low</Badge>;
      case 'out':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'half':
        return <Badge variant="outline">Half</Badge>;
      case 'full':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600">Full</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor client check-ins, documents, and inventory at a glance
          </p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Check-ins Awaiting Review */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loadingCheckins ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{checkinStats?.awaitingReview ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Check-ins need your attention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* This Week's Check-ins */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingCheckins ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {checkinStats?.submitted ?? 0}/{checkinStats?.enabledClients ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted / Enabled clients
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Low Inventory Alerts */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Inventory</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loadingInventory ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{inventoryStats?.runningLow ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Items running low across clients
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loadingInventory ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{inventoryStats?.out ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Items need immediate reorder
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checkins">
            Check-ins
            {(checkinStats?.awaitingReview ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {checkinStats?.awaitingReview}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory
            {((inventoryStats?.runningLow ?? 0) + (inventoryStats?.out ?? 0)) > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-yellow-500/20 text-yellow-600">
                {(inventoryStats?.runningLow ?? 0) + (inventoryStats?.out ?? 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pending Check-in Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Pending Check-in Reviews
                </CardTitle>
                <CardDescription>
                  Check-ins waiting for your review and feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {loadingPending ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : pendingReviews && pendingReviews.length > 0 ? (
                    <div className="space-y-3">
                      {pendingReviews.slice(0, 5).map((checkin) => (
                        <div 
                          key={checkin.id} 
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Client #{checkin.clientProtocolId}</p>
                              <p className="text-xs text-muted-foreground">
                                Submitted {checkin.submittedAt ? formatDistanceToNow(new Date(checkin.submittedAt), { addSuffix: true }) : 'recently'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getScoreBadge(checkin.overallScore)}
                            {checkin.hasLowScore && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <Link href={`/admin/clients/${checkin.clientProtocolId}/checkins/${checkin.id}`}>
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                      <p>All caught up!</p>
                      <p className="text-sm">No pending reviews</p>
                    </div>
                  )}
                </ScrollArea>
                {pendingReviews && pendingReviews.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/checkins">
                        View All ({pendingReviews.length})
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Inventory Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Low Inventory Alerts
                </CardTitle>
                <CardDescription>
                  Client items that need attention or reorder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {loadingLowInventory ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : lowInventory && lowInventory.length > 0 ? (
                    <div className="space-y-3">
                      {lowInventory.slice(0, 5).map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              item.status === 'out' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                            }`}>
                              <Package className={`h-5 w-5 ${
                                item.status === 'out' ? 'text-red-500' : 'text-yellow-500'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{item.itemName}</p>
                              <p className="text-xs text-muted-foreground">
                                Client #{item.clientProtocolId} • {item.itemCategory}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            <Link href={`/admin/clients/${item.clientProtocolId}/inventory`}>
                              <Button size="sm" variant="ghost">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                      <p>All stocked up!</p>
                      <p className="text-sm">No low inventory alerts</p>
                    </div>
                  )}
                </ScrollArea>
                {lowInventory && lowInventory.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/inventory-alerts">
                        View All ({lowInventory.length})
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Check-in Status</CardTitle>
              <CardDescription>
                Overview of all client check-ins for this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-600">{checkinStats?.reviewed ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-orange-500/10">
                  <div className="text-2xl font-bold text-orange-600">{checkinStats?.awaitingReview ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Awaiting Review</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-600">{checkinStats?.pending ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10">
                  <div className="text-2xl font-bold text-red-600">{checkinStats?.incomplete ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Incomplete</p>
                </div>
              </div>
              
              {/* Full pending reviews list */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3">All Pending Reviews</h3>
                <ScrollArea className="h-[400px]">
                  {loadingPending ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : pendingReviews && pendingReviews.length > 0 ? (
                    <div className="space-y-3">
                      {pendingReviews.map((checkin) => (
                        <div 
                          key={checkin.id} 
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Client #{checkin.clientProtocolId}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Submitted {checkin.submittedAt ? format(new Date(checkin.submittedAt), 'MMM d, yyyy h:mm a') : 'recently'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium">Overall Score</p>
                              {getScoreBadge(checkin.overallScore)}
                            </div>
                            {checkin.hasLowScore && (
                              <div className="flex items-center gap-1 text-red-500">
                                <AlertTriangle className="h-5 w-5" />
                                <span className="text-xs">Low</span>
                              </div>
                            )}
                            <Link href={`/admin/clients/${checkin.clientProtocolId}/checkins/${checkin.id}`}>
                              <Button size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <CheckCircle className="h-16 w-16 mb-4 text-green-500" />
                      <p className="text-lg font-medium">All caught up!</p>
                      <p className="text-sm">No check-ins pending review</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status Overview</CardTitle>
              <CardDescription>
                Client inventory levels across all protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-600">{inventoryStats?.full ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Full Stock</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-600">{inventoryStats?.half ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Half Stock</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                  <div className="text-2xl font-bold text-yellow-600">{inventoryStats?.runningLow ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Running Low</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10">
                  <div className="text-2xl font-bold text-red-600">{inventoryStats?.out ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                </div>
              </div>
              
              {/* All low inventory items */}
              <div>
                <h3 className="font-semibold mb-3">Items Needing Attention</h3>
                <ScrollArea className="h-[400px]">
                  {loadingLowInventory ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : lowInventory && lowInventory.length > 0 ? (
                    <div className="space-y-3">
                      {lowInventory.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                              item.status === 'out' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                            }`}>
                              <Package className={`h-6 w-6 ${
                                item.status === 'out' ? 'text-red-500' : 'text-yellow-500'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{item.itemName}</p>
                              <p className="text-sm text-muted-foreground">
                                Client #{item.clientProtocolId} • {item.itemCategory}
                              </p>
                              {item.lastUpdatedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Updated {formatDistanceToNow(new Date(item.lastUpdatedAt), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(item.status)}
                            <Link href={`/admin/clients/${item.clientProtocolId}/inventory`}>
                              <Button size="sm" variant="outline">
                                View Client
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <CheckCircle className="h-16 w-16 mb-4 text-green-500" />
                      <p className="text-lg font-medium">All stocked up!</p>
                      <p className="text-sm">No inventory items need attention</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}