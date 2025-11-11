"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AgentFormTour from "@/components/ui/AgentFormTour";

export const TOOL_OPTIONS = [
  {
    id: "gmail_send_messages",
    label: "Gmail - Send Messages",
    description:
      "Compose and send email messages through the connected Gmail account.",
  },
  {
    id: "gmail_get_message",
    label: "Gmail - Get Message",
    description:
      "Read and retrieve a specific email message from the connected Gmail account.",
  },
  {
    id: "gmail_read_messages",
    label: "Gmail - Read Messages",
    description:
      "Read and retrieve a list of email messages from the connected Gmail account.",
  },
  {
    id: "gmail_list_messages",
    label: "Gmail - List Messages",
    description:
      "List email messages from the connected Gmail account based on specified criteria.",
  },
  {
    id: "calendar",
    label: "Google Calendar",
    description:
      "Access and manage calendar events through the connected Google account.",
  },
];

const TOOL_IDS = TOOL_OPTIONS.map((tool) => tool.id);

const createDefaultToolState = () =>
  TOOL_IDS.reduce((accumulator, id) => {
    accumulator[id] = false;
    return accumulator;
  }, {});

const LEGACY_TOOL_ALIASES = {
  gmail: TOOL_IDS.filter((toolId) => toolId.startsWith("gmail")),
};

const KNOWN_TOOL_IDS = new Set([
  ...TOOL_IDS,
  ...Object.keys(LEGACY_TOOL_ALIASES),
]);

const expandLegacySelections = (set) => {
  Object.entries(LEGACY_TOOL_ALIASES).forEach(([legacyKey, replacements]) => {
    if (set.has(legacyKey)) {
      replacements.forEach((id) => set.add(id));
    }
  });
};

const resolveLegacyKeysForSelection = (selectedTools) => {
  const legacyKeys = [];
  Object.entries(LEGACY_TOOL_ALIASES).forEach(([legacyKey, replacements]) => {
    if (replacements.some((id) => selectedTools.includes(id))) {
      legacyKeys.push(legacyKey);
    }
  });
  return legacyKeys;
};

const DEFAULT_VALUES = {
  name: "",
  tools: createDefaultToolState(),
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
      tools: createDefaultToolState(),
    };
  }

  const allowedList = Array.isArray(input.allowedTools)
    ? input.allowedTools
    : Array.isArray(input.allowed_tools)
    ? input.allowed_tools
    : [];

  const validAllowedTools = allowedList
    .filter((tool) => typeof tool === "string")
    .map((tool) => tool.trim());

  const allowedSet = new Set(validAllowedTools);
  expandLegacySelections(allowedSet);

  const normalizedToolsArraySource = Array.isArray(input.tools)
    ? input.tools
    : Array.isArray(input.allowed_tools)
    ? input.allowed_tools
    : [];

  const normalizedToolsArray = normalizedToolsArraySource
    .filter((item) => typeof item === "string")
    .map((item) => item.trim());

  const arraySet = new Set(normalizedToolsArray);
  expandLegacySelections(arraySet);

  const normalizedToolsObject =
    input.tools &&
    typeof input.tools === "object" &&
    !Array.isArray(input.tools)
      ? input.tools
      : {};

  const objectSet = new Set(
    Object.entries(normalizedToolsObject)
      .filter(([key, value]) => typeof key === "string" && Boolean(value))
      .map(([key]) => key.trim())
  );
  expandLegacySelections(objectSet);

  const toolState = createDefaultToolState();
  TOOL_IDS.forEach((toolId) => {
    const fromArray = arraySet.has(toolId);
    const fromObject = objectSet.has(toolId);
    const fromAllowed = allowedSet.has(toolId);
    toolState[toolId] = fromArray || fromObject || fromAllowed;
  });

  return {
    name: input.name ?? DEFAULT_VALUES.name,
    tools: toolState,
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
  startGuidedTour = false,
  onGuidedTourClose,
  onGuidedTourStepChange,
  submitButtonLabel = null,
}) {
  const [values, setValues] = useState(() => mapInitialValues(initialValues));
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const lockedToolsRef = useRef([]);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const submitLabel = useMemo(() => {
    if (submitButtonLabel) {
      return submitButtonLabel;
    }
    if (mode === "edit") return "Save Changes";
    return "Create Agent";
  }, [mode, submitButtonLabel]);

  // MOVE tourSteps ABOVE any hook that references it to avoid TDZ
  const tourSteps = useMemo(
    () => [
      {
        selector: '[data-tour="agent-name"]',
        title: "Name your agent",
        description:
          "We prefilled this from your interview. Adjust it so teammates instantly understand what the agent does.",
        hint: "Short, action-oriented names work best.",
        placement: "bottom-start",
      },
      {
        selector: '[data-tour="agent-tools"]',
        title: "Enable the right capabilities",
        description:
          "Toggle which integrations this agent should control. You can add or remove tools later in the agent settings.",
        hint: "Only grant access to the systems this agent truly needs.",
        placement: "bottom-start",
      },
      {
        selector: '[data-tour="agent-prompt"]',
        title: "Fine-tune the system prompt",
        description:
          "This prompt guides the agent’s tone, constraints, and decision-making. Refine the interview summary or write your own instructions.",
        hint: "Include guardrails, preferred voice, and escalation rules.",
        placement: "top-start",
      },
      {
        selector: '[data-tour="agent-actions"]',
        title: "Review and launch",
        description:
          "Once everything looks good, create the agent. You can reset the form or come back to edit it anytime.",
        finishLabel: "OK",
        placement: "top-center",
      },
    ],
    []
  );

  useEffect(() => {
    if (!startGuidedTour) return;

    let cancelled = false;
    let rafId;

    // Open only after the first anchor exists and is laid out
    const firstSelector = tourSteps[0]?.selector || null;

    const waitForAnchor = () => {
      const el = firstSelector ? document.querySelector(firstSelector) : null;
      if (!cancelled && el && el.getBoundingClientRect().width > 0) {
        setIsTourOpen(true);
        return;
      }
      rafId = requestAnimationFrame(waitForAnchor);
    };

    rafId = requestAnimationFrame(waitForAnchor);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [startGuidedTour, tourSteps]);

  useEffect(() => {
    setValues(mapInitialValues(initialValues));
  }, [initialValues]);

  useEffect(() => {
    const allowedList = Array.isArray(initialValues?.allowed_tools)
      ? initialValues.allowed_tools
      : Array.isArray(initialValues?.allowedTools)
      ? initialValues.allowedTools
      : [];
    const sanitized = allowedList
      .filter((tool) => typeof tool === "string")
      .map((tool) => tool.trim());
    lockedToolsRef.current = sanitized.filter(
      (tool) => !KNOWN_TOOL_IDS.has(tool)
    );
  }, [initialValues]);

  const handleTourClose = () => {
    setIsTourOpen(false);
    onGuidedTourClose?.();
  };

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
    const selectedTools = TOOL_IDS.filter((toolId) => values.tools[toolId]);
    const legacySelected = resolveLegacyKeysForSelection(selectedTools);

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
      ...legacySelected,
    ]);

    payload.allowed_tools = Array.from(mergedAllowed);

    if (selectedTools.length || legacySelected.length) {
      payload.tools = Array.from(
        new Set([...selectedTools, ...legacySelected])
      );
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
          "Something went wrong. Please retry or contact support."
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-surface rounded-xl shadow-sm border border-surface-strong/60 p-8"
    >
      <AgentFormTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={handleTourClose}
        onStepChange={onGuidedTourStepChange}
      />
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
          <div data-tour="agent-name">
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

          <div data-tour="agent-tools">
            <label className="block text-sm font-medium text-muted mb-2">
              Google Workspace Tools
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {TOOL_OPTIONS.map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-start space-x-3 rounded-lg border border-surface-strong/60 bg-background p-4 cursor-pointer hover:border-accent transition"
                >
                  <input
                    type="checkbox"
                    checked={values.tools[tool.id] || false}
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
        <div data-tour="agent-prompt">
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
        </div>
        {formErrors.systemPrompt && (
          <p className="mt-2 text-sm text-red-600">{formErrors.systemPrompt}</p>
        )}
      </section>

      {/* LLM configuration is intentionally fixed to platform defaults. */}

      <div
        className="flex items-center justify-end space-x-3"
        data-tour="agent-actions"
      >
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
