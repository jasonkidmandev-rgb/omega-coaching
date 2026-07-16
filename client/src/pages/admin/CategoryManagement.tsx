import { useState, useRef, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, ChevronUp, ChevronDown, FolderOpen, Package, Upload, X, Image, ArrowUpDown, SortAsc, SortDesc, Hash, Calendar, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { flagOn, flagOff } from "@shared/flags";

interface Category {
  id: number;
  name: string;
  displayName?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  isActive?: boolean | null;
  isDiscountable?: boolean | null;
  sortOrder?: number | null;
  createdAt?: Date | string | null;
}

type SortOption = 'custom' | 'alpha-asc' | 'alpha-desc' | 'items-desc' | 'items-asc' | 'date-desc' | 'date-asc';

// Sortable Category Item Component
interface SortableCategoryItemProps {
  category: Category;
  index: number;
  totalCount: number;
  itemCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragDisabled?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

function SortableCategoryItem({
  category,
  index,
  totalCount,
  itemCount,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  isDragDisabled = false,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-gray-100/50 rounded-lg border border-gray-300 hover:border-slate-500 transition-colors ${
        isDragging ? 'shadow-lg ring-2 ring-orange-500' : ''
      } ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
    >
      {/* Selection Checkbox */}
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="h-5 w-5 border-gray-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
        />
      )}

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={`text-gray-500 ${isDragDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:text-gray-700'}`}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Reorder Buttons */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-600 hover:text-white"
          onClick={onMoveUp}
          disabled={index === 0 || isDragDisabled}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-600 hover:text-white"
          onClick={onMoveDown}
          disabled={index === totalCount - 1 || isDragDisabled}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Icon */}
      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
        {category.iconUrl ? (
          <img
            src={category.iconUrl}
            alt={category.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FolderOpen className="h-6 w-6 text-gray-600" />
        )}
      </div>

      {/* Category Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-gray-900 font-medium truncate">
            {category.displayName || category.name}
          </h3>
          {category.displayName && category.displayName !== category.name && (
            <span className="text-xs text-gray-500">({category.name})</span>
          )}
          {flagOff(category.isActive) && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              Inactive
            </span>
          )}
          {flagOff(category.isDiscountable) && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              Non-Discountable
            </span>
          )}
        </div>
        {category.description && (
          <p className="text-sm text-gray-600 truncate mt-0.5">
            {category.description}
          </p>
        )}
      </div>

      {/* Item Count */}
      <div className="flex items-center gap-1 text-gray-600 bg-gray-200/50 px-3 py-1 rounded-full">
        <Package className="h-4 w-4" />
        <span className="text-sm font-medium">{itemCount}</span>
        <span className="text-xs">items</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-white"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-red-400"
          onClick={onDelete}
          disabled={itemCount > 0}
          title={itemCount > 0 ? "Cannot delete category with items" : "Delete category"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CategoryManagement() {
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.category.list.useQuery();
  const { data: protocolItems } = trpc.protocolItem.list.useQuery();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    iconUrl: "",
    isActive: true,
    isDiscountable: true,
  });

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      setIsCreateOpen(false);
      resetForm();
      utils.category.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      setIsEditOpen(false);
      setSelectedCategory(null);
      resetForm();
      utils.category.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      setIsDeleteOpen(false);
      setSelectedCategory(null);
      utils.category.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  const bulkDeleteMutation = trpc.category.bulkDelete.useMutation({
    onSuccess: (result) => {
      if (result.deleted > 0) {
        toast.success(`Successfully deleted ${result.deleted} categories`);
      }
      if (result.skipped > 0) {
        toast.warning(`${result.skipped} categories could not be deleted (may have items)`);
      }
      setIsBulkDeleteOpen(false);
      setSelectedIds(new Set());
      utils.category.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete categories: ${error.message}`);
    },
  });

  const uploadMutation = trpc.upload.uploadImage.useMutation({
    onSuccess: (data) => {
      setFormData({ ...formData, iconUrl: data.url });
      setIsUploading(false);
      toast.success("Icon uploaded successfully");
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error(`Failed to upload icon: ${error.message}`);
    },
  });

  // Count items per category
  const getItemCount = useCallback((categoryId: number) => {
    if (!protocolItems) return 0;
    return protocolItems.filter((item: any) => item.categoryId === categoryId).length;
  }, [protocolItems]);

  // Sort categories based on selected option
  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    
    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      itemCount: getItemCount(cat.id),
    }));
    
    switch (sortOption) {
      case 'alpha-asc':
        return [...categoriesWithCounts].sort((a, b) => 
          (a.displayName || a.name).localeCompare(b.displayName || b.name)
        );
      case 'alpha-desc':
        return [...categoriesWithCounts].sort((a, b) => 
          (b.displayName || b.name).localeCompare(a.displayName || a.name)
        );
      case 'items-desc':
        return [...categoriesWithCounts].sort((a, b) => b.itemCount - a.itemCount);
      case 'items-asc':
        return [...categoriesWithCounts].sort((a, b) => a.itemCount - b.itemCount);
      case 'date-desc':
        return [...categoriesWithCounts].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      case 'date-asc':
        return [...categoriesWithCounts].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
      case 'custom':
      default:
        return [...categoriesWithCounts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
  }, [categories, sortOption, getItemCount]);

  // Selection helpers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === sortedCategories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedCategories.map(cat => cat.id)));
    }
  }, [sortedCategories, selectedIds.size]);

  const selectedCategoriesWithItems = useMemo(() => {
    return sortedCategories.filter(cat => selectedIds.has(cat.id) && getItemCount(cat.id) > 0);
  }, [sortedCategories, selectedIds, getItemCount]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleteOpen(true);
  }, [selectedIds.size]);

  const confirmBulkDelete = useCallback(() => {
    bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) });
  }, [selectedIds, bulkDeleteMutation]);

  // DnD Kit sensors
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

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !categories || sortOption !== 'custom') return;
    
    const currentSorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const oldIndex = currentSorted.findIndex(cat => cat.id === active.id);
    const newIndex = currentSorted.findIndex(cat => cat.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Calculate new sort orders
    const reorderedCategories = arrayMove(currentSorted, oldIndex, newIndex);
    
    // Update sort orders for all affected categories
    try {
      for (let i = 0; i < reorderedCategories.length; i++) {
        const cat = reorderedCategories[i];
        if (cat.sortOrder !== i) {
          await updateMutation.mutateAsync({
            id: cat.id,
            sortOrder: i,
          });
        }
      }
      toast.success("Categories reordered successfully");
    } catch (error) {
      toast.error("Failed to reorder categories");
    }
  }, [categories, updateMutation, sortOption]);

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      iconUrl: "",
      isActive: true,
      isDiscountable: true,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({
        base64Data: base64,
        fileName: file.name,
        folder: "category-icons",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      iconUrl: formData.iconUrl.trim() || undefined,
      isDiscountable: formData.isDiscountable,
    });
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      displayName: category.displayName || "",
      description: category.description || "",
      iconUrl: category.iconUrl || "",
      isActive: flagOn(category.isActive),
      isDiscountable: flagOn(category.isDiscountable),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedCategory) return;
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    updateMutation.mutate({
      id: selectedCategory.id,
      name: formData.name.trim(),
      displayName: formData.displayName.trim() || undefined,
      description: formData.description.trim() || undefined,
      iconUrl: formData.iconUrl.trim() || undefined,
      isDiscountable: formData.isDiscountable,
    });
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedCategory) return;
    deleteMutation.mutate({ id: selectedCategory.id });
  };

  const handleMoveUp = (category: Category, index: number) => {
    if (index === 0 || !categories || sortOption !== 'custom') return;
    const customSorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const newOrder = (customSorted[index - 1]?.sortOrder || 0) - 1;
    updateMutation.mutate({
      id: category.id,
      sortOrder: newOrder,
    });
  };

  const handleMoveDown = (category: Category, index: number) => {
    if (!categories || sortOption !== 'custom') return;
    const customSorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (index === customSorted.length - 1) return;
    const newOrder = (customSorted[index + 1]?.sortOrder || 0) + 1;
    updateMutation.mutate({
      id: category.id,
      sortOrder: newOrder,
    });
  };

  // Apply current sort as custom order
  const applyAsCustomOrder = async () => {
    if (!categories || sortOption === 'custom') return;
    
    try {
      for (let i = 0; i < sortedCategories.length; i++) {
        const cat = sortedCategories[i];
        await updateMutation.mutateAsync({
          id: cat.id,
          sortOrder: i,
        });
      }
      setSortOption('custom');
      toast.success("Sort order saved as custom order");
    } catch (error) {
      toast.error("Failed to save sort order");
    }
  };

  const getSortIcon = () => {
    switch (sortOption) {
      case 'alpha-asc':
      case 'items-asc':
      case 'date-asc':
        return <SortAsc className="h-4 w-4" />;
      case 'alpha-desc':
      case 'items-desc':
      case 'date-desc':
        return <SortDesc className="h-4 w-4" />;
      default:
        return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-orange-500" />
              Category Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage categories for protocol items and the Omega Store
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Categories List */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedIds.size === sortedCategories.length && sortedCategories.length > 0}
                  onCheckedChange={selectAll}
                  className="h-5 w-5 border-gray-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                />
                <div>
                  <CardTitle className="text-gray-900">Categories</CardTitle>
                  <CardDescription>
                    {selectedIds.size > 0 ? `${selectedIds.size} selected • ` : ''}{sortedCategories.length} categories • {sortOption === 'custom' ? 'Drag to reorder or use arrows' : 'Viewing sorted list'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                  <SelectTrigger className="w-[200px] bg-gray-100 border-gray-300 text-gray-900">
                    {getSortIcon()}
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="custom" className="text-gray-900 hover:bg-gray-100" textValue="Custom Order">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4" />
                        Custom Order
                      </div>
                    </SelectItem>
                    <SelectItem value="alpha-asc" className="text-gray-900 hover:bg-gray-100" textValue="Alphabetical (A-Z)">
                      <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        Alphabetical (A-Z)
                      </div>
                    </SelectItem>
                    <SelectItem value="alpha-desc" className="text-gray-900 hover:bg-gray-100" textValue="Alphabetical (Z-A)">
                      <div className="flex items-center gap-2">
                        <SortDesc className="h-4 w-4" />
                        Alphabetical (Z-A)
                      </div>
                    </SelectItem>
                    <SelectItem value="items-desc" className="text-gray-900 hover:bg-gray-100" textValue="Most Items First">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Most Items First
                      </div>
                    </SelectItem>
                    <SelectItem value="items-asc" className="text-gray-900 hover:bg-gray-100" textValue="Fewest Items First">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Fewest Items First
                      </div>
                    </SelectItem>
                    <SelectItem value="date-desc" className="text-gray-900 hover:bg-gray-100" textValue="Newest First">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Newest First
                      </div>
                    </SelectItem>
                    <SelectItem value="date-asc" className="text-gray-900 hover:bg-gray-100" textValue="Oldest First">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Oldest First
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {sortOption !== 'custom' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyAsCustomOrder}
                    className="border-gray-300 text-gray-700 hover:text-white"
                  >
                    Save as Custom Order
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600">Loading categories...</div>
            ) : sortedCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No categories found. Create your first category to get started.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedCategories.map(cat => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sortedCategories.map((category, index) => (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        index={index}
                        totalCount={sortedCategories.length}
                        itemCount={getItemCount(category.id)}
                        onMoveUp={() => handleMoveUp(category, index)}
                        onMoveDown={() => handleMoveDown(category, index)}
                        onEdit={() => handleEdit(category)}
                        onDelete={() => handleDelete(category)}
                        isDragDisabled={sortOption !== 'custom'}
                        isSelected={selectedIds.has(category.id)}
                        onToggleSelect={() => toggleSelect(category.id)}
                        showCheckbox={true}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription className="text-gray-600">
                Add a new category for organizing protocol items and store products.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Icon Upload */}
              <div className="space-y-2">
                <Label>Category Icon</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {formData.iconUrl ? (
                      <img
                        src={formData.iconUrl}
                        alt="Category icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="border-gray-300"
                    >
                      {isUploading ? (
                        "Uploading..."
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Icon
                        </>
                      )}
                    </Button>
                    {formData.iconUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, iconUrl: "" })}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Recommended: Square image, 128x128px or larger, max 2MB
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Peptides, Supplements, Supplies"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this category (shown in store when filtering)"
                  className="bg-gray-100 border-gray-300 min-h-[80px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Discountable</Label>
                  <p className="text-xs text-gray-600">
                    Items in this category can receive discounts
                  </p>
                </div>
                <Switch
                  checked={formData.isDiscountable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDiscountable: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || isUploading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {createMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription className="text-gray-600">
                Update category details and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Icon Upload */}
              <div className="space-y-2">
                <Label>Category Icon</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {formData.iconUrl ? (
                      <img
                        src={formData.iconUrl}
                        alt="Category icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="border-gray-300"
                    >
                      {isUploading ? (
                        "Uploading..."
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {formData.iconUrl ? "Change Icon" : "Upload Icon"}
                        </>
                      )}
                    </Button>
                    {formData.iconUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, iconUrl: "" })}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Category Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Optional display name (shown to users)"
                  className="bg-gray-100 border-gray-300"
                />
                <p className="text-xs text-gray-600">
                  If set, this name will be shown instead of the category name
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this category (shown in store when filtering)"
                  className="bg-gray-100 border-gray-300 min-h-[80px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-gray-600">
                    Show this category in the store
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Discountable</Label>
                  <p className="text-xs text-gray-600">
                    Items in this category can receive discounts
                  </p>
                </div>
                <Switch
                  checked={formData.isDiscountable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDiscountable: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending || isUploading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="bg-white border-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900">Delete Category</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <AlertDialogContent className="bg-white border-gray-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete {selectedIds.size} Categories
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 space-y-3">
                <p>Are you sure you want to delete {selectedIds.size} categories? This action cannot be undone.</p>
                {selectedCategoriesWithItems.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-800 font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warning: {selectedCategoriesWithItems.length} categories have items
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Categories with items cannot be deleted. They will be skipped.
                    </p>
                    <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
                      {selectedCategoriesWithItems.slice(0, 5).map(cat => (
                        <li key={cat.id}>{cat.displayName || cat.name} ({getItemCount(cat.id)} items)</li>
                      ))}
                      {selectedCategoriesWithItems.length > 5 && (
                        <li>...and {selectedCategoriesWithItems.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedIds.size - selectedCategoriesWithItems.length} Categories`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
