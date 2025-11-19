"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import TemplateInterviewPageContent from "@/components/templates/TemplateInterviewPageContent";
import { Card, CardContent } from "@/components/ui/card";

const LoadingFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex min-h-screen items-center justify-center bg-background"
  >
    <Card className="w-full max-w-sm sm:max-w-md mx-4 border-surface-strong/60 shadow-xl">
      <CardContent className="p-6 sm:p-8 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mx-auto mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/10"
        >
          <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg font-semibold text-foreground mb-2"
        >
          Initializing AI Assistant
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm"
        >
          Setting up your template configuration chat...
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-xs text-muted-foreground">Connecting to AI...</span>
        </motion.div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function TemplateChatPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TemplateInterviewPageContent
        fallbackPath="/dashboard/agents/templates"
        nextPath="/dashboard/agents/new?fromInterview=true"
        redirectingCopy={{
          heading: "Creating Your AI Agent",
          description: "Applying your configuration and taking you to the agent builder...",
        }}
      />
    </Suspense>
  );
}
