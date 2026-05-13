import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CheckCircle, XCircle, Clock, DollarSign, RefreshCw, 
  FileText, AlertCircle, Calendar, CreditCard, TrendingUp,
  Mail, ArrowRight, Filter, Download, Search
} from "lucide-react";
import { format } from "date-fns";

type PaymentEvent = {
  id: number;
  clientProtocolId: number;
  eventType: string;
  amount: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  notes: string | null;
  performedBy: number | null;
  reminderType: string | null;
  emailSentTo: string | null;
  createdAt: Date | string;
};

export default function Payments() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate date range
  const getDateRange = () => {
    if (dateRange === "all") return {};
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Queries
  const { data: eventsData, refetch: refetchEvents, isLoading, error: eventsError } = trpc.paymentEvents.getAll.useQuery({
    eventType: eventTypeFilter !== "all" ? eventTypeFilter as any : undefined,
    ...getDateRange(),
    limit: 100,
  });

  const { data: stats } = trpc.paymentEvents.getStats.useQuery(getDateRange());
  const { data: protocols } = trpc.clientProtocol.list.useQuery();

  // Backfill mutation
  const backfillMutation = trpc.paymentEvents.backfillFromProtocols.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Backfill complete: ${result.createdEvents} events created`);
        refetchEvents();
      } else {
        toast.error(`Backfill failed: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Backfill error: ${error.message}`);
    },
  });

  // Create a map of protocol IDs to client names
  const protocolMap = protocols?.reduce((acc, p) => {
    acc[p.id] = { name: p.clientName, email: p.clientEmail };
    return acc;
  }, {} as Record<number, { name: string; email: string | null }>) || {};

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "payment_received":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "payment_failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "payment_due":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case "reminder_sent":
        return <Mail className="w-4 h-4 text-amber-500" />;
      case "payment_refunded":
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case "payment_cancelled":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case "status_changed":
        return <ArrowRight className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "payment_received":
        return <Badge className="bg-green-500">Payment Received</Badge>;
      case "payment_failed":
        return <Badge variant="destructive">Payment Failed</Badge>;
      case "payment_due":
        return <Badge className="bg-blue-500">Payment Due</Badge>;
      case "reminder_sent":
        return <Badge className="bg-amber-500">Reminder Sent</Badge>;
      case "payment_refunded":
        return <Badge className="bg-purple-500">Refunded</Badge>;
      case "payment_cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "status_changed":
        return <Badge variant="outline">Status Changed</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  const formatEventDescription = (event: PaymentEvent) => {
    const client = protocolMap[event.clientProtocolId];
    const clientName = client?.name || `Protocol #${event.clientProtocolId}`;
    
    switch (event.eventType) {
      case "payment_received":
        return `${clientName} paid $${parseFloat(event.amount || "0").toFixed(2)} via ${event.paymentMethod || "unknown method"}`;
      case "payment_failed":
        return `Payment attempt failed for ${clientName}`;
      case "payment_due":
        return `Protocol approved for ${clientName} - payment now due`;
      case "reminder_sent":
        return `${event.reminderType || "Payment"} reminder sent to ${event.emailSentTo || clientName}`;
      case "payment_refunded":
        return `$${parseFloat(event.amount || "0").toFixed(2)} refunded to ${clientName}`;
      case "payment_cancelled":
        return `Payment cancelled for ${clientName}`;
      case "status_changed":
        return `Payment status changed for ${clientName}`;
      default:
        return `${event.eventType} for ${clientName}`;
    }
  };

  // Filter events by search term
  const filteredEvents = eventsData?.events.filter((event: PaymentEvent) => {
    if (!searchTerm) return true;
    const client = protocolMap[event.clientProtocolId];
    const searchLower = searchTerm.toLowerCase();
    return (
      client?.name?.toLowerCase().includes(searchLower) ||
      client?.email?.toLowerCase().includes(searchLower) ||
      event.transactionId?.toLowerCase().includes(searchLower) ||
      event.notes?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Payment History</h1>
            <p className="text-muted-foreground">Track all payment events across client protocols</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {backfillMutation.isPending ? "Loading..." : "Import Historical Data"}
            </Button>
            <Button variant="outline" onClick={() => refetchEvents()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${parseFloat(stats?.totalPaymentsReceived?.toString() || "0").toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.paymentsReceivedCount || 0} payments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Reminders Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats?.eventCounts?.reminder_sent || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                in selected period
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.eventCounts?.payment_failed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                needs attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payments Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.eventCounts?.payment_due || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                protocols approved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Breakdown */}
        {stats?.paymentMethods && stats.paymentMethods.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {stats.paymentMethods.map((method: any) => (
                  <div key={method.method || "unknown"} className="p-4 border rounded-lg">
                    <p className="font-medium capitalize">{method.method || "Unknown"}</p>
                    <p className="text-2xl font-bold">${parseFloat(method.total || "0").toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{method.count} transactions</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              <FileText className="w-4 h-4 mr-2" />
              All Events
            </TabsTrigger>
            <TabsTrigger value="received">
              <CheckCircle className="w-4 h-4 mr-2" />
              Received
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="failed">
              <XCircle className="w-4 h-4 mr-2" />
              Failed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All events" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="payment_due">Payment Due</SelectItem>
                        <SelectItem value="reminder_sent">Reminder Sent</SelectItem>
                        <SelectItem value="payment_received">Payment Received</SelectItem>
                        <SelectItem value="payment_failed">Payment Failed</SelectItem>
                        <SelectItem value="payment_refunded">Refunded</SelectItem>
                        <SelectItem value="payment_cancelled">Cancelled</SelectItem>
                        <SelectItem value="status_changed">Status Changed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Time Period</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by client, transaction ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Events</CardTitle>
                <CardDescription>
                  {filteredEvents.length} events found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventsError ? (
                  <div className="text-center py-8 text-red-500">
                    <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Error loading payment events</p>
                    <p className="text-sm">{eventsError.message}</p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading payment history...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payment events found</p>
                    <p className="text-sm">Payment events will appear here as they occur</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvents.map((event: PaymentEvent) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="mt-1">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getEventBadge(event.eventType)}
                            {event.amount && (
                              <span className="font-semibold text-green-600">
                                ${parseFloat(event.amount).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm">
                            {formatEventDescription(event)}
                          </p>
                          {event.notes && (
                            <p className="mt-1 text-xs text-muted-foreground italic">
                              Note: {event.notes}
                            </p>
                          )}
                          {event.transactionId && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Transaction: {event.transactionId}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.createdAt), "MMM d, yyyy")}
                          <br />
                          {format(new Date(event.createdAt), "h:mm a")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="received">
            <Card>
              <CardHeader>
                <CardTitle>Payments Received</CardTitle>
                <CardDescription>Successfully completed payments</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEvents.filter((e: PaymentEvent) => e.eventType === "payment_received").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payments received in this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvents
                      .filter((e: PaymentEvent) => e.eventType === "payment_received")
                      .map((event: PaymentEvent) => (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {protocolMap[event.clientProtocolId]?.name || `Protocol #${event.clientProtocolId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {event.paymentMethod} • {format(new Date(event.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              ${parseFloat(event.amount || "0").toFixed(2)}
                            </p>
                            <Badge className="bg-green-500">Received</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
                <CardDescription>Protocols awaiting payment</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEvents.filter((e: PaymentEvent) => e.eventType === "payment_due").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending payments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvents
                      .filter((e: PaymentEvent) => e.eventType === "payment_due")
                      .map((event: PaymentEvent) => (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {protocolMap[event.clientProtocolId]?.name || `Protocol #${event.clientProtocolId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Approved on {format(new Date(event.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge className="bg-blue-500">Awaiting Payment</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed">
            <Card>
              <CardHeader>
                <CardTitle>Failed Payments</CardTitle>
                <CardDescription>Payment attempts that did not complete</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEvents.filter((e: PaymentEvent) => e.eventType === "payment_failed").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                    <p>No failed payments - great!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvents
                      .filter((e: PaymentEvent) => e.eventType === "payment_failed")
                      .map((event: PaymentEvent) => (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
                          <div>
                            <p className="font-medium">
                              {protocolMap[event.clientProtocolId]?.name || `Protocol #${event.clientProtocolId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Failed on {format(new Date(event.createdAt), "MMM d, yyyy")}
                            </p>
                            {event.notes && (
                              <p className="text-sm text-red-600 mt-1">{event.notes}</p>
                            )}
                          </div>
                          <Badge variant="destructive">Failed</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
