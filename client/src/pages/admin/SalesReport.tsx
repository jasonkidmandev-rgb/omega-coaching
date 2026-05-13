import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  History,
  CheckCircle,
  XCircle,
  Mail,
  RefreshCcw,
  CreditCard,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Payment History Tab Component
function PaymentHistoryTab({ period, startDate, endDate }: { period: string; startDate: string; endDate: string }) {
  // Calculate date range based on period
  const getDateRange = () => {
    if (period === 'custom' && startDate && endDate) {
      // Ensure end date includes the full day (set to 23:59:59)
      const endDateFull = endDate.length <= 10 ? endDate + 'T23:59:59.999Z' : endDate;
      return { startDate, endDate: endDateFull };
    }
    if (period === 'all') return {};
    
    const end = new Date();
    const start = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    start.setDate(start.getDate() - days);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  const dateRange = getDateRange();
  const isCustomWithoutDates = period === 'custom' && (!startDate || !endDate);
  const { data: eventsData, isLoading, error, isFetching } = trpc.paymentEvents.getAll.useQuery({
    ...dateRange,
    limit: 100,
  }, {
    retry: 1, // Only retry once to avoid long loading stalls
    staleTime: 30000, // Cache for 30 seconds
    enabled: !isCustomWithoutDates,
  });

  const { data: stats } = trpc.paymentEvents.getStats.useQuery(dateRange, {
    retry: 1,
    staleTime: 30000,
    enabled: !isCustomWithoutDates,
  });
  const { data: protocols } = trpc.clientProtocol.list.useQuery(undefined, {
    retry: 1,
    staleTime: 60000, // Cache protocol list for 1 minute
  });

  // Create a map of protocol IDs to client names
  const protocolMap = protocols?.reduce((acc, p) => {
    acc[p.id] = { name: p.clientName, email: p.clientEmail };
    return acc;
  }, {} as Record<number, { name: string; email: string | null }>) || {};

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "payment_received":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "payment_failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "payment_due":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case "reminder_sent":
        return <Mail className="w-4 h-4 text-amber-500" />;
      case "payment_refunded":
        return <RefreshCcw className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "payment_received":
        return <Badge className="bg-green-500">Payment Received</Badge>;
      case "payment_failed":
        return <Badge variant="destructive">Payment Failed</Badge>;
      case "payment_due":
        return <Badge className="bg-blue-500">Payment Due</Badge>;
      case "reminder_sent":
        return <Badge className="bg-amber-500">Reminder Sent</Badge>;
      case "payment_refunded":
        return <Badge className="bg-purple-500">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  const formatEventDescription = (event: any) => {
    const client = protocolMap[event.clientProtocolId];
    const clientName = client?.name || `Protocol #${event.clientProtocolId}`;
    
    switch (event.eventType) {
      case "payment_received":
        return `${clientName} paid $${parseFloat(event.amount || event.grossAmount || "0").toFixed(2)} via ${event.paymentMethod || "unknown method"}`;
      case "payment_failed":
        return `Payment attempt failed for ${clientName}`;
      case "payment_due":
        return `Protocol approved for ${clientName} - payment now due`;
      case "reminder_sent":
        return `${event.reminderType || "Payment"} reminder sent to ${event.emailSentTo || clientName}`;
      case "payment_refunded":
        return `$${parseFloat(event.amount || event.grossAmount || "0").toFixed(2)} refunded to ${clientName}`;
      default:
        return `${event.eventType} for ${clientName}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${parseFloat(stats?.totalPaymentsReceived?.toString() || "0").toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.paymentsReceivedCount || 0} payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Reminders Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.eventCounts?.reminder_sent || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Failed Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.eventCounts?.payment_failed || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payments Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.eventCounts?.payment_due || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      {stats?.paymentMethods && stats.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {stats.paymentMethods.map((method: any) => (
                <div key={method.method || "unknown"} className="p-4 border rounded-lg">
                  <p className="font-medium capitalize">{method.method || "Unknown"}</p>
                  <p className="text-2xl font-bold">${parseFloat(method.total || "0").toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{method.count} transactions</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Payment Events
          </CardTitle>
          <CardDescription>
            {eventsData?.events?.length || 0} events in selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading payment history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Error loading payment history</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          ) : !eventsData?.events || eventsData.events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payment events found</p>
              <p className="text-sm">Payment events will appear here as they occur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsData.events.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {getEventIcon(event.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getEventBadge(event.eventType)}
                      {(event.amount || event.grossAmount) && (
                        <span className="font-semibold text-green-600">
                          ${parseFloat(event.amount || event.grossAmount || "0").toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">
                      {formatEventDescription(event)}
                    </p>
                    {event.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        Note: {event.notes}
                      </p>
                    )}
                    {event.transactionId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Transaction: {event.transactionId}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.createdAt), "MMM d, yyyy")}
                    <br />
                    {format(new Date(event.createdAt), "h:mm a")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesReport() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '365d' | 'all' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const utils = trpc.useUtils();
  // Disable query when custom range is selected but dates aren't filled in
  const isCustomWithoutDates = period === 'custom' && (!startDate || !endDate);
  const { data: report, isLoading } = trpc.inventory.getSalesReport.useQuery({
    period,
    startDate: period === 'custom' ? startDate : undefined,
    endDate: period === 'custom' ? endDate : undefined,
  }, {
    enabled: !isCustomWithoutDates,
  });
  const backfillMutation = trpc.inventory.backfillInventorySales.useMutation({
    onSuccess: (data) => {
      toast.success(data.message + ` (${data.transactionsCreated} transactions created)`);
      utils.inventory.getSalesReport.invalidate();
      utils.paymentEvents.getStats.invalidate();
      utils.paymentEvents.getAll.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to recalculate: ' + error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const periodLabels: Record<string, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '365d': 'Last Year',
    'all': 'All Time',
    'custom': 'Custom Range',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Sales Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Analyze inventory sales performance and trends
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
            >
              {backfillMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Recalculate
            </Button>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="365d">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Date Range */}
        {period === 'custom' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isCustomWithoutDates ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Please select both start and end dates to view the report.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.summary.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {periodLabels[period]}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.summary.totalItems}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {(report.summary as any).uniqueProducts || 0} products
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.summary.totalSales}</div>
                  <p className="text-xs text-muted-foreground">
                    Sale transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency((report.summary as any).averageOrderValue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per transaction
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="top-sellers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="top-sellers">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Top Sellers
                </TabsTrigger>
                <TabsTrigger value="slow-movers">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Slow Movers
                </TabsTrigger>
                <TabsTrigger value="categories">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  By Category
                </TabsTrigger>
                <TabsTrigger value="recent">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Sales
                </TabsTrigger>
                <TabsTrigger value="payments">
                  <History className="h-4 w-4 mr-2" />
                  Payment History
                </TabsTrigger>
              </TabsList>

              {/* Top Sellers Tab */}
              <TabsContent value="top-sellers">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                      Top Selling Products
                    </CardTitle>
                    <CardDescription>
                      Products with the highest sales volume in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.topSellers && report.topSellers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Rank</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Units Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-center">Transactions</TableHead>
                            <TableHead>Last Sale</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.topSellers?.map((item, index) => (
                            <TableRow key={item.itemId}>
                              <TableCell>
                                <Badge variant={index < 3 ? "default" : "secondary"}>
                                  #{index + 1}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{item.itemName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.categoryName}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-semibold text-green-600">
                                  {item.totalQuantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-center">{item.transactionCount}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDate(item.lastSaleDate)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No sales data for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Slow Movers Tab */}
              <TabsContent value="slow-movers">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDownRight className="h-5 w-5 text-orange-500" />
                      Slow Moving Products
                    </CardTitle>
                    <CardDescription>
                      Products with low or no sales - consider promotions or discontinuation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.slowMovers && report.slowMovers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Units Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-center">Current Stock</TableHead>
                            <TableHead>Last Sale</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.slowMovers?.map((item) => (
                            <TableRow key={item.itemId}>
                              <TableCell className="font-medium">{item.itemName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.categoryName}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={item.totalQuantity === 0 ? "text-red-500" : "text-orange-500"}>
                                  {item.totalQuantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-center">
                                {'currentStock' in item ? (item as any).currentStock : '-'}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {item.lastSaleDate ? formatDate(item.lastSaleDate) : (
                                  <Badge variant="destructive" className="text-xs">Never Sold</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>All products are selling well!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Category Breakdown Tab */}
              <TabsContent value="categories">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Sales by Category
                    </CardTitle>
                    <CardDescription>
                      Performance breakdown by product category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.categoryBreakdown.length > 0 ? (
                      <div className="space-y-4">
                        {report.categoryBreakdown.map((cat, index) => {
                          const maxRevenue = Math.max(...report.categoryBreakdown.map(c => c.totalRevenue));
                          const percentage = maxRevenue > 0 ? (cat.totalRevenue / maxRevenue) * 100 : 0;
                          return (
                            <div key={cat.category} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={index === 0 ? "default" : "secondary"}>
                                    #{index + 1}
                                  </Badge>
                                  <span className="font-medium">{cat.category}</span>
                                  <span className="text-sm text-muted-foreground">
                                    ({cat.itemCount} products)
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">{formatCurrency(cat.totalRevenue)}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {cat.totalQuantity} units
                                  </div>
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No category data for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment History Tab */}
              <TabsContent value="payments">
                <PaymentHistoryTab period={period} startDate={startDate} endDate={endDate} />
              </TabsContent>

              {/* Recent Sales Tab */}
              <TabsContent value="recent">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Recent Sales Transactions
                    </CardTitle>
                    <CardDescription>
                      Latest 50 sale transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.recentTransactions && report.recentTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.recentTransactions?.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-sm">
                                {new Date(tx.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell className="font-medium">{tx.itemName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{tx.categoryName}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="destructive">
                                  {tx.quantityChange}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {tx.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent transactions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Daily Trend Chart with Recharts */}
            {report.dailyTrend && report.dailyTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Daily Sales Trend
                  </CardTitle>
                  <CardDescription>
                    Revenue and units sold per day over the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={report.dailyTrend.slice(-30).map(day => ({
                          ...day,
                          displayDate: format(new Date(day.date), 'MMM d'),
                        }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="displayDate" 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number, name: string) => [
                            name === 'revenue' ? formatCurrency(value) : `${value} units`,
                            name === 'revenue' ? 'Revenue' : 'Units Sold'
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#f97316"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="quantity"
                          name="Units Sold"
                          stroke="#1e3a5f"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorUnits)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-muted-foreground">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#1e3a5f]" />
                      <span className="text-muted-foreground">Units Sold</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load sales report</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
