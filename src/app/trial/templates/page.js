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

  return (
    <AgentTemplatesView
      heading="Choose Agent Template"
      subheading="Pilih template, lanjut wawancara, lalu form otomatis terisi"
      onConfirmTemplate={handleConfirmTemplate}
      allowCustomStart={false}
    />
  );
}
