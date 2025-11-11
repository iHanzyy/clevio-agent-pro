"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import AgentTemplatesView from "@/components/templates/AgentTemplatesView";

export default function TrialTemplatesPage() {
  const router = useRouter();

  const handleConfirmTemplate = useCallback(
    async (template, sessionId) => {
      router.push(
        `/trial/templates/chat?template=${template.id}&session=${encodeURIComponent(sessionId)}`,
      );
    },
    [router],
  );

  const handleCreateFromScratch = useCallback(() => {
    router.push("/trial/agent-form");
  }, [router]);

  return (
    <AgentTemplatesView
      heading="Pick a starter agent"
      subheading="Walk through a template interview to auto-configure your trial agent."
      actionLabel="Skip to configuration"
      onConfirmTemplate={handleConfirmTemplate}
      onCreateFromScratch={handleCreateFromScratch}
      allowCustomStart={false}
    />
  );
}
