import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, CheckCircle, AlertCircle, Send, ChevronRight, ChevronLeft,
  Smile, Frown, Meh, Camera, Scale
} from "lucide-react";
import { format } from "date-fns";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  type: 'scale' | 'text' | 'checkbox';
  required: boolean;
  order: number;
}

interface Response {
  questionId: string;
  scaleValue?: number | null;
  textValue?: string;
  booleanValue?: boolean;
}

export default function ClientCheckin() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const checkinId = parseInt(params.id || "0");
  
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch check-in details
  const { data: checkin, isLoading, error } = trpc.checkin.getForClient.useQuery({ id: checkinId });
  
  // Submit mutation
  const submitMutation = trpc.checkin.submit.useMutation({
    onSuccess: () => {
      toast.success("Check-in submitted successfully!");
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit check-in");
      setIsSubmitting(false);
    }
  });
  
  // Initialize responses when questions load
  useEffect(() => {
    if (checkin?.questions) {
      const initialResponses = (checkin.questions as Question[]).map(q => ({
        questionId: q.id,
        scaleValue: q.type === 'scale' ? null : undefined,
        textValue: q.type === 'text' ? '' : undefined,
        booleanValue: q.type === 'checkbox' ? false : undefined,
      }));
      setResponses(initialResponses);
    }
  }, [checkin]);
  
  const questions = (checkin?.questions as Question[]) || [];
  const currentQuestion = questions[currentStep];
  const currentResponse = responses[currentStep];
  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;
  
  const updateResponse = (value: number | string | boolean) => {
    const newResponses = [...responses];
    if (currentQuestion.type === 'scale') {
      newResponses[currentStep] = { ...newResponses[currentStep], scaleValue: value as number };
    } else if (currentQuestion.type === 'text') {
      newResponses[currentStep] = { ...newResponses[currentStep], textValue: value as string };
    } else if (currentQuestion.type === 'checkbox') {
      newResponses[currentStep] = { ...newResponses[currentStep], booleanValue: value as boolean };
    }
    setResponses(newResponses);
  };
  
  const canProceed = () => {
    if (!currentQuestion || !currentResponse) return false;
    if (!currentQuestion.required) return true;
    
    if (currentQuestion.type === 'scale') {
      return currentResponse.scaleValue !== undefined && currentResponse.scaleValue !== null;
    } else if (currentQuestion.type === 'text') {
      return (currentResponse.textValue || '').trim().length > 0;
    } else if (currentQuestion.type === 'checkbox') {
      return true; // Checkbox is always valid (can be false)
    }
    return false;
  };
  
  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = () => {
    setIsSubmitting(true);
    const questionsData = checkin?.questions as Question[] || [];
    submitMutation.mutate({
      checkinId,
      responses: responses.map((r, idx) => {
        const q = questionsData[idx];
        return {
          questionId: r.questionId,
          questionText: q?.text || '',
          questionType: q?.type || 'text',
          scaleValue: r.scaleValue ?? undefined,
          textValue: r.textValue,
          booleanValue: r.booleanValue,
        };
      }),
    });
  };
  
  const getScoreEmoji = (score: number) => {
    if (score <= 3) return <Frown className="h-8 w-8 text-red-500" />;
    if (score <= 6) return <Meh className="h-8 w-8 text-yellow-500" />;
    return <Smile className="h-8 w-8 text-green-500" />;
  };
  
  const getScoreColor = (score: number) => {
    if (score <= 3) return "bg-red-500";
    if (score <= 6) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !checkin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Check-in Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This check-in may have expired or doesn't exist.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkin.status === 'submitted' || checkin.status === 'reviewed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Already Submitted</h2>
            <p className="text-muted-foreground mb-4">
              You've already completed this check-in. Thank you!
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6 text-orange-500" />
                Weekly Check-in
              </CardTitle>
              <CardDescription>
                {checkin.sentAt ? format(new Date(checkin.sentAt), 'MMMM d, yyyy') : 'This week'}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {currentStep + 1} of {questions.length}
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question */}
              <div className="space-y-2">
                <Label className="text-lg font-medium">
                  {currentQuestion.text}
                  {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
              </div>
              
              {/* Scale Input */}
              {currentQuestion.type === 'scale' && currentResponse && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    {currentResponse.scaleValue != null ? (
                      getScoreEmoji(currentResponse.scaleValue)
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Meh className="h-8 w-8 text-muted-foreground/40" />
                        <span className="text-sm text-muted-foreground animate-pulse">Please select your rating below</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Number buttons - primary input method */}
                    <div className="flex justify-center gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <Button
                          key={num}
                          variant={currentResponse.scaleValue === num ? "default" : "outline"}
                          size="sm"
                          className={`w-10 h-10 text-base font-semibold ${
                            currentResponse.scaleValue === num 
                              ? getScoreColor(num) + ' text-white ring-2 ring-offset-2 ring-offset-background' 
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => updateResponse(num)}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground px-1">
                      <span>1 - Poor</span>
                      <span>10 - Excellent</span>
                    </div>

                    {/* Show selected value prominently */}
                    <div className="text-center">
                      {currentResponse.scaleValue != null ? (
                        <span className={`text-4xl font-bold ${
                          currentResponse.scaleValue <= 3 ? 'text-red-500' :
                          currentResponse.scaleValue <= 6 ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {currentResponse.scaleValue}/10
                        </span>
                      ) : (
                        <div className="py-2">
                          <span className="text-lg text-muted-foreground/50 font-medium">No rating selected</span>
                        </div>
                      )}
                    </div>

                    {/* Slider only appears after a value is selected, for fine-tuning */}
                    {currentResponse.scaleValue != null && (
                      <Slider
                        value={[currentResponse.scaleValue]}
                        onValueChange={([value]) => updateResponse(value)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              )}
              
              {/* Text Input */}
              {currentQuestion.type === 'text' && currentResponse && (
                <Textarea
                  value={currentResponse.textValue || ''}
                  onChange={(e) => updateResponse(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className="resize-none"
                />
              )}
              
              {/* Checkbox Input */}
              {currentQuestion.type === 'checkbox' && currentResponse && (
                <div className="flex items-center space-x-3 p-4 rounded-lg border bg-card">
                  <Checkbox
                    id={currentQuestion.id}
                    checked={currentResponse.booleanValue || false}
                    onCheckedChange={(checked) => updateResponse(checked as boolean)}
                    className="h-6 w-6"
                  />
                  <Label 
                    htmlFor={currentQuestion.id} 
                    className="text-base cursor-pointer flex items-center gap-2"
                  >
                    {currentQuestion.text.includes('photo') && <Camera className="h-5 w-5 text-orange-500" />}
                    {currentQuestion.text.includes('metric') && <Scale className="h-5 w-5 text-orange-500" />}
                    Yes, I did this week
                  </Label>
                </div>
              )}
            </div>
          )}
          
          {/* Weekly Reminder */}
          {currentStep === questions.length - 1 && (
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm text-orange-400">
                <strong>Weekly Recommendation:</strong> If you're including "Lean Muscle / Weight Loss" in your protocol, 
                we highly recommend taking progress photos and doing regular body scans for body fat % to track your physical transformation.
              </p>
            </div>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < questions.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Check-in
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-4">
            {questions.map((q, idx) => {
              // Check if all previous required questions have been answered
              const canJumpTo = idx <= currentStep || (() => {
                for (let i = 0; i < idx; i++) {
                  const prevQ = questions[i];
                  const prevR = responses[i];
                  if (!prevQ?.required) continue;
                  if (prevQ.type === 'scale' && (prevR?.scaleValue === undefined || prevR?.scaleValue === null)) return false;
                  if (prevQ.type === 'text' && !(prevR?.textValue || '').trim()) return false;
                }
                return true;
              })();
              return (
                <button
                  key={idx}
                  onClick={() => canJumpTo && setCurrentStep(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'bg-orange-500 w-6' 
                      : idx < currentStep 
                        ? 'bg-green-500' 
                        : canJumpTo ? 'bg-slate-600' : 'bg-slate-600/30'
                  } ${!canJumpTo ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
