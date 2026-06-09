import { trpc } from "../../lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink, RefreshCw, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/dateUtils";

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

export default function Backorders() {
  const [, navigate] = useLocation();
  const backorders = trpc.fulfillmentQueue.backorders.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const backorderData = backorders.data || [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Backorders</h1>
              <p className="text-sm text-muted-foreground">
                {backorderData.length === 0
                  ? "No backordered items"
                  : `${backorderData.length} item${backorderData.length !== 1 ? "s" : ""} backordered`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => backorders.refetch()}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${backorders.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {/* List */}
        {backorders.isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading backorders...</div>
        ) : backorders.isError ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Failed to load backorders</h3>
              <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => backorders.refetch()}>
                Retry
              </Button>
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
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
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
      </div>
    </AdminLayout>
  );
}
