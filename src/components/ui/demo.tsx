"use client";

import type { AnimatedAIChatProps } from "@/components/ui/animated-ai-chat";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";

export function Demo(props: AnimatedAIChatProps) {
  return (
    <div className="flex w-full overflow-x-hidden">
      <AnimatedAIChat {...props} />
    </div>
  );
}
