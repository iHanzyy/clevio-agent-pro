"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import templatesData from "@/data/agent-templates.json";

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

  const handleUseTemplate = (templateId) => {
    setIsLoading(true);
    // TODO: Nanti akan diarahkan ke chatbot n8n
    console.log("Using template:", templateId);
    // router.push(`/dashboard/agents/new?template=${templateId}`);
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
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-surface-strong/60 bg-surface p-6"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-surface-strong/60" />
                  <div className="flex-1">
                    <div className="h-6 bg-surface-strong/60 rounded mb-2 w-3/4" />
                    <div className="h-4 bg-surface-strong/60 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-surface-strong/60 rounded" />
                  <div className="h-4 bg-surface-strong/60 rounded" />
                  <div className="h-4 bg-surface-strong/60 rounded w-5/6" />
                </div>
                <div className="h-10 bg-surface-strong/60 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
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
        onClick={() => onUseTemplate(template.id)}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40"
      >
        PAKAI TEMPLATE INI
      </button>
    </div>
  );
}
