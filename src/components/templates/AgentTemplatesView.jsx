"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import templatesData from "@/data/agent-templates.json";
import TemplateConfirmationDialog from "@/components/TemplateConfirmationDialog";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "Customer Services", label: "Customer Services" },
  { id: "Education", label: "Education" },
  { id: "Finance", label: "Finance" },
  { id: "Project", label: "Project" },
  { id: "HR", label: "HR" },
  { id: "Research", label: "Research" },
];

const TRIAL_TEMPLATE_LIMIT = 2;

const UPGRADE_PLAN_OPTIONS = [
  {
    code: "PRO_M",
    name: "Pro Monthly",
    priceLabel: "Rp 100.000 / bulan",
    description: "30 hari akses penuh ke semua konektor termasuk WhatsApp.",
  },
  {
    code: "PRO_Y",
    name: "Pro Yearly",
    priceLabel: "Rp 1.000.000 / tahun",
    description: "Hemat 17% untuk akses sepanjang tahun dan prioritas support.",
  },
];

export default function AgentTemplatesView({
  heading = "Choose Agent Template",
  subheading = "Select a pre-configured template or start from scratch",
  actionLabel = "+ Customize Agent",
  onConfirmTemplate,
  onCreateFromScratch,
  allowCustomStart = true,
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState("PRO_M");
  const [upgradeProcessing, setUpgradeProcessing] = useState(false);

  const isTrialPlanUser = useMemo(() => {
    const plan =
      user?.subscription?.plan_code || user?.subscription?.planCode || "";
    return Boolean(
      user?.is_trial ||
        (typeof plan === "string" && plan.toLowerCase() === "trial")
    );
  }, [
    user?.is_trial,
    user?.subscription?.planCode,
    user?.subscription?.plan_code,
  ]);

  const trialAllowedTemplates = useMemo(() => {
    return new Set(
      templatesData
        .slice(0, TRIAL_TEMPLATE_LIMIT)
        .map((template) => template.id)
    );
  }, []);

  const filteredTemplates = useMemo(() => {
    let filtered = templatesData;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (template) => template.category === selectedCategory
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [selectedCategory, searchQuery]);

  const templateCount = useMemo(() => {
    if (selectedCategory === "all") {
      return templatesData.length;
    }
    return templatesData.filter((t) => t.category === selectedCategory).length;
  }, [selectedCategory]);

  const isTemplateLocked = (templateId) =>
    isTrialPlanUser && !trialAllowedTemplates.has(templateId);

  const handleLockedClick = () => {
    if (!isTrialPlanUser) {
      return;
    }
    setShowUpgradeModal(true);
  };

  const handleUseTemplate = (template) => {
    if (isTemplateLocked(template.id)) {
      handleLockedClick();
      return;
    }
    setSelectedTemplate(template);
    setShowConfirmDialog(true);
    setError(null);
  };

  const handleConfirmInterview = async () => {
    if (!selectedTemplate || !onConfirmTemplate) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const sessionId =
        typeof window !== "undefined" && window.crypto?.randomUUID
          ? `template-session-${window.crypto.randomUUID()}`
          : `template-session-${Date.now()}`;

      await onConfirmTemplate(selectedTemplate, sessionId);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(err.message || "Failed to start interview.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDialog = () => {
    setShowConfirmDialog(false);
    setSelectedTemplate(null);
    setIsLoading(false);
  };

  const handleCreateFromScratch = () => {
    if (isTrialPlanUser) {
      handleLockedClick();
      return;
    }
    onCreateFromScratch?.();
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
    setUpgradeProcessing(false);
  };

  const handleUpgradeRedirect = () => {
    if (!selectedUpgradePlan) {
      return;
    }
    setUpgradeProcessing(true);
    try {
      const params = new URLSearchParams({
        plan: selectedUpgradePlan,
        source: "template-lock",
      });
      if (user?.email) {
        params.set("email", user.email);
      }
      if (user?.user_id) {
        params.set("user_id", user.user_id);
      }
      router.push(`/payment?${params.toString()}`);
    } finally {
      setUpgradeProcessing(false);
      setShowUpgradeModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                {heading}
              </h1>
              <p className="text-sm text-muted sm:text-base">{subheading}</p>
            </div>
            {allowCustomStart && (
              <button
                onClick={handleCreateFromScratch}
                disabled={isTrialPlanUser}
                className={`w-full rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all sm:w-auto sm:px-6 ${
                  isTrialPlanUser
                    ? "cursor-not-allowed bg-surface-strong/60 text-muted"
                    : "bg-accent text-white shadow-accent/25 hover:bg-accent/90 hover:shadow-accent/40"
                }`}
              >
                {isTrialPlanUser ? "Upgrade to customize" : actionLabel}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 sm:mb-6 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900">
                    Failed to Start Interview
                  </h3>
                  <p className="mt-1 text-xs text-red-700 sm:text-sm">
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="relative mb-4 sm:mb-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
              <svg
                className="h-4 w-4 text-muted sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-surface-strong/60 bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground placeholder-muted transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 sm:py-3 sm:pl-12 sm:pr-4"
            />
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:gap-3 sm:px-0 sm:pb-0">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id;
              const count =
                category.id === "all"
                  ? templatesData.length
                  : templatesData.filter((t) => t.category === category.id)
                      .length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
                    isActive
                      ? "bg-accent text-white shadow-lg shadow-accent/40"
                      : "bg-surface text-muted hover:bg-surface/80"
                  }`}
                >
                  {category.label}
                  <span className="ml-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-xs font-semibold text-muted sm:ml-2 sm:px-2">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const locked = isTemplateLocked(template.id);
            return (
              <div
                key={template.id}
                className="relative rounded-2xl border border-surface-strong/60 bg-surface p-4 shadow-sm transition hover:border-accent/60 hover:shadow-lg sm:p-5"
              >
                {locked && (
                  <button
                    type="button"
                    onClick={handleLockedClick}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/60 text-center text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Lock className="mb-2 h-5 w-5 text-accent" />
                    <span className="text-sm font-semibold">
                      Trial limit reached
                    </span>
                    <span className="text-xs text-white/80">
                      Upgrade to unlock all templates
                    </span>
                  </button>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {template.category}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground sm:text-xl">
                      {template.name}
                    </h3>
                  </div>
                  <div className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Image
                      src="/icons/agent-template.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="h-5 w-5"
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted sm:mt-4">
                  {template.description}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    disabled={locked}
                    className={`text-sm font-semibold ${
                      locked
                        ? "cursor-not-allowed text-muted"
                        : "text-accent hover:text-accent-hover"
                    }`}
                  >
                    {locked ? "Locked" : "Use template →"}
                  </button>
                  {Array.isArray(template.tags) && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-strong/40 px-2 py-0.5 text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-surface-strong/60 bg-surface/40 p-8 text-center sm:mt-12 sm:p-12">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              No templates match "{searchQuery}"
            </h3>
            <p className="mt-2 text-xs text-muted sm:text-sm">
              Try another keyword or pick a different category.
            </p>
          </div>
        )}
      </div>

      <TemplateConfirmationDialog
        isOpen={showConfirmDialog}
        template={selectedTemplate}
        onConfirm={handleConfirmInterview}
        onCancel={handleCancelDialog}
        isLoading={isLoading}
      />

      {isTrialPlanUser && showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-surface-strong/60 bg-surface p-4 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={closeUpgradeModal}
              className="absolute right-3 top-3 rounded-full bg-surface px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-strong/70 sm:right-4 sm:top-4"
            >
              Close
            </button>
            <div className="space-y-3">
              <h3 className="pr-16 text-lg font-semibold text-foreground sm:text-xl">
                Upgrade required
              </h3>
              <p className="text-xs text-muted sm:text-sm">
                Trial plan hanya membuka 2 template pertama. Upgrade untuk
                memakai semua template dan fitur customize agent.
              </p>
              <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
                {UPGRADE_PLAN_OPTIONS.map((plan) => {
                  const isActive = selectedUpgradePlan === plan.code;
                  return (
                    <button
                      type="button"
                      key={plan.code}
                      onClick={() => setSelectedUpgradePlan(plan.code)}
                      className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
                        isActive
                          ? "border-accent bg-accent/5 shadow-lg"
                          : "border-surface-strong/60 hover:border-accent/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground sm:text-base">
                          {plan.name}
                        </span>
                        {isActive && (
                          <span className="text-xs font-semibold text-accent">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-medium text-foreground sm:text-sm">
                        {plan.priceLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {plan.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={closeUpgradeModal}
                  className="w-full rounded-lg border border-surface-strong/60 px-4 py-2 text-sm font-semibold text-muted hover:bg-surface sm:w-auto"
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={handleUpgradeRedirect}
                  disabled={upgradeProcessing}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60 sm:w-auto"
                >
                  {upgradeProcessing ? "Redirecting..." : "Continue to payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
