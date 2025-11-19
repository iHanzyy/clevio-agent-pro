"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { ArrowLeft, ArrowRight, Bot, Settings, Sparkles } from "lucide-react";

const FORM_STEPS = [
  {
    id: "basics",
    title: "Agent Information",
    description: "Name and basic details about your agent",
    icon: Bot,
  },
  {
    id: "capabilities",
    title: "Capabilities & Tools",
    description: "Choose what your agent can do",
    icon: Settings,
  },
  {
    id: "personality",
    title: "Personality & Instructions",
    description: "Define how your agent should behave",
    icon: Sparkles,
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Review your configuration and continue to registration",
    icon: null,
  },
];

export default function TrialAgentFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const fromInterview = searchParams.get("fromInterview") === "true";
  const pendingAgentData = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const data = sessionStorage.getItem("pendingAgentData");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (fromInterview && pendingAgentData) {
      setFormData(pendingAgentData);
    }
  }, [fromInterview, pendingAgentData]);

  const handleStepChange = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < FORM_STEPS.length) {
      setCurrentStep(stepIndex);
      setServerError("");
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setServerError("");
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setServerError("");
    }
  }, [currentStep]);

  const handleContinueToRegistration = useCallback(() => {
    // Store the agent configuration in localStorage for later use
    if (typeof window !== "undefined") {
      localStorage.setItem("trialPendingAgentPayload", JSON.stringify(formData));
    }

    // Redirect to registration with trial flag
    router.push("/register?trial=1");
  }, [router, formData]);

  const handleFormChange = useCallback((newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  const getStepContent = useCallback(() => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleFormChange({ name: e.target.value })}
                placeholder="e.g., Customer Support Assistant"
                className="w-full rounded-xl border border-surface-strong/60 bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/60 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => handleFormChange({ description: e.target.value })}
                placeholder="Briefly describe what this agent does..."
                rows={3}
                className="w-full rounded-xl border border-surface-strong/60 bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/60 transition-all resize-none"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-surface/50 rounded-xl p-4 border border-surface-strong/60">
              <h3 className="font-semibold text-foreground mb-2">Trial Limitations</h3>
              <p className="text-sm text-muted">
                During your trial, you can use basic Gmail and Calendar tools. Premium tools and advanced features will be available after upgrading to a paid plan.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-3">
                Available Tools (Trial)
              </label>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 rounded-lg border border-surface-strong/60 bg-background p-4 cursor-pointer hover:border-accent transition">
                  <input
                    type="checkbox"
                    checked={formData.gmail || false}
                    onChange={(e) => handleFormChange({ gmail: e.target.checked })}
                    className="mt-1 h-4 w-4 text-accent border-surface-strong/60 rounded focus:ring-accent"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Gmail Integration
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      Read, send, and manage emails through your agent
                    </span>
                  </span>
                </label>

                <label className="flex items-start space-x-3 rounded-lg border border-surface-strong/60 bg-background p-4 cursor-pointer hover:border-accent transition">
                  <input
                    type="checkbox"
                    checked={formData.calendar || false}
                    onChange={(e) => handleFormChange({ calendar: e.target.checked })}
                    className="mt-1 h-4 w-4 text-accent border-surface-strong/60 rounded focus:ring-accent"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Calendar Integration
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      Schedule and manage calendar events
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.systemPrompt || ""}
                onChange={(e) => handleFormChange({ systemPrompt: e.target.value })}
                placeholder="Define how your agent should behave, what tone to use, and any constraints..."
                rows={8}
                className="w-full rounded-xl border border-surface-strong/60 bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/60 transition-all resize-none"
              />
              <p className="mt-2 text-xs text-muted">
                Tip: Be specific about the agent&apos;s role, tone, and limitations
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-surface-strong/60 bg-surface p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Review Your Agent</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Name</span>
                  <p className="mt-1 text-sm text-foreground">{formData.name || "Untitled Agent"}</p>
                </div>

                {formData.description && (
                  <div>
                    <span className="text-xs font-medium text-muted uppercase tracking-wide">Description</span>
                    <p className="mt-1 text-sm text-foreground">{formData.description}</p>
                  </div>
                )}

                {(formData.gmail || formData.calendar) && (
                  <div>
                    <span className="text-xs font-medium text-muted uppercase tracking-wide">Enabled Tools</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {formData.gmail && <span className="rounded-full bg-surface-strong/40 px-2 py-0.5 text-xs text-muted">Gmail</span>}
                      {formData.calendar && <span className="rounded-full bg-surface-strong/40 px-2 py-0.5 text-xs text-muted">Calendar</span>}
                    </div>
                  </div>
                )}

                {formData.systemPrompt && (
                  <div>
                    <span className="text-xs font-medium text-muted uppercase tracking-wide">System Instructions</span>
                    <p className="mt-1 text-sm text-muted line-clamp-3">{formData.systemPrompt}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleContinueToRegistration}
              disabled={isSubmitting || !formData.name}
              className="w-full rounded-xl bg-accent text-white px-6 py-3 font-semibold shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Continue to Registration"
              )}
            </button>

            <p className="text-center text-xs text-muted">
              Create your account to activate this agent and start your free trial
            </p>
          </div>
        );

      default:
        return null;
    }
  }, [currentStep, formData, handleFormChange, handleContinueToRegistration, isSubmitting]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/trial/templates")}
            className="mb-4 flex items-center text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </button>

          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
            Configure Your Trial Agent
          </h1>
          <p className="text-sm text-muted sm:text-base">
            Build your AI agent step by step, then create your account to activate it
          </p>
        </div>

        {/* Error Display */}
        {serverError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error</h3>
                <p className="mt-1 text-sm text-red-700">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => handleStepChange(index)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      isActive
                        ? "border-accent bg-accent text-white"
                        : isCompleted
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-surface-strong/60 bg-surface text-muted"
                    }`}
                  >
                    {StepIcon ? (
                      <StepIcon className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </button>

                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      isActive ? "text-foreground" : isCompleted ? "text-accent" : "text-muted"
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted">{step.description}</p>
                  </div>

                  {index < FORM_STEPS.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-4 ${
                      index < currentStep ? "bg-accent" : "bg-surface-strong/60"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="rounded-2xl border border-surface-strong/60 bg-surface p-6 sm:p-8">
          {getStepContent()}
        </div>

        {/* Navigation */}
        {currentStep !== 3 && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === FORM_STEPS.length - 1}
              className="flex items-center px-6 py-2 bg-accent text-white rounded-xl font-medium shadow-lg shadow-accent/25 hover:bg-accent/90 hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}