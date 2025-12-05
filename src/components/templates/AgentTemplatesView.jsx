"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Search, Sparkles, Users, Target, HeadphonesIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import templatesData from "@/data/agent-templates.json";
import TemplateConfirmationDialog from "@/components/TemplateConfirmationDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "Customer Services", label: "Customer Services", icon: HeadphonesIcon },
  { id: "Education", label: "Education", icon: Target },
  { id: "Finance", label: "Finance", icon: Target },
  { id: "Project", label: "Project", icon: Target },
  { id: "HR", label: "HR", icon: Users },
  { id: "Research", label: "Research", icon: Target },
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

  const customTemplate = useMemo(
    () => templatesData.find((t) => t.id === "custom-agent") || null,
    [],
  );

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
    if (customTemplate) {
      setSelectedTemplate(customTemplate);
      setShowConfirmDialog(true);
      setError(null);
      return;
    }
    // Fallback: use first available template
    const fallbackTemplate = templatesData[0];
    if (fallbackTemplate) {
      setSelectedTemplate(fallbackTemplate);
      setShowConfirmDialog(true);
      setError(null);
    }
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
    <div className="min-h-screen bg-background">
      <div className="container-spacing section-spacing">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <motion.h1
                className="mb-2 text-3xl font-bold text-foreground sm:text-4xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {heading}
              </motion.h1>
              <motion.p
                className="text-muted-foreground sm:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {subheading}
              </motion.p>
            </div>
            {/* Only keep one Customize CTA below the search bar to avoid duplicates */}
          </div>
        </motion.div>

                {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <Card className="card-shadow border-0 bg-gradient-to-br from-background to-muted/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border-0 bg-transparent py-4 pl-12 pr-4 text-foreground placeholder-muted-foreground transition-all focus:outline-none focus:ring-0"
                  />
                </div>

                {/* Customize Agent Button (single entry point) */}
                {allowCustomStart && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateFromScratch}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white font-medium shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all flex-shrink-0"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span className="hidden sm:inline">Customize Agent</span>
                    <span className="sm:hidden">Custom</span>
                  </motion.button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="mb-6"
            >
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                      <svg
                        className="h-5 w-5 text-destructive"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        Failed to Start Interview
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {error}
                      </p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
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
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="overflow-x-auto scrollbar-hide pb-2 sm:pb-0 sm:overflow-x-visible">
            <div className="flex flex-nowrap gap-3 sm:flex-wrap min-w-max sm:min-w-0">
            {CATEGORIES.map((category, index) => {
              const isActive = selectedCategory === category.id;
              const count =
                category.id === "all"
                  ? templatesData.length
                  : templatesData.filter((t) => t.category === category.id)
                      .length;
              const IconComponent = category.icon;

              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105 ${
                    isActive
                      ? "bg-gradient-to-r from-accent to-accent-hover text-white shadow-lg shadow-accent/25"
                      : "bg-surface text-muted-foreground hover:bg-surface-strong hover:text-foreground"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {category.label}
                  <Badge
                    variant="secondary"
                    className={`ml-1 px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white hover:bg-white/30"
                        : "bg-surface-strong/60"
                    }`}
                  >
                    {count}
                  </Badge>
                </motion.button>
              );
            })}
            </div>
          </div>
        </motion.div>
        {/* Templates Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="wait">
            {filteredTemplates.map((template, index) => {
              const locked = isTemplateLocked(template.id);

              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    delay: 0.8 + index * 0.1,
                    duration: 0.3
                  }}
                  layout
                >
                  <Card className="group relative h-full cursor-pointer border-surface-strong/60 bg-surface transition-all hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10 card-shadow">
                    <CardContent className="p-6">
                      {/* Lock Overlay */}
                      {locked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLockedClick();
                          }}
                          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/70 text-center text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <Lock className="mb-3 h-6 w-6 text-accent" />
                          <span className="text-sm font-semibold">
                            Trial limit reached
                          </span>
                          <span className="text-xs text-white/80">
                            Upgrade to unlock all templates
                          </span>
                        </button>
                      )}

                      {/* Template Content */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="secondary" className="mb-3 text-xs">
                            {template.category}
                          </Badge>
                          <h3 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
                            {template.name}
                          </h3>
                        </div>
                        <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 text-accent">
                          <Image
                            src="/templates/robot.svg"
                            alt=""
                            width={28}
                            height={28}
                            className="h-6 w-6"
                          />
                        </div>
                      </div>

                      <p className="mt-4 text-muted-foreground leading-relaxed">
                        {template.description}
                      </p>

                      {/* Tags */}
                      {Array.isArray(template.tags) && template.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs border-surface-strong/40 bg-surface/50"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-xs border-surface-strong/40 bg-surface/50"
                            >
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="mt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseTemplate(template);
                          }}
                          disabled={locked}
                          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                            locked
                              ? "cursor-not-allowed bg-surface-strong/60 text-muted-foreground"
                              : "bg-gradient-to-r from-accent to-accent-hover text-white hover:shadow-lg hover:shadow-accent/25 hover:scale-105"
                          }`}
                        >
                          {locked ? "Locked" : "Use Template"}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        <AnimatePresence>
          {filteredTemplates.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-12"
            >
              <Card className="border-dashed border-surface-strong/40 bg-surface/50">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-surface-strong/30 flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    No templates found
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No templates match "{searchQuery}". Try another keyword or pick a different category.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
          {/* Confirmation Dialog */}
      <TemplateConfirmationDialog
        isOpen={showConfirmDialog}
        template={selectedTemplate}
        onConfirm={handleConfirmInterview}
        onCancel={handleCancelDialog}
        isLoading={isLoading}
      />

      {/* Upgrade Modal */}
      <AnimatePresence>
        {isTrialPlanUser && showUpgradeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={closeUpgradeModal}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="border-surface-strong/60 bg-surface shadow-2xl">
                  <CardContent className="p-6 sm:p-8">
                    <button
                      type="button"
                      onClick={closeUpgradeModal}
                      className="absolute right-4 top-4 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-strong/70 transition-colors"
                    >
                      Close
                    </button>

                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 text-accent">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">
                          Upgrade required
                        </h3>
                      </div>
                      <p className="text-muted-foreground">
                        Trial plan hanya membuka 2 template pertama. Upgrade untuk
                        memakai semua template dan fitur customize agent.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {UPGRADE_PLAN_OPTIONS.map((plan) => {
                        const isActive = selectedUpgradePlan === plan.code;
                        return (
                          <motion.button
                            key={plan.code}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedUpgradePlan(plan.code)}
                            className={`relative rounded-2xl border p-4 text-left transition-all ${
                              isActive
                                ? "border-accent bg-gradient-to-br from-accent/5 to-accent/10 shadow-lg shadow-accent/20"
                                : "border-surface-strong/60 hover:border-accent/40 hover:bg-surface/50"
                            }`}
                          >
                            {isActive && (
                              <Badge className="absolute -top-2 -right-2 bg-accent text-white">
                                Selected
                              </Badge>
                            )}
                            <h4 className="font-semibold text-foreground mb-2">
                              {plan.name}
                            </h4>
                            <p className="text-sm font-medium text-foreground mb-1">
                              {plan.priceLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {plan.description}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeUpgradeModal}
                        className="w-full rounded-lg border border-surface-strong/60 px-6 py-3 text-sm font-medium text-muted-foreground hover:bg-surface transition-colors sm:w-auto"
                      >
                        Maybe later
                      </button>
                      <button
                        type="button"
                        onClick={handleUpgradeRedirect}
                        disabled={upgradeProcessing}
                        className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-hover px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all sm:w-auto disabled:opacity-60"
                      >
                        {upgradeProcessing ? "Redirecting..." : "Continue to payment"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
