"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AgentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }

    const abortController = new AbortController();

    const loadAgents = async () => {
      setIsLoadingAgents(true);
      setError("");
      try {
        const list = await apiService.getAgents();
        if (!abortController.signal.aborted) {
          setAgents(list || []);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(
            err?.message ||
              "Unable to load agents right now. Please try again later."
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingAgents(false);
        }
      }
    };

    loadAgents();

    return () => abortController.abort();
  }, [loading, user, router]);

  if (loading || isLoadingAgents) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading your agents...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Your Agents
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage, edit, and monitor the assistants you&apos;ve created.
          </p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Agent
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            You haven&apos;t created any agents yet
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Build your first agent to automate workflows across Gmail, WhatsApp,
            and more.
          </p>
          <Link
            href="/dashboard/agents/new"
            className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {agent.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                      agent.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {agent.status || "UNKNOWN"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {agent.config?.system_prompt ||
                    "No system prompt provided yet."}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium">Capabilities:</span>{" "}
                  {agent.allowed_tools?.length
                    ? agent.allowed_tools.join(", ")
                    : agent.status === "ACTIVE"
                    ? "Core agent capabilities enabled"
                    : "Not configured"}
                </div>
                <Link
                  href={`/dashboard/agents/${agent.id}`}
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                >
                  View details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
