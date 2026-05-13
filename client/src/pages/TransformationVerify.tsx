import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, LogIn } from "lucide-react";

export default function TransformationVerify() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  // Parse query params manually
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  const enrollmentId = params.get("enrollmentId");
  
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "valid" | "invalid" | "expired">("loading");
  const [enrollmentData, setEnrollmentData] = useState<any>(null);

  const verifyToken = trpc.transformation.verifyAuthToken.useQuery(
    { authToken: token || "", enrollmentId: parseInt(enrollmentId || "0") },
    { 
      enabled: !!token && !!enrollmentId,
      retry: false,
    }
  );

  useEffect(() => {
    if (verifyToken.isLoading) {
      setVerificationStatus("loading");
    } else if (verifyToken.isError) {
      const errorMessage = verifyToken.error?.message || "";
      if (errorMessage.includes("expired")) {
        setVerificationStatus("expired");
      } else {
        setVerificationStatus("invalid");
      }
    } else if (verifyToken.data) {
      setVerificationStatus("valid");
      setEnrollmentData(verifyToken.data);
      sessionStorage.setItem("transformationAuthToken", token || "");
      sessionStorage.setItem("transformationEnrollmentId", enrollmentId || "");
      sessionStorage.setItem("transformationClientName", verifyToken.data.clientName || "");
      sessionStorage.setItem("transformationClientEmail", verifyToken.data.email || "");
      sessionStorage.setItem("transformationTier", verifyToken.data.tier || "");
    }
  }, [verifyToken.isLoading, verifyToken.isError, verifyToken.data, token, enrollmentId]);

  // Check if this is an auto-intake redirect from the intake form email
  const autoIntake = params.get("autoIntake") === "true";
  
  const handleSignIn = () => {
    const returnUrl = `/intake?enrollmentId=${enrollmentId}${autoIntake ? '&openIntake=true' : ''}`;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnUrl)}`;
  };
  
  // If autoIntake and token is valid, redirect to journey directly
  useEffect(() => {
    if (autoIntake && verificationStatus === 'valid' && enrollmentData) {
      sessionStorage.setItem('programTier', enrollmentData.tier || 'flagship');
      // Redirect to intake form
      setLocation(`/intake?openIntake=true`);
    }
  }, [autoIntake, verificationStatus, enrollmentData]);

  const tierNames: Record<string, string> = {
    elite: "Elite Longevity Program",
    flagship: "90-Day Transformation Program",
    essentials: "Protocol Essentials Program",
  };

  if (!token || !enrollmentId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">Invalid Link</CardTitle>
            <CardDescription>
              This verification link is missing required information.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/")} variant="outline">Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <CardTitle className="text-2xl">Verifying Your Link</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "expired") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-amber-600">Link Expired</CardTitle>
            <CardDescription>
              This verification link has expired. Please contact support@omegalongevity.com.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationStatus === "invalid") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">Invalid Link</CardTitle>
            <CardDescription>
              This link is invalid or already used. Please sign in if you have an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleSignIn} className="w-full">
              <LogIn className="w-4 h-4 mr-2" />Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-600">Verification Successful!</CardTitle>
          <CardDescription className="text-base">
            Welcome, {enrollmentData?.clientName}! Your enrollment in the{" "}
            <strong>{tierNames[enrollmentData?.tier] || "Transformation Program"}</strong> has been verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Complete Your Account Setup</h3>
            <p className="text-sm text-blue-700 mb-4">
              Sign in or create your account to access your program dashboard.
            </p>
            <p className="text-xs text-blue-600">
              Use your email ({enrollmentData?.email}) to sign in or create your account.
            </p>
          </div>
          <Button onClick={handleSignIn} className="w-full h-12 text-lg" size="lg">
            <LogIn className="w-5 h-5 mr-2" />Continue to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
