"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  RefreshCw,
  Plus,
} from "lucide-react";

import { useDashboardData } from "./hooks/useDashboardData";
import { useMobileDetection } from "./hooks/useMobileDetection";
import { useDashboardActions } from "./hooks/useDashboardActions";
import { StatsCard } from "./components/stats-card";
import { RecentAgents } from "./components/recent-agents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Loading state component
const DashboardSkeleton = () => (
  <div className="dashboard-grid container-spacing">
    {/* Stats Grid Skeleton */}
    <div className="stats-grid">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Content Grid Skeleton */}
    <div className="content-grid">
      {/* Recent Agents Skeleton */}
      <Card className="content-main">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Empty state component
const DashboardEmpty = ({ onCreateAgent }: { onCreateAgent: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-[400px] text-center"
  >
    <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
      <Bot className="h-10 w-10 text-white" />
    </div>

    <h1 className="text-3xl font-bold text-foreground mb-4">
      Welcome to Clevio AI Staff
    </h1>

    <p className="text-muted-foreground text-lg max-w-md mb-8">
      Create your first AI agent to start automating customer service and sales
      conversations 24/7.
    </p>

    <Button
      onClick={onCreateAgent}
      size="lg"
      variant="default"
      className="px-8"
    >
      <Plus className="h-5 w-5 mr-2" />
      Create Your First Agent
    </Button>
  </motion.div>
);


export default function Dashboard() {
  const {
    agents,
    stats,
    loading,
    error,
    authLoading,
    user,
    loadDashboardData,
  } = useDashboardData();

  const isMobile = useMobileDetection();
  const { handleCreateAgent, handleAgentClick } = useDashboardActions();

  // Authentication and subscription checks
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (!user.subscription?.is_active) {
      window.location.href = "/payment";
      return;
    }

    loadDashboardData();
  }, [authLoading, user, loadDashboardData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-spacing py-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error Loading Dashboard
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAgents = agents.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container-spacing section-spacing">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Dashboard
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground">
                <span>
                  Welcome back, {user?.name || "User"}! Here&apos;s what&apos;s
                  happening with your AI agents.
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {!hasAgents ? (
          <DashboardEmpty onCreateAgent={handleCreateAgent} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="dashboard-grid"
          >
            {/* Stats Grid */}
            <div className="stats-grid mb-6">
              <StatsCard
                title="Total Agents"
                value={stats.totalAgents}
                icon={Bot}
                description="AI assistants created"
              />

              <StatsCard
                title="WhatsApp Connected"
                value={stats.connectedWhatsApp}
                icon={RefreshCw}
                description="Active integrations"
              />
            </div>

            {/* Content Grid */}
            <div className="content-grid">
              {/* Recent Agents */}
              <div className="content-main">
                <RecentAgents
                  agents={agents}
                  onCreateAgent={handleCreateAgent}
                  onAgentClick={handleAgentClick}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
