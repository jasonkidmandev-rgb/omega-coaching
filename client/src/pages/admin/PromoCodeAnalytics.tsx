import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, DollarSign, Users, Percent, Tag, Calendar, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PromoCodeAnalytics() {
  const [, setLocation] = useLocation();
  const { data: analytics, isLoading } = trpc.promoCode.getAnalytics.useQuery();

  const formatCurrency = (amount: number | string | null) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const stats = analytics?.overallStats || {};
  const codes = analytics?.codes || [];
  const tierBreakdown = analytics?.tierBreakdown || [];
  const topByRevenue = analytics?.topByRevenue || [];

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => goBackTo("/admin/promo-codes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promo Code Analytics</h1>
            <p className="text-gray-500">Track promo code performance and conversions</p>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRedemptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.uniqueCodesUsed || 0} unique codes used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From promo code purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts Given</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDiscountGiven)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(stats.avgDiscount)} per use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Used promo codes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Tier
            </CardTitle>
            <CardDescription>How promo codes are used across different tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {tierBreakdown.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-4">
                {tierBreakdown.map((tier: any) => {
                  const tierLabels: Record<string, string> = {
                    elite: 'Elite ($10,000)',
                    flagship: 'Flagship ($2,500)',
                    essentials: 'Essentials ($1,000)',
                  };
                  const tierColors: Record<string, string> = {
                    elite: 'bg-purple-500',
                    flagship: 'bg-amber-500',
                    essentials: 'bg-blue-500',
                  };
                  const maxRevenue = Math.max(...tierBreakdown.map((t: any) => parseFloat(t.totalRevenue) || 0));
                  const percentage = maxRevenue > 0 ? ((parseFloat(tier.totalRevenue) || 0) / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={tier.tier} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{tierLabels[tier.tier] || tier.tier}</span>
                        <span className="text-gray-500">{tier.count} redemptions</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${tierColors[tier.tier] || 'bg-gray-400'} rounded-full`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-24 text-right">
                          {formatCurrency(tier.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Codes
            </CardTitle>
            <CardDescription>Codes generating the most revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {topByRevenue.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topByRevenue.slice(0, 5).map((code: any, index: number) => (
                  <div key={code.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{code.code}</p>
                        <p className="text-xs text-gray-500">{code.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(code.totalRevenue)}</p>
                      <p className="text-xs text-gray-500">{code.redemptions} uses</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes Performance</CardTitle>
          <CardDescription>Detailed breakdown of each promo code</CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No promo codes created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-center">Redemptions</TableHead>
                  <TableHead className="text-right">Discount Given</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code: any) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-medium">{code.code}</TableCell>
                    <TableCell>{code.name}</TableCell>
                    <TableCell>
                      {code.discountType === 'percent' 
                        ? `${code.discountValue}%` 
                        : formatCurrency(code.discountValue)
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={parseInt(code.totalRedemptions) > 0 ? "default" : "secondary"}>
                        {code.totalRedemptions}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(code.totalDiscountGiven)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(code.totalRevenue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.isActive ? "default" : "secondary"}>
                        {code.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatDate(code.lastUsedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}