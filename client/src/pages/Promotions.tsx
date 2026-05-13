import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Tag, Clock, ArrowRight, Gift, Percent, ShoppingCart, Star, Zap, TrendingDown } from "lucide-react";
import { PricingTierChart } from "@/components/PricingTierChart";

interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor: string;
  savings: string;
  originalPrice?: string;
  currentPrice?: string;
  pricingTiers?: Array<{ minQty: number; maxQty: number | null; pricePerUnit: number }>;
  expiresAt?: string;
  ctaText: string;
  ctaLink: string;
  featured?: boolean;
  icon: React.ReactNode;
}

const promotions: Promotion[] = [
  {
    id: "tirzepatide-volume",
    title: "Tirzepatide HA 10MG",
    subtitle: "Volume Discount",
    description: "Save up to 18% when you order multiple units. The more you buy, the more you save on this premium GLP-1/GIP dual agonist peptide.",
    badge: "BEST VALUE",
    badgeColor: "bg-gradient-to-r from-amber-500 to-orange-500",
    savings: "Save up to 18%",
    pricingTiers: [
      { minQty: 1, maxQty: 1, pricePerUnit: 325 },
      { minQty: 2, maxQty: 4, pricePerUnit: 285 },
      { minQty: 5, maxQty: null, pricePerUnit: 265 },
    ],
    ctaText: "Order Now",
    ctaLink: "/store",
    featured: true,
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: "new-client-discount",
    title: "New Client Welcome",
    subtitle: "10% Off First Protocol",
    description: "New to Omega Longevity? Get 10% off your first complete protocol order. Use code WELCOME10 at checkout.",
    badge: "NEW CLIENTS",
    badgeColor: "bg-gradient-to-r from-blue-500 to-cyan-500",
    savings: "10% Off",
    ctaText: "Start Your Journey",
    ctaLink: "/store",
    featured: false,
    icon: <Gift className="h-6 w-6" />,
  },
  {
    id: "omega-elite-membership",
    title: "Omega Elite Community",
    subtitle: "Monthly Membership",
    description: "Join our exclusive community for $69/month. Get access to expert Q&A sessions, protocol optimization tips, and member-only discounts.",
    badge: "MEMBERSHIP",
    badgeColor: "bg-gradient-to-r from-purple-500 to-pink-500",
    savings: "Exclusive Access",
    currentPrice: "$69/mo",
    ctaText: "Join Community",
    ctaLink: "/launchpad",
    featured: false,
    icon: <Star className="h-6 w-6" />,
  },
  {
    id: "bulk-supplies",
    title: "Supplies Bundle",
    subtitle: "Save on Essentials",
    description: "Get syringes, alcohol wipes, and reconstitution solution together at a discounted bundle price. Everything you need to get started.",
    badge: "BUNDLE",
    badgeColor: "bg-gradient-to-r from-green-500 to-emerald-500",
    savings: "Bundle & Save",
    ctaText: "View Bundle",
    ctaLink: "/store",
    featured: false,
    icon: <ShoppingCart className="h-6 w-6" />,
  },
];

export default function Promotions() {
  const [hoveredPromo, setHoveredPromo] = useState<string | null>(null);

  const featuredPromo = promotions.find(p => p.featured);
  const otherPromos = promotions.filter(p => !p.featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/launchpad">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Omega Longevity</h1>
                <p className="text-xs text-slate-400">Special Offers</p>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/store">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Shop Now
              </Button>
            </Link>
            <Link href="/launchpad">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                Back to Hub
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 mb-6">
              <Tag className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">Current Promotions</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Special Offers & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Discounts</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8">
              Take advantage of our exclusive deals on premium peptides, supplements, and coaching packages. 
              Limited time offers designed to support your optimization journey.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Promotion */}
      {featuredPromo && (
        <section className="py-8 px-4">
          <div className="container mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
              
              <div className="relative p-8 md:p-12">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left side - Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className={`${featuredPromo.badgeColor} text-white px-3 py-1 text-xs font-bold animate-pulse`}>
                        {featuredPromo.badge}
                      </Badge>
                      <Badge variant="outline" className="border-green-500/50 text-green-400">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {featuredPromo.savings}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                        {featuredPromo.icon}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-white">{featuredPromo.title}</h2>
                        <p className="text-amber-400 font-medium">{featuredPromo.subtitle}</p>
                      </div>
                    </div>
                    
                    <p className="text-slate-400 text-lg mb-6 max-w-xl">
                      {featuredPromo.description}
                    </p>
                    
                    <Link href={featuredPromo.ctaLink}>
                      <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25">
                        {featuredPromo.ctaText}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Right side - Pricing Chart */}
                  {featuredPromo.pricingTiers && (
                    <div className="w-full lg:w-auto lg:min-w-[400px]">
                      <PricingTierChart 
                        tiers={featuredPromo.pricingTiers} 
                        currentQuantity={1}
                        itemName={featuredPromo.title}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Other Promotions Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
            <Percent className="h-6 w-6 text-amber-400" />
            More Ways to Save
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherPromos.map((promo) => (
              <Card 
                key={promo.id}
                className={`bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all duration-300 cursor-pointer group ${
                  hoveredPromo === promo.id ? 'scale-[1.02] shadow-xl shadow-amber-500/10' : ''
                }`}
                onMouseEnter={() => setHoveredPromo(promo.id)}
                onMouseLeave={() => setHoveredPromo(null)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${promo.badgeColor} text-white text-xs`}>
                      {promo.badge}
                    </Badge>
                    <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                      {promo.savings}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                      {promo.icon}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{promo.title}</CardTitle>
                      <CardDescription className="text-amber-400">{promo.subtitle}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">{promo.description}</p>
                  
                  {promo.currentPrice && (
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-white">{promo.currentPrice}</span>
                    </div>
                  )}
                  
                  <Link href={promo.ctaLink}>
                    <Button className="w-full bg-slate-700 hover:bg-amber-500 text-white transition-colors group-hover:bg-amber-500">
                      {promo.ctaText}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8 md:p-12">
            <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Don't Miss Out on These Deals
            </h2>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto">
              Our promotions are updated regularly. Subscribe to our newsletter or check back often to stay informed about the latest offers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/store">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Browse Store
                </Button>
              </Link>
              <Link href="/launchpad">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Explore All Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8 px-4">
        <div className="container mx-auto text-center text-slate-500 text-sm">
          <p>© 2026 Omega Longevity. All promotions subject to availability and terms.</p>
        </div>
      </footer>
    </div>
  );
}
