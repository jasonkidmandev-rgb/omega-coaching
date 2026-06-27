import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Link, Copy, CheckCircle, Clock, AlertCircle, Archive, RotateCcw, Users, Send, Loader2, Search, Filter, CalendarIcon, X, Layers, Mail, MailOpen, Upload, Download, FileSpreadsheet, RefreshCw, UserCheck, UserX, UserPlus, CalendarCheck, CalendarOff, DollarSign, Tag } from "lucide-react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import CsvImportDialog from "./clients/CsvImportDialog";
import NewFromTemplateDialog from "./clients/NewFromTemplateDialog";
import BulkActionDialog from "./clients/BulkActionDialog";
import SendInviteDialog from "./clients/SendInviteDialog";
import StatusBadge from "./clients/StatusBadge";
import ActivityIndicators from "./clients/ActivityIndicators";
import { ProfileCompletionProgress } from "@/components/ProfileCompletionProgress";
import { formatPhoneNumber, parsePhoneNumber } from "@/components/ui/phone-input";

type FilterType = 'active' | 'archived' | 'deleted';

export default function AdminClients() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<FilterType>('active');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [resendingWelcomeId, setResendingWelcomeId] = useState<number | null>(null);
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false);
  const [clientToResend, setClientToResend] = useState<{ id: number; name: string; email: string } | null>(null);
  const [customInviteMessage, setCustomInviteMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Parse URL query parameters for status filter
  const getInitialStatusFilter = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('status') || 'all';
    }
    return 'all';
  };
  const [statusFilter, setStatusFilter] = useState<string>(getInitialStatusFilter);
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [engagementFilter, setEngagementFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const { data: allTags = [] } = trpc.clientProtocol.getAllTags.useQuery();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // New from Template dialog state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [activateInProjects, setActivateInProjects] = useState(false);
  // Duplicate email confirmation state
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [duplicateExisting, setDuplicateExisting] = useState<Array<{id: number; clientName: string; status: string; version: number}>>([]);
  const [pendingCreateData, setPendingCreateData] = useState<{clientName: string; clientEmail?: string; templateId: number; activateInProjects?: boolean} | null>(null);
  const trpcUtils = trpc.useUtils();
  
  // Bulk payment actions state
  const [bulkActionDialog, setBulkActionDialog] = useState<{ open: boolean; action: string | null }>({ open: false, action: null });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // CSV Import state
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<{email: string; shippingName?: string; shippingStreet?: string; shippingCity?: string; shippingState?: string; shippingZip?: string; shippingCountry?: string; shippingPhone?: string}>>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Scroll position preservation
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  useEffect(() => {
    if (shouldRestoreScroll.current && savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  });

  const saveScrollPosition = () => {
    savedScrollPosition.current = window.scrollY;
    shouldRestoreScroll.current = true;
  };
  
  const { data: clients, refetch, isLoading: isLoadingClients } = trpc.clientProtocol.list.useQuery({ filter: activeTab });
  const { data: templates } = trpc.template.list.useQuery();
  const { data: allProtocolItems } = trpc.protocolItem.list.useQuery();
  const { data: selectedTemplateItems } = trpc.template.getItems.useQuery(
    { templateId: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  // Calculate template total cost when a template is selected
  const templateTotal = (() => {
    if (!selectedTemplateItems || !allProtocolItems) return null;
    let total = 0;
    let itemCount = 0;
    for (const ti of selectedTemplateItems) {
      const item = allProtocolItems.find((p: any) => p.id === ti.protocolItemId);
      const price = parseFloat(item?.price || '0');
      total += price * (ti.quantity || 1);
      itemCount++;
    }
    return { total, itemCount };
  })();
  const { data: emailStats } = trpc.emailTracking.getProtocolStats.useQuery(
    { protocolIds: clients?.map(c => c.id) || [] },
    { enabled: !!clients && clients.length > 0 }
  );
  
  // Check which clients have linked user accounts
  const clientEmails = clients?.map(c => c.clientEmail).filter((e): e is string => !!e) || [];
  const { data: linkedUsers } = trpc.users.checkLinkedEmails.useQuery(
    { emails: clientEmails },
    { enabled: clientEmails.length > 0 }
  );
  
  // Get check-in status for all clients
  const clientIds = clients?.map(c => c.id) || [];
  const { data: checkinStatus } = trpc.checkin.schedules.getBulkStatus.useQuery(
    { clientProtocolIds: clientIds },
    { enabled: clientIds.length > 0 }
  );

  // Bulk profile completion reminder mutation
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);
  const bulkProfileReminderMutation = trpc.bulkProfileReminder.send.useMutation({
    onSuccess: (data: { sent: number; failed: number }) => {
      setSendingBulkReminders(false);
      refetch();
      toast.success(`Sent ${data.sent} profile completion reminder(s). ${data.failed} failed.`);
    },
    onError: (error: { message?: string }) => {
      setSendingBulkReminders(false);
      toast.error(error.message || "Failed to send reminders");
    },
  });

  const handleSendBulkProfileReminders = () => {
    const incompleteCount = clients?.filter(c => 
      !c.shippingStreet || !c.shippingCity || !c.shippingState || !c.shippingZip
    ).length || 0;
    
    if (incompleteCount === 0) {
      toast.info("No clients with incomplete profiles found");
      return;
    }
    
    if (confirm(`Send profile completion reminders to ${incompleteCount} client(s) with incomplete profiles?`)) {
      setSendingBulkReminders(true);
      bulkProfileReminderMutation.mutate();
    }
  };

  const bulkShippingMutation = trpc.bulkShipping.update.useMutation({
    onSuccess: (data) => {
      setCsvImporting(false);
      setIsCsvImportOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      refetch();
      toast.success(`Updated ${data.updated} clients. ${data.notFound} not found.`);
      if (data.errors.length > 0) {
        toast.error(`${data.errors.length} errors occurred`);
      }
    },
    onError: (error) => {
      setCsvImporting(false);
      toast.error(error.message || "Failed to import shipping addresses");
    },
  });

  const bulkMarkPaidMutation = trpc.bulkPaymentActions.markAsReceived.useMutation({
    onSuccess: () => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success("Marked payments as received");
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to mark payments");
    },
  });

  const bulkMarkFailedMutation = trpc.bulkPaymentActions.markAsFailed.useMutation({
    onSuccess: () => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success("Marked payments as failed");
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to mark payments");
    },
  });

  const bulkProcessRefundsMutation = trpc.bulkPaymentActions.processRefunds.useMutation({
    onSuccess: () => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success("Processed refunds");
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to process refunds");
    },
  });

  const bulkSendEmailMutation = trpc.clientProtocol.bulkSendLink.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success(`Sent emails to ${data.sent} client(s). ${data.skipped} skipped (no email).`);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to send emails");
    },
  });

  const bulkSendInviteMutation = trpc.clientProtocol.bulkSendInvite.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      let message = `Sent invites to ${data.sent} client(s).`;
      if (data.alreadyLinked > 0) message += ` ${data.alreadyLinked} already have accounts.`;
      if (data.skipped > 0) message += ` ${data.skipped} skipped (no email).`;
      toast.success(message);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to send invites");
    },
  });

  const bulkEnableCheckinsMutation = trpc.checkin.schedules.bulkEnable.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success(`Enabled check-ins for ${data.summary.succeeded} client(s). ${data.summary.failed} failed.`);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to enable check-ins");
    },
  });

  const bulkDisableCheckinsMutation = trpc.checkin.schedules.bulkDisable.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setBulkActionDialog({ open: false, action: null });
      setSelectedIds([]);
      refetch();
      toast.success(`Disabled check-ins for ${data.summary.succeeded} client(s). ${data.summary.failed} failed.`);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to disable check-ins");
    },
  });

  // Bulk engagement level update
  const [engagementLevelDialog, setEngagementLevelDialog] = useState<{ open: boolean; level: 'full_coaching' | 'self_guided_checkins' | 'protocol_only' | null }>({ open: false, level: null });
  const bulkEngagementMutation = trpc.clientProtocol.bulkUpdateEngagementLevel.useMutation({
    onSuccess: (data) => {
      setBulkActionLoading(false);
      setEngagementLevelDialog({ open: false, level: null });
      setSelectedIds([]);
      saveScrollPosition();
      refetch();
      const levelLabel = data.succeeded > 0 ? engagementLevelDialog.level === 'full_coaching' ? 'Full Coaching' : engagementLevelDialog.level === 'self_guided_checkins' ? 'Self-Guided + Check-Ins' : 'Protocol Only' : '';
      toast.success(`Updated ${data.succeeded} client(s) to ${levelLabel}. ${data.failed} failed.`);
    },
    onError: (error) => {
      setBulkActionLoading(false);
      toast.error(error.message || "Failed to update engagement levels");
    },
  });

  // Single client invite/resend mutation
  const resendInviteMutation = trpc.clientProtocol.bulkSendInvite.useMutation({
    onSuccess: (data) => {
      setSendingId(null);
      setResendConfirmOpen(false);
      setClientToResend(null);
      refetch();
      if (data.sent > 0) {
        toast.success(`Invite sent to ${clientToResend?.name || 'client'}`);
      } else if (data.alreadyLinked > 0) {
        toast.info("This client already has an account");
      }
    },
    onError: (error) => {
      setSendingId(null);
      toast.error(error.message || "Failed to send invite");
    },
  });

  const handleResendInvite = () => {
    if (!clientToResend) return;
    setSendingId(clientToResend.id);
    resendInviteMutation.mutate({ 
      protocolIds: [clientToResend.id],
      customMessage: customInviteMessage.trim() || undefined,
    });
  };

  // Resend welcome email mutation for users who already have accounts
  const resendWelcomeEmailMutation = trpc.clientProtocol.resendWelcomeEmail.useMutation({
    onSuccess: (data) => {
      setResendingWelcomeId(null);
      toast.success(data.message || 'Welcome email sent!');
    },
    onError: (error) => {
      setResendingWelcomeId(null);
      toast.error(error.message || 'Failed to send welcome email');
    },
  });

  const handleResendWelcomeEmail = (protocolId: number, clientName: string, clientEmail: string) => {
    setResendingWelcomeId(protocolId);
    resendWelcomeEmailMutation.mutate({ protocolId });
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const preview: typeof csvPreview = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, idx) => {
          if (header === 'email') row.email = values[idx];
          else if (header === 'shipping_name' || header === 'shippingname' || header === 'name') row.shippingName = values[idx];
          else if (header === 'shipping_street' || header === 'shippingstreet' || header === 'street' || header === 'address') row.shippingStreet = values[idx];
          else if (header === 'shipping_city' || header === 'shippingcity' || header === 'city') row.shippingCity = values[idx];
          else if (header === 'shipping_state' || header === 'shippingstate' || header === 'state') row.shippingState = values[idx];
          else if (header === 'shipping_zip' || header === 'shippingzip' || header === 'zip' || header === 'postal') row.shippingZip = values[idx];
          else if (header === 'shipping_country' || header === 'shippingcountry' || header === 'country') row.shippingCountry = values[idx];
          else if (header === 'shipping_phone' || header === 'shippingphone' || header === 'phone') row.shippingPhone = values[idx];
        });
        if (row.email) preview.push(row);
      }
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = () => {
    if (!csvFile) return;
    
    setCsvImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const updates: typeof csvPreview = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, idx) => {
          if (header === 'email') row.email = values[idx];
          else if (header === 'shipping_name' || header === 'shippingname' || header === 'name') row.shippingName = values[idx];
          else if (header === 'shipping_street' || header === 'shippingstreet' || header === 'street' || header === 'address') row.shippingStreet = values[idx];
          else if (header === 'shipping_city' || header === 'shippingcity' || header === 'city') row.shippingCity = values[idx];
          else if (header === 'shipping_state' || header === 'shippingstate' || header === 'state') row.shippingState = values[idx];
          else if (header === 'shipping_zip' || header === 'shippingzip' || header === 'zip' || header === 'postal') row.shippingZip = values[idx];
          else if (header === 'shipping_country' || header === 'shippingcountry' || header === 'country') row.shippingCountry = values[idx];
          else if (header === 'shipping_phone' || header === 'shippingphone' || header === 'phone') row.shippingPhone = values[idx];
        });
        if (row.email) updates.push(row);
      }
      bulkShippingMutation.mutate({ updates });
    };
    reader.readAsText(csvFile);
  };

  const downloadCsvTemplate = () => {
    const headers = 'email,shipping_name,shipping_street,shipping_city,shipping_state,shipping_zip,shipping_country,shipping_phone';
    const example = 'client@example.com,John Doe,123 Main St,New York,NY,10001,USA,555-123-4567';
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipping_addresses_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const createFromTemplateMutation = trpc.clientProtocol.create.useMutation({
    onSuccess: (data) => {
      toast.success("Client created from template!");
      setIsTemplateDialogOpen(false);
      setSelectedTemplateId(null);
      setNewClientName("");
      setNewClientEmail("");
      setLocation(`/admin/clients/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create client");
    },
  });

  // Filter clients based on search, status, email status, and date range
  const filteredClients = clients?.filter((client) => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.clientEmail && client.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    
    // Email status filter
    const emailStatus = emailStats?.[client.id];
    let matchesEmailStatus = true;
    if (emailStatusFilter !== "all") {
      if (emailStatusFilter === "not_sent") {
        matchesEmailStatus = !emailStatus?.sent;
      } else if (emailStatusFilter === "sent") {
        matchesEmailStatus = emailStatus?.sent === true && emailStatus?.opened !== true;
      } else if (emailStatusFilter === "opened") {
        matchesEmailStatus = emailStatus?.opened === true;
      }
    }
    
    // Date range filter
    const clientDate = new Date(client.createdAt);
    const matchesStartDate = !startDate || clientDate >= startDate;
    const matchesEndDate = !endDate || clientDate <= new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1); // Include full end date
    
    // Profile completion filter
    const isProfileComplete = !!(client.shippingStreet && client.shippingCity && client.shippingState && client.shippingZip);
    let matchesProfileFilter = true;
    if (profileFilter === "incomplete") {
      matchesProfileFilter = !isProfileComplete;
    } else if (profileFilter === "complete") {
      matchesProfileFilter = isProfileComplete;
    }
    
    // Engagement level filter
    let matchesEngagement = true;
    if (engagementFilter !== "all") {
      const clientEngagement = (client as any).engagementLevel || 'protocol_only';
      matchesEngagement = clientEngagement === engagementFilter;
    }
    
    // Tag filter
    let matchesTag = true;
    if (tagFilter !== "all") {
      const clientTags: string[] = (client as any).tags ? JSON.parse((client as any).tags) : [];
      matchesTag = clientTags.includes(tagFilter);
    }
    
    return matchesSearch && matchesStatus && matchesEmailStatus && matchesStartDate && matchesEndDate && matchesProfileFilter && matchesEngagement && matchesTag;
  });
  
  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || emailStatusFilter !== "all" || profileFilter !== "all" || engagementFilter !== "all" || tagFilter !== "all" || startDate !== undefined || endDate !== undefined;
  
  // Update status filter when URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [location]);
  
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setEmailStatusFilter("all");
    setProfileFilter("all");
    setEngagementFilter("all");
    setTagFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    // Clear URL query params
    if (window.location.search) {
      setLocation('/admin/clients');
    }
  };
  
  const deleteMutation = trpc.clientProtocol.delete.useMutation({
    onSuccess: () => {
      toast.success("Client protocol deleted permanently");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkDeleteMutation = trpc.clientProtocol.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} client(s) moved to trash`);
      setSelectedIds([]);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkArchiveMutation = trpc.clientProtocol.bulkArchive.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} client(s) archived`);
      setSelectedIds([]);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkRestoreMutation = trpc.clientProtocol.bulkRestore.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} client(s) restored`);
      setSelectedIds([]);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkPermanentDeleteMutation = trpc.clientProtocol.bulkPermanentDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} client(s) permanently deleted`);
      setSelectedIds([]);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendLinkMutation = trpc.clientProtocol.sendLink.useMutation({
    onSuccess: () => {
      toast.success("Protocol sent to client!");
      setSendingId(null);
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setSendingId(null);
    },
  });

  const handleResendProtocol = (clientId: number, clientName: string, clientEmail: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clientEmail) {
      toast.error("Client has no email address");
      return;
    }
    setClientToResend({ id: clientId, name: clientName, email: clientEmail });
    setResendConfirmOpen(true);
  };

  const confirmResendProtocol = () => {
    if (!clientToResend) return;
    setSendingId(clientToResend.id);
    setResendConfirmOpen(false);
    sendLinkMutation.mutate({ id: clientToResend.id });
    setClientToResend(null);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/protocol/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Protocol link copied to clipboard");
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to permanently delete ${name}'s protocol? This cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as FilterType);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (!clients) return;
    if (selectedIds.length === clients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clients.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Move ${selectedIds.length} client(s) to trash? They can be restored within 30 days.`)) {
      bulkDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Archive ${selectedIds.length} client(s)? They can be restored anytime.`)) {
      bulkArchiveMutation.mutate({ ids: selectedIds });
    }
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    bulkRestoreMutation.mutate({ ids: selectedIds });
  };

  const handleBulkPermanentDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`PERMANENTLY delete ${selectedIds.length} client(s)? This cannot be undone!`)) {
      bulkPermanentDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  const getDeletedDaysRemaining = (deletedAt: Date | null) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffTime = 30 - Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffTime);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage client protocols and track approval status
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              className="md:size-default" 
              onClick={handleSendBulkProfileReminders}
              disabled={sendingBulkReminders}
            >
              {sendingBulkReminders ? (
                <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">Profile Reminders</span>
            </Button>
            <Button variant="outline" size="sm" className="md:size-default" onClick={() => setIsCsvImportOpen(true)}>
              <Upload className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Import CSV</span>
            </Button>
            <Button variant="outline" size="sm" className="md:size-default" onClick={() => setIsTemplateDialogOpen(true)}>
              <Layers className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">From Template</span>
            </Button>
            <Button size="sm" className="md:size-default" onClick={() => setLocation("/admin/clients/new")}>
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">New Client</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="active" className="text-xs md:text-sm">
                <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Active</span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs md:text-sm">
                <Archive className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Archived</span>
              </TabsTrigger>
              <TabsTrigger value="deleted" className="text-xs md:text-sm">
                <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Deleted</span>
              </TabsTrigger>
            </TabsList>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                {activeTab === 'active' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'send-email' })}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'send-invite' })}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invite
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'mark-paid' })}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Paid
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'mark-failed' })}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark Failed
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'refund' })}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refund
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'enable-checkins' })}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enable Check-Ins
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setBulkActionDialog({ open: true, action: 'disable-checkins' })}>
                      <X className="h-4 w-4 mr-2" />
                      Disable Check-Ins
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <UserCheck className="h-4 w-4 mr-2" />
                          Set Engagement
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEngagementLevelDialog({ open: true, level: 'full_coaching' })}>
                          <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                          Full Coaching
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEngagementLevelDialog({ open: true, level: 'self_guided_checkins' })}>
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
                          Self-Guided + Check-Ins
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEngagementLevelDialog({ open: true, level: 'protocol_only' })}>
                          <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                          Protocol Only
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
                {(activeTab === 'archived' || activeTab === 'deleted') && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleBulkRestore}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    {activeTab === 'deleted' && (
                      <Button variant="destructive" size="sm" onClick={handleBulkPermanentDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>
                      {activeTab === 'active' && 'Active Clients'}
                      {activeTab === 'archived' && 'Archived Clients'}
                      {activeTab === 'deleted' && 'Recently Deleted'}
                    </CardTitle>
                    <CardDescription>
                      {filteredClients?.length || 0} of {clients?.length || 0} client protocol{clients?.length !== 1 ? 's' : ''}
                      {activeTab === 'deleted' && ' (auto-deleted after 30 days)'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_approval">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <Mail className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Email status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Email Status</SelectItem>
                        <SelectItem value="not_sent">Not Sent</SelectItem>
                        <SelectItem value="sent">Sent (Not Opened)</SelectItem>
                        <SelectItem value="opened">Opened</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={profileFilter} onValueChange={setProfileFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Profile status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Profiles</SelectItem>
                        <SelectItem value="incomplete">Profile Incomplete</SelectItem>
                        <SelectItem value="complete">Profile Complete</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={engagementFilter} onValueChange={setEngagementFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Layers className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Engagement level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Engagement Levels</SelectItem>
                        <SelectItem value="full_coaching" textValue="Full Coaching">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Full Coaching</span>
                        </SelectItem>
                        <SelectItem value="self_guided_checkins" textValue="Self-Guided + Check-ins">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Self-Guided + Check-ins</span>
                        </SelectItem>
                        <SelectItem value="protocol_only" textValue="Protocol Only">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Protocol Only</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Tag className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        <SelectItem value="pre-consult" textValue="Pre-Consult">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pre-Consult</span>
                        </SelectItem>
                        <SelectItem value="screened-approved" textValue="Screened - Approved">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Screened - Approved</span>
                        </SelectItem>
                        <SelectItem value="screened-declined" textValue="Screened - Declined">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Screened - Declined</span>
                        </SelectItem>
                        {allTags.filter((t: string) => !['pre-consult', 'screened-approved', 'screened-declined'].includes(t)).map((tag: string) => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "MMM d, yyyy") : "From date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "MMM d, yyyy") : "To date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {hasActiveFilters && (
                      <Button variant="ghost" onClick={clearAllFilters} className="text-muted-foreground">
                        <X className="h-4 w-4 mr-1" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingClients ? (
                  <TableSkeleton columns={10} rows={8} />
                ) : filteredClients && filteredClients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredClients!.length > 0 && selectedIds.length === filteredClients!.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead>
                          {activeTab === 'deleted' ? 'Days Left' : 'Created'}
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients!.map((client) => (
                        <TableRow 
                          key={client.id} 
                          className={`${selectedIds.includes(client.id) ? 'bg-muted/50' : ''} cursor-pointer hover:bg-muted/30 transition-colors`}
                          onClick={(e) => {
                            // Don't navigate if clicking on checkbox or dropdown
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('[role="menuitem"]')) {
                              return;
                            }
                            setLocation(`/admin/clients/${client.id}`);
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(client.id)}
                              onCheckedChange={() => toggleSelect(client.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {client.clientName}
                              {/* Profile Incomplete Badge */}
                              {!client.shippingStreet || !client.shippingCity || !client.shippingState || !client.shippingZip ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium" title="Missing shipping address">
                                  <AlertCircle className="h-3 w-3" />
                                  Profile Incomplete
                                </span>
                              ) : null}
                              {activeTab === 'active' && client.clientEmail && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={(e) => handleResendProtocol(client.id, client.clientName, client.clientEmail, e)}
                                  disabled={sendingId === client.id}
                                  title="Send link to client"
                                >
                                  {sendingId === client.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{client.clientEmail || "-"}</TableCell>
                          <TableCell className="text-sm">{(client as any).clientPhone ? (() => { const parsed = parsePhoneNumber((client as any).clientPhone); return `+${parsed.countryCode} ${parsed.phoneNumber}`; })() : "-"}</TableCell>
                          <TableCell>
                            {client.clientEmail && linkedUsers?.[client.clientEmail] ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium" title={`Linked to user account. Last sign-in: ${linkedUsers[client.clientEmail].lastSignIn ? toLocaleDateStringMT(linkedUsers[client.clientEmail].lastSignIn!, { year: 'numeric', month: 'numeric', day: 'numeric' }) : 'Never'}`}>
                                  <UserCheck className="h-3 w-3" />
                                  Linked
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResendWelcomeEmail(client.id, client.clientName, client.clientEmail!);
                                  }}
                                  disabled={resendingWelcomeId === client.id}
                                  title="Resend welcome email with login instructions"
                                >
                                  {resendingWelcomeId === client.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <><Mail className="h-3 w-3 mr-1" />Welcome</>  
                                  )}
                                </Button>
                              </div>
                            ) : client.clientEmail && client.inviteSentAt ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium" title={`Invite sent on ${toLocaleDateStringMT(client.inviteSentAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}`}>
                                  <Mail className="h-3 w-3" />
                                  Invited
                                </span>
                                {(() => {
                                  const sentTime = new Date(client.inviteSentAt).getTime();
                                  const now = Date.now();
                                  const hoursSinceSent = (now - sentTime) / (1000 * 60 * 60);
                                  const cooldownHours = 24;
                                  const canResend = hoursSinceSent >= cooldownHours;
                                  const hoursRemaining = Math.ceil(cooldownHours - hoursSinceSent);
                                  
                                  return canResend ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setClientToResend({ id: client.id, name: client.clientName, email: client.clientEmail! });
                                        setResendConfirmOpen(true);
                                      }}
                                      disabled={sendingId === client.id}
                                    >
                                      {sendingId === client.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <><RefreshCw className="h-3 w-3 mr-1" />Resend</>
                                      )}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground" title={`Can resend in ${hoursRemaining}h`}>
                                      <Clock className="h-3 w-3 inline mr-1" />
                                      {hoursRemaining}h
                                    </span>
                                  );
                                })()}
                              </div>
                            ) : client.clientEmail ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium" title="No user account created yet">
                                  <UserX className="h-3 w-3" />
                                  No Account
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setClientToResend({ id: client.id, name: client.clientName, email: client.clientEmail! });
                                    setResendConfirmOpen(true);
                                  }}
                                  disabled={sendingId === client.id}
                                >
                                  {sendingId === client.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <><UserPlus className="h-3 w-3 mr-1" />Invite</>
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{client.durationMonths === 0 ? 'Protocol Only' : `${client.durationMonths} months`}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <StatusBadge status={client.status} />
                              {(() => {
                                const level = (client as any).engagementLevel || 'protocol_only';
                                if (level === 'full_coaching') return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">Coaching</span>;
                                if (level === 'self_guided_checkins') return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">Check-ins</span>;
                                return null;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.paymentStatus ? (
                              <div className="flex items-center gap-1">
                                {client.paymentStatus === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                    <CheckCircle className="h-3 w-3" />
                                    Paid
                                  </span>
                                ) : client.paymentStatus === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </span>
                                ) : client.paymentStatus === 'failed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                    <AlertCircle className="h-3 w-3" />
                                    Failed
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {emailStats && emailStats[client.id] ? (
                              <div className="flex items-center gap-1">
                                {emailStats[client.id].opened ? (
                                  <span className="flex items-center gap-1 text-green-600" title={`Opened ${emailStats[client.id].openedAt ? toLocaleDateStringMT(emailStats[client.id].openedAt!) : ''}`}>
                                    <MailOpen className="h-4 w-4" />
                                    <span className="text-xs">Opened</span>
                                  </span>
                                ) : emailStats[client.id].sent ? (
                                  <span className="flex items-center gap-1 text-amber-600" title={`Sent ${emailStats[client.id].sentAt ? toLocaleDateStringMT(emailStats[client.id].sentAt!) : ''}`}>
                                    <Mail className="h-4 w-4" />
                                    <span className="text-xs">Sent</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-gray-400">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-xs">Not sent</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ProfileCompletionProgress
                              clientName={client.clientName}
                              clientEmail={client.clientEmail}
                              clientPhone={client.shippingPhone}
                              shippingStreet={client.shippingStreet}
                              shippingCity={client.shippingCity}
                              shippingState={client.shippingState}
                              shippingZip={client.shippingZip}
                              shippingCountry={client.shippingCountry}
                              compact
                            />
                          </TableCell>
                          <TableCell>
                            <ActivityIndicators 
                              sentAt={client.sentAt} 
                              firstViewedAt={client.firstViewedAt} 
                              approvedAt={client.approvedAt}
                              status={client.status}
                            />
                          </TableCell>
                          <TableCell>
                            {checkinStatus?.[client.id]?.isEnabled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium" title={`Next check-in: ${checkinStatus[client.id].nextScheduledAt ? toLocaleDateStringMT(checkinStatus[client.id].nextScheduledAt!, { year: 'numeric', month: 'numeric', day: 'numeric' }) : 'Not scheduled'}`}>
                                <CalendarCheck className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium" title="Check-ins not enabled">
                                <CalendarOff className="h-3 w-3" />
                                Off
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {activeTab === 'deleted' ? (
                              <span className="text-amber-600 font-medium">
                                {getDeletedDaysRemaining(client.deletedAt)} days
                              </span>
                            ) : (
                              toLocaleDateStringMT(client.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Client actions menu">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {activeTab === 'active' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => copyLink(client.accessToken)}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.open(`/protocol/${client.accessToken}`, "_blank")
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Protocol
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setLocation(`/admin/clients/${client.id}`)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => bulkArchiveMutation.mutate({ ids: [client.id] })}
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => bulkDeleteMutation.mutate({ ids: [client.id] })}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(activeTab === 'archived' || activeTab === 'deleted') && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => bulkRestoreMutation.mutate({ ids: [client.id] })}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(client.id, client.clientName)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Forever
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {(searchQuery || statusFilter !== 'all') ? (
                        <Search className="h-8 w-8 text-gray-600" />
                      ) : (
                        <>
                          {activeTab === 'active' && <Link className="h-8 w-8 text-gray-600" />}
                          {activeTab === 'archived' && <Archive className="h-8 w-8 text-gray-600" />}
                          {activeTab === 'deleted' && <Trash2 className="h-8 w-8 text-gray-600" />}
                        </>
                      )}
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      {(searchQuery || statusFilter !== 'all') ? (
                        'No matching clients found'
                      ) : (
                        <>
                          {activeTab === 'active' && 'No active clients'}
                          {activeTab === 'archived' && 'No archived clients'}
                          {activeTab === 'deleted' && 'No deleted clients'}
                        </>
                      )}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {(searchQuery || statusFilter !== 'all') ? (
                        'Try adjusting your search or filter criteria'
                      ) : (
                        <>
                          {activeTab === 'active' && 'Create your first client protocol to get started'}
                          {activeTab === 'archived' && 'Archived clients will appear here'}
                          {activeTab === 'deleted' && 'Deleted clients will appear here for 30 days'}
                        </>
                      )}
                    </p>
                    {activeTab === 'active' && !searchQuery && statusFilter === 'all' && (
                      <Button onClick={() => setLocation("/admin/clients/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Client Protocol
                      </Button>
                    )}
                    {(searchQuery || statusFilter !== 'all') && (
                      <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Link Confirmation Dialog */}
      <Dialog open={resendConfirmOpen} onOpenChange={setResendConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Protocol Link?</DialogTitle>
            <DialogDescription>
              Send an email with a link to view the protocol online.
            </DialogDescription>
          </DialogHeader>
          {clientToResend && (
            <div className="py-4">
              <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Client:</span>
                  <span className="font-medium">{clientToResend.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="font-medium">{clientToResend.email}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                The client will receive an email with a link to view their protocol.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmResendProtocol}>
              <Send className="h-4 w-4 mr-2" />
              Send Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={isCsvImportOpen} onOpenChange={(open) => {
        setIsCsvImportOpen(open);
        if (!open) {
          setCsvFile(null);
          setCsvPreview([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Shipping Addresses
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk update client shipping addresses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <span className="text-sm text-muted-foreground">or</span>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {csvFile && (
                <span className="text-sm text-muted-foreground">{csvFile.name}</span>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground bg-gray-100 p-3 rounded-lg">
              <p className="font-medium mb-1">Required columns:</p>
              <p>email (required), shipping_name, shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country, shipping_phone</p>
            </div>
            
            {csvPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Preview (first {csvPreview.length} rows):</p>
                <div className="border rounded-lg overflow-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Address</th>
                        <th className="px-3 py-2 text-left">City</th>
                        <th className="px-3 py-2 text-left">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.shippingName || '-'}</td>
                          <td className="px-3 py-2">{row.shippingStreet || '-'}</td>
                          <td className="px-3 py-2">{row.shippingCity || '-'}</td>
                          <td className="px-3 py-2">{row.shippingState || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCsvImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCsvImport}
              disabled={!csvFile || csvImporting}
            >
              {csvImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Upload className="h-4 w-4 mr-2" />
              Import Addresses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New from Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
        setIsTemplateDialogOpen(open);
        if (!open) {
          setSelectedTemplateId(null);
          setNewClientName("");
          setNewClientEmail("");
          setActivateInProjects(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client from Template</DialogTitle>
            <DialogDescription>
              Quickly create a new client protocol by selecting a template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template *</label>
              <Select
                value={selectedTemplateId?.toString() || ""}
                onValueChange={(val) => setSelectedTemplateId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name *</label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Email (optional)</label>
              <Input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="activateInProjectsMain"
                checked={activateInProjects}
                onChange={(e) => setActivateInProjects(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="activateInProjectsMain" className="text-sm font-medium text-gray-700">
                Activate in Client Projects
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              When checked, this client will appear as active in Client Projects for workflow management.
            </p>
          </div>
          {templateTotal && templateTotal.total > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Template Total: ${templateTotal.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {templateTotal.itemCount} items will be included. You can customize items and pricing after creation.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedTemplateId || !newClientName.trim()) {
                  toast.error("Please select a template and enter a client name");
                  return;
                }
                const createData = {
                  clientName: newClientName.trim(),
                  clientEmail: newClientEmail.trim() || undefined,
                  templateId: selectedTemplateId,
                  activateInProjects: activateInProjects,
                };
                // Check for duplicate email before creating
                if (createData.clientEmail) {
                  try {
                    const existing = await trpcUtils.clientProtocol.checkDuplicate.fetch({ email: createData.clientEmail });
                    if (existing.length > 0) {
                      setDuplicateExisting(existing);
                      setPendingCreateData(createData);
                      setDuplicateConfirmOpen(true);
                      return;
                    }
                  } catch (e) {
                    // If check fails, proceed with creation
                  }
                }
                createFromTemplateMutation.mutate(createData);
              }}
              disabled={createFromTemplateMutation.isPending || !selectedTemplateId || !newClientName.trim()}
            >
              {createFromTemplateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Plus className="h-4 w-4 mr-2" />
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Email Confirmation Dialog */}
      <Dialog open={duplicateConfirmOpen} onOpenChange={(open) => {
        if (!open) {
          setDuplicateConfirmOpen(false);
          setPendingCreateData(null);
          setDuplicateExisting([]);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Email Detected
            </DialogTitle>
            <DialogDescription>
              A client with this email already has an active protocol. Creating a new one will replace the existing version.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">Existing protocol(s) for this email:</p>
            <div className="space-y-2">
              {duplicateExisting.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-sm">{p.clientName}</span>
                    <span className="text-xs text-muted-foreground ml-2">v{p.version}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 capitalize">{p.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              The existing protocol(s) will be marked as inactive and a new version will be created.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDuplicateConfirmOpen(false);
              setPendingCreateData(null);
              setDuplicateExisting([]);
            }}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (pendingCreateData) {
                  createFromTemplateMutation.mutate(pendingCreateData);
                }
                setDuplicateConfirmOpen(false);
                setPendingCreateData(null);
                setDuplicateExisting([]);
              }}
            >
              Create New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk Payment Action Confirmation Dialog */}
      <Dialog open={bulkActionDialog.open} onOpenChange={(open) => {
        if (!open) setBulkActionDialog({ open: false, action: null });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionDialog.action === 'send-email' && 'Send Protocol Emails?'}
              {bulkActionDialog.action === 'send-invite' && 'Send Account Invites?'}
              {bulkActionDialog.action === 'mark-paid' && 'Mark Payments as Received?'}
              {bulkActionDialog.action === 'mark-failed' && 'Mark Payments as Failed?'}
              {bulkActionDialog.action === 'refund' && 'Process Refunds?'}
              {bulkActionDialog.action === 'enable-checkins' && 'Enable Weekly Check-Ins?'}
              {bulkActionDialog.action === 'disable-checkins' && 'Disable Weekly Check-Ins?'}
            </DialogTitle>
            <DialogDescription>
              {bulkActionDialog.action === 'send-email' 
                ? `Send protocol link emails to ${selectedIds.length} selected client(s). Only clients with email addresses will receive emails.`
                : bulkActionDialog.action === 'send-invite'
                ? `Send account creation invites to ${selectedIds.length} selected client(s). Clients who already have accounts will be skipped.`
                : bulkActionDialog.action === 'enable-checkins'
                ? `Enable weekly check-in reminders for ${selectedIds.length} selected client(s). Check-ins will be sent every Thursday at 10:00 AM.`
                : bulkActionDialog.action === 'disable-checkins'
                ? `Disable weekly check-in reminders for ${selectedIds.length} selected client(s). They will no longer receive automated check-in emails.`
                : `This action will affect ${selectedIds.length} selected client(s).`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog({ open: false, action: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setBulkActionLoading(true);
                if (bulkActionDialog.action === 'send-email') {
                  bulkSendEmailMutation.mutate({ protocolIds: selectedIds });
                } else if (bulkActionDialog.action === 'send-invite') {
                  bulkSendInviteMutation.mutate({ protocolIds: selectedIds });
                } else if (bulkActionDialog.action === 'mark-paid') {
                  bulkMarkPaidMutation.mutate({ protocolIds: selectedIds });
                } else if (bulkActionDialog.action === 'mark-failed') {
                  bulkMarkFailedMutation.mutate({ protocolIds: selectedIds });
                } else if (bulkActionDialog.action === 'refund') {
                  bulkProcessRefundsMutation.mutate({ protocolIds: selectedIds });
                } else if (bulkActionDialog.action === 'enable-checkins') {
                  bulkEnableCheckinsMutation.mutate({ clientProtocolIds: selectedIds });
                } else if (bulkActionDialog.action === 'disable-checkins') {
                  bulkDisableCheckinsMutation.mutate({ clientProtocolIds: selectedIds });
                }
              }}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {bulkActionDialog.action === 'send-email' ? 'Send Emails' 
                : bulkActionDialog.action === 'send-invite' ? 'Send Invites' 
                : bulkActionDialog.action === 'enable-checkins' ? 'Enable Check-Ins'
                : bulkActionDialog.action === 'disable-checkins' ? 'Disable Check-Ins'
                : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Engagement Level Confirmation Dialog */}
      <Dialog open={engagementLevelDialog.open} onOpenChange={(open) => {
        if (!open) setEngagementLevelDialog({ open: false, level: null });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Set Engagement Level
            </DialogTitle>
            <DialogDescription>
              Update {selectedIds.length} selected client(s) to{' '}
              <strong>
                {engagementLevelDialog.level === 'full_coaching' ? 'Full Coaching' 
                  : engagementLevelDialog.level === 'self_guided_checkins' ? 'Self-Guided + Check-Ins' 
                  : 'Protocol Only'}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {engagementLevelDialog.level === 'full_coaching' && (
              <p className="text-sm text-muted-foreground bg-orange-50 p-3 rounded-lg">
                Active coaching with weekly check-ins. These clients will appear in the priority section of Check-In Analytics.
              </p>
            )}
            {engagementLevelDialog.level === 'self_guided_checkins' && (
              <p className="text-sm text-muted-foreground bg-purple-50 p-3 rounded-lg">
                No active coaching, but weekly check-ins continue. These clients will appear in the secondary section of Check-In Analytics.
              </p>
            )}
            {engagementLevelDialog.level === 'protocol_only' && (
              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                No coaching, no check-ins — protocol access only. Check-in reminders will be automatically paused.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEngagementLevelDialog({ open: false, level: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!engagementLevelDialog.level) return;
                setBulkActionLoading(true);
                bulkEngagementMutation.mutate({
                  ids: selectedIds,
                  engagementLevel: engagementLevelDialog.level,
                });
              }}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update {selectedIds.length} Client{selectedIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Invite Confirmation Dialog */}
      <Dialog open={resendConfirmOpen} onOpenChange={(open) => {
        setResendConfirmOpen(open);
        if (!open) setCustomInviteMessage("");
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Send Account Invite
            </DialogTitle>
            <DialogDescription>
              Send an account creation invite to this client
            </DialogDescription>
          </DialogHeader>
          {clientToResend && (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                <p className="font-medium">{clientToResend.name}</p>
                <p className="text-sm text-muted-foreground">{clientToResend.email}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Custom Message (Optional)
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a personal message to include in the invite email...\n\nExample: Looking forward to working with you on your health optimization journey!"
                  value={customInviteMessage}
                  onChange={(e) => setCustomInviteMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This message will appear in a highlighted section of the invite email.
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                📧 An email will be sent with a link to create their account and access their protocol.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResendConfirmOpen(false);
              setCustomInviteMessage("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleResendInvite} disabled={sendingId !== null}>
              {sendingId !== null ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send Invite</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

