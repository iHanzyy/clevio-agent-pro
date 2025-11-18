"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  Edit,
  Loader2,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import AgentForm from "../../components/AgentForm";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const mapAgentToInitialValues = (agent) => {
  if (!agent) return null;

  const allowedList = Array.isArray(agent.allowed_tools)
    ? agent.allowed_tools
    : [];
  const normalizedTools =
    agent.tools &&
    typeof agent.tools === "object" &&
    !Array.isArray(agent.tools)
      ? agent.tools
      : {};
  const mcpTools = Array.isArray(agent.mcp_tools) ? agent.mcp_tools : [];

  return {
    name: agent.name ?? "",
    tools: normalizedTools,
    allowed_tools: allowedList,
    mcp_tools: mcpTools,
    systemPrompt:
      agent.config?.system_message ?? agent.config?.system_prompt ?? "",
    model: agent.config?.model ?? agent.config?.llm_model ?? "gpt-4o-mini",
    temperature: agent.config?.temperature ?? 0.7,
    maxTokens: agent.config?.max_tokens ?? 1000,
    memoryType: agent.config?.memory_type ?? "buffer",
    reasoningStrategy: agent.config?.reasoning_strategy ?? "react",
    allowedTools: allowedList,
  };
};

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!params?.agentId || authLoading) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const abortController = new AbortController();

    const loadAgent = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiService.getAgent(params.agentId);
        if (!abortController.signal.aborted) {
          setAgent(data);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load agent for editing:", err);
          setError(
            err?.message ||
              "Unable to load this agent. Please try again later."
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadAgent();

    return () => abortController.abort();
  }, [params?.agentId, authLoading, user, router]);

  const initialValues = useMemo(
    () => mapAgentToInitialValues(agent),
    [agent]
  );

  const handleUpdate = async (payload) => {
    if (!params?.agentId) return;

    setIsSubmitting(true);
    try {
      const updatePayload = {
        ...payload,
        allowed_tools: payload.allowed_tools ?? [],
      };
      updatePayload.allowed_tools = Array.from(
        new Set(updatePayload.allowed_tools)
      );

      const updated = await apiService.updateAgent(
        params.agentId,
        updatePayload
      );

      const paramsSearch = new URLSearchParams();
      if (updated?.auth_required && updated?.auth_url) {
        paramsSearch.set("authUrl", updated.auth_url);
        if (updated.auth_state) {
          paramsSearch.set("authState", updated.auth_state);
        }
      }

      router.push(
        paramsSearch.toString()
          ? `/dashboard/agents/${updated.id}?${paramsSearch.toString()}`
          : `/dashboard/agents/${updated.id}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Loading Agent</h3>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your agent details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error Loading Agent
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const normalizedPlanCode = (
    user?.subscription?.plan_code ||
    user?.subscription?.planCode ||
    apiService.getPlanCode?.() ||
    ""
  )
    .toString()
    .toLowerCase();
  const isTrialPlan = Boolean(
    user?.is_trial || normalizedPlanCode === "trial"
  );
  const isProMonthlyPlan = normalizedPlanCode === "pro_m";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="card-shadow border-0 bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <Link
                  href={`/dashboard/agents/${params.agentId}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-surface transition-smooth text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Agent
                </Link>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <Edit className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Edit Agent
                  </h1>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                    <span>Updating configuration for:</span>
                    <code className="px-2 py-1 rounded-lg bg-surface text-xs font-mono break-all">
                      {agent?.name || "Unknown Agent"}
                    </code>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Update the configuration, tools, and behaviour of this agent. Changes take effect immediately after saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Agent Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <AgentForm
                mode="edit"
                initialValues={initialValues}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
                isTrialPlan={isTrialPlan}
                isProMonthlyPlan={isProMonthlyPlan}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
