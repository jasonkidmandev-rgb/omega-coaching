import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Minus,
  Package,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  History,
  Warehouse,
  FolderPlus,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Copy,
  Link2,
  Scan,
  Settings,
  Layers,
  Upload,
  Palette,
  Eye,
  EyeOff,
  ImageIcon,
  ClipboardList,
  Printer,
  Download,
} from "lucide-react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import AddCategoryDialog from "./inventory/AddCategoryDialog";
import AddItemDialog from "./inventory/AddItemDialog";
import EditItemDialog from "./inventory/EditItemDialog";
import AdjustQuantityDialog from "./inventory/AdjustQuantityDialog";
import { BulkRestockDialog } from "@/components/BulkRestockDialog";
import { flagOn, flagOff } from "@shared/flags";

export default function AdminInventory() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showNegativeOnly, setShowNegativeOnly] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDuplicateScanOpen, setIsDuplicateScanOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"sell" | "restock" | "adjust">("sell");
  const [adjustQuantity, setAdjustQuantity] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isBulkRestockOpen, setIsBulkRestockOpen] = useState(false);

  // New category form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // New item form
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemLowStock, setNewItemLowStock] = useState(5);
  const [newItemIsDiscountable, setNewItemIsDiscountable] = useState(false);

  // Edit item form
  const [editItemName, setEditItemName] = useState("");
  const [editItemCategory, setEditItemCategory] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemSku, setEditItemSku] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [editItemLowStock, setEditItemLowStock] = useState(5);
  const [editItemIsDiscountable, setEditItemIsDiscountable] = useState(false);

  // Edit category form
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");
  const [editCategoryIconUrl, setEditCategoryIconUrl] = useState("");
  const [editCategoryAccentColor, setEditCategoryAccentColor] = useState("");
  const [editCategoryIsActive, setEditCategoryIsActive] = useState(true);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);

  // Scroll position preservation
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  // Restore scroll position after data refetch
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

  const utils = trpc.useUtils();

  const { data: inventoryData, isLoading } = trpc.inventory.getWithCategories.useQuery();
  const { data: lowStockItems } = trpc.inventory.getLowStock.useQuery();
  const { data: categories } = trpc.inventory.listCategories.useQuery();
  const { data: transactions } = trpc.inventory.getTransactions.useQuery(
    { inventoryItemId: selectedItem?.id || 0, limit: 20 },
    { enabled: !!selectedItem && isHistoryOpen }
  );

  // Find duplicate/similar items
  const duplicateGroups = useMemo(() => {
    if (!inventoryData) return [];
    
    const allItems = inventoryData.flatMap(cat => 
      cat.items.map(item => ({ ...item, categoryName: cat.name }))
    );
    
    const groups: { items: typeof allItems; similarity: string }[] = [];
    const processed = new Set<number>();
    
    allItems.forEach((item, i) => {
      if (processed.has(item.id)) return;
      
      const similar = allItems.filter((other, j) => {
        if (i === j || processed.has(other.id)) return false;
        
        // Normalize names for comparison
        const name1 = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const name2 = other.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check for exact match or substring match
        if (name1 === name2) return true;
        if (name1.includes(name2) || name2.includes(name1)) return true;
        
        // Check for similar words
        const words1 = item.name.toLowerCase().split(/\s+/);
        const words2 = other.name.toLowerCase().split(/\s+/);
        const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
        
        return commonWords.length >= 2;
      });
      
      if (similar.length > 0) {
        const group = [item, ...similar];
        group.forEach(i => processed.add(i.id));
        groups.push({
          items: group,
          similarity: similar.length > 0 ? 'Similar names detected' : 'Exact match'
        });
      }
    });
    
    return groups;
  }, [inventoryData]);

  const createCategoryMutation = trpc.inventory.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      saveScrollPosition();
      utils.inventory.listCategories.invalidate();
      utils.inventory.getWithCategories.invalidate();
      setIsAddCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCategoryMutation = trpc.inventory.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      saveScrollPosition();
      utils.inventory.listCategories.invalidate();
      utils.inventory.getWithCategories.invalidate();
      setIsEditCategoryOpen(false);
      setSelectedCategoryForEdit(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteCategoryMutation = trpc.inventory.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      saveScrollPosition();
      utils.inventory.listCategories.invalidate();
      utils.inventory.getWithCategories.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createItemMutation = trpc.inventory.createItem.useMutation({
    onSuccess: () => {
      toast.success("Item added to inventory");
      saveScrollPosition();
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
      setIsAddItemOpen(false);
      resetNewItemForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateItemMutation = trpc.inventory.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated successfully");
      saveScrollPosition();
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
      setIsEditItemOpen(false);
      setSelectedItem(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const sellMutation = trpc.inventory.sell.useMutation({
    onSuccess: (data) => {
      toast.success(`Sold! Stock: ${data.previousQuantity} → ${data.newQuantity}`);
      saveScrollPosition();
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
      setIsAdjustOpen(false);
      resetAdjustForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const restockMutation = trpc.inventory.restock.useMutation({
    onSuccess: (data) => {
      toast.success(`Restocked! Stock: ${data.previousQuantity} → ${data.newQuantity}`);
      saveScrollPosition();
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
      setIsAdjustOpen(false);
      resetAdjustForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const adjustMutation = trpc.inventory.adjust.useMutation({
    onSuccess: (data) => {
      toast.success(`Adjusted! Stock: ${data.previousQuantity} → ${data.newQuantity}`);
      saveScrollPosition();
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
      setIsAdjustOpen(false);
      resetAdjustForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadImageMutation = trpc.upload.uploadImage.useMutation();

  const deleteItemMutation = trpc.inventory.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed from inventory");
      saveScrollPosition();
      utils.inventory.getWithCategories.invalidate();
      utils.inventory.getLowStock.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetNewItemForm = () => {
    setNewItemName("");
    setNewItemCategory("");
    setNewItemQuantity(0);
    setNewItemPrice("");
    setNewItemSku("");
    setNewItemNotes("");
    setNewItemLowStock(5);
    setNewItemIsDiscountable(false);
  };

  const resetAdjustForm = () => {
    setSelectedItem(null);
    setAdjustType("sell");
    setAdjustQuantity(1);
    setAdjustNotes("");
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    createCategoryMutation.mutate({
      name: newCategoryName,
      description: newCategoryDescription || undefined,
    });
  };

  const handleUpdateCategory = () => {
    if (!selectedCategoryForEdit || !editCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    updateCategoryMutation.mutate({
      id: selectedCategoryForEdit.id,
      name: editCategoryName,
      description: editCategoryDescription || undefined,
      iconUrl: editCategoryIconUrl || undefined,
      accentColor: editCategoryAccentColor || undefined,
      isActive: editCategoryIsActive,
    });
  };

  const handleCategoryIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingCategoryIcon(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await uploadImageMutation.mutateAsync({
        base64Data: base64,
        fileName: `category-icon-${Date.now()}.${file.name.split('.').pop()}`,
        folder: 'category-icons',
      });

      setEditCategoryIconUrl(result.url);
      toast.success('Icon uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload icon');
    } finally {
      setIsUploadingCategoryIcon(false);
    }
  };

  const handleCreateItem = () => {
    if (!newItemName.trim() || !newItemCategory) {
      toast.error("Name and category are required");
      return;
    }
    createItemMutation.mutate({
      categoryId: parseInt(newItemCategory),
      name: newItemName,
      quantity: newItemQuantity,
      price: newItemPrice || undefined,
      sku: newItemSku || undefined,
      notes: newItemNotes || undefined,
      lowStockThreshold: newItemLowStock,
      isDiscountable: newItemIsDiscountable,
    });
  };

  const handleUpdateItem = () => {
    if (!selectedItem || !editItemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    updateItemMutation.mutate({
      id: selectedItem.id,
      categoryId: editItemCategory ? parseInt(editItemCategory) : undefined,
      name: editItemName,
      price: editItemPrice || undefined,
      sku: editItemSku || undefined,
      notes: editItemNotes || undefined,
      lowStockThreshold: editItemLowStock,
      isDiscountable: editItemIsDiscountable,
    });
  };

  const handleAdjust = () => {
    if (!selectedItem || adjustQuantity < 1) return;

    if (adjustType === "sell") {
      sellMutation.mutate({
        inventoryItemId: selectedItem.id,
        quantity: adjustQuantity,
        notes: adjustNotes || undefined,
      });
    } else if (adjustType === "restock") {
      restockMutation.mutate({
        inventoryItemId: selectedItem.id,
        quantity: adjustQuantity,
        notes: adjustNotes || undefined,
      });
    } else {
      adjustMutation.mutate({
        inventoryItemId: selectedItem.id,
        quantityChange: adjustQuantity,
        notes: adjustNotes || undefined,
      });
    }
  };

  const openEditItemDialog = (item: any) => {
    setSelectedItem(item);
    setEditItemName(item.name);
    setEditItemCategory(item.categoryId?.toString() || "");
    setEditItemPrice(item.price || "");
    setEditItemSku(item.sku || "");
    setEditItemNotes(item.notes || "");
    setEditItemLowStock(item.lowStockThreshold || 5);
    setEditItemIsDiscountable(!!item.isDiscountable);
    setIsEditItemOpen(true);
  };

  const openEditCategoryDialog = (category: any) => {
    setSelectedCategoryForEdit(category);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || "");
    setEditCategoryIconUrl(category.iconUrl || "");
    setEditCategoryAccentColor(category.accentColor || "");
    setEditCategoryIsActive(flagOn(category.isActive));
    setIsEditCategoryOpen(true);
  };

  const openAdjustDialog = (item: any, type: "sell" | "restock" | "adjust") => {
    setSelectedItem(item);
    setAdjustType(type);
    setAdjustQuantity(1);
    setAdjustNotes("");
    setIsAdjustOpen(true);
  };

  const openHistoryDialog = (item: any) => {
    setSelectedItem(item);
    setIsHistoryOpen(true);
  };

  // Print inventory list
  const handlePrint = useCallback(() => {
    if (!inventoryData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the inventory list');
      return;
    }
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    let totalItems = 0;
    let totalStock = 0;
    inventoryData.forEach(cat => {
      cat.items.forEach(item => {
        totalItems++;
        totalStock += item.quantity;
      });
    });
    const html = `<!DOCTYPE html>
<html><head><title>Omega Inventory Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; color: #1e293b; }
  .header .date { font-size: 11px; color: #666; }
  .summary { display: flex; gap: 24px; margin-bottom: 16px; padding: 10px 16px; background: #f8fafc; border-radius: 6px; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .summary-item .value { font-size: 18px; font-weight: 700; color: #1e293b; }
  .category { margin-bottom: 14px; break-inside: avoid; }
  .category-header { background: #1e293b; color: white; padding: 6px 12px; font-size: 13px; font-weight: 600; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
  th.center, td.center { text-align: center; }
  th.right, td.right { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:hover { background: #fafafa; }
  .sku { color: #94a3b8; font-size: 9px; }
  .low-stock { color: #dc2626; font-weight: 600; }
  .negative { color: #dc2626; font-weight: 700; background: #fef2f2; }
  .ok { color: #16a34a; font-weight: 600; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print {
    body { padding: 10px; }
    .no-print { display: none !important; }
    .category { break-inside: avoid; }
  }
</style></head><body>
<div class="no-print" style="margin-bottom:16px;text-align:right;">
  <button onclick="window.print()" style="padding:8px 20px;background:#1e293b;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Print</button>
</div>
<div class="header">
  <h1>\u03A9 Omega Longevity &mdash; Inventory Report</h1>
  <div class="date">Generated: ${now}</div>
</div>
<div class="summary">
  <div class="summary-item"><div class="label">Total Products</div><div class="value">${totalItems}</div></div>
  <div class="summary-item"><div class="label">Total Stock</div><div class="value">${totalStock}</div></div>
  <div class="summary-item"><div class="label">Categories</div><div class="value">${inventoryData.length}</div></div>
</div>
${inventoryData.map(cat => {
  if (cat.items.length === 0) return '';
  const catStock = cat.items.reduce((s, i) => s + i.quantity, 0);
  return `<div class="category">
  <div class="category-header"><span>${cat.name}</span><span>${cat.items.length} items &bull; ${catStock} units</span></div>
  <table><thead><tr><th style="width:5%">#</th><th style="width:40%">Product</th><th style="width:15%">SKU</th><th class="center" style="width:10%">Stock</th><th class="center" style="width:10%">Low Alert</th><th class="right" style="width:10%">Price</th><th class="center" style="width:10%">Status</th></tr></thead><tbody>
  ${cat.items.map((item, idx) => {
    const isLow = item.quantity <= item.lowStockThreshold;
    const isNeg = item.quantity < 0;
    const statusClass = isNeg ? 'negative' : isLow ? 'low-stock' : 'ok';
    const statusText = isNeg ? 'NEGATIVE' : isLow ? 'LOW' : 'OK';
    return `<tr${isNeg ? ' class="negative"' : ''}><td>${idx + 1}</td><td>${item.name}${item.isDiscountable ? ' <span style="color:#16a34a;font-size:9px;">(10% off)</span>' : ''}</td><td class="sku">${item.sku || '-'}</td><td class="center" style="font-weight:600;${isNeg ? 'color:#dc2626;' : ''}">${item.quantity}</td><td class="center">${item.lowStockThreshold}</td><td class="right">${item.price ? '$' + parseFloat(item.price).toFixed(2) : '-'}</td><td class="center"><span class="${statusClass}">${statusText}</span></td></tr>`;
  }).join('')}
  </tbody></table></div>`;
}).join('')}
<div class="footer">Omega Longevity Inventory Report &bull; ${now} &bull; Confidential</div>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }, [inventoryData]);

  // Export inventory as CSV
  const handleExportCSV = useCallback(() => {
    if (!inventoryData) return;
    const rows: string[] = ['Category,Product,SKU,Quantity,Low Stock Threshold,Price,Discountable,Status'];
    inventoryData.forEach(cat => {
      cat.items.forEach(item => {
        const isLow = item.quantity <= item.lowStockThreshold;
        const isNeg = item.quantity < 0;
        const status = isNeg ? 'NEGATIVE' : isLow ? 'LOW' : 'OK';
        const name = item.name.includes(',') ? `"${item.name}"` : item.name;
        const catName = cat.name.includes(',') ? `"${cat.name}"` : cat.name;
        rows.push(`${catName},${name},${item.sku || ''},${item.quantity},${item.lowStockThreshold},${item.price || ''},${item.isDiscountable ? 'Yes' : 'No'},${status}`);
      });
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `omega-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory exported to CSV');
  }, [inventoryData]);

  // Filter items based on search, category, and negative stock filter
  const filteredData = inventoryData?.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || cat.id.toString() === selectedCategory;
      const matchesNegative = !showNegativeOnly || item.quantity < 0;
      return matchesSearch && matchesCategory && matchesNegative;
    }),
  })).filter((cat) => cat.items.length > 0 || (selectedCategory === "all" && !showNegativeOnly));

  // Calculate totals
  const totalItems = inventoryData?.reduce((sum, cat) => sum + cat.items.length, 0) || 0;
  const totalStock = inventoryData?.reduce(
    (sum, cat) => sum + cat.items.reduce((s, item) => s + item.quantity, 0),
    0
  ) || 0;

  // Categories excluded from negative stock alerts (loaded from settings, with defaults)
  const { data: excludedCategoriesSetting } = trpc.settings.get.useQuery({ key: 'inventory_excluded_categories' });
  const excludedAlertCategories = useMemo(() => {
    if (excludedCategoriesSetting) {
      try {
        const parsed = JSON.parse(excludedCategoriesSetting);
        return parsed.map((c: string) => c.toLowerCase());
      } catch { /* fall through to defaults */ }
    }
    // Defaults if no setting configured yet
    return [
      'limitless non-stock',
      'b grade uw branded products',
      'additional inventory - non store',
    ];
  }, [excludedCategoriesSetting]);

  // Calculate negative stock items (excluding non-restocked categories)
  const negativeStockItems = useMemo(() => {
    if (!inventoryData) return [];
    return inventoryData
      .filter(cat => !excludedAlertCategories.includes(cat.name.toLowerCase()))
      .flatMap(cat =>
        cat.items
          .filter(item => item.quantity < 0)
          .map(item => ({ ...item, categoryName: cat.name }))
      ).sort((a, b) => a.quantity - b.quantity); // Most negative first
  }, [inventoryData]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Warehouse className="h-8 w-8" />
              Omega Inventory
            </h1>
            <p className="text-muted-foreground">
              Manage your physical inventory and track stock levels
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsBulkRestockOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
              <ClipboardList className="h-4 w-4 mr-2" />
              Bulk Restock
            </Button>
            <Button variant="outline" onClick={() => setIsDuplicateScanOpen(true)}>
              <Scan className="h-4 w-4 mr-2" />
              Scan Duplicates
              {duplicateGroups.length > 0 && (
                <Badge variant="destructive" className="ml-2">{duplicateGroups.length}</Badge>
              )}
            </Button>
            <AddCategoryDialog
              isOpen={isAddCategoryOpen}
              onOpenChange={setIsAddCategoryOpen}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              newCategoryDescription={newCategoryDescription}
              setNewCategoryDescription={setNewCategoryDescription}
              onSubmit={handleCreateCategory}
              isPending={createCategoryMutation.isPending}
            />
            <AddItemDialog
              isOpen={isAddItemOpen}
              onOpenChange={setIsAddItemOpen}
              categories={categories}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              newItemCategory={newItemCategory}
              setNewItemCategory={setNewItemCategory}
              newItemQuantity={newItemQuantity}
              setNewItemQuantity={setNewItemQuantity}
              newItemPrice={newItemPrice}
              setNewItemPrice={setNewItemPrice}
              newItemSku={newItemSku}
              setNewItemSku={setNewItemSku}
              newItemNotes={newItemNotes}
              setNewItemNotes={setNewItemNotes}
              newItemLowStock={newItemLowStock}
              setNewItemLowStock={setNewItemLowStock}
              newItemIsDiscountable={newItemIsDiscountable}
              setNewItemIsDiscountable={setNewItemIsDiscountable}
              onSubmit={handleCreateItem}
              isPending={createItemMutation.isPending}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Layers className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="mapping">
              <Link2 className="h-4 w-4 mr-2" />
              Protocol Mapping
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalItems}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStock}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  <FolderPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{categories?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{lowStockItems?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className={negativeStockItems.length > 0 ? 'border-red-300 dark:border-red-800' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Negative Stock</CardTitle>
                  <AlertTriangle className={`h-4 w-4 ${negativeStockItems.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${negativeStockItems.length > 0 ? 'text-red-600' : ''}`}>
                    {negativeStockItems.length}
                  </div>
                  {negativeStockItems.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">Needs restocking</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Negative Stock Alert Banner */}
            {negativeStockItems.length > 0 && (
              <Card className="border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <CardTitle className="text-red-700 dark:text-red-400 text-base">
                        Negative Stock Alert
                      </CardTitle>
                      <Badge variant="destructive" className="text-xs">
                        {negativeStockItems.length} {negativeStockItems.length === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                    <Button
                      variant={showNegativeOnly ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setShowNegativeOnly(!showNegativeOnly)}
                      className={showNegativeOnly ? '' : 'border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950'}
                    >
                      {showNegativeOnly ? 'Show All' : 'Show Only Negative'}
                    </Button>
                  </div>
                  <CardDescription className="text-red-600/80 dark:text-red-400/80 mt-1">
                    These items have been sold beyond available stock. Restock needed to bring levels back to positive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {negativeStockItems.slice(0, 9).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-md px-3 py-2 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        onClick={() => {
                          openAdjustDialog(item, 'restock');
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                        </div>
                        <Badge variant="destructive" className="ml-2 shrink-0 font-mono">
                          {item.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {negativeStockItems.length > 9 && (
                    <p className="text-xs text-red-600/70 mt-2 text-center">
                      ...and {negativeStockItems.length - 9} more. Click "Show Only Negative" to see all.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inventory List by Category */}
            {isLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Loading Inventory...</CardTitle>
                </CardHeader>
                <CardContent>
                  <TableSkeleton columns={7} rows={10} />
                </CardContent>
              </Card>
            ) : filteredData && filteredData.length > 0 ? (
              <Accordion type="multiple" defaultValue={filteredData.map((cat) => cat.id.toString())} className="space-y-4">
                {filteredData.map((category) => (
                  <AccordionItem key={category.id} value={category.id.toString()} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{category.name}</span>
                        <Badge variant="secondary">{category.items.length} items</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {category.items.length > 0 ? (
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[45%]">Product</TableHead>
                              <TableHead className="text-center w-[12%]">Stock</TableHead>
                              <TableHead className="text-center w-[12%]">Low Alert</TableHead>
                              <TableHead className="text-center w-[12%]">Price</TableHead>
                              <TableHead className="text-right w-[19%]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.items.map((item) => {
                              // Highlight negative stock items in red (only for restocked categories), zero-quantity in yellow for B Grade/Additional
                              const isCategoryExcluded = excludedAlertCategories.includes(category.name.toLowerCase());
                              const isNegativeStock = item.quantity < 0 && !isCategoryExcluded;
                              const isZeroStockHighlight = item.quantity === 0 && 
                                (category.name.toLowerCase().includes('b grade') || 
                                 category.name.toLowerCase().includes('additional inventory'));
                              const rowClass = isNegativeStock 
                                ? 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500' 
                                : isZeroStockHighlight 
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                                  : '';
                              return (
                              <TableRow 
                                key={item.id}
                                className={rowClass}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{item.name}</span>
                                    {item.isDiscountable && (
                                      <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                        10% off
                                      </Badge>
                                    )}
                                    {item.sku && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        SKU: {item.sku}
                                      </span>
                                    )}
                                  </div>
                                  {item.notes && (
                                    <div 
                                      className="text-xs text-muted-foreground mt-1 prose prose-xs max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_a]:underline line-clamp-2 overflow-hidden"
                                      dangerouslySetInnerHTML={{ __html: item.notes }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={item.quantity < 0 ? "destructive" : item.quantity <= item.lowStockThreshold ? "destructive" : "default"}
                                    className={item.quantity < 0 && !isCategoryExcluded ? 'animate-pulse' : ''}
                                  >
                                    {item.quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                  {item.lowStockThreshold}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.price ? `$${parseFloat(item.price).toFixed(2)}` : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openAdjustDialog(item, "sell")}
                                      title="Sell"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openAdjustDialog(item, "restock")}
                                      title="Restock"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditItemDialog(item)}
                                      title="Edit"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openHistoryDialog(item)}
                                      title="History"
                                    >
                                      <History className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm("Remove this item from inventory?")) {
                                          deleteItemMutation.mutate({ id: item.id });
                                        }
                                      }}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No items in this category
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No inventory items yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding categories and items to track your inventory
                  </p>
                  <Button onClick={() => setIsAddCategoryOpen(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add First Category
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Categories</CardTitle>
                <CardDescription>
                  Edit, reorder, or delete inventory categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categories && categories.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Icon</TableHead>
                        <TableHead>Category Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Color</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Items</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat, index) => {
                        const itemCount = inventoryData?.find(c => c.id === cat.id)?.items.length || 0;
                        return (
                          <TableRow key={cat.id} className={flagOff((cat as any).isActive) ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                {(cat as any).iconUrl ? (
                                  <img
                                    src={(cat as any).iconUrl}
                                    alt={cat.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {cat.description || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {(cat as any).accentColor ? (
                                <div
                                  className="h-6 w-6 rounded-full mx-auto border border-border"
                                  style={{ backgroundColor: (cat as any).accentColor }}
                                  title={(cat as any).accentColor}
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {flagOff((cat as any).isActive) ? (
                                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Hidden
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visible
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{itemCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (index > 0) {
                                      updateCategoryMutation.mutate({
                                        id: cat.id,
                                        sortOrder: (categories[index - 1].sortOrder || index - 1) - 1,
                                      });
                                    }
                                  }}
                                  disabled={index === 0}
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (index < categories.length - 1) {
                                      updateCategoryMutation.mutate({
                                        id: cat.id,
                                        sortOrder: (categories[index + 1].sortOrder || index + 1) + 1,
                                      });
                                    }
                                  }}
                                  disabled={index === categories.length - 1}
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditCategoryDialog(cat)}
                                  title="Edit"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => {
                                    if (itemCount > 0) {
                                      toast.error("Cannot delete category with items. Move or delete items first.");
                                      return;
                                    }
                                    if (confirm(`Delete category "${cat.name}"?`)) {
                                      deleteCategoryMutation.mutate({ id: cat.id });
                                    }
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No categories yet. Add your first category to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Protocol to Inventory Mapping
                </CardTitle>
                <CardDescription>
                  Connect protocol template items to physical inventory items. When a client approves their protocol, the mapped inventory items will be automatically deducted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MappingTab inventoryData={inventoryData} categories={categories} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Item Dialog */}
        <EditItemDialog
          isOpen={isEditItemOpen}
          onOpenChange={setIsEditItemOpen}
          categories={categories}
          editItemName={editItemName}
          setEditItemName={setEditItemName}
          editItemCategory={editItemCategory}
          setEditItemCategory={setEditItemCategory}
          editItemPrice={editItemPrice}
          setEditItemPrice={setEditItemPrice}
          editItemSku={editItemSku}
          setEditItemSku={setEditItemSku}
          editItemNotes={editItemNotes}
          setEditItemNotes={setEditItemNotes}
          editItemLowStock={editItemLowStock}
          setEditItemLowStock={setEditItemLowStock}
          editItemIsDiscountable={editItemIsDiscountable}
          setEditItemIsDiscountable={setEditItemIsDiscountable}
          onSubmit={handleUpdateItem}
          isPending={updateItemMutation.isPending}
        />

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category settings including icon, color theme, and visibility
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Category Icon */}
              <div className="space-y-2">
                <Label>Category Icon</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30">
                    {editCategoryIconUrl ? (
                      <img
                        src={editCategoryIconUrl}
                        alt="Category icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor="category-icon-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingCategoryIcon ? 'Uploading...' : 'Upload Icon'}
                    </Label>
                    <input
                      id="category-icon-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCategoryIconUpload}
                      disabled={isUploadingCategoryIcon}
                    />
                    {editCategoryIconUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-destructive"
                        onClick={() => setEditCategoryIconUrl('')}
                      >
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 128x128px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Name */}
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Brief description of this category"
                  value={editCategoryDescription}
                  onChange={(e) => setEditCategoryDescription(e.target.value)}
                />
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Accent Color
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editCategoryAccentColor || '#f97316'}
                    onChange={(e) => setEditCategoryAccentColor(e.target.value)}
                    className="h-10 w-16 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={editCategoryAccentColor}
                    onChange={(e) => setEditCategoryAccentColor(e.target.value)}
                    placeholder="#f97316"
                    className="flex-1"
                  />
                  {editCategoryAccentColor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditCategoryAccentColor('')}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This color will be used for category highlights in the store
                </p>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {editCategoryIsActive ? (
                    <Eye className="h-5 w-5 text-green-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label className="text-sm font-medium">
                      {editCategoryIsActive ? 'Visible in Store' : 'Hidden from Store'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {editCategoryIsActive
                        ? 'This category and its items are shown to customers'
                        : 'This category is hidden from the store'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={editCategoryIsActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditCategoryIsActive(!editCategoryIsActive)}
                >
                  {editCategoryIsActive ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCategory} disabled={updateCategoryMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Scanner Dialog */}
        <Dialog open={isDuplicateScanOpen} onOpenChange={setIsDuplicateScanOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Duplicate Item Scanner
              </DialogTitle>
              <DialogDescription>
                Found {duplicateGroups.length} potential duplicate groups in your inventory
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
              {duplicateGroups.length > 0 ? (
                duplicateGroups.map((group, groupIndex) => (
                  <Card key={groupIndex}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Copy className="h-4 w-4 text-amber-500" />
                        {group.similarity}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {item.categoryName}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{item.quantity}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setIsDuplicateScanOpen(false);
                                      openEditItemDialog(item);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => {
                                      if (confirm(`Delete "${item.name}"?`)) {
                                        deleteItemMutation.mutate({ id: item.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Scan className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
                  <p className="text-muted-foreground">
                    Your inventory looks clean! No similar or duplicate items detected.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateScanOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust Quantity Dialog */}
        <AdjustQuantityDialog
          isOpen={isAdjustOpen}
          onOpenChange={setIsAdjustOpen}
          adjustType={adjustType}
          selectedItem={selectedItem}
          adjustQuantity={adjustQuantity}
          setAdjustQuantity={setAdjustQuantity}
          adjustNotes={adjustNotes}
          setAdjustNotes={setAdjustNotes}
          onSubmit={handleAdjust}
          isPending={sellMutation.isPending || restockMutation.isPending || adjustMutation.isPending}
        />

        {/* Transaction History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transaction History</DialogTitle>
              <DialogDescription>
                {selectedItem?.name} - Recent inventory changes
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Change</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {toLocaleDateStringMT(tx.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "sale" ? "destructive" : tx.type === "restock" ? "default" : "secondary"}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={tx.quantityChange > 0 ? "text-green-600" : "text-red-600"}>
                            {tx.quantityChange > 0 ? "+" : ""}{tx.quantityChange}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({tx.previousQuantity}→{tx.newQuantity})
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {tx.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No transaction history yet
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <BulkRestockDialog
          open={isBulkRestockOpen}
          onOpenChange={setIsBulkRestockOpen}
          inventoryData={inventoryData}
          onSuccess={() => {
            saveScrollPosition();
            utils.inventory.getWithCategories.invalidate();
            utils.inventory.getLowStock.invalidate();
          }}
        />
      </div>
    </AdminLayout>
  );
}


// Mapping Tab Component
function MappingTab({ inventoryData, categories }: { inventoryData: any; categories: any }) {
  const [searchProtocol, setSearchProtocol] = useState("");
  const [searchInventory, setSearchInventory] = useState("");
  const [selectedProtocolItem, setSelectedProtocolItem] = useState<any>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [quantityPerUnit, setQuantityPerUnit] = useState(1);
  const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);
  const [createFromProtocolItem, setCreateFromProtocolItem] = useState<any>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemLowStock, setNewItemLowStock] = useState(5);

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

  const utils = trpc.useUtils();

  // Get protocol items (from the protocol item library)
  const { data: protocolItems } = trpc.protocolItem.list.useQuery();
  const { data: mappings } = trpc.inventory.getMappings.useQuery();

  const createMappingMutation = trpc.inventory.createMapping.useMutation({
    onSuccess: () => {
      toast.success("Mapping created successfully");
      saveScrollPosition();
      utils.inventory.getMappings.invalidate();
      setIsAddMappingOpen(false);
      setSelectedProtocolItem(null);
      setSelectedInventoryItem(null);
      setQuantityPerUnit(1);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMappingMutation = trpc.inventory.deleteMapping.useMutation({
    onSuccess: () => {
      toast.success("Mapping removed");
      saveScrollPosition();
      utils.inventory.getMappings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createItemMutation = trpc.inventory.createItem.useMutation({
    onSuccess: (newItem) => {
      toast.success("Inventory item created");
      saveScrollPosition();
      utils.inventory.listCategories.invalidate();
      // Auto-create mapping if we have a protocol item from unmapped list
      if (createFromProtocolItem) {
        createMappingMutation.mutate({
          protocolItemId: createFromProtocolItem.id,
          inventoryItemId: newItem.id,
          quantityPerUnit: 1,
        });
      } else if (selectedProtocolItem && isAddMappingOpen) {
        // If created from mapping dialog, auto-select the new item
        setSelectedInventoryItem({ ...newItem, categoryName: categories?.find((c: any) => c.id === newItem.categoryId)?.name || "Unknown" });
      }
      setIsCreateInventoryOpen(false);
      setCreateFromProtocolItem(null);
      setNewItemName("");
      setNewItemCategory("");
      setNewItemQuantity(0);
      setNewItemPrice("");
      setNewItemLowStock(5);
    },
    onError: (error) => toast.error(error.message),
  });

  const openCreateFromProtocol = (protocolItem: any) => {
    setCreateFromProtocolItem(protocolItem);
    setNewItemName(protocolItem.name);
    setNewItemCategory("");
    setNewItemQuantity(0);
    setNewItemPrice("");
    setNewItemLowStock(5);
    setIsCreateInventoryOpen(true);
  };

  // Filter protocol items
  const filteredProtocolItems = protocolItems?.filter((item) =>
    item.name.toLowerCase().includes(searchProtocol.toLowerCase())
  ) || [];

  // Flatten inventory items for selection
  const allInventoryItems = inventoryData?.flatMap((cat: any) =>
    cat.items.map((item: any) => ({ ...item, categoryName: cat.name }))
  ) || [];

  const filteredInventoryItems = allInventoryItems.filter((item: any) =>
    item.name.toLowerCase().includes(searchInventory.toLowerCase())
  );

  // Get mapped protocol item IDs
  const mappedProtocolItemIds = new Set(mappings?.map((m: any) => m.protocolItemId) || []);

  return (
    <div className="space-y-6">
      {/* Add Mapping Button */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {mappings?.length || 0} mappings configured
          </p>
        </div>
        <Dialog open={isAddMappingOpen} onOpenChange={setIsAddMappingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Protocol-to-Inventory Mapping</DialogTitle>
              <DialogDescription>
                Link a protocol item to a physical inventory item. When a client approves a protocol containing this item, the inventory will be automatically deducted.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
              {/* Protocol Item Selection */}
              <div className="space-y-3">
                <Label className="font-semibold">Protocol Item</Label>
                <Input
                  placeholder="Search protocol items..."
                  value={searchProtocol}
                  onChange={(e) => setSearchProtocol(e.target.value)}
                />
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  {filteredProtocolItems.length > 0 ? (
                    filteredProtocolItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2 cursor-pointer hover:bg-muted border-b last:border-b-0 ${
                          selectedProtocolItem?.id === item.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedProtocolItem(item)}
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.itemType}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-muted-foreground text-sm">
                      No protocol items found
                    </p>
                  )}
                </div>
                {selectedProtocolItem && (
                  <div className="p-2 bg-primary/10 rounded-md">
                    <p className="text-sm font-medium">Selected: {selectedProtocolItem.name}</p>
                  </div>
                )}
              </div>

              {/* Inventory Item Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Inventory Item</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (selectedProtocolItem) {
                        openCreateFromProtocol(selectedProtocolItem);
                      } else {
                        setCreateFromProtocolItem(null);
                        setNewItemName("");
                        setNewItemCategory("");
                        setNewItemQuantity(0);
                        setNewItemPrice("");
                        setNewItemLowStock(5);
                        setIsCreateInventoryOpen(true);
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create New
                  </Button>
                </div>
                <Input
                  placeholder="Search inventory items..."
                  value={searchInventory}
                  onChange={(e) => setSearchInventory(e.target.value)}
                />
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  {filteredInventoryItems.length > 0 ? (
                    filteredInventoryItems.map((item: any) => (
                      <div
                        key={item.id}
                        className={`p-2 cursor-pointer hover:bg-muted border-b last:border-b-0 ${
                          selectedInventoryItem?.id === item.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedInventoryItem(item)}
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.categoryName} • Stock: {item.quantity}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-muted-foreground text-sm">
                      No inventory items found
                    </p>
                  )}
                </div>
                {selectedInventoryItem && (
                  <div className="p-2 bg-primary/10 rounded-md">
                    <p className="text-sm font-medium">Selected: {selectedInventoryItem.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Per Unit */}
            <div className="space-y-2">
              <Label>Quantity to Deduct Per Protocol Item</Label>
              <Input
                type="number"
                min={1}
                value={quantityPerUnit}
                onChange={(e) => setQuantityPerUnit(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                How many inventory units should be deducted for each protocol item?
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddMappingOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedProtocolItem || !selectedInventoryItem) {
                    toast.error("Please select both a protocol item and an inventory item");
                    return;
                  }
                  createMappingMutation.mutate({
                    protocolItemId: selectedProtocolItem.id,
                    inventoryItemId: selectedInventoryItem.id,
                    quantityPerUnit,
                  });
                }}
                disabled={!selectedProtocolItem || !selectedInventoryItem || createMappingMutation.isPending}
              >
                Create Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Mappings */}
      {mappings && mappings.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol Item</TableHead>
              <TableHead>→</TableHead>
              <TableHead>Inventory Item</TableHead>
              <TableHead className="text-center">Qty/Unit</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping: any) => (
              <TableRow key={mapping.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{mapping.protocolItem?.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      {mapping.protocolItem?.itemType}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{mapping.inventoryItem?.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      {inventoryData?.find((c: any) => c.id === mapping.inventoryItem?.categoryId)?.name || "Unknown Category"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{mapping.quantityPerUnit}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      (mapping.inventoryItem?.quantity || 0) <= (mapping.inventoryItem?.lowStockThreshold || 5)
                        ? "destructive"
                        : "default"
                    }
                  >
                    {mapping.inventoryItem?.quantity || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Remove this mapping?")) {
                        deleteMappingMutation.mutate({ id: mapping.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Mappings Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create mappings to automatically deduct inventory when protocols are approved.
          </p>
          <Button onClick={() => setIsAddMappingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Mapping
          </Button>
        </div>
      )}

      {/* Unmapped Protocol Items */}
      {protocolItems && protocolItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unmapped Protocol Items</CardTitle>
            <CardDescription>
              These protocol items don't have inventory mappings yet. Click to map or create new inventory item.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {protocolItems
                .filter((item) => !mappedProtocolItemIds.has(item.id))
                .slice(0, 30)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                    <div>
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.itemType})</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProtocolItem(item);
                          setIsAddMappingOpen(true);
                        }}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Map
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openCreateFromProtocol(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Item
                      </Button>
                    </div>
                  </div>
                ))}
              {protocolItems.filter((item) => !mappedProtocolItemIds.has(item.id)).length > 30 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{protocolItems.filter((item) => !mappedProtocolItemIds.has(item.id)).length - 30} more unmapped items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Inventory Item Dialog */}
      <Dialog open={isCreateInventoryOpen} onOpenChange={setIsCreateInventoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Inventory Item</DialogTitle>
            <DialogDescription>
              {createFromProtocolItem 
                ? `Create a new inventory item from "${createFromProtocolItem.name}" and automatically map it.`
                : "Create a new inventory item to add to your inventory."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Alert</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItemLowStock}
                  onChange={(e) => setNewItemLowStock(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateInventoryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newItemName || !newItemCategory) {
                  toast.error("Please fill in name and category");
                  return;
                }
                createItemMutation.mutate({
                  name: newItemName,
                  categoryId: parseInt(newItemCategory),
                  quantity: newItemQuantity,
                  price: newItemPrice || undefined,
                  lowStockThreshold: newItemLowStock,
                  isDiscountable: false,
                });
              }}
              disabled={createItemMutation.isPending}
            >
              Create & Map
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
