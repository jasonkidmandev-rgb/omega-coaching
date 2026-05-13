import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Loader2, Search, CheckSquare, Square } from "lucide-react";

type Template = {
  id: number;
  name: string;
};

type Category = {
  id: number;
  name: string;
};

type SourceTemplateItem = {
  id: number;
  protocolItemId: number;
  name: string;
  purpose?: string;
  isRecommended: boolean;
};

type SourceItemsByCategory = {
  category: Category;
  items: SourceTemplateItem[];
}[];

type CopyFromTemplateDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[] | undefined;
  currentTemplateId: number | null;
  sourceTemplateId: number | null;
  onSelectSourceTemplate: (id: number) => void;
  isLoadingSourceItems: boolean;
  sourceTemplateItems: SourceTemplateItem[];
  sourceItemsByCategory: SourceItemsByCategory;
  filteredSourceItems: SourceTemplateItem[];
  importSearchQuery: string;
  setImportSearchQuery: (query: string) => void;
  itemsToImport: Set<number>;
  setItemsToImport: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedItems: Set<number>;
  onImport: () => void;
};

export default function CopyFromTemplateDialog({
  isOpen,
  onOpenChange,
  templates,
  currentTemplateId,
  sourceTemplateId,
  onSelectSourceTemplate,
  isLoadingSourceItems,
  sourceTemplateItems,
  sourceItemsByCategory,
  filteredSourceItems,
  importSearchQuery,
  setImportSearchQuery,
  itemsToImport,
  setItemsToImport,
  selectedItems,
  onImport,
}: CopyFromTemplateDialogProps) {
  if (!templates || templates.length <= 1) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Copy from Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Copy Items from Template</DialogTitle>
          <DialogDescription>
            Select a source template and choose which items to import into this template.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Source template selector */}
          <div className="space-y-2">
            <Label>Select Source Template</Label>
            <Select
              value={sourceTemplateId?.toString() || ''}
              onValueChange={(value) => onSelectSourceTemplate(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates
                  .filter((t) => t.id !== currentTemplateId)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Loading state */}
          {isLoadingSourceItems && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Items list */}
          {sourceTemplateId && !isLoadingSourceItems && sourceTemplateItems.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={importSearchQuery}
                    onChange={(e) => setImportSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSet = new Set(itemsToImport);
                      filteredSourceItems.forEach(item => {
                        if (!selectedItems.has(item.protocolItemId)) {
                          newSet.add(item.protocolItemId);
                        }
                      });
                      setItemsToImport(newSet);
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItemsToImport(new Set())}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <div className="h-[400px] border rounded-md p-4 overflow-y-auto">
                <div className="space-y-6">
                  {sourceItemsByCategory.map(({ category, items }) => (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center justify-between sticky top-0 bg-white py-2 border-b">
                        <h4 className="font-semibold text-sm">
                          {category.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {items.filter(i => itemsToImport.has(i.protocolItemId)).length} of {items.length} selected
                        </span>
                      </div>
                      <div className="space-y-2 pl-1">
                        {items.map((item) => {
                          const alreadyInTemplate = selectedItems.has(item.protocolItemId);
                          const isSelected = itemsToImport.has(item.protocolItemId);
                          return (
                            <label
                              key={item.id}
                              htmlFor={`import-${item.id}`}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                alreadyInTemplate 
                                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' 
                                  : isSelected
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <Checkbox
                                id={`import-${item.id}`}
                                checked={isSelected}
                                disabled={alreadyInTemplate}
                                className="mt-0.5 h-5 w-5"
                                onCheckedChange={(checked) => {
                                  setItemsToImport(prev => {
                                    const newSet = new Set(prev);
                                    if (checked) {
                                      newSet.add(item.protocolItemId);
                                    } else {
                                      newSet.delete(item.protocolItemId);
                                    }
                                    return newSet;
                                  });
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${alreadyInTemplate ? 'line-through text-gray-400' : ''}`}>
                                    {item.name}
                                  </span>
                                  {item.isRecommended && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex-shrink-0">Rec</span>
                                  )}
                                </div>
                                {item.purpose && (
                                  <p className="text-xs text-muted-foreground mt-1">{item.purpose}</p>
                                )}
                                {alreadyInTemplate && (
                                  <p className="text-xs text-amber-600 mt-1">Already in this template</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {itemsToImport.size} items selected for import
              </p>
            </>
          )}
          
          {sourceTemplateId && !isLoadingSourceItems && sourceTemplateItems.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              This template has no items.
            </p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onImport}
            disabled={itemsToImport.size === 0}
          >
            Import {itemsToImport.size} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
