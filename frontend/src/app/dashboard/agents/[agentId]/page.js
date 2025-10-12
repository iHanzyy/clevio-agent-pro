"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authUrl = searchParams?.get("authUrl");
  const authState = searchParams?.get("authState");

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
        console.error("Failed to load agent:", err);
        if (!abortController.signal.aborted) {
          setError(
            err?.message ||
              "Unable to load agent details right now. Please try again."
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

  const capabilitySummary = useMemo(() => {
    const labels = [];
    if (authUrl) {
      labels.push("Gmail (authorization pending)");
    }
    if (agent?.allowed_tools?.includes("whatsapp")) {
      labels.push("WhatsApp");
    }
    if (labels.length === 0) {
      labels.push("Core agent capabilities");
    }
    return labels.join(", ");
  }, [agent, authUrl]);

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
            Something went wrong
          </h2>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const statusChipClasses =
    agent.status === "ACTIVE"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {agent.name}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Agent ID:{" "}
            <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
              {agent.id}
            </code>
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusChipClasses}`}>
          {agent.status || "UNKNOWN"}
        </span>
      </div>

      {authUrl && (
        <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
          <p className="font-semibold">
            Action required: connect Google Workspace
          </p>
          <p className="mt-1">
            This agent needs permission to use Gmail. Click the button below to
            continue the Google authorization flow.
          </p>
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
          >
            Continue with Google
          </a>
          {authState && (
            <p className="mt-2 text-xs text-yellow-700">
              Keep this window open until the Google authorization completes.
            </p>
          )}
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Configuration
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              LLM Model
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.llm_model || "Default"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Temperature
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.temperature ?? 0.7}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Max Tokens
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.max_tokens ?? 1000}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Capabilities
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {capabilitySummary}
            </p>
          </div>
        </div>
        {agent.config?.system_prompt && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              System Prompt
            </p>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {agent.config.system_prompt}
            </pre>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Next Steps
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
          <li>
            Use the dashboard to execute this agent or integrate it into your
            workflows.
          </li>
          <li>
            Upload documents to give the agent domain knowledge from the
            documents tab.
          </li>
          <li>
            {authUrl
              ? "Complete the Google authorization before running email tasks."
              : "Connect additional tools or adjust agent settings at any time."}
          </li>
        </ul>
      </section>
    </div>
  );
}
