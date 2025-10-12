"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AgentForm from "../../components/AgentForm";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const mapAgentToInitialValues = (agent) => {
  if (!agent) return null;

  const allowedList = Array.isArray(agent.allowed_tools)
    ? agent.allowed_tools
    : [];

  return {
    name: agent.name ?? "",
    tools: {
      gmail:
        (Array.isArray(agent.tools) && agent.tools.includes("gmail")) ||
        allowedList.includes("gmail"),
      whatsapp: allowedList.includes("whatsapp"),
    },
    systemPrompt: agent.config?.system_prompt ?? "",
    model: agent.config?.llm_model ?? "gpt-4o-mini",
    temperature: agent.config?.temperature ?? 0.7,
    maxTokens: agent.config?.max_tokens ?? 1000,
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Unable to load agent
          </h2>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Agent
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Update the configuration, tools, and behaviour of this agent. Changes
          take effect immediately after saving.
        </p>
      </div>

      <AgentForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
