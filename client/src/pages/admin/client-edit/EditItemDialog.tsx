import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";
import { Template } from "./types";

type EditItemData = {
  customSchedule: string;
  customDuration: string;
  customPrice: string;
  customNotes: string;
  customPurpose: string;
};

type TemplateSyncOption = 'none' | 'current' | 'all';

type EditItemDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editItemData: EditItemData;
  setEditItemData: React.Dispatch<React.SetStateAction<EditItemData>>;
  hidePricing: boolean;
  templateSyncOption: TemplateSyncOption;
  setTemplateSyncOption: (option: TemplateSyncOption) => void;
  selectedTemplate: Template | null;
  onSave: () => void;
};

export default function EditItemDialog({
  isOpen,
  onOpenChange,
  editItemData,
  setEditItemData,
  hidePricing,
  templateSyncOption,
  setTemplateSyncOption,
  selectedTemplate,
  onSave,
}: EditItemDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Edit any field below. Values are pre-populated from the current data — change only what you need.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customSchedule">Schedule</Label>
            <Input
              id="customSchedule"
              value={editItemData.customSchedule}
              onChange={(e) => setEditItemData({ ...editItemData, customSchedule: e.target.value })}
              placeholder="e.g., 2x/day Mon-Fri, 500mcg before bed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customDuration">Duration</Label>
            <Input
              id="customDuration"
              value={editItemData.customDuration}
              onChange={(e) => setEditItemData({ ...editItemData, customDuration: e.target.value })}
              placeholder="e.g., 60 days, 12 weeks"
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
          {!hidePricing && (
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
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <RichTextEditor
              content={editItemData.customNotes}
              onChange={(html) => setEditItemData({ ...editItemData, customNotes: html })}
              placeholder="Additional notes specific to this client..."
              minHeight="120px"
            />
            <p className="text-xs text-muted-foreground">Formatting (bold, lists, links) will be preserved</p>
          </div>

          {/* Template Sync Options */}
          <div className="border-t pt-4 mt-4">
            <Label className="text-sm font-medium">Save to Master Templates</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Optionally save schedule/duration changes to master templates for future protocols
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sync-none"
                  name="templateSync"
                  value="none"
                  checked={templateSyncOption === 'none'}
                  onChange={() => setTemplateSyncOption('none')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sync-none" className="text-sm font-normal cursor-pointer">
                  This client only (default)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sync-current"
                  name="templateSync"
                  value="current"
                  checked={templateSyncOption === 'current'}
                  onChange={() => setTemplateSyncOption('current')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sync-current" className="text-sm font-normal cursor-pointer">
                  Save to current template ({selectedTemplate?.name || 'Master Template'})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="sync-all"
                  name="templateSync"
                  value="all"
                  checked={templateSyncOption === 'all'}
                  onChange={() => setTemplateSyncOption('all')}
                  className="h-4 w-4"
                />
                <Label htmlFor="sync-all" className="text-sm font-normal cursor-pointer">
                  Save to ALL templates using this product
                </Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
