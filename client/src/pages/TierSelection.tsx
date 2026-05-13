import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Crown, Diamond, Users, Zap, Calendar, Shield, ArrowLeft, Flame, Brain, Target, Play, Star, Award, Clock, Heart, Dna, Activity, Leaf, Battery } from "lucide-react";
import { useLocation } from "wouter";

type CoachingPlan = {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  priceNum: number;
  duration: string;
  followUp: string;
  icon: any;
  color: string;
  borderColor: string;
  bgGradient: string;
  btnGradient: string;
  badge?: string;
  badgeColor?: string;
  buildOn?: string;
  features: string[];
  highlights?: string[];
  useCases?: string[];
  calendlyLink: string;
};

const COACHING_PLANS: CoachingPlan[] = [
  {
    id: "weight-loss",
    name: "Weight Loss & Physique",
    subtitle: "Full Coaching Support for Maximum Results",
    price: "$2,500",
    priceNum: 2500,
    duration: "90 days",
    followUp: "$1,500 / 90 days",
    icon: Users,
    color: "amber",
    borderColor: "border-amber-300",
    bgGradient: "from-amber-400 to-orange-500",
    btnGradient: "from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400",
    badge: "MOST POPULAR",
    badgeColor: "from-amber-500 to-orange-500",
    features: [
      "60-Minute Strategy Session",
      "3-Week Progress Review Session",
      "Weekly Cadence Check-ins with Feedback",
      "Month 3 Final Review 1-Hour Session",
      "Complete Masterclass Video Library",
      "Custom Protocol Design",
      "Protocol in a Box - Shipped to You",
      "1-Hour Reconstitution Training",
      "Full Access to Peptide Coach Client Corner",
      "3 Months Elite Community Access",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "advanced-weight-loss",
    name: "Advanced Weight Loss & Physique",
    subtitle: "Hormone + Peptide Strategies for Extreme Results",
    price: "$4,500",
    priceNum: 4500,
    duration: "90 days",
    followUp: "$3,500 / 90 days",
    icon: Flame,
    color: "rose",
    borderColor: "border-rose-300",
    bgGradient: "from-rose-500 to-red-600",
    btnGradient: "from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500",
    badge: "SERIOUSLY COMMITTED",
    badgeColor: "from-rose-500 to-red-600",
    buildOn: "Everything in Weight Loss & Physique, plus:",
    features: [
      "Advanced Hormone Optimization Strategy",
      "Advanced Peptide Stacking Protocols",
      "Advanced Androgen Deep Dive",
      "Advanced Libido and Drive Modalities",
      "Deep Metabolic Analysis & Intervention",
      "Advanced Lab Marker Interpretation",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "recovery-healing",
    name: "Recovery, Healing & Inflammation",
    subtitle: "Bounce Back Like a Teenager",
    price: "$2,500",
    priceNum: 2500,
    duration: "90 days",
    followUp: "$1,500 / 90 days",
    icon: Activity,
    color: "sky",
    borderColor: "border-sky-300",
    bgGradient: "from-sky-500 to-blue-600",
    btnGradient: "from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500",
    badge: "SPECIALTY",
    badgeColor: "from-sky-500 to-blue-600",
    features: [
      "BPC-157 & TB-500 Wolverine Stack Protocol",
      "GHK-Cu Tissue Regeneration & Collagen Repair",
      "KPV Anti-Inflammatory Peptide Therapy",
      "Thymosin Beta-4 Systemic Healing Support",
      "Pre/Post-Surgery Recovery Planning",
      "Inflammation Biomarker Tracking",
      "Custom Protocol Design & Coaching",
      "Protocol in a Box - Shipped to You",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "immunity-healing",
    name: "Immunity & Healing",
    subtitle: "Rebuild Your Immune Fortress",
    price: "$2,500",
    priceNum: 2500,
    duration: "90 days",
    followUp: "$1,500 / 90 days",
    icon: Shield,
    color: "teal",
    borderColor: "border-teal-300",
    bgGradient: "from-teal-500 to-cyan-600",
    btnGradient: "from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500",
    badge: "SPECIALTY",
    badgeColor: "from-teal-500 to-cyan-600",
    features: [
      "Thymosin Alpha-1 Immune Modulation Protocol",
      "Thymulin Thymus Gland Restoration",
      "LL-37 Antimicrobial Defense Peptide",
      "BPC-157 Gut-Immune Axis Optimization",
      "Comprehensive Immune Panel Review",
      "Seasonal Illness Prevention Strategy",
      "Custom Protocol Design & Coaching",
      "Protocol in a Box - Shipped to You",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "longevity-bioregulators",
    name: "Longevity & Bioregulators",
    subtitle: "Reverse Age at the Cellular Level",
    price: "$2,500",
    priceNum: 2500,
    duration: "90 days",
    followUp: "$1,500 / 90 days",
    icon: Leaf,
    color: "violet",
    borderColor: "border-violet-300",
    bgGradient: "from-violet-500 to-indigo-600",
    btnGradient: "from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500",
    badge: "SPECIALTY",
    badgeColor: "from-violet-500 to-indigo-600",
    features: [
      "Epithalon Telomere Extension Protocol",
      "Pineal Gland Bioregulator (Endoluten)",
      "Thymus Gland Bioregulator (Vladonix)",
      "Khavinson Bioregulator Organ Restoration Track",
      "Biological Age Testing & Tracking",
      "Organ-Specific Restoration Roadmap",
      "Custom Protocol Design & Coaching",
      "Protocol in a Box - Shipped to You",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "mitochondria",
    name: "Mitochondria Restoration",
    subtitle: "Recharge Your Cellular Power Plants",
    price: "$2,500",
    priceNum: 2500,
    duration: "90 days",
    followUp: "$1,500 / 90 days",
    icon: Battery,
    color: "orange",
    borderColor: "border-orange-300",
    bgGradient: "from-orange-500 to-yellow-600",
    btnGradient: "from-orange-500 to-yellow-600 hover:from-orange-400 hover:to-yellow-500",
    badge: "SPECIALTY",
    badgeColor: "from-orange-500 to-yellow-600",
    features: [
      "SS-31 (Elamipretide) Mitochondrial Membrane Repair",
      "MOTS-c Metabolic & Energy Optimization",
      "NAD+ IV & Precursor Protocol (NMN/NR)",
      "CD38 Inhibitor Strategy (Apigenin/Quercetin)",
      "Mitochondrial Function Testing",
      "Energy & Fatigue Biomarker Analysis",
      "Custom Protocol Design & Coaching",
      "Protocol in a Box - Shipped to You",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "functional-health",
    name: "Functional Health Elite",
    subtitle: "4-Month Deep Health Restoration & Optimization",
    price: "$8,500",
    priceNum: 8500,
    duration: "4 months",
    followUp: "$6,500 / 90 days",
    icon: Brain,
    color: "emerald",
    borderColor: "border-emerald-300",
    bgGradient: "from-emerald-500 to-teal-600",
    btnGradient: "from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500",
    useCases: [
      "Executive Brain Performance",
      "Brain Regeneration Protocols",
      "Mold & Mycotoxin Support",
      "Mitochondria & NAD+ Rebuilding",
      "Inside-Out Health Transformation",
      "Longevity & Anti-Aging",
    ],
    features: [
      "90-Minute Deep-Dive Intake Session",
      "Comprehensive Lab & Biomarker Review",
      "Custom Multi-Phase Protocol Design",
      "Bi-Weekly Strategy & Progress Calls",
      "Advanced Peptide & Supplement Stacking",
      "Complete Masterclass Video Library",
      "Protocol in a Box - Shipped to You",
      "4 Months Elite Community Access",
      "Priority Response & Support",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/60-minute-strategy",
  },
  {
    id: "elite-longevity",
    name: "Elite Longevity",
    subtitle: "6-Month Comprehensive Transformation",
    price: "$15,000",
    priceNum: 15000,
    duration: "6 months",
    followUp: "$12,500 / 6 months",
    icon: Diamond,
    color: "purple",
    borderColor: "border-purple-400",
    bgGradient: "from-purple-500 to-violet-600",
    btnGradient: "from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500",
    badge: "BY APPLICATION ONLY",
    badgeColor: "from-purple-500 to-violet-600",
    buildOn: "Everything in Functional Health Elite, plus:",
    features: [
      "2-Hour Pre-Launch Consultation",
      "DNA Deep Dive w/ Global Expert Lane Kennedy",
      "In-Depth Hormone & Muscle-Building Support",
      "Mitochondria Energy Deep Dive",
      "Energy Recovery & Optimization",
      "Lab Marker Optimization Program",
      "Advanced Bioregulator Coaching",
      "Personalized Biohacking Protocol",
      "Cutting-Edge Supplementation",
      "6 Months Elite Community Access",
    ],
    calendlyLink: "https://calendly.com/jason-vigilanttechs/2-hour-elite-longevity",
  },
];

export default function TierSelection() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  const handleGetStarted = (plan: CoachingPlan) => {
    // Open the calendly link for the selected plan
    toast.success(`Opening booking page for ${plan.name}...`);
    window.open(plan.calendlyLink, '_blank');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="container max-w-7xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10 brightness-0 invert" />
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-blue-300 hover:text-white hover:bg-white/10"
                onClick={() => setLocation("/transformation")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container max-w-6xl px-4 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-full mb-6">
              <Star className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide uppercase">Choose Your Path</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Select Your Coaching Program
            </h1>
            
            <p className="text-lg text-blue-200/70 max-w-2xl mx-auto mb-6">
              Every plan includes the complete masterclass library, a custom protocol designed for your biology, 
              and direct access to Jason. Choose the depth that matches your goals.
            </p>
            
            {/* Quick watch masterclass CTA */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-sm">
              <Play className="h-4 w-4 text-amber-400" />
              <span className="text-blue-200/60">Not sure yet?</span>
              <button 
                className="text-amber-400 font-semibold hover:text-amber-300 transition-colors"
                onClick={() => setLocation("/transformation")}
              >
                Watch the free masterclass first
              </button>
            </div>
          </div>
          
          {/* Plans Grid */}
          <div className="space-y-6">
            {COACHING_PLANS.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;
              
              return (
                <Card 
                  key={plan.id}
                  className={`border-2 transition-all duration-300 overflow-hidden bg-white/[0.03] backdrop-blur ${
                    isSelected 
                      ? `${plan.borderColor} shadow-xl` 
                      : "border-white/10 hover:border-white/20"
                  }`}
                  onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                >
                  {plan.badge && (
                    <div className="flex justify-center -mb-3 relative z-10">
                      <div className={`bg-gradient-to-r ${plan.badgeColor} text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg`}>
                        {plan.badge}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Left: Icon + Name + Price */}
                      <div className="flex items-start gap-4 md:w-1/3">
                        <div className={`w-14 h-14 bg-gradient-to-br ${plan.bgGradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                          <p className="text-blue-200/50 text-sm mt-0.5">{plan.subtitle}</p>
                          <div className="mt-3">
                            <span className="text-3xl font-bold text-white">{plan.price}</span>
                            <span className="text-blue-200/40 ml-1">/ {plan.duration}</span>
                          </div>
                          <p className="text-blue-200/30 text-xs mt-1">+ Peptide & Supplement Costs</p>
                          <div className="mt-2 inline-flex items-center gap-1 bg-white/5 border border-white/10 text-blue-200/50 px-2.5 py-1 rounded-full text-xs">
                            <Zap className="h-3 w-3" />
                            Follow-ups: {plan.followUp}
                          </div>
                        </div>
                      </div>
                      
                      {/* Middle: Features */}
                      <div className="flex-1">
                        {plan.buildOn && (
                          <p className="text-xs font-medium text-amber-400 mb-3">{plan.buildOn}</p>
                        )}
                        
                        {plan.useCases && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Use Cases</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {plan.useCases.map((uc, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <Target className="h-3.5 w-3.5 text-emerald-400/60 flex-shrink-0" />
                                  <span className="text-blue-200/60">{uc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-1.5">
                          {plan.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400/60 flex-shrink-0" />
                              <span className="text-blue-200/60">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Right: CTA */}
                      <div className="md:w-48 flex flex-col items-center md:items-end gap-3 flex-shrink-0">
                        <Button 
                          className={`w-full md:w-auto bg-gradient-to-r ${plan.btnGradient} text-white font-semibold px-6 py-5 rounded-xl shadow-lg`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetStarted(plan);
                          }}
                        >
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <p className="text-blue-200/30 text-xs text-center">
                          Book a free consultation
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          
          {/* Bottom info */}
          <div className="mt-12 text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-10 h-10 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-amber-400 font-bold">1</span>
                  </div>
                  <p className="text-blue-200/60">Book a free consultation to discuss your goals</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-amber-400 font-bold">2</span>
                  </div>
                  <p className="text-blue-200/60">Jason designs your personalized protocol</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-amber-400 font-bold">3</span>
                  </div>
                  <p className="text-blue-200/60">Begin your transformation with expert guidance</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-blue-300/40">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/50" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/50" />
                  <span>Payment plans available</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/50" />
                  <span>Questions? omega@omegalongevity.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="container max-w-6xl px-4 text-center">
          <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 mx-auto mb-4 brightness-0 invert" />
          <p className="text-blue-300/40 text-sm mb-2">
            Questions? Email us at{" "}
            <a href="mailto:omega@omegalongevity.com" className="text-amber-400/60 hover:text-amber-400">
              omega@omegalongevity.com
            </a>
          </p>
          <p className="text-blue-300/30 text-sm">
            &copy; {new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
