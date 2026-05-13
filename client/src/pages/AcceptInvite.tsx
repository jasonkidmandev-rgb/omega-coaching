import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, Shield, UserPlus, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const utils = trpc.useUtils();

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    setToken(tokenParam);
  }, []);

  // Verify the invitation token
  const { data: inviteData, isLoading: isVerifying } = trpc.invitation.verify.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  // Check if user is already logged in
  const { data: authData } = trpc.auth.me.useQuery();

  // Accept invitation mutation
  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: (data) => {
      setAccepted(true);
      toast.success(`Invitation accepted! You now have ${data.role} access.`);
      setTimeout(() => {
        window.location.href = "/admin";
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept invitation");
      setIsSubmitting(false);
    },
  });

  // Pre-fill email from invitation
  useEffect(() => {
    if (inviteData?.valid && inviteData.email) {
      setEmail(inviteData.email);
    }
    if (inviteData?.valid && inviteData.name) {
      setName(inviteData.name);
    }
  }, [inviteData]);

  // If already logged in, auto-accept
  useEffect(() => {
    if (authData?.user && token && inviteData?.valid && !accepted && !isSubmitting) {
      setIsSubmitting(true);
      acceptMutation.mutate({ token });
    }
  }, [authData, token, inviteData, accepted]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsSubmitting(true);

    try {
      // First create the account
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        toast.error(signupData.error || "Signup failed");
        setIsSubmitting(false);
        return;
      }

      // Invalidate auth cache so we're logged in
      await utils.auth.me.invalidate();

      // Now accept the invitation
      toast.success("Account created! Accepting invitation...");
      acceptMutation.mutate({ token: token! });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setIsSubmitting(true);

    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        toast.error(loginData.error || "Login failed");
        setIsSubmitting(false);
        return;
      }

      // Invalidate auth cache so we're logged in
      await utils.auth.me.invalidate();

      // Now accept the invitation
      toast.success("Logged in! Accepting invitation...");
      acceptMutation.mutate({ token: token! });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Invalid Link</h2>
            <p className="text-slate-600 text-center mb-6">This invitation link appears to be invalid or incomplete.</p>
            <Button onClick={() => setLocation("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired token
  if (inviteData && !inviteData.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {inviteData.reason === "expired" ? "Invitation Expired" : 
               inviteData.reason === "already_used" ? "Invitation Already Used" : 
               "Invalid Invitation"}
            </h2>
            <p className="text-slate-600 text-center mb-6">
              {inviteData.reason === "expired" 
                ? "This invitation has expired. Please ask the administrator to send a new one."
                : inviteData.reason === "already_used"
                ? "This invitation has already been accepted. You can log in with your account."
                : "This invitation link is not valid. Please contact the administrator."}
            </p>
            <Button onClick={() => setLocation("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepted successfully
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome to the Team!</h2>
            <p className="text-slate-600 text-center mb-2">
              Your invitation has been accepted. You now have <strong>{inviteData?.role}</strong> access.
            </p>
            <p className="text-slate-500 text-sm">Redirecting to admin dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already logged in - auto-accepting
  if (authData?.user && isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Accepting invitation as {authData.user.email}...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show signup/login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join as <strong className="text-slate-900">{inviteData?.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData?.email && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                This invitation was sent to <strong>{inviteData.email}</strong>.
                {inviteData.name && <> Welcome, {inviteData.name}!</>}
              </AlertDescription>
            </Alert>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === "signup" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("signup")}
              type="button"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
            <Button
              variant={mode === "login" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("login")}
              type="button"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </div>

          <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "Create a password (min 8 chars)" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "signup" ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                mode === "signup" ? "Create Account & Join Team" : "Sign In & Accept Invitation"
              )}
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            {mode === "signup"
              ? "Already have an account? Click Sign In above."
              : "Don't have an account? Click Create Account above."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
