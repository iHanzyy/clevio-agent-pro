"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_OPTIONS = [
  { code: "PRO_M", name: "Pro Monthly", price: "100000", duration_days: 30 },
  { code: "PRO_Y", name: "Pro Yearly", price: "1000000", duration_days: 365 },
];

export default function Payment() {
  const [plans] = useState(PLAN_OPTIONS);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [storedPlan, setStoredPlan] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [statusState, setStatusState] = useState({
    state: "idle",
    message: "",
  });
  const [statusError, setStatusError] = useState("");
  const [orderSuffix, setOrderSuffix] = useState(() => Date.now().toString());
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchStatus = searchParams?.get("status");
  const searchOrderId = searchParams?.get("order_id");
  const {
    user,
    loading: authLoading,
    updateSubscription,
    applySubscription,
    login,
  } = useAuth();

  const extractPlanFromOrderId = (value) => {
    if (!value || typeof value !== "string") {
      return null;
    }
    const segments = value.split("-");
    return segments[segments.length - 1] || null;
  };

  const resolvePendingPlan = useCallback(
    (candidateOrderId) => {
      if (storedPlan) return storedPlan;
      if (selectedPlan) return selectedPlan;
      if (typeof window !== "undefined") {
        const pendingPlanCode = sessionStorage.getItem("pending_plan_code");
        if (pendingPlanCode) {
          setStoredPlan(pendingPlanCode);
          return pendingPlanCode;
        }
      }
      return extractPlanFromOrderId(candidateOrderId);
    },
    [selectedPlan, storedPlan],
  );

  const finalizeSuccess = useCallback(
    async (latestOrderId, overrides = {}) => {
      if (isFinalizing) {
        return;
      }
      setIsFinalizing(true);

      const sleep = (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        });

      const sessionOrderId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("pending_order_id")
          : null;
      const effectiveOrderId = latestOrderId || sessionOrderId || null;
      const planCodeOverride =
        overrides.planCode || resolvePendingPlan(effectiveOrderId);

      if (planCodeOverride) {
        apiService.setPlanCode(planCodeOverride);
      }

      const credentials = pendingCredentials;

      const ensureLoggedIn = async () => {
        if (apiService.hasSessionToken()) {
          if (pendingCredentials) {
            setPendingCredentials(null);
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("pending_credentials");
            }
          }
          return true;
        }

        if (!credentials?.email || !credentials?.password) {
          return Boolean(user);
        }

        const maxAttempts = 6;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          try {
            const loginResult = await login?.(
              credentials.email,
              credentials.password,
            );
            if (loginResult?.success) {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("pending_credentials");
              }
              setPendingCredentials(null);
              return true;
            }
            console.warn(
              "Auto login after payment failed",
              loginResult || "unknown response",
            );
          } catch (err) {
            console.warn("Auto login threw an error", err);
          }

          await sleep(1000 * Math.min(3, attempt + 1));
        }
        return false;
      };

      try {
        const loggedIn = await ensureLoggedIn();
        if (!loggedIn) {
          setStatusState({
            state: "idle",
            message:
              "We activated your payment, but could not log you in automatically.",
          });
          setStatusError(
            "Payment confirmed. Please sign in with your email and password to finish setup.",
          );
          return;
        }

        let subscription = null;
        try {
          subscription = await updateSubscription?.();
        } catch (err) {
          console.warn("Failed to refresh subscription after settlement", err);
        }

        if (!subscription && planCodeOverride) {
          applySubscription?.({
            is_active: true,
            plan_code: planCodeOverride,
          });
        }

        if (!apiService.hasApiKey() && planCodeOverride) {
          try {
            const apiKeyResponse =
              await apiService.generateApiKey(planCodeOverride);
            if (apiKeyResponse?.access_token) {
              apiService.setApiKey(apiKeyResponse.access_token);
            }
          } catch (err) {
            console.warn("Auto API key generation failed", err);
          }
        }

        try {
          await apiService.ensureApiKey({ planCode: planCodeOverride });
          if (!apiService.hasApiKey()) {
            console.warn("API key still unavailable after settlement");
          }
        } catch (err) {
          console.warn("Unable to ensure API key after settlement", err);
        }

        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pending_registration");
          sessionStorage.removeItem("pending_plan_code");
          sessionStorage.removeItem("pending_credentials");
          sessionStorage.removeItem("pending_order_id");
          sessionStorage.removeItem("pending_order_suffix");
        }
        setOrderId("");
        setOrderSuffix(Date.now().toString());
        setStoredPlan("");
        setPendingRegistration(null);
        setPendingCredentials(null);
        setStatusError("");
        setStatusState({
          state: "success",
          message: "Payment successful! Taking you to your dashboard.",
        });
        router.replace("/dashboard");
      } finally {
        setIsFinalizing(false);
      }
    },
    [
      isFinalizing,
      applySubscription,
      login,
      pendingCredentials,
      resolvePendingPlan,
      router,
      updateSubscription,
      user,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = sessionStorage.getItem("pending_registration");
      if (stored) {
        setPendingRegistration(JSON.parse(stored));
      }
      const pendingPlanCode = sessionStorage.getItem("pending_plan_code");
      if (pendingPlanCode) {
        setStoredPlan(pendingPlanCode);
        apiService.setPlanCode(pendingPlanCode);
      }
      const storedSuffix = sessionStorage.getItem("pending_order_suffix");
      if (storedSuffix) {
        setOrderSuffix(storedSuffix);
      }
      const pendingCredsRaw = sessionStorage.getItem("pending_credentials");
      if (pendingCredsRaw) {
        try {
          const creds = JSON.parse(pendingCredsRaw);
          if (creds?.email && creds?.password) {
            setPendingCredentials(creds);
          }
        } catch (err) {
          console.warn("Failed to parse pending credentials", err);
          setPendingCredentials(null);
        }
      }
      if (!searchOrderId) {
        sessionStorage.removeItem("pending_order_id");
      }
    } catch (err) {
      console.warn("Failed to load pending registration", err);
      setPendingRegistration(null);
    }
  }, [searchOrderId]);

  const fetchTransactionStatus = useCallback(async () => {
    try {
      const response = await apiService.getInformationN8N(orderId);

      if (!response) {
        return { transaction: null, raw: null };
      }

      const normalized = (() => {
        if (Array.isArray(response)) {
          return response[0] || null;
        }

        if (response?.data) {
          if (Array.isArray(response.data)) {
            return response.data[0] || null;
          }
          return response.data;
        }

        if (response?.payload) {
          if (Array.isArray(response.payload)) {
            return response.payload[0] || null;
          }
          return response.payload;
        }

        if (response?.result) {
          if (Array.isArray(response.result)) {
            return response.result[0] || null;
          }
          return response.result;
        }

        return response;
      })();

      if (
        normalized &&
        response?.transaction_status &&
        !normalized.transaction_status
      ) {
        normalized.transaction_status = response.transaction_status;
      }

      console.log("[payment] n8n status payload", {
        orderId,
        raw: response,
        normalized,
      });

      const apiAccessToken =
        response?.api_access_token ||
        response?.access_token ||
        normalized?.api_access_token ||
        normalized?.access_token ||
        null;

      if (apiAccessToken) {
        apiService.setApiKey(apiAccessToken);
      }

      const sessionToken =
        response?.session_token ||
        response?.session_access_token ||
        normalized?.session_token ||
        normalized?.session_access_token ||
        null;

      if (sessionToken) {
        apiService.setSessionToken(sessionToken);
      }

      return { transaction: normalized, raw: response };
    } catch (error) {
      console.warn("Unable to fetch payment status from n8n", error);
      return { transaction: null, raw: null };
    }
  }, [orderId]);

  const verifyPayment = useCallback(
    async ({ silent = false } = {}) => {
      if (!user && !pendingCredentials) {
        return;
      }
      if (!silent) {
        setStatusError("");
        setStatusState({
          state: "checking",
          message: "Confirming your payment with our system...",
        });
      }
      try {
        const { transaction, raw } = await fetchTransactionStatus();

        const derivedOrderId =
          transaction?.order_id || raw?.order_id || raw?.orderId || null;
        if (!orderId && derivedOrderId) {
          setOrderId(derivedOrderId);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("pending_order_id", derivedOrderId);
          }
          apiService.setLastOrderId(derivedOrderId);
        }

        const transactionStatus = transaction?.transaction_status
          ? String(transaction.transaction_status).toLowerCase()
          : raw?.transaction_status
            ? String(raw.transaction_status).toLowerCase()
            : null;

        if (
          transactionStatus === "settlement" ||
          transactionStatus === "capture"
        ) {
          await finalizeSuccess(derivedOrderId ?? orderId);
          return;
        }

        if (
          transactionStatus &&
          transactionStatus !== "settlement" &&
          transactionStatus !== "capture"
        ) {
          if (!silent) {
            setStatusState({ state: "idle", message: "" });
            setStatusError(
              transactionStatus === "pending"
                ? "Your payment is still pending on Midtrans. We will keep checking automatically."
                : `Latest payment status from Midtrans: ${transactionStatus}.`,
            );
          }
          return;
        }

        if (!silent) {
          setStatusState({ state: "idle", message: "" });
          setStatusError(
            "We have not received a settlement confirmation yet. We'll keep watching this page for updates.",
          );
        }
      } catch (_err) {
        if (!silent) {
          setStatusState({ state: "idle", message: "" });
          setStatusError(
            "We could not confirm your payment right now. Please refresh or try again shortly.",
          );
        }
      }
    },
    [
      fetchTransactionStatus,
      orderId,
      finalizeSuccess,
      pendingCredentials,
      user,
    ],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (user?.subscription?.is_active) {
      const cachedOrder =
        typeof window !== "undefined"
          ? sessionStorage.getItem("pending_order_id")
          : null;
      const activeOrderId = orderId || cachedOrder || null;
      if (!activeOrderId) {
        return;
      }
      const run = async () => {
        await finalizeSuccess(activeOrderId, {
          planCode: resolvePendingPlan(activeOrderId),
        });
      };
      void run();
      return;
    }

    if (typeof window !== "undefined") {
      const storedOrderId = sessionStorage.getItem("pending_order_id");
      if (storedOrderId && !orderId) {
        setOrderId(storedOrderId);
        apiService.setLastOrderId(storedOrderId);
      } else if (searchOrderId && !orderId) {
        setOrderId(searchOrderId);
        apiService.setLastOrderId(searchOrderId);
      }
    }

    if (searchStatus || searchOrderId || orderId) {
      verifyPayment();
    }
  }, [
    authLoading,
    user,
    verifyPayment,
    searchStatus,
    searchOrderId,
    orderId,
    finalizeSuccess,
    resolvePendingPlan,
  ]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const interval = setInterval(() => {
      void verifyPayment({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [orderId, verifyPayment]);

  const handlePayment = async () => {
    if (!selectedPlan) {
      setError("Please select a payment plan");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setStatusError("");
      const planDetails = PLAN_OPTIONS.find(
        (plan) => plan.code === selectedPlan,
      );

      const activeEmail = user?.email || pendingRegistration?.email || "";
      const activeUserId = user?.user_id || pendingRegistration?.user_id || "";

      if (!activeEmail || !activeUserId) {
        throw new Error(
          "Missing registrant information. Please restart registration or contact support.",
        );
      }

      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setOrderSuffix(uniqueSuffix);

      const webhookPayload = {
        user_id: activeUserId,
        email: activeEmail,
        plan_code: selectedPlan,
        harga: planDetails?.price || "0",
        order_suffix: uniqueSuffix,
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem("pending_plan_code", selectedPlan);
        sessionStorage.setItem("pending_order_suffix", uniqueSuffix);
      }
      setStoredPlan(selectedPlan);
      apiService.setPlanCode(selectedPlan);

      const webhookResponse =
        await apiService.notifyPaymentWebhook(webhookPayload);
      console.log("[payment] webhook response", webhookResponse);

      if (webhookResponse?.access_token) {
        apiService.setApiKey(webhookResponse.access_token);
      }

      const paymentMessage =
        webhookResponse?.message ||
        `Payment request submitted for ${planDetails?.name || selectedPlan}.`;
      setSuccessMessage(paymentMessage);
      setStatusState({
        state: "checking",
        message: "Waiting for payment confirmation...",
      });

      const generatedOrderId =
        webhookResponse?.order_id || webhookResponse?.data?.order_id || null;
      const redirectStatus =
        webhookResponse?.transaction_status || webhookResponse?.status || null;
      if (generatedOrderId) {
        sessionStorage.setItem("pending_order_id", generatedOrderId);
        setOrderId(generatedOrderId);
        apiService.setLastOrderId(generatedOrderId);
      } else {
        setOrderId("");
        sessionStorage.removeItem("pending_order_id");
        apiService.clearLastOrderId();
      }

      const paymentRedirect =
        webhookResponse?.redirect_url ||
        webhookResponse?.redirectUrl ||
        webhookResponse?.payment_url ||
        webhookResponse?.url ||
        webhookResponse?.snap_url ||
        webhookResponse?.deeplink_url ||
        webhookResponse?.data?.redirect_url ||
        webhookResponse?.data?.payment_url ||
        webhookResponse?.data?.snap_url ||
        webhookResponse?.data?.url ||
        "";
      if (paymentRedirect) {
        setStatusState({
          state: "checking",
          message: "Redirecting you to the Midtrans payment page...",
        });
        try {
          window.location.assign(paymentRedirect);
        } catch (_err) {
          window.location.href = paymentRedirect;
        }
        return;
      } else if (
        redirectStatus === "settlement" ||
        redirectStatus === "capture" ||
        webhookResponse?.status === "completed"
      ) {
        await finalizeSuccess(generatedOrderId, { planCode: selectedPlan });
        return;
      } else {
        setStatusError(
          "We generated your payment request. Please check your email for instructions.",
        );
        console.warn(
          "Payment webhook response did not include a redirect URL",
          webhookResponse,
        );
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const numericPrice =
      typeof price === "string" ? Number(price) : Number(price || 0);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number.isNaN(numericPrice) ? 0 : numericPrice);
  };

  const renderStatusOverlay = () => {
    if (statusState.state === "idle") {
      return null;
    }
    const isChecking = statusState.state === "checking";
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            {isChecking ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            ) : (
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isChecking ? "Checking Payment" : "Payment Successful"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{statusState.message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center">
      {renderStatusOverlay()}
      <div className="max-w-screen-xl m-0 sm:m-10 bg-white shadow sm:rounded-lg flex justify-center flex-1">
        <div className="w-full p-6 sm:p-12">
          <div className="text-center mb-8">
            <Image
              src="/clevioAIAssistantsLogo.png"
              alt="Clevio AI Assistants"
              width={200}
              height={60}
              className="mx-auto mb-6"
              priority
            />
            <h1 className="text-3xl font-extrabold text-gray-900">
              Choose Your Plan
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Select a subscription plan to activate your account
            </p>
          </div>

          {statusError && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded max-w-xl mx-auto text-sm">
              {statusError}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.code
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                  onClick={() => setSelectedPlan(plan.code)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <p className="text-gray-600">{plan.duration_days} days</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.code === "PRO_Y" && (
                        <div className="text-sm text-green-600">Save 17%!</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.code}
                      checked={selectedPlan === plan.code}
                      onChange={() => setSelectedPlan(plan.code)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      {plan.code === "PRO_M"
                        ? "Monthly subscription"
                        : "Yearly subscription (Best value!)"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handlePayment}
                disabled={loading || !selectedPlan}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Continue to Payment"}
              </button>
              {successMessage && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded max-w-xl mx-auto text-sm">
                  {successMessage}
                </div>
              )}
              <p className="mt-4 text-sm text-gray-600">
                If you were not redirected automatically, please check the
                payment instructions sent by our billing partner. Keep this
                order ID for reference:{" "}
                <span className="font-semibold">{orderId || "pending"}</span>.
              </p>
            </div>

            <div className="mt-8 text-center">
              <h4 className="text-lg font-semibold mb-4">What you get:</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>✅ Unlimited AI Agents</div>
                <div>✅ WhatsApp Integration</div>
                <div>✅ Document Upload (RAG)</div>
                <div>✅ Advanced Tools</div>
                <div>✅ Priority Support</div>
                <div>✅ Usage Analytics</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
