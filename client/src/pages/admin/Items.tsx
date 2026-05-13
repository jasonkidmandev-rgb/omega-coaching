import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import RichTextEditor from "@/components/RichTextEditor";
import { Plus, MoreHorizontal, Edit, Trash2, Package, Search, Ban, CheckSquare, Link, Percent, Clock, FolderOpen, Tags, Undo2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { type PricingTier, formatTieredPricing, hasTieredPricing } from "@/lib/tieredPricing";

export default function AdminItems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItemType, setSelectedItemType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditType, setBulkEditType] = useState<'source' | 'discount' | 'schedule' | 'category' | 'itemType' | null>(null);
  const [bulkItemType, setBulkItemType] = useState<string>('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [lastBulkOperation, setLastBulkOperation] = useState<{
    type: 'itemType' | 'category' | 'source' | 'discount' | 'schedule';
    itemIds: number[];
    previousValues: Map<number, any>;
    timestamp: number;
  } | null>(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState(0);
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryDisplayName, setCategoryDisplayName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleteUsageWarning, setDeleteUsageWarning] = useState<string | null>(null);
  const [notesHtml, setNotesHtml] = useState('');
  const [enableTieredPricing, setEnableTieredPricing] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([
    { minQty: 1, maxQty: 1, pricePerUnit: 0 },
    { minQty: 2, maxQty: 4, pricePerUnit: 0 },
    { minQty: 5, maxQty: null, pricePerUnit: 0 },
  ]);
  
  // Scroll position preservation
  const scrollPositionRef = useRef<number>(0);
  const shouldRestoreScrollRef = useRef<boolean>(false);

  const { data: items, refetch, isLoading: isLoadingItems } = trpc.protocolItem.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();

  const createMutation = trpc.protocolItem.create.useMutation({
    onSuccess: () => {
      toast.success("Item created");
      shouldRestoreScrollRef.current = true;
      scrollPositionRef.current = window.scrollY;
      refetch();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.protocolItem.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      shouldRestoreScrollRef.current = true;
      refetch();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateCategoryMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Restore scroll position after refetch
  useEffect(() => {
    if (shouldRestoreScrollRef.current && items) {
      window.scrollTo(0, scrollPositionRef.current);
      shouldRestoreScrollRef.current = false;
    }
  }, [items]);

  // Undo timer countdown
  useEffect(() => {
    if (undoTimeLeft > 0) {
      const timer = setTimeout(() => {
        setUndoTimeLeft(undoTimeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (undoTimeLeft === 0 && lastBulkOperation) {
      setLastBulkOperation(null);
    }
  }, [undoTimeLeft, lastBulkOperation]);

  const deleteMutation = trpc.protocolItem.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted successfully");
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteForce(false);
      setDeleteUsageWarning(null);
      shouldRestoreScrollRef.current = true;
      scrollPositionRef.current = window.scrollY;
      refetch();
    },
    onError: (error) => {
      if (error.message?.includes('Cannot delete')) {
        setDeleteUsageWarning(error.message);
      } else {
        toast.error(error.message);
        setShowDeleteConfirm(false);
      }
    },
  });

  // Bulk edit handlers
  const toggleSelectItem = (id: number) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredItems?.map((item) => item.id) || [];
    setSelectedItems(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const openBulkEdit = (type: 'source' | 'discount' | 'schedule' | 'category' | 'itemType') => {
    setBulkEditType(type);
    setBulkEditValue('');
    setBulkCategoryId(null);
    setBulkItemType('');
    setIsBulkEditOpen(true);
  };

  const bulkCategoryMutation = trpc.protocolItem.bulkUpdateCategory.useMutation({
    onSuccess: (result) => {
      toast.success(`Updated ${result.successCount} of ${result.total} items`);
      setIsBulkEditOpen(false);
      setBulkEditType(null);
      setBulkCategoryId(null);
      setSelectedItems(new Set());
      shouldRestoreScrollRef.current = true;
      scrollPositionRef.current = window.scrollY;
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update categories: ${error.message}`);
    },
  });

  const handleBulkEdit = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    // Handle category bulk edit separately using the dedicated mutation
    if (bulkEditType === 'category') {
      if (!bulkCategoryId) {
        toast.error('Please select a category');
        return;
      }
      bulkCategoryMutation.mutate({
        itemIds: Array.from(selectedItems),
        categoryId: bulkCategoryId,
      });
      return;
    }

    // Handle item type bulk edit
    if (bulkEditType === 'itemType') {
      if (!bulkItemType) {
        toast.error('Please select an item type');
        return;
      }
      const itemIds = Array.from(selectedItems);
      // Store previous values for undo
      const previousValues = new Map<number, any>();
      items?.filter(item => itemIds.includes(item.id)).forEach(item => {
        previousValues.set(item.id, item.itemType);
      });
      
      let successCount = 0;
      for (const id of itemIds) {
        try {
          await updateMutation.mutateAsync({ id, itemType: bulkItemType as any });
          successCount++;
        } catch (error) {
          console.error(`Failed to update item ${id}:`, error);
        }
      }
      
      // Store operation for undo
      setLastBulkOperation({
        type: 'itemType',
        itemIds,
        previousValues,
        timestamp: Date.now(),
      });
      setUndoTimeLeft(30);
      
      toast.success(`Changed type for ${successCount} of ${itemIds.length} items. You can undo this action.`);
      setIsBulkEditOpen(false);
      setBulkEditType(null);
      setBulkItemType('');
      setSelectedItems(new Set());
      shouldRestoreScrollRef.current = true;
      scrollPositionRef.current = window.scrollY;
      refetch();
      return;
    }

    const itemIds = Array.from(selectedItems);
    let successCount = 0;

    for (const id of itemIds) {
      try {
        const updateData: any = { id };
        if (bulkEditType === 'source') {
          updateData.affiliateUrl = bulkEditValue;
        } else if (bulkEditType === 'discount') {
          updateData.isDiscountable = bulkEditValue !== 'ND';
        } else if (bulkEditType === 'schedule') {
          updateData.schedule = bulkEditValue;
        }
        await updateMutation.mutateAsync(updateData);
        successCount++;
      } catch (error) {
        console.error(`Failed to update item ${id}:`, error);
      }
    }

    toast.success(`Updated ${successCount} of ${itemIds.length} items`);
    setIsBulkEditOpen(false);
    setBulkEditType(null);
    setBulkEditValue('');
    setSelectedItems(new Set());
    shouldRestoreScrollRef.current = true;
    scrollPositionRef.current = window.scrollY;
    refetch();
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteForce(false);
    setDeleteUsageWarning(null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    scrollPositionRef.current = window.scrollY;
    deleteMutation.mutate({ id: deleteTarget.id, force: deleteForce });
  };

  const handleEdit = (item: any) => {
    // Save scroll position before opening edit dialog
    scrollPositionRef.current = window.scrollY;
    setEditingItem(item);
    setNotesHtml(item.notes || '');
    // Load tiered pricing if exists
    if (item.pricingTiers && Array.isArray(item.pricingTiers) && item.pricingTiers.length > 0) {
      setEnableTieredPricing(true);
      setPricingTiers(item.pricingTiers);
    } else {
      setEnableTieredPricing(false);
      setPricingTiers([
        { minQty: 1, maxQty: 1, pricePerUnit: 0 },
        { minQty: 2, maxQty: 4, pricePerUnit: 0 },
        { minQty: 5, maxQty: null, pricePerUnit: 0 },
      ]);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      categoryId: parseInt(formData.get("categoryId") as string),
      name: formData.get("name") as string,
      schedule: (formData.get("schedule") as string) || undefined,
      duration: (formData.get("duration") as string) || undefined,
      price: (formData.get("price") as string) || "0",
      defaultQty: parseInt(formData.get("defaultQty") as string) || 0,
      purpose: (formData.get("purpose") as string) || undefined,
      notes: notesHtml || undefined,
      affiliateUrl: (formData.get("affiliateUrl") as string) || undefined,
      affiliateCode: (formData.get("affiliateCode") as string) || undefined,
      loomVideoUrl: (formData.get("loomVideoUrl") as string) || undefined,
      itemType: (formData.get("itemType") as "peptide" | "supplement" | "adjunct" | "supply" | "service" | "other") || "peptide",
      isDiscountable: formData.get("isDiscountable") === "on",
      fulfillmentSource: (formData.get("fulfillmentSource") as "coach" | "client") || "coach",
      pricingTiers: enableTieredPricing ? pricingTiers.filter(t => t.pricePerUnit > 0) : null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter items
  const filteredItems = items?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.purpose?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.categoryId.toString() === selectedCategory;
    const matchesItemType = selectedItemType === "all" || item.itemType === selectedItemType;
    return matchesSearch && matchesCategory && matchesItemType;
  });

  // Count items by type for tab badges
  const itemTypeCounts = items?.reduce((acc, item) => {
    acc[item.itemType] = (acc[item.itemType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Group by category for display
  const itemsByCategory = categories?.map((cat) => ({
    category: cat,
    items: filteredItems?.filter((item) => item.categoryId === cat.id) || [],
  })).filter((group) => group.items.length > 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Protocol Items</h1>
            <p className="text-muted-foreground mt-1">
              Manage peptides, supplements, and supplies
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setNotesHtml('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the item details" : "Add a new protocol item to your library"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingItem?.name || ""}
                        placeholder="BPC157 Acetate 10MG"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Category *</Label>
                      <Select name="categoryId" defaultValue={editingItem?.categoryId?.toString() || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.displayName || cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="itemType">Type</Label>
                      <Select name="itemType" defaultValue={editingItem?.itemType || "peptide"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="peptide">Peptide</SelectItem>
                          <SelectItem value="supplement">Supplement</SelectItem>
                          <SelectItem value="supply">Supply</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        defaultValue={editingItem?.price || ""}
                        placeholder="95.00"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="defaultQty">Default Quantity</Label>
                      <Input
                        id="defaultQty"
                        name="defaultQty"
                        type="number"
                        defaultValue={editingItem?.defaultQty || "1"}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule">Schedule</Label>
                      <Input
                        id="schedule"
                        name="schedule"
                        defaultValue={editingItem?.schedule || ""}
                        placeholder="2x/day Mon-Fri"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      name="duration"
                      defaultValue={editingItem?.duration || ""}
                      placeholder="90 days (Weekends off)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      name="purpose"
                      defaultValue={editingItem?.purpose || ""}
                      placeholder="Healing/Recovery/Gut Health"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <RichTextEditor
                      content={notesHtml}
                      onChange={(html) => setNotesHtml(html)}
                      placeholder="Additional notes — use toolbar for bold, links, lists..."
                      minHeight="120px"
                    />
                    <p className="text-xs text-muted-foreground">Formatting (bold, lists, links) will be preserved in the client portal</p>
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="isDiscountable"
                      name="isDiscountable"
                      defaultChecked={editingItem?.isDiscountable !== false}
                    />
                    <Label htmlFor="isDiscountable" className="text-sm font-normal cursor-pointer">
                      Eligible for discounts (uncheck for non-discountable items like Tirzepatide, supplies, etc.)
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fulfillmentSource">Default Fulfillment</Label>
                    <Select name="fulfillmentSource" defaultValue={(editingItem as any)?.fulfillmentSource || "coach"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Who fulfills this item?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coach">We Ship (coach-fulfilled)</SelectItem>
                        <SelectItem value="client">Client Buys (via affiliate link)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Sets the default for new protocols. Can be overridden per client.</p>
                  </div>

                  {/* Tiered/Volume Pricing Section */}
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enableTieredPricing"
                        checked={enableTieredPricing}
                        onCheckedChange={(checked) => setEnableTieredPricing(checked === true)}
                      />
                      <Label htmlFor="enableTieredPricing" className="text-sm font-medium cursor-pointer">
                        Enable Volume/Tiered Pricing
                      </Label>
                    </div>
                    
                    {enableTieredPricing && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Set different prices based on quantity ordered. Leave maxQty empty for "and above".
                        </p>
                        {pricingTiers.map((tier, index) => (
                          <div key={index} className="grid grid-cols-4 gap-2 items-center">
                            <div>
                              <Label className="text-xs">Min Qty</Label>
                              <Input
                                type="number"
                                min="1"
                                value={tier.minQty}
                                onChange={(e) => {
                                  const newTiers = [...pricingTiers];
                                  newTiers[index].minQty = parseInt(e.target.value) || 1;
                                  setPricingTiers(newTiers);
                                }}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max Qty</Label>
                              <Input
                                type="number"
                                min="1"
                                value={tier.maxQty ?? ''}
                                placeholder="∞"
                                onChange={(e) => {
                                  const newTiers = [...pricingTiers];
                                  newTiers[index].maxQty = e.target.value ? parseInt(e.target.value) : null;
                                  setPricingTiers(newTiers);
                                }}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Price/Unit ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.pricePerUnit || ''}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const newTiers = [...pricingTiers];
                                  newTiers[index].pricePerUnit = parseFloat(e.target.value) || 0;
                                  setPricingTiers(newTiers);
                                }}
                                className="h-8"
                              />
                            </div>
                            <div className="flex items-end">
                              {pricingTiers.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-destructive"
                                  onClick={() => {
                                    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const lastTier = pricingTiers[pricingTiers.length - 1];
                            const newMinQty = (lastTier?.maxQty ?? lastTier?.minQty ?? 0) + 1;
                            setPricingTiers([...pricingTiers, { minQty: newMinQty, maxQty: null, pricePerUnit: 0 }]);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Tier
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="affiliateUrl">Affiliate URL</Label>
                      <Input
                        id="affiliateUrl"
                        name="affiliateUrl"
                        defaultValue={editingItem?.affiliateUrl || ""}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="affiliateCode">Affiliate Code</Label>
                      <Input
                        id="affiliateCode"
                        name="affiliateCode"
                        defaultValue={editingItem?.affiliateCode || ""}
                        placeholder="OMEGA10"
                      />
                    </div>
                  </div>
                  
                  {/* Loom Video */}
                  <div className="space-y-2">
                    <Label htmlFor="loomVideoUrl">Loom Video URL</Label>
                    <Input
                      id="loomVideoUrl"
                      name="loomVideoUrl"
                      defaultValue={editingItem?.loomVideoUrl || ""}
                      placeholder="https://www.loom.com/share/... or https://www.loom.com/embed/..."
                    />
                    <p className="text-xs text-muted-foreground">Add a Loom video to explain this protocol item to clients</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingItem ? "Update Item" : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedItemType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("all")}
          >
            All ({items?.length || 0})
          </Button>
          <Button
            variant={selectedItemType === "peptide" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("peptide")}
          >
            Peptides ({itemTypeCounts.peptide || 0})
          </Button>
          <Button
            variant={selectedItemType === "supplement" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("supplement")}
          >
            Supplements ({itemTypeCounts.supplement || 0})
          </Button>
          <Button
            variant={selectedItemType === "supply" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("supply")}
          >
            Supplies ({itemTypeCounts.supply || 0})
          </Button>
          <Button
            variant={selectedItemType === "service" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("service")}
          >
            Services ({itemTypeCounts.service || 0})
          </Button>
          <Button
            variant={selectedItemType === "adjunct" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("adjunct")}
          >
            Adjuncts ({itemTypeCounts.adjunct || 0})
          </Button>
          <Button
            variant={selectedItemType === "other" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedItemType("other")}
          >
            Other ({itemTypeCounts.other || 0})
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.displayName || cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Edit Toolbar */}
        {selectedItems.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => openBulkEdit('source')}>
                    <Link className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Bulk Edit </span>Source
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openBulkEdit('discount')}>
                    <Percent className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Bulk Edit </span>Discount
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openBulkEdit('schedule')}>
                    <Clock className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Bulk Edit </span>Schedule
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openBulkEdit('category')} className="bg-orange-50 border-orange-200 hover:bg-orange-100">
                    <FolderOpen className="h-4 w-4 mr-1 sm:mr-2 text-orange-600" />
                    <span className="hidden sm:inline">Assign </span>Category
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openBulkEdit('itemType')} className="bg-purple-50 border-purple-200 hover:bg-purple-100">
                    <Tags className="h-4 w-4 mr-1 sm:mr-2 text-purple-600" />
                    <span className="hidden sm:inline">Change </span>Type
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Edit Dialog */}
        <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bulkEditType === 'category' ? 'Assign Category' : bulkEditType === 'itemType' ? 'Change Item Type' : `Bulk Edit ${bulkEditType === 'source' ? 'Source URL' : bulkEditType === 'discount' ? 'Discount Status' : 'Schedule'}`}
              </DialogTitle>
              <DialogDescription>
                Apply this change to {selectedItems.size} selected item{selectedItems.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {bulkEditType === 'source' && (
                <div className="space-y-2">
                  <Label htmlFor="bulkSource">New Source URL</Label>
                  <Input
                    id="bulkSource"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    placeholder="https://your-landing-page.com"
                  />
                </div>
              )}
              {bulkEditType === 'discount' && (
                <div className="space-y-2">
                  <Label>Discount Status</Label>
                  <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discountable">Discountable (✓)</SelectItem>
                      <SelectItem value="ND">Non-Discountable (ND)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {bulkEditType === 'schedule' && (
                <div className="space-y-2">
                  <Label htmlFor="bulkSchedule">New Schedule</Label>
                  <Input
                    id="bulkSchedule"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    placeholder="e.g., 2x/day Mon-Fri"
                  />
                </div>
              )}
              {bulkEditType === 'category' && (
                <div className="space-y-2">
                  <Label>Target Category</Label>
                  <Select value={bulkCategoryId?.toString() || ''} onValueChange={(val) => setBulkCategoryId(parseInt(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.displayName || cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Move {selectedItems.size} selected item{selectedItems.size > 1 ? 's' : ''} to this category
                  </p>
                </div>
              )}
              {bulkEditType === 'itemType' && (
                <div className="space-y-2">
                  <Label>New Item Type</Label>
                  <Select value={bulkItemType} onValueChange={setBulkItemType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peptide">Peptide</SelectItem>
                      <SelectItem value="supplement">Supplement</SelectItem>
                      <SelectItem value="supply">Supply</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="adjunct">Adjunct</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Change {selectedItems.size} selected item{selectedItems.size > 1 ? 's' : ''} to this type
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (bulkEditType === 'itemType' || bulkEditType === 'category') {
                    setShowBulkConfirm(true);
                  } else {
                    handleBulkEdit();
                  }
                }} 
                disabled={bulkEditType === 'category' ? !bulkCategoryId : bulkEditType === 'itemType' ? !bulkItemType : !bulkEditValue}
                className={bulkEditType === 'category' ? 'bg-orange-500 hover:bg-orange-600' : bulkEditType === 'itemType' ? 'bg-purple-500 hover:bg-purple-600' : ''}
              >
                {bulkEditType === 'category' ? `Move ${selectedItems.size} Items` : bulkEditType === 'itemType' ? `Change ${selectedItems.size} Items` : `Apply to ${selectedItems.size} Items`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Items by Category */}
        {isLoadingItems ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading Items...</CardTitle>
            </CardHeader>
            <CardContent>
              <TableSkeleton columns={8} rows={10} />
            </CardContent>
          </Card>
        ) : itemsByCategory && itemsByCategory.length > 0 ? (
          itemsByCategory.map(({ category, items }) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>{category.displayName || category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingCategory(category);
                    setCategoryDisplayName(category.displayName || category.name);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={items.every((item) => selectedItems.has(item.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems((prev) => {
                                const newSet = new Set(prev);
                                items.forEach((item) => newSet.add(item.id));
                                return newSet;
                              });
                            } else {
                              setSelectedItems((prev) => {
                                const newSet = new Set(prev);
                                items.forEach((item) => newSet.delete(item.id));
                                return newSet;
                              });
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Default Qty</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-blue-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.purpose && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {item.purpose}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{item.itemType}</span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.schedule || "-"}
                        </TableCell>
                        <TableCell>${item.price}</TableCell>
                        <TableCell>{item.defaultQty}</TableCell>
                        <TableCell>
                          {item.isDiscountable === false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <Ban className="h-3 w-3" />
                              ND
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">✓</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Item actions menu">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleEdit(item); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); handleDelete(item.id, item.name); }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== "all"
                    ? "Try adjusting your search or filter"
                    : "Add your first protocol item to get started"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category Display Name</DialogTitle>
              <DialogDescription>
                Customize how this category appears throughout the system
              </DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>System Name</Label>
                  <Input value={editingCategory.name} disabled className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={categoryDisplayName}
                    onChange={(e) => setCategoryDisplayName(e.target.value)}
                    placeholder={editingCategory.name}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (editingCategory) {
                  updateCategoryMutation.mutate({
                    id: editingCategory.id,
                    displayName: categoryDisplayName || undefined,
                  });
                  setEditingCategory(null);
                }
              }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Operation Confirmation Dialog */}
        <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Bulk Change
              </AlertDialogTitle>
              <AlertDialogDescription>
                {bulkEditType === 'itemType' && (
                  <span>
                    You are about to change <strong>{selectedItems.size} item{selectedItems.size > 1 ? 's' : ''}</strong> to type <strong className="capitalize">{bulkItemType}</strong>.
                    This action can be undone within 30 seconds.
                  </span>
                )}
                {bulkEditType === 'category' && (
                  <span>
                    You are about to move <strong>{selectedItems.size} item{selectedItems.size > 1 ? 's' : ''}</strong> to a different category.
                    This action can be undone within 30 seconds.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowBulkConfirm(false);
                  handleBulkEdit();
                }}
                className={bulkEditType === 'category' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-500 hover:bg-purple-600'}
              >
                Yes, Apply Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => {
          if (!open) {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            setDeleteForce(false);
            setDeleteUsageWarning(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                {deleteUsageWarning ? "Item In Use" : "Delete Item"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  {!deleteUsageWarning ? (
                    <p>Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action will be logged and can be restored from the deletion log.</p>
                  ) : (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                        <p className="text-amber-800 text-sm font-medium flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Warning
                        </p>
                        <p className="text-amber-700 text-sm mt-1">{deleteUsageWarning}</p>
                      </div>
                      <p className="text-sm">You can either:</p>
                      <ul className="text-sm list-disc pl-5 space-y-1">
                        <li><strong>Cancel</strong> and reassign the item in those protocols first</li>
                        <li><strong>Force delete</strong> to remove it anyway (existing protocols will show the item as removed)</li>
                      </ul>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {deleteUsageWarning ? (
                <Button
                  onClick={() => {
                    setDeleteForce(true);
                    deleteMutation.mutate({ id: deleteTarget!.id, force: true });
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Force Delete"}
                </Button>
              ) : (
                <Button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Undo Bar */}
        {lastBulkOperation && undoTimeLeft > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <Card className="bg-gray-100 text-white border-gray-200 shadow-lg">
              <CardContent className="py-3 px-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4" />
                  <span className="text-sm">
                    Changed {lastBulkOperation.itemIds.length} item{lastBulkOperation.itemIds.length > 1 ? 's' : ''}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!lastBulkOperation) return;
                    const { type, itemIds, previousValues } = lastBulkOperation;
                    let successCount = 0;
                    
                    if (type === 'itemType') {
                      for (const id of itemIds) {
                        try {
                          const prevValue = previousValues.get(id);
                          if (prevValue) {
                            await updateMutation.mutateAsync({ id, itemType: prevValue });
                            successCount++;
                          }
                        } catch (error) {
                          console.error(`Failed to undo item ${id}:`, error);
                        }
                      }
                    }
                    
                    toast.success(`Undone: Restored ${successCount} item${successCount > 1 ? 's' : ''} to previous type`);
                    setLastBulkOperation(null);
                    setUndoTimeLeft(0);
                    refetch();
                  }}
                >
                  Undo ({undoTimeLeft}s)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-600 hover:text-white"
                  onClick={() => {
                    setLastBulkOperation(null);
                    setUndoTimeLeft(0);
                  }}
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
