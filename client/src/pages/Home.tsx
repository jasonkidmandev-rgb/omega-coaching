import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ArrowRight,
  LayoutDashboard,
  Play,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Calendar,
  Star,
  Sparkles,
  Menu,
  Check,
  X,
  Crown,
  Quote,
  LogIn,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { getClientsTransformed, getProtocolsCreated, getYearsExperience } from "@/lib/stats";
import { faqItems } from "@/lib/faqData";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);

  const consultUrl = "https://calendly.com/jason-vigilanttechs/20-minute-consult-95";
  const eliteUrl = "https://link.fastpaydirect.com/payment-link/6871a1cbd6ab80936ce6849c";
  const freeUrl = "https://members.omegalongevity.com/communities/groups/omega-community-group/home";

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (learnRef.current && !learnRef.current.contains(e.target as Node)) setLearnOpen(false);
      if (communityRef.current && !communityRef.current.contains(e.target as Node)) setCommunityOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ============================================ */}
      {/* TOP BANNER */}
      {/* ============================================ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container max-w-7xl px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <span className="text-gray-300">
            New to peptides? Start with our{" "}
            <strong className="text-white">Free Masterclass</strong>
            <span className="hidden sm:inline"> — Learn the science behind peptide optimization</span>
          </span>
          <button
            onClick={() => setLocation("/transformation")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-3 py-1 rounded text-xs transition-colors flex-shrink-0"
          >
            Watch Now →
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl py-3 px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-9 md:h-10" />
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Masterclass - top level orange link */}
              <button
                onClick={() => setLocation("/transformation")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-amber-600" />
                Masterclass
              </button>

              {/* Learn dropdown */}
              <div ref={learnRef} className="relative">
                <button
                  onClick={() => { setLearnOpen(!learnOpen); setCommunityOpen(false); }}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Learn
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${learnOpen ? "rotate-180" : ""}`} />
                </button>
                {learnOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                    <button onClick={() => { scrollToSection("how-it-works"); setLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">How It Works</button>
                    <button onClick={() => { scrollToSection("masterclass"); setLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Masterclass</button>
                    <button onClick={() => { scrollToSection("faq"); setLearnOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">FAQ</button>
                  </div>
                )}
              </div>

              {/* Community dropdown */}
              <div ref={communityRef} className="relative">
                <button
                  onClick={() => { setCommunityOpen(!communityOpen); setLearnOpen(false); }}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Community
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${communityOpen ? "rotate-180" : ""}`} />
                </button>
                {communityOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                    <button onClick={() => { scrollToSection("community"); setCommunityOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Compare Plans</button>
                    <a href={eliteUrl} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Elite Community</a>
                    <a href={freeUrl} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Free Community</a>
                  </div>
                )}
              </div>


              {/* Results */}
              <button
                onClick={() => scrollToSection("results")}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Results
              </button>
            </nav>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button size="sm" onClick={() => setLocation(user?.role === 'admin' ? "/admin" : "/launchpad")} className="bg-amber-600 hover:bg-amber-700">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="lg:hidden border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => setLocation("/login")}
                  >
                    <LogIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden lg:inline-flex border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => setLocation("/login")}
                  >
                    <LogIn className="h-4 w-4 mr-1.5" />
                    Login
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden lg:inline-flex border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.open(consultUrl, "_blank")}
                  >
                    Book $95 Discovery
                  </Button>
                  <Button
                    size="sm"
                    className="hidden lg:inline-flex bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setLocation("/transformation")}
                  >
                    <Star className="h-3.5 w-3.5 mr-1" />
                    View Plans
                  </Button>
                </>
              )}

              {/* Mobile hamburger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 pt-12">
                  <nav className="flex flex-col gap-2">
                    <Button variant="ghost" className="justify-start text-base font-semibold text-amber-600" onClick={() => setLocation("/transformation")}>
                      <Play className="h-4 w-4 mr-2 fill-amber-600" />
                      Masterclass
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => scrollToSection("how-it-works")}>
                      How It Works
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => scrollToSection("masterclass")}>
                      Learn
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => scrollToSection("community")}>
                      Community
                    </Button>

                    <Button variant="ghost" className="justify-start text-base" onClick={() => scrollToSection("results")}>
                      Results
                    </Button>
                    <div className="border-t my-2" />
                    {isAuthenticated ? (
                      <Button className="justify-start bg-amber-600 hover:bg-amber-700" onClick={() => setLocation(user?.role === 'admin' ? "/admin" : "/launchpad")}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" className="justify-start text-base font-medium" onClick={() => setLocation("/login")}>
                          <LogIn className="h-4 w-4 mr-2" />
                          Login
                        </Button>
                        <Button variant="outline" className="justify-start" onClick={() => window.open(consultUrl, "_blank")}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Book $95 Discovery
                        </Button>
                        <Button className="justify-start bg-amber-500 hover:bg-amber-600" onClick={() => setLocation("/transformation")}>
                          <Star className="h-4 w-4 mr-2" />
                          View Plans
                        </Button>
                      </>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }} />

        <div className="relative container max-w-7xl px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              EVIDENCE-BASED PEPTIDE COACHING
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Transform Your Health with{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent italic">
                Expert Peptide Guidance
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Stop guessing with peptides. Get a personalized protocol designed by an experienced coach
              who has guided <strong className="text-white">{getClientsTransformed().toLocaleString()}+ clients</strong> to
              real, measurable results — from fat loss and muscle gain to anti-aging and cognitive performance.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg px-8 py-6 shadow-lg shadow-amber-500/25"
                onClick={() => setLocation("/transformation")}
              >
                View Coaching Plans
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6"
                onClick={() => window.open(consultUrl, "_blank")}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Book $95 Discovery Session
              </Button>
            </div>

            {/* Credit note */}
            <p className="text-sm text-amber-300/80 mb-12">
              💡 Your $95 applies as a deposit toward any coaching plan when you enroll.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">{getClientsTransformed().toLocaleString()}+</div>
                <div className="text-sm text-gray-400 mt-1">Clients Coached</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">{getProtocolsCreated().toLocaleString()}+</div>
                <div className="text-sm text-gray-400 mt-1">Protocols Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">50+</div>
                <div className="text-sm text-gray-400 mt-1">Peptides Researched</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-amber-400">{getYearsExperience()}+</div>
                <div className="text-sm text-gray-400 mt-1">Years Experience</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS */}
      {/* ============================================ */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white">
        <div className="container max-w-7xl px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              YOUR JOURNEY
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Three simple steps from where you are now to a fully personalized peptide protocol.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-amber-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Watch the Masterclass</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Learn the science behind peptides, how they work, and what's possible — completely free.
              </p>
              <button
                onClick={() => setLocation("/transformation")}
                className="text-amber-600 font-semibold text-sm hover:text-amber-700 inline-flex items-center gap-1"
              >
                Watch Free <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-amber-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Book a Discovery Session</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                20-minute call with Jason. $95 deposit applies toward any coaching plan.
              </p>
              <button
                onClick={() => window.open(consultUrl, "_blank")}
                className="text-amber-600 font-semibold text-sm hover:text-amber-700 inline-flex items-center gap-1"
              >
                Book Session <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-amber-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Your Custom Protocol</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Choose a coaching plan and receive a protocol designed specifically for your goals and body.
              </p>
              <button
                onClick={() => setLocation("/transformation")}
                className="text-amber-600 font-semibold text-sm hover:text-amber-700 inline-flex items-center gap-1"
              >
                See Plans <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* MASTERCLASS SECTION */}
      {/* ============================================ */}
      <section id="masterclass" className="py-16 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container max-w-7xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Video side */}
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube-nocookie.com/embed/lc5kPWKoG9Y?si=Ip-a28XTCkjF6BmO&rel=0&modestbranding=1"
                  title="Peptide Coaching Masterclass Preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Content side */}
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <Play className="h-4 w-4" />
                FREE MASTERCLASS
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                The Complete Peptide Optimization Blueprint
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Our comprehensive masterclass covers everything from peptide fundamentals to advanced stacking strategies.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Peptide Science & Mechanisms of Action",
                  "Preparation, Dosing & Administration",
                  "Weight Loss, Body Composition & GLP-1 Protocols",
                  "Anti-Aging, Bioregulators & Longevity",
                  "Injury Recovery, Immune Support & Cognitive Enhancement",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <span className="text-gray-200">{item}</span>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8"
                onClick={() => setLocation("/transformation")}
              >
                <Play className="h-5 w-5 mr-2" />
                Access Full Masterclass — Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* MEET YOUR COACH */}
      {/* ============================================ */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container max-w-7xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Photo side */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100">
                  <img
                    src="/hero-jason-shannon.jpeg"
                    alt="Jason & Shannon - Peptide Coach Pro"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                          <span class="text-white text-6xl font-bold">J&S</span>
                        </div>
                      `;
                    }}
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                  <div className="text-2xl font-bold text-amber-600">{getClientsTransformed().toLocaleString()}+</div>
                  <div className="text-xs text-gray-500">Clients Coached</div>
                </div>
              </div>
            </div>

            {/* Bio side */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Hi, I'm Jason
              </h2>
              <p className="text-amber-600 font-semibold text-lg mb-6">
                Founder of Omega Longevity & Peptide Coach Pro
              </p>
              <div className="space-y-4 text-gray-600 leading-relaxed mb-6">
                <p>
                  I'm now in my <strong className="text-gray-900">{getYearsExperience()}th year</strong> of peptide optimization — and the impact has been life-changing,
                  not just for me, but for my wife Shannon as well. Together, we've experienced firsthand how the right peptide protocols
                  can transform energy, recovery, body composition, and overall vitality.
                </p>
                <p>
                  I've personally designed over {getProtocolsCreated().toLocaleString()} protocols
                  and coached {getClientsTransformed().toLocaleString()}+ clients across every goal imaginable — from dramatic weight loss
                  transformations to elite-level longevity optimization.
                </p>
              </div>

              {/* Quote */}
              <div className="border-l-4 border-amber-500 pl-4 mb-8">
                <p className="text-gray-700 italic">
                  "My approach is simple: <strong>education first, personalization always.</strong> I don't believe
                  in one-size-fits-all protocols. Every body is different, and your protocol should reflect that."
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{getClientsTransformed().toLocaleString()}+</div>
                  <div className="text-xs text-gray-500">Clients</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{getProtocolsCreated().toLocaleString()}+</div>
                  <div className="text-xs text-gray-500">Protocols</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{getYearsExperience()}+</div>
                  <div className="text-xs text-gray-500">Years</div>
                </div>
              </div>

              {/* CTA */}
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={() => setLocation("/transformation")}
              >
                See Coaching Plans
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TESTIMONIALS */}
      {/* ============================================ */}
      <section id="results" className="py-16 md:py-24 bg-gray-50">
        <div className="container max-w-7xl px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Star className="h-4 w-4" />
              REAL RESULTS
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Client Transformations
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-10">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="bg-amber-50 text-amber-700 font-bold text-sm px-3 py-1.5 rounded-lg inline-block mb-4">
                22 lbs lost in 2 months
              </div>
              <Quote className="h-6 w-6 text-gray-200 mb-3" />
              <p className="text-gray-600 leading-relaxed mb-4">
                "In just 2 months I went from size 38 pants to size 34! I never imagined I would be weighing in at 233 lbs and size 34 waist. And, damn, do I look GOOD!"
              </p>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">S</div>
                <div>
                  <div className="font-semibold text-gray-900">Sam T.</div>
                  <div className="text-gray-400 text-xs">Texas</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="bg-amber-50 text-amber-700 font-bold text-sm px-3 py-1.5 rounded-lg inline-block mb-4">
                31 lbs lost, inflammation gone
              </div>
              <Quote className="h-6 w-6 text-gray-200 mb-3" />
              <p className="text-gray-600 leading-relaxed mb-4">
                "I have steadily lost a total of 31 pounds, and the inflammation is gone from the Hashimotos. For the first time in years, I am able to get through a full day without napping."
              </p>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">K</div>
                <div>
                  <div className="font-semibold text-gray-900">Kira H.</div>
                  <div className="text-gray-400 text-xs">Utah</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="bg-amber-50 text-amber-700 font-bold text-sm px-3 py-1.5 rounded-lg inline-block mb-4">
                16 lbs fat lost, 5 lbs muscle gained
              </div>
              <Quote className="h-6 w-6 text-gray-200 mb-3" />
              <p className="text-gray-600 leading-relaxed mb-4">
                "This is the sixth week of work, and I have lost 16 lbs of fat and gained 5 lbs of muscle. I feel good and look better than I have in years. Jason cares about my health more than me some days!"
              </p>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">D</div>
                <div>
                  <div className="font-semibold text-gray-900">David H.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => scrollToSection("ready-for-results")}
              className="text-amber-600 font-semibold hover:text-amber-700 inline-flex items-center gap-1"
            >
              See All Transformations <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* COMMUNITY */}
      {/* ============================================ */}
      <section id="community" className="py-16 md:py-24 bg-white">
        <div className="container max-w-7xl px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Users className="h-4 w-4" />
              JOIN THE COMMUNITY
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Connect with 200+ Members
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Whether you're just curious or ready to dive deep, we have the perfect community for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Elite Card */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h3 className="text-xl font-bold">Elite Community</h3>
              </div>
              <div className="mb-1">
                <span className="text-3xl font-bold text-amber-400">$69</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">7-day free trial</p>

              <div className="space-y-3 mb-8">
                {[
                  "Direct Q&A Coaching",
                  "Live Q&A Calls",
                  "Premium Resource Library",
                  "PeptidePro App Access",
                  "Exclusive VIP Discounts",
                  "Monthly Updates",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={() => window.open(eliteUrl, "_blank")}
              >
                Start 7-Day Free Trial
              </Button>
            </div>

            {/* Free Card */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-900">Free Community</h3>
              </div>
              <div className="mb-1">
                <span className="text-3xl font-bold text-gray-900">Free</span>
                <span className="text-gray-400"> forever</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">No credit card required</p>

              <div className="space-y-3 mb-8">
                {[
                  { text: "Basic Community Access", included: true },
                  { text: "Introductory Protocols", included: true },
                  { text: "Direct Q&A Coaching", included: false },
                  { text: "Live Q&A Calls", included: false },
                  { text: "Premium Resources", included: false },
                  { text: "VIP Discounts", included: false },
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feature.included ? "text-gray-700" : "text-gray-400"}`}>{feature.text}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => window.open(freeUrl, "_blank")}
              >
                Join Free Community
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FAQ SECTION */}
      {/* ============================================ */}
      <section id="faq" className="py-16 md:py-24 bg-gray-50">
        <div className="container max-w-4xl px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 text-lg">
              Everything you need to know before getting started
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden bg-white"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                  <span className="text-amber-500 text-xl flex-shrink-0">
                    {openFaqIndex === index ? "−" : "+"}
                  </span>
                </button>
                {openFaqIndex === index && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL DECISION ZONE */}
      {/* ============================================ */}
      <section id="ready-for-results" className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

        <div className="relative container max-w-5xl px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Ready to Transform Your Health?
          </h2>
          <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
            Choose the path that's right for where you are today.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* I'm Ready */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-8 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-2">I'M READY</p>
              <h3 className="text-xl font-bold text-white mb-3">View Coaching Plans</h3>
              <p className="text-white/80 text-sm mb-6 leading-relaxed">
                Choose from self-guided to fully coached 90-day transformations
              </p>
              <a
                href="/transformation"
                onClick={(e) => { e.preventDefault(); setLocation("/transformation"); }}
                className="inline-flex items-center gap-1 text-white font-semibold text-sm border-b border-white/50 pb-0.5 hover:border-white"
              >
                See Plans & Pricing <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* I Need Guidance */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">I NEED GUIDANCE</p>
              <h3 className="text-xl font-bold text-white mb-3">Book $95 Discovery Session</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                20-min call with Jason. $95 deposit applies toward any plan
              </p>
              <button
                onClick={() => window.open(consultUrl, "_blank")}
                className="inline-flex items-center gap-1 text-amber-400 font-semibold text-sm border-b border-amber-400/50 pb-0.5 hover:border-amber-400"
              >
                Book Session <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Just Exploring */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">JUST EXPLORING</p>
              <h3 className="text-xl font-bold text-white mb-3">Watch Free Masterclass</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Learn the science first. No credit card, no commitment
              </p>
              <button
                onClick={() => setLocation("/transformation")}
                className="inline-flex items-center gap-1 text-gray-300 font-semibold text-sm border-b border-gray-500 pb-0.5 hover:border-gray-300"
              >
                Watch Free <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="container max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8" />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-500">
              <a href="mailto:omega@omegalongevity.com" className="hover:text-amber-600 transition-colors">
                omega@omegalongevity.com
              </a>
              <span className="hidden md:inline">·</span>
              <a href="https://omegalongevity.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 transition-colors">
                omegalongevity.com
              </a>
            </div>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Omega Longevity. All rights reserved.
            </p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6 max-w-3xl mx-auto">
            Individual results may vary. Testimonials reflect personal experiences and are not guaranteed outcomes.
          </p>
        </div>
      </footer>
    </div>
  );
}
