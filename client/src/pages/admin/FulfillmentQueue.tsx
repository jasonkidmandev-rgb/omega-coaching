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

function formatDate(d: any) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

function formatDaysAgo(d: any) {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
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
  const totalBackorderedItems = queueData.reduce((sum, s) => sum + (s.totalBackordered || 0), 0);

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
            <RefreshCw className={`h-4 w-4 mr-2 ${queue.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={pendingSlips > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pending
              </div>
              <p className="text-2xl font-bold">{pendingSlips}</p>
            </CardContent>
          </Card>
          <Card className={inProgressSlips > 0 ? "border-blue-200 bg-blue-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Box className="h-4 w-4 text-blue-500" />
                In Progress
              </div>
              <p className="text-2xl font-bold">{inProgressSlips}</p>
            </CardContent>
          </Card>
          <Card className={partialSlips > 0 ? "border-orange-200 bg-orange-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Truck className="h-4 w-4 text-orange-500" />
                Partial
              </div>
              <p className="text-2xl font-bold">{partialSlips}</p>
            </CardContent>
          </Card>
          <Card className={totalBackorderedItems > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertTriangle className={`h-4 w-4 ${totalBackorderedItems > 0 ? 'text-red-500' : ''}`} />
                Backordered Items
              </div>
              <p className={`text-2xl font-bold ${totalBackorderedItems > 0 ? 'text-red-600' : ''}`}>{totalBackorderedItems}</p>
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
              {totalBackorderedItems > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{totalBackorderedItems}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* QUEUE TAB */}
          <TabsContent value="queue" className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === "date" ? "status" : "date")}
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Sort by {sortBy === "date" ? "Status" : "Date"}
              </Button>
            </div>

            {queue.isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading fulfillment queue...</div>
            ) : sortedQueue.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
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
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={slip.status} />
                            <Badge variant="outline" className="text-xs capitalize">{slip.source}</Badge>
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
                          <p className="text-xs text-muted-foreground">{slip.clientEmail}</p>

                          {/* Shipping address */}
                          {slip.shippingStreet && (
                            <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                {slip.shippingStreet}, {slip.shippingCity}, {slip.shippingState} {slip.shippingZip}
                              </span>
                            </div>
                          )}

                          {/* Items summary */}
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Items: {slip.totalFulfilled}/{slip.totalItems} fulfilled
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
                                <AlertTriangle className="h-3 w-3 text-red-500" />
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
                              <Truck className="h-3 w-3" />
                              <span className="font-medium">{slip.trackingCarrier || "Tracking"}:</span>
                              {slip.trackingUrl ? (
                                <a href={slip.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                  {slip.trackingNumber}
                                  <ExternalLink className="h-3 w-3" />
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
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
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
            ) : backorderData.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
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
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <h3 className="font-semibold text-sm">{item.itemName}</h3>
                            <ShipSourceBadge source={item.shipSource} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Client: <strong>{item.slipClientName}</strong></span>
                            <span>Qty: {item.quantityBackordered || item.quantity}</span>
                            <span>PS-{item.packingSlipId}</span>
                            <span>Created {formatDate(item.createdAt)}</span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                          )}
                          {/* Tracking info for backordered item */}
                          {item.itemTrackingNumber && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <Truck className="h-3 w-3" />
                              <span className="font-medium">{item.itemTrackingCarrier || "Tracking"}:</span>
                              {item.itemTrackingUrl ? (
                                <a href={item.itemTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                  {item.itemTrackingNumber}
                                  <ExternalLink className="h-3 w-3" />
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
                        >
                          <ChevronRight className="h-3 w-3 mr-1" />
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
