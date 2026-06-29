import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  DollarSign, 
  Calendar, 
  Filter, 
  Download, 
  AlertCircle, 
  Search,
  TrendingUp,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Package,
  GraduationCap,
  FileText
} from "lucide-react";
import { PaymentExport } from "@/components/PaymentExport";
import { VenmoVerificationQueue } from "@/components/VenmoVerificationQueue";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function PaymentHistory() {
  const [, navigate] = useLocation();
  const [exportOpen, setExportOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [paymentType, setPaymentType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Fetch unified payment history
  const { data: historyData, isLoading } = trpc.paymentHistory.getHistory.useQuery({
    startDate,
    endDate,
    paymentMethod: paymentMethod === "all" ? undefined : (paymentMethod as any),
    paymentStatus: paymentStatus === "all" ? undefined : (paymentStatus as any),
    paymentType: paymentType === "all" ? undefined : (paymentType as any),
    searchQuery: searchQuery || undefined,
    limit,
    offset,
  });

  // Fetch payment summary
  const { data: summaryData } = trpc.paymentHistory.getSummary.useQuery();

  // Fetch pending followups
  const { data: pendingData } = trpc.paymentHistory.getPendingFollowups.useQuery({
    daysOverdue: 3,
  });

  // Fetch method breakdown
  const { data: methodData } = trpc.paymentHistory.getMethodBreakdown.useQuery();

  // Fetch monthly trends
  const { data: trendsData } = trpc.paymentHistory.getMonthlyTrends.useQuery();

  // Payment failover mode (resilient payment layer)
  const { data: paymentMode, refetch: refetchPaymentMode } = trpc.payment.getPaymentMode.useQuery();
  const setPaymentModeMutation = trpc.payment.setPaymentMode.useMutation({
    onSuccess: (r) => { toast.success(`Payment mode set to "${r.mode}"`); refetchPaymentMode(); },
    onError: (e) => toast.error(`Failed to set payment mode: ${e.message}`),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "refunded":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      case "refunded":
        return <RefreshCw className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "paypal":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      case "venmo":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800";
      case "cc":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "protocol":
        return "Protocol";
      case "coaching_fee":
        return "Coaching Fee";
      case "store_order":
        return "Store Order";
      default:
        return type;
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "protocol":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
      case "coaching_fee":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "store_order":
        return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case "protocol":
        return <FileText className="w-3 h-3" />;
      case "coaching_fee":
        return <GraduationCap className="w-3 h-3" />;
      case "store_order":
        return <Package className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPaymentMethod("all");
    setPaymentStatus("all");
    setPaymentType("all");
    setSearchQuery("");
    setOffset(0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
  };

  // Navigate to the right detail page based on payment type
  const handleViewPayment = (payment: any) => {
    if (payment.paymentType === "protocol") {
      navigate(`/admin/clients/${payment.sourceId}`);
    } else if (payment.paymentType === "coaching_fee") {
      navigate(`/admin/transformation`);
    } else if (payment.paymentType === "store_order") {
      navigate(`/admin/store/orders`);
    }
  };

  // Calculate month-over-month change for revenue
  const revenueChange = summaryData?.data 
    ? summaryData.data.currentMonthRevenue - summaryData.data.previousMonthRevenue 
    : 0;
  const revenueChangePercent = summaryData?.data?.previousMonthRevenue 
    ? Math.round((revenueChange / summaryData.data.previousMonthRevenue) * 100) 
    : 0;

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">All payments across protocols, coaching fees, and store orders</p>
        </div>
        <Button onClick={() => setExportOpen(true)} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Payment Mode — failover switch */}
      <Card className={paymentMode?.mode === "manual" ? "border-amber-500/50 bg-amber-50 dark:bg-amber-900/10" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Mode
          </CardTitle>
          <CardDescription>
            Which payment methods clients are offered. Switch to <strong>Manual only</strong> if Stripe is
            unavailable — clients pay via Venmo/PayPal and you record it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {(["both", "stripe", "manual"] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={paymentMode?.mode === m ? "default" : "outline"}
                disabled={setPaymentModeMutation.isPending || paymentMode?.mode === m}
                onClick={() => setPaymentModeMutation.mutate({ mode: m })}
              >
                {m === "both" ? "Stripe + Manual" : m === "stripe" ? "Stripe only" : "Manual only"}
              </Button>
            ))}
            {paymentMode?.mode === "manual" && (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Failover active</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Venmo Verification Queue */}
      <VenmoVerificationQueue />

      {/* Revenue Summary Cards */}
      {summaryData?.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(summaryData.data.totalRevenue || 0)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                From {summaryData.data.paidPayments} paid transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {formatCurrency(summaryData.data.currentMonthRevenue || 0)}
              </div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatCurrency(Math.abs(revenueChange))} ({revenueChangePercent > 0 ? '+' : ''}{revenueChangePercent}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {formatCurrency(summaryData.data.thisWeekRevenue || 0)}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                {summaryData.data.thisWeekPaid} payments
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Avg Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {formatCurrency(summaryData.data.averageOrderValue || 0)}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                {summaryData.data.conversionRate}% conversion rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Status & Type Summary */}
      {summaryData?.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.data.totalProtocols}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {summaryData.data.paidPayments}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {summaryData.data.pendingPayments}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {summaryData.data.failedPayments}
              </div>
            </CardContent>
          </Card>

          {/* Payment Type Breakdown */}
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Protocols
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {(summaryData.data as any).protocolCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Coaching Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {(summaryData.data as any).coachingFeeCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Store Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                {(summaryData.data as any).storeOrderCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {summaryData.data.refundedPayments}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Method Breakdown with Revenue */}
      {methodData?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Revenue by Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency((methodData.data as any).paypal?.revenue || 0)}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-500">PayPal (Legacy)</div>
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  {(methodData.data as any).paypal?.count || 0} payments
                </div>
              </div>
              <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
                  {formatCurrency((methodData.data as any).venmo?.revenue || 0)}
                </div>
                <div className="text-sm text-cyan-600 dark:text-cyan-500">Venmo</div>
                <div className="text-xs text-cyan-500 dark:text-cyan-400 mt-1">
                  {(methodData.data as any).venmo?.count || 0} payments
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency((methodData.data as any).cc?.revenue || 0)}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-500">Credit Card</div>
                <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  {(methodData.data as any).cc?.count || 0} payments
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {formatCurrency((methodData.data as any).other?.revenue || 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-500">Other</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(methodData.data as any).other?.count || 0} payments
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Revenue Trends */}
      {trendsData?.data && trendsData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Revenue Trends (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {trendsData.data.map((month, index) => {
                const maxRevenue = Math.max(...trendsData.data.map(m => m.revenue || 0), 1);
                const height = ((month.revenue || 0) / maxRevenue) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(month.revenue || 0)}
                    </div>
                    <div className="text-xs text-gray-500">{month.count} orders</div>
                    <div 
                      className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-md transition-all duration-300"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400">{month.month}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Followups Alert */}
      {pendingData?.data && pendingData.data.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              Payments Pending Follow-up
            </CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-500">
              {pendingData.data.length} payment(s) overdue for 3+ days - 
              {formatCurrency(pendingData.data.reduce((sum, p) => sum + (p.amount || 0), 0))} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingData.data.slice(0, 5).map((payment) => (
                <div key={payment.unifiedId || payment.id} className="flex justify-between items-center text-sm text-yellow-900 dark:text-yellow-400">
                  <div className="flex items-center gap-2">
                    <span>{payment.clientName}</span>
                    {(payment as any).paymentType && (
                      <Badge className={`${getPaymentTypeColor((payment as any).paymentType)} border text-xs`}>
                        {getPaymentTypeLabel((payment as any).paymentType)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatCurrency(payment.amount || 0)}</span>
                    <span className="text-yellow-700 dark:text-yellow-500">{payment.daysOverdue} days overdue</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Search Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate ? startDate.toISOString().split("T")[0] : ""}
                  onChange={(e) =>
                    setStartDate(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate ? endDate.toISOString().split("T")[0] : ""}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="cc">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Type</label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="protocol">Protocol</SelectItem>
                    <SelectItem value="coaching_fee">Coaching Fee</SelectItem>
                    <SelectItem value="store_order">Store Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" onClick={handleReset} variant="outline">
                Reset Filters
              </Button>
              <Button type="submit">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            Showing {historyData?.data?.length || 0} of {historyData?.total || 0} payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading payments...</div>
          ) : historyData?.data && historyData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.data.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.clientName}</div>
                          <div className="text-xs text-gray-500">{payment.clientEmail || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPaymentTypeColor(payment.paymentType)} border flex items-center gap-1 w-fit`}>
                          {getPaymentTypeIcon(payment.paymentType)}
                          {getPaymentTypeLabel(payment.paymentType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                        {payment.details}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {payment.amount ? formatCurrency(payment.amount) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 text-sm">
                        {payment.feeAmount ? `-$${parseFloat(payment.feeAmount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {payment.netAmount ? `$${parseFloat(payment.netAmount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getMethodColor(payment.paymentMethod || "other")} border`}>
                          {(payment.paymentMethod || "other").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(payment.paymentStatus || "pending")} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(payment.paymentStatus || "pending")}
                          {(payment.paymentStatus || "pending").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.paymentDate
                          ? toLocaleDateStringMT(payment.paymentDate, { year: 'numeric', month: 'numeric', day: 'numeric' })
                          : payment.createdAt
                          ? toLocaleDateStringMT(payment.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewPayment(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No payments found</div>
          )}

          {/* Pagination */}
          {historyData && historyData.total > limit && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {Math.floor(offset / limit) + 1} of{" "}
                {Math.ceil(historyData.total / limit)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={offset + limit >= historyData.total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Export Dialog */}
      <PaymentExport open={exportOpen} onOpenChange={setExportOpen} />
    </div>
    </AdminLayout>
  );
}
