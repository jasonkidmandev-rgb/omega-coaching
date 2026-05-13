import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Bell, CheckCircle, XCircle, Clock, RefreshCw,
  MousePointerClick, Eye, Send, ChevronLeft, ChevronRight,
  FileText, CreditCard, Package, User, Calendar, Megaphone, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

interface ClientNotificationHistorySubTabProps {
  clientId: number;
  clientEmail?: string;
  clientName?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  checkin: <Bell className="h-3.5 w-3.5" />,
  protocol: <FileText className="h-3.5 w-3.5" />,
  payment: <CreditCard className="h-3.5 w-3.5" />,
  shipping: <Package className="h-3.5 w-3.5" />,
  inventory: <Package className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  welcome: <User className="h-3.5 w-3.5" />,
  announcement: <Megaphone className="h-3.5 w-3.5" />,
  digest: <Calendar className="h-3.5 w-3.5" />,
  other: <Mail className="h-3.5 w-3.5" />,
};

const categoryColors: Record<string, string> = {
  checkin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  protocol: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  payment: "bg-green-500/10 text-green-600 border-green-500/20",
  shipping: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  inventory: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  document: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  welcome: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  announcement: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  digest: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const inAppTypeColors: Record<string, string> = {
  protocol_approved: "bg-green-500/10 text-green-600 border-green-500/20",
  protocol_viewed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  payment_received: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  payment_failed: "bg-red-500/10 text-red-600 border-red-500/20",
  payment_refunded: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  profile_completed: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  packing_slip_created: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  protocol_option_selected: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  protocol_expiring: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function getDeliveryStatus(notification: any): { label: string; color: string; icon: React.ReactNode } {
  if (notification.clickedAt) {
    return { label: "Clicked", color: "text-purple-600 bg-purple-50", icon: <MousePointerClick className="h-3.5 w-3.5" /> };
  }
  if (notification.openedAt) {
    return { label: "Opened", color: "text-blue-600 bg-blue-50", icon: <Eye className="h-3.5 w-3.5" /> };
  }
  if (notification.status === "failed") {
    return { label: "Failed", color: "text-red-600 bg-red-50", icon: <XCircle className="h-3.5 w-3.5" /> };
  }
  return { label: "Delivered", color: "text-green-600 bg-green-50", icon: <CheckCircle className="h-3.5 w-3.5" /> };
}

export default function ClientNotificationHistorySubTab({ clientId, clientEmail, clientName }: ClientNotificationHistorySubTabProps) {
  const [activeTab, setActiveTab] = useState<"email" | "inapp">("email");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [emailPage, setEmailPage] = useState(0);
  const [inappPage, setInappPage] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const pageSize = 20;

  // Fetch emails sent to this client by their email address
  const { data: emailData, isLoading: emailLoading, refetch: refetchEmails } = trpc.notificationHistory.list.useQuery({
    recipientEmail: clientEmail || undefined,
    category: categoryFilter !== "all" ? categoryFilter as any : undefined,
    limit: pageSize,
    offset: emailPage * pageSize,
  }, { enabled: !!clientEmail });

  // Fetch in-app notifications related to this client protocol
  const { data: inappData, isLoading: inappLoading, refetch: refetchInapp } = trpc.notificationHistory.listInApp.useQuery({
    clientProtocolId: clientId,
    limit: pageSize,
    offset: inappPage * pageSize,
  });

  const emailNotifications = emailData?.notifications || [];
  const emailTotal = emailData?.total || 0;
  const inappNotifications = inappData?.notifications || [];
  const inappTotal = inappData?.total || 0;

  const emailPages = Math.ceil(emailTotal / pageSize);
  const inappPages = Math.ceil(inappTotal / pageSize);

  const handleRefresh = () => {
    refetchEmails();
    refetchInapp();
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Notification History</h3>
          <p className="text-xs text-gray-500">
            All emails and in-app notifications for {clientName || "this client"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{emailTotal}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Emails</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-50">
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{inappTotal}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">In-App</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-50">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {emailNotifications.filter((n: any) => n.openedAt).length > 0
                    ? `${Math.round((emailNotifications.filter((n: any) => n.openedAt).length / emailNotifications.length) * 100)}%`
                    : "—"}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-50">
                <MousePointerClick className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {emailNotifications.filter((n: any) => n.clickedAt).length > 0
                    ? `${Math.round((emailNotifications.filter((n: any) => n.clickedAt).length / emailNotifications.length) * 100)}%`
                    : "—"}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Click Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === "email"
              ? "bg-orange-500 text-white font-medium shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
          {emailTotal > 0 && (
            <Badge variant="secondary" className={`ml-1 text-[10px] px-1.5 ${activeTab === "email" ? "bg-white/20 text-white" : ""}`}>
              {emailTotal}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("inapp")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === "inapp"
              ? "bg-orange-500 text-white font-medium shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          In-App
          {inappTotal > 0 && (
            <Badge variant="secondary" className={`ml-1 text-[10px] px-1.5 ${activeTab === "inapp" ? "bg-white/20 text-white" : ""}`}>
              {inappTotal}
            </Badge>
          )}
        </button>

        {activeTab === "email" && (
          <div className="ml-auto">
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setEmailPage(0); }}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="protocol">Protocol</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Email Tab Content */}
      {activeTab === "email" && (
        <div className="space-y-2">
          {emailLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !clientEmail ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No email address on file</p>
              <p className="text-xs">Add a client email to see email history</p>
            </div>
          ) : emailNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No emails sent yet</p>
              <p className="text-xs">Emails sent to {clientEmail} will appear here</p>
            </div>
          ) : (
            <>
              {emailNotifications.map((notification: any) => {
                const delivery = getDeliveryStatus(notification);
                return (
                  <div
                    key={notification.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedNotification({ ...notification, _type: "email" })}
                  >
                    <div className="flex-shrink-0">
                      <div className="p-1.5 rounded-md bg-gray-100">
                        <Mail className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{notification.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] py-0 ${categoryColors[notification.category] || categoryColors.other}`}>
                          {categoryIcons[notification.category] || categoryIcons.other}
                          <span className="ml-1 capitalize">{notification.category}</span>
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {notification.createdAt ? format(new Date(notification.createdAt), "MMM d, yyyy h:mm a") : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] py-0 flex items-center gap-1 ${delivery.color}`}>
                        {delivery.icon}
                        {delivery.label}
                      </Badge>
                      {notification.openCount > 1 && (
                        <span className="text-[10px] text-gray-400">{notification.openCount}x</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {emailPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">
                    Page {emailPage + 1} of {emailPages} ({emailTotal} total)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={emailPage === 0}
                      onClick={() => setEmailPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={emailPage >= emailPages - 1}
                      onClick={() => setEmailPage(p => p + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* In-App Tab Content */}
      {activeTab === "inapp" && (
        <div className="space-y-2">
          {inappLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : inappNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No in-app notifications</p>
              <p className="text-xs">Notifications related to this client will appear here</p>
            </div>
          ) : (
            <>
              {inappNotifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedNotification({ ...notification, _type: "inapp" })}
                >
                  <div className="flex-shrink-0">
                    <div className="p-1.5 rounded-md bg-amber-50">
                      <Bell className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] py-0 ${inAppTypeColors[notification.type] || inAppTypeColors.other}`}>
                        <span className="capitalize">{notification.type?.replace(/_/g, " ")}</span>
                      </Badge>
                      <span className="text-[10px] text-gray-400">
                        {notification.createdAt ? format(new Date(notification.createdAt), "MMM d, yyyy h:mm a") : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className={`text-[10px] py-0 ${notification.isRead ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"}`}>
                      {notification.isRead ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {inappPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">
                    Page {inappPage + 1} of {inappPages} ({inappTotal} total)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={inappPage === 0}
                      onClick={() => setInappPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={inappPage >= inappPages - 1}
                      onClick={() => setInappPage(p => p + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedNotification?._type === "email" ? (
                <Mail className="h-4 w-4 text-blue-600" />
              ) : (
                <Bell className="h-4 w-4 text-amber-600" />
              )}
              {selectedNotification?._type === "email" ? "Email Details" : "Notification Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?._type === "email"
                ? "Email delivery and engagement tracking"
                : "In-app notification details"}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              {selectedNotification._type === "email" ? (
                <>
                  {/* Email Details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Subject</p>
                        <p className="text-sm font-medium">{selectedNotification.subject}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Delivery Status</p>
                        {(() => {
                          const d = getDeliveryStatus(selectedNotification);
                          return (
                            <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${d.color}`}>
                              {d.icon} {d.label}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Category</p>
                        <Badge variant="outline" className={`text-xs ${categoryColors[selectedNotification.category] || categoryColors.other}`}>
                          {categoryIcons[selectedNotification.category]}
                          <span className="ml-1 capitalize">{selectedNotification.category}</span>
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Type</p>
                        <p className="text-sm">{selectedNotification.notificationType?.replace(/_/g, " ")}</p>
                      </div>
                    </div>

                    {/* Engagement Timeline */}
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Engagement Timeline</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Send className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs font-medium">Sent</span>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {selectedNotification.sentAt
                              ? format(new Date(selectedNotification.sentAt), "MMM d, yyyy h:mm:ss a")
                              : selectedNotification.createdAt
                                ? format(new Date(selectedNotification.createdAt), "MMM d, yyyy h:mm:ss a")
                                : "—"}
                          </span>
                        </div>
                        {selectedNotification.openedAt ? (
                          <div className="flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs font-medium">Opened</span>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {format(new Date(selectedNotification.openedAt), "MMM d, yyyy h:mm:ss a")}
                              {selectedNotification.openCount > 1 && ` (${selectedNotification.openCount}x)`}
                            </span>
                          </div>
                        ) : selectedNotification.trackingId ? (
                          <div className="flex items-center gap-2 opacity-40">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-xs">Not opened yet</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 opacity-40">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs">No tracking (sent before tracking was enabled)</span>
                          </div>
                        )}
                        {selectedNotification.clickedAt ? (
                          <div className="flex items-center gap-2">
                            <MousePointerClick className="h-3.5 w-3.5 text-purple-500" />
                            <span className="text-xs font-medium">Clicked</span>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {format(new Date(selectedNotification.clickedAt), "MMM d, yyyy h:mm:ss a")}
                              {selectedNotification.clickCount > 1 && ` (${selectedNotification.clickCount}x)`}
                            </span>
                          </div>
                        ) : selectedNotification.trackingId && selectedNotification.openedAt ? (
                          <div className="flex items-center gap-2 opacity-40">
                            <MousePointerClick className="h-3.5 w-3.5" />
                            <span className="text-xs">No link clicks</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Triggered By</p>
                        <p className="capitalize">{selectedNotification.triggeredBy || "System"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Created</p>
                        <p>{selectedNotification.createdAt ? format(new Date(selectedNotification.createdAt), "MMM d, yyyy h:mm a") : "—"}</p>
                      </div>
                    </div>

                    {selectedNotification.errorMessage && (
                      <div className="p-2 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{selectedNotification.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* In-App Notification Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Title</p>
                      <p className="text-sm font-medium">{selectedNotification.title}</p>
                    </div>
                    {selectedNotification.message && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Message</p>
                        <p className="text-sm text-gray-700">{selectedNotification.message}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Type</p>
                        <Badge variant="outline" className={`text-xs ${inAppTypeColors[selectedNotification.type] || inAppTypeColors.other}`}>
                          <span className="capitalize">{selectedNotification.type?.replace(/_/g, " ")}</span>
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Status</p>
                        <Badge variant="outline" className={`text-xs ${selectedNotification.isRead ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"}`}>
                          {selectedNotification.isRead ? "Read" : "Unread"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Created</p>
                      <p className="text-sm">{selectedNotification.createdAt ? format(new Date(selectedNotification.createdAt), "MMM d, yyyy h:mm a") : "—"}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
