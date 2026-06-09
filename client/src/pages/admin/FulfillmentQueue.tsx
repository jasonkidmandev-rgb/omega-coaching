import { useState } from "react";
import { trpc } from "../../lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, AlertTriangle, Truck, Clock, CheckCircle2,
  RefreshCw, ChevronRight, MapPin, ExternalLink, Box,
  Circle, ChevronLeft, Printer,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDate, formatDaysAgo } from "@/lib/dateUtils";

// ─── Small reusable components ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    partial: "bg-orange-100 text-orange-700",
    complete: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
    backordered: "bg-red-100 text-red-700",
    fulfilled: "bg-green-100 text-green-700",
  };
  return (
    <Badge className={`${colors[status] || "bg-gray-100 text-gray-600"} text-xs`}>
      {status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
    </Badge>
  );
}

function ShipSourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const labels: Record<string, string> = {
    omega: "Omega",
    dropship: "Dropship",
    vendor: "Vendor",
    client_sourced: "Client Sourced",
  };
  return (
    <Badge variant="outline" className="text-xs shrink-0">
      {labels[source] || source}
    </Badge>
  );
}

function ProgressBar({ fulfilled, total, slim = false }: { fulfilled: number; total: number; slim?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((fulfilled / total) * 100)) : 0;
  const barColor = pct === 100 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-300";
  if (slim) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden" aria-hidden="true">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{fulfilled}/{total}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {fulfilled} / {total} units
      </span>
    </div>
  );
}

function slipDaysOld(createdAt: string | Date): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function getUrgencyBand(slip: any): "urgent" | "attention" | "progress" {
  const days = slipDaysOld(slip.createdAt);
  if (days >= 7 || slip.totalBackordered > 0) return "urgent";
  if (days >= 3) return "attention";
  return "progress";
}

function AgeLabel({ createdAt }: { createdAt: string | Date }) {
  const days = slipDaysOld(createdAt);
  const cls =
    days >= 7 ? "text-red-600 font-semibold"
    : days >= 3 ? "text-yellow-600 font-medium"
    : "text-muted-foreground";
  return <span className={`text-xs ${cls}`}>{formatDaysAgo(createdAt)}</span>;
}

const URGENCY_GROUPS = [
  { key: "urgent" as const,    label: "Urgent",          dotClass: "bg-red-500",    textClass: "text-red-700",    description: "7+ days or backordered" },
  { key: "attention" as const, label: "Needs Attention", dotClass: "bg-yellow-500", textClass: "text-yellow-700", description: "3–6 days" },
  { key: "progress" as const,  label: "In Progress",     dotClass: "bg-green-500",  textClass: "text-green-700",  description: "Under 3 days" },
];

function printSingleLabel(slip: any) {
  const win = window.open("", "_blank", "width=450,height=600");
  if (!win) { alert("Allow popups to print shipping labels."); return; }
  const from = { name: "Omega Longevity", street: "1098 W. South Jordan Pkwy #106", city: "South Jordan", state: "UT", zip: "84095" };
  win.document.write(`<!DOCTYPE html><html><head><title>Label PS-${slip.id}</title><style>
    @page{size:4in 6in;margin:0}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;width:4in;height:6in;padding:0.25in}
    .header{text-align:center;font-size:14px;font-weight:bold;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:12px}
    .section{margin-bottom:12px}.label{font-size:9px;font-weight:bold;text-transform:uppercase;color:#666;margin-bottom:2px}
    .name{font-size:13px;font-weight:bold}.addr{font-size:11px;line-height:1.5}
    .barcode{text-align:center;border:1px solid #ccc;padding:8px;margin-top:16px;font-size:12px;letter-spacing:2px;font-family:monospace}
    .footer{display:flex;justify-content:space-between;font-size:9px;color:#666;margin-top:8px}
  </style></head><body>
    <div class="header">OMEGA LONGEVITY</div>
    <div class="section"><div class="label">From:</div><div class="addr">${from.name}<br>${from.street}<br>${from.city}, ${from.state} ${from.zip}</div></div>
    <div class="section"><div class="label">Ship To:</div><div class="name">${slip.shippingName || slip.clientName}</div>
    <div class="addr">${slip.shippingStreet || ""}<br>${slip.shippingCity || ""}, ${slip.shippingState || ""} ${slip.shippingZip || ""}</div></div>
    <div class="barcode">PS-${String(slip.id).padStart(6, "0")}</div>
    <div class="footer"><span>Order #${slip.id}</span><span>${new Date().toLocaleDateString()}</span></div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ─── Left rail: compact slip list ────────────────────────────────────────────

function SlipListRail({
  grouped,
  selectedSlipId,
  recentlyCompleted,
  onSelect,
  navigate,
}: {
  grouped: Record<string, any[]>;
  selectedSlipId: number | null;
  recentlyCompleted: any[];
  onSelect: (id: number) => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {recentlyCompleted.length > 0 && (
        <div>
          <div className="sticky top-0 z-10 bg-gray-100 border-b border-t px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0 bg-gray-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-gray-500">Recently Completed</span>
            <span className="text-xs text-muted-foreground ml-auto">{recentlyCompleted.length}</span>
          </div>
          {recentlyCompleted.map((slip: any) => (
            <button
              key={slip.id}
              onClick={() => navigate(`/admin/packing-slips/${slip.id}`)}
              className="w-full text-left px-3 py-2.5 border-b border-l-[3px] border-l-transparent hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 opacity-60 hover:opacity-100"
              aria-label={`View completed slip for ${slip.clientName}, PS-${slip.id}`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="font-medium text-sm truncate">{slip.clientName}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden="true" />
              </div>
              <div className="text-xs text-muted-foreground">
                Signed {formatDaysAgo(slip.signedAt)} · {slip.totalItems} items
              </div>
            </button>
          ))}
        </div>
      )}
      {URGENCY_GROUPS.filter(g => grouped[g.key].length > 0).map(group => (
        <div key={group.key}>
          <div className="sticky top-0 z-10 bg-gray-100 border-b border-t px-3 py-1.5 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${group.dotClass}`} aria-hidden="true" />
            <span className={`text-xs font-semibold ${group.textClass}`}>{group.label}</span>
            <span className="text-xs text-muted-foreground ml-auto">{grouped[group.key].length}</span>
          </div>

          {grouped[group.key].map(slip => {
            const selected = selectedSlipId === slip.id;
            return (
              <button
                key={slip.id}
                onClick={() => onSelect(slip.id)}
                className={`w-full text-left px-3 py-3 border-b transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
                  ${selected
                    ? "bg-white border-l-[3px] border-l-blue-500"
                    : "hover:bg-white border-l-[3px] border-l-transparent"
                  }`}
                aria-pressed={selected}
                aria-label={`Select packing slip for ${slip.clientName}, PS-${slip.id}`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-medium text-sm leading-tight truncate">{slip.clientName}</span>
                  {slip.totalBackordered > 0 && (
                    <Badge variant="destructive" className="text-xs shrink-0 ml-1">
                      {slip.totalBackordered}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge status={slip.status} />
                  <AgeLabel createdAt={slip.createdAt} />
                </div>
                <div className="mt-1.5">
                  <ProgressBar fulfilled={slip.totalFulfilled} total={slip.totalItems} slim />
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Right panel: slip detail with inline fulfillment ─────────────────────────

function SlipDetailPanel({
  slip,
  pendingItemIds,
  onFulfillItem,
  onBack,
  navigate,
}: {
  slip: any;
  pendingItemIds: Set<number>;
  onFulfillItem: (itemId: number, quantity: number) => void;
  onBack: () => void;
  navigate: (path: string) => void;
}) {
  const allPendingDone = (slip.pendingItems || []).length === 0;

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Mobile back button */}
      <div className="md:hidden px-4 pt-3 pb-1 border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs -ml-2">
          <ChevronLeft className="h-3 w-3 mr-1" aria-hidden="true" />
          Back to list
        </Button>
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={slip.status} />
              <Badge variant="outline" className="text-xs capitalize">{slip.source}</Badge>
              {slip.signedAt && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-300">Signed</Badge>
              )}
              {slip.isLocked && (
                <Badge variant="outline" className="text-xs text-gray-500">Locked</Badge>
              )}
              <span className="text-xs text-muted-foreground">PS-{slip.id} •</span>
              <AgeLabel createdAt={slip.createdAt} />
            </div>
            <h2 className="text-lg font-bold">{slip.clientName}</h2>
            <a
              href={`mailto:${slip.clientEmail}`}
              className="text-sm text-muted-foreground hover:text-blue-600 hover:underline"
              aria-label={`Email ${slip.clientName} at ${slip.clientEmail}`}
            >
              {slip.clientEmail}
            </a>
            {slip.shippingStreet && (
              <div className="flex items-start gap-1 mt-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{slip.shippingStreet}, {slip.shippingCity}, {slip.shippingState} {slip.shippingZip}</span>
              </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {slip.shippingStreet && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => printSingleLabel(slip)}
                aria-label={`Print shipping label for ${slip.clientName}`}
              >
                <Printer className="h-3 w-3 mr-1" aria-hidden="true" />
                Label
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => navigate(`/admin/packing-slips/${slip.id}`)}
              aria-label={`Open full packing slip for ${slip.clientName} (PS-${slip.id})`}
            >
              <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
              Full Slip
            </Button>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar fulfilled={slip.totalFulfilled} total={slip.totalItems} />

        {/* Tracking */}
        {slip.trackingNumber && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 rounded-md px-3 py-2">
            <Truck className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
            <span className="font-medium text-blue-700">{slip.trackingCarrier || "Tracking"}:</span>
            {slip.trackingUrl ? (
              <a
                href={slip.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                aria-label={`Track ${slip.trackingNumber} via ${slip.trackingCarrier} (opens in new tab)`}
              >
                {slip.trackingNumber}
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-blue-700 truncate">{slip.trackingNumber}</span>
            )}
          </div>
        )}

        {/* Items */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Items</h3>
          <div className="space-y-1 rounded-md border overflow-hidden">
            {(slip.items || []).length === 0 && (
              <p className="text-sm text-muted-foreground p-3">No items on this slip.</p>
            )}
            {(slip.items || []).map((item: any, idx: number) => {
              const isFulfilled = item.status === "fulfilled" || item.quantityFulfilled >= item.quantity;
              const isBackordered = !isFulfilled && (item.status === "backordered" || item.quantityBackordered > 0);
              const isLoading = pendingItemIds.has(item.id);
              const isLocked = slip.isLocked || !!slip.signedAt;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm
                    ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    ${isFulfilled ? "opacity-50" : ""}
                  `}
                >
                  {/* Status icon */}
                  {isFulfilled ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" aria-hidden="true" />
                  ) : isBackordered ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300 shrink-0" aria-hidden="true" />
                  )}

                  {/* Name + qty */}
                  <div className="flex-1 min-w-0">
                    <span className={isFulfilled ? "line-through text-muted-foreground" : "font-medium"}>
                      {item.itemName}
                    </span>
                    <span className="text-muted-foreground ml-1.5">×{item.quantity}</span>
                    {isBackordered && (
                      <span className="text-red-600 text-xs ml-2">
                        {item.quantityBackordered} backordered
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{item.notes}</p>
                    )}
                  </div>

                  <ShipSourceBadge source={item.shipSource} />

                  {/* Inline fulfill */}
                  {!isFulfilled && !isBackordered && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 shrink-0"
                      disabled={isLoading || isLocked}
                      onClick={() => onFulfillItem(item.id, item.quantity)}
                      aria-label={`Mark ${item.itemName} as fulfilled`}
                    >
                      {isLoading
                        ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                        : "Fulfill"
                      }
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        {allPendingDone && !slip.signedAt && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">Ready to sign</p>
              <p className="text-xs text-green-700">All items fulfilled — open the full slip to sign and lock.</p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => navigate(`/admin/packing-slips/${slip.id}`)}
              aria-label={`Sign packing slip for ${slip.clientName}`}
            >
              Sign & Lock
              <ChevronRight className="h-3 w-3 ml-1" aria-hidden="true" />
            </Button>
          </div>
        )}

        {slip.isLocked && !slip.signedAt && (
          <p className="text-xs text-muted-foreground text-center">
            This slip is locked. Open the full slip to unlock and make changes.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FulfillmentQueue() {
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedSlipId, setSelectedSlipId] = useState<number | null>(null);
  const [pendingItemIds, setPendingItemIds] = useState(new Set<number>());
  const [, navigate] = useLocation();

  const queue = trpc.fulfillmentQueue.list.useQuery(undefined, { refetchInterval: 30000 });
  const backorders = trpc.fulfillmentQueue.backorders.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: activeTab === "backorders",
  });
  const recentlyCompleted = trpc.fulfillmentQueue.recentlyCompleted.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const utils = trpc.useUtils();

  const updateItem = trpc.packingSlip.updateItem.useMutation({
    onSuccess: () => utils.fulfillmentQueue.list.invalidate(),
  });

  function fulfillItem(itemId: number, quantity: number) {
    setPendingItemIds(prev => new Set(prev).add(itemId));
    updateItem.mutate(
      { itemId, status: "fulfilled", quantityFulfilled: quantity },
      {
        onSettled: () => setPendingItemIds(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        }),
      }
    );
  }

  const queueData = queue.data || [];
  const backorderData = backorders.data || [];

  // Stats
  const pendingSlips = queueData.filter(s => s.status === "pending").length;
  const inProgressSlips = queueData.filter(s => s.status === "in_progress").length;
  const partialSlips = queueData.filter(s => s.status === "partial").length;
  const totalBackorderedItems = queueData.reduce((sum, s) => sum + (s.totalBackordered || 0), 0);
  const backorderBadgeCount = backorders.data != null ? backorderData.length : totalBackorderedItems;
  const isFetching = queue.isFetching || backorders.isFetching;

  // Sort and group
  const sortedQueue = [...queueData].sort((a, b) => {
    const bandA = getUrgencyBand(a);
    const bandB = getUrgencyBand(b);
    if (bandA === "urgent" && bandB === "urgent") {
      const diff = (b.totalBackordered || 0) - (a.totalBackordered || 0);
      if (diff !== 0) return diff;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const grouped: Record<string, typeof sortedQueue> = {
    urgent:    sortedQueue.filter(s => getUrgencyBand(s) === "urgent"),
    attention: sortedQueue.filter(s => getUrgencyBand(s) === "attention"),
    progress:  sortedQueue.filter(s => getUrgencyBand(s) === "progress"),
  };

  // Selected slip — may be stale if it just completed and left the queue
  const selectedSlip = queueData.find(s => s.id === selectedSlipId) ?? null;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Package className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <button
                  onClick={() => navigate("/admin/packing-slips")}
                  className="text-xs text-muted-foreground hover:text-blue-600 hover:underline"
                >
                  Slip Management
                </button>
                <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Fulfillment Queue</span>
              </div>
              <h1 className="text-2xl font-bold">Fulfillment Queue</h1>
              <p className="text-sm text-muted-foreground">
                {queueData.length === 0
                  ? "All orders fulfilled!"
                  : `${queueData.length} orders need attention`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { queue.refetch(); backorders.refetch(); }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={pendingSlips > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                Pending
              </div>
              <p className="text-2xl font-bold">{pendingSlips}</p>
              <p className="text-xs text-muted-foreground">slips</p>
            </CardContent>
          </Card>
          <Card className={inProgressSlips > 0 ? "border-blue-200 bg-blue-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Box className="h-4 w-4 text-blue-500" aria-hidden="true" />
                In Progress
              </div>
              <p className="text-2xl font-bold">{inProgressSlips}</p>
              <p className="text-xs text-muted-foreground">slips</p>
            </CardContent>
          </Card>
          <Card className={partialSlips > 0 ? "border-orange-200 bg-orange-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Truck className="h-4 w-4 text-orange-500" aria-hidden="true" />
                Partial
              </div>
              <p className="text-2xl font-bold">{partialSlips}</p>
              <p className="text-xs text-muted-foreground">slips</p>
            </CardContent>
          </Card>
          <Card className={totalBackorderedItems > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertTriangle
                  className={`h-4 w-4 ${totalBackorderedItems > 0 ? "text-red-500" : ""}`}
                  aria-hidden="true"
                />
                Backordered
              </div>
              <p className={`text-2xl font-bold ${totalBackorderedItems > 0 ? "text-red-600" : ""}`}>
                {totalBackorderedItems}
              </p>
              <p className="text-xs text-muted-foreground">items</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="queue" className="gap-1.5">
              <Package className="h-4 w-4" aria-hidden="true" />
              Fulfillment Queue
              {queueData.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{queueData.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="backorders" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Backorders
              {backorderBadgeCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{backorderBadgeCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── QUEUE TAB: split-pane ───────────────────────────────────── */}
          <TabsContent value="queue" className="mt-4">
            {queue.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading fulfillment queue...</div>
            ) : queue.isError ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">Failed to load queue</h3>
                  <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => queue.refetch()}>Retry</Button>
                </CardContent>
              </Card>
            ) : sortedQueue.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">All Orders Fulfilled!</h3>
                  <p className="text-sm text-muted-foreground mt-1">No pending packing slips in the queue.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden flex" style={{ minHeight: "620px", maxHeight: "calc(100vh - 22rem)" }}>
                {/* Left rail — hidden on mobile when detail is open */}
                <div className={`${selectedSlipId ? "hidden md:flex" : "flex"} md:w-72 w-full flex-col border-r`}>
                  <SlipListRail
                    grouped={grouped}
                    selectedSlipId={selectedSlipId}
                    recentlyCompleted={recentlyCompleted.data || []}
                    onSelect={setSelectedSlipId}
                    navigate={navigate}
                  />
                </div>

                {/* Right detail panel — hidden on mobile until a slip is selected */}
                <div className={`${selectedSlipId ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
                  {selectedSlip ? (
                    <SlipDetailPanel
                      slip={selectedSlip}
                      pendingItemIds={pendingItemIds}
                      onFulfillItem={fulfillItem}
                      onBack={() => setSelectedSlipId(null)}
                      navigate={navigate}
                    />
                  ) : selectedSlipId ? (
                    // Slip just completed and disappeared from queue
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" aria-hidden="true" />
                      <h3 className="text-lg font-semibold">Slip Completed</h3>
                      <p className="text-sm text-muted-foreground mt-1">This slip has left the queue.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setSelectedSlipId(null)}>
                        Back to list
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                      <Package className="h-12 w-12 mb-3 opacity-20" aria-hidden="true" />
                      <p className="text-sm">Select a slip from the list to see its details and fulfill items.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── BACKORDERS TAB ──────────────────────────────────────────── */}
          <TabsContent value="backorders" className="space-y-4">
            {backorders.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading backorders...</div>
            ) : backorders.isError ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">Failed to load backorders</h3>
                  <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => backorders.refetch()}>Retry</Button>
                </CardContent>
              </Card>
            ) : backorderData.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">No Backorders!</h3>
                  <p className="text-sm text-muted-foreground mt-1">All items are in stock and fulfilled.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {backorderData.map((item: any) => (
                  <Card key={item.itemId} className="border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
                            <h3 className="font-semibold text-sm">{item.itemName}</h3>
                            <ShipSourceBadge source={item.shipSource} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>Client: <strong>{item.slipClientName}</strong></span>
                            {item.slipClientEmail && (
                              <a
                                href={`mailto:${item.slipClientEmail}`}
                                className="hover:text-blue-600 hover:underline"
                                aria-label={`Email ${item.slipClientName} at ${item.slipClientEmail}`}
                              >
                                {item.slipClientEmail}
                              </a>
                            )}
                            <span>Qty: {item.quantityBackordered || item.quantity}</span>
                            <span>PS-{item.packingSlipId}</span>
                            <span>Since {formatDate(item.createdAt)}</span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                          )}
                          {item.itemTrackingNumber && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <Truck className="h-3 w-3" aria-hidden="true" />
                              <span className="font-medium">{item.itemTrackingCarrier || "Tracking"}:</span>
                              {item.itemTrackingUrl ? (
                                <a
                                  href={item.itemTrackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                  aria-label={`Track item ${item.itemTrackingNumber} via ${item.itemTrackingCarrier} (opens in new tab)`}
                                >
                                  {item.itemTrackingNumber}
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              ) : (
                                <span>{item.itemTrackingNumber}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 shrink-0"
                          onClick={() => navigate(`/admin/packing-slips/${item.packingSlipId}`)}
                          aria-label={`View packing slip PS-${item.packingSlipId} for ${item.slipClientName}`}
                        >
                          <ChevronRight className="h-3 w-3 mr-1" aria-hidden="true" />
                          View Slip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
