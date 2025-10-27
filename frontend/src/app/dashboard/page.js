"use client";
import { useState, useEffect } from "react";
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

      let connectedCount = 0;
      const sessionMap = {};

      if (agentsData.length > 0) {
        const sessionResults = await Promise.allSettled(
          agentsData.map((agent) => apiService.getWhatsAppSession(agent.id))
        );

        sessionResults.forEach((result, index) => {
          const agentId = agentsData[index]?.id;
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
      }

      setWhatsAppStatuses(sessionMap);

      setStats({
        totalAgents: agentsData.length,
        connectedWhatsApp: connectedCount,
      });
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
      <div className="rounded-3xl border border-surface-strong/60 bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {value}
            </p>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.ring} ${styles.text}`}
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
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
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-muted mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-surface-strong/60 bg-gradient-to-br from-accent/10 via-background to-background p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Track how many agents are online, confirm WhatsApp connectivity,
              and jump straight into the workflows that need attention.
            </p>
          </div>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/70"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create agent
          </Link>
        </div>
      </section>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StatCard
          title="Total agents"
          value={stats.totalAgents}
          icon={
            <svg
              className="h-6 w-6"
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
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
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

      {/* Recent Agents */}
      <section className="rounded-3xl border border-surface-strong/60 bg-surface shadow-sm">
        <div className="flex flex-col gap-2 border-b border-surface-strong/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Your agents
              </h2>
              <p className="text-sm text-muted">
                A quick view of the latest assistants and their WhatsApp status.
              </p>
            </div>
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-accent"
            >
              View all
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
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
              <svg
                className="h-7 w-7"
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
              <h3 className="text-sm font-semibold text-foreground">
                No agents yet
              </h3>
              <p className="mt-1 text-sm text-muted">
                Create your first agent to unlock WhatsApp automation.
              </p>
            </div>
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/70"
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
                  className="flex items-center justify-between gap-6 px-6 py-4 transition hover:bg-accent/10"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
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
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {agent.name}
                      </p>
                      <p className="mt-1 text-xs text-muted truncate">
                        {agent.tools?.length || 0} tools • {createdAtLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses}`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current opacity-70"></span>
                      {descriptor.label}
                    </span>
                    <span className="max-w-[16rem] text-[11px] leading-4 text-muted line-clamp-2">
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
