import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { FileSignature, Search, Eye, Download, Calendar, Mail, Phone, Shield, AlertTriangle, Clock, CheckCircle, RefreshCw, History, Trash2, CalendarPlus, Loader2, UserCheck, UserX, Plus } from "lucide-react";
import { format, differenceInDays, addDays, isBefore, isAfter, addMonths } from "date-fns";
import { useState } from "react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { toast } from "sonner";
import { parsePhoneNumber } from "@/components/ui/phone-input";
import {
  WaiverDetailsDialog,
  ExpirationBadge,
  getExpirationStatus,
  EmailPreviewDialog,
  AnnouncementHistoryDialog,
  HistoryItemDetailDialog,
  TemplateManagerDialog,
  categoryLabels,
} from "./store-waivers";

type ExpirationFilter = "all" | "active" | "expiring_soon" | "expired" | "no_expiration";

export default function StoreWaivers() {
  const { data: waivers, isLoading, refetch } = trpc.waiver.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>("all");
  const [selectedWaiver, setSelectedWaiver] = useState<any>(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState<{ open: boolean; action: "extend" | "revoke" | "announce" | null }>({ open: false, action: null });
  const [extensionMonths, setExtensionMonths] = useState("6");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState<string>("general");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("all");
  
  // Recipient filter state
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<string>("all");
  const [signedFromDate, setSignedFromDate] = useState<string>("");
  const [signedToDate, setSignedToDate] = useState<string>("");
  
  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  
  // Recurrence state
  const [recurrencePattern, setRecurrencePattern] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  
  // Template and history queries
  const { data: templates, refetch: refetchTemplates } = trpc.waiver.getTemplates.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.waiver.getHistory.useQuery();
  
  // Waiver bypass state and queries
  const [showBypassDialog, setShowBypassDialog] = useState(false);
  const [bypassEmail, setBypassEmail] = useState("");
  const [bypassReason, setBypassReason] = useState("Signed waiver externally");
  const { data: bypassedUsers, refetch: refetchBypasses } = trpc.waiver.listBypasses.useQuery();
  
  const grantBypassMutation = trpc.waiver.grantBypass.useMutation({
    onSuccess: () => {
      toast.success("Waiver bypass granted successfully");
      setShowBypassDialog(false);
      setBypassEmail("");
      setBypassReason("Signed waiver externally");
      refetchBypasses();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to grant bypass");
    },
  });
  
  const revokeBypassMutation = trpc.waiver.revokeBypass.useMutation({
    onSuccess: () => {
      toast.success("Waiver bypass revoked");
      refetchBypasses();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke bypass");
    },
  });

  // Bulk mutations
  const bulkExtendMutation = trpc.waiver.bulkExtend.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success(`Extended ${data.updated} waiver(s) by ${extensionMonths} months`);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to extend waivers");
    },
  });

  const bulkRevokeMutation = trpc.waiver.bulkRevoke.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success(`Revoked ${data.deleted} waiver(s)`);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to revoke waivers");
    },
  });

  const sendAnnouncementMutation = trpc.waiver.sendAnnouncement.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      setAnnouncementSubject("");
      setAnnouncementMessage("");
      setSelectedTemplateId("");
      setIsScheduled(false);
      setScheduledDate("");
      setScheduledTime("");
      setRecipientStatusFilter("all");
      setSignedFromDate("");
      setSignedToDate("");
      refetchHistory();
      if (data.scheduled && data.scheduled > 0) {
        toast.success(`Announcement scheduled for ${data.scheduled} recipient(s)`);
      } else {
        toast.success(`Announcement sent to ${data.sent} recipient(s)`);
      }
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to send announcement");
    },
  });

  const createTemplateMutation = trpc.waiver.createTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates();
      setNewTemplateName("");
      toast.success("Template saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save template");
    },
  });

  const updateTemplateMutation = trpc.waiver.updateTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates();
      setEditingTemplate(null);
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteTemplateMutation = trpc.waiver.deleteTemplate.useMutation({
    onSuccess: () => {
      refetchTemplates();
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId && templates) {
      const template = templates.find(t => t.id.toString() === templateId);
      if (template) {
        setAnnouncementSubject(template.subject);
        setAnnouncementMessage(template.message);
      }
    }
  };

  // Save current announcement as template
  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!announcementSubject.trim() || !announcementMessage.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    createTemplateMutation.mutate({
      name: newTemplateName.trim(),
      category: newTemplateCategory as "product_updates" | "promotions" | "reminders" | "general",
      subject: announcementSubject,
      message: announcementMessage,
    });
  };

  // Category display names
  const categoryLabels: Record<string, string> = {
    product_updates: "Product Updates",
    promotions: "Promotions",
    reminders: "Reminders",
    general: "General",
  };

  // Filter templates by category
  const filteredTemplates = templates?.filter(t => 
    templateCategoryFilter === "all" || t.category === templateCategoryFilter
  );

  // Group templates by category for dropdown
  const groupedTemplates = templates?.reduce((acc, t) => {
    const cat = t.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, typeof templates>);

  const filteredWaivers = waivers?.filter(waiver => {
    // Search filter
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      waiver.firstName.toLowerCase().includes(search) ||
      waiver.lastName.toLowerCase().includes(search) ||
      waiver.email.toLowerCase().includes(search) ||
      waiver.phone.includes(search);
    
    if (!matchesSearch) return false;
    
    // Expiration filter
    if (expirationFilter === "all") return true;
    
    const { status } = getExpirationStatus(waiver.expiresAt);
    return status === expirationFilter;
  });

  // Calculate stats
  const stats = {
    total: waivers?.length || 0,
    active: waivers?.filter(w => getExpirationStatus(w.expiresAt).status === "active").length || 0,
    expiringSoon: waivers?.filter(w => getExpirationStatus(w.expiresAt).status === "expiring_soon").length || 0,
    expired: waivers?.filter(w => getExpirationStatus(w.expiresAt).status === "expired").length || 0,
    noExpiration: waivers?.filter(w => getExpirationStatus(w.expiresAt).status === "no_expiration").length || 0,
  };

  const exportToCSV = () => {
    if (!waivers || waivers.length === 0) return;
    
    const headers = ["First Name", "Last Name", "Email", "Phone", "Parent/Guardian", "Signed At", "Expires At", "Status", "IP Address"];
    const rows = waivers.map(w => {
      const { status, daysLeft } = getExpirationStatus(w.expiresAt);
      let statusText = "No Expiration";
      if (status === "active") statusText = `Active (${daysLeft} days left)`;
      else if (status === "expiring_soon") statusText = `Expiring Soon (${daysLeft} days)`;
      else if (status === "expired") statusText = `Expired (${Math.abs(daysLeft!)} days ago)`;
      
      return [
        w.firstName,
        w.lastName,
        w.email,
        w.phone,
        w.parentGuardianName || "",
        format(new Date(w.agreedAt), "yyyy-MM-dd HH:mm:ss"),
        w.expiresAt ? format(new Date(w.expiresAt), "yyyy-MM-dd") : "N/A",
        statusText,
        w.ipAddress || ""
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `store-waivers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (!filteredWaivers) return;
    if (selectedIds.length === filteredWaivers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWaivers.map(w => w.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Get filtered recipient IDs based on current filters
  const getFilteredRecipientIds = () => {
    let filtered = waivers?.filter(w => selectedIds.includes(w.id)) || [];
    if (recipientStatusFilter !== "all") {
      filtered = filtered.filter(w => getExpirationStatus(w.expiresAt).status === recipientStatusFilter);
    }
    if (signedFromDate) {
      filtered = filtered.filter(w => new Date(w.agreedAt) >= new Date(signedFromDate));
    }
    if (signedToDate) {
      filtered = filtered.filter(w => new Date(w.agreedAt) <= new Date(signedToDate));
    }
    return filtered.map(w => w.id);
  };

  const handleBulkAction = () => {
    setBulkActionLoading(true);
    if (bulkActionDialog.action === "extend") {
      bulkExtendMutation.mutate({ waiverIds: selectedIds, months: parseInt(extensionMonths) });
    } else if (bulkActionDialog.action === "revoke") {
      bulkRevokeMutation.mutate({ waiverIds: selectedIds });
    } else if (bulkActionDialog.action === "announce") {
      // Apply recipient filters for announcements
      const filteredIds = getFilteredRecipientIds();
      if (filteredIds.length === 0) {
        setBulkActionLoading(false);
        toast.error("No recipients match the current filters");
        return;
      }
      // Validate scheduling if enabled
      if (isScheduled && (!scheduledDate || !scheduledTime)) {
        setBulkActionLoading(false);
        toast.error("Please select both date and time for scheduling");
        return;
      }
      const scheduledFor = isScheduled ? new Date(`${scheduledDate}T${scheduledTime}`) : undefined;
      sendAnnouncementMutation.mutate({ 
        waiverIds: filteredIds, 
        subject: announcementSubject,
        message: announcementMessage,
        scheduledFor: scheduledFor?.toISOString(),
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <FileSignature className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Store Waivers</h1>
              <p className="text-muted-foreground">Manage signed waivers and consent forms</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" />
              Announcement History
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signed</CardTitle>
              <FileSignature className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-green-50/50 transition-colors" onClick={() => setExpirationFilter("active")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-amber-50/50 transition-colors" onClick={() => setExpirationFilter("expiring_soon")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-red-50/50 transition-colors" onClick={() => setExpirationFilter("expired")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpirationFilter("no_expiration")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Expiration</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.noExpiration}</div>
            </CardContent>
          </Card>
        </div>

        {/* Waiver Bypass Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-500" />
                  Waiver Bypasses (External Clients)
                </CardTitle>
                <CardDescription>
                  Users who have signed the waiver externally and can access the store without signing again
                </CardDescription>
              </div>
              <Button onClick={() => setShowBypassDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Grant Bypass
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bypassedUsers && bypassedUsers.length > 0 ? (
              <div className="space-y-3">
                {bypassedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50">
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bypassed on {user.waiverBypassedAt ? format(new Date(user.waiverBypassedAt), "MMM d, yyyy") : "Unknown"}
                        {user.waiverBypassReason && ` • ${user.waiverBypassReason}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Revoke waiver bypass for ${user.email}? They will need to sign the waiver to access the store.`)) {
                          revokeBypassMutation.mutate({ userId: user.id });
                        }
                      }}
                      disabled={revokeBypassMutation.isPending}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No waiver bypasses granted</p>
                <p className="text-sm mt-1">Grant bypasses for clients who have already signed externally</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Signed Waivers</CardTitle>
                <CardDescription>
                  All clients who have signed the store waiver and consent form
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={expirationFilter} onValueChange={(v) => setExpirationFilter(v as ExpirationFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Waivers</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="no_expiration">No Expiration</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-gray-100 rounded-lg border">
                <span className="text-sm font-medium">{selectedIds.length} selected</span>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkActionDialog({ open: true, action: "extend" })}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Extend Expiration
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  onClick={() => setBulkActionDialog({ open: true, action: "announce" })}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Announcement
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setBulkActionDialog({ open: true, action: "revoke" })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke Waivers
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            )}

            {isLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : filteredWaivers && filteredWaivers.length > 0 ? (
              <div className="space-y-3">
                {/* Select All */}
                <div className="flex items-center gap-3 pb-2 border-b">
                  <Checkbox
                    checked={filteredWaivers.length > 0 && selectedIds.length === filteredWaivers.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length === filteredWaivers.length ? "Deselect all" : "Select all"}
                  </span>
                </div>

                {filteredWaivers.map((waiver) => (
                  <div
                    key={waiver.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-100 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.includes(waiver.id)}
                      onCheckedChange={() => toggleSelect(waiver.id)}
                    />
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <FileSignature className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {waiver.firstName} {waiver.lastName}
                        </p>
                        {waiver.parentGuardianName && (
                          <Badge variant="outline" className="text-xs">
                            Minor
                          </Badge>
                        )}
                        <ExpirationBadge expiresAt={waiver.expiresAt} />
                        {waiver.renewalCount > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            {waiver.renewalCount} renewal{waiver.renewalCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {waiver.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {waiver.phone}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Signed: {format(new Date(waiver.agreedAt), "MMM d, yyyy 'at' h:mm a")}
                        {waiver.expiresAt && (
                          <span className="ml-2">
                            • Expires: {format(new Date(waiver.expiresAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWaiver(waiver)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Waivers Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || expirationFilter !== "all"
                    ? "No waivers match your search/filter criteria"
                    : "No one has signed the store waiver yet"}
                </p>
                {expirationFilter !== "all" && (
                  <Button variant="link" onClick={() => setExpirationFilter("all")} className="mt-2">
                    Clear filter
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Waiver Details Dialog */}
      <Dialog open={!!selectedWaiver} onOpenChange={() => setSelectedWaiver(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Waiver Details
            </DialogTitle>
          </DialogHeader>
          {selectedWaiver && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <p className="font-medium">{selectedWaiver.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p className="font-medium">{selectedWaiver.lastName}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{selectedWaiver.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="font-medium">{selectedWaiver.phone ? (() => { const parsed = parsePhoneNumber(selectedWaiver.phone); return `+${parsed.countryCode} ${parsed.phoneNumber}`; })() : "-"}</p>
              </div>
              {selectedWaiver.parentGuardianName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Parent/Guardian</label>
                  <p className="font-medium">{selectedWaiver.parentGuardianName}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Signed At</label>
                  <p className="font-medium">
                    {format(new Date(selectedWaiver.agreedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expires At</label>
                  <p className="font-medium">
                    {selectedWaiver.expiresAt 
                      ? format(new Date(selectedWaiver.expiresAt), "MMM d, yyyy")
                      : "No Expiration"
                    }
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <ExpirationBadge expiresAt={selectedWaiver.expiresAt} />
                </div>
              </div>
              {selectedWaiver.ipAddress && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="font-medium font-mono text-sm">{selectedWaiver.ipAddress}</p>
                </div>
              )}
              {selectedWaiver.signatureData && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Signature</label>
                  <div className="mt-2 border rounded-lg p-4 bg-white">
                    <img
                      src={selectedWaiver.signatureData}
                      alt="Signature"
                      className="max-h-24 mx-auto"
                    />
                  </div>
                </div>
              )}
              {selectedWaiver.renewalCount > 0 && (
                <RenewalHistorySection waiverId={selectedWaiver.id} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog.open} onOpenChange={(open) => {
        setBulkActionDialog({ open, action: bulkActionDialog.action });
        if (!open) {
          setAnnouncementSubject("");
          setAnnouncementMessage("");
        }
      }}>
        <DialogContent className={bulkActionDialog.action === "announce" ? "sm:max-w-[600px]" : ""}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkActionDialog.action === "extend" ? (
                <><CalendarPlus className="h-5 w-5" /> Extend Waiver Expiration</>
              ) : bulkActionDialog.action === "announce" ? (
                <><Mail className="h-5 w-5 text-purple-500" /> Send Announcement</>
              ) : (
                <><Trash2 className="h-5 w-5 text-red-500" /> Revoke Waivers</>
              )}
            </DialogTitle>
            <DialogDescription>
              {bulkActionDialog.action === "extend"
                ? `Extend the expiration date for ${selectedIds.length} selected waiver(s).`
                : bulkActionDialog.action === "announce"
                ? `Send a custom announcement email to ${selectedIds.length} selected waiver holder(s).`
                : `This will permanently delete ${selectedIds.length} selected waiver(s). This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {bulkActionDialog.action === "extend" && (
            <div className="py-4">
              <label className="text-sm font-medium">Extension Period</label>
              <Select value={extensionMonths} onValueChange={setExtensionMonths}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months (1 year)</SelectItem>
                  <SelectItem value="24">24 months (2 years)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                The expiration date will be extended by {extensionMonths} months from the current expiration date (or from today if already expired).
              </p>
            </div>
          )}
          {bulkActionDialog.action === "announce" && (
            <div className="space-y-4 py-4">
              {/* Template Selector - Grouped by Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Load from Template</label>
                <div className="flex gap-2">
                  <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedTemplates && Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {categoryLabels[category] || category}
                          </div>
                          {categoryTemplates?.map(template => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                      {(!templates || templates.length === 0) && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">No templates saved yet</div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setShowTemplateManager(true)}>
                    Manage
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Subject *</label>
                <Input
                  placeholder="e.g., Important Update from Omega Longevity"
                  value={announcementSubject}
                  onChange={(e) => setAnnouncementSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message *</label>
                <textarea
                  className="w-full min-h-[150px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Write your announcement message here...\n\nThis will be sent to all selected waiver holders."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                />
              </div>
              
              {/* Save as Template with Category */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                <label className="text-xs font-medium text-muted-foreground">Save as new template</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Template name..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="flex-1 h-9"
                  />
                  <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product_updates">Product Updates</SelectItem>
                      <SelectItem value="promotions">Promotions</SelectItem>
                      <SelectItem value="reminders">Reminders</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSaveAsTemplate}
                    disabled={!newTemplateName.trim() || !announcementSubject.trim() || !announcementMessage.trim() || createTemplateMutation.isPending}
                    className="h-9"
                  >
                    {createTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowPreview(true)}
                  disabled={!announcementSubject.trim() || !announcementMessage.trim()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Email
                </Button>
              </div>
              
              {/* Recipient Filtering */}
              <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Filter Recipients</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Waiver Status</label>
                    <Select value={recipientStatusFilter} onValueChange={setRecipientStatusFilter}>
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired Only</SelectItem>
                        <SelectItem value="no_expiration">No Expiration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Signed After</label>
                    <Input
                      type="date"
                      value={signedFromDate}
                      onChange={(e) => setSignedFromDate(e.target.value)}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Signed Before</label>
                    <Input
                      type="date"
                      value={signedToDate}
                      onChange={(e) => setSignedToDate(e.target.value)}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 w-full"
                      onClick={() => {
                        setRecipientStatusFilter("all");
                        setSignedFromDate("");
                        setSignedToDate("");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  {(() => {
                    let filtered = waivers?.filter(w => selectedIds.includes(w.id)) || [];
                    if (recipientStatusFilter !== "all") {
                      filtered = filtered.filter(w => getExpirationStatus(w.expiresAt).status === recipientStatusFilter);
                    }
                    if (signedFromDate) {
                      filtered = filtered.filter(w => new Date(w.agreedAt) >= new Date(signedFromDate));
                    }
                    if (signedToDate) {
                      filtered = filtered.filter(w => new Date(w.agreedAt) <= new Date(signedToDate));
                    }
                    return `${filtered.length} of ${selectedIds.length} selected recipients match filters`;
                  })()}
                </p>
              </div>
              
              {/* Scheduling Section */}
              <div className="space-y-3 p-3 bg-amber-50/50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule-announcement"
                    checked={isScheduled}
                    onCheckedChange={(checked) => setIsScheduled(checked === true)}
                  />
                  <label htmlFor="schedule-announcement" className="text-sm font-medium text-amber-800 cursor-pointer">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Schedule for later
                  </label>
                </div>
                {isScheduled && (
                  <>
                    <div className="grid grid-cols-2 gap-3 pl-6">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Date</label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Time</label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="h-9 bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-muted-foreground">Recurrence (Optional)</label>
                    <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Recurrence</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {recurrencePattern !== 'none' && (
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-muted-foreground">Recurrence End Date (Optional)</label>
                      <Input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={scheduledDate}
                        className="h-9 bg-white"
                      />
                    </div>
                  )}
                </>
                )}
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-700">
                  {isScheduled ? (
                    <>
                      📅 This email will be <strong>scheduled</strong> to send to <strong>
                        {(() => {
                          let filtered = waivers?.filter(w => selectedIds.includes(w.id)) || [];
                          if (recipientStatusFilter !== "all") {
                            filtered = filtered.filter(w => getExpirationStatus(w.expiresAt).status === recipientStatusFilter);
                          }
                          if (signedFromDate) {
                            filtered = filtered.filter(w => new Date(w.agreedAt) >= new Date(signedFromDate));
                          }
                          if (signedToDate) {
                            filtered = filtered.filter(w => new Date(w.agreedAt) <= new Date(signedToDate));
                          }
                          return filtered.length;
                        })()}
                      </strong> recipient(s)
                      {scheduledDate && scheduledTime && (
                        <> on <strong>{format(new Date(`${scheduledDate}T${scheduledTime}`), 'MMM d, yyyy')} at {format(new Date(`${scheduledDate}T${scheduledTime}`), 'h:mm a')}</strong></>
                      )}.
                    </>
                  ) : (
                    <>
                      📧 This email will be sent <strong>immediately</strong> to <strong>
                        {(() => {
                          let filtered = waivers?.filter(w => selectedIds.includes(w.id)) || [];
                          if (recipientStatusFilter !== "all") {
                            filtered = filtered.filter(w => getExpirationStatus(w.expiresAt).status === recipientStatusFilter);
                          }
                          if (signedFromDate) {
                            filtered = filtered.filter(w => new Date(w.agreedAt) >= new Date(signedFromDate));
                          }
                          if (signedToDate) {
                            filtered = filtered.filter(w => new Date(w.agreedAt) <= new Date(signedToDate));
                          }
                          return filtered.length;
                        })()}
                      </strong> recipient(s). Each recipient will receive a personalized email with their name.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
          {bulkActionDialog.action === "revoke" && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> Revoking waivers will require affected clients to sign a new waiver before accessing the store.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkActionDialog({ open: false, action: null });
              setAnnouncementSubject("");
              setAnnouncementMessage("");
            }}>
              Cancel
            </Button>
            <Button
              variant={bulkActionDialog.action === "revoke" ? "destructive" : "default"}
              className={bulkActionDialog.action === "announce" ? "bg-purple-600 hover:bg-purple-700" : ""}
              onClick={handleBulkAction}
              disabled={bulkActionLoading || (bulkActionDialog.action === "announce" && (!announcementSubject.trim() || !announcementMessage.trim()))}
            >
              {bulkActionLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : bulkActionDialog.action === "extend" ? (
                "Extend Waivers"
              ) : bulkActionDialog.action === "announce" ? (
                "Send Announcement"
              ) : (
                "Revoke Waivers"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              This is how the email will appear to recipients. The recipient name will be personalized for each person.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            {/* Email Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-center">
              <h2 className="text-2xl font-bold text-white">Omega Longevity</h2>
              <p className="text-amber-100 text-sm mt-1">Elite Level Health Optimization</p>
            </div>
            {/* Email Body */}
            <div className="p-6 bg-white">
              <div className="mb-4">
                <span className="text-sm text-muted-foreground">Subject:</span>
                <p className="font-semibold text-lg">{announcementSubject || "(No subject)"}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-muted-foreground mb-4">Dear <span className="font-semibold text-foreground">[Recipient Name]</span>,</p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {announcementMessage || "(No message)"}
                </div>
              </div>
            </div>
            {/* Email Footer */}
            <div className="bg-gray-100 p-4 text-center text-xs text-muted-foreground border-t">
              <p>© {new Date().getFullYear()} Omega Longevity. All rights reserved.</p>
              <p className="mt-1">This email was sent to you because you signed our store waiver.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Announcement History
            </DialogTitle>
            <DialogDescription>
              View all previously sent announcements and their recipient counts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {history && history.length > 0 ? (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 border rounded-lg hover:bg-gray-100 cursor-pointer transition-colors ${item.status === 'scheduled' ? 'border-amber-300 bg-amber-50/30' : ''}`}
                  onClick={() => setSelectedHistoryItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.subject}</p>
                        {item.status === 'scheduled' && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                        {item.status === 'sent' && (
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        )}
                        {item.status === 'cancelled' && (
                          <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                            Cancelled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.message}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant="secondary">{item.recipientCount} recipients</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.status === 'scheduled' && item.scheduledFor ? (
                          <>Scheduled for {format(new Date(item.scheduledFor), "MMM d, yyyy 'at' h:mm a")}</>
                        ) : (
                          <>{format(new Date(item.sentAt), "MMM d, yyyy 'at' h:mm a")}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No announcements sent yet</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Item Detail Dialog */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Announcement Details</DialogTitle>
          </DialogHeader>
          {selectedHistoryItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Subject</label>
                <p className="font-medium">{selectedHistoryItem.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <div className="mt-1 p-3 bg-gray-100 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedHistoryItem.message}
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recipients</label>
                  <p className="font-medium">{selectedHistoryItem.recipientCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sent At</label>
                  <p className="font-medium">
                    {format(new Date(selectedHistoryItem.sentAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              {selectedHistoryItem.status === 'sent' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-muted-foreground block mb-3">Analytics</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Opens</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedHistoryItem.opens || 0}</p>
                      {selectedHistoryItem.recipientCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(((selectedHistoryItem.opens || 0) / selectedHistoryItem.recipientCount) * 100)}% open rate
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Clicks</p>
                      <p className="text-2xl font-bold text-green-600">{selectedHistoryItem.clicks || 0}</p>
                      {(selectedHistoryItem.opens || 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(((selectedHistoryItem.clicks || 0) / (selectedHistoryItem.opens || 1)) * 100)}% click rate
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Engagement</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedHistoryItem.recipientCount > 0 
                          ? Math.round(((selectedHistoryItem.opens || 0) / selectedHistoryItem.recipientCount) * 100) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedHistoryItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiver Bypass Dialog */}
      <Dialog open={showBypassDialog} onOpenChange={setShowBypassDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              Grant Waiver Bypass
            </DialogTitle>
            <DialogDescription>
              Grant store access to a user who has already signed the waiver in another system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User Email *</label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={bypassEmail}
                onChange={(e) => setBypassEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The user must have an account in the system. Enter their email address.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Input
                placeholder="e.g., Signed waiver externally"
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> This will allow the user to access the store without signing the waiver in this app.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBypassDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => grantBypassMutation.mutate({ userEmail: bypassEmail, reason: bypassReason })}
              disabled={!bypassEmail.trim() || grantBypassMutation.isPending}
            >
              {grantBypassMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Granting...</>
              ) : (
                "Grant Bypass"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Manager Dialog */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Manage Templates
            </DialogTitle>
            <DialogDescription>
              View, edit, or delete your saved announcement templates.
            </DialogDescription>
          </DialogHeader>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <div className="flex gap-1 flex-wrap">
              {["all", "product_updates", "promotions", "reminders", "general"].map(cat => (
                <Button
                  key={cat}
                  variant={templateCategoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTemplateCategoryFilter(cat)}
                >
                  {cat === "all" ? "All" : categoryLabels[cat]}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredTemplates && filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <div key={template.id} className="p-4 border rounded-lg">
                  {editingTemplate?.id === template.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        placeholder="Template name"
                      />
                      <Select 
                        value={editingTemplate.category || "general"} 
                        onValueChange={(val) => setEditingTemplate({ ...editingTemplate, category: val })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product_updates">Product Updates</SelectItem>
                          <SelectItem value="promotions">Promotions</SelectItem>
                          <SelectItem value="reminders">Reminders</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={editingTemplate.subject}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                        placeholder="Subject"
                      />
                      <textarea
                        className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                        value={editingTemplate.message}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                        placeholder="Message"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => updateTemplateMutation.mutate(editingTemplate)}
                          disabled={updateTemplateMutation.isPending}
                        >
                          {updateTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{template.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[template.category || "general"]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {template.message}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingTemplate({ ...template })}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Delete this template?")) {
                              deleteTemplateMutation.mutate({ id: template.id });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{templateCategoryFilter === "all" ? "No templates saved yet" : `No ${categoryLabels[templateCategoryFilter]} templates`}</p>
                <p className="text-sm mt-1">Save a template from the announcement dialog</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateManager(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function RenewalHistorySection({ waiverId }: { waiverId: number }) {
  const { data: history, isLoading } = trpc.waiver.getRenewalHistory.useQuery({ waiverId });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading renewal history...</div>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <History className="h-4 w-4" />
        Renewal History
      </label>
      <div className="mt-2 space-y-2">
        {history.map((renewal, index) => (
          <div key={renewal.id} className="text-sm p-3 bg-gray-100 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="font-medium">Renewal #{history.length - index}</span>
              <span className="text-muted-foreground">
                {format(new Date(renewal.renewedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            {renewal.previousExpiresAt && renewal.newExpiresAt && (
              <div className="text-xs text-muted-foreground mt-1">
                Extended from {format(new Date(renewal.previousExpiresAt), "MMM d, yyyy")} to {format(new Date(renewal.newExpiresAt), "MMM d, yyyy")}
              </div>
            )}
            {renewal.ipAddress && (
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                IP: {renewal.ipAddress}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
