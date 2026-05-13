import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, Loader2 } from "lucide-react";
import { useState } from "react";

type Template = {
  id: number;
  name: string;
  subject: string;
  message: string;
  category?: string | null;
};

const categoryLabels: Record<string, string> = {
  product_updates: "Product Updates",
  promotions: "Promotions",
  reminders: "Reminders",
  general: "General",
};

type TemplateManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[] | undefined;
  onUpdateTemplate: (template: Template) => void;
  onDeleteTemplate: (id: number) => void;
  isUpdating?: boolean;
};

export default function TemplateManagerDialog({
  open,
  onOpenChange,
  templates,
  onUpdateTemplate,
  onDeleteTemplate,
  isUpdating = false,
}: TemplateManagerDialogProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const filteredTemplates = templates?.filter(t => 
    categoryFilter === "all" || t.category === categoryFilter
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Manage Templates
          </DialogTitle>
          <DialogDescription>
            View, edit, or delete your saved announcement templates.
          </DialogDescription>
        </DialogHeader>
        
        {/* Category Filter */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex gap-1 flex-wrap">
            {["all", "product_updates", "promotions", "reminders", "general"].map(cat => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === "all" ? "All" : categoryLabels[cat]}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredTemplates && filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg">
                {editingTemplate?.id === template.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="Template name"
                    />
                    <Select 
                      value={editingTemplate.category || "general"} 
                      onValueChange={(val) => setEditingTemplate({ ...editingTemplate, category: val })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product_updates">Product Updates</SelectItem>
                        <SelectItem value="promotions">Promotions</SelectItem>
                        <SelectItem value="reminders">Reminders</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      placeholder="Subject"
                    />
                    <textarea
                      className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                      value={editingTemplate.message}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                      placeholder="Message"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          onUpdateTemplate(editingTemplate);
                          setEditingTemplate(null);
                        }}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{template.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[template.category || "general"]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {template.message}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingTemplate({ ...template })}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Delete this template?")) {
                            onDeleteTemplate(template.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{categoryFilter === "all" ? "No templates saved yet" : `No ${categoryLabels[categoryFilter]} templates`}</p>
              <p className="text-sm mt-1">Save a template from the announcement dialog</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { categoryLabels };
export type { Template };
