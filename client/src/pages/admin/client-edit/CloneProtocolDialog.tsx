import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyPlus, Loader2, Plus, Trash2, User, UserPlus, Users } from "lucide-react";

type CloneMode = "new" | "existing" | "bulk";

type BulkCloneClient = {
  name: string;
  email: string;
};

type Client = {
  id: number;
  clientName: string;
  clientEmail: string | null;
};

type CloneProtocolDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number | null;
  cloneMode: CloneMode;
  setCloneMode: (mode: CloneMode) => void;
  cloneClientName: string;
  setCloneClientName: (name: string) => void;
  cloneClientEmail: string;
  setCloneClientEmail: (email: string) => void;
  selectedExistingClientId: number | null;
  setSelectedExistingClientId: (id: number | null) => void;
  bulkCloneClients: BulkCloneClient[];
  addBulkCloneRow: () => void;
  updateBulkCloneClient: (index: number, field: "name" | "email", value: string) => void;
  removeBulkCloneRow: (index: number) => void;
  alsoCreateClientProject: boolean;
  setAlsoCreateClientProject: (value: boolean) => void;
  protocolItemsCount: number;
  allClients: Client[] | undefined;
  resetCloneDialog: () => void;
  handleCloneProtocol: () => void;
  cloneMutation: { isPending: boolean };
  cloneToExistingMutation: { isPending: boolean };
  bulkCloneMutation: { isPending: boolean };
};

export default function CloneProtocolDialog({
  isOpen,
  onOpenChange,
  clientId,
  cloneMode,
  setCloneMode,
  cloneClientName,
  setCloneClientName,
  cloneClientEmail,
  setCloneClientEmail,
  selectedExistingClientId,
  setSelectedExistingClientId,
  bulkCloneClients,
  addBulkCloneRow,
  updateBulkCloneClient,
  removeBulkCloneRow,
  alsoCreateClientProject,
  setAlsoCreateClientProject,
  protocolItemsCount,
  allClients,
  resetCloneDialog,
  handleCloneProtocol,
  cloneMutation,
  cloneToExistingMutation,
  bulkCloneMutation,
}: CloneProtocolDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) resetCloneDialog();
    else onOpenChange(open);
  };

  const validBulkClients = bulkCloneClients.filter(c => c.name.trim()).length;
  const isPending = cloneMutation.isPending || cloneToExistingMutation.isPending || bulkCloneMutation.isPending;
  const isDisabled = isPending ||
    (cloneMode === "new" && !cloneClientName.trim()) ||
    (cloneMode === "existing" && !selectedExistingClientId) ||
    (cloneMode === "bulk" && !bulkCloneClients.some(c => c.name.trim()));

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Clone Protocol</DialogTitle>
          <DialogDescription>
            Duplicate this protocol's items, pricing, and settings.
          </DialogDescription>
        </DialogHeader>
        
        {/* Clone Mode Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setCloneMode("new")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              cloneMode === "new" ? "bg-background shadow-sm" : "hover:bg-background/50"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            New Client
          </button>
          <button
            onClick={() => setCloneMode("existing")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              cloneMode === "existing" ? "bg-background shadow-sm" : "hover:bg-background/50"
            }`}
          >
            <User className="h-4 w-4" />
            Existing Client
          </button>
          <button
            onClick={() => setCloneMode("bulk")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              cloneMode === "bulk" ? "bg-background shadow-sm" : "hover:bg-background/50"
            }`}
          >
            <Users className="h-4 w-4" />
            Bulk
          </button>
        </div>

        <div className="space-y-4 py-2">
          {/* New Client Mode */}
          {cloneMode === "new" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cloneClientName">New Client Name *</Label>
                <Input
                  id="cloneClientName"
                  value={cloneClientName}
                  onChange={(e) => setCloneClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloneClientEmail">Client Email (optional)</Label>
                <Input
                  id="cloneClientEmail"
                  type="email"
                  value={cloneClientEmail}
                  onChange={(e) => setCloneClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
            </>
          )}

          {/* Existing Client Mode */}
          {cloneMode === "existing" && (
            <>
              <div className="space-y-2">
                <Label>Select Existing Client *</Label>
                <Select
                  value={selectedExistingClientId?.toString() || ""}
                  onValueChange={(val) => setSelectedExistingClientId(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client to overwrite..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allClients?.filter(c => c.id !== clientId).map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.clientName} {c.clientEmail && `(${c.clientEmail})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-600 mb-1">⚠️ Warning</p>
                <p className="text-muted-foreground">
                  This will replace all protocol items for the selected client. Their existing protocol will be overwritten.
                </p>
              </div>
            </>
          )}

          {/* Bulk Clone Mode */}
          {cloneMode === "bulk" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>New Clients ({validBulkClients} valid)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBulkCloneRow}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Row
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bulkCloneClients.map((client, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={client.name}
                        onChange={(e) => updateBulkCloneClient(index, "name", e.target.value)}
                        placeholder="Client name *"
                        className="flex-1"
                      />
                      <Input
                        value={client.email}
                        onChange={(e) => updateBulkCloneClient(index, "email", e.target.value)}
                        placeholder="Email (optional)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBulkCloneRow(index)}
                        disabled={bulkCloneClients.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Also create Client Project option */}
          {(cloneMode === "new" || cloneMode === "bulk") && (
            <div className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <Checkbox
                id="alsoCreateClientProject"
                checked={alsoCreateClientProject}
                onCheckedChange={(checked) => setAlsoCreateClientProject(checked as boolean)}
              />
              <label
                htmlFor="alsoCreateClientProject"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Also create Client Project(s)
              </label>
            </div>
          )}

          {/* What will be cloned info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">What will be cloned:</p>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              <li>• {protocolItemsCount} protocol items</li>
              <li>• Pricing and discount settings</li>
              <li>• Program assignment</li>
              <li>• Custom requirements</li>
              {alsoCreateClientProject && <li className="text-blue-600">• New Client Project entry</li>}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetCloneDialog}>
            Cancel
          </Button>
          <Button onClick={handleCloneProtocol} disabled={isDisabled}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CopyPlus className="h-4 w-4 mr-2" />
            {cloneMode === "new" && "Clone Protocol"}
            {cloneMode === "existing" && "Overwrite Protocol"}
            {cloneMode === "bulk" && `Clone to ${validBulkClients} Clients`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
