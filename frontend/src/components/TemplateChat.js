"use client";

import { useEffect, useRef, useState } from "react";
import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";

export default function TemplateChat({
  template,
  sessionId,
  onInterviewComplete,
}) {
  const chatContainerRef = useRef(null);
  const chatInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!template || !sessionId || !chatContainerRef.current) return;

    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create n8n chat widget
        const chatInstance = createChat({
          webhookUrl: "https://n8n-new.chiefaiofficer.id/webhook/templateAgent",
          initialMessages: [],
          mode: "embedded",
          target: chatContainerRef.current,
          showWelcomeScreen: false,
          metadata: {
            template_id: template.id,
            template_name: template.name,
            template_category: template.category,
            session_id: sessionId,
            template_data: {
              name: template.name,
              category: template.category,
              description: template.description,
              config: template.config,
              allowed_tools: template.allowed_tools,
            },
          },
        });

        chatInstanceRef.current = chatInstance;

        // Listen for messages from n8n
        if (chatInstance.on) {
          chatInstance.on("message", (message) => {
            // Check if interview is complete
            if (
              message?.metadata?.status === "completed" &&
              message?.metadata?.agent_data
            ) {
              onInterviewComplete(message.metadata.agent_data);
            }
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError("Failed to start interview. Please try again.");
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup
    return () => {
      if (chatInstanceRef.current?.destroy) {
        chatInstanceRef.current.destroy();
      }
    };
  }, [template, sessionId, onInterviewComplete]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
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
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm text-muted">Connecting to Agent Interview...</p>
      </div>
    );
  }

  return (
    <div
      ref={chatContainerRef}
      className="h-full w-full"
      style={{ minHeight: "500px" }}
    />
  );
}
