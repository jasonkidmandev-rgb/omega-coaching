import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { processMessageForDisplay } from "@/lib/htmlUtils";
import { formatNotesHtml } from "@/lib/notesFormatter";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  Pill,
  Package,
  FileText,
  DollarSign,
  Calendar,
  Info,
  Ban,
  Layers,
  Target,
  ChevronRight,
  MessageSquare,
  Send,
  Video,
  User,
  BookOpen,
  Play,
  Download,
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { SkeletonProtocol } from "@/components/ui/skeleton";
import { useSwipeGesture } from "@/components/SwipeableProtocolItems";
import { toast } from "sonner";
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import ChatRichTextEditor, { type ChatEditorHandle } from "@/components/ChatRichTextEditor";
import { Input } from "@/components/ui/input";
import { generateProtocolPdf } from "@/lib/generateProtocolPdf";
import { Ticket, X, CreditCard, ShoppingCart, MapPin, Edit2, ArrowLeft } from "lucide-react";
import { ClientOnboardingModal } from "@/components/ClientOnboardingModal";
import { ClientProgressIndicator } from "@/components/ClientProgressIndicator";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { PaymentStatusWidget } from "@/components/PaymentStatusWidget";
import { ProfileCompletionGate, isProfileComplete } from "@/components/ProfileCompletionGate";
import { useAuth } from "@/_core/hooks/useAuth";
import { getTieredUnitPrice, hasTieredPricing, formatTieredPricing, type PricingTier } from "@/lib/tieredPricing";
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { PricingTierChart } from "@/components/PricingTierChart";
import { PeriodizationOverview, TrainingSplitOverview, CompleteProgramGuide } from "@/components/protocol-sections";

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
  loomVideoUrl: string | null;
  pricingTiers: PricingTier[] | null;
  itemType: string;
  isActive: boolean;
  sortOrder: number;
};

type Category = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
};

export default function ClientProtocol() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  
  // Check for PDF preview mode and chat tab from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const isPdfPreviewMode = searchParams.get('preview') === 'pdf';
  const shouldScrollToChat = searchParams.get('tab') === 'chat' || window.location.hash === '#comments';
  
  // Check if current user is staff (admin/manager/viewer/finance) previewing the protocol
  const { user, loading: authLoading } = useAuth();
  const staffRoles = ['admin', 'manager', 'viewer', 'finance'];
  const isAdminPreview = user?.role ? staffRoles.includes(user.role) : false;
  const [isApproving, setIsApproving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const clientEditorRef = useRef<ChatEditorHandle>(null);
  const [loomUrl, setLoomUrl] = useState("");
  const [showLoomInput, setShowLoomInput] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: number;
    code: string;
    discountPercent: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  // const [isCheckingOut, setIsCheckingOut] = useState(false); // Removed - Stripe checkout removed
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShippingEdit, setShowShippingEdit] = useState(false);
  const [showProfileGate, setShowProfileGate] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    shippingName: '',
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'USA',
    shippingPhone: '',
  });
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  // Swipe navigation state for mobile
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data: protocol, isLoading, refetch } = trpc.clientProtocol.getByToken.useQuery(
    { token: params.token || "", isCoachPreview: isAdminPreview },
    { enabled: !!params.token && !authLoading }
  );

  const { data: protocolItems } = trpc.clientProtocol.getItems.useQuery(
    { clientProtocolId: protocol?.id || 0 },
    { enabled: !!protocol?.id }
  );

  const { data: allItems } = trpc.protocolItem.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: requirements } = trpc.requirements.list.useQuery();
  const { data: programInfo } = trpc.program.getClientProgramInfo.useQuery(
    { clientProtocolId: protocol?.id || 0 },
    { enabled: !!protocol?.id }
  );

  const { data: comments = [], refetch: refetchComments } = trpc.comments.list.useQuery(
    { clientProtocolId: protocol?.id || 0 },
    { enabled: !!protocol?.id }
  );

  // Order history and packing slip for client view
  const { data: orders = [] } = trpc.orders.getOrdersByToken.useQuery(
    { token: params.token || "" },
    { enabled: !!params.token }
  );

  const { data: packingSlip } = trpc.packingSlip.getByProtocolToken.useQuery(
    { token: params.token || "" },
    { enabled: !!params.token }
  );

  // Protocol sections (Periodization, Training Split, Program Guide)
  const { data: protocolSectionsData } = trpc.protocolSections.getAll.useQuery(
    { clientProtocolId: protocol?.id || 0 },
    { enabled: !!protocol?.id }
  );

  const enabledSections = useMemo(() => {
    if (!protocolSectionsData) return { periodization: false, training_split: false, program_guide: false };
    const map: Record<string, boolean> = {};
    for (const s of protocolSectionsData) {
      map[s.sectionType] = s.isEnabled;
    }
    return {
      periodization: map.periodization || false,
      training_split: map.training_split || false,
      program_guide: map.program_guide || false,
    };
  }, [protocolSectionsData]);

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

  // Scroll to top when protocol data first loads - aggressive fix for scroll-to-bottom issue
  const hasScrolledToTop = useRef(false);
  const scrollFixIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useLayoutEffect(() => {
    // Disable browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    if (protocol && !hasScrolledToTop.current) {
      hasScrolledToTop.current = true;
      
      // If ?tab=chat or #comments, scroll to the comments section after a brief delay
      if (shouldScrollToChat) {
        // Wait for the page to render, then scroll to comments
        const scrollToComments = () => {
          const commentsEl = document.getElementById('comments');
          if (commentsEl) {
            commentsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };
        // Use a short delay to ensure the DOM is fully rendered
        setTimeout(scrollToComments, 300);
        // Retry in case content loads late
        setTimeout(scrollToComments, 800);
      } else {
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
    }
    
    return () => {
      if (scrollFixIntervalRef.current) {
        clearInterval(scrollFixIntervalRef.current);
        scrollFixIntervalRef.current = null;
      }
    };
  }, [protocol, shouldScrollToChat]);

  // Mark coach comments as read when viewing
  useEffect(() => {
    if (protocol?.id && comments.length > 0) {
      markReadMutation.mutate({ clientProtocolId: protocol.id, authorType: "client" });
    }
  }, [protocol?.id, comments.length]);

  // Heartbeat - update lastSeenAt for "last seen" indicator (only for non-admin users)
  const heartbeatMutation = trpc.inbox.heartbeat.useMutation();
  useEffect(() => {
    if (!user || isAdminPreview) return;
    // Send initial heartbeat
    heartbeatMutation.mutate();
    // Send heartbeat every 2 minutes while page is open
    const interval = setInterval(() => {
      heartbeatMutation.mutate();
    }, 120000);
    return () => clearInterval(interval);
  }, [user, isAdminPreview]);

  // Auto-generate PDF when in preview mode (from coach admin)
  const hasPdfGenerated = useRef(false);
  useEffect(() => {
    if (isPdfPreviewMode && protocol && protocolItems && allItems && categories && !hasPdfGenerated.current) {
      hasPdfGenerated.current = true;
      // Small delay to ensure all data is ready
      setTimeout(async () => {
        try {
          const pdfProgramInfo = programInfo ? {
            program: programInfo.program ? { name: programInfo.program.name } : undefined,
            currentPhase: programInfo.currentPhase ? {
              name: programInfo.currentPhase.name,
              description: programInfo.currentPhase.description,
              goals: programInfo.currentPhase.goals,
            } : undefined,
          } : null;

          await generateProtocolPdf({
            protocol: protocol as any,
            protocolItems: protocolItems as any,
            allItems: allItems as any,
            categories: categories as any,
            requirements: requirements || [],
            programInfo: pdfProgramInfo,
          });
          toast.success("PDF preview generated!");
        } catch (error) {
          console.error("PDF generation error:", error);
          toast.error("Failed to generate PDF preview");
        }
      }, 500);
    }
  }, [isPdfPreviewMode, protocol, protocolItems, allItems, categories, requirements, programInfo]);

  // Track protocol status changes and show toast notifications
  const previousStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (protocol?.status) {
      const prevStatus = previousStatusRef.current;
      const currentStatus = protocol.status;
      
      // Only show notification if status actually changed (not on initial load)
      if (prevStatus && prevStatus !== currentStatus) {
        const statusMessages: Record<string, { message: string; icon: string }> = {
          'pending_approval': { message: 'Your protocol is ready for review!', icon: '📋' },
          'approved': { message: 'Great news! Your protocol has been approved!', icon: '✅' },
          'active': { message: 'Your protocol is now active! Time to start your journey.', icon: '🚀' },
          'completed': { message: 'Congratulations! You\'ve completed your protocol!', icon: '🎉' },
        };
        
        const notification = statusMessages[currentStatus];
        if (notification) {
          toast.success(notification.message, {
            duration: 6000,
            icon: notification.icon,
          });
        }
      }
      
      previousStatusRef.current = currentStatus;
    }
  }, [protocol?.status]);

  // Check if this is a first-time visitor and show onboarding
  useEffect(() => {
    if (protocol?.id && !protocol.status) {
      // Check localStorage to see if user has seen onboarding for this protocol
      const onboardingKey = `onboarding_seen_${protocol.id}`;
      const hasSeenOnboarding = localStorage.getItem(onboardingKey);
      if (!hasSeenOnboarding) {
        // Show welcome toast for first-time viewers
        toast.success(
          `Welcome ${protocol.clientName?.split(' ')[0] || 'there'}! Your personalized protocol is ready for review.`,
          {
            duration: 5000,
            icon: '🎉',
          }
        );
        // Small delay to let the page render first
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [protocol?.id, protocol?.status]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    if (protocol?.id) {
      localStorage.setItem(`onboarding_seen_${protocol.id}`, 'true');
    }
  };

  const trackOnboardingMutation = trpc.clientProtocol.trackOnboarding.useMutation();
  
  const updateShippingMutation = trpc.clientProtocol.updateShipping.useMutation({
    onSuccess: () => {
      toast.success('Shipping address updated successfully');
      setShowShippingEdit(false);
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to update shipping address');
    },
  });

  // Check if profile is complete - show gate if not
  const profileComplete = useMemo(() => {
    if (!protocol) return true; // Don't show gate while loading
    return isProfileComplete({
      clientName: protocol.clientName,
      clientEmail: protocol.clientEmail,
      clientPhone: protocol.shippingPhone, // Using shippingPhone as primary contact
      shippingName: protocol.shippingName,
      shippingStreet: protocol.shippingStreet,
      shippingCity: protocol.shippingCity,
      shippingState: protocol.shippingState,
      shippingZip: protocol.shippingZip,
      shippingCountry: protocol.shippingCountry,
      shippingPhone: protocol.shippingPhone,
    });
  }, [protocol]);

  // Show profile gate when trying to view pricing with incomplete profile
  // Use a ref to track if we've already shown the gate to prevent re-showing on every render
  // Skip the gate entirely if an admin/coach is previewing the protocol
  const hasShownProfileGate = useRef(false);
  useEffect(() => {
    // Skip profile gate for admin/coach preview
    if (isAdminPreview) return;
    
    if (protocol && !profileComplete && !protocol.hidePricing && !hasShownProfileGate.current) {
      // Check if user has dismissed the gate before for this session
      const gateKey = `profile_gate_dismissed_${protocol.id}`;
      const hasDismissed = sessionStorage.getItem(gateKey);
      if (!hasDismissed) {
        setShowProfileGate(true);
        hasShownProfileGate.current = true;
      }
    }
  }, [protocol?.id, profileComplete, isAdminPreview]);

  // Handle profile completion from gate
  const handleProfileComplete = async (data: {
    clientPhone: string;
    shippingName: string;
    shippingStreet: string;
    shippingCity: string;
    shippingState: string;
    shippingZip: string;
    shippingCountry: string;
    shippingPhone: string;
  }) => {
    if (!params.token) return;
    
    await updateShippingMutation.mutateAsync({
      token: params.token,
      ...data,
    });
    
    setShowProfileGate(false);
  };

  // Initialize shipping form when protocol loads
  useEffect(() => {
    if (protocol) {
      setShippingForm({
        shippingName: protocol.shippingName || protocol.clientName || '',
        shippingStreet: protocol.shippingStreet || '',
        shippingCity: protocol.shippingCity || '',
        shippingState: protocol.shippingState || '',
        shippingZip: protocol.shippingZip || '',
        shippingCountry: protocol.shippingCountry || 'USA',
        shippingPhone: protocol.shippingPhone || '',
      });
    }
  }, [protocol]);

  const handleSaveShipping = () => {
    if (!params.token) return;
    updateShippingMutation.mutate({
      token: params.token,
      ...shippingForm,
    });
  };

  const handlePathSelected = (path: string) => {
    // Track the selection in the database
    if (params.token) {
      // Determine the path type based on the selection
      const pathType = ['omega-elite', 'intro-session', 'quick-hit', 'coaching-package'].includes(path) 
        ? 'ready' as const 
        : 'learn' as const;
      
      trackOnboardingMutation.mutate({
        token: params.token,
        path: pathType,
        selection: path,
      });
    }
  };

  // Scroll to bottom of comments when new ones arrive (only after initial load)
  const previousCommentsLength = useRef<number | null>(null);
  useEffect(() => {
    // Only scroll if comments were added (not on initial load)
    if (previousCommentsLength.current !== null && comments.length > previousCommentsLength.current) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    previousCommentsLength.current = comments.length;
  }, [comments.length]);

  const handleSendComment = () => {
    // Use rich text editor content if available, fall back to plain text state
    const html = clientEditorRef.current?.getHTML() || '';
    const text = clientEditorRef.current?.getText() || '';
    const messageContent = html || newComment.trim();
    if ((!text.trim() && !newComment.trim()) || !protocol?.id) return;
    createCommentMutation.mutate({
      clientProtocolId: protocol.id,
      authorType: isAdminPreview ? "coach" : "client",
      authorName: isAdminPreview ? (user?.name || "Coach") : protocol.clientName,
      message: messageContent,
      loomUrl: loomUrl.trim() || undefined,
    });
    clientEditorRef.current?.clear();
    setNewComment('');
  };

  const validateCouponQuery = trpc.coupon.validate.useQuery(
    { code: couponCode, clientProtocolId: protocol?.id },
    { enabled: false }
  );

  const handleApplyCoupon = async () => {
    if (!couponCode || !protocol?.id) return;
    
    setIsValidatingCoupon(true);
    setCouponError("");
    
    try {
      const result = await validateCouponQuery.refetch();
      if (result.data?.valid && result.data.coupon) {
        setAppliedCoupon({
          id: result.data.coupon.id,
          code: result.data.coupon.code,
          discountPercent: result.data.coupon.discountPercent,
        });
        setCouponCode("");
        toast.success(`Coupon applied! ${result.data.coupon.discountPercent}% discount`);
      } else {
        setCouponError(result.data?.error || "Invalid coupon code");
      }
    } catch (error) {
      setCouponError("Failed to validate coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const approveMutation = trpc.clientProtocol.approve.useMutation({
    onSuccess: () => {
      toast.success("Protocol approved! Thank you.");
      refetch();
      setIsApproving(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsApproving(false);
    },
  });

  const handleApprove = () => {
    if (confirm("Are you sure you want to approve this protocol?")) {
      setIsApproving(true);
      approveMutation.mutate({ token: params.token || "" });
    }
  };

  // Payment is handled through Stripe (coming soon)

  const handleDownloadPdf = async () => {
    if (!protocol || !protocolItems || !allItems || !categories) {
      toast.error("Please wait for data to load");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Transform programInfo to match expected type
      const pdfProgramInfo = programInfo ? {
        program: programInfo.program ? { name: programInfo.program.name } : undefined,
        currentPhase: programInfo.currentPhase ? {
          name: programInfo.currentPhase.name,
          description: programInfo.currentPhase.description,
          goals: programInfo.currentPhase.goals,
        } : undefined,
      } : null;

      await generateProtocolPdf({
        protocol: protocol as any,
        protocolItems: protocolItems as any,
        allItems: allItems as any,
        categories: categories as any,
        requirements: requirements || [],
        programInfo: pdfProgramInfo,
      });
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Show loading skeleton while auth is loading (which gates the protocol query)
  // or while the protocol query itself is loading.
  // When authLoading is true, the protocol query is disabled (enabled: false),
  // which means isLoading is false and data is undefined — without this check,
  // the component would briefly flash "Protocol Not Found" before the query fires.
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <SkeletonProtocol />
        </div>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Protocol Not Found</h2>
            <p className="text-muted-foreground">
              This protocol link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get included items grouped by category
  const includedItems = protocolItems?.filter((item) => item.isIncluded) || [];
  const itemsByCategory = categories
    ?.map((cat) => ({
      category: cat,
      items: includedItems.filter((item) => {
        const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
        return protocolItem?.categoryId === cat.id;
      }),
    }))
    .filter((group) => group.items.length > 0) || [];
  
  // Add orphaned items (deleted from catalog but have snapshotName) to an "Other" group
  const orphanedItems = includedItems.filter((item) => {
    const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
    return !protocolItem && (item as any).snapshotName;
  });
  if (orphanedItems.length > 0) {
    itemsByCategory.push({
      category: { id: -1, name: 'Other Items', displayName: 'Other Items', description: '' } as any,
      items: orphanedItems,
    });
  }

  // Calculate totals with discount eligibility
  // "Client Buys" items (fulfillmentSource === 'client') are shown for reference but NOT charged
  const calculateTotals = () => {
    let subtotal = 0;
    let discountableSubtotal = 0;
    let nonDiscountableSubtotal = 0;
    let clientBuysTotal = 0;
    
    includedItems.forEach((item) => {
      const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
      if (protocolItem) {
        // Custom price always takes precedence over volume/tiered pricing
        const hasCustomPrice = !!item.customPrice;
        const defaultPrice = parseFloat(protocolItem.price || "0");
        const pricingTiers = (protocolItem as any).pricingTiers as PricingTier[] | null;
        const unitPrice = hasCustomPrice
          ? parseFloat(item.customPrice!)
          : hasTieredPricing(pricingTiers) 
            ? getTieredUnitPrice(item.quantity, pricingTiers, defaultPrice)
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
    });
    
    // Use coupon discount if applied, otherwise use protocol default discount
    const baseDiscountPercent = parseFloat(protocol.discountPercent || "0");
    const couponDiscountPercent = appliedCoupon ? parseFloat(appliedCoupon.discountPercent) : 0;
    const effectiveDiscountPercent = couponDiscountPercent > 0 ? couponDiscountPercent : baseDiscountPercent;
    
    // Discount only applies to discountable items
    const discount = (discountableSubtotal * effectiveDiscountPercent) / 100;
    const coaching = parseFloat(protocol.coachingPrice || "0");
    const total = subtotal - discount + coaching;
    const ccFee = total * 0.035;
    
    return { 
      subtotal, 
      discountableSubtotal, 
      nonDiscountableSubtotal, 
      clientBuysTotal,
      discount,
      discountPercent: effectiveDiscountPercent,
      isCouponApplied: couponDiscountPercent > 0,
      coaching, 
      total, 
      ccFee 
    };
  };

  const totals = calculateTotals();

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft: {
      label: "Draft",
      className: "bg-gray-100 text-gray-700",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    pending_approval: {
      label: "Awaiting Your Approval",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock className="h-4 w-4" />,
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    active: {
      label: "Active",
      className: "bg-blue-100 text-blue-700",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    completed: {
      label: "Completed",
      className: "bg-purple-100 text-purple-700",
      icon: <CheckCircle className="h-4 w-4" />,
    },
  };

  const status = statusConfig[protocol.status] || statusConfig.draft;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Client Onboarding Modal */}
      <ClientOnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        clientName={protocol.clientName}
        onPathSelected={handlePathSelected}
        isReturningClient={!!protocol.onboardingCompletedAt}
      />

      {/* Profile Completion Gate - Shows when profile is incomplete */}
      {showProfileGate && protocol && (
        <ProfileCompletionGate
          key={`profile-gate-${protocol.id}`}
          profile={{
            clientName: protocol.clientName,
            clientEmail: protocol.clientEmail,
            clientPhone: protocol.shippingPhone, // Using shippingPhone as primary contact
            shippingName: protocol.shippingName,
            shippingStreet: protocol.shippingStreet,
            shippingCity: protocol.shippingCity,
            shippingState: protocol.shippingState,
            shippingZip: protocol.shippingZip,
            shippingCountry: protocol.shippingCountry,
            shippingPhone: protocol.shippingPhone,
          }}
          onProfileComplete={handleProfileComplete}
          isUpdating={updateShippingMutation.isPending}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container max-w-5xl py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Pill className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Health Protocol</h1>
                <p className="text-sm text-muted-foreground">{protocol.clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Badge className={status.className}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-8 space-y-8">
        {/* Progress Indicator */}
        <ClientProgressIndicator
          status={protocol.status}
          hasApproved={protocol.status === 'approved' || protocol.status === 'active' || protocol.status === 'completed'}
          hasOrders={orders.length > 0}
          hasPackingSlip={!!packingSlip}
          packingSlipStatus={packingSlip?.status}
        />

        {/* Approval Banner */}
        {protocol.status === "pending_approval" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Review & Approve Your Protocol</h3>
                  <p className="text-muted-foreground mb-4">
                    Please review the protocol below. Once approved, we'll proceed with ordering
                    and preparing your items.
                  </p>
                  <Button onClick={handleApprove} disabled={isApproving}>
                    {isApproving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Protocol
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved Banner */}
        {protocol.status === "approved" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Protocol Approved</h3>
                  <p className="text-muted-foreground">
                    Thank you! Your protocol has been approved and is being prepared.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Archived Protocol Banner */}
        {(protocol as any).isArchivedView && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">Archived Protocol</p>
                  <p className="text-sm text-amber-600">
                    This is a previous version of your protocol. For your current protocol, please check your dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Protocol Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Protocol Overview
            </CardTitle>
            <CardDescription>
              {protocol.durationMonths} Month Protocol for {protocol.clientName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{protocol.durationMonths} Months</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{includedItems.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold capitalize">{protocol.status.replace("_", " ")}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Engagement Level</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {(() => {
                    const level = (protocol as any).engagementLevel || 'protocol_only';
                    if (level === 'full_coaching') return <><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Full Coaching</>;
                    if (level === 'self_guided_checkins') return <><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Self-Guided + Check-ins</>;
                    return <><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Protocol Only</>;
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program Roadmap - Only show if client is in a program */}
        {programInfo?.program && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Your Program Roadmap
              </CardTitle>
              <CardDescription>
                {programInfo.program.name} - {programInfo.program.totalMonths} Month Journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phase Timeline */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                  {programInfo.phases?.map((phase: any, index: number) => {
                    const isCurrent = phase.id === programInfo.currentPhase?.id;
                    const currentIndex = programInfo.phases?.findIndex((p: any) => p.id === programInfo.currentPhase?.id) || 0;
                    const isPast = index < currentIndex;
                    const isFuture = index > currentIndex;
                    
                    return (
                      <div key={phase.id} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                              isCurrent
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                : isPast
                                ? "bg-green-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Q{phase.phaseNumber}
                          </div>
                          <div className="mt-2 text-center">
                            <p className={`text-xs font-medium truncate max-w-20 ${
                              isCurrent ? "text-primary" : isPast ? "text-green-600" : "text-muted-foreground"
                            }`}>
                              {phase.name.split(":")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {phase.durationMonths} mo
                            </p>
                          </div>
                        </div>
                        {index < (programInfo.phases?.length || 0) - 1 && (
                          <div className={`h-1 flex-1 mx-2 rounded ${
                            isPast ? "bg-green-500" : "bg-muted"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Phase Details */}
              {programInfo.currentPhase && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary text-primary-foreground">
                      Current Phase
                    </Badge>
                    <span className="font-semibold">{programInfo.currentPhase.name}</span>
                  </div>
                  {programInfo.currentPhase.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {programInfo.currentPhase.description}
                    </p>
                  )}
                  {programInfo.currentPhase.goals && (
                    <div className="mt-3 p-3 bg-background rounded-md">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                        <Target className="h-3 w-3" />
                        Goals for This Phase
                      </div>
                      <p className="text-sm whitespace-pre-line">
                        {programInfo.currentPhase.goals}
                      </p>
                    </div>
                  )}
                  {programInfo.phaseStartDate && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Phase started: {new Date(programInfo.phaseStartDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Upcoming Phases Preview */}
              {programInfo.phases && programInfo.currentPhase && (() => {
                const currentIndex = programInfo.phases.findIndex((p: any) => p.id === programInfo.currentPhase?.id);
                const upcomingPhases = programInfo.phases.slice(currentIndex + 1);
                if (upcomingPhases.length === 0) return null;
                
                return (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Coming Up</h4>
                    <div className="space-y-2">
                      {upcomingPhases.map((phase: any) => (
                        <div key={phase.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            Q{phase.phaseNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{phase.name}</p>
                            {phase.description && (
                              <p className="text-xs text-muted-foreground truncate">{phase.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {phase.durationMonths} mo
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Protocol Sections - Periodization, Training Split, Program Guide */}
        {protocol?.id && enabledSections.periodization && (
          <PeriodizationOverview
            clientProtocolId={protocol.id}
            isAdmin={isAdminPreview}
          />
        )}
        {protocol?.id && enabledSections.training_split && (
          <TrainingSplitOverview
            clientProtocolId={protocol.id}
            isAdmin={isAdminPreview}
          />
        )}
        {protocol?.id && enabledSections.program_guide && (
          <CompleteProgramGuide
            clientProtocolId={protocol.id}
            isAdmin={isAdminPreview}
          />
        )}

        {/* Protocol Items by Category */}
        {/* Category Quick Navigation */}
        {itemsByCategory && itemsByCategory.length > 1 && (
          <Card className="bg-slate-50/50">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Jump to:</span>
                {itemsByCategory.map(({ category }, index) => (
                  <Button
                    key={category.id}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      categoryRefs.current[index]?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                    }}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Mobile swipe navigation hint */}
        <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-xs text-gray-400">
          <span>Swipe cards to navigate</span>
        </div>
        {itemsByCategory?.map(({ category, items }, categoryIndex) => (
          <Card 
            key={category.id}
            ref={(el) => { categoryRefs.current[categoryIndex] = el; }}
            className="scroll-mt-20"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {category.name}
              </CardTitle>
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {/* Bioregulator Educational Section */}
              {category.name.toLowerCase().includes('bioregulator') && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 mb-2">Learn About Bioregulator Peptides</h4>
                      <p className="text-sm text-purple-700 mb-4">
                        Bioregulator peptides are short-chain amino acid sequences that help regulate gene expression and cellular function. 
                        Learn more about the science behind these powerful compounds.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <a
                          href="/KhavinsonLongevityBioregulatorStudy.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <Download className="h-4 w-4" />
                          Khavinson Longevity Study (PDF)
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {items.map((item) => {
                   const protocolItem = allItems?.find((i) => i.id === item.protocolItemId);
                   const itemName = protocolItem?.name || (item as any).snapshotName || `Item #${item.protocolItemId}`;
                   const itemSku = (protocolItem as any)?.sku;
                   const itemDisplayName = itemSku ? `${itemName} · ${itemSku}` : itemName;
                   if (!protocolItem && !(item as any).snapshotName) return null;

                   return (
                     <div
                       key={item.id}
                      className="p-4 rounded-lg border bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                             <h4 className="font-semibold">{itemDisplayName}</h4>
                            {item.isRecommended ? (
                              <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                                Recommended
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                            {(item as any).fulfillmentSource === 'client' ? (
                              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Purchase from Partner
                              </Badge>
                            ) : protocolItem?.itemType !== 'service' && item.quantity > 0 ? (
                              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                                <Package className="h-3 w-3 mr-1" />
                                Included in Your Order
                              </Badge>
                            ) : null}
                          </div>

                          {(item.customSchedule || protocolItem?.schedule) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Schedule:</span>{" "}
                              {item.customSchedule || protocolItem?.schedule}
                            </p>
                          )}

                          {(item.customDuration || protocolItem?.duration) && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Duration:</span>{" "}
                              {item.customDuration || protocolItem?.duration}
                            </p>
                          )}

                          {((item as any).customPurpose || protocolItem?.purpose) && (
                            <p className="text-sm text-primary mt-2">
                              <span className="font-medium">Purpose:</span> {(item as any).customPurpose || protocolItem?.purpose}
                            </p>
                          )}

                          {(item.customNotes || protocolItem?.notes) && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                              <div className="flex items-start gap-1">
                                <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                                <div 
                                  className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_a]:underline"
                                  dangerouslySetInnerHTML={{ __html: formatNotesHtml(item.customNotes || protocolItem?.notes || '') }}
                                />
                              </div>
                            </div>
                          )}

                          {protocolItem?.affiliateUrl && (
                            <a
                              href={protocolItem.affiliateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 mt-2 text-sm hover:underline ${
                                (item as any).fulfillmentSource === 'client'
                                  ? 'text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200'
                                  : 'text-primary'
                              }`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {(item as any).fulfillmentSource === 'client' ? 'Purchase This Item' : 'Purchase Link'}
                              {protocolItem?.affiliateCode && (
                                <span className="ml-2 bg-primary/10 px-2 py-0.5 rounded text-xs">
                                  Code: {protocolItem.affiliateCode}
                                </span>
                              )}
                            </a>
                          )}
                          
                          {/* Loom Video */}
                          {protocolItem?.loomVideoUrl && (
                            <div className="mt-3">
                              <button
                                onClick={() => {
                                  // Extract Loom video ID and create embed URL
                                  const url = protocolItem?.loomVideoUrl || '';
                                  let embedUrl = url;
                                  if (url.includes('loom.com/share/')) {
                                    const videoId = url.split('loom.com/share/')[1]?.split('?')[0];
                                    embedUrl = `https://www.loom.com/embed/${videoId}`;
                                  }
                                  window.open(embedUrl, '_blank', 'width=800,height=450');
                                }}
                                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 hover:underline"
                              >
                                <Play className="h-3 w-3" />
                                Watch Video Explanation
                              </button>
                            </div>
                          )}
                          
                          {/* Pricing Tier Chart for items with volume pricing - hide when custom price is set */}
                          {!protocol.hidePricing && protocolItem && !item.customPrice && hasTieredPricing((protocolItem as any).pricingTiers) && (
                            <PricingTierChart
                              tiers={(protocolItem as any).pricingTiers}
                              currentQuantity={item.quantity}
                               itemName={itemDisplayName}
                            />
                          )}
                        </div>

                        {!protocol.hidePricing && (() => {
                          const hasCustomPrice = !!item.customPrice;
                          const customPriceValue = hasCustomPrice ? parseFloat(item.customPrice!) : 0;
                          const defaultPrice = parseFloat(protocolItem?.price || "0");
                          const itemPricingTiers = protocolItem ? (protocolItem as any).pricingTiers as PricingTier[] | null : null;
                          // Custom price always takes precedence over volume pricing
                          const hasVolumePricing = !hasCustomPrice && hasTieredPricing(itemPricingTiers);
                          const unitPrice = hasCustomPrice
                            ? customPriceValue
                            : hasVolumePricing 
                              ? getTieredUnitPrice(item.quantity, itemPricingTiers, defaultPrice)
                              : defaultPrice;
                          const lineTotal = unitPrice * item.quantity;
                          const isClientBuys = (item as any).fulfillmentSource === 'client';
                          
                          return (
                            <div className={`text-right shrink-0 ${isClientBuys ? 'opacity-75' : ''}`}>
                              <p className={`font-semibold ${isClientBuys ? 'text-muted-foreground line-through decoration-1' : ''}`}>
                                ${lineTotal.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × ${unitPrice.toFixed(2)}
                              </p>
                              {isClientBuys && (
                                <p className="text-xs text-blue-600 font-semibold mt-1">
                                  Purchase Separately
                                </p>
                              )}
                              {!isClientBuys && hasCustomPrice && (
                                <p className="text-xs text-blue-600 font-medium">
                                  Custom Price
                                </p>
                              )}
                              {!isClientBuys && hasVolumePricing && (
                                <p className="text-xs text-green-600 font-medium">
                                  Volume Pricing Applied
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Coach Notes */}
        {protocol.coachNotes && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personalized Notes from Your Coach
              </CardTitle>
              <CardDescription>
                Custom guidance and instructions tailored specifically for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {protocol.coachNotes.split('\n').map((line, index) => (
                  <p key={index} className={line.trim() === '' ? 'h-2' : 'mb-2'}>
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requirements */}
        {requirements && requirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Other Requirements
              </CardTitle>
              <CardDescription>
                Important guidelines to follow during your protocol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {requirements.map((req) => (
                  <li key={req.id} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{req.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Pricing Summary - Only show if hidePricing is false OR if there's a coaching package */}
        {(!protocol.hidePricing || (protocol.coachingPackage && totals.coaching > 0)) && (
          <Card className="relative">
            {/* Blur overlay for incomplete profiles */}
            {!profileComplete && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Complete Your Profile</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    Please provide your contact and shipping information to view pricing and checkout options.
                  </p>
                  <Button onClick={() => setShowProfileGate(true)}>
                    Complete Profile
                  </Button>
                </div>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {protocol.hidePricing ? 'Coaching Fee' : 'Pricing Summary'}
              </CardTitle>
              {protocol.hidePricing && (
                <p className="text-sm text-muted-foreground">
                  Products are purchased separately through our affiliate partners.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!protocol.hidePricing && (
                  <>
                    <div className="flex justify-between">
                      <span>Products Subtotal</span>
                      <span>${totals.subtotal.toFixed(2)}</span>
                    </div>

                    {totals.clientBuysTotal > 0 && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Client Purchases Separately
                        </span>
                        <span className="line-through decoration-1">${totals.clientBuysTotal.toFixed(2)}</span>
                      </div>
                    )}

                    {totals.nonDiscountableSubtotal > 0 && totals.discount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Ban className="h-3 w-3" />
                          Non-Discountable Items
                        </span>
                        <span>${totals.nonDiscountableSubtotal.toFixed(2)}</span>
                      </div>
                    )}

                    {totals.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          {totals.isCouponApplied && <Ticket className="h-3 w-3" />}
                          Discount ({totals.discountPercent}% on ${totals.discountableSubtotal.toFixed(2)})
                          {totals.isCouponApplied && appliedCoupon && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {appliedCoupon.code}
                            </Badge>
                          )}
                        </span>
                        <span>-${totals.discount.toFixed(2)}</span>
                      </div>
                     )}

                    {/* Coupon Code Input */}
                    {!appliedCoupon ? (
                      <div className="pt-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Have a coupon code?"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value.toUpperCase());
                                setCouponError("");
                              }}
                              className="pl-9 uppercase"
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={handleApplyCoupon}
                            disabled={!couponCode || isValidatingCoupon}
                          >
                            {isValidatingCoupon ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Apply"
                            )}
                          </Button>
                        </div>
                        {couponError && (
                          <p className="text-sm text-red-600 mt-1">{couponError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center justify-between bg-green-50 dark:bg-green-950/20 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            Coupon {appliedCoupon.code} applied ({appliedCoupon.discountPercent}% off)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponCode("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {protocol.coachingPackage && totals.coaching > 0 && (
                  <div className="flex justify-between">
                    <span>{protocol.coachingPackage}</span>
                    <span>${totals.coaching.toFixed(2)}</span>
                  </div>
                )}

                {!protocol.hidePricing ? (
                  <>
                    <Separator />

                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>${totals.total.toFixed(2)}</span>
                    </div>
                    
                    {/* Payment Status Widget */}
                    {protocol.paymentStatus && protocol.paymentStatus !== 'pending' && (
                      <div className="mt-6">
                        <PaymentStatusWidget
                          paymentStatus={protocol.paymentStatus as any}
                          paymentMethod={protocol.paymentMethod as any}
                          amount={(totals.total).toFixed(2)}
                          currency="USD"
                          paymentDate={protocol.paymentReceivedAt}
                          estimatedDeliveryDays={5}
                        />
                      </div>
                    )}
                    
                    {/* Payment Method Selector - Only show if payment is pending or not set */}
                    {(!protocol.paymentStatus || protocol.paymentStatus === 'pending') && (
                      <div className="mt-6 pt-4 border-t">
                        {protocol && (
                          <PaymentMethodSelector
                            clientProtocolId={protocol.id.toString()}
                            amount={(totals.total).toFixed(2)}
                            currency="USD"
                            description={`Protocol for ${protocol.clientName}`}
                            clientEmail={protocol.clientEmail || ""}
                            clientName={protocol.clientName}
onPaymentSuccess={() => {
                                  setLocation("/payment/success?method=stripe");
                             }}
                            onPaymentError={(error) => {
                              toast.error(error);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Coaching Fee</span>
                      <span>${totals.coaching.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order History Section */}
        {orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Order History
              </CardTitle>
              <CardDescription>
                Your purchase history for this protocol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Order #{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      {order.itemsSummary && JSON.parse(order.itemsSummary).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-muted-foreground">
                          <span>{item.name} x{item.qty}</span>
                          <span>${item.price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${Number(order.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shipping Address Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Shipping Address
                </CardTitle>
                <CardDescription>
                  Where your items will be shipped
                </CardDescription>
              </div>
              {!showShippingEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShippingEdit(true)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showShippingEdit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      value={shippingForm.shippingName}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, shippingName: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={shippingForm.shippingPhone}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, shippingPhone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Street Address</label>
                  <AddressAutocomplete
                    value={shippingForm.shippingStreet}
                    onChange={(value) => setShippingForm(prev => ({ ...prev, shippingStreet: value }))}
                    onAddressSelect={(address: AddressComponents) => {
                      setShippingForm(prev => ({
                        ...prev,
                        shippingStreet: address.street,
                        shippingCity: address.city,
                        shippingState: address.state,
                        shippingZip: address.zip,
                        shippingCountry: address.country || 'USA'
                      }));
                    }}
                    placeholder="Start typing address..."
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={shippingForm.shippingCity}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, shippingCity: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={shippingForm.shippingState}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, shippingState: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP Code</label>
                    <Input
                      value={shippingForm.shippingZip}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, shippingZip: e.target.value }))}
                      placeholder="ZIP"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      value={shippingForm.shippingCountry}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, shippingCountry: e.target.value }))}
                      placeholder="Country"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowShippingEdit(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveShipping}
                    disabled={updateShippingMutation.isPending}
                  >
                    {updateShippingMutation.isPending ? 'Saving...' : 'Save Address'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {protocol.shippingStreet ? (
                  <>
                    <p className="font-medium">{protocol.shippingName || protocol.clientName}</p>
                    <p className="text-muted-foreground">{protocol.shippingStreet}</p>
                    <p className="text-muted-foreground">
                      {protocol.shippingCity}, {protocol.shippingState} {protocol.shippingZip}
                    </p>
                    <p className="text-muted-foreground">{protocol.shippingCountry}</p>
                    {protocol.shippingPhone && (
                      <p className="text-muted-foreground">{protocol.shippingPhone}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">
                    No shipping address on file. Click Edit to add your address.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Status Section */}
        {packingSlip && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Shipping Status
              </CardTitle>
              <CardDescription>
                Track your order fulfillment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <Badge variant={
                    packingSlip.status === 'complete' ? 'default' :
                    packingSlip.status === 'partial' ? 'secondary' :
                    packingSlip.status === 'in_progress' ? 'outline' :
                    'secondary'
                  }>
                    {packingSlip.status === 'complete' ? 'Shipped' :
                     packingSlip.status === 'partial' ? 'Partially Shipped' :
                     packingSlip.status === 'in_progress' ? 'Processing' :
                     packingSlip.status === 'pending' ? 'Pending' : packingSlip.status}
                  </Badge>
                </div>
                
                {packingSlip.trackingNumber && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800">Tracking Information</p>
                    <p className="text-sm text-blue-700">
                      {packingSlip.trackingCarrier}: {packingSlip.trackingNumber}
                    </p>
                    {packingSlip.trackingUrl && (
                      <a
                        href={packingSlip.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        Track Package <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Items ({packingSlip.itemsFulfilled}/{packingSlip.totalItems} fulfilled)</p>
                  {packingSlip.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <span>{item.itemName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">x{item.quantity}</span>
                        {item.status === 'fulfilled' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : item.status === 'backordered' ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {packingSlip.signedAt && (
                  <p className="text-xs text-muted-foreground">
                    Verified on {new Date(packingSlip.signedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card id="comments">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Discussion
            </CardTitle>
            <CardDescription>
              Communicate with your coach about your protocol
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Comments List */}
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.authorType === "coach"
                        ? "bg-primary/5 border-l-4 border-primary"
                        : "bg-gray-100 border-l-4 border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        comment.authorType === "coach" ? "bg-primary text-white" : "bg-slate-400 text-white"
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {comment.authorName || (comment.authorType === "coach" ? "Coach" : "You")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div 
                      className="text-sm prose prose-sm max-w-none whitespace-pre-wrap [&_p]:my-1 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0 [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through [&_a]:text-blue-600 [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: processMessageForDisplay(comment.message, comment.authorType === 'coach') }}
                    />
                    {comment.loomUrl && (
                      <div className="mt-3">
                        <div className="aspect-video rounded-lg overflow-hidden bg-gray-900">
                          <iframe
                            src={comment.loomUrl.replace("loom.com/share", "loom.com/embed")}
                            frameBorder="0"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* New Comment Input */}
            <div className="space-y-3 pt-4 border-t">
              <ChatRichTextEditor
                ref={clientEditorRef}
                placeholder="Type your message..."
                onSubmit={handleSendComment}
                disabled={createCommentMutation.isPending}
              />
              {showLoomInput && (
                <Input
                  placeholder="Paste Loom video URL (optional)"
                  value={loomUrl}
                  onChange={(e) => setLoomUrl(e.target.value)}
                />
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSendComment}
                  disabled={createCommentMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowLoomInput(!showLoomInput)}
                  title="Add Loom video"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="bg-slate-50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> This protocol is for informational purposes only and
              should not be considered medical advice. Always consult with a healthcare
              professional before starting any new health regimen. The products and supplements
              mentioned are not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 mt-12">
        <div className="container max-w-5xl text-center text-sm text-muted-foreground">
          <p>Health Coach Protocol Manager</p>
        </div>
      </footer>
    </div>
  );
}
