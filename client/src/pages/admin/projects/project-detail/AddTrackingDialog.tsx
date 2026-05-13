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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type NewTrackingData = {
  trackingNumber: string;
  carrier: string;
  description: string;
};

type AddTrackingDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newTrackingData: NewTrackingData;
  setNewTrackingData: (data: NewTrackingData | ((prev: NewTrackingData) => NewTrackingData)) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export default function AddTrackingDialog({
  isOpen,
  onOpenChange,
  newTrackingData,
  setNewTrackingData,
  onSubmit,
  isPending,
}: AddTrackingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tracking Information</DialogTitle>
          <DialogDescription>
            Add a tracking number for shipments related to this project
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="trackingNumber">Tracking Number *</Label>
            <Input
              id="trackingNumber"
              value={newTrackingData.trackingNumber}
              onChange={(e) => setNewTrackingData(prev => ({ ...prev, trackingNumber: e.target.value }))}
              placeholder="Enter tracking number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier</Label>
            <Select
              value={newTrackingData.carrier}
              onValueChange={(value) => setNewTrackingData(prev => ({ ...prev, carrier: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPS">UPS</SelectItem>
                <SelectItem value="FedEx">FedEx</SelectItem>
                <SelectItem value="USPS">USPS</SelectItem>
                <SelectItem value="DHL">DHL</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trackingDescription">Description</Label>
            <Input
              id="trackingDescription"
              value={newTrackingData.description}
              onChange={(e) => setNewTrackingData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Backorder shipment, Supplier drop ship"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
