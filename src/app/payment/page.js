"use client";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  readTrialAgentPayload,
  clearTrialAgentPayload,
} from "@/lib/trialStorage";
import { markTrialEmailUsed } from "@/lib/trialGuard";

const PLAN_OPTIONS = [
  { code: "TRIAL", name: "Free Trial", price: "0", duration_days: 14 },
  { code: "PRO_M", name: "Pro Monthly", price: "100000", duration_days: 30 },
  { code: "PRO_Y", name: "Pro Yearly", price: "1000000", duration_days: 365 },
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
      : null,
  );
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [statusState, setStatusState] = useState({
    state: "idle",
    message: "",
  });
  const [statusError, setStatusError] = useState("");
  const [orderSuffix, setOrderSuffix] = useState(() => Date.now().toString());
  const { user, loading: authLoading, updateSubscription, applySubscription } =
    useAuth();
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
    [selectedPlan, storedPlan],
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
    [trialAgentDraft, clearTrialCredentials],
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
              err,
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
    ],
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
      "trialRegistrationCredentials",
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
      const response = await apiService.getInformationN8N(
        orderId,
        orderSuffix,
      );

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
      pendingRegistration,
      isSettled,
      user,
    ],
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
        normalized,
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
    const activeUserId =
      user?.user_id || pendingRegistration?.user_id || "";

    if (!activeEmail || !activeUserId) {
      setError(
        "Missing registrant information. Please restart registration or contact support.",
      );
      return;
    }

    if (selectedPlan === "TRIAL") {
      if (!trialAgentDraft?.agentPayload) {
        setError(
          "We lost your trial configuration. Please restart from the template gallery.",
        );
        return;
      }
      if (!trialCredentials?.password) {
        setError(
          "Trial activation requires your registration credentials. Please restart the trial enrollment.",
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
          },
        );

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(
            detail || "Trial activation webhook returned an error.",
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
          error?.message || "Failed to activate free trial. Please try again.",
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
        (plan) => plan.code === selectedPlan,
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

      const generatedOrderId =
        webhookResponse?.order_id ||
        webhookResponse?.data?.order_id ||
        null;
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
          "We generated your payment request. Please check your email for instructions.",
        );
        console.warn(
          "Payment webhook response did not include a redirect URL or settlement status",
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
    <div className="min-h-screen bg-surface text-foreground flex justify-center">
      {renderStatusOverlay()}
      <div className="max-w-screen-xl m-0 sm:m-10 bg-surface shadow sm:rounded-lg flex justify-center flex-1">
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
            <h1 className="text-3xl font-extrabold text-foreground">
              Choose Your Plan
            </h1>
            <p className="mt-4 text-lg text-muted">
              Select a subscription plan to activate your account
            </p>
          </div>

          {statusError && (
            <div className="mb-6 p-4 bg-surface-strong/40 border border-surface-strong/60 text-muted rounded max-w-xl mx-auto text-sm">
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
                      ? "border-accent bg-accent/10"
                      : "border-surface-strong/60 hover:border-accent/40"
                  }`}
                  onClick={() => setSelectedPlan(plan.code)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <p className="text-muted">{plan.duration_days} days</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.code === "PRO_Y" && (
                        <div className="text-sm text-accent">Save 17%!</div>
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
                    <span className="text-sm text-muted">
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
                className="bg-accent/100 hover:bg-accent-hover text-accent-foreground font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Continue to Payment"}
              </button>
              {successMessage && (
                <div className="mt-4 p-4 bg-accent/10 border border-accent/40 text-accent rounded max-w-xl mx-auto text-sm">
                  {successMessage}
                </div>
              )}
              <p className="mt-4 text-sm text-muted">
                If you were not redirected automatically, please check the
                payment instructions sent by our billing partner. Keep this
                order ID for reference:{" "}
                <span className="font-semibold">{orderId || "pending"}</span>.
              </p>
            </div>

            <div className="mt-8 text-center">
              <h4 className="text-lg font-semibold mb-4">What you get:</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-muted">
                <div>✅ Unlimited AI Agents</div>
                <div>✅ WhatsApp Integration</div>
                <div>✅ Document Upload (RAG)</div>
                <div>✅ Advanced Tools</div>
                <div>✅ Priority Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
