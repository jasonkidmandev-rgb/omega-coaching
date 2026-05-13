import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type NoteType = 'general' | 'decision' | 'handoff' | 'issue' | 'update';

type NewNoteData = {
  noteType: NoteType;
  content: string;
};

type AddNoteDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newNoteData: NewNoteData;
  setNewNoteData: (data: NewNoteData) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function AddNoteDialog({
  isOpen,
  onOpenChange,
  newNoteData,
  setNewNoteData,
  onSubmit,
  isPending,
}: AddNoteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add an internal note to this project
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select
              value={newNoteData.noteType}
              onValueChange={(value: NoteType) => setNewNoteData({ ...newNoteData, noteType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="decision">Decision</SelectItem>
                <SelectItem value="handoff">Handoff</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              value={newNoteData.content}
              onChange={(e) => setNewNoteData({ ...newNoteData, content: e.target.value })}
              placeholder="Enter note content..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
