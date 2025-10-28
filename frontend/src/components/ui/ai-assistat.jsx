"use client";

import { useState, useRef, useEffect } from "react";

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
  const initStartedRef = useRef(false);
  const initCompletedRef = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send initial request to n8n webhook on mount
  useEffect(() => {
    if (initStartedRef.current) {
      console.log("[AiAssistat] Init already started/completed, skipping...");
      return;
    }

    if (!webhookUrl || !sessionId || !metadata) {
      console.warn("[AiAssistat] Missing required props");
      return;
    }

    initStartedRef.current = true;
    sendInitialMessage();
  }, []);

  const sendInitialMessage = async () => {
    if (initCompletedRef.current) {
      console.log("[AiAssistat] Init already completed");
      return;
    }

    try {
      setIsTyping(true);
      setError(null);

      // CRITICAL: Add chatInput as initial trigger!
      const initialChatInput =
        "Hi! Please help me customize this template according to my needs.";

      console.log("[AiAssistat] 🚀 Sending initial message to:", webhookUrl);
      console.log("[AiAssistat] 📦 Payload:", {
        action: "start",
        sessionId,
        chatInput: initialChatInput, // ✅ TRIGGER MESSAGE
        ...metadata,
      });

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          sessionId,
          chatInput: initialChatInput, // ✅ ADD THIS!
          ...metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[AiAssistat] ✅ Initial response FULL:", data);

      // Extract AI message
      let aiMessageText =
        data.output ||
        data.message ||
        data.response ||
        data.text ||
        data.data?.output ||
        data.data?.message ||
        data.ai_response ||
        data.aiResponse ||
        data.content ||
        null;

      console.log("[AiAssistat] 💬 Extracted message:", aiMessageText);

      if (aiMessageText) {
        const aiMessage = {
          id: Date.now(),
          text: aiMessageText,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages([aiMessage]);
        console.log("[AiAssistat] ✅ Initial message displayed");
      } else {
        console.warn(
          "[AiAssistat] ⚠️ No message in response:",
          JSON.stringify(data, null, 2)
        );

        // Fallback message
        const fallbackMessage = {
          id: Date.now(),
          text: "Hi! I'm ready to help you customize this agent template. Let's get started!",
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages([fallbackMessage]);
      }

      initCompletedRef.current = true;

      if (onMessageReceived) {
        onMessageReceived(data);
      }

      if (data.metadata?.status === "completed" && data.metadata?.agent_data) {
        if (onComplete) {
          onComplete(data.metadata.agent_data);
        }
      }
    } catch (err) {
      console.error("[AiAssistat] ❌ Initial message failed:", err);
      setError(err.message || "Failed to connect to AI assistant");
    } finally {
      setIsTyping(false);
    }
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

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "message",
          sessionId,
          chatInput: userMessage.text,
          ...metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[AiAssistat] 📥 AI response:", data);

      let aiMessageText =
        data.output ||
        data.message ||
        data.response ||
        data.text ||
        data.data?.output ||
        data.data?.message ||
        data.ai_response ||
        data.aiResponse ||
        data.content ||
        "I received your message.";

      const aiResponse = {
        id: Date.now() + 1,
        text: aiMessageText,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiResponse]);

      if (onMessageReceived) {
        onMessageReceived(data);
      }

      if (data.metadata?.status === "completed" && data.metadata?.agent_data) {
        console.log(
          "[AiAssistat] 🎉 Interview completed!",
          data.metadata.agent_data
        );
        if (onComplete) {
          onComplete(data.metadata.agent_data);
        }
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
