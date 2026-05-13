import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  FileText, Edit, Eye, EyeOff, Plus, Save, ClipboardCheck, 
  FileSignature, Settings, ArrowLeft, Trash2, RotateCcw, Archive, AlertTriangle,
  GripVertical, ExternalLink
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Link } from "wouter";

export default function FormsEditor() {
  const [activeTab, setActiveTab] = useState("intake");
  const [previewSection, setPreviewSection] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  
  // Form state for editing
  const [editTitle, setEditTitle] = useState("");
  const [editDisplayText, setEditDisplayText] = useState("");
  const [editIsRequired, setEditIsRequired] = useState(true);
  const [editRequiresSignature, setEditRequiresSignature] = useState(false);
  const [editRequiresCheckbox, setEditRequiresCheckbox] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  
  // Form state for creating
  const [newSectionKey, setNewSectionKey] = useState("");
  const [newSectionNumber, setNewSectionNumber] = useState(1);
  const [newTitle, setNewTitle] = useState("");
  const [newDisplayText, setNewDisplayText] = useState("");
  const [newIsRequired, setNewIsRequired] = useState(true);
  const [newRequiresSignature, setNewRequiresSignature] = useState(false);
  const [newRequiresCheckbox, setNewRequiresCheckbox] = useState(false);
  const [newSortOrder, setNewSortOrder] = useState(0);
  
  const utils = trpc.useUtils();
  const { data: intakeSections, isLoading: loadingIntake } = trpc.transformation.getIntakeFormContent.useQuery();
  const { data: checkinTemplates, isLoading: loadingCheckins } = trpc.checkin.templates.list.useQuery();
  
  const updateMutation = trpc.transformation.updateIntakeFormContent.useMutation({
    onSuccess: () => {
      toast.success("Section updated successfully");
      setIsEditOpen(false);
      setSelectedSection(null);
      utils.transformation.getIntakeFormContent.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const createMutation = trpc.transformation.createIntakeFormSection.useMutation({
    onSuccess: () => {
      toast.success("Section created successfully");
      setIsCreateOpen(false);
      resetCreateForm();
      utils.transformation.getIntakeFormContent.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.transformation.deleteIntakeFormSection.useMutation({
    onSuccess: (data) => {
      toast.success(`Section "${data.deletedKey}" permanently deleted`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      utils.transformation.getIntakeFormContent.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderMutation = trpc.transformation.reorderIntakeFormSections.useMutation({
    onSuccess: () => {
      toast.success("Section order updated");
      utils.transformation.getIntakeFormContent.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !filteredSections) return;
    const oldIndex = filteredSections.findIndex((s: any) => s.id === active.id);
    const newIndex = filteredSections.findIndex((s: any) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove([...filteredSections], oldIndex, newIndex);
    const updates = reordered.map((s: any, i: number) => ({
      id: s.id,
      sortOrder: i,
      sectionNumber: i + 1,
    }));
    reorderMutation.mutate({ sections: updates });
  };
  
  const resetCreateForm = () => {
    setNewSectionKey("");
    setNewSectionNumber(1);
    setNewTitle("");
    setNewDisplayText("");
    setNewIsRequired(true);
    setNewRequiresSignature(false);
    setNewRequiresCheckbox(false);
    setNewSortOrder(0);
  };
  
  const handleEdit = (section: any) => {
    setSelectedSection(section);
    setEditTitle(section.title);
    setEditDisplayText(section.displayText || "");
    setEditIsRequired(!!section.isRequired);
    setEditRequiresSignature(!!section.requiresSignature);
    setEditRequiresCheckbox(!!section.requiresCheckbox);
    setEditIsActive(!!section.isActive);
    setIsEditOpen(true);
  };
  
  const handleSave = () => {
    if (!selectedSection) return;
    
    updateMutation.mutate({
      id: selectedSection.id,
      title: editTitle,
      displayText: editDisplayText,
      isRequired: Boolean(editIsRequired),
      requiresSignature: Boolean(editRequiresSignature),
      requiresCheckbox: Boolean(editRequiresCheckbox),
      isActive: Boolean(editIsActive),
    });
  };
  
  const handleCreate = () => {
    if (!newSectionKey || !newTitle) {
      toast.error("Section key and title are required");
      return;
    }
    
    createMutation.mutate({
      sectionKey: newSectionKey,
      sectionNumber: newSectionNumber,
      title: newTitle,
      displayText: newDisplayText || undefined,
      isRequired: newIsRequired,
      requiresSignature: newRequiresSignature,
      requiresCheckbox: newRequiresCheckbox,
      sortOrder: newSortOrder,
    });
  };

  const handleReactivate = (section: any) => {
    updateMutation.mutate({
      id: section.id,
      isActive: true,
    });
  };

  const handleDeactivate = (section: any) => {
    updateMutation.mutate({
      id: section.id,
      isActive: false,
    });
  };

  const handleDeleteClick = (section: any) => {
    setDeleteTarget(section);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  };

  // Filter sections based on showInactive toggle
  const filteredSections = useMemo(() => {
    if (!intakeSections) return [];
    if (showInactive) return intakeSections;
    return intakeSections.filter((s: any) => s.isActive);
  }, [intakeSections, showInactive]);

  const inactiveCount = useMemo(() => {
    if (!intakeSections) return 0;
    return intakeSections.filter((s: any) => !s.isActive).length;
  }, [intakeSections]);
  
  return (
    <AdminLayout>
    <div className="container max-w-6xl py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-amber-500" />
              Forms Editor
            </h1>
            <p className="text-gray-600">Manage intake forms, check-in templates, and waivers</p>
          </div>
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="intake" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Intake Form
          </TabsTrigger>
          <TabsTrigger value="checkins" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Check-ins
          </TabsTrigger>
          <TabsTrigger value="waivers" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Waivers
          </TabsTrigger>
        </TabsList>
        
        {/* Intake Form Tab */}
        <TabsContent value="intake" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Client Intake Form Sections</CardTitle>
                <CardDescription>
                  Configure the sections that appear in the client coaching journey intake form.
                  {inactiveCount > 0 && !showInactive && (
                    <span className="ml-1 text-amber-600">
                      ({inactiveCount} inactive section{inactiveCount !== 1 ? 's' : ''} hidden)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {inactiveCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50">
                    <Archive className="h-4 w-4 text-gray-500" />
                    <Label htmlFor="show-inactive" className="text-sm font-medium text-gray-600 cursor-pointer whitespace-nowrap">
                      Show inactive
                    </Label>
                    <Switch
                      id="show-inactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                  </div>
                )}
                <Button 
                  variant="outline"
                  onClick={() => { setPreviewStep(0); setIsPreviewOpen(true); }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview as Client
                </Button>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingIntake ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              ) : filteredSections && filteredSections.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredSections.map((s: any) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Section Key</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Requirements</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSections.map((section: any, index: number) => (
                          <SortableTableRow
                            key={section.id}
                            section={section}
                            index={index}
                            previewSection={previewSection}
                            setPreviewSection={setPreviewSection}
                            handleEdit={handleEdit}
                            handleReactivate={handleReactivate}
                            handleDeactivate={handleDeactivate}
                            handleDeleteClick={handleDeleteClick}
                            updateMutation={updateMutation}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  {showInactive ? (
                    <>
                      <p>No form sections found.</p>
                      <p className="text-sm mt-1">Click "Add Section" to create your first section.</p>
                    </>
                  ) : (
                    <>
                      <p>No active form sections.</p>
                      <p className="text-sm mt-1">
                        Toggle "Show inactive" to see deactivated sections, or click "Add Section" to create a new one.
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Preview Panel */}
          {previewSection && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Preview: {previewSection.title}</CardTitle>
                  {!previewSection.isActive && (
                    <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {previewSection.displayText ? (
                    <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg border">
                      {previewSection.displayText}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No display text configured for this section.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Check-in Templates</CardTitle>
                <CardDescription>
                  Manage weekly check-in question templates. Edit questions from the Check-in Management page.
                </CardDescription>
              </div>
              <Link href="/admin/checkin-management">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Check-ins
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingCheckins ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              ) : checkinTemplates && checkinTemplates.length > 0 ? (
                <div className="space-y-4">
                  {checkinTemplates.map((template) => (
                    <div key={template.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            {template.isDefault && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description || "No description"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {(template.questions as any[])?.length || 0} questions
                          </p>
                        </div>
                        <Link href="/admin/checkin-management">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Questions
                          </Button>
                        </Link>
                      </div>
                      
                      {/* Preview questions */}
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Questions Preview:</p>
                        {(template.questions as any[])?.slice(0, 3).map((q: any, idx: number) => (
                          <div key={q.id} className="text-sm pl-4 border-l-2 border-muted">
                            {idx + 1}. {q.text}
                            <span className="text-xs text-muted-foreground ml-2">({q.type})</span>
                          </div>
                        ))}
                        {(template.questions as any[])?.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-4">
                            +{(template.questions as any[]).length - 3} more questions
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No check-in templates found.</p>
                  <p className="text-sm mt-1">Create templates from the Check-in Management page.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Waivers Tab */}
        <TabsContent value="waivers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Waiver & Disclaimer Forms</CardTitle>
              <CardDescription>
                Manage legal waivers and disclaimer forms used throughout the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Store Waiver */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Store Waiver</h3>
                        <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Required before accessing the Omega Store. Includes consulting waiver, collaboration agreement, and liability release.
                      </p>
                    </div>
                    <Link href="/admin/store-waivers">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {/* Age Disclaimer */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Age Verification Disclaimer</h3>
                        <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        18+ age verification popup shown on first visit. Includes research/educational purposes disclaimer.
                      </p>
                    </div>
                    <Link href="/admin/settings">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Intake Section Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Section: {selectedSection?.sectionKey}</DialogTitle>
            <DialogDescription>
              Update the content and settings for this intake form section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Section title"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Text</Label>
              <Textarea
                value={editDisplayText}
                onChange={(e) => setEditDisplayText(e.target.value)}
                placeholder="Content to display in this section..."
                rows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Required</Label>
                <Switch
                  checked={editIsRequired}
                  onCheckedChange={setEditIsRequired}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Active</Label>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Requires Signature</Label>
                <Switch
                  checked={editRequiresSignature}
                  onCheckedChange={setEditRequiresSignature}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Requires Checkbox</Label>
                <Switch
                  checked={editRequiresCheckbox}
                  onCheckedChange={setEditRequiresCheckbox}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Intake Section Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section for the intake form.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section Key</Label>
                <Input
                  value={newSectionKey}
                  onChange={(e) => setNewSectionKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g., health_history"
                />
                <p className="text-xs text-muted-foreground">Unique identifier (lowercase, underscores)</p>
              </div>
              <div className="space-y-2">
                <Label>Section Number</Label>
                <Input
                  type="number"
                  value={newSectionNumber}
                  onChange={(e) => setNewSectionNumber(parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Section title"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Text</Label>
              <Textarea
                value={newDisplayText}
                onChange={(e) => setNewDisplayText(e.target.value)}
                placeholder="Content to display in this section..."
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Required</Label>
                <Switch
                  checked={newIsRequired}
                  onCheckedChange={setNewIsRequired}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Requires Signature</Label>
                <Switch
                  checked={newRequiresSignature}
                  onCheckedChange={setNewRequiresSignature}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Requires Checkbox</Label>
                <Switch
                  checked={newRequiresCheckbox}
                  onCheckedChange={setNewRequiresCheckbox}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Creating..." : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Section
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The section and all its configuration will be permanently removed from the database.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <strong>Section:</strong> {deleteTarget.title}
                </p>
                <p className="text-sm">
                  <strong>Key:</strong> <code className="bg-red-100 px-1 rounded">{deleteTarget.sectionKey}</code>
                </p>
                <p className="text-sm">
                  <strong>Section #:</strong> {deleteTarget.sectionNumber}
                </p>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Note: This will not affect any previously submitted intake form data. Only the section configuration record will be deleted.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm} 
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Preview as Client Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Preview as Client
            </DialogTitle>
            <DialogDescription>
              This is how the intake form appears to clients. Navigate through sections using the buttons below.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const activeSections = (intakeSections || []).filter((s: any) => s.isActive);
            const currentSection = activeSections[previewStep];
            if (!currentSection) return <p className="text-gray-500 text-center py-8">No active sections to preview.</p>;
            return (
              <div className="py-4">
                {/* Progress bar */}
                <div className="flex items-center gap-1 mb-6">
                  {activeSections.map((_: any, i: number) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full cursor-pointer transition-colors ${
                        i === previewStep ? 'bg-amber-500' : i < previewStep ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                      onClick={() => setPreviewStep(i)}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mb-4">Step {previewStep + 1} of {activeSections.length}</div>
                
                {/* Section content */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{currentSection.title}</h2>
                  <div className="flex gap-2 mb-4">
                    {currentSection.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                    {currentSection.requiresSignature && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Signature Required</Badge>}
                    {currentSection.requiresCheckbox && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Checkbox Required</Badge>}
                  </div>
                  {currentSection.displayText ? (
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{currentSection.displayText}</div>
                  ) : (
                    <p className="text-gray-400 italic">This section uses a dynamic form component (fields will render at runtime).</p>
                  )}
                  {currentSection.requiresSignature && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-2">Signature</p>
                      <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        Client signs here
                      </div>
                    </div>
                  )}
                  {currentSection.requiresCheckbox && (
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-gray-300 rounded" />
                      <span className="text-sm text-gray-600">I acknowledge and agree to the above</span>
                    </div>
                  )}
                </div>
                
                {/* Navigation */}
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewStep(Math.max(0, previewStep - 1))}
                    disabled={previewStep === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => {
                      if (previewStep < activeSections.length - 1) {
                        setPreviewStep(previewStep + 1);
                      } else {
                        setIsPreviewOpen(false);
                        toast.success("End of form preview");
                      }
                    }}
                  >
                    {previewStep < activeSections.length - 1 ? 'Next' : 'Finish Preview'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}

// SortableTableRow component for drag-and-drop reordering
function SortableTableRow({ section, index, previewSection, setPreviewSection, handleEdit, handleReactivate, handleDeactivate, handleDeleteClick, updateMutation }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${!section.isActive ? 'opacity-60 bg-gray-50/50' : ''} ${isDragging ? 'bg-amber-50' : ''}`}
    >
      <TableCell className="w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="text-gray-500">{section.sectionNumber || index + 1}</TableCell>
      <TableCell className="font-mono text-sm">{section.sectionKey}</TableCell>
      <TableCell className={`font-medium ${!section.isActive ? 'line-through text-gray-400' : ''}`}>
        {section.title}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {section.isRequired && (
            <Badge variant="outline" className="text-xs">Required</Badge>
          )}
          {section.requiresSignature && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Signature</Badge>
          )}
          {section.requiresCheckbox && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Checkbox</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {section.isActive ? (
          <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
        ) : (
          <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewSection(previewSection?.id === section.id ? null : section)}
            className="text-gray-600 hover:text-gray-900"
            title="Preview"
          >
            {previewSection?.id === section.id ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(section)}
            className="text-amber-600 hover:text-amber-700"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {!section.isActive && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReactivate(section)}
                className="text-green-600 hover:text-green-700"
                title="Reactivate"
                disabled={updateMutation.isPending}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(section)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Delete permanently"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {section.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(section)}
              className="text-gray-400 hover:text-gray-600"
              title="Deactivate"
              disabled={updateMutation.isPending}
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
