"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

export default function AgentTemplatesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState(null);

  const filteredTemplates = useMemo(() => {
    let filtered = templatesData;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (template) => template.category === selectedCategory
      );
    }

    // Filter by search query
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

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setShowConfirmDialog(true);
    setError(null);
  };

  const handleConfirmInterview = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    setError(null);

    try {
      // Send template data to n8n webhook
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

      const response = await fetch(
        "https://n8n-new.chiefaiofficer.id/webhook/templateAgent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: `template-session-${Date.now()}`,
            template_id: selectedTemplate.id,
            template_data: {
              name: selectedTemplate.name,
              category: selectedTemplate.category,
              description: selectedTemplate.description,
              config: selectedTemplate.config,
              allowed_tools: selectedTemplate.allowed_tools,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Failed to start interview: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("n8n response:", data);

      // Redirect to chat page
      router.push(
        `/dashboard/agents/templates/chat?template=${selectedTemplate.id}`
      );
    } catch (err) {
      console.error("Failed to start interview:", err);

      if (err.name === "AbortError") {
        setError(
          "Request timed out. Please check your connection and try again."
        );
      } else {
        setError(
          err.message ||
            "Failed to start interview. Please try again or contact support."
        );
      }

      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const handleCancelDialog = () => {
    setShowConfirmDialog(false);
    setSelectedTemplate(null);
    setIsLoading(false);
  };

  const handleCreateFromScratch = () => {
    router.push("/dashboard/agents/new");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Choose Agent Template
              </h1>
              <p className="text-muted">
                Select a pre-configured template or start from scratch
              </p>
            </div>
            <button
              onClick={handleCreateFromScratch}
              className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40"
            >
              + Create Agent
            </button>
          </div>

          {/* Error Message */}
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
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg
                className="w-5 h-5 text-muted"
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
              className="w-full rounded-2xl border border-surface-strong/60 bg-surface pl-12 pr-4 py-3 text-sm text-foreground placeholder-muted focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          {/* Category Filter */}
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
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent text-white shadow-lg shadow-accent/25"
                      : "bg-surface text-muted border border-surface-strong/60 hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {category.label}{" "}
                  {isActive && (
                    <span className="ml-1 opacity-90">({templateCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-strong/60 mb-4">
              <svg
                className="w-8 h-8 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No templates found
            </h3>
            <p className="text-muted mb-6">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-accent hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUseTemplate={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
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

function TemplateCard({ template, onUseTemplate }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative flex flex-col justify-between gap-4 rounded-3xl border border-surface-strong/60 bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-2xl">
      {/* Template Header */}
      <div className="flex items-start gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-strong/60 flex-shrink-0">
          {!imageError ? (
            <Image
              src={template.avatar}
              alt={template.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-accent">
              {template.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {template.name}
          </h3>
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {template.category}
          </span>
        </div>
      </div>

      {/* Template Description */}
      <p className="text-sm leading-relaxed text-muted line-clamp-3">
        {template.description}
      </p>

      {/* Template Config Info */}
      <div className="flex flex-wrap gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-strong/60 px-2 py-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          {template.config.llm_model}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-strong/60 px-2 py-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
              clipRule="evenodd"
            />
          </svg>
          {template.allowed_tools.length} tools
        </span>
      </div>

      {/* Use Template Button */}
      <button
        onClick={() => onUseTemplate(template)}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40"
      >
        PAKAI TEMPLATE INI
      </button>
    </div>
  );
}
