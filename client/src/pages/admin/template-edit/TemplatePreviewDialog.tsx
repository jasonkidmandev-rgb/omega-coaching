import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

type Category = {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
};

type Item = {
  id: number;
  name: string;
  purpose?: string;
  schedule?: string;
  price: string;
  defaultQty: number;
};

type ItemsByCategory = {
  category: Category;
  items: Item[];
}[];

type FormData = {
  name: string;
  description: string;
  durationMonths: number;
  hidePricing: boolean;
};

type TemplatePreviewDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  selectedItems: Set<number>;
  recommendedItems: Set<number>;
  itemsByCategory: ItemsByCategory | undefined;
  allItems: Item[] | undefined;
};

export default function TemplatePreviewDialog({
  isOpen,
  onOpenChange,
  formData,
  selectedItems,
  recommendedItems,
  itemsByCategory,
  allItems,
}: TemplatePreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Template Preview: {formData.name}
          </DialogTitle>
          <DialogDescription>
            This is how the protocol will appear to clients when assigned.
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] pr-2">
          {/* Client-facing preview */}
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
              <h2 className="text-2xl font-bold">{formData.name}</h2>
              {formData.description && (
                <p className="mt-2 opacity-90">{formData.description}</p>
              )}
              <div className="mt-4 flex gap-4 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  {formData.durationMonths} Month Program
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  {selectedItems.size} Items
                </span>
              </div>
            </div>

            {/* Items by Category */}
            {itemsByCategory?.map(({ category, items }) => {
              const selectedInCategory = items.filter(item => selectedItems.has(item.id));
              if (selectedInCategory.length === 0) return null;
              
              return (
                <div key={category.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b">
                    <h3 className="font-semibold text-lg">{category.displayName || category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                  <div className="divide-y">
                    {selectedInCategory.map((item) => {
                      const isRecommended = recommendedItems.has(item.id);
                      return (
                        <div key={item.id} className="p-4 hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                {isRecommended && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Recommended</span>
                                )}
                              </div>
                              {item.purpose && (
                                <p className="text-sm text-muted-foreground mt-1">{item.purpose}</p>
                              )}
                              {item.schedule && (
                                <p className="text-xs text-blue-600 mt-2">
                                  <strong>Schedule:</strong> {item.schedule}
                                </p>
                              )}
                            </div>
                            {!formData.hidePricing && (
                              <div className="text-right">
                                <p className="font-semibold text-lg">${item.price}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.defaultQty}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            {!formData.hidePricing && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estimated Total</span>
                  <span className="text-2xl font-bold">
                    ${allItems?.filter(item => selectedItems.has(item.id))
                      .reduce((sum, item) => sum + (parseFloat(item.price || '0') * (item.defaultQty || 1)), 0)
                      .toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on default quantities. Actual pricing may vary.
                </p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
