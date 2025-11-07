"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import agentTemplates from "@/data/agent-templates.json";
import AiAssistat from "@/components/ui/ai-assistat";

export default function TemplateChatPage() {
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
    return `template-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, [sessionQuery]);

  useEffect(() => {
    if (!template) {
      router.push("/dashboard/agents/templates");
      return;
    }
  }, [template, router]);

  useEffect(() => {
    const registerSession = async () => {
      try {
        await fetch("/api/chat-sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            metadata: {
              template_id: template?.id,
              template_name: template?.name,
              user_id: user?.user_id,
            },
          }),
        });
      } catch (error) {
        console.error("[TemplateChatPage] Failed to register session:", error);
      }
    };

    registerSession();
  }, [sessionId, template, user?.user_id]);

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

  // Pindahkan normalizeAgentData ke dalam useCallback
  const handleInterviewComplete = useCallback(
    (rawAgentData) => {
      if (completionHandledRef.current) {
        return;
      }

      // Normalisasi data di dalam callback
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
          mcp_tools: Array.isArray(agentData.mcp_tools)
            ? agentData.mcp_tools
            : [],
        };
      };

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
    [router, template?.id]
  );

  useEffect(() => {
    if (sessionQuery && sessionQuery === sessionId && template) {
      console.log("[TemplateChatPage] Session validated:", {
        sessionId,
        template: template.name,
      });
    }
  }, [sessionId, sessionQuery, template]);

  if (!template) {
    return null;
  }

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
          <p className="mt-4 text-muted">Creating your agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b border-surface-strong/60 bg-surface px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {template.name}
              </h1>
              <p className="mt-1 text-sm text-muted">{template.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
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
