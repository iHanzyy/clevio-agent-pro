"use client";

import { Suspense } from "react";
import TemplateInterviewPageContent from "@/components/templates/TemplateInterviewPageContent";

export default function TrialTemplateChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-muted">Loading interview chat…</p>
          </div>
        </div>
      }
    >
      <TemplateInterviewPageContent
        fallbackPath="/trial/templates"
        nextPath="/trial/agent-form?fromInterview=true"
        redirectingCopy={{
          heading: "Preparing your trial agent...",
          description: "We’ll move you to the configuration form in a moment.",
        }}
      />
    </Suspense>
  );
}
