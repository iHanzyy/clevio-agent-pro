"use client";
import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import {
  describeWhatsAppStatus,
  toneToBadgeClasses,
} from "@/lib/whatsappStatus";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState([]);
  const [whatsAppStatuses, setWhatsAppStatuses] = useState({});
  const [whatsAppRefreshing, setWhatsAppRefreshing] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [stats, setStats] = useState({
    totalAgents: 0,
    connectedWhatsApp: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.subscription?.is_active) {
      router.push("/payment");
      return;
    }
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const agentsData = await apiService.getAgents();

      setAgents(agentsData);

      setStats({
        totalAgents: agentsData.length,
        connectedWhatsApp: 0,
      });
      setWhatsAppStatuses({});
    } catch (error) {
      setError(error.message || "Failed to load dashboard data");
      setWhatsAppStatuses({});

      // If unauthorized, redirect to login
      if (
        error.message?.includes("Invalid API key") ||
        error.message?.includes("Unauthorized")
      ) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshWhatsAppStatuses = useCallback(async () => {
    if (!agents.length) {
      setWhatsAppStatuses({});
      setStats((prev) => ({
        ...prev,
        connectedWhatsApp: 0,
      }));
      setWhatsAppError("");
      return;
    }

    if (whatsAppRefreshing) {
      return;
    }

    setWhatsAppRefreshing(true);
    setWhatsAppError("");

    try {
      const sessionResults = await Promise.allSettled(
        agents.map((agent) => apiService.getWhatsAppSession(agent.id))
      );

      const sessionMap = {};
      let connectedCount = 0;

      sessionResults.forEach((result, index) => {
        const agentId = agents[index]?.id;
        if (!agentId) {
          return;
        }

        if (result.status === "fulfilled") {
          const session = result.value;
          sessionMap[agentId] = session;
          if (session?.isActive) {
            connectedCount += 1;
          }
        } else {
          sessionMap[agentId] = null;
        }
      });

      setWhatsAppStatuses(sessionMap);
      setStats((prev) => ({
        ...prev,
        connectedWhatsApp: connectedCount,
      }));
    } catch (err) {
      setWhatsAppError(
        err?.message ||
          "Unable to refresh WhatsApp status right now. Please try again."
      );
    } finally {
      setWhatsAppRefreshing(false);
    }
  }, [agents, whatsAppRefreshing]);

  const StatCard = ({ title, value, icon, accent = "indigo" }) => {
    const palette = {
      indigo: {
        ring: "bg-accent/15",
        text: "text-accent",
      },
      emerald: {
        ring: "bg-accent/15",
        text: "text-accent",
      },
      blue: {
        ring: "bg-accent/15",
        text: "text-accent",
      },
      purple: {
        ring: "bg-accent/15",
        text: "text-accent",
      },
    };

    const styles = palette[accent] || palette.indigo;

    return (
      <div className="rounded-2xl sm:rounded-3xl border border-surface-strong/60 bg-surface p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted">{title}</p>
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground">
              {value}
            </p>
          </div>
          <div
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl ${styles.ring} ${styles.text}`}
          >
            {icon}
          </div>
        </div>
      </div>
    );
  };

  // Show loading while auth is checking
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64 px-4">
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-xs sm:text-sm text-muted">
            {authLoading
              ? "Checking authentication..."
              : "Loading dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 px-4">
        <div className="text-center max-w-md">
          <svg
            className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-sm sm:text-base text-muted mb-4 px-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 px-3 sm:px-4 md:px-0">
      {/* Header Section */}
      <section className="rounded-2xl sm:rounded-3xl border border-surface-strong/60 bg-gradient-to-br from-accent/10 via-background to-background p-5 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
              Dashboard
            </h1>
            <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted">
              Track how many agents are online, confirm WhatsApp connectivity,
              and jump straight into the workflows that need attention.
            </p>
          </div>
          <Link
            href="/dashboard/agents/templates"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/70 w-full md:w-auto"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
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
            Create agent
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        <StatCard
          title="Total agents"
          value={stats.totalAgents}
          icon={
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          }
          accent="indigo"
        />

        <StatCard
          title="Connected WhatsApp"
          value={stats.connectedWhatsApp}
          icon={
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              stroke="#22c55e"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
          accent="emerald"
        />
      </div>

      {/* WhatsApp Refresh Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl sm:rounded-2xl border border-dashed border-surface-strong/60 bg-surface px-4 py-3">
        <p className="text-xs sm:text-sm text-muted">
          WhatsApp connection counts update only when you refresh.
        </p>
        <button
          onClick={refreshWhatsAppStatuses}
          disabled={!agents.length || whatsAppRefreshing}
          className="inline-flex items-center justify-center rounded-lg border border-surface-strong/60 px-4 py-2 text-xs sm:text-sm font-semibold text-muted transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 w-full sm:w-auto"
        >
          {whatsAppRefreshing ? "Refreshing..." : "Refresh WhatsApp status"}
        </button>
      </div>

      {whatsAppError && (
        <p className="text-xs font-medium text-red-600 text-center sm:text-right px-4">
          {whatsAppError}
        </p>
      )}

      {/* Recent Agents Section */}
      <section className="rounded-2xl sm:rounded-3xl border border-surface-strong/60 bg-surface shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 border-b border-surface-strong/60 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Recent Agents
          </h2>
          <button
            onClick={() => router.push("/dashboard/agents/templates")}
            className="rounded-lg sm:rounded-xl bg-accent px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40 w-full sm:w-auto"
          >
            + Create Agent
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-4 sm:px-6 py-8 sm:py-12 text-center">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <svg
                className="h-6 w-6 sm:h-7 sm:w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                No agents yet
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted px-4">
                Create your first agent to unlock WhatsApp automation.
              </p>
            </div>
            <Link
              href="/dashboard/agents/templates"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-xs sm:text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/70 w-full sm:w-auto max-w-xs"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create agent
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-strong/60">
            {agents.slice(0, 5).map((agent) => {
              const session = whatsAppStatuses[agent.id] || null;
              const descriptor = describeWhatsAppStatus(session);
              const badgeClasses = toneToBadgeClasses(descriptor.tone);

              const createdAtLabel = agent.created_at
                ? new Date(agent.created_at).toLocaleDateString()
                : "Unknown date";

              return (
                <Link
                  key={agent.id}
                  href={`/dashboard/agents/${agent.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-4 transition hover:bg-accent/10"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-accent/10 text-accent">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {agent.name}
                      </p>
                      <p className="mt-1 text-xs text-muted truncate">
                        {agent.tools?.length || 0} tools • {createdAtLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 sm:text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold ${badgeClasses}`}
                    >
                      <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-current opacity-70"></span>
                      {descriptor.label}
                    </span>
                    <span className="max-w-[14rem] text-[10px] sm:text-[11px] leading-4 text-muted line-clamp-2">
                      {descriptor.helper}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
