"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import agentTemplates from "@/data/agent-templates.json";
import AiAssistat from "@/components/ui/ai-assistat";

export default function TemplateInterviewPageContent({
  fallbackPath,
  nextPath,
  redirectingCopy = {
    heading: "Creating your agent...",
    description: "We are applying your interview answers.",
  },
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const completionHandledRef = useRef(false);

  const templateQuery =
    searchParams.get("template") ?? searchParams.get("templateId");
  const template = useMemo(
    () =>
      templateQuery
        ? agentTemplates.find((t) => t.id === templateQuery)
        : undefined,
    [templateQuery],
  );

  const sessionQuery = searchParams.get("session");
  const sessionId = useMemo(() => {
    if (sessionQuery && sessionQuery.trim()) {
      return sessionQuery;
    }
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return `template-session-${window.crypto.randomUUID()}`;
    }
    return `template-session-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }, [sessionQuery]);

  useEffect(() => {
    if (!sessionQuery && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("session", sessionId);
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [sessionQuery, sessionId]);

  useEffect(() => {
    if (!template && fallbackPath) {
      router.push(fallbackPath);
    }
  }, [template, fallbackPath, router]);

  useEffect(() => {
    const registerSession = async () => {
      if (!sessionId || !template?.id) {
        return;
      }
      try {
        await fetch("/api/webhook/n8n-template", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            templateId: template.id,
            userId: user?.user_id || null,
          }),
        });
      } catch (error) {
        console.error("[TemplateInterview] Failed to register session:", error);
      }
    };

    registerSession();
  }, [sessionId, template?.id, user?.user_id]);

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

  const handleInterviewComplete = useCallback(
    (rawAgentData) => {
      if (completionHandledRef.current) {
        return;
      }

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
                  "[TemplateInterview] Failed to parse google_tools JSON string:",
                  error,
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
          mcp_tools: Array.isArray(agentData.mcp_tools)
            ? agentData.mcp_tools
            : [],
        };
      };

      const agentData = normalizeAgentData(rawAgentData);
      if (!agentData) {
        console.warn("[TemplateInterview] Interview completed without agent data");
        return;
      }

      completionHandledRef.current = true;
      setIsRedirecting(true);

      sessionStorage.setItem(
        "pendingAgentData",
        JSON.stringify({
          ...agentData,
          fromTemplate: true,
          templateId: template?.id,
        }),
      );

      if (nextPath) {
        router.push(nextPath);
      }
    },
    [nextPath, router, template?.id],
  );

  useEffect(() => {
    if (sessionId && template) {
      console.log("[TemplateInterview] Session ready:", {
        sessionId,
        template: template.name,
        source: sessionQuery ? "query" : "generated",
      });
    }
  }, [sessionId, sessionQuery, template]);

  useEffect(() => {
    if (!sessionId || completionHandledRef.current) {
      return;
    }

    let active = true;

    const pollForCompletion = async () => {
      if (!active || completionHandledRef.current) {
        return;
      }
      try {
        const response = await fetch(
          `/api/webhook/n8n-template?session=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          if (response.status !== 404) {
            console.warn(
              "[TemplateInterview] Polling failed:",
              response.status,
              response.statusText,
            );
          }
          return;
        }

        const data = await response.json();
        if (data?.success && data.agentData) {
          handleInterviewComplete(data.agentData);
        }
      } catch (error) {
        console.warn("[TemplateInterview] Polling error:", error);
      }
    };

    const interval = setInterval(pollForCompletion, 4000);
    void pollForCompletion();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, handleInterviewComplete]);

  if (!template) {
    return null;
  }

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
          <p className="mt-4 text-muted">{redirectingCopy?.heading}</p>
          {redirectingCopy?.description && (
            <p className="mt-2 text-sm text-muted">
              {redirectingCopy.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b border-surface-strong/60 bg-surface px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {template.name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {template.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {template.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AiAssistat
          title={`Configure ${template.name}`}
          description="Answer a few questions to customize your AI agent"
          webhookUrl="https://n8n-new.chiefaiofficer.id/webhook/templateAgent"
          sessionId={sessionId}
          metadata={metadata}
          onMessageReceived={(data) => {
            console.log("[TemplateInterview] Message received:", data);
          }}
          onComplete={handleInterviewComplete}
        />
      </div>
    </div>
  );
}
