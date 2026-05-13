import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Pill,
  ArrowRight,
  ExternalLink,
  ClipboardList,
  Users,
  GraduationCap,
  Calendar,
  Star,
  CheckCircle,
  Sparkles,
  LayoutDashboard,
  User,
  FileText,
  ShoppingCart,
  Play,
  BookOpen,
  Target,
  Award,
  ChevronDown,
  Handshake,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { getClientsTransformed } from "@/lib/stats";

export default function LaunchpadHub() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const consultUrl = "https://calendly.com/jason-vigilanttechs/20-minute-consult-95";
  
  const { data: hubLinks = [] } = trpc.hubLinks.list.useQuery();

  const platformLinks = hubLinks.filter(l => l.category === 'platform');

  

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header - White Background */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="container max-w-6xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <a href="https://peptidecoach.pro" className="flex-shrink-0">
                <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10" />
              </a>
              {/* About Jason - Hover Bio */}
              <div className="relative group hidden md:block">
                <button className="flex items-center gap-1.5 text-gray-600 hover:text-amber-600 transition-colors text-sm font-medium">
                  <User className="h-4 w-4" />
                  About Jason
                </button>
                {/* Hover Card */}
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">JK</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Jason Kidman</h4>
                      <p className="text-sm text-amber-600">Founder, Omega Longevity</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Certified Health Optimization Coach specializing in peptide protocols, longevity strategies, and metabolic health. Featured on Fully Optimized Health, The Powerful Man Show, and The Women's Vibrancy Code.
                  </p>
                  <a 
                    href="https://omegalongevity.com/about-jason/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Learn more about Jason
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile Menu Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              {isAuthenticated ? (
                <>
                  {user?.role === 'admin' && (
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 hidden sm:flex" onClick={() => setLocation("/admin")}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 sm:hidden p-2" onClick={() => setLocation("/admin")}>
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="border-amber-500 text-amber-600 hover:bg-amber-50 hidden sm:flex" onClick={() => setLocation("/dashboard")}>
                    <Target className="h-4 w-4 mr-2" />
                    My Dashboard
                  </Button>
                  <Button variant="outline" size="sm" className="border-amber-500 text-amber-600 hover:bg-amber-50 sm:hidden p-2" onClick={() => setLocation("/dashboard")}>
                    <Target className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 hidden sm:flex" onClick={() => setLocation("/account")}>
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 sm:hidden p-2" onClick={() => setLocation("/account")}>
                    <User className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100" onClick={() => (window.location.href = getLoginUrl())}>
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-out Menu */}
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 text-gray-600 hover:text-gray-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {/* About Jason - Mobile */}
              <a
                href="https://omegalongevity.com/about-jason/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                About Jason
              </a>
              <div className="border-t border-gray-100 my-3" />
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => { setLocation('/dashboard'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <Target className="h-5 w-5" />
                    My Dashboard
                  </button>
                  <button
                    onClick={() => { setLocation('/account'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <User className="h-5 w-5" />
                    Account
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => { setLocation('/admin'); setMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      Admin Dashboard
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-3" />
                  <button
                    onClick={() => { setLocation('/protocol'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <ClipboardList className="h-5 w-5" />
                    My Protocol
                  </button>
                  <button
                    onClick={() => { setLocation('/documents'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <FileText className="h-5 w-5" />
                    Documents
                  </button>
                  <button
                    onClick={() => { setLocation('/inventory'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Inventory
                  </button>
                  <button
                    onClick={() => { setLocation('/metrics'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <TrendingUp className="h-5 w-5" />
                    Metrics
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { window.location.href = getLoginUrl(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    <User className="h-5 w-5" />
                    Sign In
                  </button>
                  <div className="border-t border-gray-100 my-3" />
                  <p className="px-4 text-sm text-gray-500 mb-2">Quick Links</p>
                  <a
                    href="#omega-elite"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    Elite Community
                  </a>
                  {/* Store hidden for compliance
                  <a
                    href="#omega-store"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Omega Store
                  </a>
                  */}
                  <a
                    href="#cheat-sheet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    <BookOpen className="h-5 w-5" />
                    Peptide Cheat Sheet
                  </a>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section - Option 2: Orange/Cream Gradient with Soft Blobs */}
      <section className="py-16 md:py-24 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 30%, #ffedd5 60%, #fed7aa 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br from-amber-200/50 to-orange-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 md:w-80 h-56 md:h-80 bg-gradient-to-tr from-amber-100/60 to-orange-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-40 md:w-64 h-40 md:h-64 bg-gradient-to-r from-amber-100/30 to-orange-100/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <div className="container max-w-6xl relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-amber-200 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Elite Health Optimization
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Your Central Hub</span>
              <br />
              <span className="text-gray-900">for All Things Peptides</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              One place to access everything you need for your peptide journey. 
              No more juggling multiple apps—your complete ecosystem is right here.
            </p>
          </div>
        </div>
      </section>

      {/* What's Inside Section - NAVY BACKGROUND */}
      <section className="py-16 md:py-20 px-4 bg-[#1e3a5f]">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">What's Inside</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Everything you need to optimize your health, all in one place
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Omega Free Community */}
            <div 
              className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center hover:bg-white/20 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
              onClick={() => setLocation('/community')}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/40 transition-all duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Free Community</h3>
              <p className="text-white/60 text-sm mb-3">
                Learn peptide basics and connect with like-minded optimizers
              </p>
              <Badge className="bg-emerald-500 text-white border-0 mb-3">Free to Join</Badge>
              <div className="flex items-center justify-center gap-1 text-white/50 text-xs group-hover:text-emerald-400 transition-colors">
                <ArrowRight className="h-4 w-4" />
                <span>Get started</span>
              </div>
            </div>

            {/* Omega Store - hidden for compliance
            <div 
              className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center hover:bg-white/20 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
              onClick={() => document.getElementById('omega-store')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-amber-500/40 transition-all duration-300">
                <ShoppingCart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Omega Store</h3>
              <p className="text-white/60 text-sm mb-3">
                Order peptides and supplies with exclusive discounts
              </p>
              <Badge className="bg-amber-500 text-white border-0 mb-3">10% Off</Badge>
              <div className="flex items-center justify-center gap-1 text-white/50 text-xs group-hover:text-amber-400 transition-colors">
                <ChevronDown className="h-4 w-4 animate-bounce" />
                <span>Learn more</span>
              </div>
            </div>
            */}

            {/* Protocol Tracker */}
            <div 
              className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center hover:bg-white/20 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
              onClick={() => document.getElementById('peptidepro')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-amber-500/40 transition-all duration-300">
                <Pill className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Protocol Tracker</h3>
              <p className="text-white/60 text-sm mb-3">
                Daily tracking with reminders and progress insights
              </p>
              <Badge className="bg-white/20 text-white border-0 mb-3">PeptidePro.App</Badge>
              <div className="flex items-center justify-center gap-1 text-white/50 text-xs group-hover:text-amber-400 transition-colors">
                <ChevronDown className="h-4 w-4 animate-bounce" />
                <span>Learn more</span>
              </div>
            </div>

            {/* Peptide Cheat Sheet - For Registered Users */}
            <div 
              className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center hover:bg-white/20 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
              onClick={() => isAuthenticated ? setLocation('/peptide-cheat-sheet') : document.getElementById('transformation-coaching')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/40 transition-all duration-300">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Peptide Cheat Sheet</h3>
              <p className="text-white/60 text-sm mb-3">
                {isAuthenticated ? 'Quick reference guide for peptide protocols' : 'Register to access our peptide reference guide'}
              </p>
              <Badge className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-0 mb-3">{isAuthenticated ? 'Access Now' : 'Members Only'}</Badge>
              <div className="flex items-center justify-center gap-1 text-white/50 text-xs group-hover:text-blue-400 transition-colors">
                <ArrowRight className="h-4 w-4" />
                <span>{isAuthenticated ? 'View guide' : 'Get started'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals Section - WHITE */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Why Omega Longevity?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Trusted by health optimizers who demand the best
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Expert-Curated Protocols</h3>
                <p className="text-gray-600 text-sm">Developed by certified health optimization specialists</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Personalized Coaching</h3>
                <p className="text-gray-600 text-sm">1:1 support tailored to your unique health goals</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Exclusive Discounts</h3>
                <p className="text-gray-600 text-sm">10% off peptides and supplies for members</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Daily Protocol Tracking</h3>
                <p className="text-gray-600 text-sm">Never miss a dose with smart reminders</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Community Access</h3>
                <p className="text-gray-600 text-sm">Connect with like-minded health optimizers</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Vetted Partners</h3>
                <p className="text-gray-600 text-sm">Only trusted suppliers and products</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* As Seen In / Press Badges Section - WHITE */}
      <section className="py-12 md:py-16 px-4 bg-white border-t border-gray-100">
        <div className="container max-w-6xl">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Featured Podcast Guest</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
            {/* Fully Optimized Health */}
            <a 
              href="https://jaycampbell.com/fully-optimized-health/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img 
                src="/fully-optimized-health-logo.png" 
                alt="Fully Optimized Health" 
                className="h-12 md:h-14 w-auto object-contain"
              />
            </a>
            {/* The Women's Vibrancy Code */}
            <a 
              href="https://www.youtube.com/@thewomensvibrancycode" 
              target="_blank" 
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img 
                src="/womens-vibrancy-code-logo.jpg" 
                alt="The Women's Vibrancy Code with Maraya Brown" 
                className="h-12 md:h-14 w-auto object-contain rounded-lg"
              />
            </a>
            {/* The Powerful Man Show */}
            <a 
              href="https://www.thepowerfulman.com/podcast/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img 
                src="/powerful-man-show-logo.jpg" 
                alt="The Powerful Man Show" 
                className="h-12 md:h-14 w-auto object-contain rounded-lg"
              />
            </a>
          </div>
        </div>
      </section>

      {/* How It Works Section - ORANGE/AMBER BACKGROUND */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-amber-500 to-orange-500">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-4">How It Works</h2>
            <p className="text-[#1e3a5f]/70 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-[#1e3a5f] text-xl mb-2">Create Your Account</h3>
              <p className="text-[#1e3a5f]/70">
                Sign up in 10 seconds—no credit card required
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-[#1e3a5f] text-xl mb-2">Get Your Protocol</h3>
              <p className="text-[#1e3a5f]/70">
                Receive personalized recommendations from our experts
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-[#1e3a5f] text-xl mb-2">Start Your Journey</h3>
              <p className="text-[#1e3a5f]/70">
                Track daily, see results, and optimize your health
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transformation CTA Banner - NAVY BACKGROUND */}
      <section id="transformation-coaching" className="py-16 md:py-20 px-4 bg-[#1e3a5f]">
        <div className="container max-w-4xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Transformation Programs
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready for Real Results?
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto text-lg mb-8">
              From self-guided protocols to comprehensive 6-month transformations — find the coaching plan that fits your goals.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 px-8 py-3 text-lg"
                onClick={() => setLocation('/transformation')}
              >
                View Coaching Plans
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-8 text-white/70">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-400" />
                <span className="text-sm">332+ Clients Transformed</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" />
                <span className="text-sm">4.9/5 Client Satisfaction</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <span className="text-sm">Industry-Leading Protocols</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Links Section - WHITE */}
      <section id="platforms" className="py-16 md:py-20 px-4 bg-white">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Your Ecosystem Platforms</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Access all your essential tools from one central location
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Omega Elite Community */}
            <Card id="omega-elite" className="bg-white border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-amber-500 text-white">7 Days Free</Badge>
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Learn Peptides
                    </span>
                  </div>
                </div>
                <CardTitle className="text-gray-900 text-xl mt-4">Omega Elite Community</CardTitle>
                <CardDescription className="text-gray-600">
                  Our online coaching platform with cutting edge weight loss, energy, recovery and longevity protocols for <span className="text-amber-600 font-semibold">$69/mo</span> with 7 days free to see if it's the right fit for you with exclusive VIP discounts on peptides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600" onClick={() => window.open('https://link.fastpaydirect.com/payment-link/6871a1cbd6ab80936ce6849c', '_blank')}>
                  Join Community
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Omega Store - hidden for compliance
            <Card id="omega-store" className="bg-white border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">10% Off</Badge>
                </div>
                <CardTitle className="text-gray-900 text-xl">Omega Store</CardTitle>
                <CardDescription className="text-gray-600">
                  Order peptides and supplies directly. Discount of 10% applied automatically on eligible items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white hover:from-orange-500 hover:to-amber-600" onClick={() => setLocation('/order')}>
                  Shop Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            */}

            {/* PeptidePro.App */}
            <Card id="peptidepro" className="bg-white border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Pill className="h-7 w-7 text-white" />
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
                </div>
                <CardTitle className="text-gray-900 text-xl">PeptidePro.App</CardTitle>
                <CardDescription className="text-gray-600">
                  Your day-to-day protocol tracker. Login on computer or phone to see your daily protocol and check things off one at a time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-amber-300" onClick={() => window.open('https://www.peptidepro.app/login', '_blank')}>
                  Open PeptidePro
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Omega Peptide Practitioner */}
            <Card id="practitioner" className="bg-white border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Star className="h-7 w-7 text-white" />
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
                </div>
                <CardTitle className="text-gray-900 text-xl">Omega Peptide Practitioner</CardTitle>
                <CardDescription className="text-gray-600">
                  Get started with your peptide journey. Connect with our practitioner network.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-amber-300" onClick={() => window.open('https://getstarted.omegalongevity.com/practitioner', '_blank')}>
                  Get Started
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Omega Free Community */}
            <Card id="omega-free" className="bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Free</Badge>
                </div>
                <CardTitle className="text-gray-900 text-xl">Omega Free Community</CardTitle>
                <CardDescription className="text-gray-600">
                  Start your peptide education journey. Access basic protocols, connect with others, and learn the fundamentals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-600" onClick={() => setLocation('/community')}>
                  Join Free Community
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Trusted Partners */}
            <Card id="partners" className="bg-white border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Handshake className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Vetted</Badge>
                </div>
                <CardTitle className="text-gray-900 text-xl">Trusted Partners</CardTitle>
                <CardDescription className="text-gray-600">
                  Vetted suppliers and tools we trust and recommend. Exclusive discount codes for the Omega community.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-amber-300" onClick={() => setLocation('/partners')}>
                  View Partners & Discounts
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Inside Omega Podcast Section - GRAY */}
      <section id="podcast" className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Inside Omega Podcast</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Deep dives into peptides, longevity, biohacking, and elite health optimization
            </p>
          </div>

          <Card className="bg-white border-2 border-red-200 max-w-3xl mx-auto hover:shadow-lg transition-all">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img 
                    src="/inside_omega_podcast.webp" 
                    alt="Inside Omega Podcast - Jason Kidman and Lane Kennedy" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Listen & Learn</h3>
                  <p className="text-gray-600 mb-4">
                    Join Jason & Lane for in-depth conversations about cutting-edge health optimization, peptide protocols, and the science of longevity.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Button 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => window.open('https://www.youtube.com/playlist?list=PLJIHJKH1hrVDXU6dGzMeluSNs87Hkkl-t', '_blank')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      YouTube
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => window.open('https://open.spotify.com/show/58OsSQaU5hYN9lBSkDZ60d?si=0f9bb2c6eb344379', '_blank')}
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Spotify
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50"
                      onClick={() => window.open('https://podcasts.apple.com/us/podcast/inside-omega/id1858766686', '_blank')}
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.59-.12 1.2-.59 1.54-.47.34-1.1.34-1.57 0-.47-.34-.71-.95-.59-1.54-.23-1.18-.71-2.14-1.54-2.97-1.18-1.18-2.73-1.77-4.03-1.77-1.3 0-2.85.59-4.03 1.77-.83.83-1.31 1.79-1.54 2.97-.12.59-.12 1.2.59 1.54.47.34.47.95 0 1.54-.47.34-1.1.34-1.57 0-.47-.34-.71-.95-.59-1.54.35-1.77 1.04-3.12 2.26-4.39 1.61-1.69 3.72-2.59 6.06-2.59zm-.07 3.976c1.69 0 3.19.64 4.4 1.85.83.83 1.42 1.89 1.65 3.07.12.59-.12 1.2-.59 1.54-.47.34-1.1.34-1.57 0-.47-.34-.71-.95-.59-1.54-.12-.59-.47-1.18-.94-1.65-.71-.71-1.65-1.06-2.36-1.06s-1.65.35-2.36 1.06c-.47.47-.82 1.06-.94 1.65-.12.59-.12 1.2.59 1.54.47.34.47.95 0 1.54-.47.34-1.1.34-1.57 0-.47-.34-.71-.95-.59-1.54.23-1.18.82-2.24 1.65-3.07 1.21-1.21 2.71-1.85 4.4-1.85zm.07 3.952a2.964 2.964 0 00-2.95 2.95 2.964 2.964 0 002.95 2.95 2.964 2.964 0 002.95-2.95 2.964 2.964 0 00-2.95-2.95zm0 7.632c-.59 0-1.06.47-1.06 1.06v2.36c0 .59.47 1.06 1.06 1.06.59 0 1.06-.47 1.06-1.06v-2.36c0-.59-.47-1.06-1.06-1.06z"/>
                      </svg>
                      Apple
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section - NAVY BACKGROUND */}
      <div className="bg-[#1e3a5f]">
        <TestimonialCarousel variant="navy" />
      </div>



      {/* ============================================ */}
      {/* YOUR TRANSFORMATION STARTS HERE + READY FOR REAL RESULTS */}
      {/* ============================================ */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        
        <div className="relative container max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            YOUR TRANSFORMATION STARTS HERE
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Ready for{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Real Results?
            </span>
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join {getClientsTransformed().toLocaleString()}+ clients who stopped guessing and started transforming. 
            Whether you're brand new to peptides or looking to optimize an existing protocol, 
            we have a coaching plan designed for your goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg px-8 py-6 shadow-lg shadow-amber-500/25"
              onClick={() => setLocation("/transformation")}
            >
              Get Started — See Coaching Plans
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6"
              onClick={() => window.open(consultUrl, "_blank")}
            >
              <Calendar className="h-5 w-5 mr-2" />
              $95 Discovery Session
            </Button>
          </div>
          <p className="text-sm text-gray-400">
            Not sure which plan? The $95 Discovery Session is a 20-minute call to help you decide — 
            deposit applies toward any coaching plan within 24 hours.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800 bg-[#0f172a] px-4">
        <div className="container max-w-6xl text-center text-sm text-white/50">
          <p className="mb-2">Questions? Email us at <a href="mailto:omega@omegalongevity.com" className="text-amber-400 hover:text-amber-300 hover:underline">omega@omegalongevity.com</a></p>
          <p>© {new Date().getFullYear()} Omega Longevity. All rights reserved.</p>
        </div>
      </footer>

      
    </div>
  );
}
