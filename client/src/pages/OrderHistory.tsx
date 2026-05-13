import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  ArrowLeft,
  ShoppingBag,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileEdit,
  AlertCircle,
} from "lucide-react";
import { formatMT } from "@/lib/timezone";

type OrderStatus = "draft" | "pending" | "pending_payment" | "pending_venmo" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: <FileEdit className="h-4 w-4" /> },
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <Clock className="h-4 w-4" /> },
  pending_payment: { label: "Awaiting Payment", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <Clock className="h-4 w-4" /> },
  pending_venmo: { label: "Awaiting Venmo Verification", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: <AlertCircle className="h-4 w-4" /> },
  paid: { label: "Paid", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: <DollarSign className="h-4 w-4" /> },
  processing: { label: "Processing", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: <Package className="h-4 w-4" /> },
  shipped: { label: "Shipped", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", icon: <Truck className="h-4 w-4" /> },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: <XCircle className="h-4 w-4" /> },
  refunded: { label: "Refunded", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: <XCircle className="h-4 w-4" /> },
};

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  pricePerUnit: string;
}

interface UnifiedOrder {
  id: number;
  orderNumber?: string;
  type: "store" | "custom";
  paymentMethod: "paypal" | "venmo";
  subtotal: string;
  discountAmount: string;
  shippingFee?: string;
  total: string;
  status: OrderStatus;
  payerEmail: string | null;
  payerName: string | null;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  createdAt: Date;
  paidAt: Date | null;
  items: OrderItem[];
}

function OrderCard({ order }: { order: UnifiedOrder }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[order.status] || statusConfig.pending;
  const shippingFee = parseFloat(order.shippingFee || "0");

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              {order.type === "custom" ? (
                <FileEdit className="h-5 w-5 text-amber-500" />
              ) : (
                <ShoppingBag className="h-5 w-5 text-amber-500" />
              )}
              {order.orderNumber ? `Order ${order.orderNumber}` : `Order #${order.id}`}
              {order.type === "custom" && (
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 ml-1">Custom</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              {formatMT(order.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </div>
          <Badge className={`${status.color} border flex items-center gap-1.5`}>
            {status.icon}
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tracking info */}
        {order.trackingNumber && (
          <div className="flex items-center gap-2 text-sm bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
            <Truck className="h-4 w-4 text-cyan-400" />
            <span className="text-cyan-300">
              {order.shippingCarrier && <span className="font-medium">{order.shippingCarrier}: </span>}
              {order.trackingNumber}
            </span>
          </div>
        )}

        {/* Order Summary */}
        <div className="flex items-center justify-between py-2 border-t border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              <span className="font-medium text-white">{order.items.length}</span> item{order.items.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-slate-400">
              via <span className="font-medium text-white capitalize">{order.paymentMethod}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-amber-500">
              ${parseFloat(order.total).toFixed(2)}
            </div>
            {parseFloat(order.discountAmount) > 0 && (
              <div className="text-xs text-green-500">
                -${parseFloat(order.discountAmount).toFixed(2)} discount
              </div>
            )}
          </div>
        </div>

        {/* Expandable Items List */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            <span>View order details</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {expanded && (
            <div className="mt-3 space-y-2 bg-slate-900/50 rounded-lg p-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-slate-500">×{item.quantity}</span>
                  </div>
                  <span className="text-slate-400">
                    ${(parseFloat(item.pricePerUnit) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              
              <div className="border-t border-slate-700/50 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-300">${parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Discount</span>
                    <span className="text-green-500">-${parseFloat(order.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                {shippingFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Shipping</span>
                    <span className="text-slate-300">${shippingFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-white">Total</span>
                  <span className="text-amber-500">${parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>

              {order.paidAt && (
                <div className="text-xs text-slate-500 pt-2">
                  Paid on {formatMT(order.paidAt, "MMM d, yyyy 'at' h:mm a")}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderSkeleton() {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-slate-700" />
            <Skeleton className="h-4 w-48 bg-slate-700" />
          </div>
          <Skeleton className="h-6 w-20 bg-slate-700" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-2">
          <Skeleton className="h-4 w-24 bg-slate-700" />
          <Skeleton className="h-6 w-16 bg-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderHistory() {
  const { data: storeOrders, isLoading: storeLoading } = trpc.storeOrders.myOrders.useQuery();
  const { data: customOrders, isLoading: customLoading } = trpc.customOrders.myOrders.useQuery();
  
  const isLoading = storeLoading || customLoading;

  // Merge and sort all orders by date (newest first)
  const allOrders: UnifiedOrder[] = [
    ...(storeOrders || []).map((o: any) => ({
      ...o,
      type: "store" as const,
      orderNumber: undefined,
      shippingFee: "0",
      trackingNumber: null,
      shippingCarrier: null,
    })),
    ...(customOrders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      type: "custom" as const,
      paymentMethod: o.paymentMethod || "paypal",
      subtotal: o.subtotal?.toString() || "0",
      discountAmount: o.discountAmount?.toString() || "0",
      shippingFee: o.shippingFee?.toString() || "0",
      total: o.total?.toString() || "0",
      status: o.status as OrderStatus,
      payerEmail: o.payerEmail || null,
      payerName: o.payerName || null,
      trackingNumber: o.trackingNumber || null,
      shippingCarrier: o.shippingCarrier || null,
      createdAt: o.createdAt,
      paidAt: o.paidAt || null,
      items: (o.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit?.toString() || "0",
      })),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const storeCount = allOrders.filter(o => o.type === "store").length;
  const customCount = allOrders.filter(o => o.type === "custom").length;

  const [tab, setTab] = useState("all");
  const filteredOrders = tab === "all" ? allOrders 
    : tab === "store" ? allOrders.filter(o => o.type === "store")
    : allOrders.filter(o => o.type === "custom");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/order">
            <Button variant="ghost" className="mb-4 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-amber-500" />
            Order History
          </h1>
          <p className="text-slate-400 mt-2">
            View your past orders and their status
          </p>
        </div>

        {/* Tabs for filtering */}
        {(storeCount > 0 || customCount > 0) && (
          <Tabs value={tab} onValueChange={setTab} className="mb-6">
            <TabsList className="bg-slate-800/50 border border-slate-700/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                All Orders ({allOrders.length})
              </TabsTrigger>
              {storeCount > 0 && (
                <TabsTrigger value="store" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  Store ({storeCount})
                </TabsTrigger>
              )}
              {customCount > 0 && (
                <TabsTrigger value="custom" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  Custom ({customCount})
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <OrderSkeleton />
              <OrderSkeleton />
              <OrderSkeleton />
            </>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard key={`${order.type}-${order.id}`} order={order} />
            ))
          ) : (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
                <p className="text-slate-400 mb-6">
                  You haven't placed any orders. Visit the store to browse our products.
                </p>
                <Link to="/order">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                    Browse Store
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
