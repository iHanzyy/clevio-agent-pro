"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import agentTemplates from "@/data/agent-templates.json";
import AiAssistat from "@/components/ui/ai-assistat";

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

    const templateId = searchParams.get("template");
    if (!templateId) {
      router.push("/dashboard/agents/templates");
      return;
    }

    const foundTemplate = agentTemplates.find((t) => t.id === templateId);
    if (!foundTemplate) {
      router.push("/dashboard/agents/templates");
      return;
    }

    setTemplate(foundTemplate);
  }, [authLoading, user, searchParams, router]);

  const handleInterviewComplete = (agentData) => {
    console.log("[TemplateChatPage] Interview completed with data:", agentData);

    setIsRedirecting(true);

    // Store agent data in sessionStorage
    sessionStorage.setItem(
      "prefilled_agent_data",
      JSON.stringify({
        ...agentData,
        template_id: template.id,
        template_name: template.name,
      })
    );

    // Redirect to create agent page
    setTimeout(() => {
      router.push("/dashboard/agents/new?prefilled=true");
    }, 1000);
  };

  const handleBackToTemplates = () => {
    router.push("/dashboard/agents/templates");
  };

  if (authLoading || !template) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm font-medium text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          <p className="text-sm font-medium text-foreground">
            Interview completed! Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b border-surface-strong/60 bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {template.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <AiAssistat
          title={`Configure ${template.name}`}
          description="Answer a few questions to customize your AI agent"
          webhookUrl="https://n8n-new.chiefaiofficer.id/webhook/templateAgent"
          sessionId={sessionId}
          metadata={{
            session_id: sessionId,
            template_id: template.id,
            template_name: template.name,
            template_category: template.category,
            template_data: {
              name: template.name,
              category: template.category,
              description: template.description,
              config: template.config,
              allowed_tools: template.allowed_tools,
            },
          }}
          onMessageReceived={(data) => {
            console.log("[TemplateChatPage] Message received:", data);
          }}
          onComplete={handleInterviewComplete}
        />
      </div>
    </div>
  );
}
