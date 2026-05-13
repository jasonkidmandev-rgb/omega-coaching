import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, CheckCircle2, Play, Target, BookOpen, Package, X, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function ProtocolBuildEntry() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="container max-w-6xl py-3 md:py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 md:h-10" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/")}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="container max-w-6xl px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">Self-Guided Program</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Protocol Build Program
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Build your personalized peptide protocol with our comprehensive masterclass and protocol builder
            </p>
            <p className="text-lg text-blue-600 font-semibold">
              $1,000 One-Time Investment
            </p>
          </div>
          
          {/* Features Grid - What's Included */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Masterclass</h3>
              <p className="text-gray-600 text-sm">15-section video library covering peptides, bioregulators, and optimization</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Protocol Builder</h3>
              <p className="text-gray-600 text-sm">Interactive tool to design your personalized peptide protocol</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Access</h3>
              <p className="text-gray-600 text-sm">3 months FREE access to the Omega Elite community</p>
            </div>
          </div>

          {/* What's NOT Included */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
                Not Included in This Program
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-gray-400" />
                  <span>1-on-1 Coaching Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-gray-400" />
                  <span>Weekly Check-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-gray-400" />
                  <span>Reconstitution Training</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-gray-400" />
                  <span>Progress Review Sessions</span>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Want coaching support?{" "}
                <a href="/transformation" className="text-amber-600 hover:text-amber-700 font-medium">
                  View our 90-Day Transformation Program →
                </a>
              </p>
            </div>
          </div>
          
          {/* Get Started Card */}
          <Card className="max-w-md mx-auto bg-white border border-gray-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-gray-900">Get Started</CardTitle>
              <CardDescription className="text-gray-600">
                Begin building your personalized protocol today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setLocation("/protocol-build/journey")}
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-sm text-gray-500 mt-4">
                Questions?{" "}
                <a href="mailto:omega@omegalongevity.com" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact us
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* What's Included Detail Section */}
      <section className="py-16 bg-gray-50">
        <div className="container max-w-4xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Everything You Get</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Play, text: "Complete 15-Section Masterclass Video Library" },
              { icon: BookOpen, text: "Comprehensive Peptide Education" },
              { icon: Target, text: "Interactive Protocol Builder Tool" },
              { icon: Package, text: "Supplier & Sourcing Resources" },
              { icon: BookOpen, text: "Reconstitution Guides & Calculators" },
              { icon: Users, text: "3 Months Omega Elite Community Access" },
              { icon: BookOpen, text: "Downloadable Protocol Templates" },
              { icon: CheckCircle2, text: "Email Support for Questions" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl px-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12 border border-blue-100">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Simple, One-Time Investment</h2>
              <p className="text-gray-600 mb-6">Everything you need to build your protocol</p>
              
              <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm max-w-md mx-auto">
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Protocol Build Program</p>
                <p className="text-5xl font-bold text-gray-900 mb-2">$1,000</p>
                <p className="text-gray-600 text-sm mb-6">One-time payment • Lifetime access to materials</p>
                
                <ul className="text-left space-y-3 text-sm text-gray-600 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Full masterclass video library
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Protocol builder access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    All resources & templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    3 months community access
                  </li>
                </ul>
                
                <p className="text-xs text-gray-400">
                  Protocol supplies purchased separately based on your custom protocol design
                </p>
              </div>
              
              <p className="text-center text-gray-500 text-sm mt-6">
                Want personalized coaching?{" "}
                <a href="/transformation" className="text-amber-600 hover:text-amber-700 font-medium">
                  View our $2,500 Transformation Program
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-50 border-t border-gray-100">
        <div className="container max-w-6xl px-4 text-center">
          <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
