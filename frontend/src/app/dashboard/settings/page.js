"use client";

import { useMemo, useState } from "react";
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
      barClass: "bg-surface-strong/40",
      textClass: "text-muted",
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
      barClass: "bg-surface-strong/60",
      textClass: "text-muted",
    },
    {
      label: "Weak",
      helper: "Lengthen the password or mix in symbols.",
      barClass: "bg-surface-strong",
      textClass: "text-muted",
    },
    {
      label: "Fair",
      helper: "Almost there—add a special character or more length.",
      barClass: "bg-accent/40",
      textClass: "text-accent",
    },
    {
      label: "Strong",
      helper: "Looks good. A passphrase keeps it memorable and safe.",
      barClass: "bg-accent",
      textClass: "text-accent",
    },
    {
      label: "Very strong",
      helper: "Excellent! Store it in a secure password manager.",
      barClass: "bg-accent",
      textClass: "text-accent",
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

export default function SettingsPage() {
  const { user, loading, updatePassword } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleToggleVisibility = () => {
    setPasswordVisible((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted dark:text-muted">
            Loading your settings…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-surface-strong/60 bg-surface p-12 text-center shadow-sm dark:border-surface-strong dark:bg-surface-strong">
        <h2 className="text-2xl font-semibold text-foreground dark:text-foreground">
          No account data found
        </h2>
        <p className="mt-3 text-muted dark:text-muted">
          Sign in again to access your settings and security controls.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-accent via-accent/90 to-accent-hover p-8 text-accent-foreground shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/20 text-2xl font-semibold uppercase text-accent-foreground">
              {initials}
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-accent-foreground/80">
                Signed in as
              </p>
              <h1 className="text-3xl font-semibold">{user.email}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
                <span className="rounded-full bg-surface/15 px-3 py-1">
                  Plan: {planLabel}
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    isActive ? "bg-accent/20" : "bg-surface-strong/40"
                  } ${isActive ? "text-accent" : "text-muted"}`}
                >
                  {isActive ? "Active subscription" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-accent-foreground/70">Next renewal</p>
            <p className="text-xl font-semibold">
              {formatDate(expiresAt)}
            </p>
            {typeof daysRemaining === "number" ? (
              <p className="mt-1 text-sm text-accent-foreground/70">
                {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
              </p>
            ) : (
              <p className="mt-1 text-sm text-accent-foreground/70">
                Renewal date not available
              </p>
            )}
          </div>
        </div>
        {renewalProgress !== null && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-accent-foreground/70">
              <span>Plan usage</span>
              <span>{renewalProgress}% used</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface/25">
              <div
                className="h-full rounded-full bg-surface"
                style={{ width: `${renewalProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className="rounded-3xl border border-surface-strong/60 bg-surface p-8 shadow-sm dark:border-surface-strong dark:bg-surface-strong">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground dark:text-foreground">
                  Account overview
                </h2>
                <p className="mt-1 text-sm text-muted dark:text-muted">
                  Key details about your subscription and workspace access.
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-surface-strong/40 bg-background p-5 dark:border-surface-strong dark:bg-surface-strong/70">
                <dt className="text-sm text-muted dark:text-muted">
                  Account ID
                </dt>
                <dd className="mt-2 break-words text-base font-medium text-foreground dark:text-foreground">
                  {user.user_id || "—"}
                </dd>
              </div>
              <div className="rounded-2xl border border-surface-strong/40 bg-background p-5 dark:border-surface-strong dark:bg-surface-strong/70">
                <dt className="text-sm text-muted dark:text-muted">
                  Email
                </dt>
                <dd className="mt-2 break-words text-base font-medium text-foreground dark:text-foreground">
                  {user.email}
                </dd>
              </div>
              <div className="rounded-2xl border border-surface-strong/40 bg-background p-5 dark:border-surface-strong dark:bg-surface-strong/70">
                <dt className="text-sm text-muted dark:text-muted">
                  Plan
                </dt>
                <dd className="mt-2 text-base font-medium text-foreground dark:text-foreground">
                  {planLabel}
                </dd>
              </div>
              <div className="rounded-2xl border border-surface-strong/40 bg-background p-5 dark:border-surface-strong dark:bg-surface-strong/70">
                <dt className="text-sm text-muted dark:text-muted">
                  Subscription status
                </dt>
                <dd
                  className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    isActive
                      ? "bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent"
                      : "bg-surface-strong/40 text-muted dark:bg-surface-strong/40 dark:text-muted"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </dd>
              </div>
              <div className="rounded-2xl border border-surface-strong/40 bg-background p-5 dark:border-surface-strong dark:bg-surface-strong/70">
                <dt className="text-sm text-muted dark:text-muted">
                  Days remaining
                </dt>
                <dd className="mt-2 text-base font-medium text-foreground dark:text-foreground">
                  {typeof daysRemaining === "number"
                    ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
                    : "Not available"}
                </dd>
              </div>
              <div className="rounded-2xl border border-surface-strong/40 bg-background p-5 dark:border-surface-strong dark:bg-surface-strong/70">
                <dt className="text-sm text-muted dark:text-muted">
                  Renewal date
                </dt>
                <dd className="mt-2 text-base font-medium text-foreground dark:text-foreground">
                  {formatDate(expiresAt)}
                </dd>
              </div>
            </dl>
          </section>

        </div>

        <section className="rounded-3xl border border-surface-strong/60 bg-surface p-8 shadow-sm dark:border-surface-strong dark:bg-surface-strong">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">
            Password &amp; security
          </h2>
          <p className="mt-1 text-sm text-muted dark:text-muted">
            Update your password to keep your workspace secure.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit}>
            {status && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "success"
                    ? "border-accent/40 bg-accent/10 text-accent dark:border-accent/40/40 dark:bg-accent/10 dark:text-accent"
                    : "border-surface-strong/60 bg-background text-accent dark:border-surface-strong dark:bg-surface-strong/40 dark:text-accent"
                }`}
              >
                {status.message}
              </div>
            )}

            <div>
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-muted dark:text-foreground"
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
                  className="w-full rounded-2xl border border-surface-strong/60 bg-background px-4 py-3 text-foreground shadow-sm focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-surface-strong dark:bg-surface-strong dark:text-foreground dark:focus:border-accent dark:focus:ring-accent/35"
                  placeholder="Use a memorable passphrase"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-muted dark:text-foreground"
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
                  className="w-full rounded-2xl border border-surface-strong/60 bg-background px-4 py-3 text-foreground shadow-sm focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-surface-strong dark:bg-surface-strong dark:text-foreground dark:focus:border-accent dark:focus:ring-accent/35"
                  placeholder="Repeat your new password"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleVisibility}
              className="text-sm font-medium text-accent hover:text-accent focus:outline-none dark:text-accent dark:hover:text-accent"
            >
              {passwordVisible ? "Hide passwords" : "Show passwords"}
            </button>

            <div>
              <div className="flex items-center justify-between text-sm text-muted dark:text-muted">
                <span>Password strength</span>
                <span className={`font-medium ${passwordStrength.textClass}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface dark:bg-surface-strong">
                <div
                  className={`h-full rounded-full ${passwordStrength.barClass} transition-all`}
                  style={{ width: `${passwordStrength.progress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-muted dark:text-muted">
                {passwordStrength.helper}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-accent dark:focus:ring-offset-surface-strong"
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
