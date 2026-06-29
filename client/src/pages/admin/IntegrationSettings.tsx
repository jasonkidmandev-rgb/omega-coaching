import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  RotateCcw,
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
} from "lucide-react";
import { useLocation } from "wouter";

const NO_TEMPLATE = "none";

interface MappingForm {
  externalProductId: string;
  externalProductName: string;
  protocolTemplateId: string; // select value: template id as string, or NO_TEMPLATE
  tier: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: MappingForm = {
  externalProductId: "",
  externalProductName: "",
  protocolTemplateId: NO_TEMPLATE,
  tier: "",
  notes: "",
  isActive: true,
};

export default function IntegrationSettings() {
  const [, setLocation] = useLocation();
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MappingForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [eventStatusFilter, setEventStatusFilter] = useState<"all" | "processed" | "failed" | "received">("all");

  // Queries
  const mappings = trpc.externalIntegrations.listMappings.useQuery();
  const events = trpc.externalIntegrations.listEvents.useQuery(
    eventStatusFilter === "all" ? {} : { status: eventStatusFilter }
  );
  const templates = trpc.template.list.useQuery();

  // Mutations
  const createMapping = trpc.externalIntegrations.createMapping.useMutation({
    onSuccess: () => {
      toast.success("Product mapping created");
      setShowMappingDialog(false);
      mappings.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMapping = trpc.externalIntegrations.updateMapping.useMutation({
    onSuccess: () => {
      toast.success("Product mapping updated");
      setShowMappingDialog(false);
      setEditingId(null);
      mappings.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMapping = trpc.externalIntegrations.deleteMapping.useMutation({
    onSuccess: () => {
      toast.success("Product mapping deleted");
      setDeleteId(null);
      mappings.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const replayEvent = trpc.externalIntegrations.replayEvent.useMutation({
    onSuccess: (result) => {
      if (result.processed) {
        toast.success("Event replayed and processed successfully");
      } else {
        toast.warning(`Replay did not process: ${(result as any).reason || "see error in log"}`);
      }
      events.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const templateName = (id: number | null) => {
    if (!id) return null;
    return (templates.data || []).find((t: any) => t.id === id)?.name || `Template #${id}`;
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowMappingDialog(true);
  };

  const openEditDialog = (m: any) => {
    setEditingId(m.id);
    setForm({
      externalProductId: m.externalProductId || "",
      externalProductName: m.externalProductName || "",
      protocolTemplateId: m.protocolTemplateId ? String(m.protocolTemplateId) : NO_TEMPLATE,
      tier: m.tier || "",
      notes: m.notes || "",
      isActive: !!m.isActive,
    });
    setShowMappingDialog(true);
  };

  const saveMapping = () => {
    const payload = {
      externalProductId: form.externalProductId.trim(),
      externalProductName: form.externalProductName.trim() || undefined,
      protocolTemplateId: form.protocolTemplateId === NO_TEMPLATE ? null : parseInt(form.protocolTemplateId),
      tier: form.tier.trim() || null,
      isActive: form.isActive,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      updateMapping.mutate({ id: editingId, ...payload });
    } else {
      createMapping.mutate(payload);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Processed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border border-red-200"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "received":
        return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Received</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const payloadEmail = (payload: any) => {
    try {
      const p = typeof payload === "string" ? JSON.parse(payload) : payload;
      return p?.customer?.email || "—";
    } catch {
      return "—";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Webhook className="h-7 w-7 text-primary" />
              External Integrations
            </h1>
            <p className="text-muted-foreground mt-1">
              omegalongevity.com purchase webhook — product mappings and inbound event log
            </p>
          </div>
        </div>

        {/* Endpoint info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <Link2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Webhook endpoint</p>
              <code className="text-blue-700">POST /api/external/omegalongevity/v1/purchase</code>
              <p className="text-blue-700 mt-1">
                Spec for the sender: <code>docs/integrations/omegalongevity-webhook-spec.md</code>.
                Purchases for products without an active mapping are logged as Failed and can be
                replayed below after adding the mapping.
              </p>
            </div>
          </div>
        </div>

        {/* Product Mappings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Mappings</CardTitle>
                <CardDescription>
                  Map omegalongevity.com product IDs to protocol templates. Coaching-only packages can
                  leave the template empty — payment is recorded but no fulfillment is created.
                </CardDescription>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mappings.isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading…</p>
            ) : (mappings.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No mappings yet. Add one for each package once the partner shares their product IDs.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Protocol Template</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mappings.data || []).map((m: any) => (
                    <TableRow key={m.id} className={!m.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm">{m.externalProductId}</TableCell>
                      <TableCell>{m.externalProductName || "—"}</TableCell>
                      <TableCell>
                        {m.protocolTemplateId
                          ? templateName(m.protocolTemplateId)
                          : <span className="text-muted-foreground">Coaching only</span>}
                      </TableCell>
                      <TableCell>{m.tier || "—"}</TableCell>
                      <TableCell>
                        {m.isActive
                          ? <Badge className="bg-green-100 text-green-700 border border-green-200">Active</Badge>
                          : <Badge variant="secondary">Inactive</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Event Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inbound Event Log</CardTitle>
                <CardDescription>
                  Every webhook delivery is recorded here. Failed events (e.g. unmapped products) can be
                  replayed after fixing the cause.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {(["all", "processed", "failed", "received"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={eventStatusFilter === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEventStatusFilter(s)}
                    className="capitalize"
                  >
                    {s}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => events.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {events.isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading…</p>
            ) : (events.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No events yet. They will appear here as soon as the partner site sends its first purchase.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Received</TableHead>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(events.data || []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {toLocaleDateStringMT(e.receivedAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[160px] truncate" title={e.eventId}>
                        {e.eventId}
                      </TableCell>
                      <TableCell className="text-sm">{payloadEmail(e.payload)}</TableCell>
                      <TableCell>{statusBadge(e.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                        {e.status === "processed" ? (
                          <>
                            {e.enrollmentId && <span>Enrollment #{e.enrollmentId}</span>}
                            {e.clientProtocolId && <span> · Protocol #{e.clientProtocolId}</span>}
                          </>
                        ) : (
                          <span className="truncate block" title={e.errorMessage || ""}>{e.errorMessage || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.status !== "processed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={replayEvent.isPending}
                            onClick={() => replayEvent.mutate({ eventId: e.id })}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Replay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Mapping Dialog */}
        <Dialog open={showMappingDialog} onOpenChange={(open) => { if (!open) { setShowMappingDialog(false); setEditingId(null); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product Mapping" : "Add Product Mapping"}</DialogTitle>
              <DialogDescription>
                The product ID must exactly match what omegalongevity.com sends in
                <code className="mx-1">purchase.product_id</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>External Product ID *</Label>
                <Input
                  value={form.externalProductId}
                  onChange={(e) => setForm({ ...form, externalProductId: e.target.value })}
                  placeholder="e.g. omega-90day-flagship"
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={form.externalProductName}
                  onChange={(e) => setForm({ ...form, externalProductName: e.target.value })}
                  placeholder="e.g. 90-Day Flagship Protocol"
                />
              </div>
              <div>
                <Label>Protocol Template</Label>
                <Select
                  value={form.protocolTemplateId}
                  onValueChange={(v) => setForm({ ...form, protocolTemplateId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE}>None — coaching only (no fulfillment)</SelectItem>
                    {(templates.data || []).map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  When set, a paid purchase auto-creates the client's protocol from this template and
                  queues fulfillment (inventory, packing slip, emails).
                </p>
              </div>
              <div>
                <Label>Tier (optional)</Label>
                <Input
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value })}
                  placeholder="e.g. flagship"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowMappingDialog(false); setEditingId(null); }}>
                Cancel
              </Button>
              <Button
                onClick={saveMapping}
                disabled={!form.externalProductId.trim() || createMapping.isPending || updateMapping.isPending}
              >
                {editingId ? "Save Changes" : "Create Mapping"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Mapping Confirmation */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Mapping</DialogTitle>
              <DialogDescription>
                Purchases for this product will be logged as Failed (unmapped) until a new mapping is
                added. Consider deactivating instead if the package may return.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMapping.isPending}
                onClick={() => deleteId && deleteMapping.mutate({ id: deleteId })}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
