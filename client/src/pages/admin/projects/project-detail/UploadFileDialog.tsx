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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type FileCategory = 'document' | 'receipt' | 'packing_slip' | 'lab_results' | 'image' | 'other';

type UploadFileDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  uploadFile: File | null;
  setUploadFile: (file: File | null) => void;
  uploadCategory: FileCategory;
  setUploadCategory: (category: FileCategory) => void;
  uploadDescription: string;
  setUploadDescription: (description: string) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function UploadFileDialog({
  isOpen,
  onOpenChange,
  uploadFile,
  setUploadFile,
  uploadCategory,
  setUploadCategory,
  uploadDescription,
  setUploadDescription,
  onSubmit,
  isPending,
}: UploadFileDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload a document, receipt, or other file for this project
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadFile(file);
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={uploadCategory}
              onValueChange={(value) => setUploadCategory(value as FileCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="packing_slip">Packing Slip</SelectItem>
                <SelectItem value="lab_results">Lab Results</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileDescription">Description (optional)</Label>
            <Input
              id="fileDescription"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Brief description of the file"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
