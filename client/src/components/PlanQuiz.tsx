import { useState } from "react";
import { ArrowRight, ArrowLeft, Sparkles, X, CheckCircle2, Zap, Shield, Crown, Target, Clock, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";

// ── Types ──────────────────────────────────────────────────────────────
type Goal = "weight_loss" | "anti_aging" | "recovery" | "functional_health" | "general";
type Experience = "new" | "some" | "experienced";
type Support = "self_paced" | "coached" | "elite";

interface QuizAnswer {
  goal?: Goal;
  experience?: Experience;
  support?: Support;
}

interface Recommendation {
  planKey: string;
  planName: string;
  price: number;
  tagline: string;
  benefits: string[];
  whyThisPlan: string;
}

// ── Recommendation Engine ──────────────────────────────────────────────
export function getRecommendation(answers: Required<QuizAnswer>): Recommendation {
  const { goal, experience, support } = answers;

  // Elite tier — anyone who wants elite concierge
  if (support === "elite") {
    if (goal === "functional_health" || goal === "general") {
      return {
        planKey: "functional_health_elite",
        planName: "Functional Health Elite",
        price: 8500,
        tagline: "Comprehensive 4-month health transformation",
        benefits: [
          "Full bloodwork & health profile analysis",
          "Custom multi-peptide protocol stack",
          "Weekly 1-on-1 coaching sessions",
          "Priority access to your coach",
        ],
        whyThisPlan: "You're looking for a comprehensive, hands-on approach with elite-level support. This program gives you a dedicated coach and a fully customized protocol built around your complete health profile.",
      };
    }
    return {
      planKey: "elite",
      planName: "Elite Longevity Transformation",
      price: 15000,
      tagline: "The ultimate 6-month peptide optimization journey",
      benefits: [
        "Complete longevity & optimization protocol",
        "Bi-weekly 1-on-1 coaching sessions",
        "Advanced biomarker tracking & adjustments",
        "VIP concierge support & priority scheduling",
      ],
      whyThisPlan: "You want the absolute best — a fully immersive, long-term transformation with concierge-level coaching. This is our most comprehensive program for those committed to peak optimization.",
    };
  }

  // Coached tier
  if (support === "coached") {
    // Experienced users who want coaching → specialty plan matched to goal
    const goalToPlan: Record<Goal, { planKey: string; planName: string; price: number; tagline: string }> = {
      weight_loss: { planKey: "flagship", planName: "Weight Loss & Physique Transformation", price: 3000, tagline: "90-day coached transformation program" },
      anti_aging: { planKey: "longevity", planName: "Anti-Aging & Longevity Protocol", price: 3000, tagline: "90-day age-reversal coaching program" },
      recovery: { planKey: "recovery", planName: "Recovery, Healing & Inflammation", price: 3000, tagline: "90-day recovery coaching program" },
      functional_health: { planKey: "functional_health_elite", planName: "Functional Health Elite", price: 8500, tagline: "Comprehensive 4-month health transformation" },
      general: { planKey: "flagship", planName: "Weight Loss & Physique Transformation", price: 3000, tagline: "90-day coached transformation program" },
    };

    const matched = goalToPlan[goal];

    // For functional health with coaching, bump to elite
    if (goal === "functional_health") {
      return {
        planKey: matched.planKey,
        planName: matched.planName,
        price: matched.price,
        tagline: matched.tagline,
        benefits: [
          "Full bloodwork & health profile analysis",
          "Custom multi-peptide protocol stack",
          "Weekly 1-on-1 coaching sessions",
          "Priority access to your coach",
        ],
        whyThisPlan: "Your functional health goals require a comprehensive approach. This program pairs you with a dedicated coach who builds your protocol around your complete health profile and adjusts it as you progress.",
      };
    }

    return {
      planKey: matched.planKey,
      planName: matched.planName,
      price: matched.price,
      tagline: matched.tagline,
      benefits: [
        "Personalized peptide protocol for your goals",
        "1-on-1 coaching throughout the program",
        "Bi-weekly check-ins & protocol adjustments",
        "Full masterclass library access",
      ],
      whyThisPlan: experience === "new"
        ? "As someone new to peptides, having a dedicated coach will make all the difference. You'll get personalized guidance, protocol adjustments, and the confidence that comes from expert support."
        : "Even with your experience, a coached program ensures your protocol is optimized for your specific goals with expert oversight and real-time adjustments.",
    };
  }

  // Self-paced tier
  if (support === "self_paced") {
    // Experienced users who want self-paced → coaching sessions
    if (experience === "experienced") {
      return {
        planKey: "coaching_60min",
        planName: "Deep-Dive Coaching Session",
        price: 350,
        tagline: "1-hour expert consultation for experienced users",
        benefits: [
          "Comprehensive protocol review & optimization",
          "Advanced dosing & stacking guidance",
          "Sourcing & preparation support",
          "Personalized adjustments for your goals",
        ],
        whyThisPlan: "You already know the basics and just need expert-level guidance on specific questions. A single deep-dive session gives you targeted answers without a long-term commitment.",
      };
    }

    // New or some experience + self-paced → Protocol Essentials
    return {
      planKey: "essentials",
      planName: "Protocol Essentials",
      price: 1000,
      tagline: "Self-guided peptide protocol with check-in support",
      benefits: [
        "Custom peptide protocol designed for your goals",
        "Peptide Coach Self-Guided Check-ins",
        "Full masterclass library access",
        "Protocol delivered within 5 business days",
      ],
      whyThisPlan: experience === "new"
        ? "This is the perfect starting point — you'll receive a professionally designed protocol tailored to your goals, plus self-guided check-ins to track your progress. No coaching commitment required."
        : "With some experience under your belt, a custom protocol gives you the structure you need without the overhead of a full coaching program. You can always add coaching sessions later if needed.",
    };
  }

  // Fallback — should never reach here, but default to essentials
  return {
    planKey: "essentials",
    planName: "Protocol Essentials",
    price: 1000,
    tagline: "Self-guided peptide protocol with check-in support",
    benefits: [
      "Custom peptide protocol designed for your goals",
      "Peptide Coach Self-Guided Check-ins",
      "Full masterclass library access",
      "Protocol delivered within 5 business days",
    ],
    whyThisPlan: "Based on your answers, Protocol Essentials is a great starting point. You'll get a custom protocol designed for your goals with self-guided support.",
  };
}

// ── Quiz Data ──────────────────────────────────────────────────────────
const GOALS: { value: Goal; label: string; icon: typeof Target; description: string }[] = [
  { value: "weight_loss", label: "Weight Loss & Body Composition", icon: Zap, description: "Fat loss, lean muscle, physique transformation" },
  { value: "anti_aging", label: "Anti-Aging & Longevity", icon: Sparkles, description: "Skin health, cellular repair, age reversal" },
  { value: "recovery", label: "Recovery & Healing", icon: Shield, description: "Injury recovery, inflammation, tissue repair" },
  { value: "functional_health", label: "Functional Health & Optimization", icon: Target, description: "Hormones, energy, cognitive performance" },
  { value: "general", label: "General Peptide Optimization", icon: Crown, description: "Overall health, immunity, wellness" },
];

const EXPERIENCE_LEVELS: { value: Experience; label: string; description: string }[] = [
  { value: "new", label: "I'm New to Peptides", description: "I've heard about peptides but haven't used them yet" },
  { value: "some", label: "Some Experience", description: "I've tried a peptide or two but want expert guidance" },
  { value: "experienced", label: "Experienced User", description: "I've used multiple peptides and understand protocols" },
];

const SUPPORT_LEVELS: { value: Support; label: string; price: string; description: string }[] = [
  { value: "self_paced", label: "Self-Paced Protocol", price: "Starting at $350", description: "Get a custom protocol and manage it on your own schedule" },
  { value: "coached", label: "Guided Coaching Program", price: "Starting at $3,000", description: "1-on-1 coaching with regular check-ins and adjustments" },
  { value: "elite", label: "Elite Concierge", price: "Starting at $8,500", description: "Comprehensive transformation with dedicated coach and VIP support" },
];

// ── Component ──────────────────────────────────────────────────────────
interface PlanQuizProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlanQuiz({ isOpen, onClose }: PlanQuizProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [answers, setAnswers] = useState<QuizAnswer>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [, setLocation] = useLocation();

  const handleGoalSelect = (goal: Goal) => {
    setAnswers(prev => ({ ...prev, goal }));
    setStep(2);
  };

  const handleExperienceSelect = (experience: Experience) => {
    setAnswers(prev => ({ ...prev, experience }));
    setStep(3);
  };

  const handleSupportSelect = (support: Support) => {
    const fullAnswers = { ...answers, support } as Required<QuizAnswer>;
    setAnswers(fullAnswers);
    setRecommendation(getRecommendation(fullAnswers));
    setStep(4);
  };

  // Calendly links for standalone coaching sessions (NOT deposits — only the $95 discovery session is a deposit)
  const CALENDLY_SESSION_URLS: Record<string, string> = {
    coaching_20min: "https://calendly.com/jason-vigilanttechs/20-minute-coaching-125",
    coaching_60min: "https://calendly.com/jason-vigilanttechs/60-minute-tranformation-consult-350",
  };

  const handleGetStarted = () => {
    if (recommendation) {
      onClose();
      const calendlyUrl = CALENDLY_SESSION_URLS[recommendation.planKey];
      if (calendlyUrl) {
        // Coaching sessions open Calendly directly (standalone session fee, not a deposit toward plans)
        window.open(calendlyUrl, '_blank');
      } else {
        setLocation(`/transformation/checkout?plan=${recommendation.planKey}`);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setAnswers({});
    setRecommendation(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 text-white" style={{ background: 'linear-gradient(to right, #1B2B4B, #2a3f6b)' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Find Your Perfect Plan</h2>
              <p className="text-sm text-white/70">3 quick questions to match you with the right program</p>
            </div>
          </div>

          {/* Progress bar */}
          {step < 4 && (
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-amber-400" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Goal */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#1B2B4B] mb-1">What's your primary goal?</h3>
              <p className="text-sm text-gray-500 mb-4">Select the area you'd like to focus on most</p>
              {GOALS.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.value}
                    onClick={() => handleGoalSelect(g.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50/50 ${
                      answers.goal === g.value ? "border-amber-400 bg-amber-50/50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-[#1B2B4B]">{g.label}</div>
                        <div className="text-sm text-gray-500">{g.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <div className="space-y-3">
              <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1B2B4B] mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h3 className="text-lg font-semibold text-[#1B2B4B] mb-1">What's your peptide experience?</h3>
              <p className="text-sm text-gray-500 mb-4">This helps us match you with the right level of support</p>
              {EXPERIENCE_LEVELS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => handleExperienceSelect(e.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50/50 ${
                    answers.experience === e.value ? "border-amber-400 bg-amber-50/50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#1B2B4B]">{e.label}</div>
                      <div className="text-sm text-gray-500">{e.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Support Level */}
          {step === 3 && (
            <div className="space-y-3">
              <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1B2B4B] mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h3 className="text-lg font-semibold text-[#1B2B4B] mb-1">What level of support do you want?</h3>
              <p className="text-sm text-gray-500 mb-4">Choose the experience that fits your lifestyle</p>
              {SUPPORT_LEVELS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleSupportSelect(s.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50/50 ${
                    answers.support === s.value ? "border-amber-400 bg-amber-50/50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#1B2B4B]">{s.label}</div>
                      <div className="text-sm text-gray-500">{s.description}</div>
                      <div className="text-xs text-amber-600 font-medium mt-1">{s.price}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Recommendation */}
          {step === 4 && recommendation && (
            <div className="space-y-5">
              <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1B2B4B] mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Your Perfect Match
                </div>
                <h3 className="text-xl font-bold text-[#1B2B4B]">{recommendation.planName}</h3>
                <p className="text-sm text-gray-500 mt-1">{recommendation.tagline}</p>
                <div className="text-3xl font-bold text-amber-600 mt-3">
                  ${recommendation.price.toLocaleString()}
                </div>
              </div>

              {/* Why this plan */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-[#1B2B4B] font-medium mb-1">Why this plan is right for you:</p>
                <p className="text-sm text-gray-600">{recommendation.whyThisPlan}</p>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                {recommendation.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={handleGetStarted}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
              >
                Get Started with {recommendation.planName}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary actions */}
              <div className="flex items-center justify-center gap-4 text-sm">
                <button
                  onClick={handleReset}
                  className="text-gray-500 hover:text-[#1B2B4B] transition-colors underline"
                >
                  Retake Quiz
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    onClose();
                    document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-gray-500 hover:text-[#1B2B4B] transition-colors underline"
                >
                  View All Plans
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
