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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type Category = {
  id: number;
  name: string;
};

type AddItemDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[] | undefined;
  newItemName: string;
  setNewItemName: (name: string) => void;
  newItemCategory: string;
  setNewItemCategory: (category: string) => void;
  newItemQuantity: number;
  setNewItemQuantity: (quantity: number) => void;
  newItemPrice: string;
  setNewItemPrice: (price: string) => void;
  newItemSku: string;
  setNewItemSku: (sku: string) => void;
  newItemNotes: string;
  setNewItemNotes: (notes: string) => void;
  newItemLowStock: number;
  setNewItemLowStock: (lowStock: number) => void;
  newItemIsDiscountable: boolean;
  setNewItemIsDiscountable: (isDiscountable: boolean) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function AddItemDialog({
  isOpen,
  onOpenChange,
  categories,
  newItemName,
  setNewItemName,
  newItemCategory,
  setNewItemCategory,
  newItemQuantity,
  setNewItemQuantity,
  newItemPrice,
  setNewItemPrice,
  newItemSku,
  setNewItemSku,
  newItemNotes,
  setNewItemNotes,
  newItemLowStock,
  setNewItemLowStock,
  newItemIsDiscountable,
  setNewItemIsDiscountable,
  onSubmit,
  isPending,
}: AddItemDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
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
              placeholder="e.g., BPC-157 (10mg)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Initial Quantity</Label>
              <Input
                type="number"
                min={0}
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU (optional)</Label>
              <Input
                placeholder="SKU-001"
                value={newItemSku}
                onChange={(e) => setNewItemSku(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Alert</Label>
              <Input
                type="number"
                min={0}
                value={newItemLowStock}
                onChange={(e) => setNewItemLowStock(parseInt(e.target.value) || 5)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Product Description / Notes (optional)</Label>
            <RichTextEditor
              content={newItemNotes}
              onChange={setNewItemNotes}
              placeholder="Product description, usage notes, or additional details..."
              minHeight="120px"
            />
            <p className="text-xs text-muted-foreground">Formatting (bold, lists, links) will be preserved</p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="newItemDiscountable"
              checked={newItemIsDiscountable}
              onCheckedChange={(checked) => setNewItemIsDiscountable(checked as boolean)}
            />
            <Label htmlFor="newItemDiscountable" className="text-sm font-normal">
              Eligible for 10% client discount
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
