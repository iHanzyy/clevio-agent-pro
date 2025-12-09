"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import agentTemplates from "@/data/agent-templates.json";
import AiAssistat from "@/components/ui/ai-assistat";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { normalizeGoogleTools } from "@/lib/googleToolsNormalizer";

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

        const parsedGoogleTools = normalizeGoogleTools(agentData.google_tools);
        parsedGoogleTools.forEach((tool) => {
          allowedTools.add(tool);
        });

        return {
          ...agentData,
          google_tools: parsedGoogleTools,
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

      try {
        sessionStorage.setItem("lastTemplateSessionId", sessionId);
      } catch (error) {
        console.warn("[TemplateInterview] Unable to cache last session id", error);
      }

      console.log("[TemplateInterview] Stored pendingAgentData", {
        sessionId,
        keys: Object.keys(agentData || {}),
      });

      if (nextPath) {
        const url = new URL(nextPath, window.location.origin);
        if (!url.searchParams.has("session")) {
          url.searchParams.set("session", sessionId);
        }
        console.log("[TemplateInterview] Redirecting to", url.toString());
        router.push(url.pathname + url.search);
      }
    },
    [nextPath, router, sessionId, template?.id],
  );

  useEffect(() => {
    if (sessionId && template) {
      console.log("[TemplateInterview] Session ready:", {
        sessionId,
        template: template.name,
        source: sessionQuery ? "query" : "generated",
      });

      // Persist session for downstream fallback (agent form page)
      try {
        sessionStorage.setItem("lastTemplateSessionId", sessionId);
      } catch (error) {
        console.warn("[TemplateInterview] Unable to persist last session id", error);
      }
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <Card className="w-full max-w-sm sm:max-w-md mx-4 border-surface-strong/60 shadow-2xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-6 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/10"
            >
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl font-bold text-foreground mb-3"
            >
              {redirectingCopy?.heading}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-sm"
            >
              {redirectingCopy?.description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex items-center justify-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="text-xs sm:text-sm text-muted-foreground">Preparing your agent...</span>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Compact Modern Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b border-surface-strong/20 bg-gradient-to-r from-surface to-surface-strong/30 backdrop-blur-sm"
      >
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              {/* Back Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-surface-strong/60 text-muted-foreground hover:bg-surface-strong/80 hover:text-foreground transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.button>

              {/* Template Info - Responsive */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex-shrink-0">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg sm:text-xl font-bold text-foreground truncate">
                    {template.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block line-clamp-1">
                    {template.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side Controls - Responsive */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Badge
                variant="secondary"
                className="bg-accent/10 text-accent hover:bg-accent/20 px-2 py-1 text-xs sm:px-3"
              >
                <span className="hidden sm:inline">{template.category}</span>
                <span className="sm:hidden">{template.category.slice(0, 3)}</span>
              </Badge>
              <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-success/10 text-success">
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-success" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Container - Takes full remaining space */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 overflow-hidden min-h-0"
      >
        <AiAssistat
          title={""}
          description=""
          webhookUrl="https://n8n-new.chiefaiofficer.id/webhook/templateAgent"
          sessionId={sessionId}
          metadata={metadata}
          onMessageReceived={(data) => {
            console.log("[TemplateInterview] Message received:", data);
          }}
          onComplete={handleInterviewComplete}
        />
      </motion.div>
    </div>
  );
}
