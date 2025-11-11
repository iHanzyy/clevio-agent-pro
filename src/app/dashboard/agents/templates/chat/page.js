"use client";

import { Suspense } from "react";
import TemplateInterviewPageContent from "@/components/templates/TemplateInterviewPageContent";

export default function TemplateChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted">Loading template chat…</p>
          </div>
        </div>
      }
    >
      <TemplateInterviewPageContent
        fallbackPath="/dashboard/agents/templates"
        nextPath="/dashboard/agents/new?fromInterview=true"
        redirectingCopy={{
          heading: "Creating your agent...",
          description:
            "Taking you to the builder to review your configuration.",
        }}
      />
    </Suspense>
  );
}
