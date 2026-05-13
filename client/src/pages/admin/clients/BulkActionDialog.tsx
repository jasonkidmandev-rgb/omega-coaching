import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

type BulkActionType = 'send-email' | 'send-invite' | 'mark-paid' | 'mark-failed' | 'refund' | null;

type BulkActionDialogProps = {
  isOpen: boolean;
  action: BulkActionType;
  onClose: () => void;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: () => void;
};

export default function BulkActionDialog({
  isOpen,
  action,
  onClose,
  selectedCount,
  isLoading,
  onConfirm,
}: BulkActionDialogProps) {
  const getTitle = () => {
    switch (action) {
      case 'send-email': return 'Send Protocol Emails?';
      case 'send-invite': return 'Send Account Invites?';
      case 'mark-paid': return 'Mark Payments as Received?';
      case 'mark-failed': return 'Mark Payments as Failed?';
      case 'refund': return 'Process Refunds?';
      default: return 'Confirm Action';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'send-email':
        return `Send protocol link emails to ${selectedCount} selected client(s). Only clients with email addresses will receive emails.`;
      case 'send-invite':
        return `Send account creation invites to ${selectedCount} selected client(s). Clients who already have accounts will be skipped.`;
      default:
        return `This action will affect ${selectedCount} selected client(s).`;
    }
  };

  const getConfirmText = () => {
    switch (action) {
      case 'send-email': return 'Send Emails';
      case 'send-invite': return 'Send Invites';
      default: return 'Confirm';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {getConfirmText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
