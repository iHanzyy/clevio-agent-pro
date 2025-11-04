"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Demo } from "@/components/ui/demo";
import { useAuth } from "@/contexts/AuthContext";

export default function TrialChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    const planCode =
      user?.subscription?.plan_code?.toLowerCase?.() ||
      (user?.subscription?.planCode || "").toLowerCase();
    if (!user?.is_trial && planCode !== "trial") {
      router.replace("/dashboard");
    }
  }, [router, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const agentId = searchParams.get("agentId");
    if (agentId) {
      try {
        sessionStorage.setItem(
          "trialActiveAgentId",
          JSON.stringify({
            agentId,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.warn("Unable to persist trial agent id", error);
      }
    }
  }, [searchParams]);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Demo />
    </div>
  );
}
