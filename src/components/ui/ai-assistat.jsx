"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_GREETING =
  "Hai! Mohon bantu saya menyesuaikan template ini dengan kebutuhan saya.";

const getInitCache = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.__aiAssistInitCache) {
    window.__aiAssistInitCache = new Map();
  }

  return window.__aiAssistInitCache;
};

const MESSAGE_FIELD_PICKERS = [
  (data) => data?.output,
  (data) => data?.message,
  (data) => data?.response,
  (data) => data?.text,
  (data) => data?.data?.output,
  (data) => data?.data?.message,
  (data) => data?.ai_response,
  (data) => data?.aiResponse,
  (data) => data?.content,
];

const toDisplayString = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      console.warn("[AiAssistat] Failed to stringify message value:", err);
      return String(value);
    }
  }

  return String(value);
};

const extractMessageText = (data, fallback = "") => {
  for (const picker of MESSAGE_FIELD_PICKERS) {
    const candidate = picker(data);
    if (candidate !== undefined && candidate !== null) {
      const text = toDisplayString(candidate);
      if (text.trim() !== "") {
        return text;
      }
    }
  }

  return fallback;
};

const safeParseJson = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn("[AiAssistat] Unable to parse JSON string:", error);
    }
  }
  return null;
};

const normalizeAgentData = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return safeParseJson(value) ?? { summary: value };
  }
  if (typeof value === "object") {
    return value;
  }
  return null;
};

const pickAgentData = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidates = [
    payload.agent_data,
    payload.agentData,
    payload.agent,
    payload.data?.agent_data,
    payload.data?.agentData,
    payload.data?.agent,
    payload.response?.agent_data,
    payload.response?.agentData,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeAgentData(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const detectCompletionStatus = (payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const statusCandidates = [
    payload.status,
    payload.state,
    payload.result,
    payload.outcome,
    payload.data?.status,
    payload.data?.state,
    payload.data?.result,
    payload.data?.outcome,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  if (
    statusCandidates.some((value) =>
      ["completed", "complete", "done", "success", "finished"].includes(value),
    )
  ) {
    return true;
  }
  if (
    payload.success === true ||
    payload.completed === true ||
    payload.finished === true ||
    payload.data?.success === true ||
    payload.data?.completed === true
  ) {
    return true;
  }
  return Boolean(pickAgentData(payload));
};

const buildCompletionResult = (payload) => {
  const agentData = pickAgentData(payload);
  const isCompleted = detectCompletionStatus(payload) || Boolean(agentData);
  return {
    isCompleted,
    agentData: agentData || null,
  };
};


const AIMessageBar = ({
  title = "AI Assistant",
  description = "Chat with our AI assistant",
  webhookUrl,
  metadata = {},
  sessionId,
  onMessageReceived,
  onComplete,
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(null);
  const initCompletedRef = useRef(false);
  const metadataRef = useRef(metadata ?? {});
  const messageCallbackRef = useRef(onMessageReceived);
  const completeCallbackRef = useRef(onComplete);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    metadataRef.current = metadata ?? {};
  }, [metadata]);

  useEffect(() => {
    messageCallbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    completeCallbackRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!webhookUrl || !sessionId || !metadataRef.current) {
      console.warn("[AiAssistat] Missing required props");
      return;
    }

    const cache = getInitCache();
    const cached = cache?.get(sessionId);
    let cancelled = false;

    const applyResult = (result) => {
      if (cancelled) return;

      initCompletedRef.current = true;
      setError(null);
      setMessages(result.messages);
      setIsTyping(false);

      if (messageCallbackRef.current) {
        messageCallbackRef.current(result.data);
      }

      if (result.completionData && completeCallbackRef.current) {
        completeCallbackRef.current(result.completionData);
      }
    };

    const handleError = (err) => {
      if (cancelled) return;

      console.error("[AiAssistat] ❌ Initial message failed:", err);
      setError(err.message || "Failed to connect to AI assistant");
      setIsTyping(false);
    };

    if (cached?.result) {
      console.log(
        "[AiAssistat] ⚡ Using cached initial response for session:",
        sessionId
      );
      applyResult(cached.result);
      return;
    }

    setIsTyping(true);
    setError(null);

    const fetchPromise =
      cached?.promise ?? fetchInitialResponse(webhookUrl, sessionId);

    if (cached?.promise) {
      console.log(
        "[AiAssistat] ⏳ Waiting for in-flight initialization for session:",
        sessionId
      );
    }

    if (!cached?.promise && cache) {
      cache.set(sessionId, { promise: fetchPromise });
    }

    fetchPromise
      .then((result) => {
        if (cache) {
          cache.set(sessionId, { result });
        }
        console.log(
          "[AiAssistat] ✅ Initial response resolved for session:",
          sessionId
        );
        applyResult(result);
      })
      .catch((err) => {
        if (cache) {
          cache.delete(sessionId);
        }
        console.error(
          "[AiAssistat] ❌ Initial response failed for session:",
          sessionId,
          err
        );
        handleError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [webhookUrl, sessionId]);

  const fetchInitialResponse = async (currentWebhookUrl, currentSessionId) => {
    const metadataSnapshot = metadataRef.current ?? {};
    const { session_id, ...cleanMetadata } = metadataSnapshot;

    const payload = {
      sessionId: currentSessionId,
      chatInput: INITIAL_GREETING,
      ...cleanMetadata,
    };

    console.log("[AiAssistat] 🚀 Sending initial message to:", currentWebhookUrl);
    console.log("[AiAssistat] 📦 Payload:", payload);

    const response = await fetch(currentWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("[AiAssistat] Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    console.log("[AiAssistat] Content-Type:", contentType);

    const responseClone = response.clone();
    const rawText = await responseClone.text();
    console.log("[AiAssistat] Raw response:", rawText);

    if (!rawText || rawText.trim() === "") {
      throw new Error("Empty response from n8n webhook");
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("[AiAssistat] JSON parse error:", parseError);
      throw new Error(`Invalid JSON: ${rawText.substring(0, 100)}`);
    }

    console.log("[AiAssistat] ✅ Initial response FULL:", data);

    const aiMessageText = extractMessageText(data);

    console.log("[AiAssistat] 💬 Extracted message:", aiMessageText);

    let initialMessage;

    if (aiMessageText) {
      initialMessage = {
        id: Date.now(),
        text: aiMessageText,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } else {
      console.warn("[AiAssistat] ⚠️ No message in response");
      initialMessage = {
        id: Date.now(),
        text: "Hi! I'm ready to help you customize this agent template. Let's get started!",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }

    const completion = buildCompletionResult(data);

    return {
      data,
      messages: [initialMessage],
      completionData: completion.isCompleted ? completion.agentData : undefined,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      text: input.trim(),
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      console.log("[AiAssistat] 📤 Sending user message:", userMessage.text);

      // CRITICAL: Remove session_id from metadata
      const { session_id, ...cleanMetadata } = metadataRef.current || {};

      const payload = {
        sessionId, // ✅ Only camelCase
        chatInput: userMessage.text,
        ...cleanMetadata,
      };

      console.log("[AiAssistat] 📦 Payload:", payload);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("[AiAssistat] Response status:", response.status);
      console.log("[AiAssistat] Response headers:", response.headers);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // CRITICAL: Check if response has content
      const contentType = response.headers.get("content-type");
      console.log("[AiAssistat] Content-Type:", contentType);

      // Clone response to read text first
      const responseClone = response.clone();
      const rawText = await responseClone.text();
      console.log("[AiAssistat] Raw response text:", rawText);

      // Check if response is empty
      if (!rawText || rawText.trim() === "") {
        throw new Error("Empty response from n8n webhook");
      }

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error("[AiAssistat] JSON parse error:", parseError);
        console.error("[AiAssistat] Invalid JSON:", rawText);
        throw new Error(
          `Invalid JSON response: ${rawText.substring(0, 100)}...`
        );
      }

      console.log("[AiAssistat] 📥 AI response:", data);
      const completion = buildCompletionResult(data);
      if (completion.isCompleted) {
        console.log(
          "[AiAssistat] 🧩 Extracted agent data:",
          completion.agentData
        );
      }

      const aiResponse = {
        id: Date.now() + 1,
        text: extractMessageText(data, "I received your message."),
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiResponse]);

      if (messageCallbackRef.current) {
        messageCallbackRef.current(data);
      }

      if (completion.isCompleted && completion.agentData) {
        console.log("[AiAssistat] 🎉 Interview completed!", completion.agentData);
        completeCallbackRef.current?.(completion.agentData);
      } else {
        console.log("[AiAssistat] ⏳ Waiting for final n8n payload…");
      }
    } catch (err) {
      console.error("[AiAssistat] ❌ Send message failed:", err);
      setError(err.message || "Failed to send message");

      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I encountered an error. Please try again.",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-surface-strong/60 bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-strong/60 transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.sender === "user"
                    ? "bg-accent text-white"
                    : "bg-surface-strong/60 text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.text}
                </p>
                <span
                  className={`mt-2 block text-xs ${
                    message.sender === "user" ? "text-white/70" : "text-muted"
                  }`}
                >
                  {message.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl bg-surface-strong/60 px-4 py-3">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-surface-strong/60 bg-surface p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div
            className={`flex items-end gap-3 rounded-2xl border bg-background px-4 py-3 transition-all ${
              isFocused
                ? "border-accent/60 ring-2 ring-accent/20"
                : "border-surface-strong/60"
            }`}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder-muted focus:outline-none"
              style={{ minHeight: "24px", maxHeight: "120px" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
};

export default AIMessageBar;
