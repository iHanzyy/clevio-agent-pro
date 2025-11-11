"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

export default function AgentTemplatesView({
  heading = "Choose Agent Template",
  subheading = "Select a pre-configured template or start from scratch",
  actionLabel = "+ Customize Agent",
  onConfirmTemplate,
  onCreateFromScratch,
  allowCustomStart = true,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState(null);

  const filteredTemplates = useMemo(() => {
    let filtered = templatesData;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (template) => template.category === selectedCategory,
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query),
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

  const handleUseTemplate = (template) => {
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
    onCreateFromScratch?.();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">
                {heading}
              </h1>
              <p className="text-muted">{subheading}</p>
            </div>
            {allowCustomStart && (
              <button
                onClick={handleCreateFromScratch}
                className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40"
              >
                {actionLabel}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
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
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
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

          <div className="relative mb-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg
                className="h-5 w-5 text-muted"
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
              className="w-full rounded-2xl border border-surface-strong/60 bg-surface py-3 pl-12 pr-4 text-sm text-foreground placeholder-muted transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-wrap gap-3">
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
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-accent text-white shadow-lg shadow-accent/40"
                      : "bg-surface text-muted hover:bg-surface/80"
                  }`}
                >
                  {category.label}
                  <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-muted">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-2xl border border-surface-strong/60 bg-surface p-5 shadow-sm transition hover:border-accent/60 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {template.category}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">
                    {template.name}
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Image
                    src="/icons/agent-template.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="h-5 w-5"
                  />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted">{template.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="text-sm font-semibold text-accent hover:text-accent-hover"
                >
                  Use template →
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
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="mt-12 rounded-3xl border border-dashed border-surface-strong/60 bg-surface/40 p-12 text-center">
            <h3 className="text-xl font-semibold text-foreground">
              No templates match “{searchQuery}”
            </h3>
            <p className="mt-2 text-sm text-muted">
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
    </div>
  );
}
