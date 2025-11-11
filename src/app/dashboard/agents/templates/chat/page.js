"use client";

import TemplateInterviewPageContent from "@/components/templates/TemplateInterviewPageContent";

export default function TemplateChatPage() {
  return (
    <TemplateInterviewPageContent
      fallbackPath="/dashboard/agents/templates"
      nextPath="/dashboard/agents/new?fromInterview=true"
      redirectingCopy={{
        heading: "Creating your agent...",
        description: "Taking you to the builder to review your configuration.",
      }}
    />
  );
}
