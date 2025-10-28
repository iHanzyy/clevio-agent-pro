"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import TemplateChat from "@/components/TemplateChat";
import templatesData from "@/data/agent-templates.json";

export default function TemplateChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState(null);
  const [sessionId] = useState(() => `template-session-${Date.now()}`);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!user.subscription?.is_active) {
      router.push("/payment");
      return;
    }

    // Get template from query params
    const templateId = searchParams.get("template");
    if (!templateId) {
      router.push("/dashboard/agents/templates");
      return;
    }

    const foundTemplate = templatesData.find((t) => t.id === templateId);
    if (!foundTemplate) {
      router.push("/dashboard/agents/templates");
      return;
    }

    setTemplate(foundTemplate);
  }, [authLoading, user, searchParams, router]);

  const handleInterviewComplete = (agentData) => {
    setIsRedirecting(true);

    // Store agent data in sessionStorage for pre-filling form
    sessionStorage.setItem("pendingAgentData", JSON.stringify(agentData));

    // Redirect to new agent page
    router.push("/dashboard/agents/new?fromInterview=true");
  };

  const handleBackToTemplates = () => {
    if (
      confirm(
        "Are you sure you want to leave? Your interview progress will be lost."
      )
    ) {
      router.push("/dashboard/agents/templates");
    }
  };

  if (authLoading || !template) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="mt-4 text-muted">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="mt-4 text-muted">
            Interview complete! Redirecting to agent form...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-surface-strong/60 bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToTemplates}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-strong/60 text-muted transition-colors hover:bg-surface-strong/60"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Agent Interview
              </h1>
              <p className="text-sm text-muted">Customizing: {template.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
              {template.name.charAt(0)}
            </div>
            <span className="inline-block rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
              {template.category}
            </span>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-5xl p-6">
          <div className="h-full overflow-hidden rounded-2xl border border-surface-strong/60 bg-surface shadow-lg">
            <TemplateChat
              template={template}
              sessionId={sessionId}
              onInterviewComplete={handleInterviewComplete}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
