"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AgentForm from "../components/AgentForm";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { buildPrefilledFormValues } from "@/lib/agentInterviewUtils";

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilledData, setPrefilledData] = useState(null);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [guidedTourState, setGuidedTourState] = useState("idle");
  const [hasAppliedInterviewData, setHasAppliedInterviewData] = useState(false);

  useEffect(() => {
    if (hasAppliedInterviewData) {
      return;
    }

    const fromInterview = searchParams.get("fromInterview");
    if (fromInterview === "true") {
      const storedData = sessionStorage.getItem("pendingAgentData");
      if (storedData) {
        try {
          const agentData = JSON.parse(storedData);
          const formData = buildPrefilledFormValues(agentData);
          if (formData) {
            setPrefilledData(formData);
          }
          // TUNDA open ke frame berikutnya agar child sudah render
          setGuidedTourState("in-progress");
          setTimeout(() => setShowGuidedTour(true), 0);
          sessionStorage.removeItem("pendingAgentData");
        } catch (err) {
          console.error("Failed to parse prefilled data:", err);
          setShowGuidedTour(false);
          setGuidedTourState("idle");
        } finally {
          setHasAppliedInterviewData(true);
        }
        return;
      }
    }

    setShowGuidedTour(false);
    setGuidedTourState("idle");
    setHasAppliedInterviewData(true);
  }, [searchParams, hasAppliedInterviewData]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isTrialUser =
    user?.is_trial ||
    user?.subscription?.plan_code?.toLowerCase?.() === "trial" ||
    false;

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    try {
      const agent = await apiService.createAgent(payload);

      if (!agent?.id) {
        throw new Error("Agent created but response did not include an ID.");
      }

      const params = new URLSearchParams();
      if (agent.auth_required && agent.auth_url) {
        params.set("authUrl", agent.auth_url);
        if (agent.auth_state) {
          params.set("authState", agent.auth_state);
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Create a New Agent
        </h1>
        <p className="mt-2 text-sm text-muted">
          {prefilledData
            ? "Review and adjust the agent configuration from your interview."
            : "Configure the tools and behaviour for your assistant. You can adjust these settings later from the agent detail page."}
        </p>
        {prefilledData && guidedTourState !== "in-progress" && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-foreground md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-accent">{guidedTourHeading}</p>
              <p className="text-muted">{guidedTourDescription}</p>
            </div>
            <button
              type="button"
              onClick={handleGuidedTourStart}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-md transition hover:bg-accent-hover"
            >
              {guidedTourButtonLabel}
            </button>
          </div>
        )}
      </div>

      <AgentForm
        mode="create"
        initialValues={prefilledData}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        startGuidedTour={showGuidedTour}
        onGuidedTourClose={handleGuidedTourClose}
      />
    </div>
  );
}
