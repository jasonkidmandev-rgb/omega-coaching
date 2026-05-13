import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

type EmailPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  message: string;
};

export default function EmailPreviewDialog({
  open,
  onOpenChange,
  subject,
  message,
}: EmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Email Preview
          </DialogTitle>
          <DialogDescription>
            This is how the email will appear to recipients. The recipient name will be personalized for each person.
          </DialogDescription>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden">
          {/* Email Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-center">
            <h2 className="text-2xl font-bold text-white">Omega Longevity</h2>
            <p className="text-amber-100 text-sm mt-1">Elite Level Health Optimization</p>
          </div>
          {/* Email Body */}
          <div className="p-6 bg-white">
            <div className="mb-4">
              <span className="text-sm text-muted-foreground">Subject:</span>
              <p className="font-semibold text-lg">{subject || "(No subject)"}</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-4">Dear <span className="font-semibold text-foreground">[Recipient Name]</span>,</p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message || "(No message)"}
              </div>
            </div>
          </div>
          {/* Email Footer */}
          <div className="bg-slate-50 p-4 text-center text-xs text-muted-foreground border-t">
            <p>© {new Date().getFullYear()} Omega Longevity. All rights reserved.</p>
            <p className="mt-1">This email was sent to you because you signed our store waiver.</p>
          </div>
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
