import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileSignature, AlertTriangle, Clock, CheckCircle, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ReactNode } from "react";

type Waiver = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  parentGuardianName?: string | null;
  agreedAt: Date | string;
  expiresAt: Date | string | null;
  ipAddress?: string | null;
  signatureData?: string | null;
  renewalCount: number;
};

type ExpirationStatus = "active" | "expiring_soon" | "expired" | "no_expiration";

function getExpirationStatus(expiresAt: Date | string | null): { status: ExpirationStatus; daysLeft: number | null } {
  if (!expiresAt) {
    return { status: "no_expiration", daysLeft: null };
  }
  
  const expirationDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const today = new Date();
  const daysLeft = differenceInDays(expirationDate, today);
  
  if (daysLeft < 0) {
    return { status: "expired", daysLeft };
  } else if (daysLeft <= 30) {
    return { status: "expiring_soon", daysLeft };
  } else {
    return { status: "active", daysLeft };
  }
}

function ExpirationBadge({ expiresAt }: { expiresAt: Date | string | null }) {
  const { status, daysLeft } = getExpirationStatus(expiresAt);
  
  switch (status) {
    case "expired":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired {Math.abs(daysLeft!)} days ago
        </Badge>
      );
    case "expiring_soon":
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-600 bg-amber-50">
          <Clock className="h-3 w-3" />
          Expires in {daysLeft} days
        </Badge>
      );
    case "active":
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-600 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          Valid ({daysLeft} days left)
        </Badge>
      );
    case "no_expiration":
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          No Expiration
        </Badge>
      );
  }
}

type WaiverDetailsDialogProps = {
  waiver: Waiver | null;
  onClose: () => void;
  renewalHistorySection?: ReactNode;
};

export default function WaiverDetailsDialog({
  waiver,
  onClose,
  renewalHistorySection,
}: WaiverDetailsDialogProps) {
  return (
    <Dialog open={!!waiver} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Waiver Details
          </DialogTitle>
        </DialogHeader>
        {waiver && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">First Name</label>
                <p className="font-medium">{waiver.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                <p className="font-medium">{waiver.lastName}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-medium">{waiver.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="font-medium">{waiver.phone}</p>
            </div>
            {waiver.parentGuardianName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Parent/Guardian</label>
                <p className="font-medium">{waiver.parentGuardianName}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Signed At</label>
                <p className="font-medium">
                  {format(new Date(waiver.agreedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expires At</label>
                <p className="font-medium">
                  {waiver.expiresAt 
                    ? format(new Date(waiver.expiresAt), "MMM d, yyyy")
                    : "No Expiration"
                  }
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <ExpirationBadge expiresAt={waiver.expiresAt} />
              </div>
            </div>
            {waiver.ipAddress && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                <p className="font-medium font-mono text-sm">{waiver.ipAddress}</p>
              </div>
            )}
            {waiver.signatureData && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Signature</label>
                <div className="mt-2 border rounded-lg p-4 bg-white">
                  <img
                    src={waiver.signatureData}
                    alt="Signature"
                    className="max-h-24 mx-auto"
                  />
                </div>
              </div>
            )}
            {waiver.renewalCount > 0 && renewalHistorySection}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ExpirationBadge, getExpirationStatus };
export type { Waiver, ExpirationStatus };
