import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mail, Eye, Code, RefreshCw, Send, Copy, Check, Edit, Save, RotateCcw, AlertCircle, History, BarChart3, MousePointer, TrendingUp, Clock, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Email template types with sample data
const EMAIL_TEMPLATES = [
  {
    id: "checkin_reminder",
    name: "Check-In Reminder",
    category: "checkin",
    description: "Sent to clients when their weekly check-in is due",
    defaultSubject: "Time for Your Weekly Check-In",
    sampleData: {
      clientName: "John Smith",
      checkInDueDate: "Monday, January 27th",
      checkInLink: "https://app.example.com/checkin/123",
      coachName: "Dr. Sarah Johnson",
    },
  },
  {
    id: "checkin_overdue",
    name: "Check-In Overdue Alert",
    category: "checkin",
    description: "Sent when a client misses their check-in deadline",
    defaultSubject: "Your Check-In is Overdue",
    sampleData: {
      clientName: "John Smith",
      daysMissed: 3,
      checkInLink: "https://app.example.com/checkin/123",
      coachName: "Dr. Sarah Johnson",
    },
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    category: "payment",
    description: "Sent when a payment is due or overdue",
    defaultSubject: "Payment Reminder - {{amountDue}} Due",
    sampleData: {
      clientName: "John Smith",
      amountDue: "$299.00",
      dueDate: "January 30, 2026",
      paymentLink: "https://app.example.com/pay/123",
    },
  },
  {
    id: "protocol_update",
    name: "Protocol Update Notification",
    category: "protocol",
    description: "Sent when a client's protocol is updated",
    defaultSubject: "Your Protocol Has Been Updated",
    sampleData: {
      clientName: "John Smith",
      changesCount: 5,
      protocolLink: "https://app.example.com/protocol/123",
      coachName: "Dr. Sarah Johnson",
    },
  },
  {
    id: "protocol_link",
    name: "Protocol Link Email",
    category: "protocol",
    description: "Sent when sharing protocol access link with client",
    defaultSubject: "Your Protocol is Ready to View",
    sampleData: {
      clientName: "John Smith",
      protocolLink: "https://app.example.com/protocol/123",
      coachName: "Dr. Sarah Johnson",
    },
  },
  {
    id: "welcome_email",
    name: "Welcome Email",
    category: "welcome",
    description: "Sent to new clients when their account is created",
    defaultSubject: "Welcome to Omega Longevity!",
    sampleData: {
      clientName: "John Smith",
      loginLink: "https://app.example.com/login",
      coachName: "Dr. Sarah Johnson",
    },
  },
  {
    id: "daily_digest",
    name: "Daily Digest",
    category: "digest",
    description: "Daily summary email sent to coaches",
    defaultSubject: "Your Daily Summary - {{date}}",
    sampleData: {
      coachName: "Dr. Sarah Johnson",
      pendingCheckins: 5,
      overduePayments: 2,
      newOrders: 3,
      date: "January 25, 2026",
    },
  },
  {
    id: "weekly_summary",
    name: "Weekly Summary",
    category: "digest",
    description: "Weekly summary email sent to coaches",
    defaultSubject: "Weekly Summary - {{weekRange}}",
    sampleData: {
      coachName: "Dr. Sarah Johnson",
      totalCheckins: 45,
      completionRate: "92%",
      newClients: 3,
      revenue: "$4,500",
      weekRange: "Jan 19 - Jan 25, 2026",
    },
  },
  {
    id: "shipping_notification",
    name: "Shipping Notification",
    category: "shipping",
    description: "Sent when an order ships",
    defaultSubject: "Your Order Has Shipped - {{orderNumber}}",
    sampleData: {
      clientName: "John Smith",
      orderNumber: "ORD-2026-0125",
      trackingNumber: "1Z999AA10123456784",
      carrier: "UPS",
      trackingLink: "https://ups.com/track/1Z999AA10123456784",
    },
  },
  {
    id: "document_request",
    name: "Document Request",
    category: "document",
    description: "Sent when coach requests documents from client",
    defaultSubject: "Document Request - {{documentType}}",
    sampleData: {
      clientName: "John Smith",
      documentType: "Quarterly Lab Results",
      uploadLink: "https://app.example.com/upload/123",
      dueDate: "February 1, 2026",
      coachName: "Dr. Sarah Johnson",
    },
  },
  {
    id: "transformation_verification",
    name: "Transformation Verification Email",
    category: "transformation",
    description: "Sent to guests after payment to verify email and set up account",
    defaultSubject: "Complete Your Account Setup - Omega Longevity",
    sampleData: {
      clientName: "John Smith",
      tierName: "Elite Longevity",
      verificationLink: "https://app.example.com/transformation/verify?token=abc123",
      expiresIn: "48 hours",
    },
  },
  {
    id: "transformation_followup",
    name: "Transformation Follow-Up Reminder",
    category: "transformation",
    description: "Sent 48-72 hours after payment if account setup is not complete",
    defaultSubject: "Complete Your Account Setup - Action Required",
    sampleData: {
      clientName: "John Smith",
      tierName: "90-Day Transformation",
      verificationLink: "https://app.example.com/transformation/verify?token=abc123",
      daysSincePayment: 2,
    },
  },
  {
    id: "transformation_stalled_admin",
    name: "Stalled Enrollment Admin Alert",
    category: "transformation",
    description: "Sent to admin when clients haven't completed setup after 5+ days",
    defaultSubject: "Action Required: Stalled Enrollments Need Follow-Up",
    sampleData: {
      stalledCount: 3,
      clientList: "John Smith (Elite), Jane Doe (Flagship), Bob Wilson (Essentials)",
    },
  },
];

export default function EmailTemplatePreview() {
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0]);
  const [viewMode, setViewMode] = useState<"preview" | "html" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [saveVersionDialogOpen, setSaveVersionDialogOpen] = useState(false);
  const [engagementPeriod, setEngagementPeriod] = useState<"day" | "week" | "month">("week");
  
  // Edit form state
  const [editSubject, setEditSubject] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  
  // Version form state
  const [versionName, setVersionName] = useState("");
  const [versionNotes, setVersionNotes] = useState("");

  const { data: previewHtml, isLoading, refetch } = trpc.emailTemplates.getPreview.useQuery({
    templateId: selectedTemplate.id,
    sampleData: selectedTemplate.sampleData,
  }, {
    enabled: !!selectedTemplate,
  });

  const { data: customization, refetch: refetchCustomization } = trpc.emailTemplates.getCustomization.useQuery({
    templateKey: selectedTemplate.id,
  }, {
    enabled: !!selectedTemplate,
  });

  const { data: versions, refetch: refetchVersions } = trpc.emailTemplates.listVersions.useQuery({
    templateKey: selectedTemplate.id,
  }, {
    enabled: !!selectedTemplate,
  });

  const { data: engagementStats } = trpc.emailEngagement.getStats.useQuery({
    period: engagementPeriod,
  });

  const { data: topLinks } = trpc.emailEngagement.getTopLinks.useQuery({
    period: engagementPeriod,
    limit: 5,
  });

  const sendTestMutation = trpc.emailTemplates.sendTest.useMutation({
    onSuccess: () => {
      toast.success("Test email sent to your email address");
    },
    onError: (error: any) => {
      toast.error(`Failed to send test email: ${error.message}`);
    },
  });

  const saveCustomizationMutation = trpc.emailTemplates.saveCustomization.useMutation({
    onSuccess: () => {
      toast.success("Template customization saved");
      setEditDialogOpen(false);
      refetchCustomization();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const resetToDefaultMutation = trpc.emailTemplates.resetToDefault.useMutation({
    onSuccess: () => {
      toast.success("Template reset to default");
      setResetDialogOpen(false);
      refetchCustomization();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });

  const saveVersionMutation = trpc.emailTemplates.saveVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`Version ${data.version} saved successfully`);
      setSaveVersionDialogOpen(false);
      setVersionName("");
      setVersionNotes("");
      refetchVersions();
    },
    onError: (error: any) => {
      toast.error(`Failed to save version: ${error.message}`);
    },
  });

  const restoreVersionMutation = trpc.emailTemplates.restoreVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`Restored to version ${data.restoredVersion}`);
      setVersionDialogOpen(false);
      refetchCustomization();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to restore: ${error.message}`);
    },
  });

  const deleteVersionMutation = trpc.emailTemplates.deleteVersion.useMutation({
    onSuccess: () => {
      toast.success("Version deleted");
      refetchVersions();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Initialize edit form when opening dialog
  useEffect(() => {
    if (editDialogOpen) {
      setEditSubject(customization?.subject || selectedTemplate.defaultSubject || "");
      setEditBodyHtml(customization?.bodyHtml || previewHtml || "");
    }
  }, [editDialogOpen, customization, selectedTemplate, previewHtml]);

  const handleCopyHtml = () => {
    if (previewHtml) {
      navigator.clipboard.writeText(previewHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("HTML copied to clipboard");
    }
  };

  const handleSendTest = () => {
    sendTestMutation.mutate({
      templateId: selectedTemplate.id,
      sampleData: selectedTemplate.sampleData,
    });
  };

  const handleSaveCustomization = () => {
    saveCustomizationMutation.mutate({
      templateKey: selectedTemplate.id,
      subject: editSubject,
      bodyHtml: editBodyHtml,
    });
  };

  const handleResetToDefault = () => {
    resetToDefaultMutation.mutate({
      templateKey: selectedTemplate.id,
    });
  };

  const handleSaveVersion = () => {
    saveVersionMutation.mutate({
      templateKey: selectedTemplate.id,
      versionName: versionName || undefined,
      versionNotes: versionNotes || undefined,
    });
  };

  const handleRestoreVersion = (version: number) => {
    restoreVersionMutation.mutate({
      templateKey: selectedTemplate.id,
      version,
    });
  };

  const handleDeleteVersion = (version: number) => {
    if (confirm("Are you sure you want to delete this version?")) {
      deleteVersionMutation.mutate({
        templateKey: selectedTemplate.id,
        version,
      });
    }
  };

  const categoryColors: Record<string, string> = {
    checkin: "bg-blue-100 text-blue-800",
    payment: "bg-green-100 text-green-800",
    protocol: "bg-purple-100 text-purple-800",
    shipping: "bg-orange-100 text-orange-800",
    digest: "bg-cyan-100 text-cyan-800",
    welcome: "bg-pink-100 text-pink-800",
    document: "bg-yellow-100 text-yellow-800",
  };

  const availableVariables = Object.keys(selectedTemplate.sampleData);

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => goBackTo("/admin/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-orange-500" />
              Email Template Editor
            </h1>
            <p className="text-muted-foreground">Preview, edit, and test automated email templates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyHtml}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copied!" : "Copy HTML"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setVersionDialogOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            Versions
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Template
          </Button>
          <Button size="sm" onClick={handleSendTest} disabled={sendTestMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Send Test Email
          </Button>
        </div>
      </div>

      {/* Engagement Stats Banner */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              Email Engagement Overview
            </CardTitle>
            <Select value={engagementPeriod} onValueChange={(v) => setEngagementPeriod(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24h</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-gray-600">{engagementStats?.totalSent || 0}</div>
              <div className="text-xs text-muted-foreground">Emails Sent</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{engagementStats?.uniqueOpens || 0}</div>
              <div className="text-xs text-muted-foreground">Unique Opens</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{engagementStats?.openRate || 0}%</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Eye className="h-3 w-3" /> Open Rate
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">{engagementStats?.totalClicks || 0}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MousePointer className="h-3 w-3" /> Total Clicks
              </div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{engagementStats?.clickToOpenRate || 0}%</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" /> Click-to-Open
              </div>
            </div>
          </div>
          
          {topLinks && topLinks.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium mb-2">Top Clicked Links</div>
              <div className="space-y-1">
                {topLinks.map((link, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[300px]">
                      {link.linkName || link.linkUrl}
                    </span>
                    <Badge variant="secondary">{link.clickCount} clicks</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Templates</CardTitle>
              <CardDescription>Select a template to preview or edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {EMAIL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate.id === template.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    <Badge className={`text-xs ${categoryColors[template.category]}`}>
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Customization Status */}
          {customization && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit className="h-4 w-4 text-orange-500" />
                  Customized Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Last updated: {toLocaleDateStringMT(customization.updatedAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSaveVersionDialogOpen(true)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Save Version
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Variables</CardTitle>
              <CardDescription>Use these in your template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {availableVariables.map((variable) => (
                  <Badge 
                    key={variable} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${variable}}}`);
                      toast.success(`Copied {{${variable}}} to clipboard`);
                    }}
                  >
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click to copy variable syntax
              </p>
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sample Data</CardTitle>
              <CardDescription>Data used for preview</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(selectedTemplate.sampleData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedTemplate.name}
                    {customization && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Customized
                      </Badge>
                    )}
                    {versions && versions.length > 0 && (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {versions.length} version{versions.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                </div>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "preview" | "html")}>
                  <TabsList>
                    <TabsTrigger value="preview" className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="html" className="flex items-center gap-1">
                      <Code className="h-4 w-4" />
                      HTML
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : viewMode === "preview" ? (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">Email Preview</span>
                  </div>
                  <iframe
                    srcDoc={previewHtml || "<p>No preview available</p>"}
                    className="w-full h-[600px] border-0"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <pre className="text-xs bg-gray-100 text-gray-600 p-4 rounded-lg overflow-auto h-[600px]">
                  {previewHtml || "No HTML available"}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-orange-500" />
              Edit {selectedTemplate.name}
            </DialogTitle>
            <DialogDescription>
              Customize the subject line and HTML content of this email template.
              Use variables like {`{{clientName}}`} to insert dynamic content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
              <p className="text-xs text-muted-foreground">
                You can use variables like {`{{clientName}}`}, {`{{coachName}}`}, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyHtml">HTML Content</Label>
              <Textarea
                id="bodyHtml"
                value={editBodyHtml}
                onChange={(e) => setEditBodyHtml(e.target.value)}
                placeholder="Enter HTML content..."
                className="font-mono text-sm min-h-[400px]"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Available Variables</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {availableVariables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCustomization}
              disabled={saveCustomizationMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveCustomizationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default?</DialogTitle>
            <DialogDescription>
              This will remove all customizations and restore the original template.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleResetToDefault}
              disabled={resetToDefaultMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {resetToDefaultMutation.isPending ? "Resetting..." : "Reset to Default"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Version Dialog */}
      <Dialog open={saveVersionDialogOpen} onOpenChange={setSaveVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Save Template Version
            </DialogTitle>
            <DialogDescription>
              Save the current template as a version for future reference or rollback.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="versionName">Version Name (optional)</Label>
              <Input
                id="versionName"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g., Holiday theme, Q1 update..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="versionNotes">Notes (optional)</Label>
              <Textarea
                id="versionNotes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveVersionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveVersion}
              disabled={saveVersionMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveVersionMutation.isPending ? "Saving..." : "Save Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Version History - {selectedTemplate.name}
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of this template.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {versions && versions.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {versions.map((version) => (
                  <div 
                    key={version.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <span className="font-medium text-sm">{version.versionName}</span>
                      </div>
                      {version.versionNotes && (
                        <p className="text-xs text-muted-foreground mt-1">{version.versionNotes}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {toLocaleDateStringMT(version.createdAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(version.version)}
                        disabled={restoreVersionMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVersion(version.version)}
                        disabled={deleteVersionMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No versions saved yet</p>
                <p className="text-sm">Save a version to create a restore point</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}