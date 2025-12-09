"use client";

import { TOOL_OPTIONS } from "@/app/dashboard/agents/components/AgentForm";
import { normalizeGoogleTools } from "@/lib/googleToolsNormalizer";

const GMAIL_TOOL_IDS = TOOL_OPTIONS.filter((tool) =>
  tool.id.startsWith("gmail"),
).map((tool) => tool.id);

export const extractAllowedTools = (agentData) => {
  const result = new Set();
  if (!agentData || typeof agentData !== "object") {
    return [];
  }

  const appendTools = (input) => {
    if (!Array.isArray(input)) {
      return;
    }
    input.forEach((tool) => {
      if (typeof tool === "string" && tool.trim()) {
        result.add(tool.trim());
      }
    });
  };

  appendTools(agentData.tools);
  appendTools(agentData.allowed_tools);
  appendTools(agentData.allowedTools);
  appendTools(agentData.mcp_tools);

  const googleTools = normalizeGoogleTools(agentData.google_tools);
  appendTools(googleTools);

  if (result.has("gmail")) {
    GMAIL_TOOL_IDS.forEach((toolId) => result.add(toolId));
  }

  return Array.from(result);
};

export const buildPrefilledFormValues = (agentData) => {
  if (!agentData || typeof agentData !== "object") {
    return null;
  }

  const allowedTools = extractAllowedTools(agentData);

  const toolSelections = TOOL_OPTIONS.reduce((accumulator, tool) => {
    accumulator[tool.id] = allowedTools.includes(tool.id);
    return accumulator;
  }, {});

  return {
    name: agentData.name || "",
    tools: toolSelections,
    systemPrompt: agentData.config?.system_prompt || "",
    model: agentData.config?.llm_model || "gpt-4o-mini",
    temperature:
      agentData.config?.temperature ??
      agentData.config?.llm_temperature ??
      0.7,
    maxTokens: agentData.config?.max_tokens ?? 1000,
    memoryType: agentData.config?.memory_type || "buffer",
    reasoningStrategy: agentData.config?.reasoning_strategy || "react",
  };
};
