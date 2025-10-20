"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AgentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [error, setError] = useState("");
  const [whatsAppSessions, setWhatsAppSessions] = useState({});
  const [whatsAppLoadingMap, setWhatsAppLoadingMap] = useState({});
  const [whatsAppErrors, setWhatsAppErrors] = useState({});
  const [qrPreview, setQrPreview] = useState(null);
  const whatsAppPollMapRef = useRef({});

  const resolveApiKey = useCallback(async () => {
    let apiKey =
      (typeof apiService.getCurrentApiKey === "function"
        ? apiService.getCurrentApiKey()
        : null) ||
      user?.subscription?.api_key ||
      user?.subscription?.apiKey ||
      null;

    if (!apiKey) {
      try {
        await apiService.ensureApiKey();
        apiKey =
          typeof apiService.getCurrentApiKey === "function"
            ? apiService.getCurrentApiKey()
            : null;
      } catch (err) {
        console.warn("Unable to auto-generate API key for WhatsApp session", err);
      }
    }

    if (!apiKey) {
      throw new Error(
        "API key unavailable. Refresh the page or generate an API key before linking WhatsApp.",
      );
    }

    return apiKey;
  }, [user?.subscription]);

  const closeQrPreview = useCallback(() => {
    setQrPreview(null);
  }, []);

  const clearAgentPoll = useCallback((agentId) => {
    const existing = whatsAppPollMapRef.current[agentId];
    if (existing) {
      clearInterval(existing);
      delete whatsAppPollMapRef.current[agentId];
    }
  }, []);

  const scheduleAgentPoll = useCallback(
    (agentId) => {
      if (!agentId || whatsAppPollMapRef.current[agentId]) {
        return;
      }

      whatsAppPollMapRef.current[agentId] = setInterval(async () => {
        try {
          const info = await apiService.getWhatsAppSession(agentId);
          setWhatsAppSessions((prev) => ({
            ...prev,
            [agentId]: info,
          }));

          if (
            info.isActive ||
            (typeof info.status === "string" &&
              ["not_found", "inactive"].includes(info.status.toLowerCase()))
          ) {
            clearAgentPoll(agentId);
          }
        } catch (err) {
          setWhatsAppErrors((prev) => ({
            ...prev,
            [agentId]:
              err?.message ||
              "Unable to refresh WhatsApp status. Please try again.",
          }));
        }
      }, 5000);
    },
    [clearAgentPoll],
  );

  const getWhatsAppStatusLabel = useCallback((session) => {
    if (!session) {
      return "Inactive";
    }
    const status = session.status || (session.isActive ? "active" : "inactive");
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, []);

  const getWhatsAppStatusClasses = useCallback((session, loading) => {
    if (loading) {
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
    }
    if (session?.isActive) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }, []);

  const openQrPreview = useCallback((agentId, agentName, qrValue) => {
    if (!qrValue) {
      setQrPreview(null);
      return;
    }
    const isImage =
      typeof qrValue === "string" &&
      (qrValue.startsWith("data:image") || qrValue.startsWith("http"));
    setQrPreview({
      agentId,
      agentName,
      qr: qrValue,
      isImage,
    });
  }, []);

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

  useEffect(() => {
    if (!agents.length) {
      setWhatsAppSessions({});
      setWhatsAppErrors({});
      return;
    }

    let cancelled = false;
    const loadSessions = async () => {
      const results = await Promise.all(
        agents.map(async (agent) => {
          try {
            const info = await apiService.getWhatsAppSession(agent.id);
            return { agentId: agent.id, info, error: null };
          } catch (err) {
            return {
              agentId: agent.id,
              info: null,
              error:
                err?.message ||
                "Unable to fetch WhatsApp session status right now.",
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextSessions = {};
      const nextErrors = {};
      results.forEach(({ agentId, info, error }) => {
        if (info) {
          const previous = whatsAppSessions[agentId];
          const statusValue = (info.status || "").toLowerCase();
          const shouldPreserveActive =
            previous?.isActive &&
            !info.isActive &&
            !info.qrImage &&
            !info.qrUrl &&
            (!statusValue ||
              ["inactive", "not_linked", "not_found", "unknown"].includes(statusValue));

          nextSessions[agentId] = shouldPreserveActive
            ? {
                ...previous,
                updatedAt: info.updatedAt || previous.updatedAt || null,
                raw: info.raw || previous.raw || null,
              }
            : info;
          if (
            info.raw &&
            !info.isActive &&
            !(typeof info.status === "string" &&
              ["inactive", "not_found"].includes(info.status.toLowerCase()))
          ) {
            scheduleAgentPoll(agentId);
          } else {
            clearAgentPoll(agentId);
          }
        }
        if (error) {
          nextErrors[agentId] = error;
        } else {
          delete nextErrors[agentId];
        }
      });

      setWhatsAppSessions(nextSessions);
      setWhatsAppErrors(nextErrors);
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [agents, clearAgentPoll, scheduleAgentPoll, whatsAppSessions]);

  useEffect(() => () => {
    Object.keys(whatsAppPollMapRef.current).forEach((agentId) => {
      clearAgentPoll(agentId);
    });
  }, [clearAgentPoll]);

  const handleWhatsAppActivation = useCallback(
    async (agent) => {
      setWhatsAppErrors((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
      setWhatsAppLoadingMap((prev) => ({ ...prev, [agent.id]: true }));

      try {
        if (!user?.user_id) {
          throw new Error("User identifier missing. Please sign in again.");
        }

        const apiKey = await resolveApiKey();
        const session = await apiService.createWhatsAppSession({
          userId: String(user.user_id),
          agentId: String(agent.id),
          agentName: agent.name,
          apiKey,
        });

        setWhatsAppSessions((prev) => {
          const previous = prev[agent.id];
          const statusValue = (session.status || "").toLowerCase();
          const shouldPreserveActive =
            previous?.isActive &&
            !session.isActive &&
            !session.qrImage &&
            !session.qrUrl &&
            (!statusValue ||
              ["inactive", "not_linked", "not_found", "unknown"].includes(statusValue));

          const nextSession = shouldPreserveActive
            ? {
                ...previous,
                updatedAt: session.updatedAt || previous.updatedAt || null,
                raw: session.raw || previous.raw || null,
              }
            : session;

          return {
            ...prev,
            [agent.id]: nextSession,
          };
        });

        setWhatsAppErrors((prev) => {
          const next = { ...prev };
          delete next[agent.id];
          return next;
        });

        const qrValue = session.qrImage || session.qrUrl || null;
        openQrPreview(agent.id, agent.name, qrValue);
        scheduleAgentPoll(agent.id);
      } catch (err) {
        setWhatsAppErrors((prev) => ({
          ...prev,
          [agent.id]:
            err?.message ||
            "Unable to initialise WhatsApp session. Please try again.",
        }));
      } finally {
        setWhatsAppLoadingMap((prev) => ({
          ...prev,
          [agent.id]: false,
        }));
      }
    },
    [openQrPreview, resolveApiKey, scheduleAgentPoll, user?.user_id],
  );

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
          {agents.map((agent) => {
            const sessionInfo = whatsAppSessions[agent.id] || null;
            const sessionLoading = Boolean(whatsAppLoadingMap[agent.id]);
            const sessionError = whatsAppErrors[agent.id];
            const sessionLabel = getWhatsAppStatusLabel(sessionInfo);
            const sessionChipClasses = getWhatsAppStatusClasses(
              sessionInfo,
              sessionLoading,
            );
            const qrValue = sessionInfo?.qrImage || sessionInfo?.qrUrl || null;
            const capabilityList = Array.isArray(agent?.allowed_tools)
              ? [...agent.allowed_tools]
              : [];
            if (!capabilityList.includes("WhatsApp")) {
              capabilityList.push("WhatsApp");
            }

            return (
              <div
                key={agent.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {agent.config?.system_message ||
                          agent.config?.system_prompt ||
                          "No system prompt provided yet."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                          agent.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {agent.status || "UNKNOWN"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[11px] rounded-full font-semibold ${sessionChipClasses}`}
                      >
                        WhatsApp {sessionLoading ? "Checking..." : sessionLabel}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Capabilities:</span>{" "}
                    {capabilityList.length
                      ? capabilityList.join(", ")
                      : agent.status === "ACTIVE"
                      ? "Core agent capabilities enabled (includes WhatsApp)"
                      : "Not configured"}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                  >
                    View details →
                  </Link>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleWhatsAppActivation(agent)}
                      disabled={sessionLoading}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition disabled:opacity-60"
                    >
                      {sessionLoading
                        ? "Requesting..."
                        : sessionInfo?.isActive
                        ? "Re-link WhatsApp"
                        : "Scan WhatsApp QR"}
                    </button>
                    {sessionError && (
                      <p className="max-w-[16rem] text-[11px] text-red-600 dark:text-red-400">
                        {sessionError}
                      </p>
                    )}
                    {qrValue && (
                      <button
                        type="button"
                        onClick={() =>
                          openQrPreview(agent.id, agent.name, qrValue)
                        }
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        View latest QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrPreview?.qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={closeQrPreview}
              className="absolute right-3 top-3 rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Close
            </button>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Scan WhatsApp QR
            </h3>
            {qrPreview?.agentName && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Agent: {qrPreview.agentName}
              </p>
            )}
            <div className="mt-4">
              {qrPreview.isImage ? (
                <div className="mx-auto inline-flex rounded-md border border-gray-200 bg-white p-2">
                  <Image
                    src={qrPreview.qr}
                    alt="WhatsApp QR Code"
                    width={240}
                    height={240}
                    unoptimized
                    className="h-auto w-[240px]"
                  />
                </div>
              ) : (
                <a
                  href={qrPreview.qr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  Open WhatsApp Link
                </a>
              )}
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                QR codes expire quickly. Refresh if the scan times out.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
