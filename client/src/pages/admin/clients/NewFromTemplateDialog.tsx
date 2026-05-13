import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";

type Template = {
  id: number;
  name: string;
};

type NewFromTemplateDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplateId: number | null;
  setSelectedTemplateId: (id: number | null) => void;
  newClientName: string;
  setNewClientName: (name: string) => void;
  newClientEmail: string;
  setNewClientEmail: (email: string) => void;
  activateInProjects: boolean;
  setActivateInProjects: (active: boolean) => void;
  templates: Template[] | undefined;
  onSubmit: () => void;
  isPending: boolean;
};

export default function NewFromTemplateDialog({
  isOpen,
  onOpenChange,
  selectedTemplateId,
  setSelectedTemplateId,
  newClientName,
  setNewClientName,
  newClientEmail,
  setNewClientEmail,
  activateInProjects,
  setActivateInProjects,
  templates,
  onSubmit,
  isPending,
}: NewFromTemplateDialogProps) {
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  // Check for existing protocols when email changes
  const { data: existingProtocols } = trpc.clientProtocol.checkDuplicate.useQuery(
    { email: newClientEmail },
    { enabled: !!newClientEmail && newClientEmail.includes("@") }
  );

  useEffect(() => {
    if (existingProtocols && existingProtocols.length > 0) {
      const names = existingProtocols.map((p: any) => p.versionName || p.clientName).join(", ");
      setDuplicateWarning(
        `This email already has ${existingProtocols.length} existing protocol(s): ${names}. Creating a new one will add it as a new version.`
      );
      setDuplicateConfirmed(false);
    } else {
      setDuplicateWarning(null);
      setDuplicateConfirmed(false);
    }
  }, [existingProtocols]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedTemplateId(null);
      setNewClientName("");
      setNewClientEmail("");
      setActivateInProjects(false);
      setDuplicateWarning(null);
      setDuplicateConfirmed(false);
    }
  };

  const canSubmit = !isPending && !!selectedTemplateId && !!newClientName.trim() && 
    (!duplicateWarning || duplicateConfirmed);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Client from Template</DialogTitle>
          <DialogDescription>
            Quickly create a new client protocol by selecting a template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Template *</label>
            <Select
              value={selectedTemplateId?.toString() || ""}
              onValueChange={(val) => setSelectedTemplateId(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Name *</label>
            <Input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Enter client name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Email (optional)</label>
            <Input
              type="email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          {duplicateWarning && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-amber-800">{duplicateWarning}</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="confirmDuplicate"
                    checked={duplicateConfirmed}
                    onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="confirmDuplicate" className="text-sm font-medium text-amber-700">
                    I understand, create a new version anyway
                  </label>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="activateInProjects"
              checked={activateInProjects}
              onChange={(e) => setActivateInProjects(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="activateInProjects" className="text-sm font-medium text-gray-700">
              Activate in Client Projects
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            When checked, this client will appear as active in Client Projects for workflow management.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Plus className="h-4 w-4 mr-2" />
            {duplicateWarning && duplicateConfirmed ? "Create New Version" : "Create Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
