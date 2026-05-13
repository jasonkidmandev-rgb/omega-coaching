import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ExternalLink, MousePointerClick, TrendingUp, Package, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function AffiliateAnalytics() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.affiliate.stats.useQuery();

  const totalClicks = stats?.reduce((sum: number, s: { clickCount: number }) => sum + s.clickCount, 0) || 0;
  const topProduct = stats?.[0];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Affiliate Analytics</h1>
            <p className="text-muted-foreground">
              Track which product links your clients are engaging with most
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks}</div>
              <p className="text-xs text-muted-foreground">
                All-time affiliate link clicks
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Product</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {topProduct?.itemName || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {topProduct ? `${topProduct.clickCount} clicks` : "No data yet"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Products with click data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Click Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Product Click Leaderboard
            </CardTitle>
            <CardDescription>
              Products ranked by client engagement (affiliate link clicks)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !stats || stats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MousePointerClick className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No affiliate link clicks recorded yet</p>
                <p className="text-sm">Clicks will appear here when clients interact with product links</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat: { protocolItemId: number; clickCount: number; itemName: string; itemType: string; affiliateUrl?: string | null }, index: number) => (
                    <TableRow key={stat.protocolItemId}>
                      <TableCell>
                        <Badge 
                          variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}
                          className={index === 0 ? "bg-amber-500 hover:bg-amber-600" : ""}
                        >
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{stat.itemName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {stat.itemType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {stat.clickCount}
                      </TableCell>
                      <TableCell>
                        {stat.affiliateUrl && (
                          <a 
                            href={stat.affiliateUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
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