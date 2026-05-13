import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

type NewSubtaskData = {
  name: string;
  description: string;
};

type AddSubtaskDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newSubtaskData: NewSubtaskData;
  setNewSubtaskData: (data: NewSubtaskData) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function AddSubtaskDialog({
  isOpen,
  onOpenChange,
  newSubtaskData,
  setNewSubtaskData,
  onSubmit,
  isPending,
}: AddSubtaskDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subtask</DialogTitle>
          <DialogDescription>
            Create a new subtask
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subtask Name *</Label>
            <Input
              value={newSubtaskData.name}
              onChange={(e) => setNewSubtaskData({ ...newSubtaskData, name: e.target.value })}
              placeholder="e.g., Send welcome email"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newSubtaskData.description}
              onChange={(e) => setNewSubtaskData({ ...newSubtaskData, description: e.target.value })}
              placeholder="Optional description..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Subtask
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
