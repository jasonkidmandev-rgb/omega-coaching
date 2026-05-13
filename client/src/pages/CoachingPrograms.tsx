import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Check, BookOpen, Users, Zap, Heart, GraduationCap, Award, Quote, Star, X } from 'lucide-react';

// Payment Method Modal Component - Stripe checkout
function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectMethod,
  programName,
  price,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: "stripe") => void;
  programName: string;
  price: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-slate-700 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Complete Payment</h2>
          <p className="text-slate-400">
            Pay securely for <span className="text-orange-400 font-medium">{programName}</span>
          </p>
          {price !== "TBD" && <p className="text-3xl font-bold text-white mt-4">{price}</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8 text-center">
          <p className="text-slate-300 text-sm">Secure checkout powered by Stripe</p>
          <p className="text-slate-500 text-xs mt-2">Credit card, debit card, and other payment methods accepted</p>
        </div>

        <button
          onClick={() => onSelectMethod("stripe")}
          className="w-full py-4 rounded-xl font-semibold text-lg transition-all bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25"
        >
          Continue to Checkout
        </button>

        <p className="text-center text-slate-500 text-sm mt-4">🔒 Secure payment processing</p>
      </div>
    </div>
  );
}

export default function CoachingPrograms() {
  const [selectedProgram, setSelectedProgram] = useState<{ name: string; price: string } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleEnroll = (programName: string, price: string) => {
    setSelectedProgram({ name: programName, price });
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelect = (method: "stripe") => {
    setShowPaymentModal(false);
    // Navigate to payment page with Stripe
    window.location.href = `/payment?method=stripe&program=${encodeURIComponent(selectedProgram?.name || '')}`;
  };

  const programs = [
    {
      id: 'weight-loss',
      title: '3 Month Weight Loss Program',
      description: 'Comprehensive weight loss program including peptides, nutrition, and training optimization',
      price: 'TBD',
      icon: Zap,
      color: 'from-orange-400 to-red-500',
      features: ['Personalized peptide protocol', 'Nutrition optimization', 'Training program', 'Weekly check-ins', 'Supplement recommendations'],
      includes: 'Includes peptides'
    },
    {
      id: 'wolverine',
      title: '3 Month Heal Your Body Like Wolverine',
      description: 'Advanced healing, recovery, and inflammation reduction program with peptide support',
      price: 'TBD',
      icon: Heart,
      color: 'from-emerald-400 to-teal-500',
      features: ['Healing protocols', 'Recovery optimization', 'Inflammation reduction', 'Injury prevention', 'Regenerative peptides', 'Daily protocols'],
      includes: 'Includes peptides'
    },
    {
      id: 'immunity',
      title: '3 Month Immunity Boost Program',
      description: 'Build lasting immune resilience with peptide-supported protocols',
      price: 'TBD',
      icon: Award,
      color: 'from-blue-400 to-cyan-500',
      features: ['Immune system optimization', 'Illness prevention protocols', 'Biomarker testing', 'Supplement protocols', 'Lifestyle optimization', 'Ongoing support'],
      includes: 'Includes peptides'
    },
    {
      id: 'starter',
      title: 'Peptide Starter Coaching Package',
      description: '4 Peptide Starter protocol based on your goals with personalized guidance',
      price: '$395',
      icon: Users,
      color: 'from-violet-400 to-purple-500',
      features: ['20-minute consultation call', '1 month free Omega Elite membership', 'Daily protocol build-out', '4 peptide starter protocols', 'Goal-based customization', 'Peptide Coach Self-Guided Check-ins'],
      includes: 'Perfect for beginners'
    }
  ];

  const externalPrograms = [
    { id: 'practitioner-auto', title: 'Practitioner Training - Automated', description: 'Self-paced practitioner training program', url: 'https://getstarted.omegalongevity.com/practitioner#section-oCoIEZr-U', icon: GraduationCap, color: 'from-pink-400 to-rose-500' },
    { id: 'practitioner-intensive', title: 'Practitioner Training - Intensive', description: 'Intensive hands-on practitioner training', url: 'https://getstarted.omegalongevity.com/practitioner#section-oCoIEZr-U', icon: Award, color: 'from-indigo-400 to-blue-500' },
    { id: '90-day', title: '90 Day Transformation + DNA', description: 'Comprehensive 90-day transformation program with DNA analysis', url: 'https://getstarted.omegalongevity.com/90-days-training', icon: Zap, color: 'from-amber-400 to-orange-500' }
  ];

  const testimonials = [
    {
      name: "Steve D.",
      location: "",
      quote: "I can't express how amazing this product is! In 2015, I was in a fire that left me with 2nd degree burns on 12% of my body. After using this for just 10 days, the difference is unbelievable. I'm currently at 184 pounds, walking 4 miles a day and working out 4 days a week. I've lost 34lbs in 4 weeks with the weight loss / lean muscle protocol!",
      result: "34 lbs lost in 4 weeks",
      avatar: "SD"
    },
    {
      name: "Chris",
      location: "",
      quote: "I have been working with Jason for 60 days and he gave me a peptide protocol for me, really centered around longevity, energy levels, and putting on muscle/leaning down. Jason was fantastic and continues to be fantastic!",
      result: "60-day transformation",
      avatar: "C"
    },
    {
      name: "Kira H.",
      location: "Tooele, Utah",
      quote: "I have Hashimotos and PCOS. I was stuck at the 14-pound mark for months. Jason encouraged me to try a lower dose at a fraction of the cost. I have steadily lost a total of 31 pounds, and the inflammation is gone from the Hashimotos. For the first time in years, I am able to get through a full day without napping or dragging.",
      result: "31 lbs lost, inflammation gone",
      avatar: "KH"
    },
    {
      name: "Client Testimonial",
      location: "",
      quote: "Jason cares about my health more than me some days! He is passionate! Thanks to his encouragement and planning, I have seen encouraging results. This is the sixth week of work, and I have lost 16 lbs. of fat and gained 5 lbs. of muscle. I feel good and look better than I have in years.",
      result: "-16 lbs fat, +5 lbs muscle in 6 weeks",
      avatar: "CT"
    }
  ];

  // Add noindex meta tag to prevent search engine indexing
  useEffect(() => {
    // Create meta robots tag
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(metaRobots);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSelectMethod={handlePaymentMethodSelect}
        programName={selectedProgram?.name || ''}
        price={selectedProgram?.price || ''}
      />

      {/* Header */}
      <section className="py-12 md:py-20 px-4 border-b border-white/10">
        <div className="container max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
            Coaching <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">& Programs</span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
            Transform your health with our expert-led coaching programs and peptide protocols. Choose the program that fits your goals.
          </p>
        </div>
      </section>

      {/* Main Programs Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Signature Programs</h2>
            <p className="text-slate-400">Comprehensive coaching packages with peptide support</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {programs.map((program) => {
              const Icon = program.icon;
              return (
                <Card key={program.id} className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all group overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${program.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{program.includes}</Badge>
                    </div>
                    <CardTitle className="text-xl text-white">{program.title}</CardTitle>
                    <CardDescription className="text-slate-400 mt-2">{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-white mb-1">{program.price}</div>
                      <p className="text-sm text-slate-400">per program</p>
                    </div>
                    <div className="space-y-3 mb-6">
                      {program.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:from-amber-500 hover:to-orange-600"
                      onClick={() => handleEnroll(program.title, program.price)}
                    >
                      Enroll Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-slate-800/50 to-slate-900/50 border-t border-white/10">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Success Stories</h2>
            <p className="text-slate-400">Real results from real clients who transformed their health</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      {testimonial.location && <p className="text-sm text-slate-400">{testimonial.location}</p>}
                      <Badge className="mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        {testimonial.result}
                      </Badge>
                    </div>
                  </div>

                  <div className="relative">
                    <Quote className="absolute -top-2 -left-2 w-8 h-8 text-amber-500/20" />
                    <p className="text-slate-300 text-sm leading-relaxed pl-4 italic">
                      "{testimonial.quote}"
                    </p>
                  </div>

                  <div className="flex items-center gap-1 mt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
              onClick={() => window.open('https://omegalongevity.com/success-stories/', '_blank')}
            >
              View More Success Stories
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* External Programs Section */}
      <section className="py-12 md:py-20 px-4 border-t border-white/10">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Advanced Training</h2>
            <p className="text-slate-400">Professional development and transformation programs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {externalPrograms.map((program) => {
              const Icon = program.icon;
              return (
                <Card key={program.id} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all group">
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-br ${program.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg text-white">{program.title}</CardTitle>
                    <CardDescription className="text-slate-400 mt-2">{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-400 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-600"
                      onClick={() => window.open(program.url, '_blank')}
                    >
                      Learn More
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Learning Section - Peptide Masterclass */}
      <section className="py-12 md:py-20 px-4 bg-slate-800/30 border-t border-white/10">
        <div className="container max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Learning & Mastery</h2>
            <p className="text-slate-400">Deepen your knowledge with our comprehensive courses</p>
          </div>

          <Card className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-violet-500/30 hover:border-violet-500/50 transition-all overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">Featured Course</Badge>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Peptide Masterclass</h3>

                <p className="text-slate-300 mb-6">
                  Master the science and application of peptides with our comprehensive masterclass. Learn from industry experts including Jason Kidman and Dr. Scott Mortenson as they cover everything from weight loss and muscle gain to anti-aging, immunity, and longevity optimization.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300"><strong>12+ Sections</strong> covering all aspects of peptide therapy</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300"><strong>Expert Instructors</strong> including Dr. Scott Mortenson & Lane Kennedy</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300"><strong>Topics Include:</strong> Weight Loss, Anti-Aging, Immunity, Recovery, Hormones, and more</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300"><strong>Included with Omega Elite</strong> or available for individual purchase</span>
                  </div>
                </div>

                <Button
                  className="bg-gradient-to-r from-violet-400 to-purple-500 text-white hover:from-violet-500 hover:to-purple-600"
                  onClick={() => handleEnroll('Peptide Masterclass', 'Included with Omega Elite')}
                >
                  Enroll in Masterclass
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="p-8 bg-gradient-to-b from-violet-500/10 to-transparent flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-violet-400 mb-2">12+</div>
                  <p className="text-slate-300 mb-6">Comprehensive Sections</p>

                  <div className="space-y-4 text-left">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Access Level</p>
                      <p className="text-white font-semibold">Omega Elite Members</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Also Available</p>
                      <p className="text-white font-semibold">Omega Free Community</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4 border-t border-white/10">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Transform Your Health?</h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of people who have optimized their health with our coaching programs and peptide protocols.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:from-amber-500 hover:to-orange-600"
              onClick={() => window.location.href = '/peptide-cheat-sheet'}
            >
              View Peptide Reference
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
              onClick={() => window.location.href = '/orders'}
            >
              View Order History
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
