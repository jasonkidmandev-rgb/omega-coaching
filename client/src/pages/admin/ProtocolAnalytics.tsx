import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Users, 
  FileText,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Target,
  Percent,
  DollarSign,
  Eye,
  EyeOff,
  UserX,
  Activity
} from "lucide-react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format, differenceInDays, subDays, parseISO } from "date-fns";

export default function ProtocolAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [renewDuration, setRenewDuration] = useState<number>(3);
  const [createProject, setCreateProject] = useState(false);

  const [, navigate] = useLocation();
  
  // Fetch all protocols
  const { data: protocols, isLoading, refetch } = trpc.clientProtocol.list.useQuery({ filter: 'all' });
  
  // Renew protocol mutation
  const renewMutation = trpc.clientProtocol.renewProtocol.useMutation({
    onSuccess: (data) => {
      toast.success(`Protocol Renewed: New protocol created for ${data.clientName}. Redirecting to edit...`);
      setRenewDialogOpen(false);
      refetch();
      // Navigate to the new protocol
      navigate(`/admin/clients/${data.id}?tab=protocol`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to renew protocol");
    },
  });
  
  const handleRenewClick = (protocol: any) => {
    setSelectedProtocol(protocol);
    setRenewDuration(protocol.durationMonths || 3);
    setCreateProject(false);
    setRenewDialogOpen(true);
  };
  
  const handleRenewConfirm = () => {
    if (!selectedProtocol) return;
    renewMutation.mutate({
      protocolId: selectedProtocol.id,
      durationMonths: renewDuration,
      alsoCreateClientProject: createProject,
    });
  };
  
  // Calculate analytics based on time range
  const analytics = useMemo(() => {
    if (!protocols) return null;
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = new Date(0); // All time
    }
    
    // Filter protocols by time range
    const filteredProtocols = protocols.filter((p: any) => {
      const createdAt = new Date(p.createdAt);
      return createdAt >= startDate;
    });
    
    // All-time protocols for comparison
    const allProtocols = protocols;
    
    // Status breakdown
    const statusCounts = {
      draft: filteredProtocols.filter((p: any) => p.status === 'draft').length,
      pending_approval: filteredProtocols.filter((p: any) => p.status === 'pending_approval').length,
      approved: filteredProtocols.filter((p: any) => p.status === 'approved').length,
      active: filteredProtocols.filter((p: any) => p.status === 'active').length,
      completed: filteredProtocols.filter((p: any) => p.status === 'completed').length,
    };
    
    // Calculate approval rate
    const sentProtocols = filteredProtocols.filter((p: any) => p.sentAt);
    const approvedProtocols = filteredProtocols.filter((p: any) => 
      p.status === 'approved' || p.status === 'active' || p.status === 'completed'
    );
    const approvalRate = sentProtocols.length > 0 
      ? (approvedProtocols.length / sentProtocols.length) * 100 
      : 0;
    
    // Calculate average time to approval
    const protocolsWithApproval = filteredProtocols.filter((p: any) => p.sentAt && p.approvedAt);
    const avgTimeToApproval = protocolsWithApproval.length > 0
      ? protocolsWithApproval.reduce((sum: number, p: any) => {
          const sent = new Date(p.sentAt);
          const approved = new Date(p.approvedAt);
          return sum + differenceInDays(approved, sent);
        }, 0) / protocolsWithApproval.length
      : 0;
    
    // Calculate completion rate
    const activeOrCompleted = allProtocols.filter((p: any) => 
      p.status === 'active' || p.status === 'completed'
    );
    const completedProtocols = allProtocols.filter((p: any) => p.status === 'completed');
    const completionRate = activeOrCompleted.length > 0
      ? (completedProtocols.length / activeOrCompleted.length) * 100
      : 0;
    
    // Payment status breakdown
    const paymentCounts = {
      pending: filteredProtocols.filter((p: any) => p.paymentStatus === 'pending').length,
      paid: filteredProtocols.filter((p: any) => p.paymentStatus === 'paid').length,
      failed: filteredProtocols.filter((p: any) => p.paymentStatus === 'failed').length,
      refunded: filteredProtocols.filter((p: any) => p.paymentStatus === 'refunded').length,
    };
    
    // Payment conversion rate
    const paymentConversionRate = filteredProtocols.length > 0
      ? (paymentCounts.paid / filteredProtocols.length) * 100
      : 0;
    
    // Duration breakdown
    const durationCounts = {
      '1': filteredProtocols.filter((p: any) => p.durationMonths === 1).length,
      '3': filteredProtocols.filter((p: any) => p.durationMonths === 3).length,
      '4': filteredProtocols.filter((p: any) => p.durationMonths === 4).length,
      '6': filteredProtocols.filter((p: any) => p.durationMonths === 6).length,
      '12': filteredProtocols.filter((p: any) => p.durationMonths === 12).length,
      'other': filteredProtocols.filter((p: any) => ![1, 3, 4, 6, 12].includes(p.durationMonths)).length,
    };
    
    // Protocols expiring soon (within 30 days)
    const expiringProtocols = allProtocols.filter((p: any) => {
      if (p.status !== 'active' && p.status !== 'approved') return false;
      const startDate = p.approvedAt || p.sentAt || p.createdAt;
      if (!startDate) return false;
      const expiration = new Date(startDate);
      expiration.setMonth(expiration.getMonth() + (p.durationMonths || 3));
      const daysUntilExpiration = differenceInDays(expiration, now);
      return daysUntilExpiration >= 0 && daysUntilExpiration <= 30;
    });
    
    // Protocols needing attention (pending approval for > 7 days)
    const needsAttention = allProtocols.filter((p: any) => {
      if (p.status !== 'pending_approval') return false;
      if (!p.sentAt) return false;
      const daysSinceSent = differenceInDays(now, new Date(p.sentAt));
      return daysSinceSent > 7;
    });
    
    // Daily/weekly trends
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayProtocols = protocols.filter((p: any) => 
        format(new Date(p.createdAt), 'yyyy-MM-dd') === dateStr
      );
      dailyTrends.push({
        date: format(date, 'EEE'),
        created: dayProtocols.length,
        approved: dayProtocols.filter((p: any) => p.approvedAt).length,
      });
    }
    
    return {
      total: filteredProtocols.length,
      statusCounts,
      approvalRate,
      avgTimeToApproval,
      completionRate,
      paymentCounts,
      paymentConversionRate,
      durationCounts,
      expiringProtocols,
      needsAttention,
      dailyTrends,
    };
  }, [protocols, timeRange]);
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }
  
  if (!analytics) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No protocol data available</p>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Protocol Analytics</h1>
            <p className="text-gray-500">Track approval rates, completion metrics, and protocol performance</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Protocols</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.statusCounts.active} active, {analytics.statusCounts.completed} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {analytics.approvalRate.toFixed(1)}%
                {analytics.approvalRate >= 70 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress value={analytics.approvalRate} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time to Approval</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.avgTimeToApproval.toFixed(1)} days
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From sent to approved
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Conversion</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {analytics.paymentConversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.paymentCounts.paid} paid of {analytics.total}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="status">Status Breakdown</TabsTrigger>
            <TabsTrigger value="engagement">Client Engagement</TabsTrigger>
            <TabsTrigger value="attention">Needs Attention</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Protocol Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.statusCounts).map(([status, count]) => {
                      const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                      const statusColors: Record<string, string> = {
                        draft: 'bg-gray-500',
                        pending_approval: 'bg-yellow-500',
                        approved: 'bg-blue-500',
                        active: 'bg-green-500',
                        completed: 'bg-purple-500',
                      };
                      const statusLabels: Record<string, string> = {
                        draft: 'Draft',
                        pending_approval: 'Pending Approval',
                        approved: 'Approved',
                        active: 'Active',
                        completed: 'Completed',
                      };
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{statusLabels[status]}</span>
                            <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${statusColors[status]} rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.paymentCounts).map(([status, count]) => {
                      const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                      const statusColors: Record<string, string> = {
                        pending: 'bg-yellow-500',
                        paid: 'bg-green-500',
                        failed: 'bg-red-500',
                        refunded: 'bg-gray-500',
                      };
                      const statusLabels: Record<string, string> = {
                        pending: 'Pending',
                        paid: 'Paid',
                        failed: 'Failed',
                        refunded: 'Refunded',
                      };
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{statusLabels[status]}</span>
                            <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${statusColors[status]} rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Duration Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Protocol Duration Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(analytics.durationCounts).map(([duration, count]) => {
                      const labels: Record<string, string> = {
                        '1': '1 mo',
                        '3': '3 mo',
                        '4': '4 mo',
                        '6': '6 mo',
                        '12': '12 mo',
                        'other': 'Other',
                      };
                      return (
                        <div key={duration} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-xs text-muted-foreground">{labels[duration]}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Weekly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    7-Day Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between h-32 gap-2">
                    {analytics.dailyTrends.map((day, index) => {
                      const maxValue = Math.max(...analytics.dailyTrends.map(d => d.created), 1);
                      const height = (day.created / maxValue) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                            <div 
                              className="absolute bottom-0 w-full bg-orange-500 rounded-t transition-all"
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{day.date}</span>
                          <span className="text-xs font-medium">{day.created}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Protocol Status Summary</CardTitle>
                <CardDescription>Detailed breakdown of all protocol statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <div className="text-3xl font-bold">{analytics.statusCounts.draft}</div>
                    <div className="text-sm text-muted-foreground">Draft</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <div className="text-3xl font-bold">{analytics.statusCounts.pending_approval}</div>
                    <div className="text-sm text-muted-foreground">Pending Approval</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-3xl font-bold">{analytics.statusCounts.approved}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-3xl font-bold">{analytics.statusCounts.active}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-3xl font-bold">{analytics.statusCounts.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="engagement" className="space-y-4">
            <EngagementTab />
          </TabsContent>
          
          <TabsContent value="attention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Protocols Needing Attention
                </CardTitle>
                <CardDescription>
                  Protocols pending approval for more than 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.needsAttention.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>All protocols are on track!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Sent Date</TableHead>
                        <TableHead>Days Waiting</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.needsAttention.map((protocol: any) => {
                        const daysSinceSent = differenceInDays(new Date(), new Date(protocol.sentAt));
                        return (
                          <TableRow key={protocol.id}>
                            <TableCell className="font-medium">{protocol.clientName}</TableCell>
                            <TableCell>{protocol.clientEmail || '-'}</TableCell>
                            <TableCell>{format(new Date(protocol.sentAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{daysSinceSent} days</Badge>
                            </TableCell>
                            <TableCell>{protocol.durationMonths} months</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="expiring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Protocols Expiring Soon
                </CardTitle>
                <CardDescription>
                  Active protocols expiring within the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.expiringProtocols.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No protocols expiring in the next 30 days</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.expiringProtocols.map((protocol: any) => {
                        const startDate = protocol.approvedAt || protocol.sentAt || protocol.createdAt;
                        const expiration = new Date(startDate);
                        expiration.setMonth(expiration.getMonth() + (protocol.durationMonths || 3));
                        const daysLeft = differenceInDays(expiration, new Date());
                        
                        return (
                          <TableRow key={protocol.id}>
                            <TableCell className="font-medium">{protocol.clientName}</TableCell>
                            <TableCell>{protocol.clientEmail || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={protocol.status === 'active' ? 'default' : 'secondary'}>
                                {protocol.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(startDate), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{format(expiration, 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 14 ? 'outline' : 'secondary'}
                              >
                                {daysLeft} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRenewClick(protocol)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Renew
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Renew Protocol Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Protocol</DialogTitle>
            <DialogDescription>
              Create a new protocol for {selectedProtocol?.clientName} with fresh dates. The current protocol will be marked as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Duration (months)</Label>
              <Select value={renewDuration.toString()} onValueChange={(v) => setRenewDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createProject"
                checked={createProject}
                onChange={(e) => setCreateProject(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="createProject">Also create a Client Project</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenewConfirm} disabled={renewMutation.isPending}>
              {renewMutation.isPending ? "Renewing..." : "Renew Protocol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Engagement Tab Component
function EngagementTab() {
  const { data: engagementStats, isLoading: statsLoading } = trpc.clientProtocol.getEngagementStats.useQuery();
  const { data: inactiveClients, isLoading: inactiveLoading } = trpc.clientProtocol.getInactiveClients.useQuery({ daysSinceLastView: 14 });
  const [, navigate] = useLocation();
  
  if (statsLoading || inactiveLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
          <p className="text-muted-foreground">Loading engagement data...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Engagement Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Protocols</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementStats?.totalActive || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total active protocols</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewed Last 7 Days</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{engagementStats?.viewedLast7Days || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {engagementStats?.totalActive ? ((engagementStats.viewedLast7Days / engagementStats.totalActive) * 100).toFixed(0) : 0}% of active clients
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Never Viewed</CardTitle>
            <EyeOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{engagementStats?.neverViewed || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Protocols never accessed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Views</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(engagementStats?.avgViewCount || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Views per protocol</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Inactive Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-orange-500" />
            Inactive Clients
          </CardTitle>
          <CardDescription>
            Clients who haven't viewed their protocol in the last 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!inactiveClients || inactiveClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All clients are actively engaged!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Viewed</TableHead>
                  <TableHead>Days Inactive</TableHead>
                  <TableHead>Total Views</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveClients.map((client: any) => {
                  const daysInactive = client.lastViewedAt 
                    ? differenceInDays(new Date(), new Date(client.lastViewedAt))
                    : 'Never';
                  return (
                    <TableRow key={client.id} className="bg-orange-50/50">
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell>{client.clientEmail || '-'}</TableCell>
                      <TableCell>
                        {client.lastViewedAt 
                          ? format(new Date(client.lastViewedAt), 'MMM d, yyyy')
                          : <Badge variant="destructive">Never</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeof daysInactive === 'number' && daysInactive > 30 ? 'destructive' : 'outline'}>
                          {daysInactive} {typeof daysInactive === 'number' ? 'days' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.viewCount || 0}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/clients/${client.id}?tab=protocol`)}
                        >
                          View Protocol
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
