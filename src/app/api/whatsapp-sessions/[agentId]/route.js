import { NextResponse } from "next/server";
import {
  deleteWhatsAppSessionRecord,
  getWhatsAppSessionRecord,
  pruneWhatsAppSessionRecords,
} from "@/lib/server/whatsappSessionStore";
import { buildWhatsAppSessionResponse } from "@/lib/server/whatsappSessionResponses";

const DEFAULT_BACKEND_BASE_URL =
  process.env.WHATSAPP_BACKEND_BASE_URL ?? "https://wapi-v1.chiefaiofficer.id";

const buildBackendUrl = (agentId, suffix = "") => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  const encodedAgentId = encodeURIComponent(agentId);
  if (suffix && !suffix.startsWith("/")) {
    return `${trimmedBase}/sessions/${encodedAgentId}/${suffix}`;
  }
  return `${trimmedBase}/sessions/${encodedAgentId}${suffix}`;
};

const respondWithError = (message, status = 400, extra = {}) =>
  NextResponse.json(
    {
      success: false,
      message,
      ...extra,
    },
    { status },
  );

export async function DELETE(_request, context) {
  const params = (context && (await context.params)) || {};
  const agentId = params?.agentId;

  if (!agentId || typeof agentId !== "string") {
    return respondWithError("agentId parameter is required", 400);
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(buildBackendUrl(agentId), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let remotePayload = null;
    try {
      remotePayload = await remoteResponse.json();
    } catch {
      remotePayload = null;
    }

    if (!remoteResponse.ok) {
      const detail =
        typeof remotePayload?.detail === "string"
          ? remotePayload.detail
          : remotePayload?.message ||
            `Failed to delete WhatsApp session (${remoteResponse.status})`;
      return respondWithError(detail, remoteResponse.status, {
        raw: remotePayload,
      });
    }

    deleteWhatsAppSessionRecord(agentId);

    return NextResponse.json(
      {
        success: true,
        agentId,
        deleted: true,
        data: remotePayload,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete WhatsApp session", {
      agentId,
      error,
    });
    return respondWithError("Failed to reach WhatsApp session service", 502);
  }
}

export async function GET(_request, context) {
  const params = (context && (await context.params)) || {};
  const agentId = params?.agentId;

  if (!agentId || typeof agentId !== "string") {
    return respondWithError("agentId parameter is required", 400);
  }

  pruneWhatsAppSessionRecords();
  const record = getWhatsAppSessionRecord(agentId);
  if (!record) {
    return respondWithError("Session not found", 404);
  }

  return NextResponse.json(buildWhatsAppSessionResponse(record), {
    status: 200,
  });
}
