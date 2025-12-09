"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const inputBase =
  "w-full rounded-xl border border-border bg-surface/30 py-3 pl-12 pr-3 text-foreground placeholder-muted transition-all duration-200 focus:border-primary focus:bg-surface/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background hover:border-primary/50";

export default function Login() {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetInfo, setShowResetInfo] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hasSettlementQuery =
      searchParams.get("settlement") === "1" ||
      searchParams.get("settlement") === "true";

    if (hasSettlementQuery) {
      setInfoMessage(
        "Payment settled. Please sign in with your registered email or phone number and password."
      );
    }

    const queryIdentifier =
      searchParams.get("identifier") ||
      searchParams.get("email") ||
      searchParams.get("phone");

    if (queryIdentifier) {
      setFormData((prev) => ({
        ...prev,
        identifier: prev.identifier || queryIdentifier,
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const identifier = formData.identifier.trim();
    if (!identifier) {
      setError("Please enter your email address or phone number.");
      setLoading(false);
      return;
    }

    try {
      const result = await login(identifier, formData.password);

      if (result.success) {
        if (result.is_active) {
          router.push("/dashboard");
        } else {
          setError(
            "Account not activated. Please complete payment using the link sent after registration."
          );
        }
      } else {
        setError(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
            Welcome Back
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Sign in to your account
          </h1>
          <p className="text-muted-foreground text-lg">
            Continue managing your AI assistants
          </p>
        </motion.div>

        {/* Login Form Card */}
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

              {infoMessage && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-6"
                >
                  <Card className="border-l-4 border-l-primary bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                        <p className="text-sm text-primary">{infoMessage}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="identifier" className="text-sm font-medium text-foreground">
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      placeholder="you@example.com or +62 812-3456-7890"
                      className={inputBase}
                      value={formData.identifier}
                      onChange={handleChange}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowResetInfo(true)}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={inputBase}
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center">
                <p className="text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <a
                    href="/register"
                    className="font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign up here
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reset Password Modal */}
      {showResetInfo && (
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
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Reset Your Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Password resets require an authenticated request. Contact your administrator or support team for assistance.
                  </p>
                  <Button
                    onClick={() => setShowResetInfo(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Got it
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
