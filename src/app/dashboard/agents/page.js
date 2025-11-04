"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  describeWhatsAppStatus,
  toneToBadgeClasses,
} from "@/lib/whatsappStatus";

export default function AgentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [error, setError] = useState("");
  const [whatsAppSessions, setWhatsAppSessions] = useState({});
  const [whatsAppLoadingMap, setWhatsAppLoadingMap] = useState({});
  const [whatsAppRefreshMap, setWhatsAppRefreshMap] = useState({});
  const [whatsAppErrors, setWhatsAppErrors] = useState({});
  const [qrPreview, setQrPreview] = useState(null);

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
    setQrPreview(null);
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
      setWhatsAppLoadingMap({});
      setWhatsAppRefreshMap({});
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
    setWhatsAppErrors((prev) => preserveKnownEntries(prev));

    if (qrPreview && !agentIds.has(qrPreview.agentId)) {
      setQrPreview(null);
    }
  }, [agents, qrPreview]);

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
        const payload = await apiService.getWhatsAppConnectionStatus(agentId);
        const stateCandidate =
          payload?.status?.state || payload?.status || payload?.sessionState;
        const normalizedState =
          typeof stateCandidate === "string"
            ? stateCandidate.toLowerCase()
            : "";
        const isConnected =
          normalizedState === "connected" ||
          payload?.isReady === true ||
          payload?.sessionState === "ready";

        setWhatsAppSessions((prev) => {
          const previous = prev[agentId] || {};
          const nextSession = {
            ...previous,
            status:
              normalizedState ||
              (isConnected ? "connected" : previous?.status || null),
            isActive: isConnected,
            updatedAt:
              payload?.status?.updatedAt ||
              payload?.updatedAt ||
              previous?.updatedAt ||
              null,
            lastConnectedAt:
              payload?.status?.lastConnectedAt ||
              previous?.lastConnectedAt ||
              null,
            rawStatus: payload,
          };

          return {
            ...prev,
            [agentId]: nextSession,
          };
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
              ["inactive", "not_linked", "not_found", "unknown"].includes(
                statusValue
              ));

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
    [openQrPreview, resolveApiKey, user?.user_id]
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
            const checkingStatus = sessionLoading || refreshLoading;
            const sessionError = whatsAppErrors[agent.id];
            const sessionDescriptor = describeWhatsAppStatus(sessionInfo);
            const sessionChipClasses = toneToBadgeClasses(
              sessionDescriptor.tone,
              { loading: checkingStatus }
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
                      disabled={refreshLoading}
                      className="inline-flex items-center justify-center rounded-full border border-surface-strong px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:border-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {refreshLoading ? "Refreshing..." : "Refresh status"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppActivation(agent)}
                      disabled={sessionLoading || refreshLoading}
                      className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-[#128c7e] focus:outline-none focus:ring-2 focus:ring-accent/70 disabled:cursor-not-allowed disabled:bg-accent cursor-pointer"
                    >
                      {sessionLoading
                        ? "Requesting..."
                        : sessionInfo?.isActive
                        ? "Re-link WhatsApp"
                        : "Scan WhatsApp QR"}
                    </button>
                    {qrValue && (
                      <button
                        type="button"
                        onClick={() =>
                          openQrPreview(agent.id, agent.name, qrValue)
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

      {qrPreview?.qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
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
            <div className="mt-4">
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
              <p className="mt-3 text-xs text-muted">
                QR codes expire quickly. Refresh if the scan times out.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
