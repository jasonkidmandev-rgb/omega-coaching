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
import { Plus, Store, History, Trash2, Edit, Copy, Check, Percent, DollarSign, ShoppingCart, Users, BarChart3, TrendingUp, Tag } from "lucide-react";
import { format } from "date-fns";

export default function StorePromos() {
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
  const [minimumOrderAmount, setMinimumOrderAmount] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [oneTimePerUser, setOneTimePerUser] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  
  const utils = trpc.useUtils();
  const { data: promoCodes, isLoading } = trpc.storePromo.getAll.useQuery();
  const { data: usageHistory } = trpc.storePromo.getUsageHistory.useQuery({});
  const { data: analytics } = trpc.storePromo.getAnalytics.useQuery();
  
  const createMutation = trpc.storePromo.create.useMutation({
    onSuccess: () => {
      toast.success("Store promo code created successfully");
      setIsCreateOpen(false);
      resetForm();
      utils.storePromo.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.storePromo.update.useMutation({
    onSuccess: () => {
      toast.success("Store promo code updated successfully");
      setIsEditOpen(false);
      setSelectedCode(null);
      utils.storePromo.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.storePromo.delete.useMutation({
    onSuccess: () => {
      toast.success("Store promo code deleted successfully");
      utils.storePromo.getAll.invalidate();
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
    setMinimumOrderAmount("");
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
      minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : undefined,
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
      minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : null,
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
    setMinimumOrderAmount(codeData.minimumOrderAmount?.toString() || "");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Promo Codes</h1>
          <p className="text-slate-600">Manage discount codes for the Omega Store</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Store Promo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Store Promo Code</DialogTitle>
              <DialogDescription>
                Create a discount code for the Omega Store
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., SAVE20, FREESHIP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-slate-500">Case-insensitive. Customers enter this at checkout.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Sale, New Customer Discount"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Limited time offer"
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
                    placeholder={discountType === "percent" ? "e.g., 20" : "e.g., 10"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    min="0"
                    max={discountType === "percent" ? "100" : undefined}
                  />
                </div>
              </div>
              
              {/* Minimum Order Amount */}
              <div className="space-y-2">
                <Label htmlFor="minimumOrderAmount">Minimum Order Amount (optional)</Label>
                <Input
                  id="minimumOrderAmount"
                  type="number"
                  placeholder="e.g., 50 (no minimum if empty)"
                  value={minimumOrderAmount}
                  onChange={(e) => setMinimumOrderAmount(e.target.value)}
                  min="0"
                />
                <p className="text-xs text-slate-500">Leave empty for no minimum order requirement</p>
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
      
      {/* Info banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">How Store Promo Codes Work</h3>
              <p className="text-sm text-slate-600 mt-1">
                Store promo codes provide <strong>discounts</strong> on Omega Store purchases. 
                Customers enter a promo code during checkout to receive their discount. 
                You can set percentage or fixed-amount discounts, minimum order requirements, usage limits, and expiration dates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="codes" className="w-full">
        <TabsList>
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
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
              <CardTitle>Store Promo Codes</CardTitle>
              <CardDescription>
                {(promoCodes as any[])?.length || 0} promo code(s) configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
              ) : (promoCodes as any[])?.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No store promo codes yet</p>
                  <p className="text-sm text-slate-400">Create your first promo code to offer store discounts</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Min. Order</TableHead>
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
                            <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
                              {codeData.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(codeData.code, codeData.id)}
                            >
                              {copiedId === codeData.id ? (
                                <Check className="h-3 w-3 text-blue-500" />
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
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {formatDiscount(codeData.discountType, parseFloat(codeData.discountValue))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {codeData.minimumOrderAmount ? (
                            <span className="text-slate-600">${parseFloat(codeData.minimumOrderAmount).toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
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
                Recent store promo code usage (last 100 entries)
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
                      <TableHead>Order ID</TableHead>
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
                          <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
                            {usage.code}
                          </code>
                        </TableCell>
                        <TableCell>#{usage.orderId || "-"}</TableCell>
                        <TableCell>${parseFloat(usage.originalAmount).toFixed(2)}</TableCell>
                        <TableCell className="text-blue-600">-${parseFloat(usage.discountAmount).toFixed(2)}</TableCell>
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
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-full p-3">
                      <Tag className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Redemptions</p>
                      <p className="text-2xl font-bold">{analytics?.overallStats?.totalRedemptions || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 rounded-full p-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Revenue</p>
                      <p className="text-2xl font-bold">${(analytics?.overallStats?.totalRevenue || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 rounded-full p-3">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Discounts Given</p>
                      <p className="text-2xl font-bold">${(analytics?.overallStats?.totalDiscountGiven || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-full p-3">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Unique Users</p>
                      <p className="text-2xl font-bold">{analytics?.overallStats?.uniqueUsers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Top Performing Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Top Performing Promo Codes
                </CardTitle>
                <CardDescription>Ranked by total revenue generated</CardDescription>
              </CardHeader>
              <CardContent>
                {(analytics?.codes as any[])?.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No promo code data yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Redemptions</TableHead>
                        <TableHead>Unique Users</TableHead>
                        <TableHead>Discount Given</TableHead>
                        <TableHead>Revenue Generated</TableHead>
                        <TableHead>Last Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics?.codes as any[])
                        ?.filter((c: any) => parseFloat(c.totalRedemptions) > 0)
                        .sort((a: any, b: any) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue))
                        .slice(0, 10)
                        .map((codeData: any, index: number) => (
                          <TableRow key={codeData.id}>
                            <TableCell>
                              <Badge variant={index === 0 ? "default" : "outline"} className={index === 0 ? "bg-yellow-500" : ""}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
                                {codeData.code}
                              </code>
                            </TableCell>
                            <TableCell className="font-medium">{codeData.name}</TableCell>
                            <TableCell>{codeData.totalRedemptions}</TableCell>
                            <TableCell>{codeData.uniqueUsers}</TableCell>
                            <TableCell className="text-orange-600">
                              -${parseFloat(codeData.totalDiscountGiven || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              ${parseFloat(codeData.totalRevenue || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {codeData.lastUsedAt ? format(new Date(codeData.lastUsedAt), "MMM d, yyyy") : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* All Codes Performance */}
            <Card>
              <CardHeader>
                <CardTitle>All Promo Codes Performance</CardTitle>
                <CardDescription>Complete list of all promo codes with their metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Redemptions</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Avg. Discount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analytics?.codes as any[])?.map((codeData: any) => (
                      <TableRow key={codeData.id}>
                        <TableCell>
                          <div>
                            <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
                              {codeData.code}
                            </code>
                            <p className="text-xs text-slate-500 mt-1">{codeData.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={codeData.isActive ? "default" : "secondary"} className={codeData.isActive ? "bg-green-500" : ""}>
                            {codeData.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {codeData.discountType === "percent" 
                            ? `${codeData.discountValue}%` 
                            : `$${parseFloat(codeData.discountValue).toFixed(2)}`}
                        </TableCell>
                        <TableCell>{codeData.totalRedemptions || 0}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ${parseFloat(codeData.totalRevenue || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {codeData.totalRedemptions > 0 
                            ? `$${(parseFloat(codeData.totalDiscountGiven || 0) / codeData.totalRedemptions).toFixed(2)}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Store Promo Code</DialogTitle>
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
            
            <div className="space-y-2">
              <Label htmlFor="edit-minimumOrderAmount">Minimum Order Amount</Label>
              <Input
                id="edit-minimumOrderAmount"
                type="number"
                placeholder="No minimum"
                value={minimumOrderAmount}
                onChange={(e) => setMinimumOrderAmount(e.target.value)}
              />
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