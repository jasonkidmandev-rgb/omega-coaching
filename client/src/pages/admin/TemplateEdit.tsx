import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Loader2, CheckSquare, Square, Copy, Search, Download, Trash2, GripVertical, Eye } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef } from "react";
import SortableTemplateItem from "./template-edit/SortableTemplateItem";
import CopyFromTemplateDialog from "./template-edit/CopyFromTemplateDialog";
import TemplatePreviewDialog from "./template-edit/TemplatePreviewDialog";


export default function AdminTemplateEdit() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isNew = !params.id || params.id === "new";
  const templateId = isNew ? null : parseInt(params.id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    durationMonths: 3,
    isDefault: false,
    hidePricing: false,
    autoSync: false,
    tags: "",
  });

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [recommendedItems, setRecommendedItems] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Copy from Template dialog state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourceTemplateId, setSourceTemplateId] = useState<number | null>(null);
  const [sourceTemplateItems, setSourceTemplateItems] = useState<any[]>([]);
  const [itemsToImport, setItemsToImport] = useState<Set<number>>(new Set());
  const [importSearchQuery, setImportSearchQuery] = useState("");
  const [isLoadingSourceItems, setIsLoadingSourceItems] = useState(false);

  const trpcUtils = trpc.useUtils();

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

  const { data: template, isLoading: templateLoading } = trpc.template.get.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );
  const { data: templateItems, refetch: refetchTemplateItems } = trpc.template.getItems.useQuery(
    { templateId: templateId! },
    { enabled: !!templateId }
  );
  const { data: allItems } = trpc.protocolItem.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: templates } = trpc.template.list.useQuery();

  const createMutation = trpc.template.create.useMutation({
    onSuccess: (data) => {
      toast.success("Template created");
      setLocation(`/admin/templates/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.template.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addItemMutation = trpc.template.addItem.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeItemMutation = trpc.template.removeItem.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const clearAllItemsMutation = trpc.template.clearAllItems.useMutation({
    onSuccess: () => {
      setSelectedItems(new Set());
      setRecommendedItems(new Set());
      refetchTemplateItems();
      toast.success('All items cleared from template');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderItemsMutation = trpc.template.reorderItems.useMutation({
    onSuccess: () => {
      toast.success('Items reordered');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        durationMonths: template.durationMonths,
        isDefault: template.isDefault,
        hidePricing: (template as any).hidePricing || false,
        autoSync: (template as any).autoSync || false,
        tags: (template as any).tags || "",
      });
    }
  }, [template]);

  useEffect(() => {
    if (templateItems) {
      setSelectedItems(new Set(templateItems.map((item) => item.protocolItemId)));
      setRecommendedItems(new Set(templateItems.filter((item) => item.isRecommended).map((item) => item.protocolItemId)));
    }
  }, [templateItems]);

  // Expand all categories by default
  useEffect(() => {
    if (categories) {
      setExpandedCategories(new Set(categories.map((c) => c.id)));
    }
  }, [categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({
        id: templateId!,
        ...formData,
      });
    }
  };

  const handleItemToggle = async (itemId: number, checked: boolean) => {
    if (!templateId) return;
    saveScrollPosition();

    if (checked) {
      setSelectedItems((prev) => new Set(Array.from(prev).concat(itemId)));
      const item = allItems?.find((i) => i.id === itemId);
      await addItemMutation.mutateAsync({
        templateId,
        protocolItemId: itemId,
        quantity: item?.defaultQty || 1,
        isRecommended: true,
      });
    } else {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      const templateItem = templateItems?.find((ti) => ti.protocolItemId === itemId);
      if (templateItem) {
        await removeItemMutation.mutateAsync({ id: templateItem.id });
      }
    }
  };

  // Check all items in a category
  const handleCheckAllCategory = async (categoryId: number) => {
    if (!templateId) return;
    saveScrollPosition();
    const categoryItems = allItems?.filter((item) => item.categoryId === categoryId) || [];
    
    for (const item of categoryItems) {
      if (!selectedItems.has(item.id)) {
        setSelectedItems((prev) => new Set(Array.from(prev).concat(item.id)));
        await addItemMutation.mutateAsync({
          templateId,
          protocolItemId: item.id,
          quantity: item.defaultQty || 1,
          isRecommended: true,
        });
      }
    }
    refetchTemplateItems();
    toast.success(`All items in category selected`);
  };

  // Uncheck all items in a category
  const handleUncheckAllCategory = async (categoryId: number) => {
    if (!templateId) return;
    saveScrollPosition();
    const categoryItems = allItems?.filter((item) => item.categoryId === categoryId) || [];
    
    for (const item of categoryItems) {
      if (selectedItems.has(item.id)) {
        const templateItem = templateItems?.find((ti) => ti.protocolItemId === item.id);
        if (templateItem) {
          setSelectedItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
          await removeItemMutation.mutateAsync({ id: templateItem.id });
        }
      }
    }
    refetchTemplateItems();
    toast.success(`All items in category deselected`);
  };

  // Toggle recommended status for an item
  const handleRecommendedToggle = async (itemId: number, isRecommended: boolean) => {
    if (!templateId) return;
    saveScrollPosition();
    const templateItem = templateItems?.find((ti) => ti.protocolItemId === itemId);
    if (!templateItem) return;
    
    // Update local state immediately
    setRecommendedItems((prev) => {
      const newSet = new Set(prev);
      if (isRecommended) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
    
    // Update on server
    await addItemMutation.mutateAsync({
      templateId,
      protocolItemId: itemId,
      quantity: templateItem.quantity,
      isRecommended,
    });
    refetchTemplateItems();
  };

  // Toggle all recommended ON or OFF
  const handleToggleAllRecommended = async (turnOn: boolean) => {
    if (!templateId || !templateItems) return;
    saveScrollPosition();
    
    for (const item of templateItems) {
      if (turnOn !== recommendedItems.has(item.protocolItemId)) {
        await addItemMutation.mutateAsync({
          templateId,
          protocolItemId: item.protocolItemId,
          quantity: item.quantity,
          isRecommended: turnOn,
        });
      }
    }
    
    if (turnOn) {
      setRecommendedItems(new Set(templateItems.map((item) => item.protocolItemId)));
    } else {
      setRecommendedItems(new Set());
    }
    
    refetchTemplateItems();
    toast.success(turnOn ? 'All items set as recommended' : 'All items set as not recommended');
  };

  // Duplicate template functionality
  const handleDuplicateTemplate = async () => {
    if (!template) return;
    
    createMutation.mutate({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      durationMonths: template.durationMonths,
      isDefault: false,
    });
  };

  // Copy from Template - load source template items
  const handleSelectSourceTemplate = async (sourceId: number) => {
    setSourceTemplateId(sourceId);
    setIsLoadingSourceItems(true);
    setItemsToImport(new Set());
    
    try {
      const items = await trpcUtils.template.getItems.fetch({ templateId: sourceId });
      // Enrich with protocol item details
      const enrichedItems = items.map(ti => {
        const protocolItem = allItems?.find(pi => pi.id === ti.protocolItemId);
        return {
          ...ti,
          name: protocolItem?.name || 'Unknown',
          purpose: protocolItem?.purpose || '',
          categoryId: protocolItem?.categoryId,
          price: protocolItem?.price,
        };
      });
      setSourceTemplateItems(enrichedItems);
    } catch (error) {
      toast.error('Failed to load template items');
    } finally {
      setIsLoadingSourceItems(false);
    }
  };

  // Import selected items from source template
  const handleImportItems = async () => {
    if (!templateId || itemsToImport.size === 0) return;
    saveScrollPosition();
    
    let importedCount = 0;
    for (const protocolItemId of Array.from(itemsToImport)) {
      if (!selectedItems.has(protocolItemId)) {
        const sourceItem = sourceTemplateItems.find(si => si.protocolItemId === protocolItemId);
        if (sourceItem) {
          await addItemMutation.mutateAsync({
            templateId,
            protocolItemId,
            quantity: sourceItem.quantity,
            isRecommended: sourceItem.isRecommended,
          });
          setSelectedItems(prev => new Set(Array.from(prev).concat(protocolItemId)));
          importedCount++;
        }
      }
    }
    
    refetchTemplateItems();
    setCopyDialogOpen(false);
    setSourceTemplateId(null);
    setSourceTemplateItems([]);
    setItemsToImport(new Set());
    setImportSearchQuery('');
    toast.success(`Imported ${importedCount} items from template`);
  };

  // Filter source template items by search query
  const filteredSourceItems = useMemo(() => {
    if (!importSearchQuery) return sourceTemplateItems;
    return sourceTemplateItems.filter(item => 
      item.name.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
      (item.purpose && item.purpose.toLowerCase().includes(importSearchQuery.toLowerCase()))
    );
  }, [sourceTemplateItems, importSearchQuery]);

  // Group source items by category for display
  const sourceItemsByCategory = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => ({
      category: cat,
      items: filteredSourceItems.filter(item => item.categoryId === cat.id),
    })).filter(group => group.items.length > 0);
  }, [categories, filteredSourceItems]);

  // State for preview mode
  const [showPreview, setShowPreview] = useState(false);

  // Handle drag end for reordering items within a category
  const handleDragEnd = async (event: DragEndEvent, categoryId: number) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !templateId || !templateItems) return;
    
    saveScrollPosition();
    
    // Get items in this category that are selected
    const categoryTemplateItems = templateItems.filter(ti => {
      const protocolItem = allItems?.find(pi => pi.id === ti.protocolItemId);
      return protocolItem?.categoryId === categoryId && selectedItems.has(ti.protocolItemId);
    });
    
    const oldIndex = categoryTemplateItems.findIndex(item => item.id === active.id);
    const newIndex = categoryTemplateItems.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reorderedItems = arrayMove(categoryTemplateItems, oldIndex, newIndex);
    
    // Update sort order on server
    await reorderItemsMutation.mutateAsync({
      templateId,
      itemIds: reorderedItems.map(item => item.id),
    });
    
    refetchTemplateItems();
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    return categories?.map((cat) => ({
      category: cat,
      items: allItems?.filter((item) => {
        const matchesCategory = item.categoryId === cat.id;
        const matchesSearch = searchQuery 
          ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.purpose && item.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
          : true;
        return matchesCategory && matchesSearch;
      }) || [],
    })).filter((group) => group.items.length > 0);
  }, [categories, allItems, searchQuery]);

  // Calculate category stats
  const getCategoryStats = (categoryId: number) => {
    const categoryItems = allItems?.filter((item) => item.categoryId === categoryId) || [];
    const selectedInCategory = categoryItems.filter((item) => selectedItems.has(item.id)).length;
    return { selected: selectedInCategory, total: categoryItems.length };
  };

  // Check if this is a 12-month program (hide pricing by default)
  const is12MonthProgram = formData.durationMonths === 12;

  if (templateLoading && !isNew) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/templates")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {isNew ? "New Template" : `Edit: ${template?.name}`}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isNew
                  ? "Create a new protocol template"
                  : "Modify template settings and items"}
              </p>
            </div>
          </div>
          {!isNew && (
            <Button variant="outline" onClick={handleDuplicateTemplate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Template
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Basic template information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Master Template"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Default Duration</Label>
                  <Select
                    value={formData.durationMonths.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, durationMonths: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Months (90 Days)</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Template description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="healing, recovery, performance (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">
                  Add tags to categorize this template (e.g., healing, cognition, weight-loss)
                </p>
                {formData.tags && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.split(',').map((tag, idx) => (
                      <span key={idx} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isDefault: checked })
                    }
                  />
                  <Label htmlFor="isDefault">Set as default template</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="hidePricing"
                    checked={formData.hidePricing || is12MonthProgram}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hidePricing: checked })
                    }
                  />
                  <Label htmlFor="hidePricing">
                    Hide pricing from clients 
                    {is12MonthProgram && (
                      <span className="text-amber-600 ml-2 text-sm">(Recommended for 12-month programs)</span>
                    )}
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="autoSync"
                    checked={formData.autoSync}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoSync: checked })
                    }
                  />
                  <Label htmlFor="autoSync" className="flex flex-col">
                    <span>Auto-sync new protocol items</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Automatically add new items from Protocol Items to this template
                    </span>
                  </Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Save className="h-4 w-4 mr-2" />
                  {isNew ? "Create Template" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {!isNew && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Template Items</CardTitle>
                  <CardDescription>
                    Select which items to include in this template by default
                    {selectedItems.size > 0 && (
                      <span className="ml-2 text-primary font-medium">
                        ({selectedItems.size} items selected)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!templateId || !allItems) return;
                      saveScrollPosition();
                      
                      // Find items in Protocol Items that are not in this template
                      const missingItems = allItems.filter(item => !selectedItems.has(item.id));
                      
                      if (missingItems.length === 0) {
                        toast.info('Template already has all protocol items');
                        return;
                      }
                      
                      // Add all missing items to template
                      for (const item of missingItems) {
                        setSelectedItems((prev) => new Set(Array.from(prev).concat(item.id)));
                        await addItemMutation.mutateAsync({
                          templateId,
                          protocolItemId: item.id,
                          quantity: item.defaultQty || 1,
                          isRecommended: true,
                        });
                      }
                      
                      refetchTemplateItems();
                      toast.success(`Added ${missingItems.length} missing items from Protocol Items`);
                    }}
                    className="whitespace-nowrap"
                  >
                    Sync with Protocol Items
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {itemsByCategory?.map(({ category, items }) => {
                  const stats = getCategoryStats(category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  
                  return (
                    <div key={category.id} className="space-y-3 border rounded-lg p-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors"
                          onClick={() => {
                            setExpandedCategories((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(category.id)) {
                                newSet.delete(category.id);
                              } else {
                                newSet.add(category.id);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          {category.name}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({stats.selected}/{stats.total} selected)
                          </span>
                        </button>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckAllCategory(category.id)}
                            disabled={stats.selected === stats.total}
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Check All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleUncheckAllCategory(category.id)}
                            disabled={stats.selected === 0}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Uncheck All
                          </Button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, category.id)}
                        >
                          <SortableContext
                            items={(() => {
                              // Get template items for this category that are selected
                              const categoryTemplateItems = templateItems?.filter(ti => {
                                const protocolItem = allItems?.find(pi => pi.id === ti.protocolItemId);
                                return protocolItem?.categoryId === category.id && selectedItems.has(ti.protocolItemId);
                              }) || [];
                              return categoryTemplateItems.map(ti => ti.id);
                            })()}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="grid gap-2">
                              {items.map((item) => {
                                const templateItem = templateItems?.find(ti => ti.protocolItemId === item.id);
                                const isSelected = selectedItems.has(item.id);
                                
                                return (
                                  <SortableTemplateItem
                                    key={item.id}
                                    id={templateItem?.id || item.id}
                                    item={item}
                                    templateItem={templateItem}
                                    isSelected={isSelected}
                                    isRecommended={recommendedItems.has(item.id)}
                                    hidePricing={formData.hidePricing || is12MonthProgram}
                                    onToggle={(checked) => handleItemToggle(item.id, checked)}
                                    onRecommendedToggle={(checked) => handleRecommendedToggle(item.id, checked)}
                                  />
                                );
                              })}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {!isNew && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Bulk operations and template management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    // Check all items in all categories
                    for (const group of itemsByCategory || []) {
                      await handleCheckAllCategory(group.category.id);
                    }
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All Items
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    // Uncheck all items in all categories
                    for (const group of itemsByCategory || []) {
                      await handleUncheckAllCategory(group.category.id);
                    }
                  }}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Deselect All Items
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      disabled={selectedItems.size === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Items
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Template Items?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove all {selectedItems.size} items from this template.
                        You can then use "Copy from Template" to selectively import only the items you want.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => {
                          if (templateId) {
                            clearAllItemsMutation.mutate({ templateId });
                          }
                        }}
                      >
                        {clearAllItemsMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Clearing...</>
                        ) : (
                          'Clear All Items'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {templates && templates.length > 1 && (
                  <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Copy from Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Copy Items from Template</DialogTitle>
                        <DialogDescription>
                          Select a source template and choose which items to import into this template.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Source template selector */}
                        <div className="space-y-2">
                          <Label>Select Source Template</Label>
                          <Select
                            value={sourceTemplateId?.toString() || ''}
                            onValueChange={(value) => handleSelectSourceTemplate(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates
                                .filter((t) => t.id !== templateId)
                                .map((t) => (
                                  <SelectItem key={t.id} value={t.id.toString()}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Loading state */}
                        {isLoadingSourceItems && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        )}
                        
                        {/* Items list */}
                        {sourceTemplateId && !isLoadingSourceItems && sourceTemplateItems.length > 0 && (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search items..."
                                  value={importSearchQuery}
                                  onChange={(e) => setImportSearchQuery(e.target.value)}
                                  className="pl-9"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Select all items that aren't already in the template
                                    const newSet = new Set(itemsToImport);
                                    filteredSourceItems.forEach(item => {
                                      if (!selectedItems.has(item.protocolItemId)) {
                                        newSet.add(item.protocolItemId);
                                      }
                                    });
                                    setItemsToImport(newSet);
                                  }}
                                >
                                  <CheckSquare className="h-4 w-4 mr-1" />
                                  Select All
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setItemsToImport(new Set())}
                                >
                                  <Square className="h-4 w-4 mr-1" />
                                  Deselect All
                                </Button>
                              </div>
                            </div>
                            
                            <div className="h-[400px] border rounded-md p-4 overflow-y-auto">
                              <div className="space-y-6">
                                {sourceItemsByCategory.map(({ category, items }) => (
                                  <div key={category.id} className="space-y-3">
                                    <div className="flex items-center justify-between sticky top-0 bg-white py-2 border-b">
                                      <h4 className="font-semibold text-sm">
                                        {category.name}
                                      </h4>
                                      <span className="text-xs text-muted-foreground">
                                        {items.filter(i => itemsToImport.has(i.protocolItemId)).length} of {items.length} selected
                                      </span>
                                    </div>
                                    <div className="space-y-2 pl-1">
                                      {items.map((item) => {
                                        const alreadyInTemplate = selectedItems.has(item.protocolItemId);
                                        const isSelected = itemsToImport.has(item.protocolItemId);
                                        return (
                                          <label
                                            key={item.id}
                                            htmlFor={`import-${item.id}`}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                              alreadyInTemplate 
                                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' 
                                                : isSelected
                                                  ? 'bg-blue-50 border-blue-300'
                                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                                            }`}
                                          >
                                            <Checkbox
                                              id={`import-${item.id}`}
                                              checked={isSelected}
                                              disabled={alreadyInTemplate}
                                              className="mt-0.5 h-5 w-5"
                                              onCheckedChange={(checked) => {
                                                setItemsToImport(prev => {
                                                  const newSet = new Set(prev);
                                                  if (checked) {
                                                    newSet.add(item.protocolItemId);
                                                  } else {
                                                    newSet.delete(item.protocolItemId);
                                                  }
                                                  return newSet;
                                                });
                                              }}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className={`font-medium ${alreadyInTemplate ? 'line-through text-gray-400' : ''}`}>
                                                  {item.name}
                                                </span>
                                                {item.isRecommended && (
                                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex-shrink-0">Rec</span>
                                                )}
                                              </div>
                                              {item.purpose && (
                                                <p className="text-xs text-muted-foreground mt-1">{item.purpose}</p>
                                              )}
                                              {alreadyInTemplate && (
                                                <p className="text-xs text-amber-600 mt-1">Already in this template</p>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {itemsToImport.size} items selected for import
                            </p>
                          </>
                        )}
                        
                        {sourceTemplateId && !isLoadingSourceItems && sourceTemplateItems.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            This template has no items.
                          </p>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleImportItems}
                          disabled={itemsToImport.size === 0}
                        >
                          Import {itemsToImport.size} Items
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              {/* Recommended Toggle Section */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">Recommended Status (Rec:) - Toggle all items as recommended or not</p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => handleToggleAllRecommended(true)}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Set All Recommended ON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => handleToggleAllRecommended(false)}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Set All Recommended OFF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Template Preview: {formData.name}
              </DialogTitle>
              <DialogDescription>
                This is how the protocol will appear to clients when assigned.
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto max-h-[70vh] pr-2">
              {/* Client-facing preview */}
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
                  <h2 className="text-2xl font-bold">{formData.name}</h2>
                  {formData.description && (
                    <p className="mt-2 opacity-90">{formData.description}</p>
                  )}
                  <div className="mt-4 flex gap-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full">
                      {formData.durationMonths} Month Program
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">
                      {selectedItems.size} Items
                    </span>
                  </div>
                </div>

                {/* Items by Category */}
                {itemsByCategory?.map(({ category, items }) => {
                  const selectedInCategory = items.filter(item => selectedItems.has(item.id));
                  if (selectedInCategory.length === 0) return null;
                  
                  return (
                    <div key={category.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b">
                        <h3 className="font-semibold text-lg">{category.displayName || category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                      <div className="divide-y">
                        {selectedInCategory.map((item) => {
                          const isRecommended = recommendedItems.has(item.id);
                          return (
                            <div key={item.id} className="p-4 hover:bg-gray-100">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{item.name}</span>
                                    {isRecommended && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Recommended</span>
                                    )}
                                  </div>
                                  {item.purpose && (
                                    <p className="text-sm text-muted-foreground mt-1">{item.purpose}</p>
                                  )}
                                  {item.schedule && (
                                    <p className="text-xs text-blue-600 mt-2">
                                      <strong>Schedule:</strong> {item.schedule}
                                    </p>
                                  )}
                                </div>
                                {!formData.hidePricing && (
                                  <div className="text-right">
                                    <p className="font-semibold text-lg">${item.price}</p>
                                    <p className="text-xs text-muted-foreground">Qty: {item.defaultQty}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Summary */}
                {!formData.hidePricing && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Estimated Total</span>
                      <span className="text-2xl font-bold">
                        ${allItems?.filter(item => selectedItems.has(item.id))
                          .reduce((sum, item) => sum + (parseFloat(item.price || '0') * (item.defaultQty || 1)), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on default quantities. Actual pricing may vary.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
