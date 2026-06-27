import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT, toLocaleTimeStringMT } from "@/lib/timezone";
import { ArrowLeft, Save, Copy, ExternalLink, Send, Loader2, Plus, Ban, Layers, ChevronRight, Target, MessageSquare, Video, User, AlertCircle, CopyPlus, Trash2, Users, UserPlus, History, StickyNote, Tag, X, Camera, Image, FileText, Smile, Frown, Meh, GitBranch, Clock, Mail, DollarSign, Link2, Eye, CheckCircle2, Pin, PinOff, Pencil, Calendar, BarChart3, ClipboardList, Download, RefreshCw, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import DetailsTab from "./client-edit/DetailsTab";
import ProtocolsTab from "./client-edit/ProtocolsTab";
import PricingTab from "./client-edit/PricingTab";
import CoachNotesTab from "./client-edit/CoachNotesTab";
import CloneHistoryTab from "./client-edit/CloneHistoryTab";
import ProgressTab from "./client-edit/ProgressTab";
import CheckinHistoryTab from "./client-edit/CheckinHistoryTab";
import NotificationHistoryTab from "./client-edit/NotificationHistoryTab";
import ClientNotificationHistorySubTab from "./client-edit/ClientNotificationHistorySubTab";
import CheckinSettingsTab from "./client-edit/CheckinSettingsTab";
import CheckinSummaryTab from "./client-edit/CheckinSummaryTab";
import DocumentsSubTab from "./client-edit/DocumentsSubTab";
import EmailPdfDialog from "./client-edit/EmailPdfDialog";
import EditItemDialog from "./client-edit/EditItemDialog";
import BulkEditDialog from "./client-edit/BulkEditDialog";
import CloneProtocolDialog from "./client-edit/CloneProtocolDialog";
import { VersionComparisonDialog } from "@/components/VersionComparisonDialog";
import { ClientProtocolItem as ClientProtocolItemType, ProtocolItem as ProtocolItemType, Category as CategoryType, FormData } from "./client-edit/types";
import RichTextEditor from "@/components/RichTextEditor";
import NotesHistoryViewer from "@/components/NotesHistoryViewer";
import { useAutoSave, formatLastSaved } from "@/hooks/useAutoSave";
import { getTieredUnitPrice, hasTieredPricing, type PricingTier } from "@/lib/tieredPricing";

type ClientProtocolItem = {
  id: number;
  clientProtocolId: number;
  protocolItemId: number;
  quantity: number;
  isIncluded: boolean;
  isRecommended: boolean;
  customSchedule: string | null;
  customDuration: string | null;
  customPrice: string | null;
  customNotes: string | null;
  customCategoryName: string | null;
  sortOrder: number;
};

type ProtocolItem = {
  id: number;
  categoryId: number;
  name: string;
  schedule: string | null;
  duration: string | null;
  price: string | null;
  defaultQty: number | null;
  purpose: string | null;
  notes: string | null;
  affiliateUrl: string | null;
  affiliateCode: string | null;
  itemType: string;
  isActive: boolean;
  sortOrder: number;
};

type Category = {
  id: number;
  name: string;
  displayName: string | null;
  description: string | null;
  sortOrder: number;
};

export default function AdminClientEdit() {
  const trpcUtils = trpc.useUtils();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isNew = !params.id || params.id === "new";
  const clientId = isNew ? null : parseInt(params.id);
  
  // Tab navigation with swipe support - check URL params for initial tab
  const initialTab = (() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('tab');
    if (t && ["details", "items", "pricing", "comments", "coaching-sessions", "charting", "checkin-history"].includes(t)) return t;
    return "details";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  const tabOrder = ["details", "items", "pricing", "comments", "coaching-sessions", "charting", "checkin-history"];
  const availableTabs = isNew ? ["details"] : tabOrder;
  const [chartingSubTab, setChartingSubTab] = useState("coach-notes");
  
  const handleSwipe = useCallback(() => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) < swipeThreshold) return;
    
    const currentIndex = availableTabs.indexOf(activeTab);
    if (diff > 0 && currentIndex < availableTabs.length - 1) {
      // Swipe left - next tab
      setActiveTab(availableTabs[currentIndex + 1]);
    } else if (diff < 0 && currentIndex > 0) {
      // Swipe right - previous tab
      setActiveTab(availableTabs[currentIndex - 1]);
    }
  }, [activeTab, availableTabs]);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    templateId: "",
    durationMonths: 3,
    status: "draft" as "draft" | "pending_approval" | "approved" | "active" | "completed",
    clientVisibility: "active" as "hidden" | "option" | "active" | "archived",
    coachingPackage: "",
    coachingPrice: "",
    discountPercent: "0",
    paymentMethod: "stripe" as "stripe" | "manual" | "cc" | "other" | "venmo" | "paypal",
    venmoHandle: "",
    customRequirements: "",
    notes: "",
    coachNotes: "",
    // Shipping address
    shippingName: "",
    shippingStreet: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingCountry: "USA",
    shippingPhone: "",
    paymentReminderOptOut: false,
    versionName: "",
    engagementLevel: "protocol_only" as "full_coaching" | "self_guided_checkins" | "protocol_only",
  });

  const [protocolItems, setProtocolItems] = useState<ClientProtocolItem[]>([]);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemData, setEditItemData] = useState({
    customSchedule: '',
    customDuration: '',
    customPrice: '',
    customNotes: '',
    customPurpose: '',
  });
  const [templateSyncOption, setTemplateSyncOption] = useState<'none' | 'current' | 'all'>('none');
  
  // Template confirmation dialog state
  const [showTemplateConfirmDialog, setShowTemplateConfirmDialog] = useState(false);
  const [pendingFormSubmit, setPendingFormSubmit] = useState<React.FormEvent | null>(null);
  // Duplicate email confirmation state
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [duplicateExisting, setDuplicateExisting] = useState<Array<{id: number; clientName: string; status: string; version: number}>>([]);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<any>(null);
  
  // Check-in enable prompt dialog state
  const [showCheckinPromptDialog, setShowCheckinPromptDialog] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string>('');
  
  // Bulk edit state for client protocol items
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditType, setBulkEditType] = useState<'schedule' | 'source' | 'discount'>('schedule');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [newProductData, setNewProductData] = useState({
    categoryId: "",
    name: "",
    schedule: "",
    duration: "",
    price: "",
    defaultQty: 1,
    purpose: "",
    notes: "",
    itemType: "peptide" as "peptide" | "supplement" | "adjunct" | "supply" | "service" | "other",
    isDiscountable: true,
    addToMasterTemplate: false,
  });

  const { data: client, isLoading: clientLoading } = trpc.clientProtocol.get.useQuery(
    { id: clientId! },
    { enabled: !!clientId }
  );
  
  // Check-in schedule query
  const { data: checkinSchedule, refetch: refetchCheckinSchedule } = trpc.checkin.schedules.getByClient.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId && !isNew }
  );
  
  // Check-in enable mutation
  const enableCheckinMutation = trpc.checkin.schedules.enable.useMutation({
    onSuccess: () => {
      toast.success('Weekly check-ins enabled for this client');
      refetchCheckinSchedule();
      setShowCheckinPromptDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to enable check-ins: ${error.message}`);
    },
  });
  
  // Protocol versioning state
  const [isNewVersionDialogOpen, setIsNewVersionDialogOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionTemplateId, setNewVersionTemplateId] = useState<number | null>(null);
  const [copyItemsFromPrevious, setCopyItemsFromPrevious] = useState(false);
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [isComparisonDialogOpen, setIsComparisonDialogOpen] = useState(false);
  
  // Get protocol version history for this client (works with or without clientId)
  const { data: versionHistory = [] } = trpc.clientProtocol.getVersionHistoryByProtocolId.useQuery(
    { protocolId: Number(clientId) },
    { enabled: !!clientId && !isNew }
  );
  
  const createNewVersionMutation = trpc.clientProtocol.createNewVersion.useMutation({
    onSuccess: (data) => {
      toast.success('New protocol version created!');
      setIsNewVersionDialogOpen(false);
      setNewVersionName('');
      setNewVersionTemplateId(null);
      setCopyItemsFromPrevious(false);
      // Navigate to the new protocol
      setLocation(`/admin/clients/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create new version: ${error.message}`);
    },
  });
  
  const setActiveVersionMutation = trpc.clientProtocol.setActiveVersion.useMutation({
    onSuccess: () => {
      toast.success('Active version updated');
      trpcUtils.clientProtocol.getVersionHistoryByProtocolId.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to set active version: ${error.message}`);
    },
  });
  
  const { data: clientItems } = trpc.clientProtocol.getItems.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );
  const { data: templates } = trpc.template.list.useQuery();
  const { data: allItems } = trpc.protocolItem.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: programs } = trpc.program.list.useQuery();
  const { data: clientProgramInfo, refetch: refetchProgramInfo } = trpc.program.getClientProgramInfo.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );

  // Template items for sync check
  const { data: templateItems } = trpc.template.getItems.useQuery(
    { templateId: client?.templateId! },
    { enabled: !!client?.templateId }
  );

  // Get template to check hidePricing setting
  const { data: selectedTemplate } = trpc.template.get.useQuery(
    { id: client?.templateId! },
    { enabled: !!client?.templateId }
  );
  const hidePricing = selectedTemplate?.hidePricing ?? false;

  // Calculate out-of-sync items
  const outOfSyncCount = (() => {
    if (!templateItems || !protocolItems.length) return 0;
    const existingItemIds = new Set(protocolItems.map(item => item.protocolItemId));
    return templateItems.filter((item: any) => !existingItemIds.has(item.protocolItemId)).length;
  })();

  // Comments
  const [newComment, setNewComment] = useState("");
  const [loomUrl, setLoomUrl] = useState("");
  const [showLoomInput, setShowLoomInput] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Email dialog state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailConfirmStep, setEmailConfirmStep] = useState<"input" | "confirm">("input");

  // Payment link preview dialog state
  const [isPaymentLinkDialogOpen, setIsPaymentLinkDialogOpen] = useState(false);
  const [paymentLinkValidating, setPaymentLinkValidating] = useState(false);
  const [paymentLinkValid, setPaymentLinkValid] = useState<boolean | null>(null);

  // Clone dialog state
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneMode, setCloneMode] = useState<"new" | "existing" | "bulk">("new");
  const [cloneClientName, setCloneClientName] = useState("");
  const [cloneClientEmail, setCloneClientEmail] = useState("");
  const [selectedExistingClientId, setSelectedExistingClientId] = useState<number | null>(null);
  const [bulkCloneClients, setBulkCloneClients] = useState<Array<{ name: string; email: string }>>([{ name: "", email: "" }]);
  const [alsoCreateClientProject, setAlsoCreateClientProject] = useState(false);

  const { data: comments = [], refetch: refetchComments } = trpc.comments.list.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );

  // All clients for clone to existing feature
  const { data: allClients } = trpc.clientProtocol.list.useQuery();
  
  // Clone history for this protocol
  const { data: cloneHistory = [] } = trpc.clientProtocol.getCloneHistory.useQuery(
    { protocolId: clientId! },
    { enabled: !!clientId }
  );

  // Progress photos and journal notes for this client (by email)
  const { data: clientUser } = trpc.users.getByEmail.useQuery(
    { email: client?.clientEmail! },
    { enabled: !!client?.clientEmail }
  );
  const { data: progressPhotos = [] } = trpc.progress.getPhotos.useQuery(
    { userId: clientUser?.id! },
    { enabled: !!clientUser?.id }
  );
  const { data: journalNotes = [] } = trpc.progress.getNotes.useQuery(
    { userId: clientUser?.id! },
    { enabled: !!clientUser?.id }
  );

  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      setLoomUrl("");
      setShowLoomInput(false);
      refetchComments();
      toast.success("Comment sent!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const markReadMutation = trpc.comments.markRead.useMutation();

  const handleSendComment = () => {
    if (!newComment.trim() || !clientId) return;
    createCommentMutation.mutate({
      clientProtocolId: clientId,
      authorType: "coach",
      authorName: "Coach",
      message: newComment.trim(),
      loomUrl: loomUrl.trim() || undefined,
    });
  };

  // Program assignment state
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const { data: selectedProgramPhases } = trpc.program.getPhases.useQuery(
    { programId: selectedProgramId! },
    { enabled: !!selectedProgramId }
  );

  const assignProgramMutation = trpc.program.assignClient.useMutation({
    onSuccess: () => {
      toast.success("Client assigned to program");
      refetchProgramInfo();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const advancePhaseMutation = trpc.program.advancePhase.useMutation({
    onSuccess: () => {
      toast.success("Client advanced to next phase");
      refetchProgramInfo();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Engagement level state and mutation
  const [isEngagementLevelDialogOpen, setIsEngagementLevelDialogOpen] = useState(false);
  const updateEngagementLevelMutation = trpc.clientProtocol.updateEngagementLevel.useMutation({
    onSuccess: () => {
      toast.success('Engagement level updated');
      trpcUtils.clientProtocol.get.invalidate({ id: clientId! });
      trpcUtils.clientProtocol.list.invalidate();
      setIsEngagementLevelDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update engagement level: ${error.message}`);
    },
  });

  const createMutation = trpc.clientProtocol.create.useMutation({
    onSuccess: (data) => {
      toast.success("Client protocol created");
      setLocation(`/admin/clients/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.clientProtocol.update.useMutation({
    onSuccess: () => {
      toast.success("Client protocol updated");
      // Invalidate the client query to refresh the page title and other data
      trpcUtils.clientProtocol.get.invalidate({ id: clientId! });
      // Also invalidate the list to update the client name in the sidebar/list
      trpcUtils.clientProtocol.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendEmailMutation = trpc.clientProtocol.sendEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsEmailDialogOpen(false);
      setEmailAddress("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Track scroll position for item updates
  const scrollPositionRef = useRef<number | null>(null);

  const updateItemMutation = trpc.clientProtocol.updateItem.useMutation({
    onSuccess: () => {
      // Restore scroll position after update
      if (scrollPositionRef.current !== null) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPositionRef.current!);
          scrollPositionRef.current = null;
        });
      }
    },
    onError: (error) => {
      toast.error(error.message);
      scrollPositionRef.current = null;
    },
  });

  const createProtocolItemMutation = trpc.protocolItem.create.useMutation();
  const addClientItemMutation = trpc.clientProtocol.addItem.useMutation({
    onSuccess: () => {
      // Restore scroll position after adding item
      if (scrollPositionRef.current !== null) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPositionRef.current!);
          scrollPositionRef.current = null;
        });
      }
    },
    onError: (error) => {
      toast.error(error.message);
      scrollPositionRef.current = null;
    },
  });
  
  // Sync with Master Template mutation (for clients without assigned template)
  const syncWithMasterTemplateMutation = trpc.clientProtocol.syncWithMasterTemplate.useMutation();
  
  // Sync with Template mutation (add missing template items to protocol)
  const [isSyncTemplateDialogOpen, setIsSyncTemplateDialogOpen] = useState(false);
  const [syncTemplateId, setSyncTemplateId] = useState<number | null>(null);
  const syncWithTemplateMutation = trpc.clientProtocol.syncWithTemplate.useMutation({
    onSuccess: (data) => {
      if (data.addedCount === 0) {
        toast.info(`Protocol is already in sync with "${data.templateName}" — no missing items found.`);
      } else {
        toast.success(`Added ${data.addedCount} missing items from "${data.templateName}" template. They are added as excluded — include the ones you want.`);
      }
      setIsSyncTemplateDialogOpen(false);
      setSyncTemplateId(null);
      refetchClientItems();
      trpcUtils.clientProtocol.getItems.invalidate({ clientProtocolId: clientId! });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
  
  const { refetch: refetchAllItems } = trpc.protocolItem.list.useQuery();
  const { refetch: refetchClientItems } = trpc.clientProtocol.getItems.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );

  // Scroll to top when page first loads - aggressive fix for scroll-to-bottom issue
  const hasScrolledToTop = useRef(false);
  const scrollFixIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useLayoutEffect(() => {
    // Disable browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    if (client && !hasScrolledToTop.current) {
      hasScrolledToTop.current = true;
      
      // Force scroll to top immediately
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Keep scrolling to top for 500ms to override any other scroll behavior
      let scrollCount = 0;
      scrollFixIntervalRef.current = setInterval(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        scrollCount++;
        if (scrollCount >= 10) {
          if (scrollFixIntervalRef.current) {
            clearInterval(scrollFixIntervalRef.current);
            scrollFixIntervalRef.current = null;
          }
        }
      }, 50);
    }
    
    return () => {
      if (scrollFixIntervalRef.current) {
        clearInterval(scrollFixIntervalRef.current);
        scrollFixIntervalRef.current = null;
      }
    };
  }, [client]);

  useEffect(() => {
    if (client) {
      setFormData({
        clientName: client.clientName,
        clientEmail: client.clientEmail || "",
        clientPhone: (client as any).clientPhone || "",
        templateId: client.templateId?.toString() || "",
        durationMonths: client.durationMonths,
        status: client.status || "active",
        clientVisibility: (client as any).clientVisibility || "active",
        coachingPackage: client.coachingPackage || "",
        coachingPrice: client.coachingPrice || "",
        discountPercent: client.discountPercent || "0",
        paymentMethod: client.paymentMethod || "stripe",
        venmoHandle: client.venmoHandle || "",
        customRequirements: client.customRequirements || "",
        notes: client.notes || "",
        coachNotes: client.coachNotes || "",
        // Shipping address
        shippingName: client.shippingName || "",
        shippingStreet: client.shippingStreet || "",
        shippingCity: client.shippingCity || "",
        shippingState: client.shippingState || "",
        shippingZip: client.shippingZip || "",
        shippingCountry: client.shippingCountry || "USA",
        shippingPhone: client.shippingPhone || "",
        paymentReminderOptOut: (client as any).paymentReminderOptOut || false,
        versionName: client.versionName || "",
        engagementLevel: (client as any).engagementLevel || "protocol_only",
      });
    }
  }, [client]);

  useEffect(() => {
    if (clientItems) {
      setProtocolItems(clientItems as ClientProtocolItem[]);
    }
  }, [clientItems]);

  const doCreateProtocol = (payload: any) => {
    createMutation.mutate(payload);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called, isNew:', isNew, 'formData:', formData);
    if (isNew) {
      if (!formData.clientName.trim()) {
        toast.error('Client name is required');
        return;
      }
      
      // Show confirmation dialog if no template is selected
      if (!formData.templateId) {
        setPendingFormSubmit(e);
        setShowTemplateConfirmDialog(true);
        return;
      }
      
      const payload = {
        ...formData,
        templateId: formData.templateId ? parseInt(formData.templateId) : undefined,
      };
      
      // Check for duplicate email before creating
      if (formData.clientEmail) {
        try {
          const existing = await trpcUtils.clientProtocol.checkDuplicate.fetch({ email: formData.clientEmail });
          if (existing.length > 0) {
            setDuplicateExisting(existing);
            setPendingCreatePayload(payload);
            setDuplicateConfirmOpen(true);
            return;
          }
        } catch (e) {
          // If check fails, proceed with creation
        }
      }
      
      console.log('Creating protocol with:', payload);
      doCreateProtocol(payload);
    } else {
      updateMutation.mutate({
        id: clientId!,
        ...formData,
      });
    }
  };
  
  // Handle template confirmation dialog responses
  const handleTemplateConfirmUseDefault = async () => {
    setShowTemplateConfirmDialog(false);
    setPendingFormSubmit(null);
    const payload = {
      ...formData,
      templateId: undefined,
    };
    // Check for duplicate email before creating
    if (formData.clientEmail) {
      try {
        const existing = await trpcUtils.clientProtocol.checkDuplicate.fetch({ email: formData.clientEmail });
        if (existing.length > 0) {
          setDuplicateExisting(existing);
          setPendingCreatePayload(payload);
          setDuplicateConfirmOpen(true);
          return;
        }
      } catch (e) {
        // If check fails, proceed with creation
      }
    }
    doCreateProtocol(payload);
  };
  
  const handleTemplateConfirmCancel = () => {
    setShowTemplateConfirmDialog(false);
    setPendingFormSubmit(null);
    // User wants to select a template - scroll to template dropdown
    toast.info('Please select a template from the dropdown');
  };

  const handleItemToggle = (itemId: number, isIncluded: boolean) => {
    // When unchecking, also turn off recommended
    // When checking, automatically set as recommended
    const updateData: { isIncluded: boolean; isRecommended?: boolean } = { isIncluded };
    if (!isIncluded) {
      updateData.isRecommended = false;
    } else {
      updateData.isRecommended = true;
    }
    
    setProtocolItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updateData } : item))
    );
    updateItemMutation.mutate({ id: itemId, ...updateData });
  };

  const handleItemQtyChange = (itemId: number, quantity: number) => {
    setProtocolItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
    updateItemMutation.mutate({ id: itemId, quantity });
  };

  const handleRecommendedToggle = (itemId: number, isRecommended: boolean) => {
    setProtocolItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, isRecommended } : item))
    );
    updateItemMutation.mutate({ id: itemId, isRecommended });
  };

  // Bulk toggle all items in a category
  const handleBulkToggleCategory = (categoryId: number, isIncluded: boolean) => {
    const categoryItemIds = protocolItems
      .filter((item) => {
        const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
        return protocolItem?.categoryId === categoryId;
      })
      .map((item) => item.id);

    // When unchecking, also turn off recommended; when checking, set as recommended
    const updateData: { isIncluded: boolean; isRecommended: boolean } = {
      isIncluded,
      isRecommended: isIncluded, // sync recommended with inclusion
    };

    // Update local state
    setProtocolItems((prev) =>
      prev.map((item) =>
        categoryItemIds.includes(item.id) ? { ...item, ...updateData } : item
      )
    );

    // Update each item in the database
    categoryItemIds.forEach((itemId) => {
      updateItemMutation.mutate({ id: itemId, ...updateData });
    });

    toast.success(`${isIncluded ? 'Checked' : 'Unchecked'} all items in category`);
  };

  // Bulk edit handlers for client protocol items
  const handleToggleSelectItem = (itemId: number) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAllItems = () => {
    const allIds = protocolItems.filter(item => item.isIncluded).map(item => item.id);
    setSelectedItemIds(new Set(allIds));
  };

  const handleDeselectAllItems = () => {
    setSelectedItemIds(new Set());
  };

  const handleBulkEdit = async () => {
    if (selectedItemIds.size === 0) {
      toast.error('Please select items to edit');
      return;
    }

    const selectedItems = protocolItems.filter(item => selectedItemIds.has(item.id));
    
    for (const item of selectedItems) {
      const protocolItem = allItems?.find(i => i.id === item.protocolItemId);
      if (!protocolItem) continue;

      if (bulkEditType === 'schedule') {
        // Update custom schedule
        updateItemMutation.mutate({
          id: item.id,
          customSchedule: bulkEditValue,
        });
        setProtocolItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, customSchedule: bulkEditValue } : i
        ));
      } else if (bulkEditType === 'discount') {
        // Update to ND (non-discountable) - this updates the master item
        // For now, we'll just show a message since this affects master items
        toast.info('Discount changes affect master items. Use Protocol Items page for bulk discount changes.');
        setIsBulkEditDialogOpen(false);
        return;
      }
    }

    toast.success(`Updated ${selectedItemIds.size} items`);
    setIsBulkEditDialogOpen(false);
    setBulkEditValue('');
    setSelectedItemIds(new Set());
  };

  // Mutation for syncing to templates
  const syncToTemplatesMutation = trpc.protocolItem.syncToTemplates.useMutation({
    onSuccess: (data) => {
      if (data.syncMode === 'current') {
        toast.success('Changes saved to current template');
      } else if (data.syncMode === 'all') {
        toast.success('Changes saved to ALL templates');
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync to templates: ${error.message}`);
    },
  });

  // Handle saving custom schedule/dosing for an item
  const handleSaveItemCustomization = async () => {
    if (!editingItemId) return;
    
    // Save scroll position before update
    scrollPositionRef.current = window.scrollY;
    
    // Find the protocol item ID for this client item
    const clientItem = protocolItems.find(item => item.id === editingItemId);
    const protocolItemId = clientItem?.protocolItemId;
    
    // Update local state
    setProtocolItems((prev) =>
      prev.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              customSchedule: editItemData.customSchedule || null,
              customDuration: editItemData.customDuration || null,
              customPrice: editItemData.customPrice || null,
              customNotes: editItemData.customNotes || null,
              customPurpose: editItemData.customPurpose || null,
            }
          : item
      )
    );

    // Update in database for this client
    updateItemMutation.mutate({
      id: editingItemId,
      customSchedule: editItemData.customSchedule || undefined,
      customDuration: editItemData.customDuration || undefined,
      customPrice: editItemData.customPrice || undefined,
      customNotes: editItemData.customNotes || undefined,
      customPurpose: editItemData.customPurpose || undefined,
    });

    // If template sync is selected, also update the master template
    if (templateSyncOption !== 'none' && protocolItemId) {
      syncToTemplatesMutation.mutate({
        protocolItemId,
        schedule: editItemData.customSchedule || undefined,
        duration: editItemData.customDuration || undefined,
        notes: editItemData.customNotes || undefined,
        syncMode: templateSyncOption,
        currentTemplateId: client?.templateId ?? undefined,
      });
    }

    toast.success('Item customization saved');
    setIsEditItemDialogOpen(false);
    setEditingItemId(null);
    setTemplateSyncOption('none'); // Reset for next edit
  };

  const handleAddNewProduct = async () => {
    if (!newProductData.name.trim() || !newProductData.categoryId) {
      toast.error("Name and category are required");
      return;
    }

    try {
      let protocolItemId: number;

      if (newProductData.addToMasterTemplate) {
        // Create in master protocol items library
        const result = await createProtocolItemMutation.mutateAsync({
          categoryId: parseInt(newProductData.categoryId),
          name: newProductData.name,
          schedule: newProductData.schedule || undefined,
          duration: newProductData.duration || undefined,
          price: newProductData.price || "0",
          defaultQty: newProductData.defaultQty,
          purpose: newProductData.purpose || undefined,
          notes: newProductData.notes || undefined,
          itemType: newProductData.itemType,
          isDiscountable: newProductData.isDiscountable,
        });
        protocolItemId = result.id;
        await refetchAllItems();
        toast.success("Product added to master template and this protocol");
      } else {
        // Create a temporary item just for this protocol
        // We still need to create it in the items table, but mark it somehow
        const result = await createProtocolItemMutation.mutateAsync({
          categoryId: parseInt(newProductData.categoryId),
          name: newProductData.name,
          schedule: newProductData.schedule || undefined,
          duration: newProductData.duration || undefined,
          price: newProductData.price || "0",
          defaultQty: newProductData.defaultQty,
          purpose: newProductData.purpose || undefined,
          notes: newProductData.notes || undefined,
          itemType: newProductData.itemType,
          isDiscountable: newProductData.isDiscountable,
        });
        protocolItemId = result.id;
        await refetchAllItems();
        toast.success("Product added to this protocol");
      }

      // Add to this client's protocol
      if (clientId) {
        // Save scroll position before adding item
        scrollPositionRef.current = window.scrollY;
        await addClientItemMutation.mutateAsync({
          clientProtocolId: clientId,
          protocolItemId: protocolItemId,
          quantity: newProductData.defaultQty,
          isIncluded: true,
          isRecommended: true,
        });
        await refetchClientItems();
      }

      // Reset form and close dialog
      setNewProductData({
        categoryId: "",
        name: "",
        schedule: "",
        duration: "",
        price: "",
        defaultQty: 1,
        purpose: "",
        notes: "",
        itemType: "peptide",
        isDiscountable: true,
        addToMasterTemplate: false,
      });
      setIsNewProductDialogOpen(false);
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const copyLink = () => {
    if (client?.accessToken) {
      const url = `${window.location.origin}/protocol/${client.accessToken}`;
      navigator.clipboard.writeText(url);
      toast.success("Protocol link copied to clipboard");
    }
  };

  // Send protocol link mutation
  const sendLinkMutation = trpc.clientProtocol.sendLink.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Protocol link sent to client!");
        trpcUtils.clientProtocol.invalidate();
      } else {
        toast.error(result.message || "Failed to send protocol link");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send protocol link");
    },
  });

  // Send payment link only mutation
  const sendPaymentLinkMutation = trpc.clientProtocol.sendPaymentLink.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Payment link sent to client!");
        setIsPaymentLinkDialogOpen(false);
        trpcUtils.clientProtocol.invalidate();
      } else {
        toast.error(result.message || "Failed to send payment link");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send payment link");
    },
  });

  const sendForApproval = () => {
    if (clientId && client?.clientEmail) {
      sendLinkMutation.mutate({ id: clientId });
    } else if (clientId) {
      // If no email, just update status
      updateMutation.mutate({
        id: clientId,
        status: "pending_approval",
      });
      toast.success("Protocol status updated. Copy the link to share with client.");
    }
  };

  // Clone protocol mutation
  const cloneMutation = trpc.clientProtocol.clone.useMutation({
    onSuccess: (data) => {
      toast.success("Protocol cloned successfully!");
      resetCloneDialog();
      setLocation(`/admin/clients/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clone protocol");
    },
  });

  const cloneToExistingMutation = trpc.clientProtocol.cloneToExisting.useMutation({
    onSuccess: (data) => {
      toast.success("Protocol cloned to existing client successfully!");
      resetCloneDialog();
      setLocation(`/admin/clients/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clone protocol");
    },
  });

  const applyPresetMutation = trpc.protocolPresets.applyToProtocol.useMutation();

  const bulkCloneMutation = trpc.clientProtocol.bulkClone.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully created ${data.count} new client protocols!`);
      resetCloneDialog();
      setLocation("/admin/clients");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to bulk clone protocol");
    },
  });

  const resetCloneDialog = () => {
    setIsCloneDialogOpen(false);
    setCloneMode("new");
    setCloneClientName("");
    setCloneClientEmail("");
    setSelectedExistingClientId(null);
    setBulkCloneClients([{ name: "", email: "" }]);
    setAlsoCreateClientProject(false);
  };

  const handleCloneProtocol = () => {
    if (!clientId) return;

    if (cloneMode === "new") {
      if (!cloneClientName.trim()) {
        toast.error("Please enter a client name");
        return;
      }
      cloneMutation.mutate({
        sourceId: clientId,
        clientName: cloneClientName.trim(),
        clientEmail: cloneClientEmail.trim() || undefined,
        alsoCreateClientProject,
      });
    } else if (cloneMode === "existing") {
      if (!selectedExistingClientId) {
        toast.error("Please select an existing client");
        return;
      }
      cloneToExistingMutation.mutate({
        sourceId: clientId,
        targetId: selectedExistingClientId,
      });
    } else if (cloneMode === "bulk") {
      const validClients = bulkCloneClients.filter(c => c.name.trim());
      if (validClients.length === 0) {
        toast.error("Please enter at least one client name");
        return;
      }
      bulkCloneMutation.mutate({
        sourceId: clientId,
        clients: validClients.map(c => ({
          name: c.name.trim(),
          email: c.email.trim() || undefined,
        })),
        alsoCreateClientProject,
      });
    }
  };

  const addBulkCloneRow = () => {
    setBulkCloneClients([...bulkCloneClients, { name: "", email: "" }]);
  };

  const removeBulkCloneRow = (index: number) => {
    if (bulkCloneClients.length > 1) {
      setBulkCloneClients(bulkCloneClients.filter((_, i) => i !== index));
    }
  };

  const updateBulkCloneClient = (index: number, field: "name" | "email", value: string) => {
    const updated = [...bulkCloneClients];
    updated[index][field] = value;
    setBulkCloneClients(updated);
  };

  // Calculate totals with discount eligibility
  const calculateTotals = () => {
    let subtotal = 0;
    let discountableSubtotal = 0;
    let nonDiscountableSubtotal = 0;
    let clientBuysTotal = 0;
    
    protocolItems.forEach((item) => {
      if (item.isIncluded) {
        const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
        if (protocolItem) {
          const hasCustomPrice = !!item.customPrice;
          const defaultPrice = parseFloat(protocolItem.price || "0");
          const itemTiers = (protocolItem as any).pricingTiers as PricingTier[] | null;
          const unitPrice = hasCustomPrice
            ? parseFloat(item.customPrice!)
            : hasTieredPricing(itemTiers)
              ? getTieredUnitPrice(item.quantity, itemTiers, defaultPrice)
              : defaultPrice;
          const itemTotal = unitPrice * item.quantity;
          
          // Items marked as "client buys" are NOT included in the charged total
          const isClientBuys = (item as any).fulfillmentSource === 'client';
          if (isClientBuys) {
            clientBuysTotal += itemTotal;
            return; // Skip adding to subtotal — client purchases these separately
          }
          
          subtotal += itemTotal;
          
          // Check if item is discountable (item level takes precedence, then category)
          const category = categories?.find((c) => c.id === protocolItem.categoryId);
          const isItemDiscountable = (protocolItem as any).isDiscountable !== false;
          const isCategoryDiscountable = category ? (category as any).isDiscountable !== false : true;
          
          if (isItemDiscountable && isCategoryDiscountable) {
            discountableSubtotal += itemTotal;
          } else {
            nonDiscountableSubtotal += itemTotal;
          }
        }
      }
    });
    
    // Discount only applies to discountable items
    const discountPercent = parseFloat(formData.discountPercent || "0");
    const discount = (discountableSubtotal * discountPercent) / 100;
    const coaching = parseFloat(formData.coachingPrice || "0");
    const total = subtotal - discount + coaching;
    const ccFee = total * 0.035;
    
    return { 
      subtotal, 
      discountableSubtotal, 
      nonDiscountableSubtotal, 
      clientBuysTotal,
      discount, 
      coaching, 
      total, 
      ccFee 
    };
  };

  const totals = calculateTotals();

  // Group items by category
  const itemsByCategory = categories?.map((cat) => ({
    category: cat,
    items: protocolItems.filter((item) => {
      const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
      return protocolItem?.categoryId === cat.id;
    }),
  })).filter((group) => group.items.length > 0);

  if (clientLoading && !isNew) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Template Selection Confirmation Dialog */}
      <Dialog open={showTemplateConfirmDialog} onOpenChange={setShowTemplateConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              No Template Selected
            </DialogTitle>
            <DialogDescription>
              You haven't selected a template for this client. Would you like to use the default Master Template, or go back and select a specific template?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The Master Template includes all standard protocol items and is recommended for most clients.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleTemplateConfirmCancel}>
              Select a Template
            </Button>
            <Button onClick={handleTemplateConfirmUseDefault}>
              <Layers className="h-4 w-4 mr-2" />
              Use Master Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Duplicate Email Confirmation Dialog */}
      <Dialog open={duplicateConfirmOpen} onOpenChange={(open) => {
        if (!open) {
          setDuplicateConfirmOpen(false);
          setPendingCreatePayload(null);
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
              setPendingCreatePayload(null);
              setDuplicateExisting([]);
            }}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (pendingCreatePayload) {
                  doCreateProtocol(pendingCreatePayload);
                }
                setDuplicateConfirmOpen(false);
                setPendingCreatePayload(null);
                setDuplicateExisting([]);
              }}
            >
              Create New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-In Enable Prompt Dialog */}
      <Dialog open={showCheckinPromptDialog} onOpenChange={setShowCheckinPromptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Enable Weekly Check-Ins?
            </DialogTitle>
            <DialogDescription>
              You're changing this client's status to Active. Would you like to enable weekly check-in reminders for them?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Weekly check-ins help you stay connected with your clients and monitor their progress. Check-ins will be sent every Thursday at 10:00 AM.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-blue-700">What happens when enabled:</p>
              <ul className="list-disc list-inside text-blue-600 mt-1 space-y-1">
                <li>Client receives weekly check-in email</li>
                <li>They can report their progress and any concerns</li>
                <li>You get notified of their responses</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCheckinPromptDialog(false)}>
              Not Now
            </Button>
            <Button 
              onClick={() => {
                if (clientId) {
                  enableCheckinMutation.mutate({ clientProtocolId: clientId });
                }
              }}
              disabled={enableCheckinMutation.isPending}
            >
              {enableCheckinMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Enable Check-Ins
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          {/* Row 1: Back button + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/clients")}
              className="shrink-0 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                {isNew ? "New Client Protocol" : `Edit: ${client?.clientName}`}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {isNew
                  ? "Create a new client protocol from a template"
                  : "Customize protocol items and settings"}
              </p>
            </div>
          </div>
          {/* Row 2: Version controls - scrollable on mobile */}
          {!isNew && versionHistory.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <Badge variant="outline" className="flex items-center gap-1 shrink-0 text-xs">
                <GitBranch className="h-3 w-3" />
                {client?.versionName || `Version ${client?.version || 1}`}
              </Badge>
              {versionHistory.length > 1 && (
                <Select
                  key={`version-${clientId}`}
                  value={clientId?.toString()}
                  onValueChange={(value) => {
                    if (value !== clientId?.toString()) {
                      setLocation(`/admin/clients/${value}`);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] sm:w-[180px] h-7 text-xs shrink-0">
                    <SelectValue placeholder="Switch version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionHistory.map((version: any) => (
                      <SelectItem key={version.id} value={version.id.toString()} textValue={version.versionName || `Version ${version.version}`}>
                        <div className="flex items-center gap-2">
                          {version.isActiveVersion && <Badge variant="default" className="text-[10px] px-1">Active</Badge>}
                          {version.versionName || `Version ${version.version}`}
                          <span className="text-muted-foreground text-xs">({version.status})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewVersionDialogOpen(true)}
                className="h-7 text-xs shrink-0"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Version
              </Button>
              {versionHistory.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsComparisonDialogOpen(true)}
                  className="h-7 text-xs shrink-0"
                >
                  <GitBranch className="h-3 w-3 mr-1" />
                  Compare
                </Button>
              )}
            </div>
          )}
          {!isNew && client && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary Action: Send Link - Always visible */}
              {client.clientEmail && (
                <Button 
                  onClick={() => sendLinkMutation.mutate({ id: clientId! })} 
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                  disabled={sendLinkMutation.isPending}
                  title="Send email with link to view protocol online"
                >
                  {sendLinkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Send Link</span>
                  <span className="sm:hidden">Send</span>
                </Button>
              )}
              {/* Mark Ready for clients without email */}
              {formData.status === "draft" && !client.clientEmail && (
                <Button 
                  onClick={sendForApproval} 
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Mark Ready
                </Button>
              )}
              {formData.status === "pending_approval" && !client.clientEmail && (
                <Badge variant="secondary" className="py-2 px-3">
                  Awaiting Approval
                </Badge>
              )}
              {/* More Actions Dropdown - Groups secondary actions on all screens */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Layers className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">More Actions</span>
                    <span className="sm:hidden">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={copyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/protocol/${client.accessToken}`, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCloneDialogOpen(true)}>
                    <CopyPlus className="h-4 w-4 mr-2" />
                    Clone
                  </DropdownMenuItem>
                  {client.clientEmail && (client.status === 'pending_approval' || client.status === 'active') && (client as any).paymentStatus !== 'paid' && (
                    <DropdownMenuItem
                      onClick={() => {
                        setPaymentLinkValid(null);
                        setIsPaymentLinkDialogOpen(true);
                      }}
                      className="text-green-600"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Payment Link
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      if (client.accessToken) {
                        window.open(`/protocol/${client.accessToken}?preview=pdf`, '_blank');
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsEmailDialogOpen(true)}
                    disabled={!client.clientEmail}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send PDF to Client
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsEngagementLevelDialogOpen(true)}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Engagement Level
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSyncTemplateId(client.templateId || null);
                      setIsSyncTemplateDialogOpen(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync with Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList 
            ref={tabsRef}
            className="flex items-center overflow-x-auto max-w-full pb-1 touch-pan-x scrollbar-hide"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <TabsTrigger value="details" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors">Details</TabsTrigger>
            {!isNew && <TabsTrigger value="items" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors">Items</TabsTrigger>}
            {!isNew && <TabsTrigger value="pricing" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors">Pricing</TabsTrigger>}
            {!isNew && <TabsTrigger value="comments" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors"><MessageSquare className="h-3 w-3" />Chat{comments.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{comments.length}</Badge>}</TabsTrigger>}
            {!isNew && <TabsTrigger value="coaching-sessions" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors"><FileText className="h-3 w-3" />Sessions</TabsTrigger>}
            {!isNew && <TabsTrigger value="charting" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors"><BarChart3 className="h-3 w-3" />Charting</TabsTrigger>}
            {!isNew && <TabsTrigger value="checkin-history" className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors"><ClipboardList className="h-3 w-3" />Check-ins</TabsTrigger>}
          </TabsList>
          
          {/* Tab Position Indicator - Mobile Only */}
          {!isNew && (
            <div className="flex sm:hidden items-center justify-center gap-1.5 py-2">
              {availableTabs.map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    activeTab === tab 
                      ? 'bg-orange-500 w-4' 
                      : 'bg-gray-100 hover:bg-gray-100'
                  }`}
                  aria-label={`Go to ${tab.replace('-', ' ')} tab`}
                />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">
                {availableTabs.indexOf(activeTab) + 1} of {availableTabs.length}
              </span>
            </div>
          )}

          <DetailsTab
            isNew={isNew}
            clientId={clientId}
            formData={formData}
            setFormData={setFormData}
            templates={templates}
            programs={programs}
            clientProgramInfo={clientProgramInfo}
            selectedProgramId={selectedProgramId}
            setSelectedProgramId={setSelectedProgramId}
            selectedPhaseId={selectedPhaseId}
            setSelectedPhaseId={setSelectedPhaseId}
            selectedProgramPhases={selectedProgramPhases}
            handleSubmit={handleSubmit}
            createMutationPending={createMutation.isPending}
            updateMutationPending={updateMutation.isPending}
            assignProgramMutation={assignProgramMutation}
            advancePhaseMutation={advancePhaseMutation}
            checkinEnabled={checkinSchedule?.isEnabled ?? false}
            previousStatus={previousStatus || client?.status}
            onStatusChangeToActive={(newStatus, prevStatus) => {
              setPreviousStatus(prevStatus);
              setShowCheckinPromptDialog(true);
            }}
          />

          {!isNew && (
            <ProtocolsTab
              clientId={clientId}
              client={client}
              protocolItems={protocolItems}
              setProtocolItems={setProtocolItems}
              allItems={allItems}
              categories={categories}
              itemsByCategory={itemsByCategory}
              clientProgramInfo={clientProgramInfo}
              outOfSyncCount={outOfSyncCount}
              hidePricing={hidePricing}
              selectedItemIds={selectedItemIds}
              setSelectedItemIds={setSelectedItemIds}
              isNewProductDialogOpen={isNewProductDialogOpen}
              setIsNewProductDialogOpen={setIsNewProductDialogOpen}
              isEditItemDialogOpen={isEditItemDialogOpen}
              setIsEditItemDialogOpen={setIsEditItemDialogOpen}
              isBulkEditDialogOpen={isBulkEditDialogOpen}
              setIsBulkEditDialogOpen={setIsBulkEditDialogOpen}
              editingItemId={editingItemId}
              setEditingItemId={setEditingItemId}
              editItemData={editItemData}
              setEditItemData={setEditItemData}
              templateSyncOption={templateSyncOption}
              setTemplateSyncOption={setTemplateSyncOption}
              newProductData={newProductData}
              setNewProductData={setNewProductData}
              bulkEditType={bulkEditType}
              setBulkEditType={setBulkEditType}
              bulkEditValue={bulkEditValue}
              setBulkEditValue={setBulkEditValue}
              handleItemToggle={handleItemToggle}
              handleItemQtyChange={handleItemQtyChange}
              handleRecommendedToggle={handleRecommendedToggle}
              handleBulkToggleCategory={handleBulkToggleCategory}
              handleToggleSelectItem={handleToggleSelectItem}
              handleDeselectAllItems={handleDeselectAllItems}
              handleBulkEdit={handleBulkEdit}
              handleSaveItemCustomization={handleSaveItemCustomization}
              handleAddNewProduct={handleAddNewProduct}
              addClientItemMutation={addClientItemMutation}
              updateItemMutation={updateItemMutation}
              createProtocolItemMutation={createProtocolItemMutation}
              syncWithMasterTemplateMutation={syncWithMasterTemplateMutation}
              trpcUtils={trpcUtils}
              refetchClientItems={refetchClientItems}
              onApplyPreset={async (presetId) => {
                if (!clientId) return;
                try {
                  await applyPresetMutation.mutateAsync({ presetId, clientProtocolId: clientId });
                  refetchClientItems();
                  toast.success('Preset applied successfully');
                } catch (error) {
                  toast.error('Failed to apply preset');
                }
              }}
            />
          )}


          {!isNew && (
            <PricingTab
              clientId={clientId}
              formData={formData}
              setFormData={setFormData}
              totals={totals}
              hidePricing={hidePricing}
              updateMutation={updateMutation}
              client={client}
              onPaymentStatusChange={() => trpcUtils.clientProtocol.get.invalidate({ id: clientId! })}
            />
          )}


          {/* Chat Tab (Comments only) */}
          {!isNew && (
            <CoachNotesTab
              clientId={clientId}
              formData={formData}
              setFormData={setFormData}
              comments={comments}
              newComment={newComment}
              setNewComment={setNewComment}
              loomUrl={loomUrl}
              setLoomUrl={setLoomUrl}
              showLoomInput={showLoomInput}
              setShowLoomInput={setShowLoomInput}
              commentsEndRef={commentsEndRef}
              handleSendComment={handleSendComment}
              createCommentMutation={createCommentMutation}
              updateMutation={updateMutation}
              renderSection="comments"
            />
          )}


          {/* Coaching Sessions Tab */}
          {!isNew && (
            <TabsContent value="coaching-sessions">
              <CoachingSessionsTab clientEmail={client?.clientEmail || ''} clientName={client?.clientName || formData.clientName} />
            </TabsContent>
          )}

          {/* Charting Tab - Parent with Sub-tabs */}
          {!isNew && (
            <TabsContent value="charting">
              <div className="space-y-4">
                {/* Sub-tab Navigation */}
                <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
                  {[
                    { key: 'coach-notes', label: 'Coach Notes', icon: <FileText className="h-3.5 w-3.5" /> },
                    { key: 'internal-notes', label: 'Internal Notes', icon: <StickyNote className="h-3.5 w-3.5" /> },
                    { key: 'intake-forms', label: 'Intake Forms', icon: <ClipboardList className="h-3.5 w-3.5" /> },
                    { key: 'clone-history', label: 'Clone History', icon: <History className="h-3.5 w-3.5" /> },
                    { key: 'progress', label: 'Progress', icon: <Camera className="h-3.5 w-3.5" /> },
                    { key: 'checkin-summary', label: 'Check-In Summary', icon: <Target className="h-3.5 w-3.5" /> },
                    { key: 'checkin-settings', label: 'Check-In Settings', icon: <Clock className="h-3.5 w-3.5" /> },
                    { key: 'notification-history', label: 'Notification History', icon: <Mail className="h-3.5 w-3.5" /> },
                    { key: 'documents', label: 'Documents', icon: <FolderOpen className="h-3.5 w-3.5" /> },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setChartingSubTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-md transition-colors ${
                        chartingSubTab === tab.key
                          ? 'bg-orange-500 text-white font-medium shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Sub-tab Content */}
                {chartingSubTab === 'coach-notes' && (
                  <CoachNotesTab
                    clientId={clientId}
                    formData={formData}
                    setFormData={setFormData}
                    comments={comments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    loomUrl={loomUrl}
                    setLoomUrl={setLoomUrl}
                    showLoomInput={showLoomInput}
                    setShowLoomInput={setShowLoomInput}
                    commentsEndRef={commentsEndRef}
                    handleSendComment={handleSendComment}
                    createCommentMutation={createCommentMutation}
                    updateMutation={updateMutation}
                    isSubTab={true}
                    renderSection="coach-notes"
                  />
                )}

                {chartingSubTab === 'internal-notes' && (
                  <InternalNotesTab 
                    clientId={clientId!} 
                    initialNotes={client?.internalNotes || ''}
                    initialTags={client?.tags ? JSON.parse(client.tags) : []}
                  />
                )}

                {chartingSubTab === 'intake-forms' && (
                  <IntakeFormsSubTab clientEmail={client?.clientEmail || ''} clientName={client?.clientName || formData.clientName} />
                )}

                {chartingSubTab === 'clone-history' && (
                  <div>
                    {cloneHistory.length === 0 ? (
                      <Card className="p-6 text-center text-gray-500">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No clone history available for this client.</p>
                      </Card>
                    ) : (
                      <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><History className="h-5 w-5 text-orange-500" />Clone History</h3>
                        <div className="space-y-3">
                          {cloneHistory.map((clone: any) => (
                            <div key={clone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{clone.versionName || `Version ${clone.id}`}</p>
                                <p className="text-xs text-gray-500">{toLocaleDateStringMT(clone.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}</p>
                                {clone.notes && <p className="text-xs text-gray-600 mt-1">{clone.notes}</p>}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/admin/clients/${clone.id}`)}
                              >
                                <Eye className="h-3 w-3 mr-1" />View
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {chartingSubTab === 'progress' && (
                  <div>
                    <ProgressTab
                      clientName={client?.clientName || formData.clientName}
                      progressPhotos={progressPhotos}
                      journalNotes={journalNotes}
                      isSubTab={true}
                    />
                  </div>
                )}

                {chartingSubTab === 'checkin-summary' && clientId && (
                  <CheckinSummaryTab clientId={clientId} clientName={formData.clientName} />
                )}

                {chartingSubTab === 'checkin-settings' && clientId && (
                  <CheckinSettingsTab clientId={clientId} clientName={formData.clientName} isSubTab={true} engagementLevel={(client as any)?.engagementLevel} />
                )}

                {chartingSubTab === 'notification-history' && clientId && (
                  <ClientNotificationHistorySubTab 
                    clientId={clientId} 
                    clientEmail={client?.clientEmail || ''} 
                    clientName={client?.clientName || formData.clientName} 
                  />
                )}

                {chartingSubTab === 'documents' && clientId && (
                  <DocumentsSubTab
                    clientId={clientId}
                    clientName={client?.clientName || formData.clientName}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {!isNew && clientId && (
            <TabsContent value="checkin-history">
              <CheckinHistoryTab clientProtocolId={clientId} />
            </TabsContent>
          )}

        </Tabs>
      </div>

      {/* Email PDF Dialog */}
      <EmailPdfDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        emailConfirmStep={emailConfirmStep}
        setEmailConfirmStep={setEmailConfirmStep}
        emailAddress={emailAddress}
        setEmailAddress={setEmailAddress}
        clientEmail={client?.clientEmail}
        clientName={client?.clientName}
        clientId={clientId}
        sendEmailMutation={sendEmailMutation}
      />

      {/* Edit Item Customization Dialog */}
      <EditItemDialog
        isOpen={isEditItemDialogOpen}
        onOpenChange={setIsEditItemDialogOpen}
        editItemData={editItemData}
        setEditItemData={setEditItemData}
        hidePricing={hidePricing}
        templateSyncOption={templateSyncOption}
        setTemplateSyncOption={setTemplateSyncOption}
        selectedTemplate={selectedTemplate ?? null}
        onSave={handleSaveItemCustomization}
      />

      {/* Bulk Edit Dialog for Client Protocol Items */}
      <BulkEditDialog
        isOpen={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        selectedItemCount={selectedItemIds.size}
        bulkEditValue={bulkEditValue}
        setBulkEditValue={setBulkEditValue}
        onApply={handleBulkEdit}
      />


      {/* Clone Protocol Dialog */}
      <CloneProtocolDialog
        isOpen={isCloneDialogOpen}
        onOpenChange={setIsCloneDialogOpen}
        clientId={clientId}
        cloneMode={cloneMode}
        setCloneMode={setCloneMode}
        cloneClientName={cloneClientName}
        setCloneClientName={setCloneClientName}
        cloneClientEmail={cloneClientEmail}
        setCloneClientEmail={setCloneClientEmail}
        selectedExistingClientId={selectedExistingClientId}
        setSelectedExistingClientId={setSelectedExistingClientId}
        bulkCloneClients={bulkCloneClients}
        addBulkCloneRow={addBulkCloneRow}
        updateBulkCloneClient={updateBulkCloneClient}
        removeBulkCloneRow={removeBulkCloneRow}
        alsoCreateClientProject={alsoCreateClientProject}
        setAlsoCreateClientProject={setAlsoCreateClientProject}
        protocolItemsCount={protocolItems.length}
        allClients={allClients}
        resetCloneDialog={resetCloneDialog}
        handleCloneProtocol={handleCloneProtocol}
        cloneMutation={cloneMutation}
        cloneToExistingMutation={cloneToExistingMutation}
        bulkCloneMutation={bulkCloneMutation}
      />
      
      {/* Sync with Template Dialog */}
      <Dialog open={isSyncTemplateDialogOpen} onOpenChange={setIsSyncTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync with Template
            </DialogTitle>
            <DialogDescription>
              Add missing items from a template to this protocol. Existing items and their customizations will be preserved. New items will be added as <strong>excluded</strong> — you can then include the ones you want.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              <Select
                value={syncTemplateId?.toString() || ''}
                onValueChange={(val) => setSyncTemplateId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {client && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <p><strong>Current protocol:</strong> {protocolItems.length} items</p>
                <p className="mt-1">Missing items will be added as excluded. Your existing items, customizations, and inclusions will not be changed.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSyncTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!clientId || !syncTemplateId) return;
                syncWithTemplateMutation.mutate({
                  protocolId: clientId,
                  templateId: syncTemplateId,
                });
              }}
              disabled={!syncTemplateId || syncWithTemplateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {syncWithTemplateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Sync Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Protocol Version Dialog */}
      <Dialog open={isNewVersionDialogOpen} onOpenChange={setIsNewVersionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Create New Protocol Version
            </DialogTitle>
            <DialogDescription>
              Create a new protocol version for {client?.clientName}. The current version will be marked as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="versionName">Version Name</Label>
              <Input
                id="versionName"
                placeholder="e.g., Q2 2026 Protocol, Phase 2, Maintenance"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Give this version a descriptive name to identify it later
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="versionNotes">Version Notes (Optional)</Label>
              <Textarea
                id="versionNotes"
                placeholder="Document what changed in this version, e.g., 'Updated peptide dosages for Q2, added new supplements for gut health'"
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes help track why this version was created
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Starting Point</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="copyItems"
                    checked={copyItemsFromPrevious}
                    onCheckedChange={(checked) => {
                      setCopyItemsFromPrevious(checked as boolean);
                      if (checked) setNewVersionTemplateId(null);
                    }}
                  />
                  <Label htmlFor="copyItems" className="text-sm font-normal cursor-pointer">
                    Copy items from current protocol
                  </Label>
                </div>
                
                <div className="text-sm text-muted-foreground">— or —</div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-normal">Start from a template</Label>
                  <Select
                    value={newVersionTemplateId?.toString() || ''}
                    onValueChange={(value) => {
                      setNewVersionTemplateId(value && value !== 'none' ? parseInt(value) : null);
                      if (value && value !== 'none') setCopyItemsFromPrevious(false);
                    }}
                    disabled={copyItemsFromPrevious}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template (start empty)</SelectItem>
                      {templates?.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {versionHistory.length > 0 && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Version History
                </Label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {versionHistory.map((version: any) => (
                    <div key={version.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {version.isActiveVersion && <Badge variant="default" className="text-[10px] px-1">Current</Badge>}
                        {version.versionName || `Version ${version.version}`}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {version.status} • {toLocaleDateStringMT(version.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewVersionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!clientId) {
                  toast.error('Cannot create new version: No protocol loaded.');
                  return;
                }
                createNewVersionMutation.mutate({
                  ...(client?.clientId ? { clientId: client.clientId } : { protocolId: clientId }),
                  versionName: newVersionName || undefined,
                  versionNotes: newVersionNotes || undefined,
                  templateId: newVersionTemplateId || undefined,
                  copyItemsFromPrevious,
                });
              }}
              disabled={createNewVersionMutation.isPending}
            >
              {createNewVersionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment Link Preview Dialog */}
      <Dialog open={isPaymentLinkDialogOpen} onOpenChange={setIsPaymentLinkDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Send Payment Link
            </DialogTitle>
            <DialogDescription>
              Send a payment reminder email with a direct link to the payment portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Link Preview */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Link Preview
              </Label>
              <div className="bg-gray-100 dark:bg-gray-100 rounded-lg p-3 font-mono text-sm break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/protocol/${client?.accessToken}` : `https://peptidecoach.pro/protocol/${client?.accessToken}`}
              </div>
            </div>

            {/* Link Validation */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Link Validation
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setPaymentLinkValidating(true);
                    setPaymentLinkValid(null);
                    try {
                      const response = await fetch(`/protocol/${client?.accessToken}`, { method: 'HEAD' });
                      setPaymentLinkValid(response.ok);
                    } catch {
                      setPaymentLinkValid(false);
                    }
                    setPaymentLinkValidating(false);
                  }}
                  disabled={paymentLinkValidating}
                >
                  {paymentLinkValidating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Test Link
                </Button>
                {paymentLinkValid === true && (
                  <span className="text-green-600 flex items-center gap-1 text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Link is valid
                  </span>
                )}
                {paymentLinkValid === false && (
                  <span className="text-red-600 flex items-center gap-1 text-sm">
                    <AlertCircle className="h-4 w-4" /> Link may not be accessible
                  </span>
                )}
              </div>
            </div>

            {/* Recipient Info */}
            <div className="space-y-2">
              <Label>Recipient</Label>
              <div className="bg-gray-100 dark:bg-gray-100 rounded-lg p-3">
                <div className="font-medium">{client?.clientName}</div>
                <div className="text-sm text-muted-foreground">{client?.clientEmail}</div>
              </div>
            </div>

            {/* Email Preview */}
            <div className="space-y-2">
              <Label>Email Content</Label>
              <div className="bg-gray-100 dark:bg-gray-100 rounded-lg p-3 text-sm space-y-2">
                <div><strong>Subject:</strong> Complete Your Payment - {client?.clientName}</div>
                <div className="text-muted-foreground">
                  This email contains a direct link to the payment portal where the client can complete their protocol payment.
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPaymentLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (clientId && client?.clientEmail) {
                  sendPaymentLinkMutation.mutate({ id: clientId });
                }
              }}
              disabled={sendPaymentLinkMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendPaymentLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Payment Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Comparison Dialog */}
      {client && versionHistory.length > 1 && (
        <VersionComparisonDialog
          open={isComparisonDialogOpen}
          onOpenChange={setIsComparisonDialogOpen}
          clientId={client.clientId ?? undefined}
          currentProtocolId={client.id}
          versionHistory={versionHistory.map(v => ({
            id: v.id,
            version: v.version || 1,
            versionName: v.versionName,
            versionNotes: v.versionNotes || null,
            status: v.status,
            createdAt: v.createdAt?.toString() || new Date().toISOString(),
            isActiveVersion: v.isActiveVersion || false,
          }))}
          onRollbackComplete={() => {
            trpcUtils.clientProtocol.getVersionHistoryByProtocolId.invalidate();
            trpcUtils.clientProtocol.get.invalidate();
          }}
        />
      )}

      {/* Engagement Level Dialog */}
      <Dialog open={isEngagementLevelDialogOpen} onOpenChange={setIsEngagementLevelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Engagement Level</DialogTitle>
            <DialogDescription>
              Set the coaching engagement tier for this client. This is visible to the client on their portal but only adjustable by admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { value: 'full_coaching', label: 'Full Coaching', desc: 'Active coaching with weekly check-ins', color: 'bg-green-100 border-green-500 text-green-800' },
              { value: 'self_guided_checkins', label: 'Self-Guided + Check-ins', desc: 'No active coaching, weekly check-ins continue', color: 'bg-blue-100 border-blue-500 text-blue-800' },
              { value: 'protocol_only', label: 'Protocol Only', desc: 'No coaching, no check-ins — protocol access only', color: 'bg-gray-100 border-gray-400 text-gray-700' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (client) {
                    updateEngagementLevelMutation.mutate({ id: client.id, engagementLevel: option.value as any });
                  }
                }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  (client as any)?.engagementLevel === option.value
                    ? `${option.color} border-current ring-2 ring-offset-1`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                  </div>
                  {(client as any)?.engagementLevel === option.value && (
                    <CheckCircle2 className="h-5 w-5 text-current" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {updateEngagementLevelMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </div>
          )}
          {/* Engagement Level Change History */}
          <EngagementHistorySection protocolId={client?.id} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}


// Intake Forms Sub-Tab Component for Charting
function IntakeFormsSubTab({ clientEmail, clientName }: { clientEmail: string; clientName: string }) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const utils = trpc.useUtils();
  const { data: enrollments } = trpc.transformation.getAllEnrollments.useQuery(
    { status: undefined, limit: 200 },
    { enabled: !!clientEmail }
  );
  const clientEnrollment = enrollments?.find((e: any) => 
    (e.userEmail === clientEmail || e.email === clientEmail) && e.coachingFeePaid
  ) || enrollments?.find((e: any) => 
    e.userEmail === clientEmail || e.email === clientEmail
  );
  const { data: intakeFormData } = trpc.transformation.getIntakeForm.useQuery(
    { enrollmentId: clientEnrollment?.id || 0 },
    { enabled: !!clientEnrollment?.id }
  );
  const updateFieldMutation = trpc.transformation.adminUpdateIntakeFormFields.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.updatedFields.join(', ')}`);
      setEditingField(null);
      setEditValue('');
      utils.transformation.getIntakeForm.invalidate({ enrollmentId: clientEnrollment?.id || 0 });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Map from display label to DB field name for editable fields
  const editableFieldMap: Record<string, string> = {
    'Primary Goal': 'primaryGoal',
    'Secondary Goal': 'secondaryGoal',
    'Additional Goals': 'additionalGoals',
    'Alcohol': 'alcoholUse',
    'Nicotine': 'nicotineUse',
    'Cannabis': 'cannabisUse',
    'Other Substances': 'otherSubstanceUse',
    'Additional Context': 'additionalContext',
    'Top 3 Goals': 'top3Goals',
    'Previous Peptide Experience': 'previousPeptideExperience',
    'Medical Issues': 'medicalIssues',
    'Medical Diagnoses': 'medicalDiagnoses',
    'Hormonal Status': 'hormonalStatus',
    'Digestive Issues': 'digestiveIssues',
    'Food Cravings': 'foodCravings',
    'Activity Routine': 'physicalActivityRoutine',
    'Physical Limitations': 'physicalLimitations',
    'Sleep Duration': 'sleepDuration',
    'Main Stressors': 'mainStressors',
    'Stress Management': 'stressManagementMethods',
    'Mental Health History': 'mentalHealthHistory',
    'Psych Medications': 'psychMedications',
    'Other Concerns': 'otherConcerns',
    'Other Goal Support': 'otherGoalSupport',
    'Full Name': 'fullName',
    'Phone': 'phone',
  };

  const handleStartEdit = (label: string, currentValue: string | null) => {
    const fieldKey = editableFieldMap[label];
    if (!fieldKey) return;
    setEditingField(label);
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = (label: string) => {
    const fieldKey = editableFieldMap[label];
    if (!fieldKey || !clientEnrollment) return;
    updateFieldMutation.mutate({
      enrollmentId: clientEnrollment.id,
      fields: { [fieldKey]: editValue },
    });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  if (!clientEmail) return <Card className="p-6 text-center text-gray-500"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No email found for this client.</p></Card>;
  if (!clientEnrollment) return <Card className="p-6 text-center text-gray-500"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No enrollment found for this client.</p></Card>;
  if (!intakeFormData?.data) return <Card className="p-6 text-center text-gray-500"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No intake form data available yet.</p></Card>;

  const d = intakeFormData.data;
  const exportToPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const name = d.fullName || clientName || 'Client';
    let y = 20;
    doc.setFontSize(18); doc.setTextColor(30, 58, 95);
    doc.text('Intake Form Responses', 105, y, { align: 'center' }); y += 8;
    doc.setFontSize(12); doc.setTextColor(100, 100, 100);
    doc.text(name, 105, y, { align: 'center' }); y += 5;
    if (intakeFormData.submittedAt) {
      doc.setFontSize(9);
      doc.text(`Submitted: ${toLocaleDateStringMT(intakeFormData.submittedAt)}`, 105, y, { align: 'center' });
    }
    y += 10;
    const pdfSections = [
      { title: 'Demographics', fields: [
        { label: 'Full Name', value: d.fullName }, { label: 'Date of Birth', value: d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null },
        { label: 'Sex', value: d.sex }, { label: 'Email', value: d.email }, { label: 'Phone', value: d.phone },
        { label: 'Address', value: [d.streetAddress, d.city, d.stateProvince, d.zipCode, d.country].filter(Boolean).join(', ') || null },
      ]},
      { title: 'Body Composition', fields: [
        { label: 'Height', value: d.height }, { label: 'Current Weight', value: d.currentWeight ? `${d.currentWeight} lbs` : null },
        { label: 'Goal Weight', value: d.goalWeight ? `${d.goalWeight} lbs` : null }, { label: 'Body Fat %', value: d.bodyFatPercentage },
      ]},
      { title: 'Goals & Experience', fields: [
        { label: 'Peptide Goals', value: Array.isArray(d.peptideGoals) ? d.peptideGoals.join(', ') : d.peptideGoals },
        { label: 'Primary Goal', value: d.primaryGoal }, { label: 'Secondary Goal', value: d.secondaryGoal },
        { label: 'Additional Goals', value: d.additionalGoals }, { label: 'Previous Peptide Experience', value: d.previousPeptideExperience },
        { label: 'Top 3 Goals', value: d.top3Goals }, { label: 'Weekly Time Commitment', value: d.weeklyTimeCommitment },
      ]},
      { title: 'Health & Medical', fields: [
        { label: 'Medical Issues', value: d.medicalIssues },
        { label: 'Current Medications', value: Array.isArray(d.currentMedications) ? d.currentMedications.join(', ') : d.currentMedications },
        { label: 'Current Supplements', value: Array.isArray(d.currentSupplements) ? d.currentSupplements.join(', ') : d.currentSupplements },
        { label: 'Food Intolerances', value: Array.isArray(d.foodIntolerances) ? d.foodIntolerances.join(', ') : d.foodIntolerances },
        { label: 'Digestive Issues', value: d.digestiveIssues }, { label: 'Medical Diagnoses', value: d.medicalDiagnoses },
        { label: 'Hormonal Status', value: d.hormonalStatus }, { label: 'Food Cravings', value: d.foodCravings },
      ]},
      { title: 'Physical Activity', fields: [
        { label: 'Activity Routine', value: d.physicalActivityRoutine }, { label: 'Physical Limitations', value: d.physicalLimitations },
      ]},
      { title: 'Sleep & Stress', fields: [
        { label: 'Sleep Duration', value: d.sleepDuration }, { label: 'Sleep Quality', value: d.sleepQuality ? `${d.sleepQuality}/5` : null },
        { label: 'Stress Level', value: d.stressLevel }, { label: 'Main Stressors', value: d.mainStressors },
        { label: 'Stress Management', value: d.stressManagementMethods },
      ]},
      { title: 'Substance Use', fields: [
        { label: 'Alcohol', value: d.alcoholUse }, { label: 'Nicotine', value: d.nicotineUse },
        { label: 'Cannabis', value: d.cannabisUse }, { label: 'Other Substances', value: d.otherSubstanceUse },
      ]},
      { title: 'Aggressiveness & Readiness', fields: [
        { label: 'Protocol Aggressiveness', value: d.aggressivenessScale ? `${d.aggressivenessScale}/5` : null },
        { label: 'Financial Aggressiveness', value: d.financialAggressivenessScale ? `${d.financialAggressivenessScale}/5` : null },
        { label: 'Organizational Capacity', value: d.organizationalCapacityScale ? `${d.organizationalCapacityScale}/5` : null },
      ]},
      { title: 'Mental Health & Safety', fields: [
        { label: 'Safety Screen Flags', value: Array.isArray(d.safetyScreenFlags) ? d.safetyScreenFlags.join(', ') : d.safetyScreenFlags },
        { label: 'Mental Health History', value: d.mentalHealthHistory }, { label: 'Psych Medications', value: d.psychMedications },
      ]},
      { title: 'Emergency Contact', fields: [
        { label: 'Name', value: d.emergencyContactName }, { label: 'Relationship', value: d.emergencyContactRelationship },
        { label: 'Phone', value: d.emergencyContactPhone },
      ]},
      { title: 'Wearables & Tracking', fields: [
        { label: 'Wearable Devices', value: Array.isArray(d.wearableDevices) ? d.wearableDevices.join(', ') : d.wearableDevices },
        { label: 'Metrics Tracked', value: d.typicalMetricsTracked },
      ]},
      { title: 'Referral', fields: [
        { label: 'Source', value: d.referralSource }, { label: 'Referral Name', value: d.referralName }, { label: 'Other', value: d.referralOther },
      ]},
      { title: 'Additional Notes', fields: [
        { label: 'Other Concerns', value: d.otherConcerns }, { label: 'Additional Context', value: d.additionalContext },
        { label: 'Other Goal Support', value: d.otherGoalSupport },
      ]},
    ];
    for (const section of pdfSections) {
      const filled = section.fields.filter(f => f.value && f.value !== '[]' && f.value !== 'null');
      if (filled.length === 0) continue;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.setTextColor(30, 58, 95); doc.text(section.title, 14, y); y += 2;
      doc.setDrawColor(200, 200, 200); doc.line(14, y, 196, y); y += 5;
      for (const field of filled) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setFontSize(10); doc.setTextColor(120, 120, 120); doc.text(`${field.label}:`, 16, y);
        doc.setTextColor(30, 30, 30); const val = String(field.value);
        const lines = doc.splitTextToSize(val, 120); doc.text(lines, 65, y); y += Math.max(6, lines.length * 5);
      }
      y += 4;
    }
    doc.save(`intake-form-${name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast.success('PDF downloaded!');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-orange-500" />
          Intake Form {intakeFormData.isSubmitted ? '(Completed)' : '(In Progress)'}
        </h3>
        <Button size="sm" variant="outline" onClick={exportToPdf}>
          <Download className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>
      {intakeFormData.submittedAt && (
        <p className="text-xs text-gray-500 mb-4">Submitted: {toLocaleDateStringMT(intakeFormData.submittedAt)}</p>
      )}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {[
          { title: 'Demographics', fields: [
            { label: 'Full Name', value: d.fullName }, { label: 'Date of Birth', value: d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null },
            { label: 'Sex', value: d.sex }, { label: 'Email', value: d.email }, { label: 'Phone', value: d.phone },
            { label: 'Address', value: [d.streetAddress, d.city, d.stateProvince, d.zipCode, d.country].filter(Boolean).join(', ') || null },
          ]},
          { title: 'Body Composition', fields: [
            { label: 'Height', value: d.height }, { label: 'Current Weight', value: d.currentWeight ? `${d.currentWeight} lbs` : null },
            { label: 'Goal Weight', value: d.goalWeight ? `${d.goalWeight} lbs` : null }, { label: 'Body Fat %', value: d.bodyFatPercentage },
          ]},
          { title: 'Goals & Experience', fields: [
            { label: 'Peptide Goals', value: Array.isArray(d.peptideGoals) ? d.peptideGoals.join(', ') : d.peptideGoals },
            { label: 'Primary Goal', value: d.primaryGoal }, { label: 'Secondary Goal', value: d.secondaryGoal },
            { label: 'Additional Goals', value: d.additionalGoals }, { label: 'Previous Peptide Experience', value: d.previousPeptideExperience },
            { label: 'Top 3 Goals', value: d.top3Goals }, { label: 'Weekly Time Commitment', value: d.weeklyTimeCommitment },
          ]},
          { title: 'Health & Medical', fields: [
            { label: 'Medical Issues', value: d.medicalIssues },
            { label: 'Current Medications', value: Array.isArray(d.currentMedications) ? d.currentMedications.join(', ') : d.currentMedications },
            { label: 'Current Supplements', value: Array.isArray(d.currentSupplements) ? d.currentSupplements.join(', ') : d.currentSupplements },
            { label: 'Food Intolerances', value: Array.isArray(d.foodIntolerances) ? d.foodIntolerances.join(', ') : d.foodIntolerances },
            { label: 'Digestive Issues', value: d.digestiveIssues }, { label: 'Medical Diagnoses', value: d.medicalDiagnoses },
            { label: 'Hormonal Status', value: d.hormonalStatus }, { label: 'Food Cravings', value: d.foodCravings },
          ]},
          { title: 'Physical Activity', fields: [
            { label: 'Activity Routine', value: d.physicalActivityRoutine }, { label: 'Physical Limitations', value: d.physicalLimitations },
          ]},
          { title: 'Sleep & Stress', fields: [
            { label: 'Sleep Duration', value: d.sleepDuration }, { label: 'Sleep Quality', value: d.sleepQuality ? `${d.sleepQuality}/5` : null },
            { label: 'Stress Level', value: d.stressLevel }, { label: 'Main Stressors', value: d.mainStressors },
            { label: 'Stress Management', value: d.stressManagementMethods },
          ]},
          { title: 'Substance Use', fields: [
            { label: 'Alcohol', value: d.alcoholUse }, { label: 'Nicotine', value: d.nicotineUse },
            { label: 'Cannabis', value: d.cannabisUse }, { label: 'Other Substances', value: d.otherSubstanceUse },
          ]},
          { title: 'Aggressiveness & Readiness', fields: [
            { label: 'Protocol Aggressiveness', value: d.aggressivenessScale ? `${d.aggressivenessScale}/5` : null },
            { label: 'Financial Aggressiveness', value: d.financialAggressivenessScale ? `${d.financialAggressivenessScale}/5` : null },
            { label: 'Organizational Capacity', value: d.organizationalCapacityScale ? `${d.organizationalCapacityScale}/5` : null },
          ]},
          { title: 'Mental Health & Safety', fields: [
            { label: 'Safety Screen Flags', value: Array.isArray(d.safetyScreenFlags) ? d.safetyScreenFlags.join(', ') : d.safetyScreenFlags },
            { label: 'Mental Health History', value: d.mentalHealthHistory }, { label: 'Psych Medications', value: d.psychMedications },
          ]},
          { title: 'Emergency Contact', fields: [
            { label: 'Name', value: d.emergencyContactName }, { label: 'Relationship', value: d.emergencyContactRelationship },
            { label: 'Phone', value: d.emergencyContactPhone },
          ]},
          { title: 'Wearables & Tracking', fields: [
            { label: 'Wearable Devices', value: Array.isArray(d.wearableDevices) ? d.wearableDevices.join(', ') : d.wearableDevices },
            { label: 'Metrics Tracked', value: d.typicalMetricsTracked },
          ]},
          { title: 'Referral', fields: [
            { label: 'Source', value: d.referralSource }, { label: 'Referral Name', value: d.referralName }, { label: 'Other', value: d.referralOther },
          ]},
          { title: 'Additional Notes', fields: [
            { label: 'Other Concerns', value: d.otherConcerns }, { label: 'Additional Context', value: d.additionalContext },
            { label: 'Other Goal Support', value: d.otherGoalSupport },
          ]},
        ].map((section) => {
          // Show fields that have values OR are editable (so admin can fill in missing ones)
          const displayFields = section.fields.filter(f => {
            const hasValue = f.value && f.value !== '[]' && f.value !== 'null';
            const isEditable = !!editableFieldMap[f.label];
            return hasValue || isEditable;
          });
          if (displayFields.length === 0) return null;
          return (
            <div key={section.title} className="border-b border-gray-100 pb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{section.title}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {displayFields.map((field) => {
                  const isEditable = !!editableFieldMap[field.label];
                  const isEditing = editingField === field.label;
                  const isEmpty = !field.value || field.value === '[]' || field.value === 'null';
                  
                  if (isEditing) {
                    return (
                      <div key={field.label} className="text-sm col-span-2 bg-blue-50 p-2 rounded">
                        <Label className="text-xs text-gray-600 mb-1 block">{field.label}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 text-sm flex-1"
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(field.label);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button size="sm" variant="default" className="h-8 px-2" onClick={() => handleSaveEdit(field.label)} disabled={updateFieldMutation.isPending}>
                            {updateFieldMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={field.label} className={`text-sm group flex items-start gap-1 ${isEmpty ? 'opacity-60' : ''}`}>
                      <div className="flex-1">
                        <span className="text-gray-500">{field.label}:</span>{' '}
                        {isEmpty ? (
                          <span className="text-amber-600 italic text-xs">Not provided</span>
                        ) : (
                          <span className="text-gray-900">{String(field.value)}</span>
                        )}
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => handleStartEdit(field.label, isEmpty ? null : String(field.value))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-blue-600"
                          title={isEmpty ? `Add ${field.label}` : `Edit ${field.label}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


// Internal Notes & Tags Tab Component with Rich Text Editor, Auto-Save, and History
function InternalNotesTab({ clientId, initialNotes, initialTags }: { clientId: number; initialNotes: string; initialTags: string[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  
  const { data: allTags = [] } = trpc.clientProtocol.getAllTags.useQuery();
  const trpcUtils = trpc.useUtils();
  
  const updateNotesMutation = trpc.clientProtocol.updateNotes.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateTagsMutation = trpc.clientProtocol.updateTags.useMutation({
    onSuccess: () => {
      toast.success('Tags updated');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Auto-save hook for internal notes
  const { status: autoSaveStatus, lastSavedAt, debouncedSave, saveNow, setInitialContent } = useAutoSave({
    debounceMs: 1500,
    onSave: async (content) => {
      await updateNotesMutation.mutateAsync({ id: clientId, internalNotes: content });
      // Invalidate history query to show new entry
      trpcUtils.clientProtocol.getNotesHistory.invalidate({ clientProtocolId: clientId, noteType: 'internal_notes' });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
  
  // Set initial content on mount
  useEffect(() => {
    setInitialContent(initialNotes);
  }, [initialNotes, setInitialContent]);
  
  const handleNotesChange = (content: string) => {
    setNotes(content);
    debouncedSave(content);
  };
  
  const handleRestoreVersion = (content: string) => {
    setNotes(content);
    saveNow(content);
    toast.success('Version restored');
  };
  
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      updateTagsMutation.mutate({ id: clientId, tags: newTags });
    }
    setNewTag('');
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    updateTagsMutation.mutate({ id: clientId, tags: newTags });
  };
  
  const suggestedTags = allTags.filter(t => !tags.includes(t));
  
  return (
    <div className="space-y-6">
      {/* Internal Notes Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Internal Notes
              </CardTitle>
              <CardDescription>
                Private notes visible only to coaches. These notes are NOT shown to clients.
              </CardDescription>
            </div>
            <NotesHistoryViewer
              clientProtocolId={clientId}
              noteType="internal_notes"
              onRestore={handleRestoreVersion}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Notes</Label>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    <span className="font-medium">Saving...</span>
                  </span>
                )}
                {autoSaveStatus === 'retrying' && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                    <span className="font-medium">Retrying save...</span>
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-medium">Saved</span>
                    {lastSavedAt && (
                      <span className="text-muted-foreground font-normal">
                        {toLocaleTimeStringMT(lastSavedAt, { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    )}
                  </span>
                )}
                {autoSaveStatus === 'error' && (
                  <span className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="font-medium">Save failed</span>
                  </span>
                )}
                {autoSaveStatus === 'idle' && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {lastSavedAt ? (
                      <>
                        <span>Last saved</span>
                        <span className="font-medium">
                          {toLocaleTimeStringMT(lastSavedAt, { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </>
                    ) : (
                      <span>Auto-save enabled</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <RichTextEditor
              content={notes}
              onChange={handleNotesChange}
              placeholder="Add internal notes about this client...

Examples:
• Communication preferences
• Special considerations
• Follow-up reminders
• Progress observations"
              minHeight="250px"
            />
            <p className="text-xs text-muted-foreground">
              These notes are for internal use only and will not be visible to the client. Changes are saved automatically.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Tags Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
          <CardDescription>
            Add tags to organize and filter clients. Tags help you quickly find clients with similar characteristics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Tags */}
          <div className="space-y-2">
            <Label>Current Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags added yet</p>
              ) : (
                tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
          
          {/* Add New Tag */}
          <div className="space-y-2">
            <Label htmlFor="newTag">Add New Tag</Label>
            <div className="flex gap-2">
              <Input
                id="newTag"
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
              />
              <Button onClick={() => handleAddTag(newTag)} disabled={!newTag.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
          
          {/* Suggested Tags */}
          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <Label>Suggested Tags</Label>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.slice(0, 10).map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleAddTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click a tag to add it to this client
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Session note templates
const SESSION_TEMPLATES: Record<string, { label: string; content: string }> = {
  discovery: {
    label: 'Strategy Session',
    content: `## Strategy Session Notes\n\n**Client Goals:**\n- \n\n**Current Health Status:**\n- \n\n**Key Concerns:**\n- \n\n**Recommended Approach:**\n- \n\n**Action Items:**\n- [ ] \n\n**Next Steps:**\n- Schedule follow-up: \n- Protocol design target date: `,
  },
  check_in: {
    label: 'Check-In',
    content: `## Check-In Notes\n\n**Progress Since Last Session:**\n- \n\n**Current Protocol Adherence:**\n- Compliance level: \n- Any missed doses: \n\n**Side Effects / Concerns:**\n- \n\n**Adjustments Made:**\n- \n\n**Next Check-In:** `,
  },
  training: {
    label: 'Training Session',
    content: `## Training Session Notes\n\n**Training Topics Covered:**\n- \n\n**Reconstitution Review:**\n- Technique: \n- Dosing confirmed: \n\n**Client Confidence Level:** /10\n\n**Questions Addressed:**\n- \n\n**Follow-Up Items:**\n- [ ] `,
  },
  reconstitution: {
    label: 'Reconstitution Session',
    content: `## Reconstitution Session Notes\n\n**Products Reviewed:**\n- \n\n**Reconstitution Steps Covered:**\n- BAC water volume: \n- Storage instructions: \n\n**Injection Technique:**\n- Site rotation: \n\n**Client Demonstrated:**\n- [ ] Proper reconstitution\n- [ ] Correct dosing\n- [ ] Safe injection technique\n\n**Notes:** `,
  },
  follow_up: {
    label: 'Follow-Up',
    content: `## Follow-Up Notes\n\n**Reason for Follow-Up:**\n- \n\n**Updates Since Last Contact:**\n- \n\n**Resolution / Outcome:**\n- \n\n**Action Items:**\n- [ ] `,
  },
  ad_hoc: {
    label: 'General Note',
    content: '',
  },
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  discovery: 'Strategy Session',
  check_in: 'Check-In',
  training: 'Training',
  reconstitution: 'Reconstitution',
  follow_up: 'Follow-Up',
  ad_hoc: 'General Note',
};

const NOTE_TYPE_COLORS: Record<string, string> = {
  discovery: 'bg-purple-100 text-purple-800',
  check_in: 'bg-green-100 text-green-800',
  training: 'bg-blue-100 text-blue-800',
  reconstitution: 'bg-cyan-100 text-cyan-800',
  follow_up: 'bg-amber-100 text-amber-800',
  ad_hoc: 'bg-gray-100 text-gray-800',
};

// Coaching Sessions Tab - Full CRUD for session notes
function CoachingSessionsTab({ clientEmail, clientName }: { clientEmail: string; clientName: string }) {
  // State for add note form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteSessionType, setNewNoteSessionType] = useState<string>('ad_hoc');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for editing
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Query all session notes for this client by email
  const { data: clientSessionNotes, isLoading, refetch: refetchNotes } = trpc.transformation.getClientSessionNotes.useQuery(
    { clientEmail },
    { enabled: !!clientEmail }
  );

  // We need the enrollment ID to create notes - get client's enrollments
  const { data: enrollments } = trpc.transformation.getAllEnrollments.useQuery(
    { status: undefined, limit: 200 },
    { enabled: !!clientEmail }
  );

  // Find the client's most recent active enrollment
  const clientEnrollment = enrollments?.find((e: any) => 
    (e.userEmail === clientEmail || e.email === clientEmail) && e.coachingFeePaid
  ) || enrollments?.find((e: any) => 
    e.userEmail === clientEmail || e.email === clientEmail
  );

  // Mutations
  const createNoteMutation = trpc.transformation.createSessionNote.useMutation({
    onSuccess: () => {
      toast.success('Session note added');
      setNewNoteContent('');
      setShowAddForm(false);
      refetchNotes();
    },
    onError: (error) => toast.error('Failed to add note', { description: error.message }),
  });

  const updateNoteMutation = trpc.transformation.updateSessionNote.useMutation({
    onSuccess: () => {
      toast.success('Note updated');
      setEditingNoteId(null);
      refetchNotes();
    },
    onError: (error) => toast.error('Failed to update note', { description: error.message }),
  });

  const deleteNoteMutation = trpc.transformation.deleteSessionNote.useMutation({
    onSuccess: () => {
      toast.success('Note deleted');
      refetchNotes();
    },
    onError: (error) => toast.error('Failed to delete note', { description: error.message }),
  });

  const pinNoteMutation = trpc.transformation.updateSessionNote.useMutation({
    onSuccess: () => refetchNotes(),
  });

  if (!clientEmail) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No email address on file. Coaching session notes are linked by client email.</p>
        </CardContent>
      </Card>
    );
  }

  const handleUseTemplate = (templateKey: string) => {
    setNewNoteSessionType(templateKey);
    setNewNoteContent(SESSION_TEMPLATES[templateKey]?.content || '');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Coaching Session Notes
            </CardTitle>
            <CardDescription>
              All coaching session notes for {clientName}
            </CardDescription>
          </div>
          {clientEnrollment && (
            <Button
              onClick={() => {
                setShowAddForm(true);
                setNewNoteContent('');
                setNewNoteSessionType('ad_hoc');
                setNewNoteDate(new Date().toISOString().split('T')[0]);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
              size="sm"
            >
              <Plus className="h-4 w-4" /> Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Note Form */}
        {showAddForm && clientEnrollment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-900">New Session Note</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-blue-800">Session Type</Label>
                <Select value={newNoteSessionType} onValueChange={(val) => {
                  setNewNoteSessionType(val);
                  if (!newNoteContent.trim()) {
                    setNewNoteContent(SESSION_TEMPLATES[val]?.content || '');
                  }
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discovery">Strategy Session</SelectItem>
                    <SelectItem value="check_in">Check-In</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="reconstitution">Reconstitution</SelectItem>
                    <SelectItem value="follow_up">Follow-Up</SelectItem>
                    <SelectItem value="ad_hoc">General Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-blue-800">Session Date</Label>
                <Input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => setNewNoteDate(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            {/* Template Buttons */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Use Template</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(SESSION_TEMPLATES)
                  .filter(([key]) => key !== 'ad_hoc')
                  .map(([key, template]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleUseTemplate(key)}
                    >
                      {template.label}
                    </Button>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 text-red-600 hover:text-red-700"
                  onClick={() => setNewNoteContent('')}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm text-blue-800">Notes</Label>
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Document session observations, client progress, action items, and follow-up tasks..."
                className="min-h-[150px] bg-white font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                disabled={!newNoteContent.trim() || createNoteMutation.isPending}
                onClick={() => {
                  createNoteMutation.mutate({
                    enrollmentId: clientEnrollment.id,
                    sessionDate: newNoteDate,
                    sessionType: newNoteSessionType as any,
                    content: newNoteContent.trim(),
                  });
                }}
              >
                {createNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Note
              </Button>
            </div>
          </div>
        )}

        {!clientEnrollment && !isLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            No active enrollment found for this client. Session notes require an enrollment to be linked to.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : clientSessionNotes && clientSessionNotes.length > 0 ? (
          <div className="space-y-3">
            {clientSessionNotes.map((note: any) => (
              <div key={note.id} className={`border rounded-lg p-4 ${note.is_pinned ? 'border-amber-300 bg-amber-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={NOTE_TYPE_COLORS[note.session_type] || 'bg-gray-100 text-gray-800'}>
                      {NOTE_TYPE_LABELS[note.session_type] || note.session_type}
                    </Badge>
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {toLocaleDateStringMT(note.session_date, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                    </span>
                    {note.is_pinned && <Pin className="h-3 w-3 text-amber-600" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => pinNoteMutation.mutate({ noteId: note.id, isPinned: !note.is_pinned })}
                      title={note.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      {note.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditingNoteContent(note.content);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm('Delete this session note?')) {
                          deleteNoteMutation.mutate({ noteId: note.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      className="min-h-[100px] bg-white font-mono text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={updateNoteMutation.isPending}
                        onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editingNoteContent })}
                      >
                        {updateNoteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  by {note.coach_name || 'Admin'} &middot; {toLocaleDateStringMT(note.created_at)}

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No coaching session notes yet.</p>
            {clientEnrollment && (
              <Button
                onClick={() => {
                  setShowAddForm(true);
                  setNewNoteContent('');
                  setNewNoteSessionType('ad_hoc');
                  setNewNoteDate(new Date().toISOString().split('T')[0]);
                }}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                size="sm"
              >
                <Plus className="h-4 w-4" /> Add First Note
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// Engagement Level Change History Section
function EngagementHistorySection({ protocolId }: { protocolId?: number }) {
  const { data: history } = trpc.clientProtocol.getEngagementHistory.useQuery(
    { protocolId: protocolId! },
    { enabled: !!protocolId }
  );

  const LEVEL_LABELS: Record<string, string> = {
    full_coaching: 'Full Coaching',
    self_guided_checkins: 'Self-Guided + Check-ins',
    protocol_only: 'Protocol Only',
  };

  const LEVEL_COLORS: Record<string, string> = {
    full_coaching: 'text-green-700 bg-green-50',
    self_guided_checkins: 'text-blue-700 bg-blue-50',
    protocol_only: 'text-gray-600 bg-gray-50',
  };

  if (!history || history.length === 0) return null;

  return (
    <div className="border-t pt-4 mt-2">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Change History</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.map((entry: any) => (
          <div key={entry.id} className="flex items-start gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                {entry.oldLevel && (
                  <>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LEVEL_COLORS[entry.oldLevel] || 'bg-gray-100'}`}>
                      {LEVEL_LABELS[entry.oldLevel] || entry.oldLevel}
                    </span>
                    <span className="text-muted-foreground">&rarr;</span>
                  </>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LEVEL_COLORS[entry.newLevel] || 'bg-gray-100'}`}>
                  {LEVEL_LABELS[entry.newLevel] || entry.newLevel}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5">
                by {entry.changedByName || 'System'} &middot; {toLocaleDateStringMT(entry.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
