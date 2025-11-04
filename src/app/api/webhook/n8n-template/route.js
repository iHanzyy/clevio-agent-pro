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

export async function POST(request) {
  try {
    const payload = await request.json();

    console.log("[N8N Template Webhook] Received payload:", payload);

    // Validate payload structure
    if (!payload.status || !payload.agent_data) {
      return NextResponse.json(
        { success: false, error: "Invalid payload structure" },
        { status: 400 }
      );
    }

    // Check if interview is completed
    if (payload.status !== "completed") {
      return NextResponse.json(
        { success: true, message: "Interview still in progress" },
        { status: 200 }
      );
    }

    // Extract session_id to identify which frontend instance to notify
    let sessionId = payload.session_id || payload.sessionId;
    const pendingSessions = getPendingSessions();

    if (!sessionId || typeof sessionId !== "string" || sessionId.includes("{{")) {
      const templateIdentifier = payload.template || payload.template_id;
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
    console.log("[N8N Template Webhook] Agent data:", payload.agent_data);
    console.log("[N8N Template Webhook] Store before set:", {
      keys: Array.from(getSessionStore().keys()),
    });

    const store = getSessionStore();
    pendingSessions.delete(sessionId);

    store.set(sessionId, {
      agentData: payload.agent_data,
      template: payload.template || payload.template_id || null,
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

  store.delete(sessionId);
  const pendingSessions = getPendingSessions();
  pendingSessions.delete(sessionId);

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
