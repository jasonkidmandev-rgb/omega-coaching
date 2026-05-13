import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, MoreVertical, Edit, Trash2, Copy, FileText, Pill, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface PresetItem {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  category?: string;
  notes?: string;
}

const PRESET_CATEGORIES = [
  "Weight Loss",
  "Hormone Optimization",
  "Anti-Aging",
  "Performance",
  "Recovery",
  "Cognitive Enhancement",
  "General Wellness",
  "Custom",
];

export default function ProtocolPresets() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<{
    id: number;
    name: string;
    description: string | null;
    category: string | null;
    items: PresetItem[];
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<PresetItem[]>([{ name: "", dosage: "", frequency: "", notes: "" }]);

  const presetsQuery = trpc.protocolPresets.list.useQuery();
  const createMutation = trpc.protocolPresets.create.useMutation({
    onSuccess: () => {
      toast.success("Preset created successfully");
      setIsCreateOpen(false);
      resetForm();
      presetsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Error creating preset: " + error.message);
    },
  });

  const updateMutation = trpc.protocolPresets.update.useMutation({
    onSuccess: () => {
      toast.success("Preset updated successfully");
      setIsEditOpen(false);
      setEditingPreset(null);
      presetsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Error updating preset: " + error.message);
    },
  });

  const deleteMutation = trpc.protocolPresets.delete.useMutation({
    onSuccess: () => {
      toast.success("Preset deleted successfully");
      presetsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Error deleting preset: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setItems([{ name: "", dosage: "", frequency: "", notes: "" }]);
  };

  const handleCreate = () => {
    const validItems = items.filter(item => item.name.trim() !== "");
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (validItems.length === 0) {
      toast.error("At least one item is required");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      items: validItems,
    });
  };

  const handleUpdate = () => {
    if (!editingPreset) return;
    const validItems = items.filter(item => item.name.trim() !== "");
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateMutation.mutate({
      id: editingPreset.id,
      name: name.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      items: validItems,
    });
  };

  const openEditDialog = (preset: typeof editingPreset) => {
    if (!preset) return;
    setEditingPreset(preset);
    setName(preset.name);
    setDescription(preset.description || "");
    setCategory(preset.category || "");
    setItems(preset.items.length > 0 ? preset.items : [{ name: "", dosage: "", frequency: "", notes: "" }]);
    setIsEditOpen(true);
  };

  const addItem = () => {
    setItems([...items, { name: "", dosage: "", frequency: "", notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PresetItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const duplicatePreset = (preset: NonNullable<typeof editingPreset>) => {
    setName(`${preset.name} (Copy)`);
    setDescription(preset.description || "");
    setCategory(preset.category || "");
    setItems(preset.items.length > 0 ? [...preset.items] : [{ name: "", dosage: "", frequency: "", notes: "" }]);
    setIsCreateOpen(true);
  };

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Protocol Presets</h1>
            <p className="text-muted-foreground">Save and reuse common protocol configurations</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Protocol Preset</DialogTitle>
              <DialogDescription>
                Create a reusable protocol template that can be quickly applied to clients.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Preset Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Weight Loss Starter Pack"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this preset..."
                  rows={2}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Protocol Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                {items.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Item Name *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          placeholder="e.g., BPC-157"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dosage</Label>
                        <Input
                          value={item.dosage || ""}
                          onChange={(e) => updateItem(index, "dosage", e.target.value)}
                          placeholder="e.g., 250mcg"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Frequency</Label>
                        <Input
                          value={item.frequency || ""}
                          onChange={(e) => updateItem(index, "frequency", e.target.value)}
                          placeholder="e.g., 2x daily"
                          className="h-8"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Notes</Label>
                          <Input
                            value={item.notes || ""}
                            onChange={(e) => updateItem(index, "notes", e.target.value)}
                            placeholder="Optional notes"
                            className="h-8"
                          />
                        </div>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Preset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presetsQuery.isLoading ? (
          <p className="text-muted-foreground col-span-full text-center py-8">Loading presets...</p>
        ) : presetsQuery.data?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Presets Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first protocol preset to quickly apply common configurations to clients.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Preset
              </Button>
            </CardContent>
          </Card>
        ) : (
          presetsQuery.data?.map((preset) => (
            <Card key={preset.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary" />
                      {preset.name}
                    </CardTitle>
                    {preset.category && (
                      <Badge variant="secondary" className="mt-1">{preset.category}</Badge>
                    )}
                    {preset.isSystemPreset && (
                      <Badge variant="outline" className="mt-1 ml-1">System</Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => duplicatePreset(preset as NonNullable<typeof editingPreset>)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {!preset.isSystemPreset && (
                        <>
                          <DropdownMenuItem onClick={() => openEditDialog(preset as typeof editingPreset)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this preset?")) {
                                deleteMutation.mutate({ id: preset.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {preset.description && (
                  <CardDescription className="mt-2">{preset.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {(preset.items as PresetItem[])?.length || 0} items
                </div>
                <div className="mt-2 space-y-1">
                  {(preset.items as PresetItem[])?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="truncate">{item.name}</span>
                      {item.dosage && <span className="text-muted-foreground">({item.dosage})</span>}
                    </div>
                  ))}
                  {(preset.items as PresetItem[])?.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{(preset.items as PresetItem[]).length - 3} more items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingPreset(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Protocol Preset</DialogTitle>
            <DialogDescription>
              Update this protocol preset configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Preset Name *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weight Loss Starter Pack"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when to use this preset..."
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Protocol Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
              {items.map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Item Name *</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        placeholder="e.g., BPC-157"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dosage</Label>
                      <Input
                        value={item.dosage || ""}
                        onChange={(e) => updateItem(index, "dosage", e.target.value)}
                        placeholder="e.g., 250mcg"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Frequency</Label>
                      <Input
                        value={item.frequency || ""}
                        onChange={(e) => updateItem(index, "frequency", e.target.value)}
                        placeholder="e.g., 2x daily"
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={item.notes || ""}
                          onChange={(e) => updateItem(index, "notes", e.target.value)}
                          placeholder="Optional notes"
                          className="h-8"
                        />
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}