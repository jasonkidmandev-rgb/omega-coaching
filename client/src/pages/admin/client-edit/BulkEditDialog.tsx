import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BulkEditDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemCount: number;
  bulkEditValue: string;
  setBulkEditValue: (value: string) => void;
  onApply: () => void;
};

export default function BulkEditDialog({
  isOpen,
  onOpenChange,
  selectedItemCount,
  bulkEditValue,
  setBulkEditValue,
  onApply,
}: BulkEditDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedItemCount} Items</DialogTitle>
          <DialogDescription>
            Apply the same schedule to all selected items in this client's protocol.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bulkSchedule">New Schedule</Label>
            <Input
              id="bulkSchedule"
              value={bulkEditValue}
              onChange={(e) => setBulkEditValue(e.target.value)}
              placeholder="e.g., 2x/day, 500mcg before bed"
            />
            <p className="text-xs text-muted-foreground">
              This will override the schedule for all {selectedItemCount} selected items
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This changes the schedule for this client only. To update master templates, use the Protocol Items page.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} className="bg-orange-600 hover:bg-orange-700">
            Apply to {selectedItemCount} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
