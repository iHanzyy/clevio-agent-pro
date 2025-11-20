"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AgentForm from "@/app/dashboard/agents/components/AgentForm";
import { buildPrefilledFormValues } from "@/lib/agentInterviewUtils";
import { saveTrialAgentPayload } from "@/lib/trialStorage";

const TRIAL_TOUR_STORAGE_KEY = "trialAgentTourSeen";

function TrialAgentFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prefilledData, setPrefilledData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldShowGuidedTour, setShouldShowGuidedTour] = useState(false);

  useEffect(() => {
    const fromInterview = searchParams.get("fromInterview") === "true";
    const storedData = sessionStorage.getItem("pendingAgentData");
    if (storedData) {
      try {
        const agentData = JSON.parse(storedData);
        const formValues = buildPrefilledFormValues(agentData);
        if (formValues) {
          setPrefilledData(formValues);
          setMetadata({
            templateId: agentData.templateId || null,
            fromTemplate: Boolean(agentData.fromTemplate),
          });
        } else {
          setStatusMessage(
            "We couldn’t translate your interview answers. Please restart the flow.",
          );
        }
      } catch (error) {
        console.error("[TrialAgentForm] Failed to parse interview data", error);
        setStatusMessage(
          "We could not load your interview results. Please restart the trial flow.",
        );
      } finally {
        sessionStorage.removeItem("pendingAgentData");
      }
    } else if (!fromInterview) {
      setStatusMessage(
        "We could not find your interview answers. Start from a template again.",
      );
    }
    setIsReady(true);
  }, [searchParams]);

  const handleSaveDraft = useCallback(
    async (payload) => {
      setIsSubmitting(true);
      try {
        const enrichedPayload = {
          ...payload,
          plan_code: payload.plan_code || "TRIAL",
        };
        saveTrialAgentPayload({
          agentPayload: enrichedPayload,
          templateId: metadata?.templateId || null,
          fromTemplate: metadata?.fromTemplate || false,
        });
        router.push("/register?trial=1");
      } finally {
        setIsSubmitting(false);
      }
    },
    [metadata, router],
  );

  useEffect(() => {
    if (!prefilledData || typeof window === "undefined") {
      return;
    }

    const hasSeenTour = window.localStorage.getItem(TRIAL_TOUR_STORAGE_KEY);
    if (!hasSeenTour) {
      setShouldShowGuidedTour(true);
    }
  }, [prefilledData]);

  const handleGuidedTourClose = useCallback(() => {
    setShouldShowGuidedTour(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TRIAL_TOUR_STORAGE_KEY, "1");
      } catch (error) {
        console.warn("Failed to persist trial guided tour state", error);
      }
    }
  }, []);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-4 text-sm text-muted">
            Loading your interview results…
          </p>
        </div>
      </div>
    );
  }

  if (!prefilledData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Your configuration isn’t ready
        </h1>
        <p className="max-w-md text-sm text-muted">
          {statusMessage ||
            "We need your interview answers to prefill this form. Please restart from the template gallery."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/trial/templates")}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow hover:bg-accent-hover"
        >
          Back to templates
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-10">
      <div className="mb-8 rounded-2xl border border-accent/20 bg-accent/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Trial setup
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Review your agent before signing up
        </h1>
        <p className="mt-3 text-sm text-muted">
          We pre-filled the configuration from your interview. Adjust anything,
          then continue to create your account so we can launch the agent.
        </p>
      </div>

      <AgentForm
        mode="create"
        initialValues={prefilledData}
        onSubmit={handleSaveDraft}
        isSubmitting={isSubmitting}
        isTrialPlan
        startGuidedTour={shouldShowGuidedTour}
        onGuidedTourClose={handleGuidedTourClose}
        submitButtonLabel="Save & Continue"
      />
    </div>
  );
}

export default function TrialAgentFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted">Preparing trial form…</p>
          </div>
        </div>
      }
    >
      <TrialAgentFormContent />
    </Suspense>
  );
}
