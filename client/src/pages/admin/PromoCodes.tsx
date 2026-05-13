import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Ticket, History, Trash2, Edit, Copy, Check, Percent, DollarSign, Info, ArrowLeft, Users, BarChart3, TrendingUp, DollarSign as DollarIcon } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function PromoCodes() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [oneTimePerUser, setOneTimePerUser] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  
  const utils = trpc.useUtils();
  const { data: promoCodes, isLoading } = trpc.promoCode.getAll.useQuery();
  const { data: usageHistory } = trpc.promoCode.getUsageHistory.useQuery({});
  const { data: analytics } = trpc.promoCode.getAnalytics.useQuery();
  
  const createMutation = trpc.promoCode.create.useMutation({
    onSuccess: () => {
      toast.success("Promo code created successfully");
      setIsCreateOpen(false);
      resetForm();
      utils.promoCode.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.promoCode.update.useMutation({
    onSuccess: () => {
      toast.success("Promo code updated successfully");
      setIsEditOpen(false);
      setSelectedCode(null);
      utils.promoCode.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.promoCode.delete.useMutation({
    onSuccess: () => {
      toast.success("Promo code deleted successfully");
      utils.promoCode.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const resetForm = () => {
    setCode("");
    setName("");
    setDescription("");
    setDiscountType("percent");
    setDiscountValue("");
    setMaxUses("");
    setOneTimePerUser(true);
    setExpiresAt("");
    setStartsAt("");
  };
  
  const handleCreate = () => {
    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }
    
    createMutation.mutate({
      code,
      name,
      description: description || undefined,
      discountType,
      discountValue: parseFloat(discountValue),
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      oneTimePerUser,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    });
  };
  
  const handleUpdate = () => {
    if (!selectedCode) return;
    updateMutation.mutate({
      id: selectedCode.id,
      code,
      name,
      description: description || undefined,
      discountType,
      discountValue: parseFloat(discountValue),
      maxUses: maxUses ? parseInt(maxUses) : null,
      oneTimePerUser,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      isActive: selectedCode.isActive,
    });
  };
  
  const handleEdit = (codeData: any) => {
    setSelectedCode(codeData);
    setCode(codeData.code);
    setName(codeData.name);
    setDescription(codeData.description || "");
    setDiscountType(codeData.discountType);
    setDiscountValue(codeData.discountValue?.toString() || "");
    setMaxUses(codeData.maxUses?.toString() || "");
    setOneTimePerUser(codeData.oneTimePerUser);
    setStartsAt(codeData.startsAt ? format(new Date(codeData.startsAt), "yyyy-MM-dd") : "");
    setExpiresAt(codeData.expiresAt ? format(new Date(codeData.expiresAt), "yyyy-MM-dd") : "");
    setIsEditOpen(true);
  };
  
  const handleToggleActive = (codeData: any) => {
    updateMutation.mutate({
      id: codeData.id,
      isActive: !codeData.isActive,
    });
  };
  
  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const formatDiscount = (type: string, value: number) => {
    if (type === "percent") {
      return `${value}% off`;
    }
    return `$${value.toFixed(2)} off`;
  };
  
  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/access-codes">
              <Button variant="ghost" size="sm" className="gap-1 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Access Codes
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Promo Codes</h1>
          <p className="text-slate-600">Manage discount codes for the transformation program</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/promo-code-analytics">
            <Button variant="outline" className="gap-2">
              <Percent className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Promo Code</DialogTitle>
              <DialogDescription>
                Create a discount code for the transformation program
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., SAVE20, LAUNCH50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-slate-500">Case-insensitive. Clients will enter this at checkout.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Launch Special, Holiday Sale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Limited time offer for new clients"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v: "percent" | "fixed") => setDiscountType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent" textValue="Percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Percentage
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed" textValue="Fixed Amount">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Fixed Amount
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    {discountType === "percent" ? "Percentage Off" : "Amount Off ($)"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    placeholder={discountType === "percent" ? "e.g., 20" : "e.g., 100"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    min="0"
                    max={discountType === "percent" ? "100" : undefined}
                  />
                </div>
              </div>
              
              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max Uses (optional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    One-Time Per User
                    <Switch
                      checked={oneTimePerUser}
                      onCheckedChange={setOneTimePerUser}
                    />
                  </Label>
                  <p className="text-xs text-slate-500">
                    {oneTimePerUser ? "Each user can only use this code once" : "Users can use this code multiple times"}
                  </p>
                </div>
              </div>
              
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Start Date (optional)</Label>
                  <Input
                    id="startsAt"
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!code || !name || !discountValue || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Code"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Info banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Ticket className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">How Promo Codes Work</h3>
              <p className="text-sm text-slate-600 mt-1">
                Promo codes provide <strong>discounts</strong> on program purchases. They're separate from access codes 
                (which gate entry). Clients enter a promo code during checkout to receive their discount. 
                You can set percentage or fixed-amount discounts, usage limits, and expiration dates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="codes" className="w-full">
        <TabsList>
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Promo Codes
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Usage History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="codes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Promo Codes</CardTitle>
              <CardDescription>
                {(promoCodes as any[])?.length || 0} promo code(s) configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : (promoCodes as any[])?.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No promo codes yet</p>
                  <p className="text-sm text-slate-400">Create your first promo code to offer discounts</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(promoCodes as any[])?.map((codeData: any) => (
                      <TableRow key={codeData.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-sm">
                              {codeData.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(codeData.code, codeData.id)}
                            >
                              {copiedId === codeData.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{codeData.name}</p>
                            {codeData.description && (
                              <p className="text-xs text-slate-500">{codeData.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {formatDiscount(codeData.discountType, parseFloat(codeData.discountValue))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{codeData.usesCount || 0}</span>
                            {codeData.maxUses && (
                              <span className="text-slate-400">/ {codeData.maxUses}</span>
                            )}
                          </div>
                          {codeData.oneTimePerUser && (
                            <p className="text-xs text-slate-500">One-time per user</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {codeData.startsAt && (
                              <p className="text-slate-600">
                                From: {format(new Date(codeData.startsAt), "MMM d, yyyy")}
                              </p>
                            )}
                            {codeData.expiresAt ? (
                              <p className={new Date(codeData.expiresAt) < new Date() ? "text-red-500" : "text-slate-600"}>
                                Until: {format(new Date(codeData.expiresAt), "MMM d, yyyy")}
                              </p>
                            ) : (
                              <span className="text-slate-400">No expiration</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={codeData.isActive ? "default" : "secondary"}>
                            {codeData.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={codeData.isActive}
                              onCheckedChange={() => handleToggleActive(codeData)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(codeData)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this promo code?")) {
                                  deleteMutation.mutate({ id: codeData.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Recent promo code usage (last 100 entries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(usageHistory as any[])?.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No usage history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Original</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead>Used At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(usageHistory as any[])?.map((usage: any) => (
                      <TableRow key={usage.id}>
                        <TableCell>
                          <code className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-sm">
                            {usage.code}
                          </code>
                        </TableCell>
                        <TableCell>{usage.email || usage.userId || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            usage.tier === "elite" ? "border-purple-300 text-purple-700" :
                            usage.tier === "flagship" ? "border-orange-300 text-orange-700" :
                            usage.tier === "advanced" ? "border-indigo-300 text-indigo-700" :
                            usage.tier === "functional_health_elite" ? "border-teal-300 text-teal-700" :
                            usage.tier === "recovery" ? "border-green-300 text-green-700" :
                            usage.tier === "immunity" ? "border-cyan-300 text-cyan-700" :
                            usage.tier === "longevity" ? "border-rose-300 text-rose-700" :
                            usage.tier === "mitochondria" ? "border-amber-300 text-amber-700" :
                            "border-blue-300 text-blue-700"
                          }>
                            {(usage.tier || "unknown").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>${parseFloat(usage.originalAmount).toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">-${parseFloat(usage.discountAmount).toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${parseFloat(usage.finalAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(usage.usedAt), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-4">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Redemptions</CardDescription>
                  <CardTitle className="text-2xl">
                    {analytics?.overallStats?.totalRedemptions || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    ${parseFloat(analytics?.overallStats?.totalRevenue || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Discounts Given</CardDescription>
                  <CardTitle className="text-2xl text-orange-600">
                    ${parseFloat(analytics?.overallStats?.totalDiscountGiven || 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Unique Users</CardDescription>
                  <CardTitle className="text-2xl">
                    {analytics?.overallStats?.uniqueUsers || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
            
            {/* Tier Breakdown */}
            {analytics?.tierBreakdown && (analytics.tierBreakdown as any[]).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue by Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {(analytics.tierBreakdown as any[]).map((tier: any) => (
                      <div key={tier.tier} className="p-4 rounded-lg bg-slate-50">
                        <Badge variant="outline" className={
                          tier.tier === "elite" ? "border-purple-300 text-purple-700 mb-2" :
                          tier.tier === "flagship" ? "border-orange-300 text-orange-700 mb-2" :
                          tier.tier === "advanced" ? "border-indigo-300 text-indigo-700 mb-2" :
                          tier.tier === "functional_health_elite" ? "border-teal-300 text-teal-700 mb-2" :
                          tier.tier === "recovery" ? "border-green-300 text-green-700 mb-2" :
                          tier.tier === "immunity" ? "border-cyan-300 text-cyan-700 mb-2" :
                          tier.tier === "longevity" ? "border-rose-300 text-rose-700 mb-2" :
                          tier.tier === "mitochondria" ? "border-amber-300 text-amber-700 mb-2" :
                          "border-blue-300 text-blue-700 mb-2"
                        }>
                          {(tier.tier || "unknown").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </Badge>
                        <p className="text-2xl font-bold">${parseFloat(tier.totalRevenue || 0).toLocaleString()}</p>
                        <p className="text-sm text-slate-500">{tier.count} redemptions</p>
                        <p className="text-sm text-orange-600">-${parseFloat(tier.totalDiscount || 0).toLocaleString()} discounts</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Top Performing Codes */}
            {analytics?.topByRevenue && (analytics.topByRevenue as any[]).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Performing Promo Codes
                  </CardTitle>
                  <CardDescription>Ranked by total revenue generated</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Redemptions</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics.topByRevenue as any[]).map((code: any, index: number) => (
                        <TableRow key={code.code}>
                          <TableCell>
                            <Badge variant={index === 0 ? "default" : "outline"}>
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-sm">
                              {code.code}
                            </code>
                          </TableCell>
                          <TableCell>{code.name}</TableCell>
                          <TableCell>{code.redemptions}</TableCell>
                          <TableCell className="font-bold text-green-600">
                            ${parseFloat(code.totalRevenue || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            
            {/* No data message */}
            {(!analytics?.overallStats?.totalRedemptions || analytics.overallStats.totalRedemptions === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No analytics data yet</p>
                  <p className="text-sm text-slate-400">Data will appear once promo codes are used</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
            <DialogDescription>
              Update the promo code settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v: "percent" | "fixed") => setDiscountType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discountValue">
                  {discountType === "percent" ? "Percentage Off" : "Amount Off ($)"}
                </Label>
                <Input
                  id="edit-discountValue"
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-maxUses">Max Uses</Label>
                <Input
                  id="edit-maxUses"
                  type="number"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  One-Time Per User
                  <Switch
                    checked={oneTimePerUser}
                    onCheckedChange={setOneTimePerUser}
                  />
                </Label>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startsAt">Start Date</Label>
                <Input
                  id="edit-startsAt"
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expiresAt">Expiration Date</Label>
                <Input
                  id="edit-expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!code || !name || !discountValue || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}