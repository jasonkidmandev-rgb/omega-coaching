import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT, toLocaleTimeStringMT } from "@/lib/timezone";
import { Plus, Users, FileText, Package, CheckCircle, Clock, AlertCircle, Link2, AlertTriangle, MessageSquare, Calendar, ArrowRight, Mail, TrendingUp, ExternalLink, ListTodo, Send, DollarSign, User, Sparkles, Info, Settings, RotateCcw, X, Gift, Trophy, Medal, ClipboardList, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
// recharts is already used by CheckinReview, CheckinSummaryTab and the client Metrics page.
// The older email chart further down this file is hand-rolled divs; new charts use this.
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { data: clients } = trpc.clientProtocol.list.useQuery();
  const { data: templates } = trpc.template.list.useQuery();
  const { data: items } = trpc.protocolItem.list.useQuery();
  const { data: mappings } = trpc.inventory.getMappings.useQuery();
  const { data: inventoryData } = trpc.inventory.listCategories.useQuery();
  const { data: emailAnalytics } = trpc.emailTracking.getAnalytics.useQuery({ days: 30 });
  const { data: clickAnalytics } = trpc.emailTracking.getClickAnalytics.useQuery({ days: 30 });
  const { data: protocolsNeedingFollowUp } = trpc.emailTracking.getProtocolsNeedingFollowUp.useQuery({});
  // referral leaderboard removed - referral system cleaned up
  const { data: enrollmentStats, refetch: refetchEnrollmentStats } = trpc.transformation.getEnrollmentCompletionStats.useQuery();
  const { data: dashboardPrefs, refetch: refetchPrefs } = trpc.dashboardPreferences.get.useQuery();
  // One query for revenue + the 6-month trend. getSummary and getMonthlyTrends would each
  // re-scan all three payment sources; this does that work once.
  const { data: dashboardMetrics } = trpc.paymentHistory.getDashboardMetrics.useQuery();
  const { user: currentUser } = useAuth();
  
  const updateVisibilityMutation = trpc.dashboardPreferences.updateVisibility.useMutation({
    onSuccess: () => refetchPrefs(),
  });
  const resetPrefsMutation = trpc.dashboardPreferences.reset.useMutation({
    onSuccess: () => refetchPrefs(),
  });
  
  const sendAllFollowUpsMutation = trpc.emailTracking.sendAllFollowUps.useMutation({
    onSuccess: (data) => {
      alert(`Sent ${data.sent} follow-up emails (${data.failed} failed)`);
    },
  });
  const sendBulkIntakeRemindersMutation = trpc.transformation.sendBulkIntakeReminders.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      refetchEnrollmentStats();
    },
  });
  const sendIntakeReminderMutation = trpc.transformation.sendIntakeReminder.useMutation({
    onSuccess: () => {
      alert('Intake form reminder sent!');
      refetchEnrollmentStats();
    },
  });

  // Widget visibility helper
  const isWidgetVisible = (key: string) => {
    return dashboardPrefs?.widgetVisibility?.[key] ?? true;
  };

  const toggleWidget = (key: string) => {
    updateVisibilityMutation.mutate({
      widgetKey: key,
      visible: !isWidgetVisible(key),
    });
  };

  // Find admin's own protocol based on their email
  const myProtocol = React.useMemo(() => {
    if (!clients || !currentUser?.email) return null;
    return clients.find(c => c.clientEmail?.toLowerCase() === currentUser.email?.toLowerCase());
  }, [clients, currentUser]);

  // Calculate unmapped protocol items by frequency
  const unmappedByFrequency = React.useMemo(() => {
    if (!items || !mappings || !clients) return [];
    
    const mappedIds = new Set(mappings.map((m: any) => m.protocolItemId));
    const unmappedItems = items.filter((item: any) => !mappedIds.has(item.id));
    
    // Count usage in client protocols
    const usageCount: Record<number, number> = {};
    clients.forEach((client: any) => {
      client.items?.forEach((item: any) => {
        if (item.protocolItemId && !mappedIds.has(item.protocolItemId)) {
          usageCount[item.protocolItemId] = (usageCount[item.protocolItemId] || 0) + 1;
        }
      });
    });
    
    return unmappedItems
      .map((item: any) => ({ ...item, usageCount: usageCount[item.id] || 0 }))
      .sort((a: any, b: any) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }, [items, mappings, clients]);

  const stats = {
    totalClients: clients?.length || 0,
    pendingApproval: clients?.filter((c) => c.status === "pending_approval").length || 0,
    approved: clients?.filter((c) => c.status === "approved" || c.status === "active").length || 0,
    templates: templates?.length || 0,
    protocolItems: items?.length || 0,
  };

  // Revenue is the only figure with real history behind it, so it is the only tile that
  // gets a trend line and a comparison. The other three are point-in-time counts — the app
  // stores no daily snapshot of them, and inventing a trend for a number we cannot actually
  // track over time would be worse than showing none.
  const revenue = dashboardMetrics?.data;
  const revenueThisMonth = revenue?.currentMonthRevenue ?? 0;
  const revenueLastMonth = revenue?.previousMonthRevenue ?? 0;
  const revenueChangePct =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;
  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <>
      <div className="space-y-4 md:space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <Breadcrumb />
            <h1 className="text-xl md:text-2xl sm:text-3xl font-bold tracking-tight mt-2">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Overview of your health coaching protocol management
            </p>
          </div>
          
          {/* Actions live here as small buttons rather than as page sections. They used to
              occupy two full blocks — a "Protocol Collaboration Center" card and a
              three-card "Quick Actions" grid — which between them repeated the same three
              destinations and pushed the real content further down the page. */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setLocation("/admin/clients/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New client</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/admin/templates")} className="gap-2 hidden md:inline-flex">
              <FileText className="h-4 w-4" />
              Templates
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/admin/items")} className="gap-2 hidden md:inline-flex">
              <Package className="h-4 w-4" />
              Items
            </Button>

          {/* Customize Dashboard Button */}
          <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Customize</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Customize Dashboard
                </SheetTitle>
                <SheetDescription>
                  Choose which widgets to show or hide on your dashboard
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Changes save as you make them.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetPrefsMutation.mutate()}
                    disabled={resetPrefsMutation.isPending}
                    className="text-muted-foreground shrink-0"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>

                <div className="space-y-3">
                  {dashboardPrefs?.widgets?.map((widget) => (
                    <div 
                      key={widget.key}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-sm">{widget.label}</p>
                          <p className="text-xs text-muted-foreground">{widget.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isWidgetVisible(widget.key)}
                        onCheckedChange={() => toggleWidget(widget.key)}
                        disabled={updateVisibilityMutation.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>

        {/* Metrics strip — the "is anything wrong?" row. Compact on purpose: this is the
            first thing on the page and should be readable without scrolling. Templates was
            dropped from here; it is a configuration count, not a business metric. */}
        {isWidgetVisible("clientOverview") && (
          <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
            {/* Revenue — the only tile with real history, so the only one with a trend. */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/admin/payment-history")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:px-4 md:pt-4">
                <CardTitle className="text-xs md:text-sm font-medium">Revenue this month</CardTitle>
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:px-4 md:pb-4 pt-0">
                <div className="text-xl md:text-2xl font-bold">{money(revenueThisMonth)}</div>
                {revenueChangePct === null ? (
                  <p className="text-[10px] md:text-xs text-muted-foreground">No revenue last month to compare</p>
                ) : (
                  <p className={`text-[10px] md:text-xs ${revenueChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {revenueChangePct >= 0 ? "▲" : "▼"} {Math.abs(revenueChangePct)}% vs last month
                  </p>
                )}
                {revenue?.trend && revenue.trend.length > 0 && (
                  <div className="h-10 mt-2 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenue.trend}>
                        <RechartsTooltip
                          cursor={false}
                          contentStyle={{ fontSize: "12px", padding: "4px 8px" }}
                          formatter={(value: any) => [money(Number(value)), "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/admin/clients")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:px-4 md:pt-4">
                <CardTitle className="text-xs md:text-sm font-medium">Active clients</CardTitle>
                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:px-4 md:pb-4 pt-0">
                <div className="text-xl md:text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">{stats.approved} approved or active</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/admin/clients?status=pending_approval")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:px-4 md:pt-4">
                <CardTitle className="text-xs md:text-sm font-medium">Awaiting approval</CardTitle>
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="p-3 md:px-4 md:pb-4 pt-0">
                <div className="text-xl md:text-2xl font-bold text-amber-600">{stats.pendingApproval}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Clients yet to review</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/admin/enrollments")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:px-4 md:pt-4">
                <CardTitle className="text-xs md:text-sm font-medium">Overdue intake</CardTitle>
                <AlertTriangle className={`h-3 w-3 md:h-4 md:w-4 ${(enrollmentStats?.overdueCount ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent className="p-3 md:px-4 md:pb-4 pt-0">
                <div className={`text-xl md:text-2xl font-bold ${(enrollmentStats?.overdueCount ?? 0) > 0 ? "text-red-600" : ""}`}>
                  {enrollmentStats?.overdueCount ?? 0}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Past 10 days</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Work queue and recent activity side by side. Both used to be full-width cards
            at opposite ends of the page; on a wide admin screen that wasted most of the
            width and pushed everything further down. */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {isWidgetVisible("needsAttention") && (
              <NeedsAttention
                clients={clients}
                followUps={protocolsNeedingFollowUp}
                unmappedItems={unmappedByFrequency}
                overdueCount={enrollmentStats?.overdueCount ?? 0}
                onSendAllFollowUps={() => sendAllFollowUpsMutation.mutate({})}
                sendingFollowUps={sendAllFollowUpsMutation.isPending}
              />
            )}
          </div>
          <div>
        {/* Recent Clients */}
        {isWidgetVisible("recentClients") && clients && clients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Recent Client Protocols
              </CardTitle>
              <CardDescription>Latest client protocols you've created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/admin/clients/${client.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {client.clientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{client.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.durationMonths} month protocol
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={client.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
          </div>
        </div>

        {/* Email figures beside the pipeline. The email card is four numbers — it never
            needed the full page width — and this bounds the funnel so it cannot take over
            the screen. */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3 items-stretch">
          {/* Email activity and My Protocol stack in one column, each taking half its
              height, so together they match the pipeline card beside them. */}
          <div className="flex flex-col gap-4 md:gap-6 [&>*]:flex-1">
        {/* Client email activity, condensed.

            This was two full-width blocks — roughly 220 lines — showing Emails Sent,
            Opened, Open Rate, a 7-day bar chart and a per-client open list, then Total
            Clicks, Unique Clickers, Click-Through Rate, top links and recent clicks.
            That is email-marketing reporting, and it was taking up more of the dashboard
            than the client work did. The headline numbers stay here; anything that needed
            a real look was never going to be done from a dashboard tile.

            Note there is an open question for Jason on whether the email-engagement
            tracking pipeline is kept at all (see decisions.md). If it goes, this row goes
            with it. */}
        {isWidgetVisible("emailActivity") && (emailAnalytics || clickAnalytics) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Client email activity
              </CardTitle>
              <CardDescription>How clients are engaging with emails we send them, last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {emailAnalytics && (
                  <>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{emailAnalytics.totalSent}</p>
                      <p className="text-xs text-muted-foreground">Emails sent</p>
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{emailAnalytics.openRate}%</p>
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                  </>
                )}
                {clickAnalytics && clickAnalytics.totalClicks > 0 && (
                  <>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{clickAnalytics.totalClicks}</p>
                      <p className="text-xs text-muted-foreground">Link clicks</p>
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{clickAnalytics.uniqueClicks}</p>
                      <p className="text-xs text-muted-foreground">Clients clicking</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Coaching Enrollment Pipeline Widget */}
        {/* Moved here from the top of the page so the left column carries two even cards
            against the pipeline on the right. */}
        {isWidgetVisible("myProtocol") && (
          <MyProtocolSection
            myProtocol={myProtocol}
            currentUser={currentUser}
            setLocation={setLocation}
            clients={clients}
          />
        )}
          </div>
          <div className="lg:col-span-2">
        {isWidgetVisible("enrollmentPipeline") && enrollmentStats && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-teal-500" />
                    Coaching Enrollment Pipeline
                  </CardTitle>
                  <CardDescription>
                    Track prospect progress through the enrollment journey
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/admin/enrollments')}
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Pipeline Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <UserCheck className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-blue-600">{enrollmentStats.profilesCompleted}</div>
                  <p className="text-xs text-muted-foreground">Profiles Done</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <UserX className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-amber-600">{enrollmentStats.profilesIncomplete}</div>
                  <p className="text-xs text-muted-foreground">Profiles Pending</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-red-600">{enrollmentStats.intakePending}</div>
                  <p className="text-xs text-muted-foreground">Intake outstanding</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-green-600">{enrollmentStats.intakeCompleted}</div>
                  <p className="text-xs text-muted-foreground">Intake done</p>
                </div>
              </div>

              {/* Status Funnel */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Funnel by status stage</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'Enrolled', count: enrollmentStats.statusEnrolled, color: 'bg-blue-500' },
                    { label: 'Videos Watched', count: enrollmentStats.statusVideoComplete, color: 'bg-indigo-500' },
                    { label: 'Coaching Paid', count: enrollmentStats.statusCoachingPaid, color: 'bg-amber-500' },
                    { label: 'Intake Complete', count: enrollmentStats.statusIntakeComplete, color: 'bg-teal-500' },
                    { label: 'Strategy Scheduled', count: enrollmentStats.statusDiscoveryScheduled, color: 'bg-purple-500' },
                    { label: 'Active', count: enrollmentStats.statusActive, color: 'bg-green-500' },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-32 shrink-0">{step.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`${step.color} h-full rounded-full transition-all`}
                          style={{ width: `${Math.max(enrollmentStats.totalEnrollments > 0 ? (step.count / enrollmentStats.totalEnrollments) * 100 : 0, step.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      {/* count sits outside the bar now — it does not fit inside a 12px one */}
                      <span className="text-xs font-medium w-6 text-right shrink-0">{step.count}</span>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Referral Leaderboard - removed (referral system cleaned up) */}
          </div>
        </div>
      </div>
    </>
  );
}

// My Protocol Section Component
function MyProtocolSection({ 
  myProtocol, 
  currentUser, 
  setLocation,
  clients
}: { 
  myProtocol: any; 
  currentUser: any; 
  setLocation: (path: string) => void;
  clients: any[] | undefined;
}) {
  if (!currentUser) return null;

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              My Protocol
              <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                <Sparkles className="h-3 w-3 mr-1" />
                Quick Access
              </Badge>
            </CardTitle>
            <CardDescription>
              Your personal protocol as {currentUser.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {myProtocol ? (
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-violet-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-violet-700 font-semibold">
                  {myProtocol.clientName?.charAt(0)?.toUpperCase() || currentUser.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium">{myProtocol.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  {myProtocol.durationMonths} month protocol • <StatusBadge status={myProtocol.status} />
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/admin/clients/${myProtocol.id}/edit`)}
              >
                Edit Protocol
              </Button>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => window.open(`/protocol/${myProtocol.accessToken}`, '_blank')}
              >
                View as Client
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 bg-white rounded-lg border border-violet-100">
            <User className="h-10 w-10 text-violet-300 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No protocol found for {currentUser.email}
            </p>
            <Button
              onClick={() => setLocation("/admin/clients/new")}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Create My Protocol
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft: {
      label: "Draft",
      className: "bg-slate-100 text-slate-700",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    pending_approval: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock className="h-3 w-3" />,
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    active: {
      label: "Active",
      className: "bg-blue-100 text-blue-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    completed: {
      label: "Completed",
      className: "bg-purple-100 text-purple-700",
      icon: <CheckCircle className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}


// One work queue for the whole dashboard.
//
// This used to be four separate cards scattered down the page — Today's Tasks near the
// top, then Awaiting Follow-Up, Unmapped Items and the overdue-intake alert far below,
// with email charts in between. All four answered the same question ("what do I need to
// do?"), so seeing your whole workload meant scrolling the entire page. They are one
// sorted list now; every row keeps the action it already had.
function NeedsAttention({
  clients,
  followUps,
  unmappedItems,
  overdueCount,
  onSendAllFollowUps,
  sendingFollowUps,
}: {
  clients: any[] | undefined;
  followUps: any[] | undefined;
  unmappedItems: any[];
  overdueCount: number;
  onSendAllFollowUps: () => void;
  sendingFollowUps: boolean;
}) {
  const [, setLocation] = useLocation();

  if (!clients) return null;
  
  // Calculate tasks
  const tasks = [];
  
  // Draft protocols that need to be sent
  const drafts = clients.filter(c => c.status === 'draft');
  if (drafts.length > 0) {
    tasks.push({
      id: 'drafts',
      icon: FileText,
      title: `${drafts.length} draft protocol${drafts.length > 1 ? 's' : ''} to send`,
      description: 'Protocols created but not yet sent to clients',
      action: () => setLocation('/admin/clients?status=draft'),
      actionLabel: 'View Drafts',
      priority: 'high',
      color: 'amber',
    });
  }
  
  // Pending approvals
  const pending = clients.filter(c => c.status === 'pending_approval');
  if (pending.length > 0) {
    tasks.push({
      id: 'pending',
      icon: Clock,
      title: `${pending.length} protocol${pending.length > 1 ? 's' : ''} awaiting approval`,
      description: 'Clients need to review and approve their protocols',
      action: () => setLocation('/admin/clients?status=pending_approval'),
      actionLabel: 'View Pending',
      priority: 'medium',
      color: 'blue',
    });
  }
  
  // Unpaid protocols
  const unpaid = clients.filter(c => c.paymentStatus === 'pending' || c.paymentStatus === 'failed');
  if (unpaid.length > 0) {
    tasks.push({
      id: 'unpaid',
      icon: DollarSign,
      title: `${unpaid.length} protocol${unpaid.length > 1 ? 's' : ''} with pending payment`,
      description: 'Payments need to be collected or marked as received',
      action: () => setLocation('/admin/clients'),
      actionLabel: 'View Payments',
      priority: 'medium',
      color: 'red',
    });
  }
  
  // Clients without email
  const noEmail = clients.filter(c => !c.clientEmail && c.status !== 'completed');
  if (noEmail.length > 0) {
    tasks.push({
      id: 'no-email',
      icon: Mail,
      title: `${noEmail.length} client${noEmail.length > 1 ? 's' : ''} without email`,
      description: 'Add email addresses to send protocol links',
      action: () => setLocation('/admin/clients'),
      actionLabel: 'Add Emails',
      priority: 'low',
      color: 'slate',
    });
  }

  // ── folded in from the three cards that used to sit further down ──────────────

  if (overdueCount > 0) {
    tasks.push({
      id: 'overdue-intake',
      icon: AlertTriangle,
      title: `${overdueCount} enrollment${overdueCount > 1 ? 's' : ''} overdue by more than 10 days`,
      description: 'Intake forms still not completed',
      action: () => setLocation('/admin/enrollments'),
      actionLabel: 'View Enrollments',
      priority: 'high',
      color: 'red',
    });
  }

  if (followUps && followUps.length > 0) {
    tasks.push({
      id: 'follow-ups',
      icon: Send,
      title: `${followUps.length} client${followUps.length > 1 ? 's' : ''} awaiting a follow-up email`,
      description: 'Protocol sent but not opened',
      action: onSendAllFollowUps,
      actionLabel: sendingFollowUps ? 'Sending…' : 'Send All',
      priority: 'medium',
      color: 'blue',
    });
  }

  if (unmappedItems.length > 0) {
    tasks.push({
      id: 'unmapped',
      icon: Link2,
      title: `${unmappedItems.length} protocol item${unmappedItems.length > 1 ? 's' : ''} not mapped to inventory`,
      description: 'Stock will not be deducted until these are mapped',
      action: () => setLocation('/admin/inventory'),
      actionLabel: 'Map Items',
      priority: 'low',
      color: 'slate',
    });
  }

  // Most urgent first. Within a level the order is the order they were added above.
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);
  
  if (tasks.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">All caught up!</h3>
              <p className="text-sm text-green-600">No pending tasks for today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200' },
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListTodo className="h-5 w-5 text-primary" />
          Needs attention
        </CardTitle>
        <CardDescription>
          {tasks.length} item{tasks.length > 1 ? 's' : ''} to deal with
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const colors = colorClasses[task.color];
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between p-4 rounded-lg ${colors.bg} ${colors.border} border cursor-pointer hover:shadow-sm transition-shadow`}
              onClick={task.action}
            >
              <div className="flex items-center gap-3">
                <task.icon className={`h-5 w-5 ${colors.icon}`} />
                <div>
                  <p className="font-medium text-sm">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0">
                {task.actionLabel}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
