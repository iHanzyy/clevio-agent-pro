"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import agentTemplates from "@/data/agent-templates.json";
import AiAssistat from "@/components/ui/ai-assistat";

export default function TemplateChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const completionHandledRef = useRef(false);

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

  useEffect(() => {
    if (!template) return;

    const sessionFromQuery = searchParams.get("session");

    if (sessionFromQuery) {
      setSessionId(sessionFromQuery);
      return;
    }

    const newSessionId =
      typeof window !== "undefined" && window.crypto?.randomUUID
        ? `template-session-${window.crypto.randomUUID()}`
        : `template-session-${Date.now()}`;

    const params = new URLSearchParams(searchParams.toString());
    params.set("session", newSessionId);

    router.replace(`/dashboard/agents/templates/chat?${params.toString()}`, {
      scroll: false,
    });
    setSessionId(newSessionId);
  }, [template, searchParams, router]);

  useEffect(() => {
    if (!sessionId || !template) return;

    const registerSession = async () => {
      try {
        await fetch("/api/webhook/n8n-template", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            templateId: template.id,
          }),
        });
      } catch (error) {
        console.error("[TemplateChatPage] Failed to register session:", error);
      }
    };

    registerSession();
  }, [sessionId, template]);

  const metadata = useMemo(() => {
    if (!template) return null;

    return {
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
    };
  }, [template]);

  const normalizeAgentData = (agentData) => {
    if (!agentData || typeof agentData !== "object") return agentData;

    const allowedTools = new Set();

    if (Array.isArray(agentData.allowed_tools)) {
      agentData.allowed_tools.forEach((tool) => {
        if (typeof tool === "string" && tool.trim()) {
          allowedTools.add(tool.trim());
        }
      });
    }

    if (Array.isArray(agentData.mcp_tools)) {
      agentData.mcp_tools.forEach((tool) => {
        if (typeof tool === "string" && tool.trim()) {
          allowedTools.add(tool.trim());
        }
      });
    }

    if (agentData.google_tools) {
      const rawValue = agentData.google_tools;
      let parsedTools = [];

      if (Array.isArray(rawValue)) {
        parsedTools = rawValue;
      } else if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              parsedTools = parsed;
            }
          } catch (error) {
            console.warn(
              "[TemplateChatPage] Failed to parse google_tools JSON string:",
              error
            );
          }
        }

        if (parsedTools.length === 0) {
          parsedTools = trimmed
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }

      parsedTools.forEach((tool) => {
        if (typeof tool === "string" && tool.trim()) {
          allowedTools.add(tool.trim());
        }
      });
    }

    return {
      ...agentData,
      allowed_tools: Array.from(allowedTools),
      mcp_tools: Array.isArray(agentData.mcp_tools) ? agentData.mcp_tools : [],
    };
  };

  const handleInterviewComplete = useCallback(
    (rawAgentData) => {
      if (completionHandledRef.current) {
        return;
      }

      const agentData = normalizeAgentData(rawAgentData);
      if (!agentData) {
        console.warn(
          "[TemplateChatPage] Interview completed without agent data"
        );
        return;
      }

      completionHandledRef.current = true;
      console.log(
        "[TemplateChatPage] Interview completed with data:",
        agentData
      );

      setIsRedirecting(true);

      sessionStorage.setItem(
        "pendingAgentData",
        JSON.stringify({
          ...agentData,
          fromTemplate: true,
          templateId: template?.id,
        })
      );

      router.push("/dashboard/agents/new?fromInterview=true");
    },
    [normalizeAgentData, router, template?.id]
  );

  useEffect(() => {
    if (!sessionId || !template || completionHandledRef.current) {
      return;
    }

    let active = true;
    let intervalId;

    const pollForCompletion = async () => {
      if (!active || completionHandledRef.current) return;

      try {
        const response = await fetch(
          `/api/webhook/n8n-template?session=${encodeURIComponent(sessionId)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status !== 404) {
            console.warn(
              "[TemplateChatPage] Polling failed:",
              response.status,
              response.statusText
            );
          }
          return;
        }

        const data = await response.json();
        if (data?.success && data.agentData) {
          clearInterval(intervalId);
          active = false;
          handleInterviewComplete(data.agentData);
        }
      } catch (error) {
        console.error("[TemplateChatPage] Polling error:", error);
      }
    };

    intervalId = setInterval(pollForCompletion, 4000);
    pollForCompletion();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId, template, handleInterviewComplete]);

  const handleBackToTemplates = () => {
    router.push("/dashboard/agents/templates");
  };

  if (authLoading || !template || !sessionId) {
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
          metadata={metadata}
          onMessageReceived={(data) => {
            console.log("[TemplateChatPage] Message received:", data);
          }}
          onComplete={handleInterviewComplete}
        />
      </div>
    </div>
  );
}
