"use client";

import { useEffect, useRef, useState } from "react";
import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";

export default function TemplateChat({
  template,
  sessionId,
  onInterviewComplete,
}) {
  const containerRef = useRef(null);
  const chatInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let rafId;

    if (!template || !sessionId) return;

    const waitAndInit = () => {
      if (cancelled) return;

      const el = containerRef.current || document.getElementById("n8n-chat");
      if (!el) {
        rafId = window.requestAnimationFrame(waitAndInit);
        return;
      }

      if (chatInstanceRef.current) return;

      try {
        setError(null);
        setIsLoading(true);

        const webhookUrl =
          process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
          "https://n8n.srv651498.hstgr.cloud/webhook/44e8e63d-ebf4-4278-bdf6-ff0f8e5955fb/chat";

        const instance = createChat({
          webhookUrl,
          mode: "fullscreen",
          target: "#n8n-chat", // per n8n docs
          showWelcomeScreen: false,
          chatInputKey: "chatInput",
          chatSessionKey: "sessionId",
          loadPreviousSession: false,
          metadata: {
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
          },
        });

        chatInstanceRef.current = instance;
        if (typeof window !== "undefined") window.n8nChatInstance = instance;

        if (typeof instance.on === "function") {
          instance.on("message", (message) => {
            if (
              message?.metadata?.status === "completed" &&
              message?.metadata?.agent_data
            ) {
              onInterviewComplete?.(message.metadata.agent_data);
            }
          });
          instance.on("error", (err) => {
            console.error("[TemplateChat] Error:", err);
            setError(err?.message || "Chat error");
          });
        }

        setIsLoading(false);
      } catch (e) {
        console.error("[TemplateChat] Init failed:", e);
        setError(e?.message || "Failed to initialize chat");
        setIsLoading(false);
      }
    };

    rafId = window.requestAnimationFrame(waitAndInit);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      try {
        chatInstanceRef.current?.destroy?.();
      } catch {}
      chatInstanceRef.current = null;
    };
  }, [template, sessionId, onInterviewComplete]);

  return (
    <div className="relative h-full w-full">
      {/* Always render the container so the ref is set */}
      <div
        id="n8n-chat"
        ref={containerRef}
        className="h-full w-full bg-background"
        style={{ width: "100%", height: "100%", minHeight: "500px" }}
      />

      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background/60 p-6">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <p className="text-sm text-foreground">Loading chat interface...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Connection Failed
            </h3>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent/90"
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
}
