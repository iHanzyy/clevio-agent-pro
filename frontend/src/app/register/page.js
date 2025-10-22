"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";

const inputBase =
  "w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3 pl-12 pr-3 text-slate-100 placeholder-slate-500 transition focus:border-emerald-400 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

const IconMail = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-slate-400"
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
    className="h-5 w-5 text-slate-400"
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
    className="h-5 w-5 text-slate-400"
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

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/85 shadow-[0_30px_60px_-20px_rgba(16,185,129,0.25)] backdrop-blur-xl md:flex-row">
        <div className="flex w-full flex-col justify-between px-8 py-10 sm:px-12 md:w-1/2">
          <div className="mx-auto flex w-full max-w-sm flex-col">
            <div className="flex items-center justify-center md:justify-start">
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

            <div className="mt-8 space-y-3 text-center md:text-left">
              <h1 className="text-3xl font-semibold text-white">
                Create your Clevio AI Assistants account
              </h1>
              <p className="text-sm text-slate-400">
                Set up your credentials to begin building and managing assistants.
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            {success && !error && (
              <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            )}

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-200"
                >
                  Email
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <IconMail />
                  </span>
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
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-200"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <IconLock />
                  </span>
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
                    className="absolute inset-y-0 right-4 flex items-center text-slate-300 transition hover:text-emerald-300"
                  >
                    <IconEye hidden={!showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-slate-200"
                >
                  Confirm password
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <IconLock />
                  </span>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    className={inputBase}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-300 transition hover:text-emerald-300"
                  >
                    <IconEye hidden={!showConfirmPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Creating account...
                  </span>
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400 md:text-left">
              Already have an account?{" "}
              <a
                href="/login"
                className="cursor-pointer font-semibold text-emerald-400 transition hover:text-emerald-300"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>

        <div className="relative hidden bg-slate-900 md:block md:w-1/2">
          <Image
            src="/pictureInLoginRegister.PNG"
            alt="Clevio workspace session"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

    </div>
  );
}
