"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import AgentForm from "../components/AgentForm";
import { ArrowLeft, Bot, Sparkles, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import GOOGLE_SCOPE_MAP from "@/data/google_scope_tools.json";

const FALLBACK_GOOGLE_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const collectScopesFromMap = (toolIds = []) => {
  const scopes = new Set();
  (toolIds || []).forEach((toolId) => {
    const normalized =
      typeof toolId === "string" ? toolId.trim().toLowerCase() : "";
    if (!normalized) return;
    const mapped = GOOGLE_SCOPE_MAP?.[normalized];
    if (Array.isArray(mapped)) {
      mapped.forEach((scope) => scope && scopes.add(scope));
    }
  });
  return Array.from(scopes);
};

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilledData, setPrefilledData] = useState(null);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [guidedTourState, setGuidedTourState] = useState("idle");
  const [hasAppliedInterviewData, setHasAppliedInterviewData] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState(null);

  useEffect(() => {
    if (hasAppliedInterviewData) {
      return;
    }

    const allowDirect = searchParams.get("allowDirect") === "1";
    const fromInterview = searchParams.get("fromInterview") === "true";
    const sessionIdParam = searchParams.get("session");
    const storedData =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pendingAgentData")
        : null;

    const applyAgentData = (agentData) => {
      try {
        setPrefilledData(agentData);
        setGuidedTourState("in-progress");
        setTimeout(() => setShowGuidedTour(true), 0);
      } catch (err) {
        console.error("Failed to apply prefilled data:", err);
        setShowGuidedTour(false);
        setGuidedTourState("idle");
        setAccessDeniedReason(
          "Jawaban wawancara tidak bisa dibaca. Mulai lagi dari galeri template.",
        );
      } finally {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pendingAgentData");
        }
        setHasAppliedInterviewData(true);
      }
    };

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        console.log("[AgentNew] Found pendingAgentData in sessionStorage", parsed);
        applyAgentData(parsed);
        return;
      } catch (err) {
        console.error("Failed to parse prefilled data:", err);
      }
    } else {
      console.log("[AgentNew] No pendingAgentData in sessionStorage");
    }

    // Fallback 1: use lastTemplateSessionId when URL is missing session
    const lastSessionId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("lastTemplateSessionId")
        : null;
    const effectiveSessionId = sessionIdParam || lastSessionId;

    const fetchFromSessionId = async () => {
      if (!effectiveSessionId) return false;
      try {
        const res = await fetch(
          `/api/webhook/n8n-template?session=${encodeURIComponent(effectiveSessionId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          console.warn("[AgentNew] fallback poll miss", res.status);
          return false;
        }
        const data = await res.json();
        if (data?.agentData) {
          const agentData = {
            ...data.agentData,
            fromTemplate: true,
            templateId: data.template || data.agentData?.template_id,
          };
          if (typeof window !== "undefined") {
            sessionStorage.setItem("pendingAgentData", JSON.stringify(agentData));
          }
          console.log("[AgentNew] Applied agentData from fallback poll", agentData);
          applyAgentData(agentData);
          return true;
        }
      } catch (err) {
        console.error("[AgentNew] fallback poll error", err);
      }
      return false;
    };

    // Attempt fallback poll when redirected with session param
    if (fromInterview && effectiveSessionId) {
      fetchFromSessionId().then((found) => {
        if (found) return;
        if (!allowDirect) {
          setAccessDeniedReason(
            "Kami tidak menemukan hasil wawancara Anda. Mulai ulang dari galeri template.",
          );
          setHasAppliedInterviewData(true);
        }
      });
      return;
    }

    // Last safety: when fromInterview but no session info anywhere
    if (fromInterview && !effectiveSessionId && !allowDirect) {
      setAccessDeniedReason(
        "Kami tidak menemukan hasil wawancara Anda. Mulai ulang dari galeri template.",
      );
      setHasAppliedInterviewData(true);
      return;
    }

    if (!fromInterview && !allowDirect) {
      setAccessDeniedReason(
        "Customize agent sekarang wajib dimulai dari wawancara. Silakan pilih template dulu.",
      );
    } else if (fromInterview && !storedData && !allowDirect) {
      setAccessDeniedReason(
        "Kami tidak menemukan hasil wawancara Anda. Mulai ulang dari galeri template.",
      );
    }

    setShowGuidedTour(false);
    setGuidedTourState("idle");
    setHasAppliedInterviewData(true);
  }, [searchParams, hasAppliedInterviewData]);

  // Update text untuk state
  const guidedTourHeading =
    guidedTourState === "completed"
      ? "Guided review complete"
      : guidedTourState === "in-progress"
      ? "Guided review in progress"
      : "Configuration imported";

  const guidedTourDescription =
    guidedTourState === "completed"
      ? "You confirmed these fields. Revisit the walkthrough anytime if you need to tweak the configuration."
      : guidedTourState === "in-progress"
      ? "Follow the guided steps to review your agent configuration."
      : "We imported your interview responses. Review the configuration before creating your agent.";

  const guidedTourButtonLabel =
    guidedTourState === "completed" ? "Review again" : "Start tour";

  if (authLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <Card className="w-full max-w-sm sm:max-w-md mx-4 border-surface-strong/60 shadow-xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/10"
            >
              <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg font-semibold text-foreground mb-2"
            >
              Checking Authentication
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-sm"
            >
              Verifying your session...
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!user) {
    return null;
  }

  if (accessDeniedReason) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Interview required
          </h1>
          <p className="text-sm text-muted-foreground">{accessDeniedReason}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard/agents/templates")}
              className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-hover px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg sm:w-auto"
            >
              Kembali ke galeri template
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-lg border border-surface-strong/60 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface transition-colors sm:w-auto"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const normalizedPlanCode = (
    user?.subscription?.plan_code ||
    user?.subscription?.planCode ||
    apiService.getPlanCode?.() ||
    ""
  )
    .toString()
    .toLowerCase();
  const isTrialUser = Boolean(user?.is_trial || normalizedPlanCode === "trial");
  const isProMonthlyUser = normalizedPlanCode === "pro_m";

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    try {
      const agent = await apiService.createAgent(payload);

      if (!agent?.id) {
        throw new Error("Agent created but response did not include an ID.");
      }

      if (
        typeof window !== "undefined" &&
        Array.isArray(payload?.google_tools) &&
        payload.google_tools.length > 0
      ) {
        try {
          window.sessionStorage.setItem(
            "pendingGoogleConnectAgent",
            agent.id.toString()
          );
        } catch (error) {
          console.warn("Failed to persist pending Google connect context", error);
        }
      }

      const params = new URLSearchParams();

      // Per-agent Google OAuth: kick off /auth/google immediately after creation.
      let authUrl = null;
      let authState = null;

      const googleTools =
        Array.isArray(payload?.google_tools) && payload.google_tools.length > 0
          ? payload.google_tools
          : [];

      if (googleTools.length > 0) {
        let scopes = collectScopesFromMap(googleTools);

        if (scopes.length === 0) {
          try {
            const scopesResp = await apiService.getRequiredToolScopes(googleTools);
            if (Array.isArray(scopesResp?.scopes) && scopesResp.scopes.length > 0) {
              scopes = scopesResp.scopes;
            }
          } catch (error) {
            console.warn("Failed to fetch required Google scopes", error);
          }
        }

        if (scopes.length === 0) {
          scopes = [FALLBACK_GOOGLE_SCOPE];
        }

        try {
          const googleAuth = await apiService.startGoogleAuth(scopes, agent.id);
          authUrl = googleAuth?.auth_url || googleAuth?.authUrl || null;
          authState = googleAuth?.auth_state || googleAuth?.authState || null;
        } catch (error) {
          console.error("Failed to initiate Google OAuth for new agent", error);
        }
      }

      if (!authUrl && agent.auth_required && agent.auth_url) {
        authUrl = agent.auth_url;
        authState = agent.auth_state || null;
      }

      if (authUrl) {
        params.set("authUrl", authUrl);
        if (authState) {
          params.set("authState", authState);
        }
      }

      if (isTrialUser) {
        try {
          sessionStorage.setItem(
            "trialAgentContext",
            JSON.stringify({
              agentId: agent.id,
              name: agent.name,
              createdAt: new Date().toISOString(),
            })
          );
        } catch (error) {
          console.warn("Failed to persist trial agent context", error);
        }
        router.push(
          params.toString()
            ? `/trial/chat?agentId=${agent.id}&${params.toString()}`
            : `/trial/chat?agentId=${agent.id}`
        );
      } else {
        router.push(
          params.toString()
            ? `/dashboard/agents/${agent.id}?${params.toString()}`
            : `/dashboard/agents/${agent.id}`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuidedTourClose = () => {
    setShowGuidedTour(false);
    setGuidedTourState("completed");
  };

  const handleGuidedTourStart = () => {
    setGuidedTourState("in-progress");
    setShowGuidedTour(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-spacing section-spacing">
        <div className="mx-auto max-w-4xl">
          {/* Modern Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/dashboard/agents")}
              className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Agents
            </motion.button>

            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
              >
                Create a New Agent
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-lg max-w-2xl mx-auto"
              >
                {prefilledData
                  ? "Review and adjust the agent configuration from your interview."
                  : "Configure the tools and behaviour for your assistant. You can adjust these settings later from the agent detail page."}
              </motion.p>
            </div>
          </motion.div>

          {/* Guided Tour Notification */}
          <AnimatePresence>
            {prefilledData && guidedTourState !== "in-progress" && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-8"
              >
                <Card className="border-accent/30 bg-accent/5">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex-shrink-0"
                        >
                          <Sparkles className="h-5 w-5 text-accent" />
                        </motion.div>
                        <div>
                          <p className="font-semibold text-accent">{guidedTourHeading}</p>
                          <p className="text-muted text-sm">{guidedTourDescription}</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleGuidedTourStart}
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-accent to-accent-hover px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg flex-shrink-0"
                      >
                        {guidedTourButtonLabel}
                      </motion.button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agent Form with Enhanced Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-surface-strong/60 shadow-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 mb-4"
                  >
                    <Bot className="h-8 w-8 text-purple-600" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Agent Configuration</h2>
                  <p className="text-muted-foreground">
                    {prefilledData
                      ? "Review and customize your imported settings"
                      : "Build your AI agent with powerful tools and capabilities"
                    }
                  </p>
                </div>

                <AgentForm
                  mode="create"
                  initialValues={prefilledData}
                  onSubmit={handleCreate}
                  isSubmitting={isSubmitting}
                  isTrialPlan={isTrialUser}
                  isProMonthlyPlan={isProMonthlyUser}
                  startGuidedTour={showGuidedTour}
                  onGuidedTourClose={handleGuidedTourClose}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="border-surface-strong/20 bg-gradient-to-r from-surface to-surface-strong/30">
              <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Need Help?</h3>
                        <p className="text-sm text-muted-foreground">
                          Semua agen harus melewati wawancara template. Kembali ke galeri jika ingin memulai ulang konfigurasi.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
