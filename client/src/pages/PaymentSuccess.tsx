import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Calendar, MessageCircle, Shield, Home, Package, MapPin, ClipboardList, Rocket, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { IntakeFormWizard } from "@/components/IntakeFormWizard";


// Calendly strategy session links by tier (with built-in 4-day buffer)
// Essentials has NO Calendly step — flow goes straight to confirmation after intake
const CALENDLY_LINKS: Record<string, string> = {
  flagship: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  recovery: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  immunity: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  longevity: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  mitochondria: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  advanced: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  functional_health_elite: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  elite: "https://calendly.com/jason-vigilanttechs/2-hour-elite-longevity",
};

// Tiers that skip the Calendly scheduling step entirely
const SKIP_CALENDLY_TIERS = ["essentials"];

// Transformation Journey roadmap steps
const JOURNEY_STEPS = [
  {
    step: 1,
    icon: '💳',
    title: 'Secure Your Spot',
    desc: 'Pay your coaching fee to lock in your program.',
    color: 'from-amber-500 to-orange-500',
    subs: [],
  },
  {
    step: 2,
    icon: '📋',
    title: 'Complete Intake Form',
    desc: 'Share your health history, goals, current medications, and sign agreements.',
    color: 'from-blue-500 to-indigo-500',
    subs: [],
  },
  {
    step: 3,
    icon: '📅',
    title: 'Schedule Your 60-Minute Strategy Session',
    desc: 'Book your strategy session (scheduled 4+ days out so your coach can deep-dive into your program).',
    color: 'from-violet-500 to-purple-500',
    subs: [],
  },
  {
    step: 4,
    icon: '🔬',
    title: 'Program Design',
    desc: 'Your coach builds your personalized protocol based on your intake and goals.',
    color: 'from-cyan-500 to-teal-500',
    subs: ['Coach builds your custom protocol', '60-Minute Strategy Session deep-dive', 'Review & approve your plan', 'Pay protocol cost (compounds & supplements)'],
  },
  {
    step: 5,
    icon: '📦',
    title: 'Fulfillment',
    desc: 'Your personalized protocol kit is assembled and shipped directly to you.',
    color: 'from-rose-500 to-pink-500',
    subs: ['Protocol kit prepared', 'Shipped to your door', 'Delivery confirmed', 'Watch unpacking video', '1-Hour Kickoff Training Meeting'],
  },
  {
    step: 6,
    icon: '🚀',
    title: 'Active Program - Starts at 10 Days Post Enrollment',
    desc: 'Launch your protocol with ongoing coaching support and accountability.',
    color: 'from-emerald-500 to-green-500',
    subs: ['Launch your protocol', 'Weekly cadence check-ins w/ coaching', 'Additional sessions based on your plan'],
  },
  {
    step: 7,
    icon: '🏆',
    title: 'Completion & Review',
    desc: 'Final assessment of your results, progress review, and next steps planning.',
    color: 'from-yellow-500 to-amber-500',
    subs: [],
  },
];

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [, setLocation] = useLocation();
  const sessionId = searchParams.get("session_id") || "";
  const plan = searchParams.get("plan") || "";
  const tier = searchParams.get("tier") || "flagship";
  const type = searchParams.get("type") || "transformation";
  const orderId = searchParams.get("orderId") || "";
  const enrollmentIdParam = searchParams.get("enrollmentId") || "";

  // Multi-step flow state for transformation
  const [currentStep, setCurrentStep] = useState<"roadmap" | "intake" | "calendly" | "confirmation">("roadmap");
  const enrollmentId = enrollmentIdParam ? parseInt(enrollmentIdParam) : null;

  useEffect(() => {
    window.scrollTo(0, 0);
    toast.success("Payment completed successfully!", { duration: 5000, icon: "🎉" });
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // BROWSER LEAVE PREVENTION — active during intake and calendly steps
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (currentStep === "intake" || currentStep === "calendly") {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "You have not completed your required onboarding steps. Are you sure you want to leave?";
        return e.returnValue;
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [currentStep]);

  // Store / Custom Order success
  if (type === "store" || type === "order") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 border-2 border-green-400 mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Confirmed!</h1>
            <p className="text-gray-600 text-lg">Your order has been placed successfully.</p>
          </div>

          <Card className="border-green-200">
            <CardContent className="pt-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 text-center">Order Details</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Package className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">Estimated Delivery: 5–7 Business Days</p>
                    <p className="text-gray-500 text-sm">We ship out on average twice a week.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MessageCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">Need Expedited Shipping?</p>
                    <p className="text-gray-500 text-sm">Expedited shipping may be available upon special request. Email <a href="mailto:omega@omegalongevity.com" className="text-blue-600 hover:underline">omega@omegalongevity.com</a> for urgent shipping needs.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {orderId && (
            <p className="text-center text-sm text-gray-500">Order reference: {orderId}</p>
          )}

          <div className="space-y-3">
            <Button onClick={() => setLocation("/order-history")} className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold">
              View Order History
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="w-full h-10">
              <Home className="w-4 h-4 mr-2" />
              Return to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TRANSFORMATION COACHING POST-PAYMENT FLOW
  // Step 1: Show Roadmap → Step 2: Intake Form → Step 3: Calendly → Step 4: Confirmation
  // ═══════════════════════════════════════════════════════════════════

  const calendlyLink = CALENDLY_LINKS[tier] || CALENDLY_LINKS.flagship;
  const planName = plan ? decodeURIComponent(plan) : "Transformation Program";

  // STEP 1: Roadmap + Payment Confirmed
  if (currentStep === "roadmap") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8" />
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Payment Confirmed</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Success Banner */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Payment Confirmed!</h1>
            <p className="text-slate-300 text-lg">
              Welcome to the <span className="text-orange-400 font-semibold">{planName}</span>.
            </p>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Below is your complete transformation roadmap. Review it carefully — then proceed to complete your required intake form.
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* URGENT CTA — TOP POSITION (before roadmap) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/60 rounded-2xl p-6 text-center space-y-4 animate-pulse-subtle">
            <div className="flex items-center justify-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Action Required — Do Not Leave This Page</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Complete Your Intake Form Now</h3>
            <p className="text-orange-200 text-sm max-w-lg mx-auto">
              Your program clock starts NOW. You must complete the intake form on this page before leaving. 
              Your coach cannot begin designing your protocol without it.
            </p>
            <Button
              onClick={() => setCurrentStep("intake")}
              className="h-14 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-500/30"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Complete Your Intake Form
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Your Transformation Roadmap */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <MapPin className="h-4 w-4" />
                Your Journey at a Glance
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Your Transformation Roadmap
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-sm">
                From enrollment to results — here's exactly what happens now that you've joined
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-amber-400 to-emerald-500" />

              {JOURNEY_STEPS.map((phase) => (
                <div key={phase.step} className="relative flex gap-4 md:gap-6 mb-6 last:mb-0">
                  <div className={`relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br ${phase.color} flex items-center justify-center text-lg md:text-xl shadow-lg flex-shrink-0 ${phase.step === 1 ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-800' : ''}`}>
                    {phase.step === 1 ? <CheckCircle2 className="w-6 h-6 text-white" /> : phase.icon}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Step {phase.step}</span>
                      {phase.step === 1 && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">Complete ✓</span>}
                      {phase.step === 2 && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">Up Next</span>}
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white mb-1">{phase.title}</h3>
                    <p className="text-slate-400 text-sm">{phase.desc}</p>
                    {phase.subs.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {phase.subs.map((sub, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA: Proceed to Intake Form — BOTTOM (after roadmap) */}
          <div className="text-center space-y-4">
            <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-bold uppercase">Required — Complete Before Leaving</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-orange-300 text-sm font-medium">
                Your program starts 10 days from enrollment. Complete your intake form RIGHT NOW to keep things on track. 
                Your coach cannot begin without this information.
              </p>
            </div>
            <Button
              onClick={() => setCurrentStep("intake")}
              className="w-full max-w-md h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-500/30"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Complete Your Intake Form
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-slate-500 text-xs">This is required before your strategy session can be scheduled.</p>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Intake Form (Required — cannot leave)
  if (currentStep === "intake") {
    if (!enrollmentId) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1f3d] to-[#0a1628] flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white/5 border-slate-700">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <p className="text-slate-300">Loading your intake form...</p>
              <p className="text-slate-500 text-sm">If this takes too long, please visit <a href="/intake" className="text-orange-400 hover:underline">/intake</a> directly.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1f3d] to-[#0a1628]">
        {/* Header */}
        <div className="bg-[#0a1628]/80 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8" />
              <span className="text-slate-400 text-sm hidden sm:inline">Step 2 of {SKIP_CALENDLY_TIERS.includes(tier) ? '2' : '3'}: Intake Form</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Required — Do Not Leave</span>
            </div>
          </div>
        </div>

        {/* Urgency Banner */}
        <div className="bg-red-600/20 border-b border-red-500/40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm font-medium text-center">
              You must complete this intake form before leaving this page. Your program cannot begin without it.
            </p>
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              <span className="text-xs text-green-400 hidden sm:inline">Payment</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">2</div>
              <span className="text-xs text-orange-400 hidden sm:inline">Intake Form</span>
            </div>
            {!SKIP_CALENDLY_TIERS.includes(tier) && (
              <>
                <div className="w-8 h-0.5 bg-slate-600" />
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-slate-400 text-xs font-bold">3</div>
                  <span className="text-xs text-slate-500 hidden sm:inline">Schedule Session</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Intake Form */}
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <IntakeFormWizard
                enrollmentId={enrollmentId}
                onComplete={() => {
                  if (SKIP_CALENDLY_TIERS.includes(tier)) {
                    toast.success("Intake form submitted! Your enrollment is complete.");
                    setCurrentStep("confirmation");
                  } else {
                    toast.success("Intake form submitted! Now let's schedule your strategy session.");
                    setCurrentStep("calendly");
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Calendly Scheduling (Required — cannot leave without booking)
  if (currentStep === "calendly") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-lg w-full mx-auto space-y-6 pt-8">
          {/* Urgency Banner */}
          <div className="bg-red-600/20 border border-red-500/40 rounded-xl p-4">
            <div className="flex items-center justify-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-bold uppercase">Required — Do Not Leave Without Scheduling</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-red-300 text-xs text-center">
              You must schedule your strategy session now. Your coach needs this booked to begin protocol design.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              <span className="text-xs text-green-400 hidden sm:inline">Payment</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              <span className="text-xs text-green-400 hidden sm:inline">Intake Form</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">3</div>
              <span className="text-xs text-orange-400 hidden sm:inline">Schedule Session</span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/20 border-2 border-violet-400 mx-auto">
              <Calendar className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Schedule Your Strategy Session</h1>
            <p className="text-slate-300 text-lg">
              Book your strategy session with your coach. Sessions are scheduled 4+ days out to give your coach time to review your intake form.
            </p>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6 space-y-4">
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
                <p className="text-violet-300 text-sm">
                  <strong>Why 4+ days?</strong> Your coach needs time to thoroughly review your intake form, research your health goals, and prepare a personalized strategy for your session.
                </p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-orange-300 text-sm font-medium">
                  ⚠️ This is the final required step. Please schedule your session now — your program cannot move forward until this is booked.
                </p>
              </div>

              <Button
                onClick={() => {
                  window.open(calendlyLink, '_blank');
                }}
                className="w-full h-14 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-lg shadow-lg shadow-violet-500/30"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Open Scheduling Calendar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-slate-400 text-xs text-center">
                Opens in a new tab. After you've scheduled, click the button below to confirm.
              </p>

              <Button
                onClick={() => {
                  setCurrentStep("confirmation");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                variant="outline"
                className="w-full h-12 border-green-500/50 text-green-400 hover:bg-green-500/10 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                I've Scheduled My Session — Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // STEP 4: Confirmation — What Happens Next
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-lg w-full mx-auto space-y-6 pt-8">
        {/* Progress indicator - all complete */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
          <div className="w-8 h-0.5 bg-green-500" />
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
          <div className="w-8 h-0.5 bg-green-500" />
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
        </div>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 mx-auto">
            <Rocket className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">You're All Set!</h1>
          <p className="text-slate-300 text-lg">
            Your enrollment in the <span className="text-orange-400 font-semibold">{planName}</span> is complete.
          </p>
        </div>

        {/* What Happens Next timeline */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">✨</span> What Happens Next
            </h2>

            <div className="relative space-y-5">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-500 via-blue-500 to-green-500" />

              {/* Protocol Development */}
              <div className="relative flex gap-4 pl-2">
                <div className="relative z-10 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">Protocol Development</h3>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">In Progress</span>
                  </div>
                  <p className="text-amber-400 text-xs font-medium">Next 3–5 days</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Your coach is now reviewing your intake form, analyzing your health profile, and building a custom peptide and supplement protocol designed specifically for you.
                  </p>
                </div>
              </div>

              {/* Strategy Session & Program Review */}
              <div className="relative flex gap-4 pl-2">
                <div className="relative z-10 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Strategy Session & Program Review</h3>
                  <p className="text-green-400 text-xs font-medium">Your scheduled session</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Meet with your coach to review your personalized protocol, discuss your goals in depth, ask questions, and finalize your program plan together.
                  </p>
                </div>
              </div>

              {/* Protocol Fulfillment */}
              <div className="relative flex gap-4 pl-2">
                <div className="relative z-10 w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Protocol Fulfillment</h3>
                  <p className="text-amber-400 text-xs font-medium italic">After strategy session</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Your Protocol-in-a-Box ships with the starter kit and our inventory based supplements. If you chose the "VIP Supply Concierge" service at checkout, we will also initiate all those partner based orders as well. We then aim to schedule the "Kick-off training session" around the 10 day mark.
                  </p>
                </div>
              </div>

              {/* Active Coaching Phase */}
              <div className="relative flex gap-4 pl-2">
                <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Active Coaching Phase</h3>
                  <p className="text-green-400 text-xs font-medium">90 days of guided support</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Weekly check-ins, progress tracking, protocol adjustments, and direct access to your coach. Includes Week 3 review and Month 2 optimization sessions.
                  </p>
                </div>
              </div>

              {/* Program Completion & Review */}
              <div className="relative flex gap-4 pl-2">
                <div className="relative z-10 w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Program Completion & Review</h3>
                  <p className="text-yellow-400 text-xs font-medium">Month 3 final review</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Comprehensive final review of your transformation, biomarker improvements, and a roadmap for continued optimization beyond the program.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mt-4">
              <p className="text-orange-300 text-sm font-medium">
                ⏱️ Remember: Your program starts 10 days post enrollment. Time is of the essence — your coach will be in touch soon!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA: Link back to Transformation Journey section */}
        <div className="space-y-3">
          <Button
            onClick={() => setLocation("/transformation#transformation-roadmap")}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
          >
            <MapPin className="w-4 h-4 mr-2" />
            View Your Full Transformation Journey
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="w-full h-10 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Homepage
          </Button>
        </div>

        {sessionId && (
          <p className="text-center text-xs text-slate-500">
            Payment reference: {sessionId.slice(0, 24)}...
          </p>
        )}
      </div>
    </div>
  );
}
