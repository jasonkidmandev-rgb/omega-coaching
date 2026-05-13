import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2, Send } from "lucide-react";

type EmailPdfDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  emailConfirmStep: "input" | "confirm";
  setEmailConfirmStep: (step: "input" | "confirm") => void;
  emailAddress: string;
  setEmailAddress: (email: string) => void;
  clientEmail: string | null | undefined;
  clientName: string | null | undefined;
  clientId: number | null;
  sendEmailMutation: {
    mutate: (params: { id: number; email?: string }) => void;
    isPending: boolean;
  };
};

export default function EmailPdfDialog({
  isOpen,
  onOpenChange,
  emailConfirmStep,
  setEmailConfirmStep,
  emailAddress,
  setEmailAddress,
  clientEmail,
  clientName,
  clientId,
  sendEmailMutation,
}: EmailPdfDialogProps) {
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setEmailConfirmStep("input");
      setEmailAddress("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        {emailConfirmStep === "input" ? (
          <>
            <DialogHeader>
              <DialogTitle>Email Protocol PDF</DialogTitle>
              <DialogDescription>
                Send the protocol PDF to the client via email. The email will include a link to view the protocol online.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={emailAddress || clientEmail || ""}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the client's email on file: {clientEmail || "(none)"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setEmailConfirmStep("confirm")}
                disabled={!emailAddress && !clientEmail}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Confirm Email Send
              </DialogTitle>
              <DialogDescription>
                Please confirm you want to send the protocol PDF.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Recipient:</span>
                  <span className="text-sm font-medium">{emailAddress || clientEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Client:</span>
                  <span className="text-sm font-medium">{clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Attachment:</span>
                  <span className="text-sm font-medium">Protocol PDF</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This action will send an email with the protocol PDF attached. The email cannot be unsent.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailConfirmStep("input")}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!clientId) return;
                  sendEmailMutation.mutate({
                    id: clientId,
                    email: emailAddress || undefined,
                  });
                }}
                disabled={sendEmailMutation.isPending}
                className="bg-primary"
              >
                {sendEmailMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Send className="h-4 w-4 mr-2" />
                Confirm & Send
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
