"use client";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, CheckCircle, User, Sparkles } from "lucide-react";
import { apiService } from "@/lib/api";
import { hasUsedTrialEmail } from "@/lib/trialGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const inputBase =
  "w-full rounded-xl border border-border bg-surface/30 py-3 pl-12 pr-3 text-foreground placeholder-muted transition-all duration-200 focus:border-primary focus:bg-surface/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background hover:border-primary/50";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

function RegisterContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTrialUsedModal, setShowTrialUsedModal] = useState(false);
  const [trialBlockedEmail, setTrialBlockedEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsTrial = searchParams?.get("trial") === "1";

  useEffect(() => {
    if (!wantsTrial) {
      setShowTrialUsedModal(false);
      setTrialBlockedEmail("");
    }
  }, [wantsTrial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const normalizedInputEmail = normalizeEmail(email);
    if (
      wantsTrial &&
      typeof window !== "undefined" &&
      hasUsedTrialEmail(normalizedInputEmail)
    ) {
      setTrialBlockedEmail(normalizedInputEmail);
      setShowTrialUsedModal(true);
      return;
    }

    setLoading(true);
    try {
      setSuccess("");
      const registerResponse = await apiService.register(email, password);

      const userId =
        registerResponse?.user_id ||
        registerResponse?.id ||
        registerResponse?.userId;
      const normalizedEmail = registerResponse?.email || email;

      if (!userId || !normalizedEmail) {
        throw new Error("Unable to capture user information for payment.");
      }

      if (wantsTrial && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            "trialRegistrationCredentials",
            JSON.stringify({
              email: normalizedEmail,
              password,
              createdAt: Date.now(),
            }),
          );
        } catch (storageError) {
          console.warn(
            "[Register] Failed to persist trial credentials for activation",
            storageError
          );
        }
      }

      setSuccess(
        "Registration successful! Redirecting you to choose a plan. After settlement, use these credentials to log in."
      );
      setError("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      apiService.clearLastOrderId();
      setTimeout(() => {
        const params = new URLSearchParams({
          user_id: String(userId),
          email: String(normalizedEmail),
        });
        if (wantsTrial) {
          params.set("plan", "TRIAL");
          params.set("source", "trial-flow");
        }
        router.push(`/payment?${params.toString()}`);
      }, 1000);
    } catch (err) {
      let message = "Registration failed";
      if (err && typeof err === "object" && "message" in err && err.message) {
        message = String(err.message);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/20 to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <Image
              src="/clevioAISTAFF-Logo-Black.png"
              alt="Clevio AI Staff"
              width={180}
              height={102}
              className="h-auto w-[180px]"
              priority
            />
          </div>
          <Badge className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Create Account
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Start your AI journey
          </h1>
          <p className="text-muted-foreground text-lg">
            Build and manage AI assistants for your business
          </p>
        </motion.div>

        {/* Registration Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="card-shadow border-border bg-card">
            <CardContent className="p-8">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6"
                >
                  <Card className="border-l-4 border-l-destructive bg-destructive/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {success && !error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6"
                >
                  <Card className="border-l-4 border-l-success bg-success/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                        <p className="text-sm text-success">{success}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={inputBase}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a valid email address for account verification
                  </p>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      className={inputBase}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      className={inputBase}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full bg-gradient-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Sign In Link */}
              <div className="mt-8 text-center">
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <a
                    href="/login"
                    className="font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign in here
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trial Used Modal */}
      {showTrialUsedModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="card-shadow border-border bg-card">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Trial Unavailable</h3>
                  <p className="text-sm text-muted-foreground">
                    {trialBlockedEmail
                      ? `${trialBlockedEmail} has already used the free trial.`
                      : "This device has already activated a free trial."}
                    <br />
                    Upgrade to PRO or sign in with your existing account.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => setShowTrialUsedModal(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Got it
                    </Button>
                    <Button
                      onClick={() => router.push("/login")}
                      className="flex-1"
                    >
                      Go to Login
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted">Preparing registration…</p>
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
