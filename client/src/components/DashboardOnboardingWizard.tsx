import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  ThumbsUp, 
  ExternalLink,
  Check,
  Rocket,
  Play,
  Trophy,
  ShoppingCart,
  Wrench,
  GraduationCap,
  Heart,
  Users,
  Clipboard,
  Smartphone,
  FileText,
  Mic,
  Dna,
  Scale,
} from "lucide-react";

interface DashboardOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (selectedOptionIds: number[]) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  "shopping-cart": ShoppingCart,
  tools: Wrench,
  "graduation-cap": GraduationCap,
  star: Star,
  heart: Heart,
  rocket: Rocket,
  users: Users,
  clipboard: Clipboard,
  phone: Smartphone,
  file: FileText,
  podcast: Mic,
  dna: Dna,
  scale: Scale,
};

export function DashboardOnboardingWizard({ isOpen, onClose, onComplete }: DashboardOnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  
  const { data: onboardingData, isLoading } = trpc.onboarding.getFullData.useQuery();
  
  const settings = onboardingData?.settings;
  const categories = onboardingData?.categories || [];
  const options = onboardingData?.options || [];
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedOptions([]);
    }
  }, [isOpen]);
  
  const toggleOption = (optionId: number) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };
  
  const handleComplete = () => {
    onComplete(selectedOptions);
    onClose();
  };
  
  const getSelectedOptionsData = () => {
    return options.filter((opt: { id: number }) => selectedOptions.includes(opt.id));
  };
  
  const getBadgeColor = (color: string | null) => {
    switch (color) {
      case "orange": return "bg-orange-500 hover:bg-orange-600";
      case "green": return "bg-green-500 hover:bg-green-600";
      case "blue": return "bg-blue-500 hover:bg-blue-600";
      case "purple": return "bg-purple-500 hover:bg-purple-600";
      case "red": return "bg-red-500 hover:bg-red-600";
      default: return "";
    }
  };
  
  const getCategoryIcon = (iconName: string | null) => {
    if (!iconName) return Trophy;
    return iconMap[iconName] || Trophy;
  };
  
  if (isLoading || !settings) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Enhanced Progress indicator with labels and progress bar */}
        <div className="p-4 border-b bg-muted/30 space-y-3">
          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>
          
          {/* Step indicators with labels */}
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: "Welcome" },
              { num: 2, label: "Select Goals" },
              { num: 3, label: "Your Plan" },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium transition-colors ${
                  step >= s.num ? "text-primary" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Steps remaining indicator */}
          <p className="text-center text-xs text-muted-foreground">
            Step {step} of 3 {step < 3 && `• ${3 - step} step${3 - step > 1 ? "s" : ""} remaining`}
          </p>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  {settings.welcomeTitle || "Welcome to Omega Longevity"}
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  {settings.welcomeSubtitle || "Let's find the perfect path for your health optimization journey"}
                </p>
              </div>
              
              {/* Video embed area */}
              {settings.videoUrl ? (
                <div className="aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={settings.videoUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : settings.videoPlaceholderText ? (
                <div className="aspect-video max-w-2xl mx-auto rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">{settings.videoPlaceholderText}</p>
                  </div>
                </div>
              ) : null}
              
              <div className="text-center">
                <Button size="lg" onClick={() => setStep(2)} className="px-8">
                  {settings.ctaButtonText || "Let's Get Started"} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Selection */}
          {step === 2 && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  {settings.stepTwoTitle || "What brings you here today?"}
                </h2>
                <p className="text-muted-foreground">
                  {settings.stepTwoSubtitle || "Select all that apply - many clients combine multiple options"}
                </p>
              </div>
              
              <div className="space-y-8">
                {categories
                  .filter(cat => cat.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => {
                    const CategoryIcon = getCategoryIcon(category.icon);
                    const categoryOptions = options
                      .filter((opt: { categoryId: number; isActive: boolean }) => opt.categoryId === category.id && opt.isActive)
                      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);
                    
                    if (categoryOptions.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          {category.description && (
                            <span className="text-sm text-muted-foreground">({category.description})</span>
                          )}
                        </div>
                        
                        <div className="grid gap-3 md:grid-cols-2">
                          {categoryOptions.map((option) => {
                            const isSelected = selectedOptions.includes(option.id);
                            const OptionIcon = getCategoryIcon(option.icon);
                            
                            return (
                              <Card 
                                key={option.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                                }`}
                                onClick={() => toggleOption(option.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <Checkbox 
                                      checked={isSelected}
                                      className="mt-1"
                                      onClick={(e) => e.stopPropagation()}
                                      onCheckedChange={() => toggleOption(option.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{option.title}</span>
                                        {option.isPopular && (
                                          <Badge className="bg-orange-500 text-xs">
                                            <Star className="h-3 w-3 mr-1" /> Popular
                                          </Badge>
                                        )}
                                        {option.isRecommended && (
                                          <Badge className="bg-green-500 text-xs">
                                            <ThumbsUp className="h-3 w-3 mr-1" /> Recommended
                                          </Badge>
                                        )}
                                        {option.badge && (
                                          <Badge className={`text-xs ${getBadgeColor(option.badgeColor)}`}>
                                            {option.badge}
                                          </Badge>
                                        )}
                                      </div>
                                      {option.ctaText && (
                                        <p className="text-sm text-muted-foreground mt-1">{option.ctaText}</p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold">
                  {settings.stepThreeTitle || "Here's your action plan"}
                </h2>
                <p className="text-muted-foreground">
                  {selectedOptions.length > 0 
                    ? `You've selected ${selectedOptions.length} option${selectedOptions.length > 1 ? "s" : ""}. Here are your next steps:`
                    : "You haven't selected any options yet. Go back to explore what we offer!"}
                </p>
              </div>
              
              {selectedOptions.length > 0 ? (
                <div className="space-y-3 max-w-2xl mx-auto">
                  {getSelectedOptionsData().map((option, index) => (
                    <Card key={option.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{option.title}</p>
                            {option.ctaText && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{option.ctaText}</p>
                            )}
                          </div>
                        </div>
                        {option.linkUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (option.linkType === "external") {
                                window.open(option.linkUrl!, "_blank");
                              } else {
                                window.location.href = option.linkUrl!;
                              }
                            }}
                          >
                            Go <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Go Back and Explore
                  </Button>
                </div>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Questions? Email us at support@omegalongevity.com</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer navigation */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Skip for now
            </Button>
            {step === 2 && (
              <Button onClick={() => setStep(3)} disabled={selectedOptions.length === 0}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleComplete}>
                Done <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component for persistent access
export function OnboardingTriggerButton({ onClick }: { onClick: () => void }) {
  const { data: settings } = trpc.onboarding.getSettings.useQuery();
  
  if (!settings?.isActive) return null;
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick}
      className="gap-2"
    >
      <Rocket className="h-4 w-4" />
      <span className="hidden sm:inline">{settings.persistentButtonText || "Get Started Guide"}</span>
    </Button>
  );
}
