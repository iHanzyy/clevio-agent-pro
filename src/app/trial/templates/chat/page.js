"use client";

import TemplateInterviewPageContent from "@/components/templates/TemplateInterviewPageContent";

export default function TrialTemplateChatPage() {
  return (
    <TemplateInterviewPageContent
      fallbackPath="/trial/templates"
      nextPath="/trial/agent-form?fromInterview=true"
      redirectingCopy={{
        heading: "Preparing your trial agent...",
        description: "We’ll move you to the configuration form in a moment.",
      }}
    />
  );
}
