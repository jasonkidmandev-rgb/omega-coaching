import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Send,
  Mail,
  MessageSquare,
  Download,
  Trash2,
} from "lucide-react";

type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
type TrackingCarrier = "USPS" | "UPS" | "FedEx" | "DHL" | "Other";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-4 h-4" /> },
  paid: { label: "Paid", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <DollarSign className="w-4 h-4" /> },
  processing: { label: "Processing", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Package className="w-4 h-4" /> },
  shipped: { label: "Shipped", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Truck className="w-4 h-4" /> },
  delivered: { label: "Delivered", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-4 h-4" /> },
  refunded: { label: "Refunded", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <RefreshCw className="w-4 h-4" /> },
};

export default function AdminStoreOrders() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showVenmoVerifyDialog, setShowVenmoVerifyDialog] = useState(false);
  const [venmoVerifyOrderId, setVenmoVerifyOrderId] = useState<number | null>(null);
  const [venmoVerifyTotal, setVenmoVerifyTotal] = useState("");
  const [isVerifyingVenmo, setIsVerifyingVenmo] = useState(false);
  
  // Shipping tracking state
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState<TrackingCarrier>("USPS");
  const [sendNotifications, setSendNotifications] = useState(true);
  const [isShipping, setIsShipping] = useState(false);
  
  // Refund state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);

  const { data: orders, isLoading, refetch } = trpc.storeOrders.adminList.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );

  const updateStatusMutation = trpc.storeOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated successfully");
      refetch();
      setSelectedOrder(null);
      setNewStatus(null);
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const updateShippingMutation = trpc.storeOrders.updateShipping.useMutation({
    onSuccess: () => {
      toast.success("Shipping info updated and notifications sent!");
      refetch();
      setShowShippingDialog(false);
      setShippingOrderId(null);
      setTrackingNumber("");
      setTrackingCarrier("USPS");
    },
    onError: (error) => {
      toast.error(`Failed to update shipping: ${error.message}`);
    },
  });

  const refundMutation = trpc.storeOrders.refund.useMutation({
    onSuccess: (data) => {
      toast.success(`Refund processed successfully! Refund ID: ${data.refundId}`);
      refetch();
      setShowRefundDialog(false);
      setRefundOrderId(null);
      setRefundAmount("");
      setRefundReason("");
      setIsFullRefund(true);
    },
    onError: (error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    },
  });

  // Delete order state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = trpc.storeOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted successfully");
      refetch();
      setShowDeleteDialog(false);
      setDeleteOrderId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({ orderId: selectedOrder, status: newStatus });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVenmoVerify = async () => {
    if (!venmoVerifyOrderId) return;
    setIsVerifyingVenmo(true);
    try {
      await updateStatusMutation.mutateAsync({ orderId: venmoVerifyOrderId, status: "paid" });
      toast.success("Venmo payment verified! Order marked as paid.");
      setShowVenmoVerifyDialog(false);
      setVenmoVerifyOrderId(null);
    } catch (e) {
      // error already handled by mutation
    } finally {
      setIsVerifyingVenmo(false);
    }
  };

  const openVenmoVerifyDialog = (orderId: number, total: string) => {
    setVenmoVerifyOrderId(orderId);
    setVenmoVerifyTotal(total);
    setShowVenmoVerifyDialog(true);
  };

  const handleShippingUpdate = async () => {
    if (!shippingOrderId || !trackingNumber) return;
    setIsShipping(true);
    try {
      await updateShippingMutation.mutateAsync({
        orderId: shippingOrderId,
        trackingNumber,
        trackingCarrier,
        sendNotifications,
      });
    } finally {
      setIsShipping(false);
    }
  };

  const openShippingDialog = (orderId: number, existingTracking?: string, existingCarrier?: string) => {
    setShippingOrderId(orderId);
    setTrackingNumber(existingTracking || "");
    setTrackingCarrier((existingCarrier as TrackingCarrier) || "USPS");
    setShowShippingDialog(true);
  };

  const handleRefund = async () => {
    if (!refundOrderId) return;
    setIsRefunding(true);
    try {
      await refundMutation.mutateAsync({
        orderId: refundOrderId,
        amount: isFullRefund ? undefined : refundAmount,
        reason: refundReason || undefined,
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const openRefundDialog = (orderId: number, orderTotal: string) => {
    setRefundOrderId(orderId);
    setRefundAmount(orderTotal);
    setIsFullRefund(true);
    setRefundReason("");
    setShowRefundDialog(true);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // CSV Export function
  const exportToCSV = () => {
    if (!orders || orders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const filteredOrders = statusFilter === "all" 
      ? orders 
      : orders.filter(o => o.status === statusFilter);

    // CSV headers
    const headers = [
      "Order ID",
      "Date",
      "User ID",
      "Payer Name",
      "Payer Email",
      "Status",
      "Items",
      "Subtotal",
      "Shipping Fee",
      "Total",
      "Payment Method",
      "Payment Order ID",
      "Tracking Number",
      "Tracking Carrier",
      "Shipped Date",
    ];

    // CSV rows
    const rows = filteredOrders.map(order => [
      order.id,
      new Date(order.createdAt).toISOString(),
      order.userId || "",
      order.payerName || "",
      order.payerEmail || "",
      order.status,
      order.items?.map((i: any) => `${i.name} x${i.quantity}`).join("; ") || "",
      order.subtotal,
      order.shippingFee || "0.00",
      order.total,
      order.paymentMethod || "Venmo",
      order.paypalOrderId || "",
      order.trackingNumber || "",
      order.trackingCarrier || "",
      order.shippedAt ? new Date(order.shippedAt).toISOString() : "",
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `store-orders-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredOrders.length} orders to CSV`);
  };

  const totalRevenue = orders?.reduce((sum, order) => {
    if (order.status === "paid" || order.status === "processing" || order.status === "shipped" || order.status === "delivered") {
      return sum + parseFloat(order.total);
    }
    return sum;
  }, 0) || 0;

  const orderCounts = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === "pending").length || 0,
    paid: orders?.filter(o => o.status === "paid").length || 0,
    processing: orders?.filter(o => o.status === "processing").length || 0,
    shipped: orders?.filter(o => o.status === "shipped").length || 0,
  };

  return (
    <AdminLayout>
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="text-gray-600 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-orange-500" />
                Store Orders
              </h1>
              <p className="text-gray-600 text-sm">Manage and track Omega Store orders</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{orderCounts.total}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">{orderCounts.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{orderCounts.paid}</div>
              <div className="text-sm text-gray-600">Paid</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-400">{orderCounts.processing + orderCounts.shipped}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-400">${totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-gray-600">Filter by status:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
            <SelectTrigger className="w-48 bg-white border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-white">
              <SelectItem value="all" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">All Orders</SelectItem>
              <SelectItem value="pending" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Pending</SelectItem>
              <SelectItem value="paid" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Paid</SelectItem>
              <SelectItem value="processing" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Processing</SelectItem>
              <SelectItem value="shipped" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Shipped</SelectItem>
              <SelectItem value="delivered" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Delivered</SelectItem>
              <SelectItem value="cancelled" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Cancelled</SelectItem>
              <SelectItem value="refunded" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders - Mobile Card Layout */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            orders.map((order) => {
              const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
              const isVenmoPending = order.paymentMethod === 'venmo' && order.status === 'pending';
              return (
                <Card key={order.id} className={`bg-white border-gray-200 ${isVenmoPending ? 'border-amber-400 border-2' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-gray-900">#{order.id}</span>
                      <Badge className={`${status.color} flex items-center gap-1`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    {/* Customer */}
                    <div>
                      <div className="font-medium text-gray-900">{order.payerName || "N/A"}</div>
                      <div className="text-xs text-gray-500">{order.payerEmail || "No email"}</div>
                    </div>
                    {/* Items */}
                    <div className="text-sm text-gray-700">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i}>{item.name} x{item.quantity}</div>
                      ))}
                    </div>
                    {/* Total & Payment */}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green-600 text-lg">${order.total}</span>
                      <Badge variant="outline" className="capitalize">{order.paymentMethod}</Badge>
                    </div>
                    {/* Date */}
                    <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                    {/* Tracking */}
                    {order.trackingNumber && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-mono">{order.trackingNumber}</span>
                        <span className="text-gray-500 ml-2">{order.trackingCarrier}</span>
                      </div>
                    )}
                    {/* Venmo Verify CTA - prominent for pending Venmo */}
                    {isVenmoPending && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                        onClick={() => openVenmoVerifyDialog(order.id, order.total)}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Verify Venmo Payment
                      </Button>
                    )}
                    {/* Actions row */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order.id);
                          setNewStatus(order.status as OrderStatus);
                        }}
                      >
                        Status
                      </Button>
                      {(order.status === "paid" || order.status === "processing") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-purple-500/20 border-purple-500/30 text-purple-600 hover:bg-purple-500/30"
                          onClick={() => openShippingDialog(order.id, order.trackingNumber || undefined, order.trackingCarrier || undefined)}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          Ship
                        </Button>
                      )}
                      {["paid", "processing", "shipped", "delivered"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-orange-500/20 border-orange-500/30 text-orange-600 hover:bg-orange-500/30"
                          onClick={() => openRefundDialog(order.id, order.total)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Refund
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-500/20 border-red-500/30 text-red-600 hover:bg-red-500/30"
                        onClick={() => {
                          setDeleteOrderId(order.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Orders Table - Desktop */}
        <Card className="bg-white border-gray-200 hidden md:block">
          <CardHeader>
            <CardTitle className="text-white">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="text-gray-600">Order #</TableHead>
                    <TableHead className="text-gray-600">Date</TableHead>
                    <TableHead className="text-gray-600">Customer</TableHead>
                    <TableHead className="text-gray-600">Items</TableHead>
                    <TableHead className="text-gray-600">Total</TableHead>
                    <TableHead className="text-gray-600">Payment</TableHead>
                    <TableHead className="text-gray-600">Status</TableHead>
                    <TableHead className="text-gray-600">Tracking</TableHead>
                    <TableHead className="text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = statusConfig[order.status as OrderStatus] || statusConfig.pending;
                    return (
                      <TableRow key={order.id} className="border-gray-200 hover:bg-gray-100/50">
                        <TableCell className="font-mono text-white">#{order.id}</TableCell>
                        <TableCell className="text-gray-700">{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <div className="text-white">{order.payerName || "N/A"}</div>
                          <div className="text-xs text-gray-600">{order.payerEmail || "No email"}</div>
                          {order.shippingStreet && (
                            <div className="text-xs text-gray-500 mt-1 border-t border-gray-200 pt-1">
                              <div>{order.shippingName || order.payerName}</div>
                              <div>{order.shippingStreet}</div>
                              <div>{order.shippingCity}, {order.shippingState} {order.shippingZip}</div>
                              {order.shippingPhone && <div>{order.shippingPhone}</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700">
                            {order.items?.map((item, i) => (
                              <div key={i}>{item.name} x{item.quantity}</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-400">${order.total}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.trackingNumber ? (
                            <div className="text-xs">
                              <div className="text-gray-700 font-mono">{order.trackingNumber}</div>
                              <div className="text-gray-500">{order.trackingCarrier}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">No tracking</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {order.paymentMethod === 'venmo' && order.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => openVenmoVerifyDialog(order.id, order.total)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Verify
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrder(order.id);
                                setNewStatus(order.status as OrderStatus);
                              }}
                            >
                              Status
                            </Button>
                            {(order.status === "paid" || order.status === "processing") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                                onClick={() => openShippingDialog(order.id, order.trackingNumber || undefined, order.trackingCarrier || undefined)}
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                Ship
                              </Button>
                            )}
                            {["paid", "processing", "shipped", "delivered"].includes(order.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                                onClick={() => openRefundDialog(order.id, order.total)}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Refund
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                              onClick={() => {
                                setDeleteOrderId(order.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Update Status Dialog */}
        <Dialog open={selectedOrder !== null} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-white">Update Order Status</DialogTitle>
              <DialogDescription className="text-gray-600">
                Change the status for order #{selectedOrder}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newStatus || ""} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                <SelectTrigger className="bg-gray-100 border-gray-300">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-white">
                  <SelectItem value="pending" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Pending</SelectItem>
                  <SelectItem value="paid" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Paid</SelectItem>
                  <SelectItem value="processing" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Processing</SelectItem>
                  <SelectItem value="shipped" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Shipped</SelectItem>
                  <SelectItem value="delivered" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Delivered</SelectItem>
                  <SelectItem value="cancelled" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Cancelled</SelectItem>
                  <SelectItem value="refunded" className="text-white hover:bg-gray-100 focus:bg-gray-100 focus:text-white">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating || !newStatus}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isUpdating ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-400" />
                Process Refund for Order #{refundOrderId}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Process a refund for this order. The customer will be notified via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fullRefund"
                  checked={isFullRefund}
                  onCheckedChange={(checked) => setIsFullRefund(checked as boolean)}
                />
                <Label htmlFor="fullRefund" className="text-gray-700">
                  Full Refund (${refundAmount})
                </Label>
              </div>
              
              {!isFullRefund && (
                <div className="space-y-2">
                  <Label htmlFor="refundAmount" className="text-gray-700">Refund Amount</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Enter refund amount"
                    className="bg-gray-100 border-gray-300"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="refundReason" className="text-gray-700">Reason (optional)</Label>
                <Input
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g., Customer requested refund"
                  className="bg-gray-100 border-gray-300"
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ This action cannot be undone. The refund will be processed.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowRefundDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRefund}
                disabled={isRefunding || (!isFullRefund && !refundAmount)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isRefunding ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Process Refund
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shipping Dialog */}
        <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-400" />
                Ship Order #{shippingOrderId}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Enter tracking information and send notifications to the customer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="carrier" className="text-gray-700">Shipping Carrier</Label>
                <Select value={trackingCarrier} onValueChange={(v) => setTrackingCarrier(v as TrackingCarrier)}>
                  <SelectTrigger className="bg-gray-100 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="USPS">USPS</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tracking" className="text-gray-700">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="bg-gray-100 border-gray-300"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="notifications"
                  checked={sendNotifications}
                  onCheckedChange={(checked) => setSendNotifications(checked as boolean)}
                />
                <Label htmlFor="notifications" className="text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Send email notification
                  <MessageSquare className="w-4 h-4 text-green-400 ml-2" />
                  Send SMS notification
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowShippingDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleShippingUpdate}
                disabled={isShipping || !trackingNumber}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {isShipping ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Shipping...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Mark as Shipped
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Venmo Verify Dialog */}
        <Dialog open={showVenmoVerifyDialog} onOpenChange={setShowVenmoVerifyDialog}>
          <DialogContent className="bg-white border-gray-200 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Verify Venmo Payment
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Confirm that you received the Venmo payment for order #{venmoVerifyOrderId}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Amount to verify:</span>
                  <span className="text-2xl font-bold text-green-600">${venmoVerifyTotal}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>What happens when you verify:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Order will be marked as "Paid"</li>
                  <li>Inventory will be deducted</li>
                  <li>Packing slip will be created</li>
                  <li>Customer will receive a confirmation email</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                Please check your Venmo account to confirm you received this payment before verifying.
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowVenmoVerifyDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleVenmoVerify}
                disabled={isVerifyingVenmo}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isVerifyingVenmo ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Payment Received
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Order Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Delete Order #{deleteOrderId}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to delete this order? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-yellow-400 text-sm bg-yellow-500/10 p-3 rounded-lg">
                ⚠️ This will permanently delete the order and all associated items.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!deleteOrderId) return;
                  setIsDeleting(true);
                  try {
                    await deleteMutation.mutateAsync({ orderId: deleteOrderId });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {isDeleting ? "Deleting..." : "Delete Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </AdminLayout>
  );
}
