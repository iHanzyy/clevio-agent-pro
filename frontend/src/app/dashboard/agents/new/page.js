"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AgentForm from "../components/AgentForm";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilledData, setPrefilledData] = useState(null);

  useEffect(() => {
    // Check if coming from interview
    const fromInterview = searchParams.get("fromInterview");
    if (fromInterview === "true") {
      const storedData = sessionStorage.getItem("pendingAgentData");
      if (storedData) {
        try {
          const agentData = JSON.parse(storedData);

          // Transform agent data to form format
          const formData = {
            name: agentData.name || "",
            tools: {
              gmail: agentData.allowed_tools?.includes("gmail") || false,
              calendar: agentData.allowed_tools?.includes("calendar") || false,
            },
            systemPrompt: agentData.config?.system_prompt || "",
            model: agentData.config?.llm_model || "gpt-4o-mini",
            temperature: agentData.config?.temperature || 0.7,
            maxTokens: agentData.config?.max_tokens || 1000,
            memoryType: agentData.config?.memory_type || "buffer",
            reasoningStrategy: agentData.config?.reasoning_strategy || "react",
          };

          setPrefilledData(formData);
          sessionStorage.removeItem("pendingAgentData");
        } catch (err) {
          console.error("Failed to parse prefilled data:", err);
        }
      }
    }
  }, [searchParams]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    try {
      const agent = await apiService.createAgent(payload);

      if (!agent?.id) {
        throw new Error("Agent created but response did not include an ID.");
      }

      const params = new URLSearchParams();
      if (agent.auth_required && agent.auth_url) {
        params.set("authUrl", agent.auth_url);
        if (agent.auth_state) {
          params.set("authState", agent.auth_state);
        }
      }

      router.push(
        params.toString()
          ? `/dashboard/agents/${agent.id}?${params.toString()}`
          : `/dashboard/agents/${agent.id}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Create a New Agent
        </h1>
        <p className="mt-2 text-sm text-muted">
          {prefilledData
            ? "Review and adjust the agent configuration from your interview."
            : "Configure the tools and behaviour for your assistant. You can adjust these settings later from the agent detail page."}
        </p>
      </div>

      <AgentForm
        mode="create"
        initialValues={prefilledData}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
