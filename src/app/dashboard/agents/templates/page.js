"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import AgentTemplatesView from "@/components/templates/AgentTemplatesView";

export default function AgentTemplatesPage() {
  const router = useRouter();

  const handleConfirmTemplate = useCallback(
    async (template, sessionId) => {
      router.push(
        `/dashboard/agents/templates/chat?template=${template.id}&session=${encodeURIComponent(sessionId)}`,
      );
    },
    [router],
  );

  return (
    <AgentTemplatesView
      onConfirmTemplate={handleConfirmTemplate}
      subheading="Pilih template, lanjut wawancara, lalu form otomatis terisi"
    />
  );
}
