import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "../lib/trpc";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { IntakeFormWizard } from "@/components/IntakeFormWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Calendar,
  ArrowLeft,
  Shield,
  Clock,
  ChevronRight,
  Loader2,
  Package,
  Sparkles,
  Target,
  Trophy,
  Tag,
  Check,
  X,
} from "lucide-react";

// Plan configuration
const PLANS: Record<string, { name: string; price: number; description: string; hasCoaching: boolean; isSession?: boolean; sessionDuration?: string }> = {
  coaching_20min: {
    name: "Targeted Focus Call",
    price: 125,
    description: "20-minute 1-on-1 coaching session for targeted guidance",
    hasCoaching: false,
    isSession: true,
    sessionDuration: "20 minutes",
  },
  coaching_60min: {
    name: "Deep-Dive Coaching Session",
    price: 350,
    description: "1-hour comprehensive 1-on-1 coaching session",
    hasCoaching: false,
    isSession: true,
    sessionDuration: "60 minutes",
  },
  essentials: {
    name: "Protocol Essentials",
    price: 1000,
    description: "Self-guided peptide protocol with check-in support",
    hasCoaching: false,
  },
  flagship: {
    name: "Weight Loss & Physique Transformation",
    price: 3000,
    description: "90-day coached transformation program",
    hasCoaching: true,
  },
  advanced: {
    name: "Advanced Weight Loss & Physique",
    price: 4500,
    description: "Advanced 90-day coached transformation with enhanced protocols",
    hasCoaching: true,
  },
  recovery: {
    name: "Recovery, Healing & Inflammation",
    price: 3000,
    description: "90-day targeted recovery and inflammation protocol",
    hasCoaching: true,
  },
  immunity: {
    name: "Immunity & Healing",
    price: 3000,
    description: "90-day immune system optimization protocol",
    hasCoaching: true,
  },
  longevity: {
    name: "Longevity & Bioregulators",
    price: 3000,
    description: "90-day longevity and bioregulator protocol",
    hasCoaching: true,
  },
  mitochondria: {
    name: "Mitochondria Restoration",
    price: 3000,
    description: "90-day mitochondrial optimization protocol",
    hasCoaching: true,
  },
  functional_health_elite: {
    name: "Functional Health Elite",
    price: 8500,
    description: "4-month deep health restoration & optimization",
    hasCoaching: true,
  },
  elite: {
    name: "Elite Longevity",
    price: 15000,
    description: "6-month comprehensive longevity program with full-spectrum support",
    hasCoaching: true,
  },
};

// VIP Supply Concierge pricing by tier
const VIP_CONCIERGE_FEES: Record<string, number> = {
  essentials: 1000,
  flagship: 1000,
  recovery: 1000,
  immunity: 1000,
  longevity: 1000,
  mitochondria: 1000,
  advanced: 1000,
  functional_health_elite: 1500,
  elite: 2500,
};

// Calendly links per plan type
const CALENDLY_URLS: Record<string, string> = {
  // Standard coached plans ($3k-$8.5k) - 60-min strategy session
  default: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  functional_health_elite: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  // Elite plan ($15k) - 2-hour session
  elite: "https://calendly.com/jason-vigilanttechs/2-hour-elite-longevity",
  // Coaching sessions - standalone session fees (NOT deposits toward plans; payment collected via Calendly)
  coaching_20min: "https://calendly.com/jason-vigilanttechs/20-minute-coaching-125",
  coaching_60min: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
};

type CheckoutStep = "info" | "payment" | "intake" | "schedule" | "complete";

export default function TransformationCheckout() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const planKey = params.get("plan") || "";
  const plan = PLANS[planKey];

  // User state
  const { data: user } = trpc.auth.me.useQuery();
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");

  // Flow state
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("info");
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "manual">("stripe");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // VIP Concierge state
  const [vipConcierge, setVipConcierge] = useState(false);
  const isCoachingSession = plan?.isSession === true;
  const conciergeFee = VIP_CONCIERGE_FEES[planKey] || 0;
  const showConciergeOption = conciergeFee > 0 && !isCoachingSession;

  // Alumni code state
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

  // Alumni code validation
  const validatePromo = trpc.promoCode.validate.useMutation();
  const recordPromoUsage = trpc.promoCode.recordUsage.useMutation();

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      const result = await validatePromo.mutateAsync({
        code: promoInput.trim(),
        tier: planKey as any,
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

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // Effective price after alumni code discount + concierge add-on
  const basePrice = appliedPromo ? appliedPromo.finalAmount : plan?.price || 0;
  const effectivePrice = basePrice + (vipConcierge ? conciergeFee : 0);

  // Enrollment mutation
  const createEnrollment = trpc.transformation.createDirectEnrollment.useMutation();
  const sendConfirmation = trpc.transformation.sendCheckoutConfirmation.useMutation();
  const trackCheckoutStart = trpc.transformation.trackCheckoutStart.useMutation();
  const markCheckoutCompleted = trpc.transformation.markCheckoutCompleted.useMutation();

  // Derived
  const email = user?.email || guestEmail;
  const name = user?.name || guestName;
  const isEssentials = planKey === "essentials";

  // Steps definition
  const steps = useMemo((): { id: "payment" | "intake" | "schedule"; label: string; icon: typeof CreditCard }[] => {
    if (isCoachingSession) {
      return [
        { id: "payment", label: "Pay Session Fee", icon: CreditCard },
        { id: "intake", label: "Complete Intake Form", icon: FileText },
      ];
    }
    const base: { id: "payment" | "intake" | "schedule"; label: string; icon: typeof CreditCard }[] = [
      { id: "payment", label: isEssentials ? "Pay Protocol Fee" : "Pay Coaching Fee", icon: CreditCard },
      { id: "intake", label: "Complete Intake Form", icon: FileText },
    ];
    if (!isEssentials) {
      base.push({ id: "schedule", label: "Schedule Strategy Session", icon: Calendar });
    }
    return base;
  }, [isEssentials, isCoachingSession]);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // If no valid plan, redirect
  useEffect(() => {
    if (!plan) {
      toast.error("Invalid plan selected");
      setLocation("/transformation");
    }
  }, [plan, setLocation]);

  // If user is logged in, skip info step
  useEffect(() => {
    if (user?.email && currentStep === "info") {
      setCurrentStep("payment");
    }
  }, [user, currentStep]);

  const handleStartCheckout = async () => {
    if (!email || !name) {
      toast.error("Please enter your name and email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    // Safety timeout - if the request hangs for 15s, reset the button
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      toast.error("Request timed out. Please try again.");
    }, 15000);

    try {
      const result = await createEnrollment.mutateAsync({
        email,
        name,
        tier: planKey as any,
        programType: isCoachingSession ? "coaching_session" : isEssentials ? "protocol_only" : "90_day_transformation",
        vipConcierge,
        vipConciergeFee: vipConcierge ? conciergeFee : undefined,
      });

      clearTimeout(timeoutId);
      if (result.success) {
        setEnrollmentId(result.enrollmentId);
        if (result.existingEnrollment) {
          toast.info(result.message);
        }
        setCurrentStep("payment");
        // Track checkout start for abandoned checkout recovery
        trackCheckoutStart.mutate({
          planKey,
          planName: plan.name,
          planPrice: plan.price,
          email,
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[Checkout] createEnrollment error:', err);
      toast.error(err.message || "Failed to create enrollment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (method: string, orderId?: string) => {
    console.log(`[Checkout] Payment success via ${method}`, orderId);
    setPaymentComplete(true);
    setPaymentMethod(method);
    // Record promo code usage if one was applied
    if (appliedPromo && enrollmentId) {
      try {
        await recordPromoUsage.mutateAsync({
          promoCodeId: appliedPromo.promoCodeId,
          enrollmentId,
          tier: planKey,
          originalAmount: appliedPromo.originalAmount,
          discountAmount: appliedPromo.discountAmount,
          finalAmount: appliedPromo.finalAmount,
        });
        console.log(`[Checkout] Alumni code usage recorded`);
      } catch (err) {
        console.error(`[Checkout] Failed to record alumni code usage:`, err);
      }
    }
    // Mark checkout as completed for abandoned checkout recovery
    markCheckoutCompleted.mutate({ planKey, email: email || undefined });
    if (isCoachingSession) {
      toast.success("Payment received! Complete the intake form to help your coach prepare (recommended but optional).");
    } else {
      toast.success("Payment received! Let's complete your intake form.");
    }
    setCurrentStep("intake");
  };

  // Send checkout confirmation email
  const triggerConfirmationEmail = (discoveryScheduled: boolean) => {
    if (!enrollmentId || !plan) return;
    sendConfirmation.mutate({
      enrollmentId,
      planKey,
      planName: plan.name,
      planPrice: plan.price,
      paymentMethod,
      intakeCompleted: true,
      discoveryScheduled,
    }, {
      onSuccess: (res) => {
        if (res.success) {
          console.log('[Checkout] Confirmation email sent');
        }
      },
      onError: (err) => {
        console.error('[Checkout] Failed to send confirmation email:', err);
      },
    });
  };

  const handleIntakeComplete = () => {
    setIntakeComplete(true);
    if (isCoachingSession || isEssentials) {
      setCurrentStep("complete");
      triggerConfirmationEmail(false);
      if (isCoachingSession) {
        toast.success("You're all set! We'll send you scheduling details shortly.");
      } else {
        toast.success("You're all set! Your protocol will be delivered within 5 business days.");
      }
    } else {
      toast.success("Intake form complete! Now let's schedule your strategy session.");
      setCurrentStep("schedule");
    }
  };

  const handleScheduleComplete = () => {
    setCurrentStep("complete");
    triggerConfirmationEmail(true);
    toast.success("Strategy session scheduled! You're all set. Check your email for a confirmation summary.");
  };

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-700/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/transformation")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </button>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Shield className="w-4 h-4 text-green-500" />
            Secure Checkout
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Plan Summary */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{plan.name}</h1>
          <p className="text-slate-400 mb-3">{plan.description}</p>
          <div className="inline-flex items-baseline gap-1">
            <span className="text-4xl font-bold text-amber-400">${plan.price.toLocaleString()}</span>
            <span className="text-slate-500 text-sm">USD</span>
          </div>
        </div>

        {/* Progress Steps */}
        {currentStep !== "info" && currentStep !== "complete" && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 md:gap-4">
              {steps.map((step, idx) => {
                const isComplete =
                  (step.id === "payment" && paymentComplete) ||
                  (step.id === "intake" && intakeComplete) ||
                  (step.id === "schedule" && (currentStep as string) === "complete");
                const isCurrent = step.id === currentStep;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex items-center gap-2 md:gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isComplete
                            ? "bg-green-500 text-white"
                            : isCurrent
                            ? "bg-amber-500 text-white ring-2 ring-amber-400/50"
                            : "bg-slate-700 text-slate-500"
                        }`}
                      >
                        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span
                        className={`text-xs whitespace-nowrap ${
                          isComplete ? "text-green-400" : isCurrent ? "text-amber-400" : "text-slate-600"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <ChevronRight
                        className={`w-4 h-4 mb-5 ${isComplete ? "text-green-500" : "text-slate-700"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Guest Info (only for non-logged-in users) */}
        {currentStep === "info" && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                Get Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-400 text-sm">
                Enter your information to begin enrollment in the{" "}
                <span className="text-amber-400 font-medium">{plan.name}</span> program.
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300">Full Name</Label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your full name"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Email Address</Label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <Button
                onClick={handleStartCheckout}
                disabled={isSubmitting || !guestName || !guestEmail}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Payment */}
        {currentStep === "payment" && (
          <div className="space-y-4">
            {/* Create enrollment if not yet created (logged-in users skip info step) */}
            {!enrollmentId ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleStartCheckout}
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6 text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Preparing checkout...
                      </>
                    ) : (
                      "Begin Checkout"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Alumni Code Section */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  {appliedPromo ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <div>
                          <span className="font-mono text-green-400 font-medium text-sm">{appliedPromo.code}</span>
                          <span className="text-xs text-slate-400 ml-2">
                            ({appliedPromo.discountType === "percent" ? `${appliedPromo.discountValue}% off` : `$${appliedPromo.discountValue.toLocaleString()} off`})
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleRemovePromo}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                        title="Remove alumni code"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Have an alumni code?</span>
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
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 font-mono text-sm"
                        />
                        <Button
                          onClick={handleApplyPromo}
                          disabled={isValidatingPromo || !promoInput.trim()}
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 px-4"
                        >
                          {isValidatingPromo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-red-400 mt-1">{promoError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Price Display */}
                {appliedPromo && (
                  <div className="text-center bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                    <span className="text-slate-400 line-through text-lg">${plan.price.toLocaleString()}</span>
                    <span className="text-green-400 text-2xl font-bold ml-3">${appliedPromo.finalAmount.toLocaleString()}</span>
                    <div className="text-green-400 text-xs mt-1">You save ${appliedPromo.discountAmount.toLocaleString()} with alumni code {appliedPromo.code}</div>
                  </div>
                )}

                {/* VIP Supply Concierge Add-on */}
                {showConciergeOption && (
                  <div className="bg-gradient-to-br from-amber-900/20 to-amber-800/10 border border-amber-600/30 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                          <h4 className="text-lg font-semibold text-amber-200">VIP Supply Concierge</h4>
                          <span className="text-xs bg-amber-700/40 text-amber-300 px-2 py-0.5 rounded-full">+${conciergeFee.toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          Your protocol may require peptides from 2–5 specialized vendors — each with different lead times, availability, and quality standards. Our concierge team handles the entire procurement process: coordinating physician referrals, placing and tracking orders across multiple suppliers, navigating shortages, and confirming that every possible product meets our non-negotiable quality standard — USA-manufactured, cGMP-grade, HPLC-tested for purity, endotoxin-screened, and sterility-verified.
                        </p>
                        <p className="text-sm text-amber-300/80 mt-2 font-medium">
                          Plus, our direct vendor partnerships mean you receive preferred pricing on every order.
                        </p>
                        <p className="text-xs text-slate-400 mt-3 italic">
                          Note: Any additional supplements recommended as part of your protocol may be ordered on your behalf using your payment information on file, or you may choose to place those orders independently.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t border-amber-700/20">
                      <button
                        type="button"
                        onClick={() => setVipConcierge(!vipConcierge)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          vipConcierge ? 'bg-amber-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          vipConcierge ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm text-slate-300">
                        {vipConcierge ? (
                          <span className="text-amber-300 font-medium">VIP Concierge added (+${conciergeFee.toLocaleString()})</span>
                        ) : (
                          'Add VIP Supply Concierge'
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total with concierge */}
                {vipConcierge && showConciergeOption && (
                  <div className="text-center bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-sm">Program: ${basePrice.toLocaleString()} + Concierge: ${conciergeFee.toLocaleString()}</div>
                    <div className="text-amber-300 text-2xl font-bold mt-1">Total: ${effectivePrice.toLocaleString()}</div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                  <PaymentMethodSelector
                    clientProtocolId={enrollmentId.toString()}
                    amount={effectivePrice.toString()}
                    currency="USD"
                    description={`${plan.name} Program${vipConcierge ? ' + VIP Concierge' : ''}${appliedPromo ? ` (Alumni: ${appliedPromo.code})` : ''}`}
                    clientEmail={email}
                    clientName={name}
                    isPublic={true}
                    isTransformation={true}
                    enrollmentId={enrollmentId || undefined}
                    tier={planKey}
                    promoCodeId={appliedPromo?.promoCodeId}
                    promoCode={appliedPromo?.code}
                    originalAmount={appliedPromo?.originalAmount}
                    discountAmount={appliedPromo?.discountAmount}
                    vipConcierge={vipConcierge}
                    vipConciergeFee={vipConcierge ? conciergeFee : 0}
                    planName={plan.name}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={(error) => toast.error(error)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Intake Form */}
        {currentStep === "intake" && enrollmentId && (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm">
                {isCoachingSession
                  ? "Payment confirmed! Completing the intake form helps your coach prepare for your session (recommended but optional)."
                  : "Payment confirmed! Now please complete your intake form so we can personalize your program."}
              </p>
            </div>
            {isCoachingSession && (
              <button
                onClick={() => {
                  setCurrentStep("complete");
                  // Send confirmation with intake NOT completed
                  if (enrollmentId && plan) {
                    sendConfirmation.mutate({
                      enrollmentId,
                      planKey,
                      planName: plan.name,
                      planPrice: plan.price,
                      paymentMethod,
                      intakeCompleted: false,
                      discoveryScheduled: false,
                    });
                  }
                  toast.success("You're all set! We'll send you scheduling details shortly.");
                }}
                className="w-full text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors py-1"
              >
                Skip intake form — I'll provide details during the call
              </button>
            )}
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <IntakeFormWizard
                  enrollmentId={enrollmentId}
                  userId={user?.id}
                  userName={name}
                  userEmail={email}
                  onComplete={handleIntakeComplete}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Schedule Strategy Session (not for essentials) */}
        {currentStep === "schedule" && !isEssentials && (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm">
                Intake form complete! Now schedule your strategy session. Please book at least 4 days out so your coach has time to review your intake and begin building your program.
              </p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Schedule Your Strategy Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-4">
                  {planKey === 'elite'
                    ? 'This 2-hour session is where your coach conducts a comprehensive review of your intake, discusses your goals in depth, and presents your fully personalized protocol plan.'
                    : 'This 60-minute session is where your coach reviews your intake, discusses your goals, and presents your personalized protocol plan.'
                  }
                </p>

                {!showCalendly ? (
                  <Button
                    onClick={() => setShowCalendly(true)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6 text-lg"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Open Scheduling Calendar
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden border border-slate-600" style={{ height: "650px" }}>
                      <iframe
                        src={`${CALENDLY_URLS[planKey] || CALENDLY_URLS.default}?hide_gdpr_banner=1&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        title="Schedule Strategy Session"
                      />
                    </div>
                    <Button
                      onClick={handleScheduleComplete}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      I've Scheduled My Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Complete - What's Next Roadmap */}
        {currentStep === "complete" && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {isCoachingSession ? "Session Booked!" : isEssentials ? "You're All Set!" : "Welcome to Your Transformation"}
                </h2>
                <p className="text-slate-400">
                  {isCoachingSession
                    ? <>Thank you for booking a <span className="text-amber-400 font-medium">{plan.name}</span>.  We'll reach out within 24 hours to schedule your session.</>
                    : <>Thank you for enrolling in <span className="text-amber-400 font-medium">{plan.name}</span>.</>}
                </p>
              </div>

              {/* Completed Steps Summary */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 inline-flex flex-col gap-2 text-left">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Payment confirmed
                </div>
                {intakeComplete && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Intake form completed
                  </div>
                )}
                {!isEssentials && !isCoachingSession && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Strategy session scheduled
                  </div>
                )}
              </div>
            </div>

            {/* What's Next Section */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                What Happens Next
              </h3>

              {isCoachingSession ? (
                /* Coaching Session: Simple 2-step roadmap */
                <div className="relative">
                  <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-amber-500 to-slate-700" />
                  {[
                    {
                      icon: Calendar,
                      title: "Session Scheduling",
                      subtitle: "Within 24 hours",
                      description: `We'll contact you at ${email} to schedule your ${plan.sessionDuration} coaching session at a time that works for you.`,
                      active: true,
                    },
                    {
                      icon: Target,
                      title: `Your ${plan.sessionDuration} Session`,
                      subtitle: "Personalized 1-on-1 coaching",
                      description: "Meet with your coach for focused, personalized guidance on your peptide protocol, dosing, sourcing, or any specific concerns.",
                      active: false,
                    },
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        step.active ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400 border border-slate-600"
                      }`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">{step.title}</h4>
                          {step.active && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">In Progress</span>
                          )}
                        </div>
                        <p className="text-amber-400/70 text-xs font-medium mb-1">{step.subtitle}</p>
                        <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isEssentials ? (
                /* Essentials: Simple 3-step roadmap */
                <div className="relative">
                  <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-amber-500 via-amber-500/50 to-slate-700" />
                  {[
                    {
                      icon: FileText,
                      title: "Protocol Development",
                      subtitle: "Days 1–5",
                      description: "Your coach reviews your intake form and builds a personalized peptide protocol tailored to your goals, health history, and lifestyle.",
                      active: true,
                    },
                    {
                      icon: Package,
                      title: "Protocol Delivery",
                      subtitle: "Within 5 business days",
                      description: `We'll email your complete protocol to ${email} with detailed instructions, dosing schedules, and sourcing guidance.`,
                      active: false,
                    },
                    {
                      icon: Target,
                      title: "Begin Your Protocol",
                      subtitle: "Self-guided with check-in support",
                      description: "Follow your protocol with access to the masterclass library, reconstitution guides, and Peptide Coach Self-Guided Check-ins.",
                      active: false,
                    },
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        step.active ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400 border border-slate-600"
                      }`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">{step.title}</h4>
                          {step.active && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">In Progress</span>
                          )}
                        </div>
                        <p className="text-amber-400/70 text-xs font-medium mb-1">{step.subtitle}</p>
                        <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Coached Plans: Full program roadmap */
                <div className="relative">
                  <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-green-500 via-amber-500/50 to-purple-500/30" />
                  {[
                    {
                      icon: FileText,
                      title: "Protocol Development",
                      subtitle: "Next 3–5 days",
                      description: "Your coach is now reviewing your intake form, analyzing your health profile, and building a custom peptide and supplement protocol designed specifically for you.",
                      active: true,
                      color: "amber",
                    },
                    {
                      icon: Calendar,
                      title: "Strategy Session & Program Review",
                      subtitle: "Your scheduled session",
                      description: "Meet with your coach to review your personalized protocol, discuss your goals in depth, ask questions, and finalize your program plan together.",
                      active: false,
                      color: "blue",
                    },
                    {
                      icon: Package,
                      title: "Protocol Fulfillment",
                      subtitle: "After strategy session",
                      description: "Your Protocol-in-a-Box ships with everything you need — compounds, supplements, and supplies. Includes a 1-hour reconstitution training session.",
                      active: false,
                      color: "emerald",
                    },
                    {
                      icon: Target,
                      title: "Active Coaching Phase",
                      subtitle: "90 days of guided support",
                      description: "Weekly check-ins, progress tracking, protocol adjustments, and direct access to your coach. Includes Week 3 review and Month 2 optimization sessions.",
                      active: false,
                      color: "purple",
                    },
                    {
                      icon: Trophy,
                      title: "Program Completion & Review",
                      subtitle: "Month 3 final review",
                      description: "Comprehensive final review of your transformation, biomarker improvements, and a roadmap for continued optimization beyond the program.",
                      active: false,
                      color: "amber",
                    },
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        step.active ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400 border border-slate-600"
                      }`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">{step.title}</h4>
                          {step.active && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">In Progress</span>
                          )}
                        </div>
                        <p className="text-amber-400/70 text-xs font-medium mb-1">{step.subtitle}</p>
                        <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coaching Call Upsell for Essentials */}
            {isEssentials && (
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 text-center">
                <p className="text-slate-300 text-sm mb-2">
                  Need personalized guidance? Book a 1-on-1 coaching call anytime.
                </p>
                <p className="text-slate-500 text-xs">
                  <span className="text-amber-400 font-medium">$125 / 20 min</span> targeted focus call &nbsp;|&nbsp; <span className="text-amber-400 font-medium">$350 / 1 hour</span> deep-dive session
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setLocation("/transformation")}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Programs
              </Button>

            </div>
          </div>
        )}

        {/* Trust Footer */}
        <div className="mt-8 text-center text-xs text-slate-600 space-y-1">
          <p>Payments processed securely via Stripe</p>
          <p>Questions? Email omega@omegalongevity.com</p>
        </div>
      </div>
    </div>
  );
}
