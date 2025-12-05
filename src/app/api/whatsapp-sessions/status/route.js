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

const buildBackendUrl = (agentId) => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${trimmedBase}/sessions/status`);
  url.searchParams.set("agentId", agentId);
  return url.toString();
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

export async function GET(request) {
  const agentId =
    request.nextUrl.searchParams.get("agentId") ||
    request.nextUrl.searchParams.get("agent_id");

  if (!agentId) {
    return respondWithError("agentId query parameter is required", 400);
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(buildBackendUrl(agentId), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const remotePayload = await remoteResponse.json().catch(() => ({}));

    if (!remoteResponse.ok) {
      const detail =
        typeof remotePayload?.detail === "string"
          ? remotePayload.detail
          : remotePayload?.message ||
            "Failed to fetch WhatsApp connection status";
      return respondWithError(detail, remoteResponse.status, {
        raw: remotePayload,
      });
    }

    const record =
      upsertWhatsAppSessionRecord(
        {
          agentId,
          ...(typeof remotePayload === "object" && remotePayload !== null
            ? remotePayload
            : {}),
        },
        {
          traceId:
            remotePayload?.traceId ||
            remotePayload?.trace_id ||
            remotePayload?.data?.traceId ||
            remotePayload?.data?.trace_id ||
            null,
        },
      ) || getWhatsAppSessionRecord(agentId);

    return NextResponse.json(
      buildWhatsAppSessionResponse(record, {
        rawPayload: remotePayload,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch WhatsApp status", { agentId, error });
    return respondWithError("Failed to reach WhatsApp session service", 502);
  }
}
