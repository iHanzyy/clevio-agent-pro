"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { Demo } from "@/components/ui/demo";

export default function TrialChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Loading trial workspace…
            </p>
          </div>
        </div>
      }
    >
      <TrialChatContent />
    </Suspense>
  );
}

function TrialChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [agentId, setAgentId] = useState(null);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    const planCode =
      user?.subscription?.plan_code?.toLowerCase?.() ||
      (user?.subscription?.planCode || "").toLowerCase();
    if (!user?.is_trial && planCode !== "trial") {
      router.replace("/dashboard");
    }
  }, [router, user]);

  useEffect(() => {
    if (sessionRef.current) return;
    const base =
      (typeof window !== "undefined" && window.crypto?.randomUUID?.()) ||
      `trial-${Date.now()}`;
    sessionRef.current = `trial-chat-${base}`;
  }, []);

  const resolveAgentId = useCallback(() => {
    const fromQuery = searchParams.get("agentId");
    if (fromQuery) {
      return fromQuery;
    }
    if (typeof window === "undefined") return null;
    try {
      const cachedContext = window.sessionStorage.getItem("trialAgentContext");
      if (cachedContext) {
        const parsed = JSON.parse(cachedContext);
        if (parsed?.agentId) {
          return String(parsed.agentId);
        }
      }
      const cachedActive = window.sessionStorage.getItem(
        "trialActiveAgentId",
      );
      if (cachedActive) {
        const parsed = JSON.parse(cachedActive);
        if (parsed?.agentId) {
          return String(parsed.agentId);
        }
      }
    } catch (error) {
      console.warn("Failed to read trial agent id", error);
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    const determinedId = resolveAgentId();
    if (!determinedId) {
      setLoadError("No trial agent was found. Start from a template again.");
      setLoading(false);
      return;
    }
    setAgentId(determinedId);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          "trialActiveAgentId",
          JSON.stringify({ agentId: determinedId, timestamp: Date.now() }),
        );
      } catch (error) {
        console.warn("Unable to persist trial agent id", error);
      }
    }
  }, [resolveAgentId]);

  useEffect(() => {
    if (!agentId) return;
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const agentDetail = await apiService.getAgent(agentId);
        if (!active) return;
        setAgent(agentDetail);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load trial agent", error);
        setLoadError(error?.message || "Unable to load trial agent");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [agentId]);

  const initialMessages = useMemo(() => {
    if (!agent) {
      return [];
    }
    return [
      {
        id: `welcome-${agent.id}`,
        role: "assistant",
        text: `You're chatting with ${agent.name}. Ask anything to test the configuration.`,
        timestamp: Date.now(),
      },
    ];
  }, [agent]);

  const handleSend = useCallback(
    async (input) => {
      if (!agentId) {
        throw new Error("Agent is not ready yet. Please wait.");
      }

      const response = await apiService.executeAgent(
        agentId,
        input,
        {},
        sessionRef.current,
      );

      const payload = response?.response;
      let replyText;
      if (typeof payload === "string") {
        replyText = payload;
      } else if (payload?.output) {
        replyText = payload.output;
      } else if (payload?.result) {
        replyText = payload.result;
      } else if (
        response?.message &&
        response.message !== "Agent execution started"
      ) {
        replyText = response.message;
      } else {
        replyText =
          "Execution completed. Check intermediate steps for additional context.";
      }

      return {
        text: replyText,
        details: payload?.intermediate_steps || null,
      };
    },
    [agentId]
  );

  const headingText = agent?.name ? `${agent.name} (Trial)` : "Trial Agent";
  const subheadingText =
    agent?.description || "Ask anything to validate your trial configuration.";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Preparing your trial agent…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-4 text-center text-sm text-destructive">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <Demo
      heading={headingText}
      subheading={subheadingText}
      initialMessages={initialMessages}
      onSendMessage={handleSend}
      disabled={!agentId}
    />
  );
}
