import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Users, FileText, Package, CheckCircle, Clock, AlertCircle, Link2, AlertTriangle, MessageSquare, Calendar, ArrowRight, Mail, MailOpen, TrendingUp, MousePointer, ExternalLink, ListTodo, Send, DollarSign, User, Sparkles, Info, Settings, Eye, EyeOff, RotateCcw, GripVertical, X, Gift, Trophy, Medal, ClipboardList, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

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
  const sendFollowUpMutation = trpc.emailTracking.sendFollowUp.useMutation({
    onSuccess: () => {
      alert('Follow-up email sent successfully!');
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

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-8">
        {/* Push Notification Opt-In Banner for Admin */}
        <PushNotificationBanner />
        <div className="flex items-start justify-between">
          <div>
            <Breadcrumb />
            <h1 className="text-xl md:text-2xl sm:text-3xl font-bold tracking-tight mt-2">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Overview of your health coaching protocol management
            </p>
          </div>
          
          {/* Customize Dashboard Button */}
          <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Customize</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Customize Dashboard
                </SheetTitle>
                <SheetDescription>
                  Choose which widgets to show or hide on your dashboard
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => resetPrefsMutation.mutate()}
                    disabled={resetPrefsMutation.isPending}
                    className="text-muted-foreground"
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
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
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
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Your preferences are saved automatically
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* My Protocol Section - Quick access for admin's own protocol */}
        {isWidgetVisible("myProtocol") && (
          <MyProtocolSection 
            myProtocol={myProtocol} 
            currentUser={currentUser} 
            setLocation={setLocation}
            clients={clients}
          />
        )}

        {/* Today's Tasks Widget */}
        {isWidgetVisible("todaysTasks") && (
          <TodaysTasks clients={clients} />
        )}

        {/* Protocol Hub Section - Moved from Launchpad */}
        {isWidgetVisible("protocolHub") && (
          <Card className="bg-white border-[#1e3a5f] border-2 shadow-lg">
            <CardHeader className="pb-2 p-3 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5 md:h-8 md:w-8 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-[#1e3a5f] text-lg md:text-2xl">Protocol Collaboration Center</CardTitle>
                  <CardDescription className="text-gray-600 text-xs md:text-base">
                    Review protocols, communicate with clients, and manage approvals
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 md:pt-4 p-3 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="text-center p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-emerald-400 mx-auto mb-1 md:mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">Review & Approve</h4>
                  <p className="text-sm text-gray-600">View and approve client protocols</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <MessageSquare className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">Comments & Discussion</h4>
                  <p className="text-sm text-gray-600">Collaborate with clients on protocols</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Calendar className="h-6 w-6 text-violet-500 mx-auto mb-2" />
                  <h4 className="font-semibold text-gray-900 mb-1">Loom Videos</h4>
                  <p className="text-sm text-gray-600">Embed video explanations</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:from-amber-500 hover:to-orange-600" 
                  onClick={() => setLocation("/admin/clients")}
                >
                  View All Clients
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-[#1e3a5f] text-[#1e3a5f] hover:bg-gray-100"
                  onClick={() => setLocation("/admin/clients/new")}
                >
                  Create New Protocol
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Overview Stats - with clear label */}
        {isWidgetVisible("clientOverview") && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Client Overview</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Statistics for all your clients' protocols</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation("/admin/clients")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold">{stats.totalClients}</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Active protocols</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation("/admin/clients?status=pending_approval")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold text-amber-600">{stats.pendingApproval}</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation("/admin/clients?status=approved")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold text-green-600">{stats.approved}</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Ready</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation("/admin/templates")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Templates</CardTitle>
                  <FileText className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold">{stats.templates}</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Templates</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {isWidgetVisible("quickActions") && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed hover:border-primary"
              onClick={() => setLocation("/admin/clients/new")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Create New Client Protocol
                </CardTitle>
                <CardDescription>
                  Start a new protocol from a template or from scratch
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/admin/templates")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Manage Templates
                </CardTitle>
                <CardDescription>
                  Edit master templates and default protocol items
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/admin/items")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Protocol Items Library
                </CardTitle>
                <CardDescription>
                  Manage peptides, supplements, and supplies
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Client Activity Section Header */}
        {(isWidgetVisible("emailOpenRates") || isWidgetVisible("emailClickRates")) && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Client Activity Overview</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This section shows activity from all your clients - email opens, link clicks, and engagement metrics. This is not your personal activity.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Email Analytics Widget */}
        {isWidgetVisible("emailOpenRates") && emailAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                Client Email Open Rates (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Track how your clients engage with protocol emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{emailAnalytics.totalSent}</div>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <MailOpen className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{emailAnalytics.totalOpened}</div>
                  <p className="text-sm text-muted-foreground">Emails Opened</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-600">{emailAnalytics.openRate}%</div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
              </div>
              
              {/* Simple bar chart visualization */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Daily Activity (Last 7 Days)</p>
                <div className="flex items-end gap-1 h-24">
                  {emailAnalytics.dailyStats.slice(-7).map((day, index) => {
                    const maxValue = Math.max(...emailAnalytics.dailyStats.slice(-7).map(d => d.sent + d.opened), 1);
                    const sentHeight = (day.sent / maxValue) * 100;
                    const openedHeight = (day.opened / maxValue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center" style={{ height: '80px' }}>
                          <div className="w-full flex gap-0.5 items-end h-full">
                            <div 
                              className="flex-1 bg-blue-400 rounded-t"
                              style={{ height: `${sentHeight}%`, minHeight: day.sent > 0 ? '4px' : '0' }}
                              title={`Sent: ${day.sent}`}
                            />
                            <div 
                              className="flex-1 bg-green-400 rounded-t"
                              style={{ height: `${openedHeight}%`, minHeight: day.opened > 0 ? '4px' : '0' }}
                              title={`Opened: ${day.opened}`}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    <span className="text-xs text-muted-foreground">Sent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-400 rounded" />
                    <span className="text-xs text-muted-foreground">Opened</span>
                  </div>
                </div>
              </div>
              
              {/* Client Opens List */}
              {emailAnalytics.clientOpens && emailAnalytics.clientOpens.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <MailOpen className="h-4 w-4" />
                    Recent Client Email Opens
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {emailAnalytics.clientOpens.slice(0, 10).map((client: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 rounded-lg bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/admin/clients/${client.protocolId}/edit`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700">
                              {client.clientName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{client.clientName}</p>
                            <p className="text-xs text-muted-foreground">{client.clientEmail || 'No email'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(client.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(client.openedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {emailAnalytics.clientOpens.length > 10 && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      +{emailAnalytics.clientOpens.length - 10} more opens
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Email Click Analytics Widget */}
        {isWidgetVisible("emailClickRates") && clickAnalytics && clickAnalytics.totalClicks > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer className="h-5 w-5 text-purple-500" />
                Client Click-Through Rates (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Track which links your clients click in their protocol emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <MousePointer className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{clickAnalytics.totalClicks}</div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <Users className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-indigo-600">{clickAnalytics.uniqueClicks}</div>
                  <p className="text-sm text-muted-foreground">Unique Clickers</p>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-pink-600">{clickAnalytics.clickThroughRate}%</div>
                  <p className="text-sm text-muted-foreground">Click-Through Rate</p>
                </div>
              </div>
              
              {/* Top Clicked Links */}
              {clickAnalytics.clicksByLink && clickAnalytics.clicksByLink.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Most Clicked Links
                  </h4>
                  <div className="space-y-2">
                    {clickAnalytics.clicksByLink.slice(0, 5).map((link: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <span className="text-sm font-medium truncate max-w-[200px]">{link.name}</span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          {link.count} clicks
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Clicks */}
              {clickAnalytics.recentClicks && clickAnalytics.recentClicks.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Recent Client Link Clicks
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {clickAnalytics.recentClicks.slice(0, 8).map((click: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 rounded-lg bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/admin/clients/${click.protocolId}/edit`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-700">
                              {click.clientName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{click.clientName}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              Clicked: {click.linkName}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {click.clickedAt ? new Date(click.clickedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Follow-Up Emails Widget */}
        {isWidgetVisible("followUpEmails") && protocolsNeedingFollowUp && protocolsNeedingFollowUp.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Clients Awaiting Follow-Up
                  </CardTitle>
                  <CardDescription>
                    Clients who haven't approved their protocol after 3+ days
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendAllFollowUpsMutation.mutate({})}
                  disabled={sendAllFollowUpsMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Send All ({protocolsNeedingFollowUp.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {protocolsNeedingFollowUp.slice(0, 10).map((protocol: any) => (
                  <div
                    key={protocol.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-orange-700">
                          {protocol.clientName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{protocol.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent {protocol.sentAt ? new Date(protocol.sentAt).toLocaleDateString() : 'N/A'}
                          {protocol.followUpCount > 0 && ` • ${protocol.followUpCount} follow-up(s) sent`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendFollowUpMutation.mutate({ protocolId: protocol.id })}
                        disabled={sendFollowUpMutation.isPending}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLocation(`/admin/clients/${protocol.id}/edit`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unmapped Protocol Items Widget */}
        {isWidgetVisible("unmappedItems") && unmappedByFrequency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Top Unmapped Protocol Items
              </CardTitle>
              <CardDescription>
                These frequently used items need inventory mapping for auto-deduction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unmappedByFrequency.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors"
                    onClick={() => setLocation("/admin/inventory")}
                  >
                    <div className="flex items-center gap-3">
                      <Link2 className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.itemType}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      Used {item.usageCount}x
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setLocation("/admin/inventory")}
                  className="text-sm text-primary hover:underline"
                >
                  Go to Protocol Mapping →
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coaching Enrollment Pipeline Widget */}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                  <p className="text-xs text-muted-foreground">Intake Pending</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-green-600">{enrollmentStats.intakeCompleted}</div>
                  <p className="text-xs text-muted-foreground">Intake Done</p>
                </div>
              </div>

              {/* Status Funnel */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Enrollment Funnel</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Enrolled', count: enrollmentStats.statusEnrolled, color: 'bg-blue-500' },
                    { label: 'Videos Watched', count: enrollmentStats.statusVideoComplete, color: 'bg-indigo-500' },
                    { label: 'Coaching Paid', count: enrollmentStats.statusCoachingPaid, color: 'bg-amber-500' },
                    { label: 'Intake Complete', count: enrollmentStats.statusIntakeComplete, color: 'bg-teal-500' },
                    { label: 'Strategy Scheduled', count: enrollmentStats.statusDiscoveryScheduled, color: 'bg-purple-500' },
                    { label: 'Active', count: enrollmentStats.statusActive, color: 'bg-green-500' },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{step.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`${step.color} h-full rounded-full flex items-center justify-end pr-2 transition-all`}
                          style={{ width: `${Math.max(enrollmentStats.totalEnrollments > 0 ? (step.count / enrollmentStats.totalEnrollments) * 100 : 0, step.count > 0 ? 8 : 0)}%` }}
                        >
                          {step.count > 0 && <span className="text-xs text-white font-medium">{step.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Intake Forms - with bulk action */}
              {enrollmentStats.pendingIntake && enrollmentStats.pendingIntake.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Awaiting Intake Form ({enrollmentStats.intakePending})
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => sendBulkIntakeRemindersMutation.mutate()}
                      disabled={sendBulkIntakeRemindersMutation.isPending}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send All Reminders
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {enrollmentStats.pendingIntake.map((enrollment: any) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-red-700">
                              {enrollment.clientName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{enrollment.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.email}
                              {enrollment.intakeReminder24hSentAt && ' • 24h sent'}
                              {enrollment.intakeReminder72hSentAt && ' • 72h sent'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendIntakeReminderMutation.mutate({ enrollmentId: enrollment.id })}
                            disabled={sendIntakeReminderMutation.isPending}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Remind
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLocation('/admin/enrollments')}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 10-Day Overdue Deadline Alert Widget */}
        {isWidgetVisible("enrollmentPipeline") && enrollmentStats && enrollmentStats.overdueCount > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                10-Day Start Deadline Overdue ({enrollmentStats.overdueCount})
              </CardTitle>
              <CardDescription className="text-red-700">
                These clients enrolled 10+ days ago and have NOT started their program. This is causing 2-5 week delays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {enrollmentStats.overdueEnrollments.map((enrollment: any) => {
                  const enrolledDate = new Date(enrollment.enrolledAt);
                  const overdueDays = Math.ceil((Date.now() - enrolledDate.getTime() - 10 * 24 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
                      onClick={() => setLocation('/admin/enrollments')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-red-900">
                            {enrollment.clientName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-900">{enrollment.clientName}</p>
                          <p className="text-xs text-red-700">
                            {enrollment.tier?.replace(/_/g, ' ')} • Status: {enrollment.status?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-red-200 text-red-900 border-red-400 font-bold">
                        {overdueDays}d overdue
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => setLocation('/admin/enrollments')}
              >
                View All in Enrollments
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Referral Leaderboard - removed (referral system cleaned up) */}

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
    </AdminLayout>
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


// Today's Tasks Component
function TodaysTasks({ clients }: { clients: any[] | undefined }) {
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
          Today's Tasks
        </CardTitle>
        <CardDescription>
          {tasks.length} task{tasks.length > 1 ? 's' : ''} requiring attention
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
