import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, Send, UserPlus } from "lucide-react";

type ClientToResend = {
  id: number;
  name: string;
  email: string;
} | null;

type SendInviteDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientToResend: ClientToResend;
  customInviteMessage: string;
  setCustomInviteMessage: (message: string) => void;
  onSend: () => void;
  isSending: boolean;
};

export default function SendInviteDialog({
  isOpen,
  onOpenChange,
  clientToResend,
  customInviteMessage,
  setCustomInviteMessage,
  onSend,
  isSending,
}: SendInviteDialogProps) {
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) setCustomInviteMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Send Account Invite
          </DialogTitle>
          <DialogDescription>
            Send an account creation invite to this client
          </DialogDescription>
        </DialogHeader>
        {clientToResend && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="font-medium">{clientToResend.name}</p>
              <p className="text-sm text-muted-foreground">{clientToResend.email}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Custom Message (Optional)
              </label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a personal message to include in the invite email...\n\nExample: Looking forward to working with you on your health optimization journey!"
                value={customInviteMessage}
                onChange={(e) => setCustomInviteMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This message will appear in a highlighted section of the invite email.
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              📧 An email will be sent with a link to create their account and access their protocol.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setCustomInviteMessage("");
          }}>
            Cancel
          </Button>
          <Button onClick={onSend} disabled={isSending}>
            {isSending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Invite</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
