import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Settings, 
  FolderOpen, 
  ListChecks, 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical,
  Video,
  Star,
  ThumbsUp,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";

export default function OnboardingManager() {
  
  const utils = trpc.useUtils();
  
  // Queries
  const { data: settings, isLoading: settingsLoading } = trpc.onboarding.getSettings.useQuery();
  const { data: categories, isLoading: categoriesLoading } = trpc.onboarding.getAllCategories.useQuery();
  const { data: options, isLoading: optionsLoading } = trpc.onboarding.getAllOptions.useQuery();
  
  // Mutations
  const updateSettings = trpc.onboarding.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      utils.onboarding.getSettings.invalidate();
    },
  });
  
  const createCategory = trpc.onboarding.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      utils.onboarding.getAllCategories.invalidate();
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
  });
  
  const updateCategory = trpc.onboarding.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      utils.onboarding.getAllCategories.invalidate();
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
  });
  
  const deleteCategory = trpc.onboarding.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      utils.onboarding.getAllCategories.invalidate();
    },
  });
  
  const createOption = trpc.onboarding.createOption.useMutation({
    onSuccess: () => {
      toast.success("Option created");
      utils.onboarding.getAllOptions.invalidate();
      setOptionDialogOpen(false);
      resetOptionForm();
    },
  });
  
  const updateOption = trpc.onboarding.updateOption.useMutation({
    onSuccess: () => {
      toast.success("Option updated");
      utils.onboarding.getAllOptions.invalidate();
      setOptionDialogOpen(false);
      resetOptionForm();
    },
  });
  
  const deleteOption = trpc.onboarding.deleteOption.useMutation({
    onSuccess: () => {
      toast.success("Option deleted");
      utils.onboarding.getAllOptions.invalidate();
    },
  });
  
  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    welcomeTitle: "",
    welcomeSubtitle: "",
    videoUrl: "",
    videoPlaceholderText: "",
    stepTwoTitle: "",
    stepTwoSubtitle: "",
    stepThreeTitle: "",
    ctaButtonText: "",
    persistentButtonText: "",
    isActive: true,
  });
  
  // Category form state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    icon: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });
  
  // Option form state
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<number | null>(null);
  const [optionForm, setOptionForm] = useState({
    categoryId: 0,
    title: "",
    description: "",
    ctaText: "",
    linkUrl: "",
    linkType: "external" as "internal" | "external" | "modal",
    badge: "",
    badgeColor: "",
    icon: "",
    sortOrder: 0,
    isPopular: false,
    isRecommended: false,
    isActive: true,
  });
  
  // Initialize settings form when data loads
  useState(() => {
    if (settings) {
      setSettingsForm({
        welcomeTitle: settings.welcomeTitle || "",
        welcomeSubtitle: settings.welcomeSubtitle || "",
        videoUrl: settings.videoUrl || "",
        videoPlaceholderText: settings.videoPlaceholderText || "",
        stepTwoTitle: settings.stepTwoTitle || "",
        stepTwoSubtitle: settings.stepTwoSubtitle || "",
        stepThreeTitle: settings.stepThreeTitle || "",
        ctaButtonText: settings.ctaButtonText || "",
        persistentButtonText: settings.persistentButtonText || "",
        isActive: settings.isActive ?? true,
      });
    }
  });
  
  const resetCategoryForm = () => {
    setCategoryForm({ name: "", icon: "", description: "", sortOrder: 0, isActive: true });
    setEditingCategory(null);
  };
  
  const resetOptionForm = () => {
    setOptionForm({
      categoryId: 0,
      title: "",
      description: "",
      ctaText: "",
      linkUrl: "",
      linkType: "external",
      badge: "",
      badgeColor: "",
      icon: "",
      sortOrder: 0,
      isPopular: false,
      isRecommended: false,
      isActive: true,
    });
    setEditingOption(null);
  };
  
  const handleEditCategory = (cat: typeof categories extends (infer T)[] | undefined ? T : never) => {
    if (!cat) return;
    setCategoryForm({
      name: cat.name,
      icon: cat.icon || "",
      description: cat.description || "",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setEditingCategory(cat.id);
    setCategoryDialogOpen(true);
  };
  
  const handleEditOption = (opt: typeof options extends (infer T)[] | undefined ? T : never) => {
    if (!opt) return;
    setOptionForm({
      categoryId: opt.categoryId,
      title: opt.title,
      description: opt.description || "",
      ctaText: opt.ctaText || "",
      linkUrl: opt.linkUrl || "",
      linkType: opt.linkType as "internal" | "external" | "modal",
      badge: opt.badge || "",
      badgeColor: opt.badgeColor || "",
      icon: opt.icon || "",
      sortOrder: opt.sortOrder,
      isPopular: opt.isPopular,
      isRecommended: opt.isRecommended,
      isActive: opt.isActive,
    });
    setEditingOption(opt.id);
    setOptionDialogOpen(true);
  };
  
  const handleSaveSettings = () => {
    updateSettings.mutate(settingsForm);
  };
  
  const handleSaveCategory = () => {
    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory, ...categoryForm });
    } else {
      createCategory.mutate(categoryForm);
    }
  };
  
  const handleSaveOption = () => {
    if (editingOption) {
      updateOption.mutate({ id: editingOption, ...optionForm });
    } else {
      createOption.mutate(optionForm);
    }
  };
  
  const iconOptions = [
    { value: "trophy", label: "🏆 Trophy" },
    { value: "shopping-cart", label: "🛒 Shopping Cart" },
    { value: "tools", label: "🛠️ Tools" },
    { value: "graduation-cap", label: "🎓 Graduation Cap" },
    { value: "star", label: "⭐ Star" },
    { value: "heart", label: "❤️ Heart" },
    { value: "rocket", label: "🚀 Rocket" },
    { value: "users", label: "👥 Users" },
    { value: "clipboard", label: "📋 Clipboard" },
    { value: "phone", label: "📱 Phone" },
    { value: "file", label: "📁 File" },
    { value: "podcast", label: "🎙️ Podcast" },
    { value: "dna", label: "🧬 DNA" },
    { value: "scale", label: "⚖️ Scale" },
  ];
  
  if (settingsLoading || categoriesLoading || optionsLoading) {
    return <div className="p-6">Loading...</div>;
  }
  
  return (
    <AdminLayout>
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Onboarding Wizard Manager</h1>
          <p className="text-muted-foreground">Configure the client onboarding experience</p>
        </div>
      </div>
      
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Options</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Welcome Screen
              </CardTitle>
              <CardDescription>Configure the first screen clients see</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Welcome Title</Label>
                  <Input
                    value={settingsForm.welcomeTitle}
                    onChange={(e) => setSettingsForm({ ...settingsForm, welcomeTitle: e.target.value })}
                    placeholder="Welcome to Omega Longevity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Button Text</Label>
                  <Input
                    value={settingsForm.ctaButtonText}
                    onChange={(e) => setSettingsForm({ ...settingsForm, ctaButtonText: e.target.value })}
                    placeholder="Let's Get Started"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Welcome Subtitle</Label>
                <Textarea
                  value={settingsForm.welcomeSubtitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, welcomeSubtitle: e.target.value })}
                  placeholder="Let's find the perfect path for your health optimization journey"
                  rows={2}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Video URL (YouTube/Vimeo embed)</Label>
                  <Input
                    value={settingsForm.videoUrl}
                    onChange={(e) => setSettingsForm({ ...settingsForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Video Placeholder Text</Label>
                  <Input
                    value={settingsForm.videoPlaceholderText}
                    onChange={(e) => setSettingsForm({ ...settingsForm, videoPlaceholderText: e.target.value })}
                    placeholder="Video coming soon"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Selection Screen</CardTitle>
              <CardDescription>Configure the options selection screen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={settingsForm.stepTwoTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, stepTwoTitle: e.target.value })}
                  placeholder="What brings you here today?"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Textarea
                  value={settingsForm.stepTwoSubtitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, stepTwoSubtitle: e.target.value })}
                  placeholder="Select all that apply - many clients combine multiple options"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Confirmation Screen</CardTitle>
              <CardDescription>Configure the final confirmation screen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={settingsForm.stepThreeTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, stepThreeTitle: e.target.value })}
                  placeholder="Here's your action plan"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Persistent Button Text</Label>
                  <Input
                    value={settingsForm.persistentButtonText}
                    onChange={(e) => setSettingsForm({ ...settingsForm, persistentButtonText: e.target.value })}
                    placeholder="Get Started Guide"
                  />
                  <p className="text-xs text-muted-foreground">Text for the button that reopens the wizard</p>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={settingsForm.isActive}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, isActive: checked })}
                  />
                  <Label>Onboarding Active</Label>
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Organize options into logical groups</p>
            <Dialog open={categoryDialogOpen} onOpenChange={(open) => { setCategoryDialogOpen(open); if (!open) resetCategoryForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Coaching & Programs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select value={categoryForm.icon} onValueChange={(v) => setCategoryForm({ ...categoryForm, icon: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Most clients start here"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={categoryForm.sortOrder}
                        onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={categoryForm.isActive}
                        onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setCategoryDialogOpen(false); resetCategoryForm(); }}>Cancel</Button>
                  <Button onClick={handleSaveCategory} disabled={createCategory.isPending || updateCategory.isPending}>
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2">
            {categories?.map((cat) => (
              <Card key={cat.id} className={!cat.isActive ? "opacity-50" : ""}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <span className="text-xl">{iconOptions.find(i => i.value === cat.icon)?.label.split(" ")[0] || "📁"}</span>
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                    </div>
                    {!cat.isActive && <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" /> Hidden</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{options?.filter(o => o.categoryId === cat.id).length || 0} options</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEditCategory(cat)} aria-label="Edit category">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      aria-label="Delete category"
                      onClick={() => {
                        if (confirm("Delete this category and all its options?")) {
                          deleteCategory.mutate({ id: cat.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!categories || categories.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No categories yet. Add your first category to get started.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {/* Options Tab */}
        <TabsContent value="options" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Individual path options for clients to choose</p>
            <Dialog open={optionDialogOpen} onOpenChange={(open) => { setOptionDialogOpen(open); if (!open) resetOptionForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Option</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOption ? "Edit Option" : "Add Option"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select 
                        value={optionForm.categoryId.toString()} 
                        onValueChange={(v) => setOptionForm({ ...optionForm, categoryId: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={optionForm.title}
                        onChange={(e) => setOptionForm({ ...optionForm, title: e.target.value })}
                        placeholder="Omega Elite Membership"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description / CTA Text</Label>
                    <Textarea
                      value={optionForm.ctaText}
                      onChange={(e) => setOptionForm({ ...optionForm, ctaText: e.target.value })}
                      placeholder="Learn from the best, watch masterclasses, see real transformations..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Link URL</Label>
                      <Input
                        value={optionForm.linkUrl}
                        onChange={(e) => setOptionForm({ ...optionForm, linkUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link Type</Label>
                      <Select 
                        value={optionForm.linkType} 
                        onValueChange={(v) => setOptionForm({ ...optionForm, linkType: v as "internal" | "external" | "modal" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External Link (new tab)</SelectItem>
                          <SelectItem value="internal">Internal Link (same tab)</SelectItem>
                          <SelectItem value="modal">Open Modal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Badge Text</Label>
                      <Input
                        value={optionForm.badge}
                        onChange={(e) => setOptionForm({ ...optionForm, badge: e.target.value })}
                        placeholder="MOST POPULAR"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Badge Color</Label>
                      <Select 
                        value={optionForm.badgeColor || "default"} 
                        onValueChange={(v) => setOptionForm({ ...optionForm, badgeColor: v === "default" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="red">Red</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select value={optionForm.icon || ""} onValueChange={(v) => setOptionForm({ ...optionForm, icon: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={optionForm.sortOrder}
                        onChange={(e) => setOptionForm({ ...optionForm, sortOrder: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={optionForm.isPopular}
                        onCheckedChange={(checked) => setOptionForm({ ...optionForm, isPopular: checked })}
                      />
                      <Label className="flex items-center gap-1"><Star className="h-3 w-3" /> Popular</Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={optionForm.isRecommended}
                        onCheckedChange={(checked) => setOptionForm({ ...optionForm, isRecommended: checked })}
                      />
                      <Label className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Recommended</Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={optionForm.isActive}
                        onCheckedChange={(checked) => setOptionForm({ ...optionForm, isActive: checked })}
                      />
                      <Label className="flex items-center gap-1"><Eye className="h-3 w-3" /> Active</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setOptionDialogOpen(false); resetOptionForm(); }}>Cancel</Button>
                  <Button onClick={handleSaveOption} disabled={createOption.isPending || updateOption.isPending}>
                    {editingOption ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {categories?.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {iconOptions.find(i => i.value === cat.icon)?.label.split(" ")[0] || "📁"} {cat.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {options?.filter(o => o.categoryId === cat.id).map((opt) => (
                  <div 
                    key={opt.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${!opt.isActive ? "opacity-50 bg-muted" : "bg-card"}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{opt.title}</p>
                          {opt.isPopular && <Badge className="bg-orange-500"><Star className="h-3 w-3 mr-1" /> Popular</Badge>}
                          {opt.isRecommended && <Badge className="bg-green-500"><ThumbsUp className="h-3 w-3 mr-1" /> Recommended</Badge>}
                          {opt.badge && <Badge variant="outline">{opt.badge}</Badge>}
                          {!opt.isActive && <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" /> Hidden</Badge>}
                        </div>
                        {opt.ctaText && <p className="text-sm text-muted-foreground truncate">{opt.ctaText}</p>}
                        {opt.linkUrl && (
                          <p className="text-xs text-blue-500 flex items-center gap-1 truncate">
                            <ExternalLink className="h-3 w-3" /> {opt.linkUrl}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEditOption(opt)} aria-label="Edit option">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive"
                        aria-label="Delete option"
                        onClick={() => {
                          if (confirm("Delete this option?")) {
                            deleteOption.mutate({ id: opt.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {options?.filter(o => o.categoryId === cat.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No options in this category</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}