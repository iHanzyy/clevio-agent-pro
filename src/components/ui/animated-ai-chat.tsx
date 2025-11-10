"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Command,
  Figma,
  ImageIcon,
  LoaderIcon,
  MonitorIcon,
  Paperclip,
  SendIcon,
  Sparkles,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          ref={ref}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing
              ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              : "",
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}

        {props.onChange && (
          <div
            className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-violet-500 opacity-0"
            style={{ animation: "none" }}
            id="textarea-ripple"
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

type ChatRole = "user" | "assistant" | "system" | string;

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
  error?: boolean;
  details?: unknown;
}

const formatDetails = (details: unknown): string | null => {
  if (details === null || details === undefined) {
    return null;
  }
  if (
    typeof details === "string" ||
    typeof details === "number" ||
    typeof details === "boolean"
  ) {
    return String(details);
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch (_err) {
    return String(details);
  }
};

export interface AnimatedAIChatProps {
  heading?: string;
  subheading?: string;
  initialMessages?: ChatMessage[];
  onSendMessage?: (
    input: string
  ) => Promise<{ text: string; details?: unknown; error?: boolean }>;
  disabled?: boolean;
}

export function AnimatedAIChat({
  heading,
  subheading,
  initialMessages = [],
  onSendMessage,
  disabled = false,
}: AnimatedAIChatProps) {
  const heroHeading = heading ?? "How can I help today?";
  const heroSubheading = subheading ?? "Type a command or ask a question";
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length ? initialMessages : []
  );
  const [lastError, setLastError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  useEffect(() => {
    if (initialMessages.length) {
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
  }, [initialMessages]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((previous) => [...previous, message]);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const styleId = "animated-ai-chat-ripple";
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes ripple {
        0% { transform: scale(0.5); opacity: 0.6; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim()) {
        void handleSendMessage();
      }
    }
  };

  const handleSendMessage = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };

    appendMessage(userMessage);
    setValue("");
    setLastError("");
    adjustHeight(true);
    setIsTyping(true);

    try {
      if (onSendMessage) {
        const reply = await onSendMessage(trimmed);
        const assistantText =
          reply?.text ??
          "Execution completed. Check intermediate steps for more details.";

        appendMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: assistantText,
          timestamp: Date.now(),
          ...(reply?.error !== undefined ? { error: reply.error } : {}),
          ...(reply?.details !== undefined ? { details: reply.details } : {}),
        });

        if (reply?.error && assistantText) {
          setLastError(assistantText);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
        appendMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: "Thanks! I'm processing your request.",
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to process your request.";
      setLastError(message);
      appendMessage({
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        text: message,
        timestamp: Date.now(),
        error: true,
      });
    } finally {
      setIsTyping(false);
      adjustHeight(true);
    }
  };

  const handleConnectWhatsApp = () => {
    window.location.href = "/register";
  };

  const sendEnabled = !disabled && value.trim().length > 0 && !isTyping;

  return (
    <div className="lab-bg relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
      {/* Button WhatsApp - tetap sama */}
      <motion.button
        type="button"
        onClick={handleConnectWhatsApp}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-xl transition-all hover:bg-[#128c7e]"
        style={{
          boxShadow:
            "0 0 30px rgba(37, 211, 102, 0.4), 0 0 60px rgba(37, 211, 102, 0.3)",
        }}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        <span>Connect to WhatsApp</span>
        <motion.span
          className="absolute inset-0 rounded-lg"
          animate={{
            boxShadow: [
              "0 0 30px rgba(37, 211, 102, 0.4)",
              "0 0 50px rgba(37, 211, 102, 0.6)",
              "0 0 30px rgba(37, 211, 102, 0.4)",
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.button>

      {/* Background effects dengan warna lebih visible */}
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-violet-500/20 blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-indigo-500/20 blur-[128px] delay-700" />
        <div className="absolute right-1/3 top-1/4 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/20 blur-[96px] delay-1000" />
      </div>

      <div className="relative mx-auto w-full max-w-2xl">
        <motion.div
          className="relative z-10 space-y-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header dengan kontras tinggi */}
          <div className="space-y-3 text-center">
            <motion.div
              className="inline-block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-lg">
                {heroHeading}
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-base font-medium text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {heroSubheading}
            </motion.p>
          </div>

          {/* Messages dengan background lebih gelap */}
          {messages.length > 0 && (
            <motion.div
              className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-5 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="max-h-[360px] space-y-4 overflow-y-auto pr-2">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  const formattedDetails = formatDetails(message.details);
                  const bubbleClasses = isUser
                    ? "ml-auto bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : message.error
                    ? "mr-auto bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "mr-auto bg-slate-700 text-white shadow-lg";

                  return (
                    <div key={message.id} className="max-w-[85%]">
                      <div
                        className={`rounded-2xl px-5 py-3 text-sm font-medium ${bubbleClasses}`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.text}
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-400">
                        {isUser ? "You" : "Agent"} ·{" "}
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {formattedDetails && (
                        <details className="mt-2 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                          <summary className="cursor-pointer font-semibold text-blue-300 hover:text-blue-200">
                            View intermediate steps
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-400">
                            {formattedDetails}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Input area dengan background gelap dan border yang jelas */}
          <motion.div
            className="relative rounded-2xl border-2 border-slate-700/80 bg-slate-800/90 shadow-2xl backdrop-blur-xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-5">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask your Agent a question..."
                containerClassName="w-full"
                className={cn(
                  "min-h-[60px] w-full resize-none border-none bg-transparent px-4 py-3 text-base font-medium text-white",
                  "placeholder:text-slate-500",
                  "focus:outline-none"
                )}
                style={{ overflow: "hidden" }}
                showRing={false}
                disabled={disabled}
              />
              {lastError && (
                <p className="mt-2 text-sm font-semibold text-red-400 bg-red-900/30 rounded-lg px-3 py-2 border border-red-500/50">
                  ⚠️ {lastError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-slate-700/60 bg-slate-800/50 p-4">
              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: sendEnabled ? 1.02 : 1 }}
                whileTap={{ scale: sendEnabled ? 0.97 : 1 }}
                disabled={!sendEnabled}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all shadow-lg",
                  sendEnabled
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-blue-500/50"
                    : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                )}
              >
                {isTyping ? (
                  <LoaderIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <SendIcon className="h-5 w-5" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Typing indicator dengan background yang visible */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800/95 px-5 py-3 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <span>Agent is thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse follower effect - lebih subtle */}
      {inputFocused && (
        <motion.div
          className="pointer-events-none fixed z-0 h-[50rem] w-[50rem] rounded-full bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-indigo-500/10 blur-[120px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

// Typing dots dengan warna yang lebih visible
function TypingDots() {
  return (
    <div className="ml-1 flex items-center">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={`typing-dot-${dot}`}
          className="mx-0.5 h-2 w-2 rounded-full bg-blue-400"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
          style={{ boxShadow: "0 0 8px rgba(96, 165, 250, 0.6)" }}
        />
      ))}
    </div>
  );
}
