import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ExternalLink, 
  Shield, 
  CheckCircle, 
  Copy,
  Sparkles,
  Pill,
  Brain,
  Heart,
  Wrench,
  Package,
  Quote
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const categoryIcons: Record<string, React.ReactNode> = {
  peptides: <Pill className="h-6 w-6" />,
  supplements: <Heart className="h-6 w-6" />,
  nootropics: <Brain className="h-6 w-6" />,
  tools: <Wrench className="h-6 w-6" />,
  health: <Sparkles className="h-6 w-6" />,
  other: <Package className="h-6 w-6" />,
};

const categoryColors: Record<string, string> = {
  peptides: "from-amber-400 to-orange-500",
  supplements: "from-green-400 to-emerald-500",
  nootropics: "from-purple-400 to-violet-500",
  tools: "from-blue-400 to-cyan-500",
  health: "from-pink-400 to-rose-500",
  other: "from-slate-400 to-slate-500",
};

export default function Partners() {
  const [, setLocation] = useLocation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const { data: partners, isLoading } = trpc.affiliatePartners.list.useQuery({ activeOnly: true });
  const trackClickMutation = trpc.affiliatePartners.trackClick.useMutation();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Group partners by category
  const groupedPartners = partners?.reduce((acc, partner) => {
    const category = partner.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(partner);
    return acc;
  }, {} as Record<string, typeof partners>);

  const categoryLabels: Record<string, string> = {
    peptides: "Peptide Suppliers",
    supplements: "Supplements & Nutrition",
    nootropics: "Nootropics & Cognitive",
    tools: "Tools & Apps",
    health: "Health & Wellness",
    other: "Other Partners",
  };

  // Define category order
  const categoryOrder = ["peptides", "supplements", "nootropics", "tools", "health", "other"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-white"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Launchpad
          </Button>
          <h1 className="text-lg font-semibold">Trusted Partners</h1>
          <div className="w-32" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 border-b border-white/10">
        <div className="container max-w-6xl text-center">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4">
            <Shield className="h-3 w-3 mr-1" />
            Vetted & Trusted
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Our <span className="text-amber-400">Trusted Partners</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            We've carefully selected partners who share our commitment to quality, safety, and results. 
            These are the suppliers and tools we trust and recommend to our clients.
          </p>
        </div>
      </section>

      {/* Partners Grid */}
      <section className="py-16">
        <div className="container max-w-6xl">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading partners...</p>
            </div>
          ) : partners && partners.length > 0 ? (
            <div className="space-y-16">
              {categoryOrder.map((category) => {
                const categoryPartners = groupedPartners?.[category];
                if (!categoryPartners || categoryPartners.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${categoryColors[category]} flex items-center justify-center`}>
                        {categoryIcons[category]}
                      </div>
                      {categoryLabels[category] || category}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryPartners?.map((partner) => (
                        <Card 
                          key={partner.id} 
                          className={`bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all group ${partner.isFeatured ? 'border-amber-500/30 ring-1 ring-amber-500/20' : ''}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {partner.logoUrl ? (
                                  <img 
                                    src={partner.logoUrl} 
                                    alt={`${partner.name} logo`}
                                    className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${categoryColors[partner.category]} flex items-center justify-center`}>
                                    {categoryIcons[partner.category]}
                                  </div>
                                )}
                                <CardTitle className="text-white text-lg">{partner.name}</CardTitle>
                              </div>
                              {partner.isFeatured && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            {partner.description && (
                              <CardDescription className="text-slate-400 text-sm">
                                {partner.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Discount Code */}
                            {partner.code ? (
                              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-slate-400">Discount Code</span>
                                  {partner.discountText && (
                                    <span className="text-xs text-amber-400 font-medium">{partner.discountText}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 bg-amber-500/10 text-amber-400 px-3 py-2 rounded font-mono text-sm font-bold">
                                    {partner.code}
                                  </code>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-slate-600 hover:bg-slate-700"
                                    onClick={() => copyCode(partner.code!)}
                                  >
                                    {copiedCode === partner.code ? (
                                      <CheckCircle className="h-4 w-4 text-green-400" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : partner.discountText ? (
                              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                                <p className="text-sm text-slate-300">{partner.discountText}</p>
                              </div>
                            ) : null}
                            
                            {/* Testimonial */}
                            {partner.testimonial && (
                              <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                                <div className="flex items-start gap-2">
                                  <Quote className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-slate-300 italic">
                                    "{partner.testimonial}"
                                  </p>
                                </div>
                                <p className="text-xs text-amber-400 mt-2 text-right">— Omega Team</p>
                              </div>
                            )}
                            
                            {/* Visit Button */}
                            <Button 
                              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:from-amber-500 hover:to-orange-600"
                              onClick={() => {
                                // Track the click
                                trackClickMutation.mutate({ partnerId: partner.id, userAgent: navigator.userAgent });
                                window.open(partner.url, '_blank');
                              }}
                              data-tracking={`affiliate-click-${partner.id}`}
                            >
                              Visit {partner.name}
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No partners available at this time.</p>
            </div>
          )}
        </div>
      </section>

      {/* Affiliate Disclaimer */}
      <section className="py-12 border-t border-white/10 bg-slate-800/30">
        <div className="container max-w-4xl">
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              Affiliate Disclosure
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              All of the above are affiliate links. They do not change your price but they do help support 
              the Omega community, ongoing research, and the time we invest into education and coaching.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mt-3">
              Whenever you restock or try something new, feel free to share your experiences and results 
              inside the community. Your feedback helps everyone refine their protocols and learn what's 
              working best in real life.
            </p>
          </div>
        </div>
      </section>

      {/* Why Partner Quality Matters */}
      <section className="py-16 border-t border-white/10">
        <div className="container max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-12">Why Partner Quality Matters</h2>
          <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
            In the peptide space, quality isn't just important—it's everything. Here's why we're selective about who we recommend.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Purity Verified</h3>
              <p className="text-slate-400 text-sm">
                All partners undergo rigorous third-party testing to ensure pharmaceutical-grade purity.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Safety First</h3>
              <p className="text-slate-400 text-sm">
                We only recommend suppliers with proven track records and transparent practices.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Client Tested</h3>
              <p className="text-slate-400 text-sm">
                Our recommendations come from real experience—these are suppliers our clients trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 border-t border-white/10">
        <div className="container max-w-6xl text-center">
          <h3 className="text-xl font-semibold mb-4">Questions About Our Partners?</h3>
          <p className="text-slate-400 mb-6">
            If you have questions about any of our trusted partners or need guidance on which products to choose, 
            our coaching team is here to help.
          </p>
          <Button 
            variant="outline" 
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            onClick={() => setLocation("/")}
          >
            Return to Launchpad
          </Button>
        </div>
      </section>
    </div>
  );
}
