import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";
import { Bell, Send, Users, User, Megaphone, Activity, CheckCircle, XCircle, Clock, RefreshCw, Smartphone, Tablet, Monitor, TestTube2 } from "lucide-react";
import { PushNotificationBanner } from "../../components/PushNotificationBanner";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { format } from "date-fns";

export default function PushNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [notificationType, setNotificationType] = useState<string>("custom");

  // Queries
  const statsQuery = trpc.push.getStats.useQuery();
  const subscriptionsQuery = trpc.push.listSubscriptions.useQuery({ limit: 100 });
  const logsQuery = trpc.push.getLogs.useQuery({ limit: 50 });
  const clientsQuery = trpc.clientProtocol.list.useQuery();

  // Mutations
  const sendToClientMutation = trpc.push.sendToClient.useMutation({
    onSuccess: (result) => {
      toast.success(`Notification sent! ${result.sent} delivered, ${result.failed} failed`);
      resetForm();
      logsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send notification");
    },
  });

  const sendAnnouncementMutation = trpc.push.sendAnnouncement.useMutation({
    onSuccess: (result) => {
      toast.success(`Announcement sent! ${result.sent} delivered, ${result.failed} failed`);
      resetForm();
      logsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send announcement");
    },
  });

  const sendTestToSelfMutation = trpc.push.sendTestToSelf.useMutation({
    onSuccess: (result) => {
      if (result.sent > 0) {
        toast.success(`Test notification sent! Check your device.`);
      } else {
        toast.error(`No active subscriptions found for your account. Make sure you've enabled push notifications on this device first.`);
      }
      logsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send test notification");
    },
  });

  const { isSupported, isSubscribed, subscribe, permission } = usePushNotifications();

  const resetForm = () => {
    setTitle("");
    setBody("");
    setUrl("");
    setSelectedClientId("");
    setNotificationType("custom");
  };

  const handleSendToClient = () => {
    if (!selectedClientId || !title || !body) {
      toast.error("Please select a client and fill in title and message");
      return;
    }
    sendToClientMutation.mutate({
      clientId: parseInt(selectedClientId),
      title,
      body,
      url: url || undefined,
      notificationType: notificationType as any,
    });
  };

  const handleSendAnnouncement = () => {
    if (!title || !body) {
      toast.error("Please fill in title and message");
      return;
    }
    sendAnnouncementMutation.mutate({
      title,
      body,
      url: url || undefined,
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "delivered":
        return (
          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Delivered
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getNotificationTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      protocol_updated: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      payment_due: "bg-amber-500/20 text-amber-600 border-amber-500/30",
      payment_received: "bg-green-500/20 text-green-600 border-green-500/30",
      checkin_available: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      checkin_reminder: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30",
      announcement: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30",
      custom: "bg-slate-500/20 text-slate-600 border-slate-500/30",
    };
    return (
      <Badge className={colors[type] || colors.custom}>
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  // Get clients with push subscriptions
  const clientsWithSubscriptions = clientsQuery.data?.filter((client: any) => {
    return subscriptionsQuery.data?.subscriptions.some(
      (sub: any) => sub.clientId === client.id
    );
  }) || [];

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Push Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Send push notifications to clients with the PWA installed
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          statsQuery.refetch();
          subscriptionsQuery.refetch();
          logsQuery.refetch();
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Push Notification Subscribe Banner */}
      <PushNotificationBanner />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {isSupported && !isSubscribed && permission !== 'denied' && (
          <Button
            variant="outline"
            onClick={async () => {
              const success = await subscribe();
              if (success) {
                statsQuery.refetch();
                subscriptionsQuery.refetch();
              }
            }}
            className="border-amber-500 text-amber-600 hover:bg-amber-50"
          >
            <Bell className="h-4 w-4 mr-2" />
            Enable Push on This Device
          </Button>
        )}
        {isSubscribed && (
          <Button
            variant="outline"
            onClick={() => sendTestToSelfMutation.mutate()}
            disabled={sendTestToSelfMutation.isPending}
            className="border-green-500 text-green-600 hover:bg-green-50"
          >
            <TestTube2 className="h-4 w-4 mr-2" />
            {sendTestToSelfMutation.isPending ? 'Sending...' : 'Send Test Push to Myself'}
          </Button>
        )}
        {isSubscribed && (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 self-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Push Enabled on This Device
          </Badge>
        )}
        {permission === 'denied' && (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 self-center">
            <XCircle className="h-3 w-3 mr-1" />
            Notifications Blocked - Check Browser Settings
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{statsQuery.data?.activeSubscriptions || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subscriptions</p>
                <p className="text-2xl font-bold">{statsQuery.data?.totalSubscriptions || 0}</p>
              </div>
              <Smartphone className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications Sent</p>
                <p className="text-2xl font-bold">{statsQuery.data?.notificationsSent || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{statsQuery.data?.notificationsFailed || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Notification Logs
          </TabsTrigger>
        </TabsList>

        {/* Send Notification Tab */}
        <TabsContent value="send" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Send to Individual Client */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Send to Client
                </CardTitle>
                <CardDescription>
                  Send a notification to a specific client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsWithSubscriptions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No clients with push subscriptions
                        </SelectItem>
                      ) : (
                        clientsWithSubscriptions.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.clientName} ({client.clientEmail})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clientsWithSubscriptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Clients need to install the PWA and enable notifications first
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notification Type</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Message</SelectItem>
                      <SelectItem value="protocol_updated">Protocol Updated</SelectItem>
                      <SelectItem value="payment_due">Payment Due</SelectItem>
                      <SelectItem value="payment_received">Payment Received</SelectItem>
                      <SelectItem value="checkin_available">Check-in Available</SelectItem>
                      <SelectItem value="checkin_reminder">Check-in Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Notification title..."
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Notification message..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://peptidecoach.pro/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Where to take the user when they tap the notification
                  </p>
                </div>

                <Button
                  onClick={handleSendToClient}
                  disabled={sendToClientMutation.isPending || !selectedClientId || !title || !body}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendToClientMutation.isPending ? "Sending..." : "Send to Client"}
                </Button>
              </CardContent>
            </Card>

            {/* Send Announcement to All */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Send Announcement
                </CardTitle>
                <CardDescription>
                  Send a notification to all subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-sm text-amber-600">
                    <strong>Note:</strong> This will send to all {statsQuery.data?.activeSubscriptions || 0} active subscribers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement title..."
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Announcement message..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://peptidecoach.pro/..."
                  />
                </div>

                <Button
                  onClick={handleSendAnnouncement}
                  disabled={sendAnnouncementMutation.isPending || !title || !body}
                  className="w-full"
                  variant="secondary"
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  {sendAnnouncementMutation.isPending ? "Sending..." : "Send Announcement"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                Devices that have subscribed to push notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionsQuery.data?.subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active subscriptions</p>
                  <p className="text-sm">Clients need to install the PWA and enable notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptionsQuery.data?.subscriptions.map((sub: any) => {
                    const client = clientsQuery.data?.find((c: any) => c.id === sub.clientId);
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(sub.deviceType)}
                          <div>
                            <p className="font-medium">
                              {client?.clientName || sub.userId ? `User #${sub.userId}` : "Anonymous"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sub.deviceType} • Subscribed {format(new Date(sub.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.lastUsedAt && (
                            <span className="text-xs text-muted-foreground">
                              Last used: {format(new Date(sub.lastUsedAt), "MMM d")}
                            </span>
                          )}
                          <Badge variant={sub.isActive ? "default" : "secondary"}>
                            {sub.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
              <CardDescription>
                Recent push notification history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsQuery.data?.logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logsQuery.data?.logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{log.title}</p>
                          {getNotificationTypeBadge(log.notificationType)}
                        </div>
                        <p className="text-sm text-muted-foreground">{log.body}</p>
                        {log.url && (
                          <p className="text-xs text-blue-500">{log.url}</p>
                        )}
                        {log.errorMessage && (
                          <p className="text-xs text-red-500">Error: {log.errorMessage}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(log.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
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