"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  describeWhatsAppStatus,
  toneToBadgeClasses,
} from "@/lib/whatsappStatus";
import { resolveSessionQrImage } from "@/lib/whatsappQr";

const formatTimestamp = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
};

const WHATSAPP_QR_PREPARATION_SECONDS = 1;
const WHATSAPP_QR_EXPIRY_SECONDS = 60;

export default function AgentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [error, setError] = useState("");
  const [whatsAppSessions, setWhatsAppSessions] = useState({});
  const [whatsAppLoadingMap, setWhatsAppLoadingMap] = useState({});
  const [whatsAppRefreshMap, setWhatsAppRefreshMap] = useState({});
  const [whatsAppDeletingMap, setWhatsAppDeletingMap] = useState({});
  const [whatsAppReconnectingMap, setWhatsAppReconnectingMap] = useState({});
  const [whatsAppErrors, setWhatsAppErrors] = useState({});
  const [qrPreview, setQrPreview] = useState(null);
  const qrFlowAbortRef = useRef(null);
  const qrPreparationTimerRef = useRef(null);
  const qrPreviewStatusPollRef = useRef(null);

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
        console.warn(
          "Unable to auto-generate API key for WhatsApp session",
          err
        );
      }
    }

    if (!apiKey) {
      throw new Error(
        "API key unavailable. Refresh the page or generate an API key before linking WhatsApp."
      );
    }

    return apiKey;
  }, [user?.subscription]);

  const closeQrPreview = useCallback(() => {
    if (qrFlowAbortRef.current) {
      qrFlowAbortRef.current.abort();
      qrFlowAbortRef.current = null;
    }
    if (qrPreparationTimerRef.current) {
      clearTimeout(qrPreparationTimerRef.current);
      qrPreparationTimerRef.current = null;
    }
    if (qrPreviewStatusPollRef.current) {
      clearInterval(qrPreviewStatusPollRef.current);
      qrPreviewStatusPollRef.current = null;
    }
    setQrPreview(null);
  }, []);

  const openQrPreview = useCallback(
    (agentId, agentName, qrValue, meta = {}) => {
      const isImage =
        typeof qrValue === "string" &&
        (qrValue.startsWith("data:image") || qrValue.startsWith("http"));
      setQrPreview({
        agentId,
        agentName,
        qr: qrValue || null,
        isImage: qrValue ? isImage : true,
        qrUpdatedAt: meta.qrUpdatedAt || null,
        traceId: meta.traceId || null,
        loading: meta.loading ?? !qrValue,
      });
    },
    [],
  );

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
      setWhatsAppLoadingMap({});
      setWhatsAppRefreshMap({});
      setWhatsAppDeletingMap({});
      setWhatsAppReconnectingMap({});
      setWhatsAppErrors({});
      if (qrPreview) {
        setQrPreview(null);
      }
      return;
    }

    const agentIds = new Set(agents.map((agent) => agent.id));
    const preserveKnownEntries = (prev) => {
      const next = {};
      agentIds.forEach((id) => {
        if (prev[id] !== undefined) {
          next[id] = prev[id];
        }
      });
      return next;
    };

    setWhatsAppSessions((prev) => preserveKnownEntries(prev));
    setWhatsAppLoadingMap((prev) => preserveKnownEntries(prev));
    setWhatsAppRefreshMap((prev) => preserveKnownEntries(prev));
    setWhatsAppDeletingMap((prev) => preserveKnownEntries(prev));
    setWhatsAppReconnectingMap((prev) => preserveKnownEntries(prev));
    setWhatsAppErrors((prev) => preserveKnownEntries(prev));

    if (qrPreview && !agentIds.has(qrPreview.agentId)) {
      setQrPreview(null);
    }
  }, [agents, qrPreview]);

  useEffect(() => {
    return () => {
      if (qrFlowAbortRef.current) {
        qrFlowAbortRef.current.abort();
        qrFlowAbortRef.current = null;
      }
      if (qrPreparationTimerRef.current) {
        clearTimeout(qrPreparationTimerRef.current);
        qrPreparationTimerRef.current = null;
      }
      if (qrPreviewStatusPollRef.current) {
        clearInterval(qrPreviewStatusPollRef.current);
        qrPreviewStatusPollRef.current = null;
      }
    };
  }, []);

  const handleRefreshWhatsAppStatus = useCallback(
    async (agent) => {
      if (!agent?.id) {
        return;
      }

      const agentId = agent.id;

      setWhatsAppErrors((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      setWhatsAppRefreshMap((prev) => ({ ...prev, [agentId]: true }));

      try {
        const session = await apiService.getWhatsAppConnectionStatus(agentId);
        setWhatsAppSessions((prev) => {
          const previous = prev[agentId] || {};
          const nextSession = session
            ? {
                ...previous,
                ...session,
                updatedAt: session.updatedAt || previous.updatedAt || null,
                lastConnectedAt:
                  session.lastConnectedAt || previous.lastConnectedAt || null,
              }
            : {
                ...previous,
                isActive: false,
                status: "inactive",
              };
          return { ...prev, [agentId]: nextSession };
        });
      } catch (err) {
        setWhatsAppErrors((prev) => ({
          ...prev,
          [agentId]:
            err?.message ||
            "Unable to refresh WhatsApp status. Please try again.",
        }));
      } finally {
        setWhatsAppRefreshMap((prev) => {
          const next = { ...prev };
          delete next[agentId];
          return next;
        });
      }
    },
    []
  );

  const handleWhatsAppActivation = useCallback(
    async (agent) => {
      if (!agent?.id) {
        return;
      }

      setWhatsAppErrors((prev) => {
        const next = { ...prev };
        delete next[agent.id];
        return next;
      });
      setWhatsAppLoadingMap((prev) => ({
        ...prev,
        [agent.id]: true,
      }));

      if (qrFlowAbortRef.current) {
        qrFlowAbortRef.current.abort();
      }
      const flowAbortController = new AbortController();
      qrFlowAbortRef.current = flowAbortController;

      const createAbortError = () => {
        try {
          return new DOMException("Aborted", "AbortError");
        } catch (_err) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          return abortError;
        }
      };

      const clearPreparationTimer = () => {
        if (qrPreparationTimerRef.current) {
          clearTimeout(qrPreparationTimerRef.current);
          qrPreparationTimerRef.current = null;
        }
      };

      const waitForQrPreparation = () =>
        new Promise((resolve, reject) => {
          if (WHATSAPP_QR_PREPARATION_SECONDS <= 0) {
            resolve();
            return;
          }

          const abortSignal = flowAbortController.signal;
          let abortHandler;

          const cleanup = () => {
            clearPreparationTimer();
            if (abortHandler) {
              abortSignal.removeEventListener("abort", abortHandler);
              abortHandler = null;
            }
          };

          abortHandler = () => {
            cleanup();
            reject(createAbortError());
          };

          abortSignal.addEventListener("abort", abortHandler);

          qrPreparationTimerRef.current = setTimeout(() => {
            cleanup();
            resolve();
          }, WHATSAPP_QR_PREPARATION_SECONDS * 1000);
        });

      openQrPreview(agent.id, agent.name, null, {
        loading: true,
      });

      try {
        if (!user?.user_id) {
          throw new Error("User identifier missing. Please sign in again.");
        }

        const apiKey = await resolveApiKey();
        await apiService.createWhatsAppSession({
          userId: String(user.user_id),
          agentId: String(agent.id),
          agentName: agent.name,
          apiKey,
        });

        await waitForQrPreparation();

        const session = await apiService.fetchWhatsAppQr(agent.id);
        const sessionQrValue = resolveSessionQrImage(session);

        setWhatsAppSessions((prev) => {
          const previous = prev[agent.id];
          const statusValue = (session.status || "").toLowerCase();
          const shouldPreserveActive =
            previous?.isActive &&
            !session.isActive &&
            !sessionQrValue &&
            (!statusValue ||
              ["inactive", "not_linked", "not_found", "unknown"].includes(
                statusValue
              ));

          const nextSession = shouldPreserveActive
            ? {
                ...previous,
                updatedAt: session.updatedAt || previous?.updatedAt || null,
                raw: session.raw || previous?.raw || null,
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

        if (sessionQrValue) {
          openQrPreview(agent.id, agent.name, sessionQrValue, {
            qrUpdatedAt: session.qrUpdatedAt || null,
            traceId: session.traceId || null,
            loading: false,
          });
        } else if (!session.isActive) {
          setWhatsAppErrors((prev) => ({
            ...prev,
            [agent.id]:
              "QR code unavailable right now. Please try again shortly.",
          }));
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }
        setWhatsAppErrors((prev) => ({
          ...prev,
          [agent.id]:
            err?.message ||
            "Unable to initialise WhatsApp session. Please try again.",
        }));
        setQrPreview((prev) =>
          prev && prev.agentId === agent.id ? null : prev
        );
      } finally {
        clearPreparationTimer();
        if (qrFlowAbortRef.current === flowAbortController) {
          qrFlowAbortRef.current = null;
        }
        setWhatsAppLoadingMap((prev) => ({
          ...prev,
          [agent.id]: false,
        }));
      }
    },
    [openQrPreview, resolveApiKey, user?.user_id]
  );

  useEffect(() => {
    if (!qrPreview) {
      if (qrPreviewStatusPollRef.current) {
        clearInterval(qrPreviewStatusPollRef.current);
        qrPreviewStatusPollRef.current = null;
      }
      return;
    }

    const agent = agents.find((item) => item.id === qrPreview.agentId);
    if (!agent) {
      return;
    }

    const pollStatus = () => {
      handleRefreshWhatsAppStatus(agent);
    };

    pollStatus();
    const intervalId = setInterval(pollStatus, 3000);
    qrPreviewStatusPollRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      if (qrPreviewStatusPollRef.current === intervalId) {
        qrPreviewStatusPollRef.current = null;
      }
    };
  }, [qrPreview, agents, handleRefreshWhatsAppStatus]);

  useEffect(() => {
    if (!qrPreview) {
      return;
    }
    const session = whatsAppSessions[qrPreview.agentId];
    if (session?.isActive) {
      const timer = setTimeout(() => {
        closeQrPreview();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [qrPreview, whatsAppSessions, closeQrPreview]);

  const handleDeleteWhatsAppSession = useCallback(
    async (agent) => {
      if (!agent?.id) {
        return;
      }

      const agentId = agent.id;
      setWhatsAppErrors((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      setWhatsAppDeletingMap((prev) => ({ ...prev, [agentId]: true }));

      try {
        await apiService.deleteWhatsAppSession(agentId);
        setWhatsAppSessions((prev) => {
          const next = { ...prev };
          delete next[agentId];
          return next;
        });
        await handleRefreshWhatsAppStatus(agent);
      } catch (err) {
        setWhatsAppErrors((prev) => ({
          ...prev,
          [agentId]:
            err?.message ||
            "Unable to delete WhatsApp session. Please try again.",
        }));
      } finally {
        setWhatsAppDeletingMap((prev) => ({ ...prev, [agentId]: false }));
      }
    },
    [handleRefreshWhatsAppStatus]
  );

  const handleReconnectWhatsAppSession = useCallback(
    async (agent) => {
      if (!agent?.id) {
        return;
      }

      const agentId = agent.id;
      setWhatsAppErrors((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      setWhatsAppReconnectingMap((prev) => ({ ...prev, [agentId]: true }));

      try {
        const session = await apiService.reconnectWhatsAppSession(agentId);
        setWhatsAppSessions((prev) => ({
          ...prev,
          [agentId]: session,
        }));

        const qrValue = resolveSessionQrImage(session);
        if (qrValue) {
          openQrPreview(agent.id, agent.name, qrValue, {
            qrUpdatedAt: session?.qrUpdatedAt || session?.updatedAt || null,
            traceId: session?.traceId || null,
          });
        }

        await handleRefreshWhatsAppStatus(agent);
      } catch (err) {
        setWhatsAppErrors((prev) => ({
          ...prev,
          [agentId]:
            err?.message ||
            "Unable to reconnect WhatsApp session. Please try again.",
        }));
      } finally {
        setWhatsAppReconnectingMap((prev) => ({ ...prev, [agentId]: false }));
      }
    },
    [handleRefreshWhatsAppStatus, openQrPreview]
  );

  if (loading || isLoadingAgents) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading your agents...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Your Agents</h1>
          <p className="mt-2 text-sm text-muted">
            Manage, edit, and monitor the assistants you&apos;ve created.
          </p>
        </div>
        <Link
          href="/dashboard/agents/templates"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground font-semibold text-sm transition"
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
        <div className="rounded-xl border border-dashed border-surface-strong/60 p-10 text-center bg-surface">
          <h2 className="text-lg font-semibold text-foreground">
            You haven&apos;t created any agents yet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Build your first agent to automate workflows across Gmail, WhatsApp,
            and more.
          </p>
          <Link
            href="/dashboard/agents/templates"
            className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground text-sm font-semibold transition"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            const sessionInfo = whatsAppSessions[agent.id] || null;
            const sessionLoading = Boolean(whatsAppLoadingMap[agent.id]);
            const refreshLoading = Boolean(whatsAppRefreshMap[agent.id]);
            const deletingSession = Boolean(whatsAppDeletingMap[agent.id]);
            const reconnectingSession = Boolean(
              whatsAppReconnectingMap[agent.id]
            );
            const checkingStatus = sessionLoading || refreshLoading;
            const sessionError = whatsAppErrors[agent.id];
            const sessionDescriptor = describeWhatsAppStatus(sessionInfo);
            const sessionChipClasses = toneToBadgeClasses(
              sessionDescriptor.tone,
              { loading: checkingStatus }
            );
            const qrValue = resolveSessionQrImage(sessionInfo);
            const refreshDisabled =
              refreshLoading || deletingSession || reconnectingSession;
            const connectDisabled =
              sessionLoading ||
              refreshLoading ||
              deletingSession ||
              reconnectingSession;
            const capabilityList = Array.isArray(agent?.allowed_tools)
              ? [...agent.allowed_tools]
              : [];
            if (!capabilityList.includes("WhatsApp")) {
              capabilityList.push("WhatsApp");
            }

            return (
              <div
                key={agent.id}
                className="group relative flex flex-col justify-between gap-6 rounded-3xl border border-surface-strong/60 bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 flex-col gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {agent.name}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-3">
                        {agent.config?.system_message ||
                          agent.config?.system_prompt ||
                          "No system prompt provided yet."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                      <span className="font-medium text-muted">
                        Capabilities
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {capabilityList.map((capability) => (
                          <span
                            key={capability}
                            className="rounded-full border border-surface-strong bg-background px-3 py-1 font-medium text-muted"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${sessionChipClasses}`}
                    >
                      <span className="inline-flex h-2 w-2 rounded-full bg-current opacity-70"></span>
                      {checkingStatus ? "Checking..." : sessionDescriptor.label}
                    </span>
                    {!checkingStatus && (
                      <p className="max-w-[14rem] text-[11px] text-muted">
                        {sessionDescriptor.helper}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-accent"
                  >
                    View details
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                  <div className="flex flex-col items-end gap-2 text-right text-xs">
                    <button
                      type="button"
                      onClick={() => handleRefreshWhatsAppStatus(agent)}
                      disabled={refreshDisabled}
                      className="inline-flex items-center justify-center rounded-full border border-surface-strong px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:border-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {refreshDisabled ? "Refreshing..." : "Refresh status"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppActivation(agent)}
                      disabled={connectDisabled}
                      className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-[#128c7e] focus:outline-none focus:ring-2 focus:ring-accent/70 disabled:cursor-not-allowed disabled:bg-accent cursor-pointer"
                    >
                      {sessionLoading
                        ? "Loading QR..."
                        : sessionInfo?.isActive
                        ? "Re-link WhatsApp"
                        : "Connect WhatsApp"}
                    </button>
                    {sessionInfo?.isActive && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleReconnectWhatsAppSession(agent)}
                          disabled={
                            reconnectingSession ||
                            deletingSession ||
                            refreshLoading
                          }
                          className="inline-flex items-center justify-center rounded-full border border-accent/40 px-3 py-1.5 text-[11px] font-semibold text-accent transition hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reconnectingSession
                            ? "Reconnecting..."
                            : "Reconnect session"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWhatsAppSession(agent)}
                          disabled={deletingSession || reconnectingSession}
                          className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingSession ? "Deleting..." : "Delete session"}
                        </button>
                      </div>
                    )}
                    {qrValue && (
                      <button
                        type="button"
                        onClick={() =>
                          openQrPreview(agent.id, agent.name, qrValue, {
                            qrUpdatedAt:
                              sessionInfo?.qrUpdatedAt ||
                              sessionInfo?.updatedAt ||
                              null,
                            traceId: sessionInfo?.traceId || null,
                          })
                        }
                        className="text-[11px] font-medium text-accent hover:text-accent"
                      >
                        View latest QR
                      </button>
                    )}
                    {sessionError && (
                      <p className="max-w-[18rem] rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-600">
                        {sessionError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-surface-strong/60 bg-surface p-6 text-center shadow-xl">
            <button
              type="button"
              onClick={closeQrPreview}
              className="absolute right-3 top-3 rounded-full bg-surface px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-strong/60"
            >
              Close
            </button>
            <h3 className="text-base font-semibold text-foreground">
              Scan WhatsApp QR
            </h3>
            {qrPreview?.agentName && (
              <p className="mt-1 text-xs text-muted">
                Agent: {qrPreview.agentName}
              </p>
            )}
            {qrPreview?.qrUpdatedAt && (
              <p className="mt-1 text-[11px] text-muted">
                Updated {formatTimestamp(qrPreview.qrUpdatedAt) || "just now"}
              </p>
            )}
            <div className="mt-4 space-y-3">
              {qrPreview.loading ? (
                <div className="space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-accent/40 border-t-transparent animate-spin"></div>
                  <p className="text-sm text-muted">
                    Waiting for WhatsApp QR response…
                  </p>
                  <p className="text-xs text-muted">
                    Keep this window open until the QR appears.
                  </p>
                </div>
              ) : qrPreview.qr ? (
                <>
                  {qrPreview.isImage ? (
                    <div className="mx-auto inline-flex rounded-md border border-surface-strong/60 bg-surface p-2">
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
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground text-sm font-semibold"
                    >
                      Open WhatsApp Link
                    </a>
                  )}
                  <p className="text-xs text-muted">
                    QR codes expire after about {WHATSAPP_QR_EXPIRY_SECONDS}s.
                    Refresh if the scan times out.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  QR code unavailable right now. Please generate a new one.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
