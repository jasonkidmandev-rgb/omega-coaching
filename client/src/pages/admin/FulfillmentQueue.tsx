import { useState } from "react";
import { trpc } from "../../lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, AlertTriangle, Truck, Clock, CheckCircle2,
  RefreshCw, ChevronRight, MapPin, ExternalLink, Box,
  ArrowUpDown
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDate, formatDaysAgo } from "@/lib/dateUtils";

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
    <Badge variant="outline" className="text-xs">
      {labels[source] || source}
    </Badge>
  );
}


export default function FulfillmentQueue() {
  const [activeTab, setActiveTab] = useState("queue");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [, navigate] = useLocation();

  const queue = trpc.fulfillmentQueue.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const backorders = trpc.fulfillmentQueue.backorders.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: activeTab === "backorders",
  });

  const queueData = queue.data || [];
  const backorderData = backorders.data || [];

  // Stats
  const pendingSlips = queueData.filter(s => s.status === "pending").length;
  const inProgressSlips = queueData.filter(s => s.status === "in_progress").length;
  const partialSlips = queueData.filter(s => s.status === "partial").length;
  // Use queue-derived count for the stats card; the Backorders tab uses backorderData.length once loaded
  const totalBackorderedItems = queueData.reduce((sum, s) => sum + (s.totalBackordered || 0), 0);
  // Once the Backorders tab has loaded its own data, prefer that count for the tab badge
  const backorderBadgeCount = backorders.data != null ? backorderData.length : totalBackorderedItems;

  const isFetching = queue.isFetching || backorders.isFetching;

  // Sort
  const sortedQueue = [...queueData].sort((a, b) => {
    if (sortBy === "status") {
      const order = { pending: 0, in_progress: 1, partial: 2 };
      return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fulfillment Queue</h1>
              <p className="text-sm text-muted-foreground">
                {queueData.length === 0 ? "All orders fulfilled!" : `${queueData.length} orders need attention`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { queue.refetch(); backorders.refetch(); }}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
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
                <AlertTriangle className={`h-4 w-4 ${totalBackorderedItems > 0 ? 'text-red-500' : ''}`} aria-hidden="true" />
                Backordered
              </div>
              <p className={`text-2xl font-bold ${totalBackorderedItems > 0 ? 'text-red-600' : ''}`}>{totalBackorderedItems}</p>
              <p className="text-xs text-muted-foreground">items</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="queue" className="gap-1.5">
              <Package className="h-4 w-4" />
              Fulfillment Queue
              {queueData.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{queueData.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="backorders" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Backorders
              {backorderBadgeCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{backorderBadgeCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* QUEUE TAB */}
          <TabsContent value="queue" className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={sortBy === "date" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSortBy("date")}
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Oldest first
              </Button>
              <Button
                variant={sortBy === "status" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSortBy("status")}
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                By status
              </Button>
            </div>

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
              <div className="space-y-3">
                {sortedQueue.map(slip => (
                  <Card key={slip.id} className={slip.totalBackordered > 0 ? "border-red-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge status={slip.status} />
                            <Badge variant="outline" className="text-xs capitalize">{slip.source}</Badge>
                            {slip.signedAt && (
                              <Badge variant="outline" className="text-xs text-green-700 border-green-300">Signed</Badge>
                            )}
                            {slip.totalBackordered > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {slip.totalBackordered} backordered
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              PS-{slip.id} • Created {formatDaysAgo(slip.createdAt)}
                            </span>
                          </div>

                          {/* Client info */}
                          <h3 className="font-semibold">{slip.clientName}</h3>
                          <a
                            href={`mailto:${slip.clientEmail}`}
                            className="text-xs text-muted-foreground hover:text-blue-600 hover:underline"
                            aria-label={`Email ${slip.clientName} at ${slip.clientEmail}`}
                          >
                            {slip.clientEmail}
                          </a>

                          {/* Shipping address */}
                          {slip.shippingStreet && (
                            <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                              <span>
                                {slip.shippingStreet}, {slip.shippingCity}, {slip.shippingState} {slip.shippingZip}
                              </span>
                            </div>
                          )}

                          {/* Items summary */}
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {slip.totalFulfilled}/{slip.totalItems} units fulfilled
                              {slip.totalBackordered > 0 && ` • ${slip.totalBackordered} backordered`}
                              {slip.totalPending > 0 && ` • ${slip.totalPending} pending`}
                            </p>
                            {/* Show pending items that need action */}
                            {(slip.pendingItems || []).slice(0, 3).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs pl-2 border-l-2 border-yellow-300">
                                <span className="font-medium">{item.itemName}</span>
                                <span className="text-muted-foreground">×{item.quantity}</span>
                                <ShipSourceBadge source={item.shipSource} />
                              </div>
                            ))}
                            {(slip.pendingItems || []).length > 3 && (
                              <p className="text-xs text-muted-foreground pl-2">
                                +{slip.pendingItems.length - 3} more items
                              </p>
                            )}
                            {/* Show backordered items */}
                            {(slip.backorderedItems || []).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs pl-2 border-l-2 border-red-300">
                                <AlertTriangle className="h-3 w-3 text-red-500" aria-hidden="true" />
                                <span className="font-medium text-red-700">{item.itemName}</span>
                                <span className="text-muted-foreground">×{item.quantityBackordered || item.quantity}</span>
                                <ShipSourceBadge source={item.shipSource} />
                                {item.notes && (
                                  <span className="text-muted-foreground italic truncate max-w-[200px]">{item.notes}</span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Tracking info */}
                          {slip.trackingNumber && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <Truck className="h-3 w-3" aria-hidden="true" />
                              <span className="font-medium">{slip.trackingCarrier || "Tracking"}:</span>
                              {slip.trackingUrl ? (
                                <a
                                  href={slip.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                  aria-label={`Track package ${slip.trackingNumber} via ${slip.trackingCarrier} (opens in new tab)`}
                                >
                                  {slip.trackingNumber}
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              ) : (
                                <span>{slip.trackingNumber}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-7"
                            onClick={() => navigate(`/admin/packing-slips/${slip.id}`)}
                            aria-label={`Open packing slip for ${slip.clientName} (PS-${slip.id})`}
                          >
                            <ChevronRight className="h-3 w-3 mr-1" aria-hidden="true" />
                            Open Slip
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BACKORDERS TAB */}
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
                          className="text-xs h-7"
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
