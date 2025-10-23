"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_LABELS = {
  PRO_M: "Pro Monthly",
  PRO_Y: "Pro Yearly",
  BASIC: "Basic",
  FREE: "Free",
  NO_PLAN: "Not Subscribed",
};

const PLAN_DURATIONS = {
  PRO_M: 30,
  PRO_Y: 365,
  BASIC: 30,
};

const evaluatePasswordStrength = (value) => {
  if (!value) {
    return {
      progress: 0,
      label: "Enter a password",
      helper: "Use at least 8 characters. Combine words or add symbols.",
      barClass: "bg-gray-300",
      textClass: "text-gray-500",
    };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const level = Math.min(score, 4);
  const progress = Math.min(100, Math.round((level / 4) * 100));

  const meta = [
    {
      label: "Too weak",
      helper: "Add numbers, uppercase letters, and symbols.",
      barClass: "bg-rose-500",
      textClass: "text-rose-500",
    },
    {
      label: "Weak",
      helper: "Lengthen the password or mix in symbols.",
      barClass: "bg-orange-500",
      textClass: "text-orange-500",
    },
    {
      label: "Fair",
      helper: "Almost there—add a special character or more length.",
      barClass: "bg-amber-500",
      textClass: "text-amber-500",
    },
    {
      label: "Strong",
      helper: "Looks good. A passphrase keeps it memorable and safe.",
      barClass: "bg-emerald-500",
      textClass: "text-emerald-500",
    },
    {
      label: "Very strong",
      helper: "Excellent! Store it in a secure password manager.",
      barClass: "bg-emerald-600",
      textClass: "text-emerald-600",
    },
  ][level];

  return {
    progress,
    ...meta,
  };
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const truncateCredential = (credential) => {
  if (!credential || credential.length <= 16) {
    return credential || "—";
  }
  return `${credential.slice(0, 8)}…${credential.slice(-6)}`;
};

export default function SettingsPage() {
  const { user, loading, updatePassword } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const subscription = user?.subscription || {};
  const planCode = subscription.plan_code || "NO_PLAN";
  const planLabel = PLAN_LABELS[planCode] || planCode;
  const isActive =
    subscription.is_active ??
    subscription.isActive ??
    user?.is_active ??
    false;
  const expiresAt = subscription.expires_at || subscription.expiresAt || null;
  const daysRemaining =
    typeof subscription.days_remaining === "number"
      ? subscription.days_remaining
      : typeof subscription.daysRemaining === "number"
        ? subscription.daysRemaining
        : null;
  const apiKey = subscription.api_key || null;

  const initials = useMemo(() => {
    if (!user?.email) return "U";
    const parts = user.email.split("@")[0];
    if (!parts) return "U";
    const trimmed = parts.replace(/[^a-zA-Z]/g, "");
    if (!trimmed) return user.email[0].toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }, [user?.email]);

  const renewalProgress = useMemo(() => {
    const totalDays = PLAN_DURATIONS[planCode];
    if (!totalDays || typeof daysRemaining !== "number") return null;
    const used = Math.min(Math.max(totalDays - daysRemaining, 0), totalDays);
    return Math.round((used / totalDays) * 100);
  }, [planCode, daysRemaining]);

  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(passwordForm.newPassword),
    [passwordForm.newPassword],
  );

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setStatus({
        type: "error",
        message: "Please fill in both password fields.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus({
        type: "error",
        message: "Passwords do not match. Double-check both fields.",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setStatus({
        type: "error",
        message: "Use at least 8 characters to keep your account secure.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(passwordForm.newPassword);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setStatus({
        type: "success",
        message: "Password updated successfully.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.message ||
          "Unable to update password. Please try again shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (!apiKey || typeof navigator === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopyMessage("Copied to clipboard");
    } catch (error) {
      setCopyMessage("Copy failed");
    }
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopyMessage(""), 2200);
  };

  const handleToggleVisibility = () => {
    setPasswordVisible((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Loading your settings…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          No account data found
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Sign in again to access your settings and security controls.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-semibold uppercase text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-white/80">
                Signed in as
              </p>
              <h1 className="text-3xl font-semibold">{user.email}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
                <span className="rounded-full bg-white/15 px-3 py-1">
                  Plan: {planLabel}
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    isActive ? "bg-emerald-400/20" : "bg-rose-400/20"
                  } ${isActive ? "text-emerald-100" : "text-rose-100"}`}
                >
                  {isActive ? "Active subscription" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-white/70">Next renewal</p>
            <p className="text-xl font-semibold">
              {formatDate(expiresAt)}
            </p>
            {typeof daysRemaining === "number" ? (
              <p className="mt-1 text-sm text-white/70">
                {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/70">
                Renewal date not available
              </p>
            )}
          </div>
        </div>
        {renewalProgress !== null && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Plan usage</span>
              <span>{renewalProgress}% used</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${renewalProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Account overview
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Key details about your subscription and workspace access.
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/70">
                <dt className="text-sm text-gray-600 dark:text-gray-400">
                  Account ID
                </dt>
                <dd className="mt-2 break-words text-base font-medium text-gray-900 dark:text-gray-100">
                  {user.user_id || "—"}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/70">
                <dt className="text-sm text-gray-600 dark:text-gray-400">
                  Email
                </dt>
                <dd className="mt-2 break-words text-base font-medium text-gray-900 dark:text-gray-100">
                  {user.email}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/70">
                <dt className="text-sm text-gray-600 dark:text-gray-400">
                  Plan
                </dt>
                <dd className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
                  {planLabel}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/70">
                <dt className="text-sm text-gray-600 dark:text-gray-400">
                  Subscription status
                </dt>
                <dd
                  className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/70">
                <dt className="text-sm text-gray-600 dark:text-gray-400">
                  Days remaining
                </dt>
                <dd className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
                  {typeof daysRemaining === "number"
                    ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
                    : "Not available"}
                </dd>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/70">
                <dt className="text-sm text-gray-600 dark:text-gray-400">
                  Renewal date
                </dt>
                <dd className="mt-2 text-base font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(expiresAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  API access
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Use your active API key to connect agents and applications.
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 dark:border-indigo-700/50 dark:bg-indigo-500/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-200">
                    Current API key
                  </p>
                  <p className="mt-2 font-mono text-sm text-indigo-900 dark:text-indigo-100">
                    {apiKey ? truncateCredential(apiKey) : "No active key"}
                  </p>
                  {copyMessage && (
                    <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                      {copyMessage}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    disabled={!apiKey}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
                      apiKey
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                        : "cursor-not-allowed bg-indigo-300 text-indigo-100"
                    }`}
                  >
                    Copy key
                  </button>
                  <p className="text-xs text-indigo-700/80 dark:text-indigo-200/80">
                    Tip: rotate keys regularly and store them securely.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Password &amp; security
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Update your password to keep your workspace secure.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit}>
            {status && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
                }`}
              >
                {status.message}
              </div>
            )}

            <div>
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                New password
              </label>
              <div className="mt-2">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-600/30"
                  placeholder="Use a memorable passphrase"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Confirm password
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-600/30"
                  placeholder="Repeat your new password"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleVisibility}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              {passwordVisible ? "Hide passwords" : "Show passwords"}
            </button>

            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Password strength</span>
                <span className={`font-medium ${passwordStrength.textClass}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full ${passwordStrength.barClass} transition-all`}
                  style={{ width: `${passwordStrength.progress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {passwordStrength.helper}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:focus:ring-offset-gray-900"
              >
                {isSubmitting ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
