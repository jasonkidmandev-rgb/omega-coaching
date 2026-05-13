import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal,
  FileText,
  Pill,
  EyeOff,
  ExternalLink,
  Star,
  Search,
  X,
  Filter,
  Upload,
  ImageIcon,
} from "lucide-react";

type PeptideCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Peptide = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  vialAmount: string | null;
  reconstitutionMl: string | null;
  dosage: string | null;
  syringeUnits: string | null;
  timing: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
  formType: string | null;
  productUrl: string | null;
  productImageUrl: string | null;
  imageUrl: string | null;
  pdfUrl: string | null;
  supplierName: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  priceRange: string | null;
  researchDisclaimer: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function PeptideCheatSheetAdmin() {
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFormType, setFilterFormType] = useState<string>("all");
  
  // Category dialog state
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    category?: PeptideCategory;
  }>({ open: false, mode: "create" });
  
  // Peptide dialog state
  const [peptideDialog, setPeptideDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    peptide?: Peptide;
    categoryId?: number;
  }>({ open: false, mode: "create" });
  
  // Form state for category
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    color: "",
    icon: "",
    isActive: true,
  });
  
  // Form state for peptide
  const [peptideForm, setPeptideForm] = useState({
    categoryId: 0,
    name: "",
    slug: "",
    description: "",
    vialAmount: "",
    reconstitutionMl: "",
    dosage: "",
    syringeUnits: "",
    timing: "",
    frequency: "",
    duration: "",
    notes: "",
    formType: "injectable",
    productUrl: "",
    productImageUrl: "",
    imageUrl: "",
    pdfUrl: "",
    supplierName: "Limitless Biotech",
    isActive: true,
    isFeatured: false,
    priceRange: "",
    researchDisclaimer: "",
  });
  
  // Queries
  const { data: categories, refetch: refetchCategories } = trpc.peptide.listCategories.useQuery();
  const { data: peptides, refetch: refetchPeptides } = trpc.peptide.listPeptides.useQuery();
  
  // Filtered peptides based on search and filters
  const filteredPeptides = useMemo(() => {
    if (!peptides) return [];
    
    return peptides.filter(peptide => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          peptide.name.toLowerCase().includes(query) ||
          (peptide.description?.toLowerCase().includes(query)) ||
          (peptide.dosage?.toLowerCase().includes(query)) ||
          (peptide.notes?.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (filterCategory !== "all" && peptide.categoryId !== parseInt(filterCategory)) {
        return false;
      }
      
      // Status filter
      if (filterStatus === "active" && !peptide.isActive) return false;
      if (filterStatus === "inactive" && peptide.isActive) return false;
      if (filterStatus === "featured" && !peptide.isFeatured) return false;
      
      // Form type filter
      if (filterFormType !== "all" && peptide.formType !== filterFormType) {
        return false;
      }
      
      return true;
    });
  }, [peptides, searchQuery, filterCategory, filterStatus, filterFormType]);
  
  // Get unique form types for filter dropdown
  const formTypes = useMemo(() => {
    if (!peptides) return [];
    const types = new Set(peptides.map(p => p.formType).filter(Boolean));
    return Array.from(types) as string[];
  }, [peptides]);
  
  // Check if any filters are active
  const hasActiveFilters = searchQuery || filterCategory !== "all" || filterStatus !== "all" || filterFormType !== "all";
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
    setFilterFormType("all");
  };
  
  // Mutations
  const createCategory = trpc.peptide.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      refetchCategories();
      setCategoryDialog({ open: false, mode: "create" });
    },
    onError: (error) => {
      toast.error(`Error creating category: ${error.message}`);
    },
  });
  
  const updateCategory = trpc.peptide.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      refetchCategories();
      setCategoryDialog({ open: false, mode: "create" });
    },
    onError: (error) => {
      toast.error(`Error updating category: ${error.message}`);
    },
  });
  
  const deleteCategory = trpc.peptide.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      refetchCategories();
      refetchPeptides();
    },
    onError: (error) => {
      toast.error(`Error deleting category: ${error.message}`);
    },
  });
  
  const createPeptide = trpc.peptide.createPeptide.useMutation({
    onSuccess: () => {
      toast.success("Peptide created successfully");
      refetchPeptides();
      setPeptideDialog({ open: false, mode: "create" });
    },
    onError: (error) => {
      toast.error(`Error creating peptide: ${error.message}`);
    },
  });
  
  const updatePeptide = trpc.peptide.updatePeptide.useMutation({
    onSuccess: () => {
      toast.success("Peptide updated successfully");
      refetchPeptides();
      setPeptideDialog({ open: false, mode: "create" });
    },
    onError: (error) => {
      toast.error(`Error updating peptide: ${error.message}`);
    },
  });
  
  const deletePeptide = trpc.peptide.deletePeptide.useMutation({
    onSuccess: () => {
      toast.success("Peptide deleted successfully");
      refetchPeptides();
    },
    onError: (error) => {
      toast.error(`Error deleting peptide: ${error.message}`);
    },
  });
  
  // Handlers
  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };
  
  const openCreateCategory = () => {
    setCategoryForm({ name: "", slug: "", description: "", color: "", icon: "", isActive: true });
    setCategoryDialog({ open: true, mode: "create" });
  };
  
  const openEditCategory = (category: PeptideCategory) => {
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      color: category.color || "",
      icon: category.icon || "",
      isActive: category.isActive,
    });
    setCategoryDialog({ open: true, mode: "edit", category });
  };
  
  const handleSaveCategory = () => {
    const data = {
      ...categoryForm,
      slug: categoryForm.slug || generateSlug(categoryForm.name),
    };
    if (categoryDialog.mode === "create") {
      createCategory.mutate(data);
    } else if (categoryDialog.category) {
      updateCategory.mutate({ id: categoryDialog.category.id, ...data });
    }
  };
  
  const handleDeleteCategory = (category: PeptideCategory) => {
    if (confirm(`Are you sure you want to delete "${category.name}" and all its peptides?`)) {
      deleteCategory.mutate({ id: category.id });
    }
  };
  
  const openCreatePeptide = (categoryId: number) => {
    setPeptideForm({
      categoryId,
      name: "",
      slug: "",
      description: "",
      vialAmount: "",
      reconstitutionMl: "",
      dosage: "",
      syringeUnits: "",
      timing: "",
      frequency: "",
      duration: "",
      notes: "",
      formType: "injectable",
      productUrl: "",
      productImageUrl: "",
      imageUrl: "",
      pdfUrl: "",
      supplierName: "Limitless Biotech",
      isActive: true,
      isFeatured: false,
      priceRange: "",
      researchDisclaimer: "",
    });
    setPeptideDialog({ open: true, mode: "create", categoryId });
  };
  
  const openEditPeptide = (peptide: Peptide) => {
    setPeptideForm({
      categoryId: peptide.categoryId,
      name: peptide.name,
      slug: peptide.slug,
      description: peptide.description || "",
      vialAmount: peptide.vialAmount || "",
      reconstitutionMl: peptide.reconstitutionMl || "",
      dosage: peptide.dosage || "",
      syringeUnits: peptide.syringeUnits || "",
      timing: peptide.timing || "",
      frequency: peptide.frequency || "",
      duration: peptide.duration || "",
      notes: peptide.notes || "",
      formType: peptide.formType || "injectable",
      productUrl: peptide.productUrl || "",
      productImageUrl: peptide.productImageUrl || "",
      imageUrl: peptide.imageUrl || "",
      pdfUrl: peptide.pdfUrl || "",
      supplierName: peptide.supplierName || "Limitless Biotech",
      isActive: peptide.isActive,
      isFeatured: peptide.isFeatured,
      priceRange: peptide.priceRange || "",
      researchDisclaimer: peptide.researchDisclaimer || "",
    });
    setPeptideDialog({ open: true, mode: "edit", peptide });
  };
  
  const handleSavePeptide = () => {
    const data = {
      ...peptideForm,
      slug: peptideForm.slug || generateSlug(peptideForm.name),
    };
    if (peptideDialog.mode === "create") {
      createPeptide.mutate(data);
    } else if (peptideDialog.peptide) {
      updatePeptide.mutate({ id: peptideDialog.peptide.id, ...data });
    }
  };
  
  const handleDeletePeptide = (peptide: Peptide) => {
    if (confirm(`Are you sure you want to delete "${peptide.name}"?`)) {
      deletePeptide.mutate({ id: peptide.id });
    }
  };
  
  // Get peptides for a category (with filters applied)
  const getPeptidesForCategory = (categoryId: number) => {
    return filteredPeptides.filter(p => p.categoryId === categoryId);
  };
  
  // Get total peptide count for stats
  const totalPeptides = peptides?.length || 0;
  const activePeptides = peptides?.filter(p => p.isActive).length || 0;
  const featuredPeptides = peptides?.filter(p => p.isFeatured).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Peptide Cheat Sheet Manager
            </h1>
            <p className="text-gray-600 mt-1">
              Manage peptide categories and information displayed on the public cheat sheet
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/peptide-cheat-sheet', '_blank')}
              className="border-gray-300"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Page
            </Button>
            <Button onClick={openCreateCategory} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{categories?.length || 0}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{totalPeptides}</div>
              <div className="text-sm text-gray-600">Total Peptides</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{activePeptides}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">{featuredPeptides}</div>
              <div className="text-sm text-gray-600">Featured</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search and Filters */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <Input
                  placeholder="Search peptides by name, description, dosage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-100 border-gray-300 text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Category Filter */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px] bg-gray-100 border-gray-300 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] bg-gray-100 border-gray-300 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Form Type Filter */}
              <Select value={filterFormType} onValueChange={setFilterFormType}>
                <SelectTrigger className="w-[160px] bg-gray-100 border-gray-300 text-white">
                  <SelectValue placeholder="All Forms" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Forms</SelectItem>
                  {formTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-gray-600 hover:text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            {/* Filter Results Count */}
            {hasActiveFilters && (
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredPeptides.length} of {totalPeptides} peptides
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="space-y-4">
          {(categories || []).map((category) => {
            const categoryPeptides = getPeptidesForCategory(category.id);
            // Skip categories with no matching peptides when filtering
            if (hasActiveFilters && categoryPeptides.length === 0) return null;
            
            return (
              <Card key={category.id} className="bg-white border-gray-200">
                <Collapsible
                  open={expandedCategories.has(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                          <div>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                              {category.name}
                              {!category.isActive && (
                                <Badge variant="secondary" className="bg-gray-200">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Hidden
                                </Badge>
                              )}
                            </CardTitle>
                            {category.description && (
                              <CardDescription className="text-gray-600">
                                {category.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Badge variant="outline" className="border-gray-300 text-gray-600">
                            {categoryPeptides.length} peptides
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Category options">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-gray-200">
                              <DropdownMenuItem onClick={() => openEditCategory(category)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCreatePeptide(category.id)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Peptide
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteCategory(category)}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Category
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {categoryPeptides.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No peptides in this category</p>
                            <Button
                              variant="link"
                              onClick={() => openCreatePeptide(category.id)}
                              className="text-orange-400"
                            >
                              Add the first peptide
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto"><table className="w-full">
                              <thead className="bg-gray-100/50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium text-gray-700">Name</th>
                                  <th className="text-left p-3 text-sm font-medium text-gray-700">Dosage</th>
                                  <th className="text-left p-3 text-sm font-medium text-gray-700">Form</th>
                                  <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                                  <th className="text-right p-3 text-sm font-medium text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryPeptides.map((peptide) => (
                                  <tr key={peptide.id} className="border-t border-gray-200 hover:bg-gray-100/30">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">{peptide.name}</span>
                                        {peptide.isFeatured && (
                                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        )}
                                        {peptide.productImageUrl && (
                                          <ImageIcon className="h-4 w-4 text-blue-400" />
                                        )}
                                      </div>
                                      {peptide.description && (
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                          {peptide.description}
                                        </p>
                                      )}
                                    </td>
                                    <td className="p-3 text-gray-700 font-mono text-sm">
                                      {peptide.dosage || '-'}
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="outline" className="border-gray-300 text-gray-700">
                                        {peptide.formType || 'injectable'}
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      {peptide.isActive ? (
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                          Active
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-slate-500/20 text-gray-600 border-gray-400/30">
                                          Inactive
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" aria-label="Peptide options">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white border-gray-200">
                                          <DropdownMenuItem onClick={() => openEditPeptide(peptide)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit Peptide
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => handleDeletePeptide(peptide)}
                                            className="text-red-400 focus:text-red-400"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Peptide
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
        
        {/* Empty State */}
        {(!categories || categories.length === 0) && (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Categories Yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first peptide category.</p>
              <Button onClick={openCreateCategory} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
        <DialogContent className="bg-white border-gray-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.mode === "create" ? "Create Category" : "Edit Category"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {categoryDialog.mode === "create" 
                ? "Add a new peptide category to organize your cheat sheet."
                : "Update the category details."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Healing & Recovery"
                className="bg-gray-100 border-gray-300"
              />
            </div>
            <div>
              <Label>Slug (auto-generated if empty)</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="healing-recovery"
                className="bg-gray-100 border-gray-300"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of this category..."
                className="bg-gray-100 border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active (visible on public page)</Label>
              <Switch
                checked={categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: "create" })}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              disabled={!categoryForm.name || createCategory.isPending || updateCategory.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {categoryDialog.mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Peptide Dialog */}
      <Dialog open={peptideDialog.open} onOpenChange={(open) => setPeptideDialog({ ...peptideDialog, open })}>
        <DialogContent className="bg-white border-gray-200 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {peptideDialog.mode === "create" ? "Add Peptide" : "Edit Peptide"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {peptideDialog.mode === "create" 
                ? "Add a new peptide to the cheat sheet."
                : "Update the peptide details."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={peptideForm.name}
                  onChange={(e) => setPeptideForm({ ...peptideForm, name: e.target.value })}
                  placeholder="e.g., BPC-157"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select 
                  value={peptideForm.categoryId.toString()} 
                  onValueChange={(v) => setPeptideForm({ ...peptideForm, categoryId: parseInt(v) })}
                >
                  <SelectTrigger className="bg-gray-100 border-gray-300">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Description / Purpose</Label>
              <Textarea
                value={peptideForm.description}
                onChange={(e) => setPeptideForm({ ...peptideForm, description: e.target.value })}
                placeholder="What is this peptide used for?"
                className="bg-gray-100 border-gray-300"
              />
            </div>
            
            {/* Dosing Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Dosage</Label>
                <Input
                  value={peptideForm.dosage}
                  onChange={(e) => setPeptideForm({ ...peptideForm, dosage: e.target.value })}
                  placeholder="e.g., 250-500mcg"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <Input
                  value={peptideForm.frequency}
                  onChange={(e) => setPeptideForm({ ...peptideForm, frequency: e.target.value })}
                  placeholder="e.g., 1-2x daily"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Duration</Label>
                <Input
                  value={peptideForm.duration}
                  onChange={(e) => setPeptideForm({ ...peptideForm, duration: e.target.value })}
                  placeholder="e.g., 4-8 weeks"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
            
            {/* Reconstitution Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Vial Amount</Label>
                <Input
                  value={peptideForm.vialAmount}
                  onChange={(e) => setPeptideForm({ ...peptideForm, vialAmount: e.target.value })}
                  placeholder="e.g., 5mg"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Reconstitution (mL)</Label>
                <Input
                  value={peptideForm.reconstitutionMl}
                  onChange={(e) => setPeptideForm({ ...peptideForm, reconstitutionMl: e.target.value })}
                  placeholder="e.g., 2mL"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Syringe Units</Label>
                <Input
                  value={peptideForm.syringeUnits}
                  onChange={(e) => setPeptideForm({ ...peptideForm, syringeUnits: e.target.value })}
                  placeholder="e.g., 10 units"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
            
            {/* Form Type & Timing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Form Type</Label>
                <Select 
                  value={peptideForm.formType} 
                  onValueChange={(v) => setPeptideForm({ ...peptideForm, formType: v })}
                >
                  <SelectTrigger className="bg-gray-100 border-gray-300">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="injectable">Injectable</SelectItem>
                    <SelectItem value="nasal">Nasal Spray</SelectItem>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="topical">Topical</SelectItem>
                    <SelectItem value="sublingual">Sublingual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Timing</Label>
                <Input
                  value={peptideForm.timing}
                  onChange={(e) => setPeptideForm({ ...peptideForm, timing: e.target.value })}
                  placeholder="e.g., Before bed"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
            
            {/* Product Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product URL</Label>
                <Input
                  value={peptideForm.productUrl}
                  onChange={(e) => setPeptideForm({ ...peptideForm, productUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Product Image URL</Label>
                <Input
                  value={peptideForm.productImageUrl}
                  onChange={(e) => setPeptideForm({ ...peptideForm, productImageUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
            
            {/* File Uploads */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Image URL</Label>
                <Input
                  value={peptideForm.imageUrl}
                  onChange={(e) => setPeptideForm({ ...peptideForm, imageUrl: e.target.value })}
                  placeholder="https://... or upload below"
                  className="bg-gray-100 border-gray-300"
                />
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="peptide-image-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.url) {
                          setPeptideForm({ ...peptideForm, imageUrl: data.url });
                          toast.success('Image uploaded successfully');
                        }
                      } catch (err) {
                        toast.error('Failed to upload image');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-gray-300"
                    onClick={() => document.getElementById('peptide-image-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                </div>
              </div>
              <div>
                <Label>PDF URL</Label>
                <Input
                  value={peptideForm.pdfUrl}
                  onChange={(e) => setPeptideForm({ ...peptideForm, pdfUrl: e.target.value })}
                  placeholder="https://... or upload below"
                  className="bg-gray-100 border-gray-300"
                />
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    id="peptide-pdf-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.url) {
                          setPeptideForm({ ...peptideForm, pdfUrl: data.url });
                          toast.success('PDF uploaded successfully');
                        }
                      } catch (err) {
                        toast.error('Failed to upload PDF');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-gray-300"
                    onClick={() => document.getElementById('peptide-pdf-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier Name</Label>
                <Input
                  value={peptideForm.supplierName}
                  onChange={(e) => setPeptideForm({ ...peptideForm, supplierName: e.target.value })}
                  placeholder="Limitless Biotech"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
              <div>
                <Label>Price Range</Label>
                <Input
                  value={peptideForm.priceRange}
                  onChange={(e) => setPeptideForm({ ...peptideForm, priceRange: e.target.value })}
                  placeholder="e.g., $50-100"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea
                value={peptideForm.notes}
                onChange={(e) => setPeptideForm({ ...peptideForm, notes: e.target.value })}
                placeholder="Additional notes or instructions..."
                className="bg-gray-100 border-gray-300"
              />
            </div>
            
            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={peptideForm.isActive}
                  onCheckedChange={(checked) => setPeptideForm({ ...peptideForm, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={peptideForm.isFeatured}
                  onCheckedChange={(checked) => setPeptideForm({ ...peptideForm, isFeatured: checked })}
                />
                <Label>Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeptideDialog({ open: false, mode: "create" })}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePeptide}
              disabled={!peptideForm.name || !peptideForm.categoryId || createPeptide.isPending || updatePeptide.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {peptideDialog.mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
