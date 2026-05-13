import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Layers, Ban, Wand2, Package, ClipboardList, Dumbbell, BookOpen, Save, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ClientProtocolItem, ProtocolItem, Category, ClientProgramInfo } from "./types";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Edit2, Eye, ExternalLink } from "lucide-react";
import { getTieredUnitPrice, hasTieredPricing, type PricingTier } from "@/lib/tieredPricing";
import { PeriodizationOverview, TrainingSplitOverview, CompleteProgramGuide } from "@/components/protocol-sections";

// Protocol Sections Toggle + Inline Editor Component
function ProtocolSectionsToggle({ clientProtocolId }: { clientProtocolId: number }) {
  const { data: sections, isLoading } = trpc.protocolSections.getAll.useQuery({ clientProtocolId });
  const { data: templates } = trpc.protocolSections.getTemplates.useQuery();
  const upsertMutation = trpc.protocolSections.upsert.useMutation();
  const saveAsTemplateMutation = trpc.protocolSections.saveAsTemplate.useMutation();
  const loadTemplateMutation = trpc.protocolSections.loadTemplate.useMutation();
  const deleteTemplateMutation = trpc.protocolSections.deleteTemplate.useMutation();
  const utils = trpc.useUtils();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const sectionDefs = [
    { type: "periodization", label: "Periodization Overview", icon: ClipboardList, color: "text-purple-600 bg-purple-100", borderColor: "border-purple-200", desc: "Custom notes, goals, bloodwork, assessments" },
    { type: "training_split", label: "Training Split Overview", icon: Dumbbell, color: "text-orange-600 bg-orange-100", borderColor: "border-orange-200", desc: "12-week mesocycle with phase adjustments" },
    { type: "program_guide", label: "Complete Program Guide", icon: BookOpen, color: "text-blue-600 bg-blue-100", borderColor: "border-blue-200", desc: "Training, nutrition, recovery, lifestyle protocols" },
  ];

  const isEnabled = (type: string) => {
    return sections?.find((s: any) => s.sectionType === type)?.isEnabled || false;
  };

  const handleToggle = useCallback(async (sectionType: string, enabled: boolean) => {
    try {
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: sectionType as "periodization" | "training_split" | "program_guide",
        content: {},
        isEnabled: enabled,
      });
      utils.protocolSections.getAll.invalidate({ clientProtocolId });
      toast.success(`${enabled ? "Enabled" : "Disabled"} section`);
      if (enabled) {
        setExpandedSection(sectionType);
      } else if (expandedSection === sectionType) {
        setExpandedSection(null);
      }
    } catch (error) {
      toast.error("Failed to toggle section");
    }
  }, [clientProtocolId, upsertMutation, utils, expandedSection]);

  if (isLoading) return null;

  const renderSectionEditor = (type: string) => {
    switch (type) {
      case "periodization":
        return <PeriodizationOverview clientProtocolId={clientProtocolId} isAdmin={true} />;
      case "training_split":
        return <TrainingSplitOverview clientProtocolId={clientProtocolId} isAdmin={true} />;
      case "program_guide":
        return <CompleteProgramGuide clientProtocolId={clientProtocolId} isAdmin={true} />;
      default:
        return null;
    }
  };

  const hasEnabledSections = sections?.some((s: any) => s.isEnabled) || false;

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) { toast.error("Please enter a template name"); return; }
    try {
      await saveAsTemplateMutation.mutateAsync({ clientProtocolId, templateName: templateName.trim() });
      utils.protocolSections.getTemplates.invalidate();
      toast.success("Sections saved as template!");
      setShowSaveDialog(false);
      setTemplateName("");
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleLoadTemplate = async (templateId: number) => {
    try {
      await loadTemplateMutation.mutateAsync({ templateId, clientProtocolId });
      utils.protocolSections.getAll.invalidate({ clientProtocolId });
      toast.success("Template loaded!");
      setShowLoadDialog(false);
    } catch (error) {
      toast.error("Failed to load template");
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await deleteTemplateMutation.mutateAsync({ templateId });
      utils.protocolSections.getTemplates.invalidate();
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const sectionTypeLabels: Record<string, string> = {
    periodization: "Periodization",
    training_split: "Training Split",
    program_guide: "Program Guide",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Protocol Sections</CardTitle>
            <CardDescription className="text-xs">
              Enable sections, then click "Edit Content" to customize for this client
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasEnabledSections && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-3 w-3" /> Save as Template
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowLoadDialog(true)}
            >
              <Download className="h-3 w-3" /> Load Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sectionDefs.map((def) => {
          const Icon = def.icon;
          const enabled = isEnabled(def.type);
          const isExpanded = expandedSection === def.type;
          return (
            <div key={def.type} className={`rounded-lg border ${enabled ? def.borderColor : 'border-transparent'} transition-all`}>
              <div className="flex items-center justify-between py-2 px-2">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${def.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{def.label}</p>
                    <p className="text-xs text-muted-foreground">{def.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {enabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setExpandedSection(isExpanded ? null : def.type)}
                    >
                      {isExpanded ? (
                        <><ChevronUp className="h-3 w-3" /> Hide</>  
                      ) : (
                        <><Edit2 className="h-3 w-3" /> Edit Content</>  
                      )}
                    </Button>
                  )}
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggle(def.type, checked)}
                    disabled={upsertMutation.isPending}
                  />
                </div>
              </div>
              {enabled && isExpanded && (
                <div className="px-2 pb-3 pt-1">
                  {renderSectionEditor(def.type)}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Sections as Template</DialogTitle>
            <DialogDescription>
              Save all enabled sections as a reusable master template that can be loaded into other clients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., 90 Day Transformation Default"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will save {sections?.filter((s: any) => s.isEnabled).length || 0} enabled section(s) as separate templates.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate} disabled={saveAsTemplateMutation.isPending}>
              {saveAsTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" /> Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Load Section Template</DialogTitle>
            <DialogDescription>
              Select a template to load into this client's protocol. This will overwrite the current content for that section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[400px] overflow-y-auto">
            {(!templates || templates.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-4">No templates saved yet. Save a client's sections as a template first.</p>
            ) : (
              templates.map((tmpl: any) => (
                <div key={tmpl.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sectionTypeLabels[tmpl.sectionType] || tmpl.sectionType} • {new Date(tmpl.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleLoadTemplate(tmpl.id)}
                      disabled={loadTemplateMutation.isPending}
                    >
                      {loadTemplateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export type NewProductData = {
  categoryId: string;
  name: string;
  schedule: string;
  duration: string;
  price: string;
  defaultQty: number;
  purpose: string;
  notes: string;
  itemType: "peptide" | "supplement" | "adjunct" | "supply" | "service" | "other";
  isDiscountable: boolean;
  addToMasterTemplate: boolean;
};

export type EditItemData = {
  customSchedule: string;
  customDuration: string;
  customPrice: string;
  customNotes: string;
  customPurpose: string;
};

type ItemsByCategory = {
  category: Category;
  items: ClientProtocolItem[];
}[];

type ProtocolsTabProps = {
  clientId: number | null;
  client: {
    templateId: number | null;
  } | null | undefined;
  protocolItems: ClientProtocolItem[];
  setProtocolItems: React.Dispatch<React.SetStateAction<ClientProtocolItem[]>>;
  allItems: ProtocolItem[] | undefined;
  categories: Category[] | undefined;
  itemsByCategory: ItemsByCategory | undefined;
  clientProgramInfo: ClientProgramInfo | undefined;
  outOfSyncCount: number;
  hidePricing: boolean;
  
  // Selection state
  selectedItemIds: Set<number>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  
  // Dialog states
  isNewProductDialogOpen: boolean;
  setIsNewProductDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditItemDialogOpen: boolean;
  setIsEditItemDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isBulkEditDialogOpen: boolean;
  setIsBulkEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Edit item state
  editingItemId: number | null;
  setEditingItemId: React.Dispatch<React.SetStateAction<number | null>>;
  editItemData: EditItemData;
  setEditItemData: React.Dispatch<React.SetStateAction<EditItemData>>;
  templateSyncOption: 'none' | 'current' | 'all';
  setTemplateSyncOption: React.Dispatch<React.SetStateAction<'none' | 'current' | 'all'>>;
  
  // New product state
  newProductData: NewProductData;
  setNewProductData: React.Dispatch<React.SetStateAction<NewProductData>>;
  
  // Bulk edit state
  bulkEditType: 'schedule' | 'source' | 'discount';
  setBulkEditType: React.Dispatch<React.SetStateAction<'schedule' | 'source' | 'discount'>>;
  bulkEditValue: string;
  setBulkEditValue: React.Dispatch<React.SetStateAction<string>>;
  
  // Handlers
  handleItemToggle: (itemId: number, isIncluded: boolean) => void;
  handleItemQtyChange: (itemId: number, quantity: number) => void;
  handleRecommendedToggle: (itemId: number, isRecommended: boolean) => void;
  handleBulkToggleCategory: (categoryId: number, isIncluded: boolean) => void;
  handleToggleSelectItem: (itemId: number) => void;
  handleDeselectAllItems: () => void;
  handleBulkEdit: () => Promise<void>;
  handleSaveItemCustomization: () => Promise<void>;
  handleAddNewProduct: () => Promise<void>;
  
  // Mutations
  addClientItemMutation: {
    mutateAsync: (params: {
      clientProtocolId: number;
      protocolItemId: number;
      quantity: number;
      isIncluded: boolean;
      isRecommended: boolean;
    }) => Promise<any>;
    isPending: boolean;
  };
  updateItemMutation: {
    mutate: (params: { id: number; isIncluded?: boolean; isRecommended?: boolean; quantity?: number }) => void;
    isPending: boolean;
  };
  createProtocolItemMutation: {
    isPending: boolean;
  };
  syncWithMasterTemplateMutation: {
    mutateAsync: (params: { id: number }) => Promise<{ success: boolean; addedCount: number; templateName: string }>;
    isPending: boolean;
  };
  
  // Utils
  trpcUtils: {
    template: {
      getItems: {
        fetch: (params: { templateId: number }) => Promise<any>;
      };
    };
  };
  refetchClientItems: () => void;
  onApplyPreset?: (presetId: number) => void;
};

export default function ProtocolsTab({
  clientId,
  client,
  protocolItems,
  setProtocolItems,
  allItems,
  categories,
  itemsByCategory,
  clientProgramInfo,
  outOfSyncCount,
  hidePricing,
  selectedItemIds,
  setSelectedItemIds,
  isNewProductDialogOpen,
  setIsNewProductDialogOpen,
  isEditItemDialogOpen,
  setIsEditItemDialogOpen,
  isBulkEditDialogOpen,
  setIsBulkEditDialogOpen,
  editingItemId,
  setEditingItemId,
  editItemData,
  setEditItemData,
  templateSyncOption,
  setTemplateSyncOption,
  newProductData,
  setNewProductData,
  bulkEditType,
  setBulkEditType,
  bulkEditValue,
  setBulkEditValue,
  handleItemToggle,
  handleItemQtyChange,
  handleRecommendedToggle,
  handleBulkToggleCategory,
  handleToggleSelectItem,
  handleDeselectAllItems,
  handleBulkEdit,
  handleSaveItemCustomization,
  handleAddNewProduct,
  addClientItemMutation,
  updateItemMutation,
  createProtocolItemMutation,
  syncWithMasterTemplateMutation,
  trpcUtils,
  refetchClientItems,
  onApplyPreset,
}: ProtocolsTabProps) {
  // Fetch available presets
  const { data: presets } = trpc.protocolPresets.list.useQuery();
  return (
    <TabsContent value="items">
      <div className="space-y-6">
        {/* Out-of-sync notification */}
        {outOfSyncCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">Protocol Out of Sync</p>
                <p className="text-sm text-amber-600">
                  {outOfSyncCount} item{outOfSyncCount !== 1 ? 's' : ''} from the template {outOfSyncCount !== 1 ? 'are' : 'is'} missing from this protocol.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={async () => {
                if (!client?.templateId || !clientId) return;
                try {
                  // Use program phase template if available, otherwise master template
                  let syncTemplateId = client.templateId;
                  let syncTemplateName = "master template";
                  
                  if (clientProgramInfo?.currentPhase?.templateId) {
                    syncTemplateId = clientProgramInfo.currentPhase.templateId;
                    syncTemplateName = `${clientProgramInfo.program?.name || 'Program'} - ${clientProgramInfo.currentPhase.name}`;
                  }
                  
                  const syncTemplateItems = await trpcUtils.template.getItems.fetch({ templateId: syncTemplateId });
                  const existingItemIds = new Set(protocolItems.map(item => item.protocolItemId));
                  const missingItems = syncTemplateItems?.filter((item: any) => !existingItemIds.has(item.protocolItemId)) || [];
                  
                  for (const item of missingItems) {
                    await addClientItemMutation.mutateAsync({
                      clientProtocolId: clientId,
                      protocolItemId: item.protocolItemId,
                      quantity: item.quantity,
                      isIncluded: true,
                      isRecommended: item.isRecommended,
                    });
                  }
                  
                  refetchClientItems();
                  toast.success(`Added ${missingItems.length} items from ${syncTemplateName}`);
                } catch (error) {
                  toast.error('Failed to sync with template');
                }
              }}
              disabled={addClientItemMutation.isPending}
            >
              {addClientItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sync Now
            </Button>
          </div>
        )}
        
        {/* Bulk Edit Toolbar */}
        {selectedItemIds.size > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-orange-800">
                {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllItems}
                className="text-orange-600 hover:text-orange-800"
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkEditType('schedule');
                  setBulkEditValue('');
                  setIsBulkEditDialogOpen(true);
                }}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Bulk Edit Schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Set all selected items as recommended
                  const selectedIds = Array.from(selectedItemIds);
                  setProtocolItems(prev =>
                    prev.map(item =>
                      selectedIds.includes(item.id) ? { ...item, isRecommended: true } : item
                    )
                  );
                  selectedIds.forEach(id => {
                    updateItemMutation.mutate({ id, isRecommended: true });
                  });
                  toast.success(`Set ${selectedIds.length} items as recommended`);
                }}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Set Recommended
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Set all selected items as not recommended (optional)
                  const selectedIds = Array.from(selectedItemIds);
                  setProtocolItems(prev =>
                    prev.map(item =>
                      selectedIds.includes(item.id) ? { ...item, isRecommended: false } : item
                    )
                  );
                  selectedIds.forEach(id => {
                    updateItemMutation.mutate({ id, isRecommended: false });
                  });
                  toast.success(`Set ${selectedIds.length} items as optional`);
                }}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Set Optional
              </Button>
            </div>
          </div>
        )}
        
        {/* Global Check All / Uncheck All */}
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">
              Master Controls
            </span>
            <span className="text-sm text-muted-foreground">
              ({protocolItems.length} total items)
            </span>
            <span className="text-sm font-medium px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
              {protocolItems.filter((item: any) => item.isIncluded && item.fulfillmentSource !== 'client' && item.quantity > 0).length} We Ship
            </span>
            <span className="text-sm font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
              {protocolItems.filter((item: any) => item.isIncluded && item.fulfillmentSource === 'client' && item.quantity > 0).length} Client Buys
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                // Check all items across all categories and set as recommended
                const allItemIds = protocolItems.map(item => item.id);
                setProtocolItems(prev =>
                  prev.map(item => ({ ...item, isIncluded: true, isRecommended: true }))
                );
                // Batch update all items
                allItemIds.forEach(id => {
                  updateItemMutation.mutate({ id, isIncluded: true, isRecommended: true });
                });
                toast.success(`Checked all ${allItemIds.length} items`);
              }}
              className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
            >
              ✓ Check All Items
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                // Uncheck all items across all categories and turn off recommended
                const allItemIds = protocolItems.map(item => item.id);
                setProtocolItems(prev =>
                  prev.map(item => ({ ...item, isIncluded: false, isRecommended: false }))
                );
                // Batch update all items
                allItemIds.forEach(id => {
                  updateItemMutation.mutate({ id, isIncluded: false, isRecommended: false });
                });
                toast.success(`Unchecked all ${allItemIds.length} items`);
              }}
              className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
            >
              ✗ Uncheck All Items
            </Button>
            
            {/* Preset Quick Apply Dropdown */}
            {presets && presets.length > 0 && onApplyPreset && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Apply Preset
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Quick Apply Preset</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {presets.map((preset: any) => (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => onApplyPreset(preset.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.itemCount} items • {preset.description || 'No description'}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Protocol Sections Toggle */}
        {clientId && (
          <ProtocolSectionsToggle clientProtocolId={clientId} />
        )}

        {/* Sync with Template and Add Items Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {/* Sync with Master Template button - works with or without assigned template */}
            <Button
              variant="outline"
              onClick={async () => {
                if (!clientId) return;
                try {
                  // Determine which template to sync with:
                  // 1. If client is in a program with a phase that has a templateId, use that
                  // 2. If client has an assigned template, use that
                  // 3. Otherwise, use the server-side default template
                  let syncTemplateId = client?.templateId;
                  let syncTemplateName = "Master Template";
                  
                  // Check if client is in a program phase with its own template
                  if (clientProgramInfo?.currentPhase?.templateId) {
                    syncTemplateId = clientProgramInfo.currentPhase.templateId;
                    syncTemplateName = `${clientProgramInfo.program?.name || 'Program'} - ${clientProgramInfo.currentPhase.name}`;
                  }
                  
                  if (syncTemplateId) {
                    // Use the assigned template
                    const templateItems = await trpcUtils.template.getItems.fetch({ templateId: syncTemplateId });
                    
                    // Find items in template that aren't in client protocol
                    const existingItemIds = new Set(protocolItems.map(item => item.protocolItemId));
                    const missingItems = templateItems.filter((item: any) => !existingItemIds.has(item.protocolItemId));
                    
                    if (missingItems.length === 0) {
                      toast.info(`Protocol is already in sync with ${syncTemplateName}`);
                      return;
                    }
                    
                    // Add missing items
                    for (const item of missingItems) {
                      await addClientItemMutation.mutateAsync({
                        clientProtocolId: clientId,
                        protocolItemId: item.protocolItemId,
                        quantity: item.quantity,
                        isIncluded: true,
                        isRecommended: item.isRecommended,
                      });
                    }
                    
                    refetchClientItems();
                    toast.success(`Added ${missingItems.length} items from ${syncTemplateName}`);
                  } else {
                    // No assigned template - use server-side sync with default template
                    const result = await syncWithMasterTemplateMutation.mutateAsync({ id: clientId });
                    if (result.addedCount === 0) {
                      toast.info(`Protocol is already in sync with ${result.templateName}`);
                    } else {
                      refetchClientItems();
                      toast.success(`Added ${result.addedCount} items from ${result.templateName}`);
                    }
                  }
                } catch (error: any) {
                  toast.error(error.message || 'Failed to sync with template');
                }
              }}
              disabled={addClientItemMutation.isPending || syncWithMasterTemplateMutation.isPending}
              title={clientProgramInfo?.currentPhase?.templateId 
                ? `Sync with ${clientProgramInfo.program?.name} - ${clientProgramInfo.currentPhase?.name} template`
                : "Sync with Master Template"
              }
            >
              {(addClientItemMutation.isPending || syncWithMasterTemplateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Layers className="h-4 w-4 mr-2" />
              Sync with {clientProgramInfo?.currentPhase?.templateId ? "Program" : "Master"} Template
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Existing Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Existing Protocol Item</DialogTitle>
                  <DialogDescription>
                    Search and add items from your Protocol Items library
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Search items by name..."
                    className="mb-4"
                    onChange={(e) => {
                      const searchVal = e.target.value.toLowerCase();
                      const container = document.getElementById('existing-items-list');
                      if (container) {
                        const items = container.querySelectorAll('[data-item-name]');
                        items.forEach((item) => {
                          const name = item.getAttribute('data-item-name')?.toLowerCase() || '';
                          (item as HTMLElement).style.display = name.includes(searchVal) ? 'flex' : 'none';
                        });
                      }
                    }}
                  />
                  <div id="existing-items-list" className="space-y-2 max-h-[400px] overflow-y-auto">
                    {allItems?.filter(item => !protocolItems.some(pi => pi.protocolItemId === item.id)).map((item) => (
                      <div
                        key={item.id}
                        data-item-name={item.name}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {categories?.find(c => c.id === item.categoryId)?.name} • ${item.price || '0'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!clientId) return;
                            await addClientItemMutation.mutateAsync({
                              clientProtocolId: clientId,
                              protocolItemId: item.id,
                              quantity: item.defaultQty || 1,
                              isIncluded: true,
                              isRecommended: true,
                            });
                            refetchClientItems();
                            toast.success(`Added ${item.name} to protocol`);
                          }}
                          disabled={addClientItemMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                    {allItems?.filter(item => !protocolItems.some(pi => pi.protocolItemId === item.id)).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">All items are already in this protocol</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Create a new product and add it to this protocol
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newProductName">Name *</Label>
                    <Input
                      id="newProductName"
                      value={newProductData.name}
                      onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                      placeholder="BPC157 Acetate 10MG"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newProductCategory">Category *</Label>
                    <Select
                      value={newProductData.categoryId}
                      onValueChange={(value) => setNewProductData({ ...newProductData, categoryId: value })}
                    >
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
                    <Label htmlFor="newProductType">Type</Label>
                    <Select
                      value={newProductData.itemType}
                      onValueChange={(value: "peptide" | "supplement" | "adjunct" | "supply" | "service" | "other") => 
                        setNewProductData({ ...newProductData, itemType: value })
                      }
                    >
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
                    <Label htmlFor="newProductPrice">Price ($)</Label>
                    <Input
                      id="newProductPrice"
                      type="number"
                      step="0.01"
                      value={newProductData.price}
                      onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                      placeholder="95.00"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newProductQty">Default Quantity</Label>
                    <Input
                      id="newProductQty"
                      type="number"
                      value={newProductData.defaultQty}
                      onChange={(e) => setNewProductData({ ...newProductData, defaultQty: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newProductSchedule">Schedule</Label>
                    <Input
                      id="newProductSchedule"
                      value={newProductData.schedule}
                      onChange={(e) => setNewProductData({ ...newProductData, schedule: e.target.value })}
                      placeholder="2x/day Mon-Fri"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newProductDuration">Duration</Label>
                  <Input
                    id="newProductDuration"
                    value={newProductData.duration}
                    onChange={(e) => setNewProductData({ ...newProductData, duration: e.target.value })}
                    placeholder="90 days"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newProductPurpose">Purpose</Label>
                  <Input
                    id="newProductPurpose"
                    value={newProductData.purpose}
                    onChange={(e) => setNewProductData({ ...newProductData, purpose: e.target.value })}
                    placeholder="Healing/Recovery"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newProductNotes">Notes</Label>
                  <Textarea
                    id="newProductNotes"
                    value={newProductData.notes}
                    onChange={(e) => setNewProductData({ ...newProductData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="newProductDiscountable"
                    checked={newProductData.isDiscountable}
                    onCheckedChange={(checked) => setNewProductData({ ...newProductData, isDiscountable: !!checked })}
                  />
                  <Label htmlFor="newProductDiscountable" className="text-sm font-normal cursor-pointer">
                    Eligible for discounts
                  </Label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="addToMasterTemplate"
                      checked={newProductData.addToMasterTemplate}
                      onCheckedChange={(checked) => setNewProductData({ ...newProductData, addToMasterTemplate: !!checked })}
                    />
                    <div>
                      <Label htmlFor="addToMasterTemplate" className="text-sm font-medium cursor-pointer">
                        Add to Master Template
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        If checked, this product will be available for all future protocols. Otherwise, it will only be added to this client's protocol.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewProductDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNewProduct} disabled={createProtocolItemMutation.isPending || addClientItemMutation.isPending}>
                  {(createProtocolItemMutation.isPending || addClientItemMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {itemsByCategory?.map(({ category, items }) => {
          const includedCount = items.filter(i => i.isIncluded).length;
          const totalCount = items.length;
          return (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle>{category.displayName || category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {includedCount}/{totalCount} selected
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggleCategory(category.id, true)}
                  >
                    Check All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggleCategory(category.id, false)}
                  >
                    Uncheck All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => {
                  const protocolItem = allItems?.find(
                    (i) => i.id === item.protocolItemId
                  );
                  // Use snapshotName as fallback when master item has been deleted
                  const itemDisplayName = protocolItem?.name || (item as any).snapshotName || `Unknown Item #${item.protocolItemId}`;
                  const isOrphanedItem = !protocolItem;
                  if (isOrphanedItem && !itemDisplayName) return null;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.isIncluded
                          ? selectedItemIds.has(item.id) 
                            ? "bg-orange-50 border-orange-300" 
                            : "bg-white border-slate-200"
                          : "bg-slate-50 border-slate-100 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Bulk selection checkbox */}
                        {item.isIncluded && (
                          <Checkbox
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={() => handleToggleSelectItem(item.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex items-start gap-4 flex-1">
                          <Switch
                            checked={item.isIncluded}
                            onCheckedChange={(checked) =>
                              handleItemToggle(item.id, checked)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{itemDisplayName}</h4>
                              {isOrphanedItem && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Deleted from catalog</span>
                              )}
                              {!item.isRecommended && (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  Optional
                                </span>
                              )}
{(protocolItem as any).isDiscountable === false && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                                  <Ban className="h-3 w-3" />
                                                  ND
                                                </span>
                                              )}
                                              {item.isIncluded && protocolItem?.itemType !== 'service' && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newSource = (item as any).fulfillmentSource === 'client' ? 'coach' : 'client';
                                                    setProtocolItems((prev: any[]) =>
                                                      prev.map((i: any) => i.id === item.id ? { ...i, fulfillmentSource: newSource } : i)
                                                    );
                                                    updateItemMutation.mutate({ id: item.id, fulfillmentSource: newSource } as any);
                                                  }}
                                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                                                    (item as any).fulfillmentSource === 'client'
                                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                  }`}
                                                  title={(item as any).fulfillmentSource === 'client'
                                                    ? 'Client sources this item via affiliate link. Click to switch to coach-fulfilled.'
                                                    : 'Coach fulfills and ships this item. Click to switch to client-sourced.'}
                                                >
                                                  {(item as any).fulfillmentSource === 'client' ? (
                                                    <><ExternalLink className="h-3 w-3" /> Client Buys</>
                                                  ) : (
                                                    <><Package className="h-3 w-3" /> We Ship</>
                                                  )}
                                                </button>
                                              )}
                              {(item.customSchedule || item.customDuration) && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.customSchedule || protocolItem?.schedule}
                              {item.customSchedule && protocolItem?.schedule && (
                                <span className="text-xs text-slate-400 ml-2">(default: {protocolItem?.schedule})</span>
                              )}
                            </p>
                            {(item.customDuration || protocolItem?.duration) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Duration: {item.customDuration || protocolItem?.duration}
                                {item.customDuration && protocolItem?.duration && (
                                  <span className="text-slate-400 ml-2">(default: {protocolItem?.duration})</span>
                                )}
                              </p>
                            )}
                            {((item as any).customPurpose || protocolItem?.purpose) && (
                              <p className="text-sm text-primary mt-1">
                                {(item as any).customPurpose || protocolItem?.purpose}
                                {(item as any).customPurpose && protocolItem?.purpose && (item as any).customPurpose !== protocolItem?.purpose && (
                                  <span className="text-xs text-slate-400 ml-2">(default: {protocolItem?.purpose})</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Qty:</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemQtyChange(item.id, parseInt(e.target.value) || 0)
                              }
                              className="w-16 h-8"
                            />
                          </div>
                          {!hidePricing && (() => {
                            const hasCustomPrice = !!item.customPrice;
                            const defaultPrice = parseFloat(protocolItem?.price || "0");
                            const itemTiers = protocolItem ? (protocolItem as any).pricingTiers as PricingTier[] | null : null;
                            const hasVolume = !hasCustomPrice && hasTieredPricing(itemTiers);
                            const unitPrice = hasCustomPrice
                              ? parseFloat(item.customPrice!)
                              : hasVolume
                                ? getTieredUnitPrice(item.quantity, itemTiers, defaultPrice)
                                : defaultPrice;
                            const lineTotal = unitPrice * item.quantity;
                            return (
                              <div className="text-right min-w-[80px]">
                                <p className="font-medium">
                                  ${lineTotal.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ${unitPrice.toFixed(2)}/ea
                                </p>
                                {hasVolume && (
                                  <p className="text-xs text-green-600 font-medium">Vol. Price</p>
                                )}
                                {hasCustomPrice && (
                                  <p className="text-xs text-blue-600 font-medium">Custom</p>
                                )}
                              </div>
                            );
                          })()}
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Rec:</Label>
                            <Switch
                              checked={item.isRecommended}
                              onCheckedChange={(checked) =>
                                handleRecommendedToggle(item.id, checked)
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditItemData({
                                customSchedule: item.customSchedule || protocolItem?.schedule || '',
                                customDuration: item.customDuration || protocolItem?.duration || '',
                                customPrice: item.customPrice || '',
                                customNotes: item.customNotes || protocolItem?.notes || '',
                                customPurpose: (item as any).customPurpose || protocolItem?.purpose || '',
                              });
                              setIsEditItemDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Edit any field below. Values are pre-populated from the current data — change only what you need.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customSchedule">Schedule</Label>
              <Input
                id="customSchedule"
                value={editItemData.customSchedule}
                onChange={(e) => setEditItemData({ ...editItemData, customSchedule: e.target.value })}
                placeholder="e.g., 2x/day Mon-Fri"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customDuration">Duration</Label>
              <Input
                id="customDuration"
                value={editItemData.customDuration}
                onChange={(e) => setEditItemData({ ...editItemData, customDuration: e.target.value })}
                placeholder="e.g., 90 days"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customPurpose">Purpose</Label>
              <Input
                id="customPurpose"
                value={editItemData.customPurpose}
                onChange={(e) => setEditItemData({ ...editItemData, customPurpose: e.target.value })}
                placeholder="e.g., Bone health, calcium absorption"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customPrice">Price ($)</Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                value={editItemData.customPrice}
                onChange={(e) => setEditItemData({ ...editItemData, customPrice: e.target.value })}
                placeholder="Leave empty for default/volume pricing"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <RichTextEditor
                content={editItemData.customNotes}
                onChange={(html) => setEditItemData({ ...editItemData, customNotes: html })}
                placeholder="Additional notes for this item..."
                minHeight="120px"
              />
              <p className="text-xs text-muted-foreground">Formatting (bold, lists, links) will be preserved</p>
            </div>
            <div className="space-y-2">
              <Label>Sync to Templates</Label>
              <Select
                value={templateSyncOption}
                onValueChange={(value: 'none' | 'current' | 'all') => setTemplateSyncOption(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't sync (this client only)</SelectItem>
                  <SelectItem value="current">Sync to current template</SelectItem>
                  <SelectItem value="all">Sync to ALL templates</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose whether to apply these changes to template(s) as well
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItemCustomization}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedItemIds.size} Items</DialogTitle>
            <DialogDescription>
              Apply changes to all selected items
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkEdit}>
              Apply to {selectedItemIds.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
