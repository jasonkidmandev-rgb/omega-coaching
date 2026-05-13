import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { IntakeFormWizard } from "@/components/IntakeFormWizard";
import {
  ClipboardList,
  Shield,
  CheckCircle2,
  ArrowRight,
  Heart,
  Loader2,
} from "lucide-react";

export default function IntakeLanding() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Hidden honeypot field
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const createEnrollment = trpc.transformation.createDirectEnrollment.useMutation();

  const handleStart = async () => {
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      const result = await createEnrollment.mutateAsync({
        email: email.trim(),
        name: name.trim(),
        tier: "flagship",
        programType: "90_day_transformation",
        website: honeypot, // Honeypot - should always be empty for real users
      });
      if (result.success) {
        setEnrollmentId(result.enrollmentId);
        if (result.existingEnrollment) {
          toast.info("Welcome back! Resuming your intake form.");
        } else {
          toast.success("Let's get started with your intake form!");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleComplete = () => {
    setIsComplete(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Success state
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1f3d] to-[#0a1628] flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-white/5 border-green-500/30 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Intake Form Complete!
              </h2>
              <p className="text-slate-300 text-lg">
                Thank you, {name}! Your intake form and waiver have been submitted successfully.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-slate-300 text-sm">
                <strong className="text-white">What happens next:</strong>
              </p>
              <ul className="text-slate-400 text-sm space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  Your coach will review your intake information
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  You'll receive a follow-up email with next steps
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  Your personalized protocol journey begins soon
                </li>
              </ul>
            </div>
            <p className="text-slate-500 text-xs">
              You can close this page. If you have questions, reach out to your coach directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Intake form step
  if (enrollmentId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1f3d] to-[#0a1628]">
        {/* Header */}
        <div className="bg-[#0a1628]/80 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/omega-longevity-logo.png"
                alt="Omega Longevity"
                className="h-8"
              />
              <span className="text-slate-400 text-sm hidden sm:inline">
                Client Intake Form
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="hidden sm:inline">Secure & Confidential</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <p className="text-slate-400 text-sm">
              Completing this form for: <strong className="text-white">{name}</strong> ({email})
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <IntakeFormWizard
                enrollmentId={enrollmentId}
                userName={name}
                userEmail={email}
                onComplete={handleComplete}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landing / info collection step
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1f3d] to-[#0a1628]">
      {/* Header */}
      <div className="bg-[#0a1628]/80 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center">
          <img
            src="/omega-longevity-logo.png"
            alt="Omega Longevity"
            className="h-10"
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
            <ClipboardList className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Client Intake Form
          </h1>
          <p className="text-slate-300 text-lg max-w-lg mx-auto">
            Complete your health intake form and waiver to get started with your personalized peptide protocol.
          </p>
        </div>

        {/* What to expect */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-slate-700/50 rounded-xl p-4 text-center">
            <ClipboardList className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Health History</p>
            <p className="text-slate-400 text-xs mt-1">Medical background & goals</p>
          </div>
          <div className="bg-white/5 border border-slate-700/50 rounded-xl p-4 text-center">
            <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Lifestyle & Wellness</p>
            <p className="text-slate-400 text-xs mt-1">Diet, exercise & sleep habits</p>
          </div>
          <div className="bg-white/5 border border-slate-700/50 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Waiver & Consent</p>
            <p className="text-slate-400 text-xs mt-1">Digital signature required</p>
          </div>
        </div>

        {/* Form card */}
        <Card className="bg-white/5 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">
              Enter Your Information to Begin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300 font-medium">Full Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 h-12"
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("intake-email")?.focus()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300 font-medium">Email Address</label>
              <Input
                id="intake-email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 h-12"
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
            </div>
            {/* Honeypot field - hidden from humans, bots will fill it */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <Button
              onClick={handleStart}
              disabled={createEnrollment.isPending || !name.trim() || !email.trim()}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg"
            >
              {createEnrollment.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Begin Intake Form
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            <p className="text-slate-500 text-xs text-center">
              Your information is kept secure and confidential. Auto-save is enabled — you can return to finish later.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-500 text-xs pb-8">
          <p>&copy; {new Date().getFullYear()} Omega Longevity. All rights reserved.</p>
          <p className="mt-1">
            Questions? Contact your coach directly.
          </p>
        </div>
      </div>
    </div>
  );
}
