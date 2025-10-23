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
    totalConversations: 0,
    messagesThisWeek: 0,
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
          agentsData.map((agent) =>
            apiService.getWhatsAppSession(agent.id),
          ),
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
        totalConversations: 0,
        messagesThisWeek: 0,
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
        ring: "bg-indigo-500/15 dark:bg-indigo-500/20",
        text: "text-indigo-600 dark:text-indigo-300",
      },
      emerald: {
        ring: "bg-emerald-500/15 dark:bg-emerald-500/20",
        text: "text-emerald-600 dark:text-emerald-300",
      },
      blue: {
        ring: "bg-blue-500/15 dark:bg-blue-500/20",
        text: "text-blue-600 dark:text-blue-300",
      },
      purple: {
        ring: "bg-purple-500/15 dark:bg-purple-500/20",
        text: "text-purple-600 dark:text-purple-300",
      },
    };

    const styles = palette[accent] || palette.indigo;

    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
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
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-indigo-500/10 via-white to-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:from-indigo-500/20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              Control center
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Track how many agents are online, confirm WhatsApp connectivity, and jump
              straight into the workflows that need attention.
            </p>
          </div>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create agent
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href="/dashboard/agents/new"
          className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/70"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <svg
              className="h-5 w-5 text-slate-400 transition group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-6 space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Create new agent
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Spin up an assistant tailored to your workflows.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/70"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <svg
              className="h-5 w-5 text-slate-400 transition group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-6 space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              View analytics
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Understand engagement and message volume at a glance.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/settings"
          className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/70"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <svg
              className="h-5 w-5 text-slate-400 transition group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-6 space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage billing, credentials, and workspace preferences.
            </p>
          </div>
        </Link>
      </section>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total agents"
          value={stats.totalAgents}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          accent="emerald"
        />

        <StatCard
          title="Conversations"
          value={stats.totalConversations}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
          accent="blue"
        />

        <StatCard
          title="Messages this week"
          value={stats.messagesThisWeek}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          }
          accent="purple"
        />
      </div>

      {/* Recent Agents */}
      <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 p-6 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Your agents
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                A quick view of the latest assistants and their WhatsApp status.
              </p>
            </div>
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              View all
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                No agents yet
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create your first agent to unlock WhatsApp automation.
              </p>
            </div>
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create agent
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700">
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
                  className="flex items-center justify-between gap-6 px-6 py-4 transition hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {agent.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
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
                    <span className="max-w-[16rem] text-[11px] leading-4 text-slate-500 line-clamp-2 dark:text-slate-400">
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
