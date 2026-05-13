import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { HistoryItem } from "./AnnouncementHistoryDialog";

type HistoryItemDetailDialogProps = {
  item: HistoryItem | null;
  onClose: () => void;
};

export default function HistoryItemDetailDialog({
  item,
  onClose,
}: HistoryItemDetailDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Announcement Details</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subject</label>
              <p className="font-medium">{item.subject}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Message</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
                {item.message}
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Recipients</label>
                <p className="font-medium">{item.recipientCount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sent At</label>
                <p className="font-medium">
                  {format(new Date(item.sentAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            {item.status === 'sent' && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground block mb-3">Analytics</label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Opens</p>
                    <p className="text-2xl font-bold text-blue-600">{item.opens || 0}</p>
                    {item.recipientCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(((item.opens || 0) / item.recipientCount) * 100)}% open rate
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-2xl font-bold text-green-600">{item.clicks || 0}</p>
                    {(item.opens || 0) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(((item.clicks || 0) / (item.opens || 1)) * 100)}% click rate
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Engagement</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {item.recipientCount > 0 
                        ? Math.round(((item.opens || 0) / item.recipientCount) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
