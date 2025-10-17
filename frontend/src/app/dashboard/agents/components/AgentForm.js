"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { apiService } from "@/lib/api";

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
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [whatsAppQr, setWhatsAppQr] = useState(null);
  const [showWhatsAppQr, setShowWhatsAppQr] = useState(false);

  const submitLabel = useMemo(() => {
    if (mode === "edit") return "Save Changes";
    return "Create Agent";
  }, [mode]);

  useEffect(() => {
    setValues(mapInitialValues(initialValues));
  }, [initialValues]);

  useEffect(() => {
    if (!values.tools.whatsapp) {
      setShowWhatsAppQr(false);
      setWhatsAppQr(null);
      setWhatsAppError("");
      setWhatsAppLoading(false);
    }
  }, [values.tools.whatsapp]);

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
    const allowedTools = [];

    if (values.tools.gmail) {
      selectedTools.push("gmail");
      allowedTools.push("gmail");
    }
    if (values.tools.whatsapp) {
      selectedTools.push("whatsapp");
      allowedTools.push("whatsapp");
    }

    const payload = {
      name: values.name.trim(),
      config: {
        llm_model: values.model,
        temperature: values.temperature,
        max_tokens: values.maxTokens,
        memory_type: "buffer",
        reasoning_strategy: "react",
        system_prompt: values.systemPrompt.trim(),
      },
    };

    if (allowedTools.length) {
      payload.allowed_tools = Array.from(new Set(allowedTools));
    }

    if (selectedTools.length) {
      payload.tools = selectedTools;
    }

    const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim() || "";
    if (mcpServerUrl) {
      payload.mcp_servers = {
        default: {
          url: mcpServerUrl,
        },
      };
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
            {values.tools.whatsapp && (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    setWhatsAppError("");
                    setWhatsAppLoading(true);
                    setShowWhatsAppQr(true);
                    try {
                      const response = await apiService.getWhatsAppQrCode();
                      const resolvedQr =
                        response?.qr_image ??
                        response?.qr_code ??
                        response?.qr ??
                        response?.image ??
                        response?.data?.qr_image ??
                        response?.data?.qr_code ??
                        null;

                      if (!resolvedQr) {
                        throw new Error(
                          "QR code unavailable. Please try again in a moment.",
                        );
                      }
                      setWhatsAppQr(resolvedQr);
                    } catch (error) {
                      setWhatsAppError(
                        error?.message ||
                          "Unable to load WhatsApp QR code right now.",
                      );
                      setWhatsAppQr(null);
                    } finally {
                      setWhatsAppLoading(false);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-60"
                  disabled={whatsAppLoading}
                >
                  {whatsAppLoading ? "Preparing QR..." : "Scan WhatsApp QR"}
                </button>
                {showWhatsAppQr && (
                  <div className="rounded-lg border border-dashed border-green-400 bg-green-50/60 dark:bg-green-900/20 p-4">
                    {whatsAppLoading && (
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        Generating WhatsApp QR code…
                      </p>
                    )}
                    {!whatsAppLoading && whatsAppQr && (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          Scan this QR code in WhatsApp &gt; Linked Devices to
                          link your automation session.
                        </p>
                        <div className="mx-auto inline-flex rounded-md border border-gray-200 bg-white p-2">
                          <Image
                            src={whatsAppQr}
                            alt="WhatsApp QR Code"
                            width={216}
                            height={216}
                            unoptimized
                            className="h-auto w-[216px]"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          QR codes expire quickly. Refresh if the scan times out.
                        </p>
                      </div>
                    )}
                    {!whatsAppLoading && !whatsAppQr && !whatsAppError && (
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        QR code is not available yet. Please try again shortly.
                      </p>
                    )}
                    {whatsAppError && (
                      <p className="text-sm text-red-600">{whatsAppError}</p>
                    )}
                    {!whatsAppLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowWhatsAppQr(false);
                          setWhatsAppQr(null);
                          setWhatsAppError("");
                        }}
                        className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition"
                      >
                        Close QR Preview
                      </button>
                    )}
                  </div>
                )}
              </div>
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
