import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { HumanEdgeMark, Wordmark, AuroraBackground } from "@/components/HumanEdgeBrand";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();

  // Get returnTo from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const returnTo = urlParams.get("returnTo") || "/launchpad";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(`Too many attempts. Please try again in ${data.retryAfter || 15} minutes.`);
        } else {
          toast.error(data.error || "Invalid email or password");
        }
        setIsSubmitting(false);
        return;
      }

      toast.success(`Welcome back, ${data.user.name || ""}!`);

      // Invalidate auth cache and redirect
      await utils.auth.me.invalidate();

      // Redirect based on role
      if (data.user.role === "admin" || data.user.role === "manager") {
        window.location.href = returnTo === "/launchpad" ? "/admin" : returnTo;
      } else {
        window.location.href = returnTo;
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Signup failed");
        setIsSubmitting(false);
        return;
      }

      toast.success("Account created successfully!");

      // Invalidate auth cache and redirect
      await utils.auth.me.invalidate();
      window.location.href = returnTo;
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-amber-400/60 focus:bg-white/10";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 text-white">
      <AuroraBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {/* Brand */}
          <div className="mb-6 flex flex-col items-center text-center">
            <HumanEdgeMark className="mb-4 h-14 w-14 rounded-2xl shadow-lg shadow-amber-500/20" />
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              {mode === "login" ? (
                <>Sign in to your <Wordmark /> account</>
              ) : (
                <>Sign up to get started with <Wordmark /></>
              )}
            </p>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "login" ? "Enter your password" : "Create a password (min 8 chars)"}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-amber-400 hover:to-orange-400 hover:shadow-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setPassword(""); }}
                  className="font-medium text-amber-400 hover:text-amber-300"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setPassword(""); }}
                  className="font-medium text-amber-400 hover:text-amber-300"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/")}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Back to home page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
