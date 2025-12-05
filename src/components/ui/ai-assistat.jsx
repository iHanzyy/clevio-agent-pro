"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Trash2, AlertCircle, User } from "lucide-react";

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

  if (Array.isArray(payload)) {
    const [first] = payload;
    if (first && typeof first === "object") {
      const normalizedFirst = normalizeAgentData(first);
      if (normalizedFirst) return normalizedFirst;
    }

    const normalizedArray = normalizeAgentData(payload);
    if (normalizedArray) return normalizedArray;
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

  if (payload.system_prompt || payload.google_tools || payload.mcp_tools) {
    candidates.unshift(payload);
  }
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

  if (Array.isArray(payload)) {
    return payload.length > 0;
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
  const textareaRef = useRef(null);
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

  // Auto-resize textarea when content changes
  useEffect(() => {
    if (textareaRef.current && input) {
      const target = textareaRef.current;
      target.style.height = 'auto';
      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    }
  }, [input]);

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
      {/* Compact Header - Only show if title exists */}
      {title && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-b border-surface-strong/20 bg-gradient-to-r from-surface to-surface-strong/30 backdrop-blur-sm"
        >
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex-shrink-0">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h2>
                  {description && (
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block line-clamp-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {messages.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearChat}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-strong/60 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 border-b border-destructive/20 bg-destructive/5"
          >
            <div className="px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2 max-w-7xl mx-auto">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive Messages Container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="px-4 py-4 sm:px-6 sm:py-6 h-full">
            <div className="max-w-4xl mx-auto h-full">
              <div className="space-y-4 sm:space-y-6 pb-4">
                {messages.length === 0 && !isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center py-12"
                  >
                    <div className="text-center max-w-sm">
                      <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                        <Bot className="h-8 w-8 text-accent" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Ready to customize your agent
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        I'll help you configure this template through a few questions
                      </p>
                    </div>
                  </motion.div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex ${
                      message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className={`flex items-end gap-2 sm:gap-3 max-w-[90%] sm:max-w-[80%] ${
                      message.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}>
                      {/* Avatar - Hidden on mobile to save space */}
                      <div className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        message.sender === "user"
                          ? "bg-accent text-white ml-2"
                          : "bg-gradient-to-br from-accent/20 to-accent/10 text-accent mr-2"
                      }`}>
                        {message.sender === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message Bubble - Responsive */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`relative rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm ${
                          message.sender === "user"
                            ? "bg-gradient-to-r from-accent to-accent-hover text-white rounded-br-sm"
                            : "bg-surface border border-surface-strong/60 text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                        <span
                          className={`mt-1 sm:mt-2 block text-xs ${
                            message.sender === "user" ? "text-white/70" : "text-muted-foreground"
                          }`}
                        >
                          {message.timestamp}
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}

                {/* Enhanced Typing Indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-end gap-2 sm:gap-3">
                        <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/10 text-accent">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-surface border border-surface-strong/60 rounded-2xl rounded-bl-sm px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
                          <div className="flex space-x-1">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                              className="h-2 w-2 rounded-full bg-accent"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                              className="h-2 w-2 rounded-full bg-accent"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                              className="h-2 w-2 rounded-full bg-accent"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-t border-surface-strong/20 bg-gradient-to-r from-surface to-surface-strong/30 backdrop-blur-sm"
      >
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div
              className={`relative flex items-end gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border bg-background px-3 py-2 sm:px-4 sm:py-3 transition-all shadow-sm ${
                isFocused
                  ? "border-accent/60 shadow-lg shadow-accent/20"
                  : "border-surface-strong/60"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize textarea
                  const target = e.target;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      handleSubmit(e);
                    }
                  }
                  // Auto-resize on Enter for multi-line
                  if (e.key === "Enter" && e.shiftKey) {
                    setTimeout(() => {
                      const target = e.target;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }, 0);
                  }
                }}
                onInput={(e) => {
                  // Auto-resize on input
                  const target = e.target;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none leading-relaxed"
                style={{
                  minHeight: "44px",
                  maxHeight: "120px",
                  resize: 'none',
                  overflowY: 'auto'
                }}
              />

              <motion.button
                type="submit"
                disabled={!input.trim() || isTyping}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AIMessageBar;
