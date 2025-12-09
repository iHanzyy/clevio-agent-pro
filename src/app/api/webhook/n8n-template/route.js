import { NextResponse } from "next/server";

const SESSION_STORE_KEY = "__n8nTemplateSessionStore";
const PENDING_SESSION_STORE_KEY = "__n8nTemplatePendingSessions";

const getSessionStore = () => {
  if (!globalThis[SESSION_STORE_KEY]) {
    globalThis[SESSION_STORE_KEY] = new Map();
  }
  return globalThis[SESSION_STORE_KEY];
};

const getPendingSessions = () => {
  if (!globalThis[PENDING_SESSION_STORE_KEY]) {
    globalThis[PENDING_SESSION_STORE_KEY] = new Map();
  }

  return globalThis[PENDING_SESSION_STORE_KEY];
};

const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

const cleanupStore = () => {
  const store = getSessionStore();
  const pendingSessions = getPendingSessions();
  const now = Date.now();

  for (const [key, value] of store.entries()) {
    if (now - value.receivedAt > CLEANUP_INTERVAL) {
      store.delete(key);
    }
  }

  for (const [key, value] of pendingSessions.entries()) {
    if (now - value.registeredAt > CLEANUP_INTERVAL) {
      pendingSessions.delete(key);
    }
  }
};

export async function POST(request) {
  cleanupStore();
  try {
    const payload = await request.json();
// ... (rest of POST function remains mostly the same, just ensuring cleanup is called)

    console.log("[N8N Template Webhook] Received payload:", payload);

    /**
     * Accept a more permissive payload shape from n8n.
     * Supported variants:
     * - { status: "completed", agent_data: { ... }, session_id }
     * - { agent_data: { ... } }
     * - { ...agentDataFields }
     * - [ { ...agentDataFields } ]
     */
    const extractAgentData = (value) => {
      if (!value) return null;

      const candidates = [
        value.agent_data,
        value.agentData,
        value.agent,
        value.data?.agent_data,
        value.data?.agentData,
        value.data?.agent,
      ];

      for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
          return candidate;
        }
      }

      if (Array.isArray(value) && value.length > 0) {
        const [first] = value;
        if (first && typeof first === "object") return first;
      }

      // As a final fallback, accept the object itself if it carries meaningful fields
      if (typeof value === "object" && Object.keys(value).length > 0) {
        return value;
      }

      return null;
    };

    const agentData = extractAgentData(payload);

    if (!agentData) {
      return NextResponse.json(
        { success: false, error: "Invalid payload structure: missing agent data" },
        { status: 400 }
      );
    }

    const pickStatus = (value) => {
      if (!value || typeof value !== "object") return null;
      const raw =
        value.status ||
        value.state ||
        value.result ||
        value.outcome ||
        value.data?.status ||
        value.data?.state ||
        value.data?.result ||
        value.data?.outcome;
      return raw ? String(raw).toLowerCase() : null;
    };

    const status = pickStatus(payload) || pickStatus(agentData) || "completed";
    const isCompleted = [
      "completed",
      "complete",
      "done",
      "success",
      "finished",
    ].includes(status);

    if (!isCompleted) {
      return NextResponse.json(
        { success: true, message: "Interview still in progress" },
        { status: 200 }
      );
    }

    // Extract session_id to identify which frontend instance to notify
    let sessionId =
      payload.session_id ||
      payload.sessionId ||
      agentData.session_id ||
      agentData.sessionId;
    const pendingSessions = getPendingSessions();

    if (!sessionId || typeof sessionId !== "string" || sessionId.includes("{{")) {
      const templateIdentifier =
        payload.template ||
        payload.template_id ||
        agentData.template ||
        agentData.template_id;
      const pendingEntries = [...pendingSessions.entries()].reverse();
      const fallbackEntry = pendingEntries.find(
        ([, info]) =>
          !info.matched &&
          (!templateIdentifier || info.templateId === templateIdentifier)
      );

      if (fallbackEntry) {
        sessionId = fallbackEntry[0];
        fallbackEntry[1].matched = true;
        console.log(
          "[N8N Template Webhook] Matched pending session:",
          sessionId
        );
      }
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing session_id" },
        { status: 400 }
      );
    }

    // Store the completed agent data temporarily
    // We'll use this endpoint to poll for completion
    // In production, you'd use Redis or a database
    // For now, we'll rely on the frontend polling mechanism

    console.log(
      "[N8N Template Webhook] Interview completed for session:",
      sessionId
    );
    console.log("[N8N Template Webhook] Agent data:", agentData);
    console.log("[N8N Template Webhook] Store before set:", {
      keys: Array.from(getSessionStore().keys()),
    });

    const store = getSessionStore();
    // Don't delete from pendingSessions immediately to allow for potential retries/debugging
    // pendingSessions.delete(sessionId); 

    store.set(sessionId, {
      agentData,
      template:
        payload.template ||
        payload.template_id ||
        agentData.template ||
        agentData.template_id ||
        null,
      receivedAt: Date.now(),
    });
    console.log("[N8N Template Webhook] Store after set:", {
      keys: Array.from(store.keys()),
    });

    return NextResponse.json({
      success: true,
      message: "Webhook received successfully",
      sessionId,
    });
  } catch (error) {
    console.error("[N8N Template Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Allow POST requests
export const dynamic = "force-dynamic";

export async function GET(request) {
  cleanupStore();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "Missing session parameter" },
      { status: 400 }
    );
  }

  const store = getSessionStore();
  const entry = store.get(sessionId);

  if (!entry) {
    console.log("[N8N Template Webhook] GET miss:", {
      sessionId,
      keys: Array.from(store.keys()),
    });
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 }
    );
  }

  // CRITICAL CHANGE: Do NOT delete the session immediately.
  // We want to allow multiple reads (e.g. poll + final fetch)
  // The cleanupStore function will handle expiration.
  
  // store.delete(sessionId);
  // const pendingSessions = getPendingSessions();
  // pendingSessions.delete(sessionId);

  return NextResponse.json({
    success: true,
    sessionId,
    agentData: entry.agentData,
    template: entry.template,
  });
}

export async function PUT(request) {
  try {
    const payload = await request.json();
    const sessionId = payload.sessionId;
    const templateId = payload.templateId || payload.template_id || null;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId" },
        { status: 400 }
      );
    }

    const pendingSessions = getPendingSessions();
    pendingSessions.set(sessionId, {
      templateId,
      matched: false,
      registeredAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[N8N Template Webhook] Failed to register session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
