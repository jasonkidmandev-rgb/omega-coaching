import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ShieldCheck } from "lucide-react";

const AGE_VERIFIED_KEY = "omega_age_verified";

interface AgeDisclaimerProps {
  onAccept: () => void;
}

export function AgeDisclaimer({ onAccept }: AgeDisclaimerProps) {
  const handleAccept = () => {
    // Store in localStorage - persists across browser sessions
    localStorage.setItem(AGE_VERIFIED_KEY, "true");
    onAccept();
  };

  const handleDecline = () => {
    // Redirect to age restriction explanation page
    window.location.href = "/age-restricted";
  };

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white border-gray-200 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-orange-100 rounded-full">
              <ShieldCheck className="h-10 w-10 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#1e3a5f]">Age Verification Required</CardTitle>
          <CardDescription className="text-gray-600 text-base mt-2">
            This website contains content related to health optimization, peptides, and supplements that is intended for adults only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-amber-700 mb-1">Important Notice</p>
                <p>
                  By entering this site, you confirm that you are at least 18 years of age and agree to our terms of service. The information provided is for educational purposes only and should not be considered medical advice.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-[#1e3a5f] mb-2">
              Are you 18 years of age or older?
            </p>
            <p className="text-sm text-gray-600">
              You must be of legal age to access this website.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAccept}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold"
            >
              Yes, I am 18+
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1 border-[#1e3a5f] text-[#1e3a5f] hover:bg-gray-100 py-6 text-lg"
            >
              No, Exit
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By clicking "Yes, I am 18+", you agree to our{" "}
            <a href="/terms" className="text-orange-500 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to check age verification status
export function useAgeVerification() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  // Check if age disclaimer is enabled in settings
  const { data: settingEnabled, isLoading: settingLoading } = trpc.settings.get.useQuery({ key: "age_disclaimer_enabled" });

  useEffect(() => {
    // Wait for setting to load
    if (settingLoading) return;

    // Check if feature is enabled (default to true if not set)
    const enabled = settingEnabled !== "false";
    setIsEnabled(enabled);

    if (!enabled) {
      setIsVerified(true);
      return;
    }

    // Check localStorage - this is all we need
    const localVerified = localStorage.getItem(AGE_VERIFIED_KEY) === "true";
    setIsVerified(localVerified);
  }, [settingEnabled, settingLoading]);

  const markVerified = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, "true");
    setIsVerified(true);
  };

  return { isVerified, isLoading: isVerified === null, markVerified };
}
