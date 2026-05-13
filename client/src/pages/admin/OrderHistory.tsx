import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  ShoppingCart, 
  Search, 
  Calendar, 
  DollarSign, 
  Package, 
  User, 
  Mail, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Percent
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderStatus = "pending" | "completed" | "failed" | "refunded";

export default function OrderHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const { data: orders, isLoading } = trpc.orders.getAllOrders.useQuery();
  const { data: orderDetails } = trpc.orders.getOrderById.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "refunded":
        return <Badge className="bg-purple-100 text-purple-800"><RefreshCw className="h-3 w-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredOrders = orders?.filter((order: any) => {
    const matchesSearch = 
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.stripeSessionId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    totalOrders: orders?.length || 0,
    completedOrders: orders?.filter((o: any) => o.status === "completed").length || 0,
    totalRevenue: orders?.filter((o: any) => o.status === "completed")
      .reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || "0"), 0) || 0,
    pendingOrders: orders?.filter((o: any) => o.status === "pending").length || 0,
  };

  const parseItemsSummary = (summary: string | null) => {
    if (!summary) return [];
    try {
      return JSON.parse(summary);
    } catch {
      return [];
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all orders for protocol items
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedOrders}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Orders
            </CardTitle>
            <CardDescription>
              {filteredOrders?.length || 0} orders found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name, email, or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading orders...</p>
              </div>
            ) : filteredOrders?.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No orders found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Orders will appear here when clients complete purchases"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders?.map((order: any) => {
                  const items = parseItemsSummary(order.itemsSummary);
                  const isExpanded = expandedOrderId === order.id;
                  
                  return (
                    <div 
                      key={order.id} 
                      className="border rounded-lg overflow-hidden hover:border-orange-200 transition-colors"
                    >
                      {/* Order Header */}
                      <div 
                        className="p-4 bg-gray-100 cursor-pointer"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{order.clientName}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {order.clientEmail}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-lg text-green-600">
                                ${parseFloat(order.totalAmount || "0").toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {items.length} item{items.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {getStatusBadge(order.status)}
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "N/A"}
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 border-t bg-white">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Order Info */}
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Order Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Order ID:</span>
                                  <span className="font-mono">#{order.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Payment Session:</span>
                                  <span className="font-mono text-xs truncate max-w-[200px]">
                                    {order.stripeSessionId?.slice(-12) || "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Protocol ID:</span>
                                  <span>#{order.clientProtocolId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Created:</span>
                                  <span>{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy h:mm a") : "N/A"}</span>
                                </div>
                                {order.completedAt && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Completed:</span>
                                    <span>{format(new Date(order.completedAt), "MMM d, yyyy h:mm a")}</span>
                                  </div>
                                )}
                                {order.protocol?.discountPercent && parseFloat(order.protocol.discountPercent) > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span className="flex items-center gap-1">
                                      <Percent className="h-3 w-3" />
                                      Discount Applied:
                                    </span>
                                    <span>{order.protocol.discountPercent}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Items List */}
                            <div>
                              <h4 className="font-medium mb-3">Items Purchased</h4>
                              <div className="space-y-2">
                                {items.length > 0 ? (
                                  items.map((item: any, index: number) => (
                                    <div 
                                      key={index}
                                      className="flex justify-between items-center p-2 bg-gray-100 rounded"
                                    >
                                      <div>
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Qty: {item.qty || item.quantity || 1}
                                        </p>
                                      </div>
                                      <p className="font-medium">
                                        ${((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No item details available</p>
                                )}
                              </div>
                              
                              {/* Total */}
                              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <span className="font-semibold">Total</span>
                                <span className="text-xl font-bold text-green-600">
                                  ${parseFloat(order.totalAmount || "0").toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/admin/clients/${order.clientProtocolId}/edit`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Protocol
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
