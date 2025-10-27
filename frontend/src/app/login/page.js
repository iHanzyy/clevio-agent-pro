"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

const inputBase =
  "w-full rounded-xl border border-surface-strong/60 bg-surface/30 py-3 pl-12 pr-3 text-foreground placeholder-muted transition focus:border-accent focus:bg-surface/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-background";

const IconMail = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
    />
  </svg>
);

const IconLock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10V7.5a4.5 4.5 0 10-9 0V10m-.75 11h10.5a1.5 1.5 0 001.5-1.5v-6.75a1.5 1.5 0 00-1.5-1.5H6.75a1.5 1.5 0 00-1.5 1.5V19.5a1.5 1.5 0 001.5 1.5z"
    />
  </svg>
);

const IconEye = ({ hidden }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    aria-hidden="true"
  >
    {hidden ? (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3l18 18M9.88 9.88a3 3 0 104.24 4.24"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.6 6.6A10.45 10.45 0 001.5 12c2.1 4.9 6.5 7.5 10.5 7.5a10.5 10.5 0 006.4-2.2m2.1-3.3A10.45 10.45 0 0022.5 12a10.6 10.6 0 00-5.15-4.91"
        />
      </>
    ) : (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5 12C3.6 7.1 8 4.5 12 4.5s8.4 2.6 10.5 7.5C20.4 16.4 16 19 12 19s-8.4-2.6-10.5-7z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        />
      </>
    )}
  </svg>
);

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
        "Payment settled. Please sign in with your registered email and password."
      );
    }

    const queryEmail = searchParams.get("email");

    if (queryEmail) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || queryEmail,
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-surface/40 to-background px-4 py-12">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-[28px] border border-surface-strong bg-surface/90 shadow-[0_30px_60px_-20px_rgba(59,130,246,0.25)] backdrop-blur-xl md:flex-row">
        <div className="flex w-full flex-col justify-between px-8 py-10 sm:px-12 md:w-1/2">
          <div className="flex items-center justify-center md:justify-start">
            <div className="flex w-full max-w-sm justify-center">
              <Image
                src="/clevioAIAssistantsLogo.png"
                alt="Clevio AI Assistants"
                width={216}
                height={122}
                className="h-auto w-[216px]"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
          </div>

          <div className="mx-auto mt-2 w-full max-w-sm">
            <div className="space-y-3 text-center md:text-left">
              <h1 className="text-2xl font-semibold text-foreground">
                Sign in to Clevio AI Assistants
              </h1>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {infoMessage && (
              <div className="mt-6 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
                {infoMessage}
              </div>
            )}

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-muted"
                >
                  Email
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <IconMail />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputBase}
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-muted"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetInfo(true)}
                    className="cursor-pointer text-sm font-semibold text-accent transition hover:text-accent-hover"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <IconLock />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={inputBase}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-4 flex items-center text-muted transition hover:text-accent"
                  >
                    <IconEye hidden={!showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted md:text-left">
              Don&apos;t have an account?{" "}
              <a
                href="/register"
                className="cursor-pointer font-semibold text-accent transition hover:text-accent-hover"
              >
                Sign Up
              </a>
            </p>
          </div>
        </div>

        <div className="relative hidden bg-surface-strong md:block md:w-1/2">
          <Image
            src="/pictureInLoginRegister.PNG"
            alt="Clevio workspace session"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {showResetInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4">
          <div className="max-w-md rounded-2xl border border-surface-strong bg-surface p-6 text-foreground shadow-2xl shadow-[0_20px_40px_rgba(45,55,72,0.18)]">
            <h2 className="text-lg font-semibold text-foreground">
              Reset your password
            </h2>
            <p className="mt-4 text-sm text-muted">
              Password resets currently require an authenticated request to{" "}
              <code className="rounded bg-surface-strong px-1 py-0.5 text-xs text-accent">
                POST /api/v1/auth/user/update-password
              </code>
              . Contact your administrator or support team if you need help
              generating a reset request.
            </p>
            <button
              type="button"
              onClick={() => setShowResetInfo(false)}
              className="mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-surface-strong bg-surface-strong px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
