import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, FileText, Edit, Save, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Link } from "wouter";

export default function IntakeFormEditor() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [previewSection, setPreviewSection] = useState<any>(null);
  
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
  const { data: sections, isLoading } = trpc.transformation.getIntakeFormContent.useQuery();
  
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
    setEditIsRequired(section.isRequired);
    setEditRequiresSignature(section.requiresSignature);
    setEditRequiresCheckbox(section.requiresCheckbox);
    setEditIsActive(section.isActive);
    setIsEditOpen(true);
  };
  
  const handleSave = () => {
    if (!selectedSection) return;
    
    updateMutation.mutate({
      id: selectedSection.id,
      title: editTitle,
      displayText: editDisplayText,
      isRequired: editIsRequired,
      requiresSignature: editRequiresSignature,
      requiresCheckbox: editRequiresCheckbox,
      isActive: editIsActive,
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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }
  
  return (
    <AdminLayout>
    <div className="container max-w-6xl py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/enrollments">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-amber-500" />
              Intake Form Editor
            </h1>
            <p className="text-gray-600">Manage intake form sections and content</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
      
      {/* Sections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Form Sections</CardTitle>
          <CardDescription>
            Configure the sections that appear in the client intake form. Edit titles, content, and requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sections && sections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Section Key</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section: any, index: number) => (
                  <TableRow key={section.id}>
                    <TableCell className="text-gray-500">{section.sectionNumber || index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{section.sectionKey}</TableCell>
                    <TableCell className="font-medium">{section.title}</TableCell>
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
                        <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewSection(previewSection?.id === section.id ? null : section)}
                          className="text-gray-600 hover:text-gray-900"
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No form sections configured yet.</p>
              <p className="text-sm mt-1">Click "Add Section" to create your first section.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Panel */}
      {previewSection && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Preview: {previewSection.title}</CardTitle>
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
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Section: {selectedSection?.sectionKey}</DialogTitle>
            <DialogDescription>
              Update the title, content, and requirements for this section.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Section Title</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter section title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editDisplayText">Display Text / Legal Content</Label>
              <Textarea
                id="editDisplayText"
                value={editDisplayText}
                onChange={(e) => setEditDisplayText(e.target.value)}
                placeholder="Enter the text that will be displayed to clients..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                This text will be shown to clients in the intake form. Use plain text formatting.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="editIsRequired" className="cursor-pointer">Required Section</Label>
                <Switch
                  id="editIsRequired"
                  checked={editIsRequired}
                  onCheckedChange={setEditIsRequired}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="editIsActive" className="cursor-pointer">Active</Label>
                <Switch
                  id="editIsActive"
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="editRequiresSignature" className="cursor-pointer">Requires Signature</Label>
                <Switch
                  id="editRequiresSignature"
                  checked={editRequiresSignature}
                  onCheckedChange={setEditRequiresSignature}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="editRequiresCheckbox" className="cursor-pointer">Requires Checkbox</Label>
                <Switch
                  id="editRequiresCheckbox"
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
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Dialog */}
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
                <Label htmlFor="newSectionKey">Section Key (unique identifier)</Label>
                <Input
                  id="newSectionKey"
                  value={newSectionKey}
                  onChange={(e) => setNewSectionKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g., financial_agreement"
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newSectionNumber">Section Number</Label>
                <Input
                  id="newSectionNumber"
                  type="number"
                  value={newSectionNumber}
                  onChange={(e) => setNewSectionNumber(parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newTitle">Section Title</Label>
              <Input
                id="newTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter section title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newDisplayText">Display Text / Legal Content</Label>
              <Textarea
                id="newDisplayText"
                value={newDisplayText}
                onChange={(e) => setNewDisplayText(e.target.value)}
                placeholder="Enter the text that will be displayed to clients..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="newIsRequired" className="cursor-pointer">Required Section</Label>
                <Switch
                  id="newIsRequired"
                  checked={newIsRequired}
                  onCheckedChange={setNewIsRequired}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newSortOrder">Sort Order</Label>
                <Input
                  id="newSortOrder"
                  type="number"
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="newRequiresSignature" className="cursor-pointer">Requires Signature</Label>
                <Switch
                  id="newRequiresSignature"
                  checked={newRequiresSignature}
                  onCheckedChange={setNewRequiresSignature}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="newRequiresCheckbox" className="cursor-pointer">Requires Checkbox</Label>
                <Switch
                  id="newRequiresCheckbox"
                  checked={newRequiresCheckbox}
                  onCheckedChange={setNewRequiresCheckbox}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}