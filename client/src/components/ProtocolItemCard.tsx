import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Video,
  Info,
  Clock,
  Calendar,
  DollarSign,
  Package,
  Pill,
  Beaker,
  Sparkles,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtocolItemCardProps {
  name: string;
  itemType: string;
  schedule?: string | null;
  duration?: string | null;
  price?: string | null;
  quantity: number;
  purpose?: string | null;
  notes?: string | null;
  affiliateUrl?: string | null;
  affiliateCode?: string | null;
  loomVideoUrl?: string | null;
  isRecommended?: boolean;
  showPrice?: boolean;
  customSchedule?: string | null;
  customDuration?: string | null;
  customPrice?: string | null;
  customNotes?: string | null;
}

const itemTypeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  peptide: { icon: Pill, color: "text-blue-600", bg: "bg-blue-50" },
  supplement: { icon: Sparkles, color: "text-green-600", bg: "bg-green-50" },
  adjunct: { icon: Beaker, color: "text-purple-600", bg: "bg-purple-50" },
  supply: { icon: Box, color: "text-orange-600", bg: "bg-orange-50" },
  service: { icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50" },
  other: { icon: Package, color: "text-slate-600", bg: "bg-slate-50" },
};

export function ProtocolItemCard({
  name,
  itemType,
  schedule,
  duration,
  price,
  quantity,
  purpose,
  notes,
  affiliateUrl,
  affiliateCode,
  loomVideoUrl,
  isRecommended,
  showPrice = true,
  customSchedule,
  customDuration,
  customPrice,
  customNotes,
}: ProtocolItemCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const config = itemTypeConfig[itemType] || itemTypeConfig.other;
  const Icon = config.icon;
  
  const displaySchedule = customSchedule || schedule;
  const displayDuration = customDuration || duration;
  const displayPrice = customPrice || price;
  const displayNotes = customNotes || notes;
  
  const hasDetails = purpose || displayNotes || loomVideoUrl || affiliateUrl;

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isRecommended && "border-primary/30 bg-primary/5"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-sm leading-tight">
                    {name}
                    {quantity > 1 && (
                      <span className="text-muted-foreground ml-1">×{quantity}</span>
                    )}
                  </h4>
                  {isRecommended && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Recommended
                    </Badge>
                  )}
                </div>
                {showPrice && displayPrice && (
                  <span className="text-sm font-semibold text-primary shrink-0">
                    ${parseFloat(displayPrice).toFixed(2)}
                  </span>
                )}
              </div>
              
              {/* Schedule & Duration */}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {displaySchedule && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {displaySchedule}
                  </span>
                )}
                {displayDuration && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {displayDuration}
                  </span>
                )}
              </div>
              
              {/* Expandable Details */}
              {hasDetails && (
                <>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isOpen ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Less details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          More details
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-3 space-y-3">
                    {purpose && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Purpose
                        </p>
                        <p className="text-sm">{purpose}</p>
                      </div>
                    )}
                    
                    {displayNotes && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Notes
                        </p>
                        <p className="text-sm whitespace-pre-line">{displayNotes}</p>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {loomVideoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open(loomVideoUrl, "_blank")}
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Watch Video
                        </Button>
                      )}
                      {affiliateUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open(affiliateUrl, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Purchase
                          {affiliateCode && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              Code: {affiliateCode}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
