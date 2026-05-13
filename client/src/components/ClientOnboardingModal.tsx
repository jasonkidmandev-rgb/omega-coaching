import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  BookOpen,
  Users,
  Calendar,
  Crown,
  GraduationCap,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Heart,
  Target,
  Clock,
} from "lucide-react";

interface ClientOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onPathSelected?: (path: string) => void;
  isReturningClient?: boolean;
}

type OnboardingStep = "welcome" | "path-selection" | "ready-options" | "learn-options" | "complete";

interface PathOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  link?: string;
  price?: string;
  features?: string[];
  recommended?: boolean;
}

export function ClientOnboardingModal({
  isOpen,
  onClose,
  clientName,
  onPathSelected,
  isReturningClient = false,
}: ClientOnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("welcome");
      setSelectedPath(null);
    }
  }, [isOpen]);

  const handlePathSelect = (path: "ready" | "learn") => {
    setSelectedPath(path);
    if (path === "ready") {
      setStep("ready-options");
    } else {
      setStep("learn-options");
    }
  };

  const handleOptionSelect = (optionId: string, link?: string) => {
    if (onPathSelected) {
      onPathSelected(optionId);
    }
    if (link) {
      window.open(link, "_blank");
    }
    setStep("complete");
  };

  const handleComplete = () => {
    onClose();
  };

  const readyOptions: PathOption[] = [
    {
      id: "omega-elite",
      title: "Join Omega Elite Community",
      description: "Full access to our premium community with exclusive content, live calls, and direct coach support.",
      icon: <Crown className="h-6 w-6 text-yellow-500" />,
      badge: "Most Popular",
      badgeColor: "bg-yellow-500",
      price: "$69/month",
      link: "https://members.omegalongevity.com/offers/4Yt9HXKq/checkout",
      features: [
        "Weekly live Q&A calls",
        "Private community access",
        "Exclusive protocols & guides",
        "Direct coach messaging",
      ],
      recommended: true,
    },
    {
      id: "intro-session",
      title: "Intro Session",
      description: "A focused 20-minute call to discuss your goals, answer questions, and determine the best path forward.",
      icon: <Calendar className="h-6 w-6 text-blue-500" />,
      badge: "New Clients",
      badgeColor: "bg-blue-500",
      price: "$125",
      link: "https://outlook.office365.com/book/OmegaLongevity@omegalongevity.com/",
      features: [
        "20-minute video call",
        "Goal assessment",
        "Program recommendations",
        "Get to know your coach",
      ],
    },
    {
      id: "consulting-session",
      title: "1:1 Consulting Session",
      description: "Book a personalized 60-minute consultation to discuss your protocol, goals, and get expert guidance.",
      icon: <Clock className="h-6 w-6 text-green-500" />,
      price: "$350",
      link: "https://outlook.office365.com/book/OmegaLongevity@omegalongevity.com/",
      features: [
        "60-minute video call",
        "Protocol review",
        "Personalized recommendations",
        "Follow-up notes",
      ],
    },
    {
      id: "coaching-package",
      title: "Full Coaching Package",
      description: "Comprehensive transformation programs for serious results.",
      icon: <GraduationCap className="h-6 w-6 text-purple-500" />,
      badge: "Best Value",
      badgeColor: "bg-purple-500",
      price: "From $1,000",
      link: "/launchpad",
      features: [
        "90-day programs available",
        "Weekly check-ins",
        "Custom protocol design",
        "Priority support",
      ],
    },
  ];

  const learnOptions: PathOption[] = [
    {
      id: "omega-free",
      title: "Join Omega Free Community",
      description: "Access a curated selection of our content to explore at your own pace. No coaching or direct support included.",
      icon: <Users className="h-6 w-6 text-gray-500" />,
      badge: "Free",
      badgeColor: "bg-gray-500",
      price: "Free",
      link: "https://members.omegalongevity.com/communities/groups/omega-community-group/home?invite=696677813b1c41527c43be87",
      features: [
        "Community discussions",
        "Basic educational content",
        "Self-paced learning",
        "Upgrade anytime",
      ],
    },
    {
      id: "podcast",
      title: "Omega Life Podcast",
      description: "Listen to in-depth discussions on health optimization, peptides, and longevity.",
      icon: <BookOpen className="h-6 w-6 text-orange-500" />,
      link: "https://www.youtube.com/playlist?list=PLbcT9dLPNS9Tn0qFZMjVvJqPJPZqPJPZq",
      features: [
        "Expert interviews",
        "Protocol deep-dives",
        "Success stories",
        "Latest research",
      ],
    },
    {
      id: "review-protocol",
      title: "Review Your Protocol",
      description: "Take your time to review the personalized protocol we've prepared for you.",
      icon: <Target className="h-6 w-6 text-blue-500" />,
      features: [
        "Detailed recommendations",
        "Dosing schedules",
        "Product information",
        "Ask questions anytime",
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Welcome Step */}
        {step === "welcome" && (
          <>
            <DialogHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full w-fit">
                <Sparkles className="h-8 w-8 text-orange-600" />
              </div>
              <DialogTitle className="text-2xl">
                {isReturningClient ? `Welcome Back, ${clientName}!` : `Welcome to Omega Longevity, ${clientName}!`}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {isReturningClient 
                  ? "Great to see you again! Your updated protocol is ready. Let's continue your health optimization journey."
                  : "We're excited to have you here. Your personalized health protocol is ready for review. Let's get you started on the right path."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-blue-600" />
                  What's Next?
                </h3>
                <p className="text-sm text-blue-800">
                  We've prepared a customized protocol based on your health goals. 
                  You can review it at any time, ask questions, and when you're ready, 
                  choose how you'd like to move forward.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Card 
                  className="cursor-pointer hover:border-orange-400 hover:shadow-md transition-all group"
                  onClick={() => handlePathSelect("ready")}
                >
                  <CardContent className="p-4 text-center">
                    <div className="mx-auto mb-3 p-2 bg-orange-100 rounded-full w-fit group-hover:bg-orange-200 transition-colors">
                      <Rocket className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {isReturningClient ? "Continue Your Journey" : "Ready to Get Started"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isReturningClient 
                        ? "Upgrade your membership, schedule a follow-up, or explore new programs"
                        : "Join our community, schedule a call, or start a coaching program"
                      }
                    </p>
                    <Button variant="ghost" size="sm" className="mt-3 text-orange-600">
                      View Options <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                  onClick={() => handlePathSelect("learn")}
                >
                  <CardContent className="p-4 text-center">
                    <div className="mx-auto mb-3 p-2 bg-blue-100 rounded-full w-fit group-hover:bg-blue-200 transition-colors">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Learn More First</h3>
                    <p className="text-sm text-muted-foreground">
                      Explore free resources and review your protocol at your own pace
                    </p>
                    <Button variant="ghost" size="sm" className="mt-3 text-blue-600">
                      View Options <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Ready to Start Options */}
        {step === "ready-options" && (
          <>
            <DialogHeader className="pb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2 -ml-2"
                onClick={() => setStep("welcome")}
              >
                ← Back
              </Button>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Rocket className="h-5 w-5 text-orange-600" />
                Ready to Get Started
              </DialogTitle>
              <DialogDescription>
                Choose the best option for your journey
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {readyOptions.map((option) => (
                <Card 
                  key={option.id}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    option.recommended ? "border-orange-300 bg-orange-50/50" : ""
                  }`}
                  onClick={() => handleOptionSelect(option.id, option.link)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${option.recommended ? "bg-orange-100" : "bg-gray-100"}`}>
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{option.title}</h3>
                          {option.badge && (
                            <Badge className={`${option.badgeColor} text-white text-xs`}>
                              {option.badge}
                            </Badge>
                          )}
                          {option.price && (
                            <span className="text-sm font-medium text-orange-600 ml-auto">
                              {option.price}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                        {option.features && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {option.features.slice(0, 3).map((feature, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Learn More Options */}
        {step === "learn-options" && (
          <>
            <DialogHeader className="pb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit mb-2 -ml-2"
                onClick={() => setStep("welcome")}
              >
                ← Back
              </Button>
              <DialogTitle className="text-xl flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Learn More First
              </DialogTitle>
              <DialogDescription>
                Take your time to explore and learn
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {learnOptions.map((option) => (
                <Card 
                  key={option.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => handleOptionSelect(option.id, option.link)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-gray-100">
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{option.title}</h3>
                          {option.badge && (
                            <Badge className={`${option.badgeColor} text-white text-xs`}>
                              {option.badge}
                            </Badge>
                          )}
                          {option.price && (
                            <span className="text-sm font-medium text-blue-600 ml-auto">
                              {option.price}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                        {option.features && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {option.features.slice(0, 3).map((feature, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="pt-2 border-t mt-4">
              <p className="text-sm text-center text-muted-foreground">
                You can always upgrade to coaching or Elite membership when you're ready.
              </p>
            </div>
          </>
        )}

        {/* Complete Step */}
        {step === "complete" && (
          <>
            <DialogHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-2xl">You're All Set!</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Great choice! You can now review your personalized protocol below.
                Feel free to ask questions using the discussion section.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-semibold text-green-900 mb-2">What to Do Next:</h3>
                <ul className="text-sm text-green-800 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Review your personalized protocol below
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Ask questions in the discussion section
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Approve your protocol when you're ready to proceed
                  </li>
                </ul>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                onClick={handleComplete}
              >
                View My Protocol
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
