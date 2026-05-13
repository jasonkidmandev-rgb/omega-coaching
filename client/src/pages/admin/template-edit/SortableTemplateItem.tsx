import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableTemplateItemProps {
  id: number;
  item: {
    id: number;
    name: string;
    purpose?: string | null;
    price: string | null;
    defaultQty: number | null;
  };
  templateItem: any;
  isSelected: boolean;
  isRecommended: boolean;
  hidePricing: boolean;
  onToggle: (checked: boolean) => void;
  onRecommendedToggle: (checked: boolean) => void;
}

export default function SortableTemplateItem({
  id,
  item,
  templateItem,
  isSelected,
  isRecommended,
  hidePricing,
  onToggle,
  onRecommendedToggle,
}: SortableTemplateItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isSelected });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
        isSelected ? 'bg-primary/5 border border-primary/20' : ''
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
    >
      {isSelected && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox
        id={`item-${item.id}`}
        checked={isSelected}
        onCheckedChange={(checked) => onToggle(checked as boolean)}
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`item-${item.id}`}
          className="font-medium cursor-pointer"
        >
          {item.name}
        </label>
        {item.purpose && (
          <p className="text-sm text-muted-foreground truncate">
            {item.purpose}
          </p>
        )}
      </div>
      {isSelected && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rec:</span>
          <Switch
            checked={isRecommended}
            onCheckedChange={(checked) => onRecommendedToggle(checked)}
            className="scale-75"
          />
        </div>
      )}
      {!hidePricing && (
        <div className="text-right">
          <p className="font-medium">${item.price || '0'}</p>
          <p className="text-xs text-muted-foreground">
            Default: {item.defaultQty || 1}
          </p>
        </div>
      )}
      {hidePricing && (
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            Qty: {item.defaultQty || 1}
          </p>
        </div>
      )}
    </div>
  );
}
