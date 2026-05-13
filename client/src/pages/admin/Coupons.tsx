import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Pencil, Trash2, AlertTriangle, Ticket, Copy, Check, BarChart3, Users, DollarSign, TrendingUp, Package, Clock, Tag, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";

export default function AdminCoupons() {
  const { data: coupons, isLoading, refetch } = trpc.coupon.list.useQuery();
  const { data: flaggedCoupons } = trpc.coupon.flagged.useQuery();
  const { data: clients } = trpc.clientProtocol.list.useQuery();
  const { data: analytics, refetch: refetchAnalytics } = trpc.coupon.analytics.useQuery();
  const { data: categories } = trpc.coupon.categories.useQuery();
  const { data: expiringSoon } = trpc.coupon.expiringSoon.useQuery({ days: 3 });
  const { data: usageTrends } = trpc.coupon.usageTrends.useQuery({ days: 30 });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("coupons");
  
  // Bulk generation state
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkDiscount, setBulkDiscount] = useState(10);
  const [bulkUsageType, setBulkUsageType] = useState<"one_time" | "unlimited">("one_time");
  const [bulkScope, setBulkScope] = useState<"universal" | "client_specific">("universal");
  const [bulkExpires, setBulkExpires] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  
  // Form state
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [usageType, setUsageType] = useState<"one_time" | "unlimited">("unlimited");
  const [scope, setScope] = useState<"universal" | "client_specific">("universal");
  const [clientProtocolId, setClientProtocolId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [selectedCoupons, setSelectedCoupons] = useState<number[]>([]);

  // Scroll position preservation
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  useEffect(() => {
    if (shouldRestoreScroll.current && savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  });

  const saveScrollPosition = () => {
    savedScrollPosition.current = window.scrollY;
    shouldRestoreScroll.current = true;
  };

  const createMutation = trpc.coupon.create.useMutation({
    onSuccess: () => {
      toast.success("Coupon created successfully");
      setIsCreateOpen(false);
      resetForm();
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.coupon.update.useMutation({
    onSuccess: () => {
      toast.success("Coupon updated successfully");
      setIsEditOpen(false);
      setEditingCoupon(null);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.coupon.delete.useMutation({
    onSuccess: () => {
      toast.success("Coupon deleted");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkDeleteMutation = trpc.coupon.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} coupon(s) deleted`);
      setSelectedCoupons([]);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSelectCoupon = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedCoupons(prev => [...prev, id]);
    } else {
      setSelectedCoupons(prev => prev.filter(cid => cid !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && coupons) {
      setSelectedCoupons(coupons.map(c => c.id));
    } else {
      setSelectedCoupons([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedCoupons.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedCoupons.length} coupon(s)? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate({ ids: selectedCoupons });
    }
  };

  const deactivateMutation = trpc.coupon.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Coupon deactivated");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkCreateMutation = trpc.coupon.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Created ${data.length} coupon codes successfully`);
      setIsBulkOpen(false);
      resetBulkForm();
      saveScrollPosition();
      refetch();
      refetchAnalytics();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const autoDeactivateMutation = trpc.coupon.autoDeactivate.useMutation({
    onSuccess: (data) => {
      if (data.deactivated.length > 0) {
        toast.success(`Auto-deactivated ${data.deactivated.length} coupon(s)`);
        saveScrollPosition();
        refetch();
        refetchAnalytics();
      } else {
        toast.info("No coupons needed deactivation");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetBulkForm = () => {
    setBulkPrefix("");
    setBulkCount(10);
    setBulkDiscount(10);
    setBulkUsageType("one_time");
    setBulkScope("universal");
    setBulkExpires("");
    setBulkNotes("");
  };

  const handleBulkCreate = () => {
    if (bulkDiscount > 35) {
      toast.error("Maximum discount is 35%");
      return;
    }
    if (!bulkPrefix || bulkPrefix.length < 2) {
      toast.error("Prefix must be at least 2 characters");
      return;
    }
    
    bulkCreateMutation.mutate({
      prefix: bulkPrefix.toUpperCase(),
      count: bulkCount,
      discountPercent: bulkDiscount,
      usageType: bulkUsageType,
      scope: bulkScope,
      expiresAt: bulkExpires || null,
      notes: bulkNotes || null,
    });
  };

  const resetForm = () => {
    setCode("");
    setDiscountPercent("10");
    setUsageType("unlimited");
    setScope("universal");
    setClientProtocolId(null);
    setExpiresAt("");
    setMaxUses(null);
    setNotes("");
    setCategory("");
  };

  const handleCreate = () => {
    const discount = parseFloat(discountPercent);
    if (discount > 35) {
      toast.error("Maximum discount is 35%");
      return;
    }
    
    createMutation.mutate({
      code: code.toUpperCase(),
      discountPercent,
      usageType,
      scope,
      clientProtocolId: scope === "client_specific" ? clientProtocolId : null,
      expiresAt: expiresAt || null,
      maxUses,
      notes: notes || null,
      category: category || null,
    });
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountPercent(coupon.discountPercent);
    setUsageType(coupon.usageType);
    setScope(coupon.scope);
    setClientProtocolId(coupon.clientProtocolId);
    setExpiresAt(coupon.expiresAt ? format(new Date(coupon.expiresAt), "yyyy-MM-dd") : "");
    setMaxUses(coupon.maxUses);
    setNotes(coupon.notes || "");
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingCoupon) return;
    
    const discount = parseFloat(discountPercent);
    if (discount > 35) {
      toast.error("Maximum discount is 35%");
      return;
    }
    
    updateMutation.mutate({
      id: editingCoupon.id,
      code: code.toUpperCase(),
      discountPercent,
      usageType,
      scope,
      clientProtocolId: scope === "client_specific" ? clientProtocolId : null,
      expiresAt: expiresAt || null,
      maxUses,
      notes: notes || null,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Coupon code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const filteredCoupons = filterCategory 
    ? coupons?.filter(c => c.category === filterCategory) 
    : coupons;
  const activeCoupons = filteredCoupons?.filter(c => c.isActive) || [];
  const inactiveCoupons = filteredCoupons?.filter(c => !c.isActive) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Coupon Codes</h1>
            <p className="text-muted-foreground">
              Create and manage discount codes for client protocols
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { resetBulkForm(); setIsBulkOpen(true); }}>
                  <Package className="mr-2 h-4 w-4" />
                  Bulk Generate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bulk Generate Coupons</DialogTitle>
                  <DialogDescription>
                    Create multiple unique coupon codes at once
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code Prefix</Label>
                    <Input
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                      placeholder="PROMO"
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">Codes will be: {bulkPrefix || "PROMO"}XXXXXX</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Number of Codes</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Discount Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="35"
                        value={bulkDiscount}
                        onChange={(e) => setBulkDiscount(parseInt(e.target.value) || 1)}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    {bulkDiscount > 20 && (
                      <p className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Discounts over 20% will be flagged
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Usage Type</Label>
                    <Select value={bulkUsageType} onValueChange={(v: "one_time" | "unlimited") => setBulkUsageType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-Time Use (per code)</SelectItem>
                        <SelectItem value="unlimited">Unlimited Uses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Expiration Date (optional)</Label>
                    <Input
                      type="date"
                      value={bulkExpires}
                      onChange={(e) => setBulkExpires(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={bulkNotes}
                      onChange={(e) => setBulkNotes(e.target.value)}
                      placeholder="e.g., Event promotion codes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkCreate} 
                    disabled={!bulkPrefix || bulkCreateMutation.isPending || bulkDiscount > 35}
                  >
                    {bulkCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate {bulkCount} Codes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Coupon Code</DialogTitle>
                <DialogDescription>
                  Create a new discount code for client protocols
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="SUMMER20"
                      className="uppercase"
                    />
                    <Button variant="outline" onClick={generateRandomCode} type="button">
                      Generate
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="35"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  {parseFloat(discountPercent) > 20 && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Discounts over 20% will be flagged for review
                    </p>
                  )}
                  {parseFloat(discountPercent) > 35 && (
                    <p className="text-sm text-red-600">Maximum discount is 35%</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Usage Type</Label>
                  <Select value={usageType} onValueChange={(v: "one_time" | "unlimited") => setUsageType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlimited">Unlimited Uses</SelectItem>
                      <SelectItem value="one_time">One-Time Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {usageType === "unlimited" && (
                  <div className="space-y-2">
                    <Label>Max Uses (optional)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={maxUses || ""}
                      onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={scope} onValueChange={(v: "universal" | "client_specific") => setScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="universal">Universal (All Clients)</SelectItem>
                      <SelectItem value="client_specific">Client-Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {scope === "client_specific" && (
                  <div className="space-y-2">
                    <Label>Select Client</Label>
                    <Select 
                      value={clientProtocolId?.toString() || ""} 
                      onValueChange={(v) => setClientProtocolId(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.clientName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Expiration Date (optional)</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Category (optional)</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Summer Sale, VIP, Launch"
                  />
                  <p className="text-xs text-muted-foreground">Group coupons by campaign or event</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes about this coupon..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!code || createMutation.isPending || parseFloat(discountPercent) > 35}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Coupon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coupons?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {activeCoupons.length} active, {inactiveCoupons.length} inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalUsages || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all coupons
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(analytics?.totalSavings || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Discounts given to clients
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged Coupons</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{flaggedCoupons?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Discounts over 20%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Coupons */}
        {analytics?.coupons && analytics.coupons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Performing Coupons
              </CardTitle>
              <CardDescription>Coupons ranked by usage and savings generated</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Total Savings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.coupons.slice(0, 5).map((coupon: any) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <code className="font-mono font-medium">{coupon.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(coupon.discountPercent) > 20 ? "destructive" : "secondary"}>
                          {coupon.discountPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell>{coupon.usageCount}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${coupon.totalSavings.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "outline"}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Expiring Soon Alert */}
        {expiringSoon && expiringSoon.length > 0 && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Expiring Soon ({expiringSoon.length})
              </CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-500">
                These coupons will expire within 3 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {expiringSoon.map((coupon: any) => (
                  <Badge key={coupon.id} variant="outline" className="border-orange-500 text-orange-700">
                    {coupon.code} - expires {format(new Date(coupon.expiresAt), 'MMM d')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flagged Coupons Alert */}
        {flaggedCoupons && flaggedCoupons.length > 0 && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                High Discount Coupons ({flaggedCoupons.length})
              </CardTitle>
              <CardDescription className="text-amber-600 dark:text-amber-500">
                These coupons have discounts over 20% and require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {flaggedCoupons.map((coupon) => (
                  <Badge key={coupon.id} variant="outline" className="border-amber-500 text-amber-700">
                    {coupon.code} ({coupon.discountPercent}%)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Trends Chart */}
        {usageTrends && usageTrends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Trends (Last 30 Days)
              </CardTitle>
              <CardDescription>Daily coupon usage over the past month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-1">
                {(() => {
                  const maxUsage = Math.max(...usageTrends.map((d: any) => d.count), 1);
                  return usageTrends.map((day: any, index: number) => (
                    <div
                      key={index}
                      className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-colors relative group"
                      style={{ height: `${(day.count / maxUsage) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                      title={`${format(new Date(day.date), 'MMM d')}: ${day.count} uses`}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {format(new Date(day.date), 'MMM d')}: {day.count} uses
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{usageTrends.length > 0 ? format(new Date(usageTrends[0].date), 'MMM d') : ''}</span>
                <span>{usageTrends.length > 0 ? format(new Date(usageTrends[usageTrends.length - 1].date), 'MMM d') : ''}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Filter & Auto-Deactivate Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? null : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoDeactivateMutation.mutate()}
            disabled={autoDeactivateMutation.isPending}
          >
            {autoDeactivateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Auto-Deactivate Expired
          </Button>
        </div>

        {/* Active Coupons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Active Coupons ({activeCoupons.length})
                </CardTitle>
                <CardDescription>
                  Currently active discount codes
                </CardDescription>
              </div>
              {selectedCoupons.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedCoupons.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeCoupons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No active coupons. Create one to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedCoupons.length === activeCoupons.length && activeCoupons.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCoupons.includes(coupon.id)}
                          onChange={(e) => handleSelectCoupon(coupon.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold">{coupon.code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(coupon.code)}
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          {coupon.isFlagged && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(coupon.discountPercent) > 20 ? "destructive" : "default"}>
                          {coupon.discountPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {coupon.usageType === "one_time" ? "One-Time" : "Unlimited"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {coupon.scope === "universal" ? (
                          <span className="text-muted-foreground">Universal</span>
                        ) : (
                          <span className="text-blue-600">Client-Specific</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.currentUses}
                        {coupon.maxUses && ` / ${coupon.maxUses}`}
                      </TableCell>
                      <TableCell>
                        {coupon.expiresAt ? (
                          <span className={new Date(coupon.expiresAt) < new Date() ? "text-red-600" : ""}>
                            {format(new Date(coupon.expiresAt), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete coupon "${coupon.code}"? This action cannot be undone.`)) {
                                deleteMutation.mutate({ id: coupon.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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

        {/* Inactive Coupons */}
        {inactiveCoupons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Inactive Coupons ({inactiveCoupons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total Uses</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveCoupons.map((coupon) => (
                    <TableRow key={coupon.id} className="opacity-60">
                      <TableCell>
                        <code className="font-mono">{coupon.code}</code>
                      </TableCell>
                      <TableCell>{coupon.discountPercent}%</TableCell>
                      <TableCell>{coupon.currentUses}</TableCell>
                      <TableCell>
                        {format(new Date(coupon.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: coupon.id, isActive: true })}
                        >
                          Reactivate
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Permanently delete this coupon?")) {
                              deleteMutation.mutate({ id: coupon.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Coupon</DialogTitle>
              <DialogDescription>
                Update coupon settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Discount Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="35"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                {parseFloat(discountPercent) > 20 && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Discounts over 20% will be flagged
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Usage Type</Label>
                <Select value={usageType} onValueChange={(v: "one_time" | "unlimited") => setUsageType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Unlimited Uses</SelectItem>
                    <SelectItem value="one_time">One-Time Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {usageType === "unlimited" && (
                <div className="space-y-2">
                  <Label>Max Uses (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxUses || ""}
                    onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={(v: "universal" | "client_specific") => setScope(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universal">Universal (All Clients)</SelectItem>
                    <SelectItem value="client_specific">Client-Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {scope === "client_specific" && (
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select 
                    value={clientProtocolId?.toString() || ""} 
                    onValueChange={(v) => setClientProtocolId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Expiration Date (optional)</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={!code || updateMutation.isPending || parseFloat(discountPercent) > 35}
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
