import { useState, useEffect, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { PhoneInput } from "@/components/ui/phone-input";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { TierBenefits } from "@/components/TierBenefits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Play,
  CheckCircle2,
  Lock,
  CreditCard,
  Calendar,
  FileText,
  Package,
  Video,
  MessageSquare,
  ClipboardCheck,
  Trophy,
  ArrowRight,
  ExternalLink,
  Upload,
  Sparkles,
  Clock,
  ChevronRight,
  ArrowLeft,
  SkipForward,
  Target,
  Crown,
  Diamond,
  PlayCircle,
  Map,
  Loader2,
  Tag,
  Check,
  X,
} from "lucide-react";
import { IntakeFormWizard } from "@/components/IntakeFormWizard";

interface JourneyStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "completed" | "current" | "locked" | "available";
  phase: "pre-consult" | "program-design" | "fulfillment" | "active" | "completion";
}

type ProgramTier = "elite" | "flagship" | "essentials";

// Calendly URLs
const CALENDLY_URL = "https://calendly.com/jason-vigilanttechs";
const CALENDLY_DISCOVERY_URL = "https://calendly.com/jason-vigilanttechs/60-minute-strategy";

// PrivateMD Labs affiliate link
const PRIVATEMD_URL = "https://www.privatemdlabs.com/?a_aid=omegalong";

// TruDiagnostic link
const TRUDIAGNOSTIC_URL = "https://trudiagnostic.com/?ref=omegalong";

// Omega Elite Community link (GHL)
const OMEGA_ELITE_URL = "https://app.omegaelite.com";

export default function TransformationJourney() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile"); // Default to profile gate first
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCalendlyDialog, setShowCalendlyDialog] = useState(false);
  const [calendlyEventType, setCalendlyEventType] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [showTierSelector, setShowTierSelector] = useState(false);
  const [selectedPaymentTier, setSelectedPaymentTier] = useState<ProgramTier | null>(null);
  const [showContinueWatchingDialog, setShowContinueWatchingDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  
  // Profile gate state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileState, setProfileState] = useState("");
  const [profileZip, setProfileZip] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Get enrollment info from session
  const sessionEnrollmentId = sessionStorage.getItem("transformationEnrollmentId");
  const storedProgramTier = sessionStorage.getItem("programTier") as ProgramTier;
  const programTier = selectedPaymentTier || storedProgramTier || "flagship";
  const isElite = programTier === "elite";
  const isFlagship = programTier === "flagship";
  const isEssentials = programTier === "essentials";
  const isCoached = isElite || isFlagship; // Both elite and flagship have coaching
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Promo code state - managed locally in the payment dialog
  const [promoInput, setPromoInput] = useState("");
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    promoCodeId: number;
    code: string;
    discountType: string;
    discountValue: number;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  
  // Also check sessionStorage for promo set from TierSelection (legacy path)
  const sessionPromoCodeId = sessionStorage.getItem("promoCodeId");
  const sessionPromoCode = sessionStorage.getItem("promoCode");
  const sessionOriginalAmount = sessionStorage.getItem("originalAmount");
  const sessionDiscountAmount = sessionStorage.getItem("discountAmount");
  const sessionFinalAmount = sessionStorage.getItem("finalAmount");
  
  // Derive promo data from either local state or session storage
  const promoCodeId = appliedPromo ? String(appliedPromo.promoCodeId) : sessionPromoCodeId;
  const promoCode = appliedPromo ? appliedPromo.code : sessionPromoCode;
  const originalAmount = appliedPromo ? String(appliedPromo.originalAmount) : sessionOriginalAmount;
  const discountAmount = appliedPromo ? String(appliedPromo.discountAmount) : sessionDiscountAmount;
  const finalAmount = appliedPromo ? String(appliedPromo.finalAmount) : sessionFinalAmount;
  const hasPromoDiscount = !!promoCodeId && !!finalAmount;
  
  // Validate promo code mutation
  const validatePromo = trpc.promoCode.validate.useMutation();
  
  // No access code gate needed - users access via enrollment or direct link
  
  // Get user's enrollment and progress
  const { data: user } = trpc.auth.me.useQuery();
  
  // Try to get enrollment from user's account first
  const { data: userEnrollment, refetch: refetchUserEnrollment } = trpc.transformation.getMyEnrollment.useQuery(undefined, {
    enabled: !!user,
  });
  
  // If no user enrollment, try to get from session storage enrollment ID
  // Always fetch session enrollment if we have a sessionEnrollmentId, so we can use it as fallback
  const { data: sessionEnrollment, refetch: refetchSessionEnrollment, isLoading: isSessionEnrollmentLoading, isError: isSessionEnrollmentError, error: sessionEnrollmentError } = trpc.transformation.getEnrollmentPublic.useQuery(
    { id: parseInt(sessionEnrollmentId || "0") },
    { enabled: !!sessionEnrollmentId && parseInt(sessionEnrollmentId) > 0 }
  );
  
  // Debug: Log query state
  console.log('[TransformationJourney] Query state:', {
    sessionEnrollmentId,
    isSessionEnrollmentLoading,
    isSessionEnrollmentError,
    sessionEnrollmentError: sessionEnrollmentError?.message,
    sessionEnrollment
  });
  
  // Use user enrollment if available, otherwise use session enrollment
  const rawEnrollment = userEnrollment || sessionEnrollment;
  const refetchEnrollment = userEnrollment ? refetchUserEnrollment : refetchSessionEnrollment;
  
  // Compute derived fields from status since tRPC type inference strips them
  const statusOrder = [
    'enrolled', 'watching_videos', 'video_complete', 'coaching_paid',
    'intake_complete', 'discovery_scheduled', 'discovery_complete', 'protocol_preparing',
    'protocol_review', 'protocol_paid', 'launched', 'fulfillment',
    'shipped', 'delivered', 'training_scheduled', 'training_complete',
    'active', 'week3_review', 'month2', 'month3_final', 'completed', 'renewed'
  ];
  const currentStatusIndex = rawEnrollment ? statusOrder.indexOf(rawEnrollment.status as string) : -1;
  
  // Add computed fields to enrollment
  const enrollment = rawEnrollment ? {
    ...rawEnrollment,
    bioregulatorVideoWatched: currentStatusIndex >= statusOrder.indexOf('video_complete'),
    coachingFeePaid: currentStatusIndex >= statusOrder.indexOf('coaching_paid'),
    intakeFormCompleted: (rawEnrollment as any).intakeFormCompleted || currentStatusIndex >= statusOrder.indexOf('discovery_scheduled'),
    discoverySessionScheduled: currentStatusIndex >= statusOrder.indexOf('discovery_scheduled'),
    discoverySessionCompleted: currentStatusIndex >= statusOrder.indexOf('discovery_complete'),
    protocolReady: currentStatusIndex >= statusOrder.indexOf('protocol_review'),
    protocolApproved: currentStatusIndex >= statusOrder.indexOf('protocol_paid'),
    boxShipped: currentStatusIndex >= statusOrder.indexOf('shipped'),
    boxDelivered: currentStatusIndex >= statusOrder.indexOf('delivered'),
    reconstitutionScheduled: currentStatusIndex >= statusOrder.indexOf('training_scheduled'),
    reconstitutionCompleted: currentStatusIndex >= statusOrder.indexOf('training_complete'),
  } : null;
  
  // Debug logging
  useEffect(() => {
    console.log('[TransformationJourney] Debug info:');
    console.log('- sessionEnrollmentId:', sessionEnrollmentId);
    console.log('- user:', user);
    console.log('- userEnrollment:', userEnrollment);
    console.log('- sessionEnrollment:', sessionEnrollment);
    console.log('- enrollment (final):', enrollment);
    console.log('- bioregulatorVideoWatched:', enrollment?.bioregulatorVideoWatched);
  }, [sessionEnrollmentId, user, userEnrollment, sessionEnrollment, enrollment]);
  
  // Profile gate: auto-switch to masterclass if profile already completed
  useEffect(() => {
    if (enrollment) {
      const isProfileDone = !!(enrollment as any).profileCompleted;
      if (isProfileDone && activeTab === 'profile') {
        setActiveTab('masterclass');
      }
    }
  }, [enrollment]);
  
  // Pre-fill profile form from user account or enrollment data
  useEffect(() => {
    if (user) {
      if (!profileName && user.name) setProfileName(user.name);
      if (!profileEmail && user.email) setProfileEmail(user.email);
      if (!profilePhone && (user as any).phone) setProfilePhone((user as any).phone);
    }
    if (enrollment) {
      if (!profileName && enrollment.clientName && enrollment.clientName !== 'Unknown') setProfileName(enrollment.clientName as string);
      if (!profileEmail && enrollment.email) setProfileEmail(enrollment.email as string);
      if (!profilePhone && (enrollment as any).phone) setProfilePhone((enrollment as any).phone);
      // Pre-fill address fields from enrollment data
      if (!profileAddress && (enrollment as any).shippingStreet) setProfileAddress((enrollment as any).shippingStreet);
      if (!profileCity && (enrollment as any).shippingCity) setProfileCity((enrollment as any).shippingCity);
      if (!profileState && (enrollment as any).shippingState) setProfileState((enrollment as any).shippingState);
      if (!profileZip && (enrollment as any).shippingZip) setProfileZip((enrollment as any).shippingZip);
    }
  }, [user, enrollment]);
  
  // Auto-open intake form if URL param is present (from intake form email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenIntake = params.get('openIntake') === 'true';
    if (shouldOpenIntake && enrollment && enrollment.coachingFeePaid && !enrollment.intakeFormCompleted) {
      setShowIntakeForm(true);
      setActiveTab('journey');
      // Clean up the URL param
      const url = new URL(window.location.href);
      url.searchParams.delete('openIntake');
      window.history.replaceState({}, '', url.toString());
    }
  }, [enrollment]);
  
  // Link enrollment to user when they log in
  const linkEnrollmentMutation = trpc.transformation.linkEnrollmentToUser.useMutation({
    onSuccess: () => {
      refetchUserEnrollment();
      toast.success("Your progress has been saved to your account!");
    },
    onError: (error) => {
      console.error("Failed to link enrollment:", error);
    },
  });
  
  // Link enrollment to user when they log in and have a session enrollment
  useEffect(() => {
    if (user && sessionEnrollmentId && !userEnrollment && parseInt(sessionEnrollmentId) > 0) {
      const authToken = sessionStorage.getItem('transformationAuthToken');
      if (authToken) {
        linkEnrollmentMutation.mutate({ enrollmentId: parseInt(sessionEnrollmentId), authToken });
      }
    }
  }, [user, sessionEnrollmentId, userEnrollment]);
  
  const { data: videoSections } = trpc.transformation.getMasterclassVideos.useQuery();
  const { data: videoProgress, refetch: refetchVideoProgress } = trpc.transformation.getVideoProgress.useQuery(
    { enrollmentId: enrollment?.id || 0 },
    { enabled: !!enrollment?.id }
  );
  
  // Mutation to mark individual videos as complete
  const updateVideoProgress = trpc.transformation.updateVideoProgress.useMutation({
    onSuccess: async () => {
      // Refetch video progress first and get the NEW data
      const refetchResult = await refetchVideoProgress();
      const freshVideoProgress = refetchResult.data;
      toast.success("Video marked as complete!");
      
      // After refetching, check if all required videos are now complete
      // Use the freshly fetched data, not the stale state variable
      if (videoSections && freshVideoProgress) {
        const requiredVids = (videoSections as any[]).filter((v: any) => v.isRequired);
        // Get the updated progress from the fresh data
        const allComplete = requiredVids.every((reqVideo: any) => {
          const progress = (freshVideoProgress as any[]).find((p: any) => p.videoId === reqVideo.id);
          return progress?.isCompleted === true || progress?.isCompleted === 1;
        });
        
        console.log('[updateVideoProgress] Checking required videos completion:', {
          requiredVids: requiredVids.map((v: any) => v.id),
          freshVideoProgress: freshVideoProgress,
          allComplete,
          enrollmentBioregulatorWatched: enrollment?.bioregulatorVideoWatched
        });
        
        // If all required videos are complete and enrollment hasn't been updated yet, update it
        if (allComplete && enrollment && !enrollment.bioregulatorVideoWatched) {
          console.log('[updateVideoProgress] All required videos complete! Triggering handleBioregulatorComplete...');
          // Trigger the bioregulator complete handler immediately
          // Use the public mutation directly for non-logged-in users
          try {
            if (user) {
              await updateEnrollment.mutateAsync({
                enrollmentId: enrollment.id,
                step: "bioregulatorVideoWatched",
                value: true,
              });
            } else {
              await updateEnrollmentPublic.mutateAsync({
                enrollmentId: enrollment.id,
                step: "bioregulatorVideoWatched",
                value: true,
              });
            }
            toast.success("Great job! You've completed the required videos.");
            // Show the continue watching dialog instead of auto-switching
            setShowContinueWatchingDialog(true);
          } catch (error) {
            console.error('[updateVideoProgress] Error updating enrollment:', error);
          }
        }
      }
    },
    onError: (error) => {
      console.error("Failed to mark video complete:", error);
      toast.error("Failed to mark video complete. Please try again.");
    },
  });
  
  // Mutations
  const updateEnrollment = trpc.transformation.updateEnrollmentJourneyStep.useMutation({
    onSuccess: () => {
      refetchEnrollment();
      toast.success("Progress updated!");
    },
    onError: (error) => {
      console.error("Failed to update enrollment:", error);
      toast.error("Failed to update progress. Please try again.");
    },
  });
  
  // Public payment completion mutation (for guest users)
  const completePaymentPublic = trpc.transformation.completePaymentPublic.useMutation({
    onSuccess: (data) => {
      console.log('[TransformationJourney] Payment completed publicly:', data);
      // Store the auth token for seamless continuation
      if (data.authToken) {
        sessionStorage.setItem('transformationAuthToken', data.authToken);
      }
      refetchEnrollment();
    },
    onError: (error) => {
      console.error('[TransformationJourney] Failed to complete payment publicly:', error);
      toast.error("Failed to complete payment. Please contact support.");
    },
  });
  
  // Public mutation for non-logged-in users (only allows bioregulatorVideoWatched)
  const updateEnrollmentPublic = trpc.transformation.updateEnrollmentJourneyStepPublic.useMutation({
    onSuccess: () => {
      refetchEnrollment();
      toast.success("Progress updated!");
    },
    onError: (error) => {
      console.error("Failed to update enrollment:", error);
      toast.error("Failed to update progress. Please try again.");
    },
  });
  
  // Handle applying a promo code
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsValidatingPromo(true);
    setPromoError(null);
    
    try {
      const result = await validatePromo.mutateAsync({
        code: promoInput.trim(),
        tier: programTier as any,
        userId: user?.id,
      });
      
      if (result.valid && result.promoCodeId) {
        setAppliedPromo({
          promoCodeId: result.promoCodeId,
          code: result.code!,
          discountType: result.discountType!,
          discountValue: result.discountValue!,
          originalAmount: result.originalAmount!,
          discountAmount: result.discountAmount!,
          finalAmount: result.finalAmount!,
        });
        setPromoInput("");
        toast.success(`Alumni code "${result.code}" applied! You save $${result.discountAmount!.toLocaleString()}.`);
      } else {
        setPromoError(result.error || "Invalid alumni code");
      }
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Failed to validate alumni code");
    } finally {
      setIsValidatingPromo(false);
    }
  };
  
  // Record promo code usage mutation
  const recordPromoUsage = trpc.promoCode.recordUsage.useMutation();
  
  // Save prospect profile mutation
  const saveProfileMutation = trpc.transformation.saveProspectProfile.useMutation({
    onSuccess: () => {
      refetchEnrollment();
      toast.success("Profile saved! You can now access the Masterclass.");
      setActiveTab("masterclass");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save profile");
      setProfileSaving(false);
    },
  });
  
  // Calculate overall progress based on tier
  const calculateProgress = () => {
    if (!enrollment) return 0;
    
    if (isCoached) {
      // Full coached program progress
      const steps = [
        enrollment.bioregulatorVideoWatched,
        enrollment.coachingFeePaid,
        enrollment.discoverySessionScheduled,
        enrollment.discoverySessionCompleted,
        enrollment.protocolApproved,
        enrollment.protocolPaid,
        enrollment.boxShipped,
        enrollment.boxDelivered,
        enrollment.unpackingVideoWatched,
        enrollment.reconstitutionScheduled,
        enrollment.reconstitutionCompleted,
      ];
      const completed = steps.filter(Boolean).length;
      return Math.round((completed / steps.length) * 100);
    } else {
      // Self-guided program progress (simpler)
      const steps = [
        enrollment.bioregulatorVideoWatched,
        // Add more self-guided milestones as needed
      ];
      const completed = steps.filter(Boolean).length;
      return completed > 0 ? 100 : 0; // Simple: watched bioregulator = complete
    }
  };
  
  // Handle payment confirmation - tier-specific messaging
  const handlePaymentConfirmed = async () => {
    if (enrollment) {
      await updateEnrollment.mutateAsync({
        enrollmentId: enrollment.id,
        step: "coachingFeePaid",
        value: true,
      });
      setShowPaymentDialog(false);
      
      // Tier-specific success messages
      if (isElite) {
        toast.success("Elite payment confirmed! You can now complete your waiver and schedule your consultation.");
      } else if (isFlagship) {
        toast.success("Payment confirmed! You can now complete your waiver and schedule your strategy session.");
      } else {
        toast.success("Payment confirmed! Your program access has been activated. Start building your protocol!");
      }
    }
  };
  
  // Handle scheduling
  const handleSchedule = (eventType: string) => {
    setCalendlyEventType(eventType);
    setShowCalendlyDialog(true);
  };

  // Handle video watch - show embedded video in dialog
  const handleWatchVideo = (video: any) => {
    setSelectedVideo(video);
    setShowVideoDialog(true);
  };

  // Get the embed URL for video (YouTube preferred, then Google Drive)
  const getVideoEmbedUrl = (video: any): string | undefined => {
    if (video.youtubeVideoId) {
      // YouTube embed (preferred for better playback)
      return `https://www.youtube.com/embed/${video.youtubeVideoId}?rel=0&modestbranding=1`;
    } else if (video.googleDriveVideoId) {
      // Direct video embed
      return `https://drive.google.com/file/d/${video.googleDriveVideoId}/preview`;
    } else if (video.googleDriveFolderId) {
      // Folder embed (shows folder contents)
      return `https://drive.google.com/embeddedfolderview?id=${video.googleDriveFolderId}#grid`;
    }
    return undefined;
  };

  // Check if all required videos have been watched
  const allRequiredVideosWatched = useMemo(() => {
    if (!videoSections || !videoProgress) return false;
    
    // Get all required videos
    const requiredVideos = (videoSections as any[]).filter((v: any) => v.isRequired);
    if (requiredVideos.length === 0) return false;
    
    // Check if all required videos are completed in videoProgress
    const allWatched = requiredVideos.every((reqVideo: any) => {
      const progress = (videoProgress as any[]).find((p: any) => p.videoId === reqVideo.id);
      return progress?.isCompleted === true;
    });
    
    return allWatched;
  }, [videoSections, videoProgress]);
  
  // Get count of required videos watched
  const requiredVideosStatus = useMemo(() => {
    if (!videoSections || !videoProgress) return { watched: 0, total: 0 };
    
    const requiredVideos = (videoSections as any[]).filter((v: any) => v.isRequired);
    const watchedCount = requiredVideos.filter((reqVideo: any) => {
      const progress = (videoProgress as any[]).find((p: any) => p.videoId === reqVideo.id);
      return progress?.isCompleted === true;
    }).length;
    
    return { watched: watchedCount, total: requiredVideos.length };
  }, [videoSections, videoProgress]);

  // Mark bioregulator video as watched - only if ALL required videos are complete
  const handleBioregulatorComplete = async () => {
    if (!enrollment) {
      toast.error("No enrollment found. Please refresh the page.");
      return;
    }
    
    // Check if all required videos have been watched
    if (!allRequiredVideosWatched) {
      const { watched, total } = requiredVideosStatus;
      toast.error(`Please watch all required videos first. You've completed ${watched} of ${total} required videos.`);
      return;
    }
    
    try {
      // Use public mutation for non-logged-in users, protected mutation for logged-in users
      if (user) {
        await updateEnrollment.mutateAsync({
          enrollmentId: enrollment.id,
          step: "bioregulatorVideoWatched",
          value: true,
        });
      } else {
        await updateEnrollmentPublic.mutateAsync({
          enrollmentId: enrollment.id,
          step: "bioregulatorVideoWatched",
          value: true,
        });
      }
      
      if (isCoached) {
        toast.success("Great job! You can now proceed to payment.");
        setActiveTab("journey");
      } else {
        toast.success("Great job! You now have full access to all resources.");
        setActiveTab("journey");
      }
    } catch (error) {
      console.error("Error marking video complete:", error);
      // Error toast is handled by mutation onError
    }
  };
  
  // Define journey steps based on enrollment status and tier
  const getJourneySteps = (): JourneyStep[] => {
    const e = enrollment;
    
    if (!isCoached) {
      // Self-guided program (Essentials $1,000) - includes payment step
      return [
        {
          id: "masterclass",
          title: "Watch Masterclass",
          description: "Complete the video training library",
          icon: Video,
          status: "available",
          phase: "pre-consult",
        },
        {
          id: "bioregulator",
          title: "Watch Bioregulator Video",
          description: "Required: Complete the Anti-Aging & Bioregulators training",
          icon: Play,
          status: e?.bioregulatorVideoWatched ? "completed" : "current",
          phase: "pre-consult",
        },
        {
          id: "coaching-fee",
          title: "Pay Program Fee ($1,000)",
          description: "Complete payment to unlock full program access",
          icon: CreditCard,
          status: e?.bioregulatorVideoWatched 
            ? (e?.coachingFeePaid ? "completed" : "current") 
            : "locked",
          phase: "pre-consult",
        },
        {
          id: "protocol-builder",
          title: "Build Your Protocol",
          description: "Use the protocol builder to design your custom protocol",
          icon: Target,
          status: e?.coachingFeePaid ? "available" : "locked",
          phase: "program-design",
        },
        {
          id: "weekly-tracking",
          title: "Weekly Self-Tracking",
          description: "Track your progress with weekly check-in forms",
          icon: ClipboardCheck,
          status: e?.coachingFeePaid ? "available" : "locked",
          phase: "active",
        },
        {
          id: "community",
          title: "Join Community",
          description: "Connect with other members in Omega Elite (1 month access)",
          icon: Sparkles,
          status: e?.coachingFeePaid ? "available" : "locked",
          phase: "active",
        },
      ];
    }
    
    // Full coached program
    return [
      // Pre-Consult Phase
      {
        id: "masterclass",
        title: "Watch Masterclass",
        description: "Complete the recommended video training (optional but highly recommended)",
        icon: Video,
        status: "available",
        phase: "pre-consult",
      },
      {
        id: "bioregulator",
        title: "Watch Bioregulator Video",
        description: "Required: Complete the Ageless & Timeless bioregulator training (~20 min)",
        icon: Play,
        status: e?.bioregulatorVideoWatched ? "completed" : "current",
        phase: "pre-consult",
      },
      {
        id: "coaching-fee",
        title: "Pay Coaching Fee",
        description: isElite ? "Secure your spot with the $10,000 Elite Longevity investment" : "Secure your spot with the $3,000 coaching investment",
        icon: CreditCard,
        status: e?.coachingFeePaid ? "completed" : (e?.bioregulatorVideoWatched ? "current" : "locked"),
        phase: "pre-consult",
      },
      {
        id: "intake-form",
        title: "Complete Intake Form",
        description: "Share your health history, goals, and sign required agreements",
        icon: FileText,
        status: e?.intakeFormCompleted ? "completed" : (e?.coachingFeePaid ? "current" : "locked"),
        phase: "pre-consult",
      },
      {
        id: "schedule-discovery",
        title: "Schedule Strategy Session",
        description: "Book your 60-minute strategy call to discuss your goals",
        icon: Calendar,
        status: e?.discoverySessionScheduled ? "completed" : (e?.intakeFormCompleted ? "available" : "locked"),
        phase: "pre-consult",
      },
      // Program Design Phase
      {
        id: "coach-builds-protocol",
        title: "Coach Builds Your Protocol",
        description: "Your coach reviews your intake forms and builds your personalized protocol (3-4 business days)",
        icon: FileText,
        status: e?.protocolReady ? "completed" : (e?.intakeFormCompleted ? "current" : "locked"),
        phase: "program-design",
      },
      {
        id: "discovery-session",
        title: "Strategy Session",
        description: "Meet with your coach to review goals and health history",
        icon: MessageSquare,
        status: e?.discoverySessionCompleted ? "completed" : (e?.discoverySessionScheduled ? "current" : "locked"),
        phase: "program-design",
      },
      {
        id: "protocol-approval",
        title: "Review & Approve Protocol",
        description: "Review your custom protocol and approve it via coaching chat",
        icon: ClipboardCheck,
        status: e?.protocolApproved ? "completed" : (e?.protocolReady ? "current" : "locked"),
        phase: "program-design",
      },
      {
        id: "protocol-payment",
        title: "Pay Protocol Cost",
        description: "Complete payment for compounds, supplements, and supplies",
        icon: CreditCard,
        status: e?.protocolPaid ? "completed" : (e?.protocolApproved ? "current" : "locked"),
        phase: "program-design",
      },
      // Fulfillment Phase
      {
        id: "box-shipped",
        title: "Protocol in a Box Ships",
        description: "Your complete protocol kit is prepared and shipped",
        icon: Package,
        status: e?.boxShipped ? "completed" : (e?.protocolPaid ? "current" : "locked"),
        phase: "fulfillment",
      },
      {
        id: "box-delivered",
        title: "Box Delivered",
        description: "Your protocol kit has arrived!",
        icon: Package,
        status: e?.boxDelivered ? "completed" : (e?.boxShipped ? "current" : "locked"),
        phase: "fulfillment",
      },
      {
        id: "unpacking-video",
        title: "Watch Unpacking Video",
        description: "Required: Watch the unpacking and inventory video before training",
        icon: Video,
        status: e?.unpackingVideoWatched ? "completed" : (e?.boxDelivered ? "current" : "locked"),
        phase: "fulfillment",
      },
      {
        id: "schedule-reconstitution",
        title: "Schedule Reconstitution Training",
        description: "Book your 1-hour hands-on training session",
        icon: Calendar,
        status: e?.reconstitutionScheduled ? "completed" : (e?.unpackingVideoWatched ? "current" : "locked"),
        phase: "fulfillment",
      },
      {
        id: "reconstitution-training",
        title: "Reconstitution Training",
        description: "Complete your hands-on training session",
        icon: Video,
        status: e?.reconstitutionCompleted ? "completed" : (e?.reconstitutionScheduled ? "current" : "locked"),
        phase: "fulfillment",
      },
      // Active Phase
      {
        id: "launch",
        title: "Launch Your Protocol! 🚀",
        description: "Begin your 90-day transformation journey",
        icon: Sparkles,
        status: e?.reconstitutionCompleted ? "completed" : "locked",
        phase: "active",
      },
      {
        id: "weekly-checkins",
        title: "Weekly Check-ins",
        description: "Complete your weekly progress forms",
        icon: ClipboardCheck,
        status: e?.reconstitutionCompleted ? "available" : "locked",
        phase: "active",
      },
      {
        id: "week3-review",
        title: "Week 3 Check-in Session",
        description: "Review progress and make adjustments",
        icon: MessageSquare,
        status: "locked",
        phase: "active",
      },
      {
        id: "month2-session",
        title: "Month 2 Session (Optional)",
        description: "Optional 45-minute check-in session",
        icon: Calendar,
        status: "locked",
        phase: "active",
      },
      // Completion Phase
      {
        id: "final-review",
        title: "Month 3 Final Review",
        description: "Complete your transformation with goal assessment",
        icon: Trophy,
        status: "locked",
        phase: "completion",
      },
    ];
  };
  
  const journeySteps = getJourneySteps();
  const progress = calculateProgress();
  
  // Get current phase
  const getCurrentPhase = () => {
    const currentStep = journeySteps.find(s => s.status === "current");
    return currentStep?.phase || "pre-consult";
  };
  
  const phaseLabels: Record<string, string> = isCoached ? {
    "pre-consult": "Pre-Consult",
    "program-design": "Program Design",
    "fulfillment": "Fulfillment & Training",
    "active": "Active Protocol",
    "completion": "Completion",
  } : {
    "pre-consult": "Getting Started",
    "program-design": "Protocol Building",
    "active": "Your Journey",
  };
  
  // Handle step action
  const handleStepAction = (stepId: string) => {
    switch (stepId) {
      case "masterclass":
      case "bioregulator":
        setActiveTab("masterclass");
        break;
      case "coaching-fee":
        // Show tier selector first if no tier is selected yet
        console.log('[handleStepAction] coaching-fee - selectedPaymentTier:', selectedPaymentTier, 'storedProgramTier:', storedProgramTier);
        if (!selectedPaymentTier && !storedProgramTier) {
          console.log('[handleStepAction] Showing tier selector');
          setShowTierSelector(true);
        } else {
          console.log('[handleStepAction] Showing payment dialog');
          setShowPaymentDialog(true);
        }
        break;
      case "intake-form":
        setShowIntakeForm(true);
        break;
      case "schedule-discovery":
        handleSchedule("discovery");
        break;
      case "coach-builds-protocol":
        // Informational step - no action needed, coach is building the protocol
        toast.info("Your coach is reviewing your intake forms and building your personalized protocol. This typically takes 3-4 business days.");
        break;
      case "schedule-reconstitution":
        handleSchedule("reconstitution");
        break;
      case "week3-review":
      case "month2-session":
        handleSchedule("checkin");
        break;
      case "protocol-builder":
        setActiveTab("journey");
        break;
      case "weekly-tracking":
        setLocation("/client-corner");
        break;
      case "community":
        window.open(OMEGA_ELITE_URL, "_blank");
        break;
      default:
        break;
    }
  };
  


  // Find the bioregulator video (Section 4)
  const bioregulatorVideo = (videoSections as any[])?.find(
    (v: any) => v.isRequired || v.sectionNumber === 4 || v.title?.toLowerCase().includes("bioregulator")
  );
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="container max-w-6xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10" />
              <span className="text-gray-400 hidden md:inline">|</span>
              <span className={`text-sm font-medium ${isElite ? "text-purple-600" : isFlagship ? "text-amber-600" : "text-slate-600"}`}>
                {isElite ? "Elite Longevity" : isFlagship ? "90-Day Transformation" : "Protocol Essentials"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${isElite ? "bg-purple-50 text-purple-700 border-purple-200" : isFlagship ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                {phaseLabels[getCurrentPhase()]}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setLocation("/transformation")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Exit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl px-4 py-8">
        {/* Welcome Video Section */}
        {isCoached && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="h-5 w-5 text-amber-600" />
                  <h2 className="text-xl font-bold text-gray-900">Welcome to Your Transformation</h2>
                </div>
                <p className="text-gray-600 text-sm">
                  Watch this quick introduction to understand what to expect on your journey with Omega Longevity.
                </p>
              </div>
              <div className="px-6 pb-6">
                <div className="relative rounded-xl overflow-hidden shadow-inner" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src="https://www.loom.com/embed/c5230202b86a4fb186cc2b861da0cdc0?sid=auto"
                    frameBorder="0"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title="Welcome to Your Transformation - Jason"
                  />
                </div>
                <p className="text-xs text-amber-600 mt-3 text-center">
                  <strong>Pro Tip:</strong> This video sets the foundation for your entire journey. Watch it before diving into the steps below!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isElite ? "Elite Longevity Journey" : isFlagship ? "Your Transformation Journey" : "Protocol Essentials"}
              </h1>
              <p className="text-gray-600">
                {isElite ? "6-Month Comprehensive Program" : isFlagship ? "90-Day Flagship Program" : "Self-Guided Protocol Building"}
              </p>
            </div>
            {isEssentials && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowUpgradeDialog(true)}
              >
                <Crown className="h-4 w-4 mr-1" />
                Upgrade to Flagship
              </Button>
            )}
          </div>
          
          
          {/* Progress Bar */}
          <div className={`rounded-xl p-4 border ${isElite ? "bg-purple-50 border-purple-100" : isFlagship ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Your Progress</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Self-Guided Notice */}
          {!isCoached && !enrollment?.bioregulatorVideoWatched && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">Complete the Required Video</p>
                  <p className="text-blue-700 text-sm">
                    Watch the Anti-Aging & Bioregulators video (Section 4) to unlock all resources and the protocol builder.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Your Journey Roadmap - Big Picture Vision */}
          {isCoached && (
            <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold text-gray-900">Your Transformation Roadmap</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Here's exactly what to expect on your journey. Each step builds on the last to create your personalized protocol.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Step 1 - Anti-Aging Video */}
                <div className={`bg-white rounded-lg p-4 border shadow-sm transition-all ${enrollment?.bioregulatorVideoWatched ? 'border-green-300 bg-green-50' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {enrollment?.bioregulatorVideoWatched ? (
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    )}
                    <span className={`font-semibold text-sm ${enrollment?.bioregulatorVideoWatched ? 'text-green-700' : 'text-gray-900'}`}>Watch Anti-Aging Video</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-11">
                    Understand the incredible power of peptides through Dr. Scott's interview (required)
                  </p>
                </div>
                
                {/* Step 2 - Masterclass */}
                <div className={`bg-white rounded-lg p-4 border shadow-sm transition-all ${enrollment?.bioregulatorVideoWatched ? 'border-green-300 bg-green-50' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {enrollment?.bioregulatorVideoWatched ? (
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    )}
                    <span className={`font-semibold text-sm ${enrollment?.bioregulatorVideoWatched ? 'text-green-700' : 'text-gray-900'}`}>Explore the Masterclass</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-11">
                    Watch sections relevant to your goals—weight loss, energy, longevity. Better yet, watch it all!
                  </p>
                </div>
                
                {/* Step 3 - Pay Coaching Fee */}
                <div className={`bg-white rounded-lg p-4 border shadow-sm transition-all ${enrollment?.coachingFeePaid ? 'border-green-300 bg-green-50' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {enrollment?.coachingFeePaid ? (
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    )}
                    <span className={`font-semibold text-sm ${enrollment?.coachingFeePaid ? 'text-green-700' : 'text-gray-900'}`}>Pay Coaching Fee</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-11">
                    Secure your spot and unlock your personalized coaching experience
                  </p>
                </div>
                
                {/* Step 4 - Complete Waiver & Goals */}
                <div className={`bg-white rounded-lg p-4 border shadow-sm transition-all ${enrollment?.waiverCompleted ? 'border-green-300 bg-green-50' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {enrollment?.waiverCompleted ? (
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    )}
                    <span className={`font-semibold text-sm ${enrollment?.waiverCompleted ? 'text-green-700' : 'text-gray-900'}`}>Complete Waiver & Goals</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-11">
                    Share your health history and goals so we can personalize your protocol
                  </p>
                </div>
                
                {/* Step 5 - Strategy Session */}
                <div className={`bg-white rounded-lg p-4 border shadow-sm transition-all ${enrollment?.discoverySessionCompleted ? 'border-green-300 bg-green-50' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {enrollment?.discoverySessionCompleted ? (
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                    )}
                    <span className={`font-semibold text-sm ${enrollment?.discoverySessionCompleted ? 'text-green-700' : 'text-gray-900'}`}>Strategy Session</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-11">
                    Meet with your coach to discuss goals and how aggressive you want to get
                  </p>
                </div>
                
                {/* Step 6 - Custom Protocol */}
                <div className={`bg-white rounded-lg p-4 border shadow-sm transition-all ${enrollment?.protocolReady ? 'border-green-300 bg-green-50' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {enrollment?.protocolReady ? (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                    )}
                    <span className={`font-semibold text-sm ${enrollment?.protocolReady ? 'text-green-700' : 'text-gray-900'}`}>Custom Protocol</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-11">
                    Your coach builds your personalized program and sends it for your review
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-xs text-amber-700 text-center">
                  <strong>Pro Tip:</strong> The more you engage with the Masterclass content, the more prepared you'll be for your Strategy Session—and the better results you'll achieve!
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(tab) => {
          // Gate: prevent switching to content tabs if profile not completed
          const isProfileDone = !!(enrollment as any)?.profileCompleted;
          if (!isProfileDone && tab !== 'profile') {
            toast.error('Please complete your profile first to access the content.');
            return;
          }
          setActiveTab(tab);
        }} className="max-w-4xl mx-auto">
          <TabsList className={`grid w-full ${!(enrollment as any)?.profileCompleted ? 'grid-cols-3' : 'grid-cols-2'} bg-white border-2 ${isCoached ? 'border-amber-200' : 'border-blue-200'} rounded-xl p-1 h-auto`}>
            {/* Profile tab - only shown when profile not completed */}
            {!(enrollment as any)?.profileCompleted && (
              <TabsTrigger value="profile" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-2 data-[state=active]:border-green-400 data-[state=active]:shadow-md rounded-lg py-3 text-base font-semibold transition-all">
                <FileText className="h-5 w-5 mr-2" />
                Profile
              </TabsTrigger>
            )}
            <TabsTrigger value="masterclass" className={`data-[state=active]:shadow-md rounded-lg py-3 text-base font-semibold transition-all ${isCoached ? 'data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-2 data-[state=active]:border-amber-400' : 'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-2 data-[state=active]:border-blue-400'} ${!(enrollment as any)?.profileCompleted ? 'opacity-50' : ''}`}>
              {!(enrollment as any)?.profileCompleted && <Lock className="h-4 w-4 mr-2" />}
              <PlayCircle className="h-5 w-5 mr-2" />
              Masterclass
            </TabsTrigger>
            <TabsTrigger value="journey" className={`data-[state=active]:shadow-md rounded-lg py-3 text-base font-semibold transition-all ${isCoached ? 'data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-2 data-[state=active]:border-amber-400' : 'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-2 data-[state=active]:border-blue-400'} ${!(enrollment as any)?.profileCompleted ? 'opacity-50' : ''}`}>
              {!(enrollment as any)?.profileCompleted && <Lock className="h-4 w-4 mr-2" />}
              <Map className="h-5 w-5 mr-2" />
              {isCoached ? 'Journey' : 'Progress'}
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Gate Tab */}
          <TabsContent value="profile" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <Card className="border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">Complete Your Profile</CardTitle>
                      <CardDescription className="text-gray-600">
                        Please provide your contact information to get started. This helps your coach personalize your experience.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  {/* Required Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                      <PhoneInput
                        value={profilePhone}
                        onChange={(value) => setProfilePhone(value)}
                        showCountryCode={true}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Optional Address Fields */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Shipping Address <span className="text-gray-400">(optional — needed later for product fulfillment)</span></p>
                    <div className="space-y-3">
                      <AddressAutocomplete
                        value={profileAddress}
                        onChange={setProfileAddress}
                        onAddressSelected={(components) => {
                          setProfileAddress(components.street);
                          setProfileCity(components.city);
                          setProfileState(components.state);
                          setProfileZip(components.zip);
                        }}
                        placeholder="Start typing an address..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={profileCity}
                          onChange={(e) => setProfileCity(e.target.value)}
                          placeholder="City"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                        />
                        <input
                          type="text"
                          value={profileState}
                          onChange={(e) => setProfileState(e.target.value)}
                          placeholder="State"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                        />
                        <input
                          type="text"
                          value={profileZip}
                          onChange={(e) => setProfileZip(e.target.value)}
                          placeholder="ZIP Code"
                          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 text-lg font-semibold"
                    disabled={profileSaving || !profileName.trim() || !profileEmail.trim() || !profilePhone.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)}
                    onClick={async () => {
                      if (!enrollment?.id) {
                        toast.error('Enrollment not found. Please try refreshing the page.');
                        return;
                      }
                      setProfileSaving(true);
                      try {
                        await saveProfileMutation.mutateAsync({
                          enrollmentId: enrollment.id,
                          fullName: profileName.trim(),
                          email: profileEmail.trim(),
                          phone: profilePhone.trim(),
                          address: profileAddress.trim() || undefined,
                          city: profileCity.trim() || undefined,
                          state: profileState.trim() || undefined,
                          zipCode: profileZip.trim() || undefined,
                        });
                      } catch (err) {
                        // Error handled by mutation onError
                      } finally {
                        setProfileSaving(false);
                      }
                    }}
                  >
                    {profileSaving ? (
                      <><Clock className="h-5 w-5 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><ArrowRight className="h-5 w-5 mr-2" /> Continue to Masterclass</>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Your information is kept private and only shared with your coach.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Masterclass Tab */}
          <TabsContent value="masterclass" className="mt-6">
            {/* Skip to Journey/Resources Option */}
            {!enrollment?.bioregulatorVideoWatched && (
              <div className={`mb-6 p-4 border rounded-lg flex items-center justify-between ${isCoached ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}>
                <div>
                  <p className={`font-medium ${isCoached ? "text-amber-800" : "text-blue-800"}`}>Ready to proceed?</p>
                  <p className={`text-sm ${isCoached ? "text-amber-700" : "text-blue-700"}`}>
                    Complete the required bioregulator video below, then continue to {isCoached ? "payment" : "your progress"}.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={isCoached ? "border-amber-300 text-amber-700 hover:bg-amber-100" : "border-blue-300 text-blue-700 hover:bg-blue-100"}
                  onClick={() => setActiveTab("journey")}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip to {isCoached ? "Journey" : "Progress"}
                </Button>
              </div>
            )}

            {/* Masterclass Context Message */}
            <div className="mb-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">About This Masterclass</h3>
                  <p className="text-gray-700 leading-relaxed">
                    This comprehensive masterclass was originally developed for a premier men's life coaching community, where I invested three months of dedicated effort to create the most thorough peptide and optimization education available. The content reflects my commitment to delivering real, actionable knowledge—not surface-level information.
                  </p>
                  <div className="bg-white/70 border border-blue-100 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed">
                      <span className="font-semibold text-blue-700">Important Note:</span> While the original branding and some examples reference men's health, <span className="font-medium">95% of this content applies equally to both men and women</span>. The protocols, science, and optimization strategies are universal. Until I'm able to re-record with updated branding, please know that the value and applicability of this education is the same regardless of gender.
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 italic">
                    Thank you for your understanding as I continue to improve and expand this resource.
                  </p>
                </div>
              </div>
            </div>

            {/* Video Progress Tracker */}
            {videoSections && (videoSections as any[])?.length > 0 && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm mb-6">
                <CardContent className="py-4">
                  {(() => {
                    const totalVideos = (videoSections as any[])?.length || 0;
                    const completedVideos = (videoProgress as any[])?.filter((p: any) => p.isCompleted)?.length || 0;
                    const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
                    const totalMinutes = (videoSections as any[])?.reduce((acc: number, v: any) => acc + (v.estimatedDurationMinutes || 0), 0) || 0;
                    const watchedMinutes = (videoProgress as any[])?.reduce((acc: number, p: any) => acc + Math.floor((p.watchedSeconds || 0) / 60), 0) || 0;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              progressPercent === 100 ? 'bg-green-500' : progressPercent > 50 ? 'bg-emerald-400' : 'bg-green-300'
                            }`}>
                              {progressPercent === 100 ? (
                                <Trophy className="h-6 w-6 text-white" />
                              ) : (
                                <span className="text-white font-bold text-sm">{progressPercent}%</span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {progressPercent === 100 ? 'Masterclass Complete!' : 'Your Masterclass Progress'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {completedVideos} of {totalVideos} videos completed
                                {totalMinutes > 0 && ` • ${watchedMinutes}/${totalMinutes} min watched`}
                              </p>
                            </div>
                          </div>
                          {progressPercent === 100 && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              All Complete
                            </Badge>
                          )}
                        </div>
                        <div className="relative">
                          <Progress value={progressPercent} className="h-3 bg-green-100" />
                          <div className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Started</span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {progressPercent < 100 ? `${totalVideos - completedVideos} videos remaining` : 'Journey ready!'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Pre-Consult Video Training</CardTitle>
                <CardDescription className="text-gray-600">
                  Prepare for your transformation journey with our curated video content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Required Videos Section */}
                {(videoSections as any[])?.filter((v: any) => v.isRequired)?.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">Required Pre-Consult Videos</h3>
                          <p className="text-gray-700 text-sm mt-1">
                            These videos will open your eyes to the incredible possibilities in the longevity world. 
                            Watch these before your consultation to get the most out of your transformation journey.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${requiredVideosStatus.watched === requiredVideosStatus.total ? "bg-green-500" : "bg-amber-500"} text-white`}>
                              {requiredVideosStatus.watched} of {requiredVideosStatus.total} completed
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(videoSections as any[])?.filter((v: any) => v.isRequired).map((section: any) => {
                        const sectionProgress = (videoProgress as any[])?.find(
                          (p: any) => p.videoId === section.id
                        );
                        const isCompleted = sectionProgress?.isCompleted;
                        const watchedMinutes = sectionProgress?.watchedSeconds ? Math.floor(sectionProgress.watchedSeconds / 60) : 0;
                        
                        return (
                          <div
                            key={section.id}
                            className={`p-4 rounded-lg border-2 ${
                              isCompleted
                                ? "border-green-300 bg-green-50"
                                : "border-amber-300 bg-amber-50"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                isCompleted ? "bg-green-100" : "bg-amber-100"
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                                ) : (
                                  <Play className="h-6 w-6 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-gray-900">{section.title}</h4>
                                  <Badge className="bg-amber-500 text-white text-xs">Required</Badge>
                                </div>
                                <p className="text-sm text-gray-600">{section.description}</p>
                                {section.estimatedDurationMinutes && section.estimatedDurationMinutes > 0 && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>{section.estimatedDurationMinutes} min</span>
                                    {watchedMinutes > 0 && !isCompleted && (
                                      <span className="ml-2">• {watchedMinutes} min watched</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant={isCompleted ? "outline" : "default"}
                                  size="sm"
                                  className={isCompleted ? "border-green-300 text-green-700 hover:bg-green-50" : "bg-amber-500 hover:bg-amber-600 text-white"}
                                  onClick={() => handleWatchVideo(section)}
                                >
                                  {isCompleted ? "Rewatch" : "Watch"}
                                  <ExternalLink className="h-4 w-4 ml-1" />
                                </Button>
                                {!isCompleted && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => {
                                      if (!enrollment?.id) {
                                        toast.error("No enrollment found. Please refresh the page.");
                                        return;
                                      }
                                      updateVideoProgress.mutate({
                                        enrollmentId: enrollment.id,
                                        videoId: section.id,
                                        watchedSeconds: (section.estimatedDurationMinutes || 10) * 60,
                                        totalSeconds: (section.estimatedDurationMinutes || 10) * 60,
                                        isCompleted: true,
                                      });
                                    }}
                                    disabled={updateVideoProgress.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    {updateVideoProgress.isPending ? "Saving..." : "Mark Complete"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Optional Masterclass Section */}
                {(videoSections as any[])?.filter((v: any) => !v.isRequired)?.length > 0 && (
                  <div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Video className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">Complete Masterclass Library</h3>
                          <p className="text-gray-700 text-sm mt-1">
                            Our full masterclass covers everything from peptide fundamentals to advanced optimization. 
                            We highly recommend watching the sessions most applicable to your individual health goals.
                          </p>
                          <p className="text-blue-600 text-xs font-medium mt-2">
                            Optional but highly recommended for best results
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(videoSections as any[])?.filter((v: any) => !v.isRequired).map((section: any) => {
                    const sectionProgress = (videoProgress as any[])?.find(
                      (p: any) => p.videoId === section.id
                    );
                    const isCompleted = sectionProgress?.isCompleted;
                    const watchedMinutes = sectionProgress?.watchedSeconds ? Math.floor(sectionProgress.watchedSeconds / 60) : 0;
                    
                    return (
                      <div
                        key={section.id}
                        className={`p-4 rounded-lg border ${
                          section.isRequired
                            ? isCoached ? "border-amber-300 bg-amber-50" : "border-blue-300 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isCompleted
                              ? "bg-green-100"
                              : section.isRequired
                              ? isCoached ? "bg-amber-100" : "bg-blue-100"
                              : "bg-gray-200"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : (
                              <Play className="h-6 w-6 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-gray-900">{section.title}</h4>
                              {!!section.isRequired && (
                                <Badge className={`text-white text-xs ${isCoached ? "bg-amber-500" : "bg-blue-500"}`}>
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{section.description}</p>
                            {section.estimatedDurationMinutes && section.estimatedDurationMinutes > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{section.estimatedDurationMinutes} min</span>
                                {watchedMinutes > 0 && !isCompleted && (
                                  <span className="ml-2">• {watchedMinutes} min watched</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant={isCompleted ? "outline" : "default"}
                              size="sm"
                              className={isCompleted ? "border-green-300 text-green-700 hover:bg-green-50" : isCoached ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                              onClick={() => handleWatchVideo(section)}
                            >
                              {isCompleted ? "Rewatch" : "Watch"}
                              <ExternalLink className="h-4 w-4 ml-1" />
                            </Button>
                            {!!section.isRequired && !isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  if (!enrollment?.id) {
                                    toast.error("No enrollment found. Please refresh the page.");
                                    return;
                                  }
                                  updateVideoProgress.mutate({
                                    enrollmentId: enrollment.id,
                                    videoId: section.id,
                                    watchedSeconds: (section.estimatedDurationMinutes || 10) * 60,
                                    totalSeconds: (section.estimatedDurationMinutes || 10) * 60,
                                    isCompleted: true,
                                  });
                                }}
                                disabled={updateVideoProgress.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                {updateVideoProgress.isPending ? "Saving..." : "Mark Complete"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                        })}
                    </div>
                  </div>
                )}
                  
                {(!videoSections || (videoSections as any[])?.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Video library is being prepared. Check back soon!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Journey Tab */}
          <TabsContent value="journey" className="mt-6">
            <div className="space-y-4">
              {Object.entries(phaseLabels).map(([phase, label]) => {
                const phaseSteps = journeySteps.filter(s => s.phase === phase);
                if (phaseSteps.length === 0) return null;
                
                return (
                  <Card key={phase} className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                        {label}
                        {phaseSteps.every(s => s.status === "completed") && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {phaseSteps.map((step) => (
                          <div
                            key={step.id}
                            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                              step.status === "current"
                                ? isCoached ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"
                                : step.status === "completed"
                                ? "bg-green-50 border border-green-100"
                                : "bg-gray-50 border border-gray-100"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              step.status === "completed"
                                ? "bg-green-100"
                                : step.status === "current"
                                ? isCoached ? "bg-amber-100" : "bg-blue-100"
                                : "bg-gray-200"
                            }`}>
                              {step.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : step.status === "locked" ? (
                                <Lock className="h-5 w-5 text-gray-400" />
                              ) : (
                                <step.icon className={`h-5 w-5 ${
                                  step.status === "current" ? (isCoached ? "text-amber-600" : "text-blue-600") : "text-gray-500"
                                }`} />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-medium ${
                                step.status === "locked" ? "text-gray-400" : "text-gray-900"
                              }`}>
                                {step.title}
                              </h4>
                              <p className={`text-sm ${
                                step.status === "locked" ? "text-gray-400" : "text-gray-600"
                              }`}>{step.description}</p>
                            </div>
                            {step.status === "current" && (
                              <Button
                                size="sm"
                                className={isCoached ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                                onClick={() => handleStepAction(step.id)}
                              >
                                Start
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            )}
                            {step.status === "available" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                                onClick={() => handleStepAction(step.id)}
                              >
                                View
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Weekly Check-in Forms - Available for both tiers */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <ClipboardCheck className={`h-5 w-5 ${isCoached ? "text-amber-500" : "text-blue-500"}`} />
                    Weekly Check-in Forms
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {isCoached 
                      ? "Track your progress and get coach feedback" 
                      : "Self-track your progress throughout your journey"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {isCoached 
                      ? "Complete weekly forms to keep your coach updated on your progress."
                      : "Use these forms to track your own progress. No coach feedback included in this tier."
                    }
                  </p>
                  <Button 
                    className={`w-full text-white ${isCoached ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={() => setLocation("/client-corner")}
                    disabled={!enrollment?.bioregulatorVideoWatched}
                  >
                    {enrollment?.bioregulatorVideoWatched ? (
                      <>
                        Access Check-in Forms
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Complete Required Video First
                      </>
                    )}
                  </Button>
                  {!isCoached && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Self-tracking only • No coach feedback
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Labs Upload */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Upload className={`h-5 w-5 ${isCoached ? "text-amber-500" : "text-blue-500"}`} />
                    Lab Results
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Upload your lab results (optional but recommended)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Labs can be uploaded at any point during your journey.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Lab Results
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Need labs?{" "}
                      <a href="#" className={`hover:underline ${isCoached ? "text-amber-600" : "text-blue-600"}`}>Physician Referral</a>
                      {" "}or{" "}
                      <a 
                        href={PRIVATEMD_URL} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`hover:underline ${isCoached ? "text-amber-600" : "text-blue-600"}`}
                      >
                        PrivateMD Labs
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Omega Elite Community */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Sparkles className={`h-5 w-5 ${isCoached ? "text-amber-500" : "text-blue-500"}`} />
                    Omega Elite Community
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    3 months FREE access included with your program
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect with other members and get community support.
                  </p>
                  <Button 
                    className={`w-full text-white ${isCoached ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={() => window.open(OMEGA_ELITE_URL, "_blank")}
                  >
                    Access Community
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* TruDiagnostic */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${isCoached ? "text-amber-500" : "text-blue-500"}`} />
                    Biological Age Test
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Track your biological age transformation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Get tested before starting and again at 6-12 months to see your progress!
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(TRUDIAGNOSTIC_URL, "_blank")}
                  >
                    Learn About TruDiagnostic
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* Coaching Chat - Only for coached tier */}
              {isCoached && (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-amber-500" />
                      Coaching Chat
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Direct messaging with your coach
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Questions? Need adjustments? Reach out anytime.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        if (!user) {
                          toast.info("Please create an account to access chat", {
                            description: "You'll be redirected to sign up",
                            action: {
                              label: "Sign Up",
                              onClick: () => window.location.href = "/api/login",
                            },
                          });
                        } else {
                          setLocation("/messages");
                        }
                      }}
                    >
                      Open Chat
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Upgrade CTA for self-guided */}
              {!isCoached && (
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Want More Support?
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Upgrade to the full coached experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Get 1-on-1 coaching, personalized feedback, and live training sessions.
                    </p>
                    <Button 
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => setShowUpgradeDialog(true)}
                    >
                      Upgrade to 90-Day Transformation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Continue Watching Dialog - Shown after completing required videos */}
      <Dialog open={showContinueWatchingDialog} onOpenChange={setShowContinueWatchingDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Required Videos Complete!
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              You've completed the required pre-consult videos. What would you like to do next?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Great progress!</strong> You're ready to move forward with your transformation journey.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={() => {
                  setShowContinueWatchingDialog(false);
                  // Show tier selector to choose program before payment
                  if (!selectedPaymentTier && !storedProgramTier) {
                    setShowTierSelector(true);
                  } else {
                    setShowPaymentDialog(true);
                  }
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Payment
              </Button>
              
              <Button 
                variant="outline"
                className="w-full border-gray-300"
                onClick={() => {
                  setShowContinueWatchingDialog(false);
                  setActiveTab("masterclass");
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Continue Watching Masterclass
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Our full masterclass covers everything from peptide fundamentals to advanced optimization. 
                We highly recommend watching sessions most applicable to your individual health goals.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Tier Selector Dialog */}
      <Dialog open={showTierSelector} onOpenChange={setShowTierSelector}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl">Choose Your Program</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select the program tier that best fits your goals and commitment level
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-3 gap-4 py-4">
            {/* Essentials $1,000 */}
            <div 
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                selectedPaymentTier === "essentials" 
                  ? "border-slate-500 bg-slate-50 shadow-md" 
                  : "border-gray-200 hover:border-slate-300"
              }`}
              onClick={() => setSelectedPaymentTier("essentials")}
            >
              <div className="text-center mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Target className="h-5 w-5 text-slate-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Protocol Essentials</h3>
                <div className="text-2xl font-bold text-slate-600">$1,000</div>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Self-paced masterclass</li>
                <li>• Protocol templates</li>
                <li>• Video guides</li>
                <li>• 1 month community</li>
                <li>• Self-Guided Check-ins</li>
              </ul>
              {selectedPaymentTier === "essentials" && (
                <div className="mt-3 flex justify-center">
                  <CheckCircle2 className="h-6 w-6 text-slate-600" />
                </div>
              )}
            </div>
            
            {/* Flagship $3000 */}
            <div 
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md relative ${
                selectedPaymentTier === "flagship" 
                  ? "border-amber-500 bg-amber-50 shadow-md" 
                  : "border-gray-200 hover:border-amber-300"
              }`}
              onClick={() => setSelectedPaymentTier("flagship")}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Most Popular</span>
              </div>
              <div className="text-center mb-3 pt-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Crown className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900">90-Day Transformation</h3>
                <div className="text-2xl font-bold text-amber-600">$3,000</div>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Discovery session</li>
                <li>• Custom protocol design</li>
                <li>• 1-hour training</li>
                <li>• Weekly check-ins</li>
                <li>• 3 months community</li>
                <li>• Direct chat support</li>
              </ul>
              {selectedPaymentTier === "flagship" && (
                <div className="mt-3 flex justify-center">
                  <CheckCircle2 className="h-6 w-6 text-amber-600" />
                </div>
              )}
            </div>
            
            {/* Elite $10000 */}
            <div 
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                selectedPaymentTier === "elite" 
                  ? "border-purple-500 bg-purple-50 shadow-md" 
                  : "border-gray-200 hover:border-purple-300"
              }`}
              onClick={() => setSelectedPaymentTier("elite")}
            >
              <div className="text-center mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Diamond className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Elite Longevity</h3>
                <div className="text-2xl font-bold text-purple-600">$10,000</div>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 2-hour consultation</li>
                <li>• Premium protocol</li>
                <li>• In-person training</li>
                <li>• Weekly 1-on-1 calls</li>
                <li>• 6 months community</li>
                <li>• VIP priority support</li>
              </ul>
              {selectedPaymentTier === "elite" && (
                <div className="mt-3 flex justify-center">
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowTierSelector(false)}>
              Cancel
            </Button>
            <Button 
              className={`${
                selectedPaymentTier === "elite" ? "bg-purple-600 hover:bg-purple-700" :
                selectedPaymentTier === "flagship" ? "bg-amber-500 hover:bg-amber-600" :
                "bg-slate-600 hover:bg-slate-700"
              } text-white`}
              disabled={!selectedPaymentTier}
              onClick={() => {
                if (selectedPaymentTier) {
                  sessionStorage.setItem("programTier", selectedPaymentTier);
                  setShowTierSelector(false);
                  setShowPaymentDialog(true);
                }
              }}
            >
              Continue to Payment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Payment Dialog - Dynamic based on tier */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) {
              // Reset promo state when dialog closes (unless payment was successful)
              setPromoInput("");
              setPromoError(null);
            }
          }}>
        <DialogContent className="bg-white border-gray-200 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl">
              {isElite ? "Pay Elite Program Fee" : isFlagship ? "Pay Coaching Fee" : "Pay Program Fee"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {isElite 
                ? "Secure your spot in the Elite Longevity Program" 
                : isFlagship 
                  ? "Secure your spot in the 90-Day Transformation Program"
                  : "Secure your spot in the Protocol Essentials Program"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Amount - Dynamic based on tier with promo discount */}
            <div className="text-center">
              {hasPromoDiscount ? (
                <>
                  <div className="text-2xl text-gray-400 line-through">
                    ${originalAmount}
                  </div>
                  <div className="text-4xl font-bold text-green-600">
                    ${finalAmount}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                      {promoCode} applied - Save ${discountAmount}!
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-4xl font-bold text-gray-900">
                  {isElite ? "$10,000" : isFlagship ? "$3,000" : "$1,000"}
                </div>
              )}
              <p className="text-gray-600 text-sm mt-1">
                {isElite ? "Premium longevity investment" : isFlagship ? "One-time coaching investment" : "Self-guided program fee"}
              </p>
            </div>
            
            {/* Promo Code Input */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              {appliedPromo || (sessionPromoCodeId && !appliedPromo) ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <div>
                      <span className="font-mono text-green-700 font-medium text-sm">{promoCode}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {appliedPromo 
                          ? `(${appliedPromo.discountType === "percent" ? `${appliedPromo.discountValue}% off` : `$${appliedPromo.discountValue.toLocaleString()} off`})`
                          : "applied"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoInput("");
                      setPromoError(null);
                      // Also clear session storage promo
                      sessionStorage.removeItem("promoCodeId");
                      sessionStorage.removeItem("promoCode");
                      sessionStorage.removeItem("originalAmount");
                      sessionStorage.removeItem("discountAmount");
                      sessionStorage.removeItem("finalAmount");
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Have an alumni code?</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter alumni code"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        setPromoError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && promoInput.trim() && handleApplyPromo()}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 font-mono text-sm"
                    />
                    <Button
                      onClick={handleApplyPromo}
                      disabled={isValidatingPromo || !promoInput.trim()}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 px-4"
                    >
                      {isValidatingPromo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-600 mt-1">{promoError}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* What's Included - Using shared TierBenefits component (living copy) */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h4 className="text-gray-900 font-medium mb-2">What's Included:</h4>
              <TierBenefits tier={programTier as "elite" | "flagship" | "essentials"} variant="full" />
            </div>
            
            {/* Guest Info Collection - Show if no email on enrollment */}
            {!enrollment?.email && !user && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-blue-900 font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Your Information
                </h4>
                <p className="text-blue-700 text-sm mb-3">
                  Please provide your details to continue with payment. You'll create your account after payment.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <PhoneInput
                      value={guestPhone}
                      onChange={(value) => setGuestPhone(value)}
                      showCountryCode={true}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional - for follow-up if needed</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Payment Options - Using same PaymentMethodSelector as rest of site */}
            {/* isPublic=true allows guest users to pay without logging in first */}
            {/* Only show payment options if we have email (from enrollment, user, or guest input) */}
            {(enrollment?.email || user?.email || (guestEmail && guestName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))) ? (
              <PaymentMethodSelector
                clientProtocolId={enrollment?.id?.toString() || "0"}
                amount={hasPromoDiscount ? finalAmount! : (isElite ? "10000" : isFlagship ? "3000" : "1000")}
                currency="USD"
                description={`${isElite ? "Elite Longevity Program" : isFlagship ? "90-Day Transformation Program" : "Protocol Essentials Program"}${promoCode ? ` (Promo: ${promoCode})` : ""}`}
                clientEmail={enrollment?.email || user?.email || guestEmail}
                clientName={enrollment?.clientName || user?.name || guestName}
                isPublic={true}
                isTransformation={true}
                enrollmentId={enrollment?.id}
                tier={programTier as "elite" | "flagship" | "essentials"}
                promoCodeId={promoCodeId ? parseInt(promoCodeId) : undefined}
                promoCode={promoCode || undefined}
                originalAmount={originalAmount ? parseFloat(originalAmount) : undefined}
                discountAmount={discountAmount ? parseFloat(discountAmount) : undefined}
                onPaymentSuccess={async (method, orderId) => {
                  console.log(`[TransformationJourney] Payment success via ${method}`, orderId);
                  
                  // Record promo code usage if one was applied
                  if (promoCodeId && enrollment?.id) {
                    try {
                      await recordPromoUsage.mutateAsync({
                        promoCodeId: parseInt(promoCodeId),
                        enrollmentId: enrollment.id,
                        tier: programTier,
                        originalAmount: parseFloat(originalAmount || "0"),
                        discountAmount: parseFloat(discountAmount || "0"),
                        finalAmount: parseFloat(finalAmount || "0"),
                      });
                      console.log(`[TransformationJourney] Promo code usage recorded`);
                    } catch (err) {
                      console.error(`[TransformationJourney] Failed to record promo usage:`, err);
                    }
                  }
                  
                  // Determine the right email/name to use (from guest input, enrollment, or logged-in user)
                  const effectiveEmail = guestEmail || enrollment?.email || user?.email || "";
                  const effectiveName = guestName || enrollment?.clientName || user?.name || "";
                  
                  // Use the PUBLIC payment completion endpoint for ALL payment methods
                  // This works for both guest and logged-in users without requiring authentication
                  // It sets coachingFeePaid=true, sends emails, and generates auth tokens
                  if (effectiveEmail && effectiveName && enrollment?.id) {
                    try {
                      const result = await completePaymentPublic.mutateAsync({
                        enrollmentId: enrollment.id,
                        paymentId: orderId || undefined,
                        paymentMethod: method as "stripe" | "manual",
                        clientEmail: effectiveEmail,
                        clientName: effectiveName,
                        clientPhone: guestPhone || undefined,
                        tier: programTier as any,
                        amount: parseFloat(finalAmount || "0"),
                        promoCodeId: promoCodeId ? parseInt(promoCodeId) : undefined,
                        promoCode: promoCode || undefined,
                        originalAmount: originalAmount ? parseFloat(originalAmount) : undefined,
                        discountAmount: discountAmount ? parseFloat(discountAmount) : undefined,
                      });
                      console.log(`[TransformationJourney] Payment completed via ${method}:`, result);
                      
                      // Store guest info in session for reference
                      if (!user) {
                        sessionStorage.setItem("guestEmail", effectiveEmail);
                        sessionStorage.setItem("guestName", effectiveName);
                      }
                      
                      // Close dialog and show success
                      setShowPaymentDialog(false);
                      
                      // Tier-specific success messages
                      if (isElite) {
                        toast.success("Elite payment confirmed! You can now complete your intake form and schedule your consultation.");
                      } else if (isFlagship) {
                        toast.success("Payment confirmed! You can now complete your intake form and schedule your strategy session.");
                      } else {
                        toast.success("Payment confirmed! Your program access has been activated. Start building your protocol!");
                      }
                      
                      // Refetch enrollment to update UI — this will unlock the intake form step
                      await refetchEnrollment();
                      return;
                    } catch (err) {
                      console.error(`[TransformationJourney] Failed to complete payment via ${method}:`, err);
                      toast.error("Payment recorded but there was an issue updating your enrollment. Please contact support.");
                      return;
                    }
                  }
                  
                  // Fallback for logged-in users without email/name (shouldn't happen normally)
                  handlePaymentConfirmed();
                }}
                onPaymentError={(error) => {
                  console.error(`[TransformationJourney] Payment error:`, error);
                  toast.error(error);
                }}
              />
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  Please enter your name and email above to continue with payment.
                </p>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
      
      {/* Calendly Dialog */}
      <Dialog open={showCalendlyDialog} onOpenChange={setShowCalendlyDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl">
              {calendlyEventType === "discovery" && "Schedule Strategy Session"}
              {calendlyEventType === "reconstitution" && "Schedule Reconstitution Training"}
              {calendlyEventType === "checkin" && "Schedule Check-in Session"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Select a time that works best for you
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Calendly Embed */}
            <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200" style={{ height: "500px" }}>
              <iframe
                src={`${calendlyEventType === "discovery" ? CALENDLY_DISCOVERY_URL : CALENDLY_URL}?hide_gdpr_banner=1`}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Schedule a session"
              />
            </div>
            
            {/* After Scheduling */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={async () => {
                  if (enrollment) {
                    try {
                      const step = calendlyEventType === "discovery" ? "discoverySessionScheduled" as const : "reconstitutionScheduled" as const;
                      // Use public endpoint for guest users, protected for logged-in users
                      if (user) {
                        await updateEnrollment.mutateAsync({
                          enrollmentId: enrollment.id,
                          step,
                          value: true,
                        });
                      } else {
                        await updateEnrollmentPublic.mutateAsync({
                          enrollmentId: enrollment.id,
                          step,
                          value: true,
                        });
                      }
                    } catch (err) {
                      console.error('[TransformationJourney] Failed to update session scheduled:', err);
                      toast.error("Failed to save progress. Please try again.");
                      return;
                    }
                  }
                  setShowCalendlyDialog(false);
                  toast.success("Session scheduled! Check your email for confirmation.");
                }}
                disabled={updateEnrollment.isPending || updateEnrollmentPublic.isPending}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {(updateEnrollment.isPending || updateEnrollmentPublic.isPending) ? "Saving..." : "I've Scheduled My Session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade Dialog - For self-guided users */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-500" />
              Upgrade to 90-Day Transformation
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Get the full coached experience
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="text-amber-800 font-medium mb-2">What You'll Get:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>✓ 60-Minute Strategy Session</li>
                <li>✓ Custom Protocol Design</li>
                <li>✓ Protocol in a Box - Shipped to You</li>
                <li>✓ 1-Hour Reconstitution Training</li>
                <li>✓ Weekly Check-ins with Feedback</li>
                <li>✓ Progress Review Sessions</li>
                <li>✓ Direct Coaching Chat Support</li>
              </ul>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600 text-sm">Upgrade cost</p>
              <p className="text-3xl font-bold text-gray-900">$2,000</p>
              <p className="text-gray-500 text-xs">($3,000 - $1,000 already paid)</p>
            </div>
            
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                window.open("https://omegalongevity.com/contact", "_blank");
                setShowUpgradeDialog(false);
              }}
            >
              Contact Us to Upgrade
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Embedded Video Player Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent 
          className="bg-white border-gray-200 p-0 overflow-hidden"
          style={{ maxWidth: '900px', width: '95vw', maxHeight: '90vh' }}
        >
          <div className={`p-4 border-b border-gray-200 ${isCoached ? "bg-amber-50" : "bg-blue-50"}`}>
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl flex items-center gap-2">
                <Play className={`h-5 w-5 ${isCoached ? "text-amber-500" : "text-blue-500"}`} />
                {selectedVideo?.title}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {selectedVideo?.description}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {/* Embedded Video Player */}
          <div className="bg-black w-full" style={{ height: '500px', minHeight: '300px' }}>
            {selectedVideo?.youtubeVideoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?rel=0&modestbranding=1`}
                width="100%"
                height="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={selectedVideo?.title}
                className="w-full h-full border-0"
                style={{ border: 'none' }}
              />
            ) : selectedVideo?.googleDriveVideoId ? (
              <iframe
                src={`https://drive.google.com/file/d/${selectedVideo.googleDriveVideoId}/preview`}
                width="100%"
                height="100%"
                allow="autoplay; fullscreen"
                allowFullScreen
                title={selectedVideo?.title}
                className="w-full h-full border-0"
                style={{ border: 'none' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center p-8">
                  <Video className={`h-16 w-16 mx-auto mb-4 ${isCoached ? "text-amber-400" : "text-blue-400"}`} />
                  <h3 className="text-xl font-semibold mb-2">Video Not Available</h3>
                  <p className="text-gray-400 mb-6">This video is not yet configured.</p>
                  <Button
                    className={`text-white ${isCoached ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={() => window.open("https://drive.google.com/drive/folders/1pSaA3lkTjTGVJEfSt0fBrI3w8et8H6ON", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Video Library
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Video Actions Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedVideo?.estimatedDurationMinutes && selectedVideo.estimatedDurationMinutes > 0 && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {selectedVideo.estimatedDurationMinutes} min
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  if (selectedVideo?.youtubeVideoId) {
                    window.open(`https://www.youtube.com/watch?v=${selectedVideo.youtubeVideoId}`, "_blank");
                  } else if (selectedVideo?.googleDriveVideoId) {
                    window.open(`https://drive.google.com/file/d/${selectedVideo.googleDriveVideoId}/view`, "_blank");
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in New Tab
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {selectedVideo?.isRequired && !enrollment?.bioregulatorVideoWatched && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    handleBioregulatorComplete();
                    setShowVideoDialog(false);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setShowVideoDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Intake Form Dialog */}
      <Dialog open={showIntakeForm} onOpenChange={setShowIntakeForm}>
        <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-amber-500" />
              Coaching Intake Form
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Complete your health profile to begin your transformation journey
            </DialogDescription>
          </DialogHeader>
          {enrollment?.id && (
            <IntakeFormWizard
              enrollmentId={enrollment.id}
              userId={enrollment.userId || undefined}
              userName={enrollment.userName || undefined}
              userEmail={enrollment.userEmail || undefined}
              onComplete={() => {
                setShowIntakeForm(false);
                refetchEnrollment();
                toast.success('Intake form completed! Opening scheduler for your strategy session...');
                // Auto-open Calendly for strategy session after intake completion
                setTimeout(() => {
                  handleSchedule('discovery');
                }, 1200);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 text-xl flex items-center gap-2">
              <Lock className="h-6 w-6 text-amber-500" />
              Sign In to Continue
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Create an account or sign in to save your progress and access all features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-600">
              By signing in, you'll be able to:
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Save your video progress
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Access your personalized journey
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Complete the coaching payment
              </li>
            </ul>
            <div className="flex flex-col gap-2 pt-4">
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  window.location.href = getLoginUrl('/transformation/journey');
                }}
              >
                Sign In / Create Account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setShowLoginPrompt(false)}
              >
                Continue Watching
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
