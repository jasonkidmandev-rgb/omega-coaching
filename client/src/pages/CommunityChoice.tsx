import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ArrowRight, 
  CheckCircle, 
  X, 
  Star, 
  Zap, 
  GraduationCap, 
  MessageSquare, 
  Video, 
  BookOpen, 
  Smartphone,
  Calendar,
  Gift,
  Crown,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";

export default function CommunityChoice() {
  const [, setLocation] = useLocation();

  const eliteFeatures = [
    { icon: MessageSquare, text: "Direct Q&A Coaching - Get your questions answered by our team and access Jason's expert insights", included: true },
    { icon: Video, text: "Live Q&A Calls - Join live sessions and get your burning questions answered in real time", included: true },
    { icon: BookOpen, text: "Premium Resource Library - Step-by-step guides, quick-start videos, and advanced peptide education", included: true },
    { icon: Smartphone, text: "PeptidePro App Access - Organize your peptide protocol in the most efficient way ever", included: true },
    { icon: Users, text: "Ongoing Community Access - Connect with like-minded individuals, share experiences, and learn together", included: true },
    { icon: Calendar, text: "Monthly Updates - Stay informed on the latest research, protocols, and product recommendations", included: true },
    { icon: Gift, text: "Exclusive VIP Discounts - Save on peptides and supplies with member-only pricing", included: true },
  ];

  const freeFeatures = [
    { icon: Users, text: "Basic Community Access - Connect with other peptide enthusiasts", included: true },
    { icon: BookOpen, text: "Introductory Protocols - Access a selection of beginner-friendly protocols", included: true },
    { icon: MessageSquare, text: "Direct Q&A Coaching", included: false },
    { icon: Video, text: "Live Q&A Calls", included: false },
    { icon: BookOpen, text: "Premium Resource Library", included: false },
    { icon: Smartphone, text: "PeptidePro App Access", included: false },
    { icon: Calendar, text: "Monthly Updates", included: false },
    { icon: Gift, text: "VIP Discounts", included: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="container max-w-6xl py-4 px-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => goBackTo('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Launchpad</span>
            </button>
            <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-8" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl text-center">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 mb-4">Choose Your Path</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Your Peptide Journey?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Whether you're just curious or ready to dive deep, we have the perfect community for you. 
            But before you choose free, see what you might be missing...
          </p>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-8 px-4">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Elite Community - Highlighted */}
            <Card className="border-2 border-amber-400 ring-2 ring-amber-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 text-sm font-semibold">
                <Crown className="h-4 w-4 inline mr-1" />
                RECOMMENDED - Most Popular Choice
              </div>
              <CardHeader className="pt-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Star className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900">Omega Elite Community</CardTitle>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-bold text-amber-600">$69</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 w-fit">7 Days Free Trial</Badge>
                <CardDescription className="text-gray-600 mt-3">
                  Our exclusive membership designed for individuals who are serious about optimizing their health 
                  and staying at the forefront of peptide science. Whether you're just getting started or refining 
                  advanced protocols, you'll find the expert tools, accountability, and community you need to succeed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  What's Included:
                </h4>
                <ul className="space-y-3 mb-6">
                  {eliteFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <h5 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Perfect For:
                  </h5>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Anyone who wants continuous education and guidance</li>
                    <li>• Practitioners growing their skills</li>
                    <li>• Self-researchers who value expert resources</li>
                    <li>• Members seeking an accountability-focused community</li>
                  </ul>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 text-lg py-6"
                  onClick={() => window.open('https://link.fastpaydirect.com/payment-link/6871a1cbd6ab80936ce6849c', '_blank')}
                >
                  Start 7-Day Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Cancel anytime. No commitment required.
                </p>
              </CardContent>
            </Card>

            {/* Free Community */}
            <Card className="border border-gray-200 relative">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900">Omega Free Community</CardTitle>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-bold text-emerald-600">Free</span>
                      <span className="text-gray-500">forever</span>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-gray-600">
                  A great starting point for those who want to learn about peptides but aren't quite ready 
                  to commit. Get a taste of the community and basic resources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold text-gray-900 mb-4">What's Included:</h4>
                <ul className="space-y-3 mb-6">
                  {freeFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? "text-gray-700 text-sm" : "text-gray-400 text-sm line-through"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> The free community is a great way to get started, but you'll have 
                    limited access to protocols, no live Q&A sessions, and no VIP discounts on products.
                  </p>
                </div>

                <Button 
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-lg py-6"
                  onClick={() => window.open('https://members.omegalongevity.com/communities/groups/omega-community-group/home', '_blank')}
                >
                  Join Free Community
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  You can always upgrade to Elite later
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 px-4 bg-[#1e3a5f]">
        <div className="container max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Still Not Sure? Let's Talk.
          </h2>
          <p className="text-white/70 mb-6 max-w-2xl mx-auto">
            Have questions about which community is right for you? Reach out and we'll help you decide.
          </p>
          <Button 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
            onClick={() => window.location.href = 'mailto:omega@omegalongevity.com?subject=Question about Omega Communities'}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Us
          </Button>
        </div>
      </section>
    </div>
  );
}
