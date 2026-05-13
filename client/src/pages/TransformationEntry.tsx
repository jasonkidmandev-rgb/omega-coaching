import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { getClientsTransformed, getProtocolsCreated, getYearsExperience } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Sparkles, CheckCircle2, Clock, Users, Zap, Play, Target, Heart, Award, Star, Crown, Diamond, Loader2, Shield, Calendar, Dna, Quote, MapPin, TrendingDown, Timer, Brain, Flame, Mail, Activity, Leaf, Battery, Video, HelpCircle, User, Phone as PhoneIcon } from "lucide-react";
import { useLocation } from "wouter";
import PlanQuiz from "@/components/PlanQuiz";

/* ─── Coaching Sessions shared data ─────────────────────────────────── */
const COACHING_SESSIONS_90DAY = [
  "60-Minute Strategy Session",
  "3-Week Progress Review Session",
  "Weekly Cadence Check-ins w/ Coaching",
  "Month 3 Final Review 1-Hour Session",
];

const COACHING_SESSIONS_ADVANCED = [
  "60-Minute Strategy Session",
  "Bi-Weekly 1-on-1 Coaching Calls",
  "Weekly Cadence Check-ins w/ Coaching",
  "Month 3 Final Review 1-Hour Session",
];

const COACHING_SESSIONS_ELITE = [
  "90-Minute Deep-Dive Intake Session",
  "Monthly Progress Sessions",
  "Weekly Cadence Check-ins w/ Advanced Coaching",
  "Continual Tweaking & Adjustments for Maximum ROI",
  "Month 4 Final Review Session",
];

const COACHING_SESSIONS_LONGEVITY = [
  "2-Hour Pre-Launch Consultation",
  "Monthly Progress Sessions",
  "Weekly Cadence Check-ins w/ Advanced Coaching",
  "Continual Tweaking & Adjustments for Maximum ROI",
  "Month 6 Final Review Session",
];

export default function TransformationEntry() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [, setLocation] = useLocation();
  
  // Email capture mutation
  const captureMutation = trpc.transformation.captureMasterclassEmail.useMutation({
    onSuccess: (result) => {
      sessionStorage.setItem("masterclassEmail", email);
      if (firstName.trim()) {
        sessionStorage.setItem("masterclassName", firstName.trim());
      }
      toast.success(result.alreadyRegistered 
        ? "Welcome back! Redirecting to your masterclass..." 
        : "You're in! Redirecting to the masterclass..."
      );
      setTimeout(() => {
        setLocation("/transformation/masterclass");
      }, 600);
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    },
  });
  
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    setIsSubmitting(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || undefined;
    captureMutation.mutate({
      email: email.trim(),
      name: fullName,
      phone: phone.trim() || undefined,
      source: "masterclass_signup",
    });
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="container max-w-7xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10" />
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setLocation("/")}
              >
                Back to Home
              </Button>
              <Button 
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 hidden sm:inline-flex"
                onClick={() => {
                  const el = document.getElementById('coaching-plans');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Coaching Plans
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MASTERCLASS HERO — Email capture for free masterclass              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-16 md:py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container max-w-5xl px-4 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-full mb-6">
              <Play className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide uppercase">Free Peptide Masterclass</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Clarity in a World of<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Peptide Confusion</span>
            </h1>
            
            <p className="text-lg md:text-xl text-blue-200/80 max-w-3xl mx-auto mb-4 leading-relaxed">
              Your body is under siege — chronic stress, sleep deprivation, EMFs from devices, processed foods, 
              and a go-go-go lifestyle are silently breaking you down. Peptides are the great equalizer.
            </p>
            <p className="text-base text-blue-200/60 max-w-2xl mx-auto mb-8">
              This free masterclass cuts through the noise and shows you exactly how peptides work, 
              which ones matter, and how <span className="text-white font-semibold">{getClientsTransformed()}+ people</span> have 
              used them to reclaim their health.
            </p>
            
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
              {[
                { icon: Dna, title: "How Peptides Work", desc: "The science behind why peptides level the playing field against modern stressors" },
                { icon: Target, title: "Which Ones Matter", desc: "Cut through the hype — learn which peptides actually deliver results" },
                { icon: Brain, title: "Protocol Foundations", desc: "Stacking strategies, dosing basics, and the biomarkers that matter" },
              ].map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
                  <Icon className="h-6 w-6 text-amber-400 mb-2" />
                  <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-blue-200/60 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            
            <div className="max-w-lg mx-auto">
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {/* Row 1: First Name + Last Name (optional) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/40" />
                     <Input
                       type="text"
                       placeholder="First name"
                       value={firstName}
                       required
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-9 py-4 bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-amber-400 focus:ring-amber-400/30 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/40" />
                    <Input
                      type="text"
                      placeholder="Last name (optional)"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-9 py-4 bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-amber-400 focus:ring-amber-400/30 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                
                {/* Row 2: Email (required) + Phone (optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/40" />
                    <Input
                      type="email"
                      placeholder="Email address *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 py-4 bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-amber-400 focus:ring-amber-400/30 text-sm"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/40" />
                    <Input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 py-4 bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 focus:border-amber-400 focus:ring-amber-400/30 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                
                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold px-6 py-5 rounded-lg shadow-lg shadow-amber-500/25 transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      Watch Free Masterclass
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              <p className="text-blue-300/40 text-xs mt-3 text-center">
                Only email is required. No credit card needed. Instant access.
              </p>
            </div>
            
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-blue-300/60">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400/60" />
                <span><span className="text-white font-semibold">{getClientsTransformed()}+</span> clients transformed</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400/60" />
                <span><span className="text-white font-semibold">4.9/5</span> average rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400/60" />
                <span><span className="text-white font-semibold">{getYearsExperience()}+ years</span> clinical experience</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="bg-gradient-to-b from-indigo-950 to-amber-50/50 h-16" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CTA — See the full A-Z journey                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-8 bg-amber-50/50">
        <div className="container max-w-3xl px-4">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-3">
              <MapPin className="h-3.5 w-3.5" />
              See the Full Picture
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              Want to See What This Looks Like from A to Z?
            </h3>
            <p className="text-slate-400 text-sm md:text-base mb-5 max-w-xl mx-auto">
              From enrollment to results — we've mapped out every step of your transformation journey so you know exactly what to expect.
            </p>
            <Button
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 font-semibold px-6 py-5 text-base"
              onClick={() => {
                const el = document.getElementById('transformation-roadmap');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <MapPin className="mr-2 h-4 w-4" />
              View Your Transformation Roadmap
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* COACHING PLANS — All plans visible, direct purchase path           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 md:py-14 bg-gradient-to-b from-amber-50/50 to-white" id="coaching-plans">
        <div className="container max-w-7xl px-4">
          <div className="flex items-center gap-4 max-w-2xl mx-auto mb-10">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Or Go Deeper with 1-on-1 Coaching</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
          
          <div className="max-w-4xl mx-auto text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full mb-5">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Transformation Coaching Programs</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Your Health. Your Goals. Your Coach.
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Whether you're a high-performing executive optimizing for peak performance, or you're 60+ and ready to feel 20 years younger — 
              we build the protocol that matches your biology, your goals, and your life.
            </p>
            
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Timer className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">Limited Availability</h3>
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">
                        Only 3 Spots Open
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Every protocol is meticulously crafted through deep analysis of your health history, goals, and biomarkers. 
                      This level of personalization requires significant time and attention.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>3-5 days protocol development</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-amber-600" />
                        <span>1-on-1 coaching sessions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-amber-600" />
                        <span>Fully customized approach</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: 90-Day Transformation Programs                         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
                <Flame className="h-4 w-4" />
                90-Day Transformation Programs
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Weight Loss & Physique Coaching</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Structured 90-day programs designed to transform your body composition with expert-guided protocols, 
                nutrition strategy, and accountability coaching.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              
              {/* ── Weight Loss & Physique Coaching - $3,000 ── */}
              <Card className="h-full border-2 border-amber-300 shadow-xl shadow-amber-50 hover:shadow-2xl transition-shadow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                    <Crown className="h-4 w-4" />
                    MOST POPULAR
                  </div>
                </div>
                
                <CardHeader className="text-center pb-3 pt-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Weight Loss & Physique</CardTitle>
                  {/* Ideal For — moved under title */}
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-amber-800 font-medium">
                      Ideal for anyone ready to lose weight, build lean muscle, and transform their body
                    </p>
                  </div>
                  <div className="mt-3">
                  <span className="text-4xl font-bold text-gray-900">$3,000</span>
                    <span className="text-gray-500 ml-1">/ 90 days</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Compare to $5K–$10K at boutique wellness clinics
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Alumni follow-ups: $2,500 / 90 days (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {/* Coaching Sessions */}
                  <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-1.5">
                      {COACHING_SESSIONS_90DAY.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Complete Masterclass Video Library",
                      "Custom Protocol Design",
                      "Protocol in a Box - Shipped to You",
                      "1-Hour Kickoff Training Meeting",
                      "Full Access to Peptide Coach Client Corner",
                      "3 Months Elite Community Access",
                      "EMF Protection & Mitigation Strategies",
                      "World-Class Nutritional Guidance",
                      "Lifestyle Optimization Programming",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Core Protocol Stack May Include — at bottom */}
                  <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Dna className="h-3 w-3" /> Core Protocol Stack May Include
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "Next-Gen GLP-1 & Metabolic Peptides",
                        "Lean Muscle & Body Recomposition Peptides",
                        "Fat-Burning & Appetite Regulation Support",
                        "Targeted Supplement Stack for Results",
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tagline — above Get Started */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <p className="text-sm text-amber-700 font-medium text-center italic mb-4">
                      Full Coaching Support for Maximum Results
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold py-5"
                      onClick={() => setLocation('/transformation/checkout?plan=flagship')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── Advanced Weight Loss & Physique - $4,500 ── */}
              {/* Requirement #6: Show ALL features, not just "plus" items */}
              <Card className="h-full border-2 border-rose-300 shadow-xl shadow-rose-50 hover:shadow-2xl transition-shadow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <Flame className="h-3 w-3" />
                    For the Seriously Committed
                  </div>
                </div>
                
                <CardHeader className="text-center pb-3 pt-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Flame className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Advanced Weight Loss & Physique</CardTitle>
                  {/* Ideal For — moved under title */}
                  <div className="mt-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-rose-800 font-medium">
                      Ideal for those who want advanced hormone + peptide strategies for extreme body transformation
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$4,500</span>
                    <span className="text-gray-500 ml-1">/ 90 days</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Alumni follow-ups: $4,000 / 90 days (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {/* Coaching Sessions */}
                  <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100">
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-1.5">
                      {COACHING_SESSIONS_ADVANCED.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* All features listed (not "plus" style) */}
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Complete Masterclass Video Library",
                      "Custom Protocol Design",
                      "Protocol in a Box - Shipped to You",
                      "1-Hour Kickoff Training Meeting",
                      "Full Access to Peptide Coach Client Corner",
                      "3 Months Elite Community Access",
                      "Advanced EMF & Environmental Protection",
                      "Elite Nutritional Strategy & Optimization",
                      "Comprehensive Lifestyle Reprogramming",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Advanced-specific extras */}
                  <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100">
                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Dna className="h-3 w-3" /> Advanced Protocols
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "Advanced Hormone Optimization Strategy",
                        "Advanced Peptide Stacking Protocols",
                        "Advanced Androgen Deep Dive",
                        "Advanced Libido and Drive Modalities",
                        "Deep Metabolic Analysis & Intervention",
                        "Advanced Lab Marker Interpretation",
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tagline — above Get Started */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <p className="text-sm text-rose-700 font-medium text-center italic mb-4">
                      Hormone + Peptide Strategies for Extreme Results
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-semibold py-5"
                      onClick={() => setLocation('/transformation/checkout?plan=advanced')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1.5: Specialty 90-Day Programs                              */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
                <Shield className="h-4 w-4" />
                Specialty 90-Day Programs
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Targeted Health Optimization</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Focused 90-day coaching programs — each one built around a specific health goal with a custom peptide 
                and supplement protocol, expert coaching, and the full Peptide Coach ecosystem.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              
              {/* ── Recovery, Healing & Inflammation - $3,000 ── */}
              <Card className="h-full border-2 border-gray-200 hover:border-sky-300 transition-all shadow-md hover:shadow-lg">
                <CardHeader className="text-center pb-3 pt-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Recovery, Healing & Inflammation</CardTitle>
                  {/* Ideal For — moved under title */}
                  <div className="mt-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-sky-800 font-medium">
                      Ideal for pre/post-surgery, sports injuries, chronic pain, and autoimmune inflammation
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$3,000</span>
                    <span className="text-gray-500 ml-1">/ 90 days</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Alumni follow-ups: $2,500 / 90 days (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Recover faster from surgeries, past and future injuries. Reduce inflammation from chronic pain, stress, or autoimmune conditions.
                  </p>
                  {/* Coaching Sessions */}
                  <div className="bg-sky-50/50 rounded-lg p-3 border border-sky-100">
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-1.5">
                      {COACHING_SESSIONS_90DAY.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Pre/Post-Surgery Recovery Planning",
                      "Inflammation Biomarker Tracking",
                      "Custom Protocol Design & Coaching",
                      "Protocol in a Box - Shipped to You",
                      "1-Hour Kickoff Training Meeting",
                      "Full Access to Peptide Coach Client Corner",
                      "3 Months Elite Community Access",
                      "EMF Protection & Mitigation Strategies",
                      "World-Class Nutritional Guidance",
                      "Lifestyle Optimization Programming",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-sky-50/50 rounded-lg p-3 border border-sky-100">
                    <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Dna className="h-3 w-3" /> Core Protocol Stack May Include
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "BPC-157 & TB-500 Wolverine Stack Protocol",
                        "GHK-Cu Tissue Regeneration & Collagen Repair",
                        "KPV Anti-Inflammatory Peptide Therapy",
                        "Thymosin Beta-4 Systemic Healing Support",
                        "Targeted Gut Healing Protocols",
                        "Anti-Inflammatory Supplement Stack",
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Tagline — above Get Started */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <p className="text-sm text-sky-700 font-medium text-center italic mb-4">
                      Bounce Back Like a Teenager
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold py-5 rounded-xl shadow-md"
                      onClick={() => setLocation('/transformation/checkout?plan=recovery')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── Immunity & Healing - $3,000 ── */}
              <Card className="h-full border-2 border-gray-200 hover:border-teal-300 transition-all shadow-md hover:shadow-lg">
                <CardHeader className="text-center pb-3 pt-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Immunity & Healing</CardTitle>
                  {/* Ideal For — moved under title */}
                  <div className="mt-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-teal-800 font-medium">
                      For those battling frequent illness, weakened immunity, or wanting bulletproof defense
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$3,000</span>
                    <span className="text-gray-500 ml-1">/ 90 days</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Alumni follow-ups: $2,500 / 90 days (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Get your immune system firing on all cylinders. Recover from illness faster, prevent future infections, and shorten their duration.
                  </p>
                  {/* Coaching Sessions */}
                  <div className="bg-teal-50/50 rounded-lg p-3 border border-teal-100">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-1.5">
                      {COACHING_SESSIONS_90DAY.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Comprehensive Immune Panel Review",
                      "Seasonal Illness Prevention Strategy",
                      "Custom Protocol Design & Coaching",
                      "Protocol in a Box - Shipped to You",
                      "1-Hour Kickoff Training Meeting",
                      "Full Access to Peptide Coach Client Corner",
                      "3 Months Elite Community Access",
                      "EMF Protection & Mitigation Strategies",
                      "World-Class Nutritional Guidance",
                      "Lifestyle Optimization Programming",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-teal-50/50 rounded-lg p-3 border border-teal-100">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Dna className="h-3 w-3" /> Core Protocol Stack May Include
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "Thymosin Alpha-1 Immune Modulation Protocol",
                        "Thymulin Thymus Gland Restoration",
                        "LL-37 Antimicrobial Defense Peptide",
                        "Gut-Immune Axis Optimization",
                        "Glutathione & NAC Antioxidant Support",
                        "Immune-Boosting Supplement Protocol",
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Tagline — above Get Started */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <p className="text-sm text-teal-700 font-medium text-center italic mb-4">
                      Rebuild Your Immune Fortress
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-semibold py-5 rounded-xl shadow-md"
                      onClick={() => setLocation('/transformation/checkout?plan=immunity')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── Longevity & Bioregulators - $3,000 ── */}
              <Card className="h-full border-2 border-gray-200 hover:border-violet-300 transition-all shadow-md hover:shadow-lg">
                <CardHeader className="text-center pb-3 pt-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Leaf className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Longevity & Bioregulators</CardTitle>
                  {/* Ideal For — moved under title */}
                  <div className="mt-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-violet-800 font-medium">
                      Feel younger, restore vital organs, and extend cellular lifespan with cutting-edge science
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$3,000</span>
                    <span className="text-gray-500 ml-1">/ 90 days</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Alumni follow-ups: $2,500 / 90 days (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Reverse age with advanced Bioregulator tracks. Restore vital organs starting with the Pineal gland and Thymus gland, and extend your cellular telomeres for a host of health benefits.
                  </p>
                  {/* Coaching Sessions */}
                  <div className="bg-violet-50/50 rounded-lg p-3 border border-violet-100">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-1.5">
                      {COACHING_SESSIONS_90DAY.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Biological Age Testing & Tracking",
                      "Organ-Specific Restoration Roadmap",
                      "Custom Protocol Design & Coaching",
                      "Protocol in a Box - Shipped to You",
                      "1-Hour Kickoff Training Meeting",
                      "Full Access to Peptide Coach Client Corner",
                      "3 Months Elite Community Access",
                      "EMF Protection & Mitigation Strategies",
                      "World-Class Nutritional Guidance",
                      "Lifestyle Optimization Programming",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-violet-50/50 rounded-lg p-3 border border-violet-100">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Dna className="h-3 w-3" /> Core Protocol Stack May Include
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "Epithalon Telomere Extension Protocol",
                        "Pineal Gland Bioregulator (Endoluten)",
                        "Thymus Gland Bioregulator (Vladonix)",
                        "Khavinson Bioregulator Organ Restoration Track",
                        "Epigenetic Age Reversal Strategy",
                        "Melatonin & Circadian Rhythm Optimization",
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Tagline — above Get Started */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <p className="text-sm text-purple-700 font-medium text-center italic mb-4">
                      Reverse Age at the Cellular Level
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-semibold py-5 rounded-xl shadow-md"
                      onClick={() => setLocation('/transformation/checkout?plan=longevity')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── Mitochondria Restoration - $3,000 ── */}
              <Card className="h-full border-2 border-gray-200 hover:border-amber-300 transition-all shadow-md hover:shadow-lg">
                <CardHeader className="text-center pb-3 pt-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Battery className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Mitochondria Restoration</CardTitle>
                  {/* Ideal For — moved under title */}
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-orange-800 font-medium">
                      For those experiencing fatigue, brain fog, or declining energy who want to restore cellular power
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$3,000</span>
                    <span className="text-gray-500 ml-1">/ 90 days</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Alumni follow-ups: $2,500 / 90 days (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Restore your mitochondria's strength and enhance energy and NAD+ levels. Repair the CD38 and NNMT cascades to reclaim youthful energy through targeted peptides and supplements.
                  </p>
                  {/* Coaching Sessions */}
                  <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-1.5">
                      {COACHING_SESSIONS_90DAY.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Mitochondrial Function Testing",
                      "Energy & Fatigue Biomarker Analysis",
                      "Custom Protocol Design & Coaching",
                      "Protocol in a Box - Shipped to You",
                      "1-Hour Kickoff Training Meeting",
                      "Full Access to Peptide Coach Client Corner",
                      "3 Months Elite Community Access",
                      "EMF Protection & Mitigation Strategies",
                      "World-Class Nutritional Guidance",
                      "Lifestyle Optimization Programming",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Dna className="h-3 w-3" /> Core Protocol Stack May Include
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "SS-31 (Elamipretide) Mitochondrial Membrane Repair",
                        "MOTS-c Metabolic & Energy Optimization",
                        "NAD+ IV & Precursor Protocol (NMN/NR)",
                        "CD38 Inhibitor Strategy (Apigenin/Quercetin)",
                        "NNMT Pathway Optimization",
                        "CoQ10, PQQ & MitoQ Supplement Stack",
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Tagline — above Get Started */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <p className="text-sm text-orange-700 font-medium text-center italic mb-4">
                      Recharge Your Cellular Power Plants
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-semibold py-5 rounded-xl shadow-md"
                      onClick={() => setLocation('/transformation/checkout?plan=mitochondria')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: Functional Health Elite Optimization                    */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
                <Brain className="h-4 w-4" />
                Functional Health Elite Optimization
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Rebuild. Restore. Optimize.</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                A 4-month deep health restoration program that goes beyond surface-level fixes to rebuild your biology from the inside out.
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-emerald-300 shadow-xl shadow-emerald-50">
                <CardHeader className="text-center pb-4 pt-6 bg-gradient-to-b from-emerald-50 to-white rounded-t-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Functional Health Elite</CardTitle>
                  <CardDescription className="text-gray-600">
                    4-Month Deep Health Restoration & Optimization
                  </CardDescription>
                  <div className="mt-3 bg-emerald-100 rounded-lg px-4 py-2">
                    <p className="text-emerald-800 text-sm font-medium">For executives or anybody demanding peak cognitive performance, recovering from mold exposure, or ready to rebuild their health from the cellular level up</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$8,500</span>
                    <span className="text-gray-500 ml-1">/ 4 months</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">+ Peptide & Supplement Costs</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    Follow-ups: $8,000 / 4 months (save $500)
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Users className="h-3 w-3" />
                    Add a spouse, save $500
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Coaching Sessions */}
                  <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100 mb-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Coaching Sessions
                    </p>
                    <div className="space-y-2">
                      {COACHING_SESSIONS_ELITE.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {/* Renamed from "Use Cases" to "Who This Is For" — Requirement #11 */}
                    <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3">Who This Is For</p>
                      <div className="space-y-2">
                        {[
                          "Executive Brain Performance",
                          "Brain Regeneration Protocols",
                          "Mold & Mycotoxin Support",
                          "Mitochondria & NAD+ Rebuilding",
                          "Inside-Out Health Transformation",
                          "Longevity & Anti-Aging",
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <Target className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">What's Included</p>
                      <div className="space-y-2">
                        {[
                          "Comprehensive Lab & Biomarker Review",
                          "Custom Multi-Phase Protocol Design",
                          "Advanced Peptide & Supplement Stacking",
                          "Complete Masterclass Video Library",
                          "Protocol in a Box - Shipped to You",
                          "90-Minute Kickoff Training Meeting",
                          "4 Months Elite Community Access",
                          "Priority Response & Support",
                          "Advanced EMF & Environmental Protection",
                          "Elite Nutritional Strategy & Optimization",
                          "Comprehensive Lifestyle Reprogramming",
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold py-5"
                    onClick={() => setLocation('/transformation/checkout?plan=functional_health_elite')}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
          </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: Elite Longevity                                         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
                <Diamond className="h-4 w-4" />
                The Ultimate Experience
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Elite Longevity Program</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our most comprehensive offering — a 6-month transformation designed for those ready to operate at their absolute peak, with every detail handled for you.
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                    <Diamond className="h-4 w-4" />
                    THE ULTIMATE EXPERIENCE
                  </div>
                </div>
                
                <Card className="border-2 border-purple-400 shadow-2xl shadow-purple-50 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 text-white py-8 px-6 text-center">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Diamond className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-2">Elite Longevity</h3>
                    <p className="text-purple-200 mb-2">6-Month Comprehensive Transformation</p>
                    <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-2 mb-2">
                      <p className="text-sm text-purple-100 font-medium">For executives or anybody who refuses to settle for anything less than extraordinary — the ultimate white-glove health transformation</p>
                    </div>
                    <div>
                      <span className="text-5xl font-bold">$15,000</span>
                      <span className="text-purple-200 ml-2">/ 6 months</span>
                    </div>
                    <p className="text-purple-300 text-sm mt-2">+ Peptide & Supplement Costs</p>
                    <div className="mt-2 bg-white/10 backdrop-blur rounded-lg px-4 py-1.5 inline-block">
                      <p className="text-sm text-purple-100 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Follow-ups: $14,500 / 6 months (save $500)
                      </p>
                    </div>
                    <div className="mt-2 bg-white/10 backdrop-blur rounded-lg px-4 py-1.5 inline-block">
                      <p className="text-sm text-purple-100 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Add a spouse, save $500
                      </p>
                    </div>
                    <div className="mt-2 bg-white/10 backdrop-blur rounded-lg px-4 py-2 inline-block">
                      <p className="text-sm text-purple-100">
        Compare to <span className="line-through text-purple-300">$100K+</span> from celebrity influencers
                      </p>
                    </div>
                  </div>
                  <CardContent className="pt-6">
                    {/* Coaching Sessions */}
                    <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-100 mb-4">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Coaching Sessions
                      </p>
                      <div className="space-y-2">
                        {COACHING_SESSIONS_LONGEVITY.map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-purple-600 font-medium text-center mb-4">
                      Everything in Functional Health Elite, plus:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        {[
                          "DNA Deep Dive w/ Global Expert Lane Kennedy",
                          "In-Depth Hormone & Muscle-Building Support",
                          "Mitochondria Energy Deep Dive",
                          "Energy Recovery & Optimization",
                          "90-Minute Kickoff Training Meeting",
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {[
                          "Lab Marker Optimization Program",
                          "Advanced Bioregulator Coaching",
                          "Personalized Biohacking Protocol",
                          "Cutting-Edge Supplementation",
                          "6 Months Elite Community Access",
                          "Advanced EMF & Environmental Protection",
                          "Elite Nutritional Strategy & Optimization",
                          "Comprehensive Lifestyle Reprogramming",
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center mb-4">
                      <p className="text-sm text-purple-800 font-medium">
                        Designed for high-performing CEOs, athletes, and visionaries ready to operate at their absolute peak
                      </p>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-semibold py-5"
                      onClick={() => setLocation('/transformation/checkout?plan=elite')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 4: Protocol Essentials (Self-Guided) — NO coaching sessions */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
                <Play className="h-4 w-4" />
                Self-Guided Option
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Protocol Essentials</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Not ready for full coaching? Get a personalized peptide protocol delivered to you — self-paced, with built-in check-ins. Upgrade anytime.
              </p>
            </div>
            
            <div className="max-w-lg mx-auto">
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="text-center pb-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900">Protocol Essentials</CardTitle>
                  <CardDescription className="text-gray-600">
                    The Perfect DIY Package — Learn at Your Own Pace
                  </CardDescription>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">$1,000</span>
                    <span className="text-gray-500 ml-1">one-time</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="space-y-1.5">
                    {[
                      "Your Protocol, Built by Experts — You Handle the Rest",
                      "Self-paced masterclass access",
                      "Protocol template library",
                      "Preparation video guides",
                      "1 month Omega Elite Community access",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Need 1-on-1 guidance during your program?</span> Book a coaching call anytime — <span className="text-amber-600 font-medium">$125/20 min</span> or <span className="text-amber-600 font-medium">$350/1 hr</span>
                    </p>
                  </div>
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-400 hover:to-slate-600 text-white font-semibold py-5"
                      onClick={() => setLocation('/transformation/checkout?plan=essentials')}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* VIRTUAL COACHING SESSIONS — NO coaching sessions section           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-3">
                <Video className="h-4 w-4" />
                On-Demand Coaching
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Need a Quick Consult?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Already on a protocol and have questions? Need help troubleshooting a specific issue? Book a one-off session with your coach — no long-term commitment required.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* 20-min session */}
              <Card className="border-2 border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="text-center pb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">Targeted Focus Call</CardTitle>
                  <CardDescription className="text-gray-600">
                    20-Minute Virtual Session
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">$125</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="space-y-1.5">
                    {[
                      "Quick answers to specific questions",
                      "Dosing adjustments & troubleshooting",
                      "Sourcing & preparation help",
                      "Side effect guidance",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold py-5"
                      onClick={() => window.open('https://calendly.com/jason-vigilanttechs/20-minute-coaching-125', '_blank')}
                    >
                      Book a Focus Call
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 60-min session */}
              <Card className="border-2 border-amber-300 shadow-lg hover:shadow-xl transition-shadow relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <CardHeader className="text-center pb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Video className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">Deep-Dive Session</CardTitle>
                  <CardDescription className="text-gray-600">
                    1-Hour Virtual Session
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">$350</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="space-y-1.5">
                    {[
                      "In-depth review of your current protocol",
                      "Troubleshoot multiple concerns at once",
                      "Preparation & administration walkthrough",
                      "Guidance on adjustments & next steps",
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold py-5"
                      onClick={() => window.open('https://calendly.com/jason-vigilanttechs/60-minute-tranformation-consult-350', '_blank')}
                    >
                      Book a Deep-Dive
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
              These sessions are ideal for existing protocol users or anyone needing one-off guidance. For a full personalized protocol, see our coaching programs above.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* YOUR TRANSFORMATION ROADMAP                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section id="transformation-roadmap" className="py-16 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container max-w-4xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <MapPin className="h-4 w-4" />
              Your Journey at a Glance
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Your Transformation Roadmap
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From enrollment to results — here's exactly what happens when you join a coaching program
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-amber-400 to-emerald-500" />
            
            {[
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
            ].map((phase) => (
              <div key={phase.step} className="relative flex gap-4 md:gap-6 mb-8 last:mb-0">
                <div className={`relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${phase.color} flex items-center justify-center text-xl md:text-2xl shadow-lg flex-shrink-0`}>
                  {phase.icon}
                </div>
                
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Step {phase.step}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1">{phase.title}</h3>
                  <p className="text-slate-400 text-sm mb-2">{phase.desc}</p>
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
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* READY TO TRANSFORM CTA                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-gradient-to-b from-amber-50 to-white">
        <div className="container max-w-3xl px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Ready to Transform?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Pick your plan above and check out in minutes — or book a discovery session if you need help choosing.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">I Know What I Want</h3>
              <p className="text-gray-600 text-sm mb-4">
                Scroll up, pick your plan, and check out directly. Secure checkout.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold py-5 text-base"
                onClick={() => document.getElementById('coaching-plans')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Discovery Session — Requirement #1: $75 → $95, renamed */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-indigo-200 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Not Sure Which Plan?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Book a $95 discovery session. The $95 applies as a deposit toward any plan.
              </p>
              <a
                href="https://calendly.com/jason-vigilanttechs/20-minute-consult-95"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold py-5 text-base">
                  <Calendar className="mr-2 h-5 w-5" />
                  Book $95 Discovery Session
                </Button>
              </a>
              <p className="text-xs text-gray-500 mt-2">Pay when you book · Applies as deposit</p>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              Questions? Email us at{" "}
              <a href="mailto:omega@omegalongevity.com" className="text-amber-600 hover:underline font-medium">
                omega@omegalongevity.com
              </a>
            </p>
          </div>
        </div>
      </section>
      


      {/* Success Stories Section */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container max-w-6xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Star className="h-4 w-4" />
              Real Results from Real Clients
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Transformation Success Stories
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See what our clients have achieved with personalized peptide protocols and dedicated coaching
            </p>
            
            <div className="flex flex-wrap justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-amber-600">
                  {getClientsTransformed().toLocaleString()}+
                </div>
                <div className="text-gray-600 font-medium mt-1">Clients Transformed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-amber-600">
                  {getProtocolsCreated().toLocaleString()}+
                </div>
                <div className="text-gray-600 font-medium mt-1">Protocols Created</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-amber-600">
                  {getYearsExperience()}+
                </div>
                <div className="text-gray-600 font-medium mt-1">Years Coaching Experience</div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Testimonial 1 - David H. */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 relative">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Quote className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  DH
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">David H.</h4>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <TrendingDown className="h-4 w-4" />
                  Lost 16 lbs fat, Gained 5 lbs muscle in 6 weeks
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                "Jason cares about my health more than me some days! He is passionate! Thanks to his encouragement and planning, I have seen encouraging results. I feel good and look better than I have in years."
              </p>
            </div>
            
            {/* Testimonial 2 - Sam T. */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 relative">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Quote className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  ST
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Sam T.</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" /> Texas
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <TrendingDown className="h-4 w-4" />
                  255 lbs to 233 lbs, Size 38 to 34 in 2 months
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                "I plateaued for months in weight loss. In just 2 months with a semi-aggressive peptide protocol I went from size 38 pants to size 34! This truly helped me destroy my plateau."
              </p>
            </div>
            
            {/* Testimonial 3 - Jill R. */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 relative">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Quote className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  JR
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Jill R.</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    Age 60
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <TrendingDown className="h-4 w-4" />
                  Lost 18 lbs in 12 weeks, Reversed Pre-Diabetes
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                "The greatest takeaway was that it helped me make the lifestyle changes I needed for continued health. My follow-up labs took me down from Pre-Diabetic — that's probably the greatest success of my 12 weeks."
              </p>
            </div>
          </div>
          
          <div className="text-center mt-10">
            <a 
              href="https://omegalongevity.com/success-stories/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              Read More Success Stories
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-50 border-t border-gray-100">
        <div className="container max-w-6xl px-4 text-center">
          <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mb-2">
            Questions? Email us at{" "}
            <a href="mailto:omega@omegalongevity.com" className="text-amber-600 hover:underline">
              omega@omegalongevity.com
            </a>
          </p>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Floating "Not sure which plan?" button */}
      <button
        onClick={() => setShowQuiz(true)}
        className="fixed bottom-6 right-6 z-40 text-white px-5 py-3 rounded-full shadow-lg shadow-black/20 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2 group"
        style={{ background: 'linear-gradient(to right, #1B2B4B, #2a3f6b)' }}
      >
        <HelpCircle className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="font-medium text-sm">Not sure which plan?</span>
      </button>

      {/* Plan Quiz Modal */}
      <PlanQuiz isOpen={showQuiz} onClose={() => setShowQuiz(false)} />
    </div>
  );
}
