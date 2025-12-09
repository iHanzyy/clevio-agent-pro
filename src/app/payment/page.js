"use client";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle, CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Rocket,
  Loader2,
  ArrowRight,
  Crown,
  Star,
  Check,
  AlertCircle,
  } from "lucide-react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  readTrialAgentPayload,
  clearTrialAgentPayload,
} from "@/lib/trialStorage";
import { markTrialEmailUsed } from "@/lib/trialGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLAN_OPTIONS = [
  {
    code: "TRIAL",
    name: "Free Trial",
    subtitle: "Perfect for getting started",
    price: "0",
    duration_days: 14,
    badge: "Start free",
    description: "Test Clevio for two weeks with full access to core features.",
    features: [
      "Create up to 2 agents",
      "Sample knowledge base",
      "Community support",
      "Basic automation tools",
    ],
    icon: Sparkles,
    highlight: "0 Rp - No credit card required",
  },
  {
    code: "PRO_M",
    name: "Pro Monthly",
    subtitle: "Popular for growing businesses",
    price: "750000",
    originalPrice: "1000000",
    duration_days: 30,
    badge: "Most popular",
    description: "Scale your team with monthly flexibility and all features.",
    features: [
      "Unlimited agents",
      "WhatsApp automation",
      "Advanced tools & RAG",
      "Priority chat support",
      "Custom integrations",
    ],
    icon: CalendarClock,
    recommended: true,
    highlight: "25% OFF for limited time",
  },
  {
    code: "PRO_Y",
    name: "Pro Yearly",
    subtitle: "Best value for established businesses",
    price: "1000000",
    duration_days: 365,
    badge: "Best value",
    description: "Maximize savings with comprehensive yearly coverage.",
    features: [
      "Everything in Pro Monthly",
      "Dedicated success manager",
      "Early feature access",
      "1:1 onboarding workshop",
      "Custom training sessions",
    ],
    icon: Rocket,
    discountNote: "Save Rp 1.000.000 vs monthly",
    highlight: "Most popular choice",
  },
];

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Loading Payment Details</h3>
              <p className="text-sm text-muted-foreground">Please wait while we prepare your payment options...</p>
            </div>
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

    const registrationEmail =
      pendingRegistration?.email || queryEmail || "";
    const registrationUserId =
      pendingRegistration?.user_id || queryUserId || "";

    const activeEmail = registrationEmail || user?.email || "";
    const activeUserId = registrationUserId || user?.user_id || "";

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
    const isError = statusState.state === "error";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl bg-card border border-border p-6 text-center card-shadow"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {isChecking ? (
              <div className="bg-primary rounded-full h-16 w-16 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            ) : isError ? (
              <div className="bg-destructive rounded-full h-16 w-16 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            ) : (
              <div className="bg-success rounded-full h-16 w-16 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {isChecking ? "Checking Payment" : isError ? "Payment Failed" : "Payment Successful"}
          </h2>
          <p className="text-muted-foreground">{statusState.message}</p>

          {!isChecking && !isError && (
            <div className="mt-6 space-y-3">
              <div className="w-full bg-success/10 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2 text-sm text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span>Transaction confirmed</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStatusOverlay()}

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="space-y-4">
            <Badge className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Premium Plans
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Choose Your Perfect Plan
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Unlock powerful AI automation, WhatsApp workflows, and dedicated support to transform your business
            </p>
          </div>
        </motion.div>

        {/* Trust Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-12"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span>Secure Payment Processing</span>
          </div>
        </motion.div>

        {/* Error Messages */}
        {statusError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <Card className="card-shadow border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{statusError}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <Card className="card-shadow border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Plan Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6 md:gap-8 lg:grid-cols-3 mb-12"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <PlanCard
                plan={plan}
                isSelected={selectedPlan === plan.code}
                onSelect={() => setSelectedPlan(plan.code)}
                formatPrice={formatPrice}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <Card className="card-shadow border-l-4 border-l-success bg-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <p className="text-sm text-success">{successMessage}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

  
        {/* Payment Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-6"
        >
          <Button
            onClick={handlePayment}
            disabled={loading || !selectedPlan}
            size="lg"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-primary text-white hover:bg-primary/90 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>Secure Checkout</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Bank Transfer</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span>Instant Access</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isSelected, onSelect, formatPrice }) {
  const Icon = plan.icon || Sparkles;
  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-300 hover:card-hover active:scale-95",
        isSelected
          ? "ring-2 ring-primary bg-gradient-to-br from-primary/5 to-primary/10 border-primary"
          : "border-border bg-card hover:border-primary/40"
      )}
      onClick={onSelect}
    >
      <div className="p-6 md:p-8">
        {plan.badge && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
            <Badge
              variant={plan.recommended ? "default" : "secondary"}
              className={cn(
                "px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-lg",
                plan.recommended
                  ? "bg-gradient-primary text-white"
                  : "bg-surface text-muted-foreground border"
              )}
            >
              {plan.badge}
            </Badge>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border p-4">
            <Icon
              className={cn(
                "h-8 w-8",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
          </div>
        </div>

        {/* Price Section */}
        <div className="py-6 border-y border-border space-y-4">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl md:text-5xl font-extrabold text-foreground">
                {formatPrice(plan.price)}
              </span>
              <span className="text-lg md:text-xl text-muted-foreground">/month</span>
            </div>

            {plan.originalPrice && (
              <div className="text-sm text-muted-foreground line-through">
                {formatPrice(plan.originalPrice)}
              </div>
            )}

            {plan.discountNote && (
              <div className="flex items-center justify-center gap-2">
                <Badge variant="success" className="text-xs font-semibold">
                  {plan.discountNote}
                </Badge>
              </div>
            )}
          </div>

          {plan.highlight && (
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">{plan.highlight}</span>
            </div>
          )}
        </div>

        {/* Select Button */}
        <Button
          onClick={onSelect}
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          size="lg"
        >
          {plan.code === "TRIAL" ? "Get Started" : isSelected ? "Selected" : "Choose Plan"}
        </Button>

        {/* Features */}
        <div className="mt-6 space-y-3">
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className={cn(
                  "h-5 w-5 mt-0.5 flex-shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <input
        type="radio"
        name="plan"
        value={plan.code}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
    </Card>
  );
}
