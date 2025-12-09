import { NextResponse } from "next/server";
import {
  getWhatsAppSessionRecord,
  pruneWhatsAppSessionRecords,
  upsertWhatsAppSessionRecord,
} from "@/lib/server/whatsappSessionStore";
import { buildWhatsAppSessionResponse } from "@/lib/server/whatsappSessionResponses";

const DEFAULT_BACKEND_BASE_URL =
  process.env.WHATSAPP_BACKEND_BASE_URL ||
  process.env.WHATSAPP_STATUS_BASE_URL ||
  "http://localhost:8080/api/v1";

const buildBackendUrl = () => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  return `${trimmedBase}/sessions/reconnect`;
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

export async function POST(_request, context) {
  const params = (context && (await context.params)) || {};
  const agentId = params?.agentId;

  if (!agentId || typeof agentId !== "string") {
    return respondWithError("agentId parameter is required", 400);
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(buildBackendUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId }),
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
            `Failed to reconnect WhatsApp session (${remoteResponse.status})`;
      return respondWithError(detail, remoteResponse.status, {
        raw: remotePayload,
      });
    }

    const traceId =
      remotePayload?.traceId ||
      remotePayload?.trace_id ||
      remotePayload?.data?.traceId ||
      remotePayload?.data?.trace_id ||
      null;

    const record =
      upsertWhatsAppSessionRecord(
        {
          agentId,
          status: "pending",
          ...(typeof remotePayload === "object" && remotePayload !== null
            ? remotePayload
            : {}),
        },
        { traceId },
      ) || getWhatsAppSessionRecord(agentId);

    return NextResponse.json(buildWhatsAppSessionResponse(record), {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to reconnect WhatsApp session", {
      agentId,
      error,
    });
    return respondWithError("Failed to reach WhatsApp session service", 502);
  }
}
