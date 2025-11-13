"use client";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Rocket,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  readTrialAgentPayload,
  clearTrialAgentPayload,
} from "@/lib/trialStorage";
import { markTrialEmailUsed } from "@/lib/trialGuard";

const PLAN_OPTIONS = [
  {
    code: "TRIAL",
    name: "Free Trial",
    subtitle: "Perfect for getting started",
    price: "0",
    duration_days: 14,
    badge: "Start free",
    description: "Test Clevio for two weeks with limited usage.",
    features: [
      "Create up to 2 agents",
      "Sample knowledge base",
      "Community support",
    ],
    icon: Sparkles,
  },
  {
    code: "PRO_M",
    name: "Pro Monthly",
    subtitle: "As your business scales",
    price: "750000",
    originalPrice: "1000000",
    duration_days: 30,
    badge: "Most popular",
    description: "Scale your team with monthly flexibility.",
    features: [
      "Unlimited agents",
      "WhatsApp automation",
      "Advanced tools & RAG",
      "Priority chat support",
    ],
    icon: CalendarClock,
    recommended: true,
  },
  {
    code: "PRO_Y",
    name: "Pro Yearly",
    subtitle: "For more complex businesses",
    price: "1000000",
    duration_days: 365,
    badge: "Best value",
    description: "Maximize savings with full-year coverage.",
    features: [
      "Everything in Pro Monthly",
      "Dedicated success manager",
      "Early feature access",
      "1:1 onboarding workshop",
    ],
    icon: Rocket,
    discountNote: "Save 17% vs monthly",
  },
];

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface text-foreground">
          <div className="text-center space-y-2">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
            <p className="text-sm text-muted">Loading payment details…</p>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPlan = searchParams?.get("plan") || "";
  const queryEmail = searchParams?.get("email") || "";
  const queryUserId = searchParams?.get("user_id") || "";
  const searchStatus = searchParams?.get("status");
  const searchOrderId = searchParams?.get("order_id");
  const transactionStatusQuery = searchParams?.get("transaction_status") || "";
  const [plans] = useState(PLAN_OPTIONS);
  const [selectedPlan, setSelectedPlan] = useState(queryPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderId, setOrderId] = useState(searchOrderId || "");
  const [storedPlan, setStoredPlan] = useState(queryPlan);
  const [pendingRegistration, setPendingRegistration] = useState(() =>
    queryEmail && queryUserId
      ? { email: String(queryEmail), user_id: String(queryUserId) }
      : null
  );
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [statusState, setStatusState] = useState({
    state: "idle",
    message: "",
  });
  const [statusError, setStatusError] = useState("");
  const [orderSuffix, setOrderSuffix] = useState(() => Date.now().toString());
  const {
    user,
    loading: authLoading,
    updateSubscription,
    applySubscription,
  } = useAuth();
  const hasRedirectedRef = useRef(false);
  const [trialAgentDraft, setTrialAgentDraft] = useState(null);
  const [trialCredentials, setTrialCredentials] = useState(null);

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
      return extractPlanFromOrderId(candidateOrderId);
    },
    [selectedPlan, storedPlan]
  );

  const clearTrialCredentials = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("trialRegistrationCredentials");
      } catch (error) {
        console.warn("Failed to clear trial credentials from storage", error);
      }
    }
    setTrialCredentials(null);
  }, []);

  const completeTrialProvisioning = useCallback(
    async (activeEmail) => {
      if (!trialAgentDraft?.agentPayload || !activeEmail) {
        return;
      }

      const agentPayload = {
        ...trialAgentDraft.agentPayload,
      };
      if (!agentPayload.plan_code) {
        agentPayload.plan_code = "TRIAL";
      }

      await apiService.createAgent(agentPayload);
      setTrialAgentDraft(null);
      clearTrialCredentials();
    },
    [trialAgentDraft, clearTrialCredentials]
  );

  const finalizeSuccess = useCallback(
    async (latestOrderId, overrides = {}) => {
      if (isFinalizing) {
        return;
      }
      setIsFinalizing(true);

      try {
        const effectiveOrderId = latestOrderId || orderId || null;
        const planCodeOverride =
          overrides.planCode || resolvePendingPlan(effectiveOrderId);

        const normalizedPlanCode = planCodeOverride
          ? String(planCodeOverride).toUpperCase()
          : null;

        if (normalizedPlanCode) {
          apiService.setPlanCode(planCodeOverride);
        }

        const resolvedEmail =
          overrides.email ||
          user?.email ||
          pendingRegistration?.email ||
          queryEmail ||
          "";

        if (normalizedPlanCode === "TRIAL" && resolvedEmail) {
          try {
            await completeTrialProvisioning(resolvedEmail);
          } catch (err) {
            console.warn("Failed to complete trial provisioning", err);
          }
        } else if (!normalizedPlanCode) {
          clearTrialCredentials();
          clearTrialAgentPayload();
          setTrialAgentDraft(null);
        }

        if (user) {
          try {
            await updateSubscription?.();
          } catch (err) {
            console.warn(
              "Failed to refresh subscription after settlement",
              err
            );
          }

          if (planCodeOverride) {
            applySubscription?.({
              is_active: true,
              plan_code: planCodeOverride,
            });
          }

          setOrderId("");
          setOrderSuffix(Date.now().toString());
          setStoredPlan("");
          setPendingRegistration(null);
          setStatusError("");
          setStatusState({
            state: "success",
            message: "Payment successful! Taking you to your dashboard.",
          });
          hasRedirectedRef.current = true;
          router.replace("/dashboard");
          return;
        }

        setOrderId("");
        setOrderSuffix(Date.now().toString());
        setStoredPlan("");
        setPendingRegistration(null);
        setStatusError("");
        setStatusState({
          state: "success",
          message: "Payment settled! Please log in to continue.",
        });
        const loginParams = new URLSearchParams({ settlement: "1" });
        if (normalizedPlanCode === "TRIAL") {
          loginParams.set("trial", "1");
        }
        if (resolvedEmail) {
          loginParams.set("email", resolvedEmail);
        }
        hasRedirectedRef.current = true;
        router.replace(`/login?${loginParams.toString()}`);
      } finally {
        setIsFinalizing(false);
      }
    },
    [
      applySubscription,
      clearTrialCredentials,
      completeTrialProvisioning,
      isFinalizing,
      orderId,
      pendingRegistration,
      queryEmail,
      resolvePendingPlan,
      router,
      updateSubscription,
      user,
    ]
  );

  useEffect(() => {
    if (queryEmail && queryUserId) {
      setPendingRegistration({
        email: String(queryEmail),
        user_id: String(queryUserId),
      });
    }
    if (queryPlan) {
      setStoredPlan(queryPlan);
      apiService.setPlanCode(queryPlan);
    }
    if (searchOrderId) {
      setOrderId(searchOrderId);
      apiService.setLastOrderId(searchOrderId);
    }
  }, [queryEmail, queryPlan, queryUserId, searchOrderId]);

  useEffect(() => {
    const snapshot = readTrialAgentPayload();
    if (snapshot) {
      setTrialAgentDraft(snapshot);
    }
    return () => {
      try {
        clearTrialAgentPayload();
      } catch (error) {
        console.warn("Failed to clear pending trial agent payload", error);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.sessionStorage.getItem(
      "trialRegistrationCredentials"
    );
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTrialCredentials(parsed);
      } catch (error) {
        console.warn("Failed to parse stored trial credentials", error);
        window.sessionStorage.removeItem("trialRegistrationCredentials");
      }
    }

    return () => {
      try {
        window.sessionStorage.removeItem("trialRegistrationCredentials");
      } catch (error) {
        console.warn("Failed to clear trial credentials from storage", error);
      }
    };
  }, []);

  const isSettled = useCallback((transaction, raw) => {
    const candidates = [
      transaction?.transaction_status,
      raw?.transaction_status,
      transaction?.status,
      raw?.status,
      transaction?.payment_status,
      raw?.payment_status,
    ];

    for (const value of candidates) {
      if (value === true) {
        return true;
      }
      if (typeof value === "string" && value.trim()) {
        const normalized = value.trim().toLowerCase();
        if (
          [
            "settlement",
            "capture",
            "settled",
            "success",
            "paid",
            "paid_off",
            "payment_successful",
          ].includes(normalized)
        ) {
          return true;
        }
      }
    }

    if (transaction?.success === true || raw?.success === true) {
      return true;
    }

    return false;
  }, []);

  const fetchTransactionStatus = useCallback(async () => {
    try {
      const response = await apiService.getInformationN8N(orderId, orderSuffix);

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
  }, [orderId, orderSuffix]);

  const verifyPayment = useCallback(
    async ({ silent = false } = {}) => {
      if (!user && !pendingRegistration) {
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
          apiService.setLastOrderId(derivedOrderId);
        }

        const transactionStatus = transaction?.transaction_status
          ? String(transaction.transaction_status).toLowerCase()
          : raw?.transaction_status
          ? String(raw.transaction_status).toLowerCase()
          : null;

        if (
          transactionStatus === "settlement" ||
          transactionStatus === "capture" ||
          isSettled(transaction, raw)
        ) {
          await finalizeSuccess(derivedOrderId ?? orderId);
          return;
        }

        if (
          transactionStatus &&
          transactionStatus !== "settlement" &&
          transactionStatus !== "capture" &&
          !isSettled(transaction, raw)
        ) {
          if (!silent) {
            setStatusState({ state: "idle", message: "" });
            setStatusError(
              transactionStatus === "pending"
                ? "Your payment is still pending on Midtrans. We will keep checking automatically."
                : `Latest payment status from Midtrans: ${transactionStatus}.`
            );
          }
          return;
        }

        if (!silent) {
          setStatusState({ state: "idle", message: "" });
          setStatusError(
            "We have not received a settlement confirmation yet. We'll keep watching this page for updates."
          );
        }
      } catch (_err) {
        if (!silent) {
          setStatusState({ state: "idle", message: "" });
          setStatusError(
            "We could not confirm your payment right now. Please refresh or try again shortly."
          );
        }
      }
    },
    [
      fetchTransactionStatus,
      orderId,
      finalizeSuccess,
      pendingRegistration,
      isSettled,
      user,
    ]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (user?.subscription?.is_active) {
      const cachedOrder =
        typeof apiService.getLastOrderId === "function"
          ? apiService.getLastOrderId()
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

    if (!orderId) {
      const rememberedOrderId =
        searchOrderId ||
        (typeof apiService.getLastOrderId === "function"
          ? apiService.getLastOrderId()
          : null);
      if (rememberedOrderId) {
        setOrderId(rememberedOrderId);
        apiService.setLastOrderId(rememberedOrderId);
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
    if (hasRedirectedRef.current) {
      return;
    }
    const normalized = transactionStatusQuery.toLowerCase();
    if (
      normalized &&
      ["settlement", "capture", "success", "paid", "paid_off"].includes(
        normalized
      )
    ) {
      const effectiveOrderId = searchOrderId || orderId || null;
      const planCodeOverride = resolvePendingPlan(effectiveOrderId);
      void finalizeSuccess(effectiveOrderId, {
        planCode: planCodeOverride,
        email: pendingRegistration?.email || queryEmail || "",
      });
    }
  }, [
    finalizeSuccess,
    orderId,
    pendingRegistration?.email,
    queryEmail,
    resolvePendingPlan,
    searchOrderId,
    transactionStatusQuery,
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

    const activeEmail =
      user?.email || pendingRegistration?.email || queryEmail || "";
    const activeUserId = user?.user_id || pendingRegistration?.user_id || "";

    if (!activeEmail || !activeUserId) {
      setError(
        "Missing registrant information. Please restart registration or contact support."
      );
      return;
    }

    if (selectedPlan === "TRIAL") {
      if (!trialAgentDraft?.agentPayload) {
        setError(
          "We lost your trial configuration. Please restart from the template gallery."
        );
        return;
      }
      if (!trialCredentials?.password) {
        setError(
          "Trial activation requires your registration credentials. Please restart the trial enrollment."
        );
        return;
      }

      setLoading(true);
      setError("");
      setStatusError("");
      setStatusState({
        state: "processing",
        message: "Activating your free trial…",
      });

      try {
        const response = await fetch(
          "https://n8n-new.chiefaiofficer.id/webhook/registerTrial",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: activeUserId,
              email: activeEmail,
              password: trialCredentials.password,
              plan_code: "TRIAL",
            }),
          }
        );

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(
            detail || "Trial activation webhook returned an error."
          );
        }

        const data = await response.json().catch(() => ({}));
        const webhookApiKey =
          data?.access_token ||
          data?.token ||
          data?.api_key ||
          data?.apiKey ||
          null;

        if (webhookApiKey) {
          apiService.setApiKey(webhookApiKey);
        } else {
          await apiService.generateApiKey({
            username: activeEmail,
            password: trialCredentials.password,
            planCode: "TRIAL",
          });
        }

        apiService.setPlanCode("TRIAL");
        markTrialEmailUsed(activeEmail);
        setStoredPlan("TRIAL");

        await completeTrialProvisioning(activeEmail);

        setStatusState({
          state: "success",
          message: "Trial activated! Redirecting you to login.",
        });
        hasRedirectedRef.current = true;
        const loginParams = new URLSearchParams({ trial: "1" });
        loginParams.set("email", activeEmail);
        router.replace(`/login?${loginParams.toString()}`);
      } catch (error) {
        console.error("Trial activation failed", error);
        setError(
          error?.message || "Failed to activate free trial. Please try again."
        );
        setStatusState({
          state: "error",
          message: "Trial activation failed.",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      setStatusError("");
      const planDetails = PLAN_OPTIONS.find(
        (plan) => plan.code === selectedPlan
      );

      const uniqueSuffix = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      setOrderSuffix(uniqueSuffix);

      const chargeValue = planDetails?.price || "0";
      const webhookPayload = {
        user_id: activeUserId,
        email: activeEmail,
        plan_code: selectedPlan,
        charge: chargeValue,
        harga: chargeValue,
        order_suffix: uniqueSuffix,
        source: "frontend",
      };

      setStoredPlan(selectedPlan);
      apiService.setPlanCode(selectedPlan);

      const webhookResponse = await apiService.notifyPaymentWebhook(
        webhookPayload
      );
      console.log("[payment] webhook response", webhookResponse);

      if (webhookResponse?.access_token) {
        apiService.setApiKey(webhookResponse.access_token);
      }

      const paymentMessage =
        webhookResponse?.message ||
        `Payment request submitted for ${planDetails?.name || selectedPlan}.`;
      setSuccessMessage(paymentMessage);

      const generatedOrderId =
        webhookResponse?.order_id || webhookResponse?.data?.order_id || null;
      const transactionStatusRaw =
        webhookResponse?.transaction_status ||
        webhookResponse?.data?.transaction_status ||
        null;
      const statusRaw =
        webhookResponse?.status || webhookResponse?.data?.status || null;
      const normalizedTransactionStatus =
        typeof transactionStatusRaw === "string"
          ? transactionStatusRaw.toLowerCase()
          : null;
      const normalizedStatus =
        typeof statusRaw === "string" ? statusRaw.toLowerCase() : null;
      const settlementStates = new Set(["settlement", "capture", "completed"]);
      const isImmediateSettlement =
        settlementStates.has(normalizedTransactionStatus || "") ||
        settlementStates.has(normalizedStatus || "") ||
        (webhookResponse?.success === true &&
          normalizedTransactionStatus === "settlement");
      if (generatedOrderId) {
        setOrderId(generatedOrderId);
        apiService.setLastOrderId(generatedOrderId);
      } else {
        setOrderId("");
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
      }

      if (isImmediateSettlement) {
        await finalizeSuccess(generatedOrderId, { planCode: selectedPlan });
        return;
      }

      setStatusState({
        state: "checking",
        message: "Waiting for payment confirmation...",
      });

      if (generatedOrderId) {
        void verifyPayment({ silent: true });
      } else {
        setStatusError(
          "We generated your payment request. Please check your email for instructions."
        );
        console.warn(
          "Payment webhook response did not include a redirect URL or settlement status",
          webhookResponse
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
    if (numericPrice === 0) {
      return "Free";
    }
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
        <div className="w-full max-w-md rounded-2xl bg-surface p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            {isChecking ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : (
              <svg
                className="h-6 w-6 text-accent"
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
          <h2 className="text-lg font-semibold text-foreground">
            {isChecking ? "Checking Payment" : "Payment Successful"}
          </h2>
          <p className="mt-2 text-sm text-muted">{statusState.message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background text-foreground flex justify-center px-4 sm:px-6 lg:px-8 py-10">
      {renderStatusOverlay()}
      <div className="max-w-screen-xl w-full space-y-8">
        <div className="w-full bg-surface/80 shadow-2xl shadow-accent/10 border border-surface-strong/40 rounded-3xl backdrop-blur">
          <div className="w-full p-6 sm:p-12 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">
                  Choose Your Plan
                </h1>
                <p className="mt-3 text-base sm:text-lg text-muted max-w-2xl mx-auto">
                  Unlock premium automations, WhatsApp workflows, and dedicated
                  support.
                </p>
              </div>
            </div>

            {/* Error Messages */}
            {statusError && (
              <div className="mb-4 p-4 bg-surface-strong/30 border border-red-200 text-red-600 rounded-xl max-w-3xl mx-auto text-sm">
                {statusError}
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl max-w-3xl mx-auto text-sm">
                {error}
              </div>
            )}

            {/* Plan Cards */}
            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  isSelected={selectedPlan === plan.code}
                  onSelect={() => setSelectedPlan(plan.code)}
                  formatPrice={formatPrice}
                />
              ))}
            </div>

            {/* Payment Button */}
            <div className="text-center space-y-4 mt-10">
              <button
                onClick={handlePayment}
                disabled={loading || !selectedPlan}
                className="relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent via-indigo-500 to-purple-500 text-white font-semibold py-4 px-10 rounded-2xl shadow-lg shadow-accent/30 transition hover:shadow-xl hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" /> Continue to Payment
                  </>
                )}
              </button>
              {successMessage && (
                <div className="p-4 bg-accent/10 border border-accent/30 text-accent rounded-xl max-w-xl mx-auto text-sm">
                  {successMessage}
                </div>
              )}
              <div className="text-sm text-muted max-w-2xl mx-auto space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-accent" /> Secure
                    checkout
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-accent" /> Major cards &
                    bank transfers
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4 text-accent" /> 7-day
                    guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isSelected, onSelect, formatPrice }) {
  const Icon = plan.icon || Sparkles;
  return (
    <label
      className={`relative block rounded-3xl border p-8 transition-all cursor-pointer ${
        isSelected
          ? "border-accent bg-gradient-to-br from-accent/5 to-accent/10 shadow-2xl shadow-accent/20 ring-2 ring-accent scale-105"
          : "border-surface-strong/30 bg-surface/50 hover:border-accent/40 hover:shadow-xl"
      }`}
    >
      {plan.badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
            plan.recommended
              ? "bg-accent text-white shadow-lg"
              : "bg-surface-strong/80 text-muted border border-surface-strong"
          }`}
        >
          {plan.badge}
        </span>
      )}

      <div className="text-center space-y-4">
        {/* Icon */}
        <div
          className={`inline-flex rounded-2xl p-4 ${
            isSelected ? "bg-accent/20" : "bg-surface-strong/50"
          }`}
        >
          <Icon
            className={`h-8 w-8 ${isSelected ? "text-accent" : "text-muted"}`}
          />
        </div>

        {/* Plan Name */}
        <div>
          <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
          <p className="text-sm text-muted mt-1">{plan.subtitle}</p>
        </div>

        {/* Price */}
        <div className="py-6 border-y border-surface-strong/30">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-extrabold text-foreground">
              {formatPrice(plan.price)}
            </span>
            <span className="text-lg text-muted font-medium">/month</span>
          </div>
          {plan.discountNote && (
            <p className="text-xs text-accent font-semibold mt-2">
              {plan.discountNote}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={onSelect}
          className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
            isSelected
              ? "bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent/90"
              : "bg-surface-strong/50 text-foreground hover:bg-surface-strong/70"
          }`}
        >
          {plan.code === "TRIAL"
            ? "Get Started"
            : isSelected
            ? "Current plan"
            : `Get ${plan.name}`}
        </button>

        {/* Features */}
        <ul className="mt-6 space-y-3 text-left text-sm">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  isSelected ? "text-accent" : "text-muted"
                }`}
              />
              <span className="text-muted">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <input
        type="radio"
        name="plan"
        value={plan.code}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
    </label>
  );
}

function PlanComparison({ selectedPlan }) {
  const comparison = [
    {
      label: "Unlimited AI Agents",
      tiers: { PRO_M: true, PRO_Y: true },
    },
    {
      label: "WhatsApp Automation",
      tiers: { PRO_M: true, PRO_Y: true },
    },
    {
      label: "Priority Support",
      tiers: { PRO_M: true, PRO_Y: true },
    },
    {
      label: "Dedicated Success Manager",
      tiers: { PRO_Y: true },
    },
    {
      label: "Onboarding Workshop",
      tiers: { PRO_Y: true },
    },
  ];

  return (
    <section className="mt-4">
      <div className="rounded-3xl border border-surface-strong/60 bg-background/60 p-6 shadow-inner">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h4 className="text-lg font-semibold">Compare plans</h4>
          <p className="text-sm text-muted">
            You selected <span className="font-semibold">{selectedPlan}</span>
          </p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted">
                <th className="text-left py-2">Features</th>
                <th className="text-center py-2">Pro Monthly</th>
                <th className="text-center py-2">Pro Yearly</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr
                  key={row.label}
                  className="border-t border-surface-strong/60"
                >
                  <td className="py-3 pr-4 text-foreground">{row.label}</td>
                  <td className="py-3 text-center">
                    {row.tiers.PRO_M ? (
                      <CheckCircle2 className="h-4 w-4 mx-auto text-accent" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {row.tiers.PRO_Y ? (
                      <CheckCircle2 className="h-4 w-4 mx-auto text-accent" />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
