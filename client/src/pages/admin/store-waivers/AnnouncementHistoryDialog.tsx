import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Mail, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

type HistoryItem = {
  id: number;
  subject: string;
  message: string;
  recipientCount: number;
  sentAt: Date | string;
  scheduledFor?: Date | string | null;
  status: "sent" | "scheduled" | "cancelled";
  opens?: number;
  clicks?: number;
};

type AnnouncementHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryItem[] | undefined;
  onSelectItem: (item: HistoryItem) => void;
};

export default function AnnouncementHistoryDialog({
  open,
  onOpenChange,
  history,
  onSelectItem,
}: AnnouncementHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Announcement History
          </DialogTitle>
          <DialogDescription>
            View all previously sent announcements and their recipient counts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {history && history.length > 0 ? (
            history.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${item.status === 'scheduled' ? 'border-amber-300 bg-amber-50/30' : ''}`}
                onClick={() => onSelectItem(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.subject}</p>
                      {item.status === 'scheduled' && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                      {item.status === 'sent' && (
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sent
                        </Badge>
                      )}
                      {item.status === 'cancelled' && (
                        <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                          Cancelled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.message}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <Badge variant="secondary">{item.recipientCount} recipients</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.status === 'scheduled' && item.scheduledFor ? (
                        <>Scheduled for {format(new Date(item.scheduledFor), "MMM d, yyyy 'at' h:mm a")}</>
                      ) : (
                        <>{format(new Date(item.sentAt), "MMM d, yyyy 'at' h:mm a")}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No announcements sent yet</p>
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

export type { HistoryItem };
