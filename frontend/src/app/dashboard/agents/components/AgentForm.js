"use client";

import { useEffect, useMemo, useState } from "react";

const TOOL_OPTIONS = [
  {
    id: "gmail",
    label: "Gmail",
    description:
      "Read, search, and send email through the connected Gmail account.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description:
      "Enable WhatsApp messaging workflows for this agent (requires session setup).",
  },
];

const DEFAULT_VALUES = {
  name: "",
  tools: {
    gmail: false,
    whatsapp: false,
  },
  systemPrompt: `You are a helpful AI assistant who represents Clevio AI Assistants.
- Use clear, professional language.
- Call the Gmail tool whenever an email task requires sending, searching, or reading messages.
- Ask follow-up questions when needed instead of guessing missing details.`,
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1000,
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
      whatsapp:
        Boolean(input.tools?.whatsapp) || allowedList.includes("whatsapp"),
    },
    systemPrompt: input.systemPrompt ?? DEFAULT_VALUES.systemPrompt,
    model: input.model ?? DEFAULT_VALUES.model,
    temperature:
      typeof input.temperature === "number"
        ? input.temperature
        : DEFAULT_VALUES.temperature,
    maxTokens:
      typeof input.maxTokens === "number"
        ? input.maxTokens
        : DEFAULT_VALUES.maxTokens,
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

  const submitLabel = useMemo(() => {
    if (mode === "edit") return "Save Changes";
    return "Create Agent";
  }, [mode]);

  useEffect(() => {
    setValues(mapInitialValues(initialValues));
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
    if (values.maxTokens < 100) {
      errors.maxTokens = "Max tokens must be at least 100.";
    }
    return errors;
  };

  const buildPayload = () => {
    const tools = [];
    const allowedTools = [];

    if (values.tools.gmail) {
      tools.push("gmail");
      allowedTools.push("gmail");
    }
    if (values.tools.whatsapp) {
      allowedTools.push("whatsapp");
    }

    const payload = {
      name: values.name.trim(),
      tools,
      config: {
        llm_model: values.model,
        temperature: values.temperature,
        max_tokens: values.maxTokens,
        system_prompt: values.systemPrompt.trim(),
        memory_type: "buffer",
        reasoning_strategy: "react",
      },
    };

    if (allowedTools.length) {
      payload.allowed_tools = Array.from(new Set(allowedTools));
    }

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
      className="space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8"
    >
      {serverError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {serverError}
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Agent Basics
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Agent Name
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="e.g. Inbox Concierge"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Capabilities
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {TOOL_OPTIONS.map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 cursor-pointer hover:border-indigo-400 transition"
                >
                  <input
                    type="checkbox"
                    checked={values.tools[tool.id]}
                    onChange={() => toggleTool(tool.id)}
                    className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                      {tool.label}
                    </span>
                    <span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          System Prompt
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {formErrors.systemPrompt && (
          <p className="mt-2 text-sm text-red-600">
            {formErrors.systemPrompt}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          LLM Configuration
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Model
            </label>
            <select
              value={values.model}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, model: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="gpt-4o-mini">GPT-4o Mini (recommended)</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini-128k">GPT-4o Mini 128k</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Temperature
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {values.temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={values.temperature}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  temperature: Number(event.target.value),
                }))
              }
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Lower values produce focused responses; higher values make the
              agent more creative.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Tokens
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {values.maxTokens}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={4000}
              step={100}
              value={values.maxTokens}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  maxTokens: Number(event.target.value),
                }))
              }
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Controls the maximum length of the agent&apos;s responses.
            </p>
            {formErrors.maxTokens && (
              <p className="text-sm text-red-600">{formErrors.maxTokens}</p>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            setServerError("");
            setFormErrors({});
            setValues(mapInitialValues(initialValues));
          }}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
