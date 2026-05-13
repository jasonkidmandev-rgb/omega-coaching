import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import RichTextEditor from "@/components/RichTextEditor";
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

type Category = {
  id: number;
  name: string;
};

type EditItemDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[] | undefined;
  editItemName: string;
  setEditItemName: (name: string) => void;
  editItemCategory: string;
  setEditItemCategory: (category: string) => void;
  editItemPrice: string;
  setEditItemPrice: (price: string) => void;
  editItemSku: string;
  setEditItemSku: (sku: string) => void;
  editItemNotes: string;
  setEditItemNotes: (notes: string) => void;
  editItemLowStock: number;
  setEditItemLowStock: (lowStock: number) => void;
  editItemIsDiscountable: boolean;
  setEditItemIsDiscountable: (isDiscountable: boolean) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function EditItemDialog({
  isOpen,
  onOpenChange,
  categories,
  editItemName,
  setEditItemName,
  editItemCategory,
  setEditItemCategory,
  editItemPrice,
  setEditItemPrice,
  editItemSku,
  setEditItemSku,
  editItemNotes,
  setEditItemNotes,
  editItemLowStock,
  setEditItemLowStock,
  editItemIsDiscountable,
  setEditItemIsDiscountable,
  onSubmit,
  isPending,
}: EditItemDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update item details, pricing, and settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={editItemCategory} onValueChange={setEditItemCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              value={editItemName}
              onChange={(e) => setEditItemName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editItemPrice}
                onChange={(e) => setEditItemPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                placeholder="SKU-001"
                value={editItemSku}
                onChange={(e) => setEditItemSku(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Low Stock Alert Threshold</Label>
            <Input
              type="number"
              min={0}
              value={editItemLowStock}
              onChange={(e) => setEditItemLowStock(parseInt(e.target.value) || 5)}
            />
            <p className="text-xs text-muted-foreground">
              You'll be alerted when stock falls to or below this number
            </p>
          </div>
          <div className="space-y-2">
            <Label>Product Description / Notes</Label>
            <RichTextEditor
              content={editItemNotes}
              onChange={setEditItemNotes}
              placeholder="Product description, usage notes, or additional details..."
              minHeight="120px"
            />
            <p className="text-xs text-muted-foreground">Formatting (bold, lists, links) will be preserved</p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="editItemDiscountable"
              checked={editItemIsDiscountable}
              onCheckedChange={(checked) => setEditItemIsDiscountable(checked as boolean)}
            />
            <Label htmlFor="editItemDiscountable" className="text-sm font-normal">
              Eligible for 10% client discount
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
