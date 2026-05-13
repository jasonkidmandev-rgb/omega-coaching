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

type AdjustType = "sell" | "restock" | "adjust";

type SelectedItem = {
  name: string;
  quantity: number;
} | null;

type AdjustQuantityDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  adjustType: AdjustType;
  selectedItem: SelectedItem;
  adjustQuantity: number;
  setAdjustQuantity: (quantity: number) => void;
  adjustNotes: string;
  setAdjustNotes: (notes: string) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function AdjustQuantityDialog({
  isOpen,
  onOpenChange,
  adjustType,
  selectedItem,
  adjustQuantity,
  setAdjustQuantity,
  adjustNotes,
  setAdjustNotes,
  onSubmit,
  isPending,
}: AdjustQuantityDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {adjustType === "sell" ? "Record Sale" : adjustType === "restock" ? "Restock Item" : "Adjust Quantity"}
          </DialogTitle>
          <DialogDescription>
            {selectedItem?.name} - Current stock: {selectedItem?.quantity}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 1)}
            />
            {adjustType === "sell" && selectedItem && (
              <p className="text-sm text-muted-foreground">
                New stock will be: {selectedItem.quantity - adjustQuantity}
              </p>
            )}
            {adjustType === "restock" && selectedItem && (
              <p className="text-sm text-muted-foreground">
                New stock will be: {selectedItem.quantity + adjustQuantity}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="e.g., Sold to client John Doe"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            variant={adjustType === "sell" ? "destructive" : "default"}
          >
            {adjustType === "sell" ? "Record Sale" : adjustType === "restock" ? "Add Stock" : "Adjust"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
