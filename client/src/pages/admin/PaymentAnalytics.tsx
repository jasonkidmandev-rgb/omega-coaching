import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Users, CheckCircle, Clock, XCircle, RefreshCw, Receipt, Percent, Download, FileText, Calendar, Mail, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#ef4444"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PaymentAnalytics() {
  const now = new Date();
  const [exportMonth, setExportMonth] = useState(now.getMonth() + 1);
  const [exportYear, setExportYear] = useState(now.getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('omega@omegalongevity.com');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { data: trends, isLoading: trendsLoading } = trpc.paymentAnalytics.getTrends.useQuery({ days: 30 });
  const { data: methodBreakdown, isLoading: methodLoading } = trpc.paymentAnalytics.getMethodBreakdown.useQuery();
  const { data: revenueByProtocol, isLoading: protocolLoading } = trpc.paymentAnalytics.getRevenueByProtocol.useQuery();
  const { data: conversionMetrics, isLoading: conversionLoading } = trpc.paymentAnalytics.getConversionMetrics.useQuery();
  const { data: paymentStatus, isLoading: statusLoading } = trpc.paymentAnalytics.getPaymentStatusSummary.useQuery();
  const { data: feeSummary, isLoading: feeLoading } = trpc.paymentAnalytics.getFeeSummary.useQuery();

  const exportQuery = trpc.paymentAnalytics.exportFeeSummary.useQuery(
    { month: exportMonth, year: exportYear, format: "csv" },
    { enabled: false }
  );

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.data) {
        const blob = new Blob([result.data.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.data.filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Fee summary for ${MONTH_NAMES[exportMonth - 1]} ${exportYear} downloaded as CSV.`);
      } else {
        toast.info(`No payment data found for ${MONTH_NAMES[exportMonth - 1]} ${exportYear}.`);
      }
    } catch (error) {
      toast.error("Failed to export fee summary. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.rows && result.data.rows.length > 0) {
        // Build a printable HTML document for PDF
        const rows = result.data.rows;
        const totals = result.data.totals;
        const monthLabel = `${MONTH_NAMES[exportMonth - 1]} ${exportYear}`;
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Fee Summary - ${monthLabel}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
              h1 { color: #ea580c; font-size: 24px; margin-bottom: 5px; }
              h2 { color: #666; font-size: 14px; font-weight: normal; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th { background: #f97316; color: white; padding: 10px 8px; text-align: left; }
              th:nth-child(n+5) { text-align: right; }
              td { padding: 8px; border-bottom: 1px solid #eee; }
              td:nth-child(n+5) { text-align: right; }
              .totals td { font-weight: bold; border-top: 2px solid #333; background: #f9f9f9; }
              .fee { color: #dc2626; }
              .net { color: #2563eb; }
              .gross { color: #16a34a; }
              .summary { display: flex; gap: 30px; margin: 20px 0; }
              .summary-item { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
              .summary-label { font-size: 11px; color: #666; }
              .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
              .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
              @media print { body { margin: 20px; } }
            </style>
          </head>
          <body>
            <h1>Omega Longevity - Payment Fee Summary</h1>
            <h2>${monthLabel} | Generated ${new Date().toLocaleDateString()}</h2>
            
            <div class="summary">
              <div class="summary-item">
                <div class="summary-label">Gross Revenue</div>
                <div class="summary-value gross">$${totals?.totalGross || '0.00'}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Fees</div>
                <div class="summary-value fee">-$${totals?.totalFees || '0.00'}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Net Revenue</div>
                <div class="summary-value net">$${totals?.totalNet || '0.00'}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Transactions</div>
                <div class="summary-value">${totals?.transactionCount || 0}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Gross</th>
                  <th>Fee</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((r: any) => `
                  <tr>
                    <td>${r.date}</td>
                    <td>${r.clientName}</td>
                    <td>${r.paymentMethod}</td>
                    <td style="font-size:10px">${r.transactionId}</td>
                    <td class="gross">$${r.grossAmount}</td>
                    <td class="fee">-$${r.feeAmount}</td>
                    <td class="net">$${r.netAmount}</td>
                  </tr>
                `).join('')}
                <tr class="totals">
                  <td colspan="4">TOTALS</td>
                  <td class="gross">$${totals?.totalGross || '0.00'}</td>
                  <td class="fee">-$${totals?.totalFees || '0.00'}</td>
                  <td class="net">$${totals?.totalNet || '0.00'}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              Omega Longevity | PeptideCoach.Pro | Confidential Financial Report
            </div>
          </body>
          </html>
        `;

        // Open in new window for printing/saving as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          // Auto-trigger print dialog after a brief delay
          setTimeout(() => printWindow.print(), 500);
        }

        toast.success(`Use the print dialog to save as PDF. Fee summary for ${monthLabel}.`);
      } else {
        toast.info(`No payment data found for ${MONTH_NAMES[exportMonth - 1]} ${exportYear}.`);
      }
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = trendsLoading || methodLoading || protocolLoading || conversionLoading || statusLoading || feeLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </AdminLayout>
    );
  }

  // Prepare pie chart data for payment methods
  const methodChartData = methodBreakdown
    ? [
        { name: "Venmo", value: methodBreakdown.venmo.revenue, count: methodBreakdown.venmo.count },
        { name: "Other", value: methodBreakdown.other.revenue, count: methodBreakdown.other.count },
      ].filter((item) => item.value > 0)
    : [];

  // Prepare bar chart data for revenue by protocol
  const protocolChartData = revenueByProtocol?.slice(0, 10) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Analytics</h1>
          <p className="text-muted-foreground mt-1">Track revenue, conversion rates, and payment metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${conversionMetrics?.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {conversionMetrics?.paidProtocols} paid protocols</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionMetrics?.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{conversionMetrics?.paidProtocols} of {conversionMetrics?.totalProtocols} protocols</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${conversionMetrics?.averageOrderValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per paid protocol</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentStatus?.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paymentStatus?.paid}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{paymentStatus?.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{paymentStatus?.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refunded</CardTitle>
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{paymentStatus?.refunded}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends (30 Days)</CardTitle>
              <CardDescription>Daily revenue over the past month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#f97316" name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
              <CardDescription>Revenue by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={methodChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {methodChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Fee Export */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Monthly Fee Summary Export
            </CardTitle>
            <CardDescription>Download a detailed breakdown of all payment processing fees for tax/accounting purposes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Month</label>
                <Select value={String(exportMonth)} onValueChange={(v) => setExportMonth(Number(v))}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Year</label>
                <Select value={String(exportYear)} onValueChange={(v) => setExportYear(Number(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Export CSV
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                Export PDF
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              CSV includes: Date, Client Name, Payment Method, Transaction ID, Gross Amount, Fee Amount, Net Amount
            </p>

            {/* Email Delivery */}
            <div className="mt-4 pt-4 border-t border-orange-200">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-500" />
                Email Fee Summary
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground">Recipient Email</label>
                  <Input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="accounting@omegalongevity.com"
                    className="h-9"
                  />
                </div>
                <EmailSendButton
                  recipientEmail={emailRecipient}
                  month={exportMonth}
                  year={exportYear}
                  type="monthly"
                  label="Email Monthly"
                />
                <EmailSendButton
                  recipientEmail={emailRecipient}
                  year={exportYear}
                  type="annual"
                  label="Email Annual"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year-End Annual Summary */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Year-End Annual Fee Summary
            </CardTitle>
            <CardDescription>Aggregated monthly fee data for tax filing and annual reporting</CardDescription>
          </CardHeader>
          <CardContent>
            <AnnualSummarySection />
          </CardContent>
        </Card>

        {/* Processing Fee Summary */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" />
              Processing Fee Summary
            </CardTitle>
            <CardDescription>Payment processing fees across all transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold text-green-600">${feeSummary?.totalGross?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground">Total Fees Paid</p>
                <p className="text-2xl font-bold text-red-600">-${feeSummary?.totalFees?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground">Net Revenue</p>
                <p className="text-2xl font-bold text-blue-600">${feeSummary?.totalNet?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground">Avg Fee Rate</p>
                <p className="text-2xl font-bold text-amber-600">{feeSummary?.averageFeePercent?.toFixed(2) || '0.00'}%</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{feeSummary?.transactionCount || 0}</p>
              </div>
            </div>

            {/* Fee breakdown by payment method */}
            {feeSummary?.feesByMethod && Object.keys(feeSummary.feesByMethod).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Fees by Payment Method</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Method</th>
                        <th className="text-right py-2 px-3">Transactions</th>
                        <th className="text-right py-2 px-3">Gross</th>
                        <th className="text-right py-2 px-3">Fees</th>
                        <th className="text-right py-2 px-3">Net</th>
                        <th className="text-right py-2 px-3">Fee %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(feeSummary.feesByMethod).map(([method, data]: [string, any]) => (
                        <tr key={method} className="border-b">
                          <td className="py-2 px-3 font-medium capitalize">
                            {method === 'paypal' ? 'PayPal' : method === 'venmo' ? 'Venmo' : method === 'cc' ? 'Credit Card' : method}
                          </td>
                          <td className="text-right py-2 px-3">{data.count}</td>
                          <td className="text-right py-2 px-3 text-green-600">${data.gross.toFixed(2)}</td>
                          <td className="text-right py-2 px-3 text-red-600">-${data.fees.toFixed(2)}</td>
                          <td className="text-right py-2 px-3 text-blue-600">${data.net.toFixed(2)}</td>
                          <td className="text-right py-2 px-3 text-amber-600">{data.gross > 0 ? ((data.fees / data.gross) * 100).toFixed(2) : '0.00'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Protocol Type */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Protocol Type</CardTitle>
            <CardDescription>Top 10 protocols by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={protocolChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#f97316" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function AnnualSummarySection() {
  const now = new Date();
  const [annualYear, setAnnualYear] = useState(now.getFullYear());
  const [isExportingAnnual, setIsExportingAnnual] = useState(false);

  const { data: annualData, isLoading: annualLoading } = trpc.paymentAnalytics.getAnnualSummary.useQuery({ year: annualYear });

  const annualExportQuery = trpc.paymentAnalytics.exportAnnualSummary.useQuery(
    { year: annualYear },
    { enabled: false }
  );

  const handleExportAnnualCSV = async () => {
    setIsExportingAnnual(true);
    try {
      const result = await annualExportQuery.refetch();
      if (result.data?.data) {
        const blob = new Blob([result.data.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.data.filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Annual summary for ${annualYear} downloaded as CSV.`);
      } else {
        toast.info(`No payment data found for ${annualYear}.`);
      }
    } catch (error) {
      toast.error('Failed to export annual summary.');
    } finally {
      setIsExportingAnnual(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Year</label>
          <Select value={String(annualYear)} onValueChange={(v) => setAnnualYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleExportAnnualCSV}
          disabled={isExportingAnnual}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isExportingAnnual ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Export Annual CSV
        </Button>
      </div>

      {annualLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : annualData && annualData.months.length > 0 ? (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Gross Revenue</p>
              <p className="text-lg font-bold text-green-600">${annualData.totals.gross.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Fees</p>
              <p className="text-lg font-bold text-red-600">-${annualData.totals.fees.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Net Revenue</p>
              <p className="text-lg font-bold text-blue-600">${annualData.totals.net.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-lg font-bold text-purple-600">{annualData.totals.count}</p>
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-purple-50">
                  <th className="text-left py-2 px-3 font-medium">Month</th>
                  <th className="text-right py-2 px-3 font-medium">Transactions</th>
                  <th className="text-right py-2 px-3 font-medium text-green-700">Gross</th>
                  <th className="text-right py-2 px-3 font-medium text-red-700">Fees</th>
                  <th className="text-right py-2 px-3 font-medium text-blue-700">Net</th>
                  <th className="text-right py-2 px-3 font-medium">Fee %</th>
                </tr>
              </thead>
              <tbody>
                {annualData.months.map((m) => (
                  <tr key={m.month} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{m.name}</td>
                    <td className="text-right py-2 px-3">{m.count}</td>
                    <td className="text-right py-2 px-3 text-green-600">${m.gross.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 text-red-600">{m.fees > 0 ? `-$${m.fees.toFixed(2)}` : '$0.00'}</td>
                    <td className="text-right py-2 px-3 text-blue-600">${m.net.toFixed(2)}</td>
                    <td className="text-right py-2 px-3">{m.gross > 0 ? `${((m.fees / m.gross) * 100).toFixed(1)}%` : '-'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-purple-300 font-bold bg-purple-50">
                  <td className="py-2 px-3">TOTALS</td>
                  <td className="text-right py-2 px-3">{annualData.totals.count}</td>
                  <td className="text-right py-2 px-3 text-green-700">${annualData.totals.gross.toFixed(2)}</td>
                  <td className="text-right py-2 px-3 text-red-700">-${annualData.totals.fees.toFixed(2)}</td>
                  <td className="text-right py-2 px-3 text-blue-700">${annualData.totals.net.toFixed(2)}</td>
                  <td className="text-right py-2 px-3">{annualData.totals.gross > 0 ? `${((annualData.totals.fees / annualData.totals.gross) * 100).toFixed(1)}%` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No payment data for {annualYear}.</p>
      )}
    </div>
  );
}

function EmailSendButton({ recipientEmail, month, year, type, label }: {
  recipientEmail: string;
  month?: number;
  year: number;
  type: "monthly" | "annual";
  label: string;
}) {
  const [isSending, setIsSending] = useState(false);
  const emailMutation = trpc.paymentAnalytics.emailFeeSummary.useMutation();

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setIsSending(true);
    try {
      const result = await emailMutation.mutateAsync({
        recipientEmail,
        month: type === "monthly" ? month : undefined,
        year,
        type,
      });
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      onClick={handleSend}
      disabled={isSending || !recipientEmail}
      variant="outline"
      size="sm"
      className="border-blue-300 text-blue-700 hover:bg-blue-50"
    >
      {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}
