"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TOOL_OPTIONS = [
  {
    id: "gmail",
    label: "Gmail",
    description:
      "Read, search, and send email through the connected Gmail account.",
  },
  {
    id: "calendar",
    label: "Google Calendar",
    description:
      "Access and manage calendar events through the connected Google account.",
  },
];

const DEFAULT_VALUES = {
  name: "",
  tools: {
    gmail: false,
    calendar: false,
  },
  systemPrompt: `You are a helpful research aide. Remember the users.
- Use clear, professional language.
- Reference available tools when they can help.
- Ask follow-up questions when needed instead of guessing missing details.`,
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1000,
  memoryType: "buffer",
  reasoningStrategy: "react",
};

function mapInitialValues(input) {
  if (!input) {
    return {
      ...DEFAULT_VALUES,
      tools: { ...DEFAULT_VALUES.tools },
    };
  }

  const allowedList = Array.isArray(input.allowedTools)
    ? input.allowedTools
    : Array.isArray(input.allowed_tools)
      ? input.allowed_tools
      : [];

  return {
    name: input.name ?? DEFAULT_VALUES.name,
    tools: {
      gmail: Boolean(input.tools?.gmail) || allowedList.includes("gmail"),
      calendar:
        Boolean(input.tools?.calendar) || allowedList.includes("calendar"),
    },
    systemPrompt:
      input.systemPrompt ??
      input.config?.system_prompt ??
      DEFAULT_VALUES.systemPrompt,
    model:
      input.model ??
      input.config?.model ??
      input.config?.llm_model ??
      DEFAULT_VALUES.model,
    temperature:
      typeof input.temperature === "number"
        ? input.temperature
        : typeof input.config?.temperature === "number"
          ? input.config.temperature
          : DEFAULT_VALUES.temperature,
    maxTokens:
      typeof input.maxTokens === "number"
        ? input.maxTokens
        : typeof input.config?.max_tokens === "number"
          ? input.config.max_tokens
          : DEFAULT_VALUES.maxTokens,
    memoryType:
      input.memoryType ??
      input.config?.memory_type ??
      DEFAULT_VALUES.memoryType,
    reasoningStrategy:
      input.reasoningStrategy ??
      input.config?.reasoning_strategy ??
      DEFAULT_VALUES.reasoningStrategy,
  };
}

export default function AgentForm({
  mode = "create",
  initialValues = null,
  onSubmit,
  isSubmitting = false,
}) {
  const [values, setValues] = useState(() => mapInitialValues(initialValues));
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const lockedToolsRef = useRef([]);

  const submitLabel = useMemo(() => {
    if (mode === "edit") return "Save Changes";
    return "Create Agent";
  }, [mode]);

  useEffect(() => {
    setValues(mapInitialValues(initialValues));
  }, [initialValues]);

  useEffect(() => {
    const allowedList = Array.isArray(initialValues?.allowed_tools)
      ? initialValues.allowed_tools
      : Array.isArray(initialValues?.allowedTools)
        ? initialValues.allowedTools
        : [];
    lockedToolsRef.current = allowedList.filter(
      (tool) => !["gmail", "calendar"].includes(tool),
    );
  }, [initialValues]);

  const toggleTool = (toolId) => {
    setValues((prev) => ({
      ...prev,
      tools: {
        ...prev.tools,
        [toolId]: !prev.tools[toolId],
      },
    }));
  };

  const validate = () => {
    const errors = {};
    if (!values.name.trim()) {
      errors.name = "Agent name is required.";
    }
    if (!values.systemPrompt.trim()) {
      errors.systemPrompt = "System prompt cannot be empty.";
    }
    if (!Object.values(values.tools).some(Boolean)) {
      errors.tools = "Select at least one capability for your agent.";
    }
    return errors;
  };

  const buildPayload = () => {
    const selectedTools = [];

    if (values.tools.gmail) {
      selectedTools.push("gmail");
    }
    if (values.tools.calendar) {
      selectedTools.push("calendar");
    }

    const payload = {
      name: values.name.trim(),
      config: {
        llm_model: values.model,
        temperature: values.temperature,
        max_tokens: values.maxTokens,
        memory_type: values.memoryType || DEFAULT_VALUES.memoryType,
        reasoning_strategy:
          values.reasoningStrategy || DEFAULT_VALUES.reasoningStrategy,
        system_prompt: values.systemPrompt.trim(),
      },
    };

    const mergedAllowed = new Set([
      ...lockedToolsRef.current,
      ...selectedTools,
    ]);

    payload.allowed_tools = Array.from(mergedAllowed);

    if (selectedTools.length) {
      payload.tools = Array.from(new Set(selectedTools));
    }

    const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim() || "";
    payload.mcp_servers = mcpServerUrl
      ? {
          default: {
            url: mcpServerUrl,
          },
        }
      : {};

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");
    const validationErrors = validate();
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      const payload = buildPayload();
      console.log("🚀 Submit agent payload", payload);
      await onSubmit(payload);
    } catch (error) {
      console.error("Agent form submission failed:", error);
      setServerError(
        error?.message ||
          "Something went wrong. Please retry or contact support.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-surface rounded-xl shadow-sm border border-surface-strong/60 p-8"
    >
      {serverError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {serverError}
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Agent Basics
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted">
              Agent Name
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="e.g. Inbox Concierge"
              className="mt-1 w-full rounded-lg border border-surface-strong/60 bg-surface px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Capabilities
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {TOOL_OPTIONS.map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-start space-x-3 rounded-lg border border-surface-strong/60 bg-background p-4 cursor-pointer hover:border-accent transition"
                >
                  <input
                    type="checkbox"
                    checked={values.tools[tool.id]}
                    onChange={() => toggleTool(tool.id)}
                    className="mt-1 h-4 w-4 text-accent border-surface-strong/60 rounded focus:ring-accent"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {tool.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {tool.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {formErrors.tools && (
              <p className="mt-2 text-sm text-red-600">{formErrors.tools}</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          System Prompt
        </h2>
        <p className="text-sm text-muted mb-3">
          Describe how the agent should behave, what tone to use, and any
          constraints. You can keep the template below or provide your own
          instructions.
        </p>
        <textarea
          value={values.systemPrompt}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              systemPrompt: event.target.value,
            }))
          }
          rows={6}
          className="w-full rounded-lg border border-surface-strong/60 bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {formErrors.systemPrompt && (
          <p className="mt-2 text-sm text-red-600">{formErrors.systemPrompt}</p>
        )}
      </section>

      {/* LLM configuration is intentionally fixed to platform defaults. */}

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            setServerError("");
            setFormErrors({});
            setValues(mapInitialValues(initialValues));
          }}
          className="px-4 py-2 rounded-lg border border-surface-strong/60 text-sm font-medium text-muted hover:bg-surface/70 disabled:opacity-60"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-accent-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
