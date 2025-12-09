import { NextResponse } from "next/server";
import {
  getWhatsAppSessionRecord,
  pruneWhatsAppSessionRecords,
  upsertWhatsAppSessionRecord,
} from "@/lib/server/whatsappSessionStore";
import { buildWhatsAppSessionResponse } from "@/lib/server/whatsappSessionResponses";

const DEFAULT_BACKEND_BASE_URL =
  process.env.WHATSAPP_STATUS_BASE_URL ||
  process.env.WHATSAPP_BACKEND_BASE_URL ||
  "http://localhost:8080/api/v1";

const buildBackendUrl = (agentId) => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${trimmedBase}/sessions/detail`);
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

const pickString = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
};

export async function POST(request) {
  let payload = {};
  try {
    payload = (await request.json()) || {};
  } catch (_error) {
    payload = {};
  }

  const searchParams = request.nextUrl.searchParams;
  const agentId =
    pickString(payload.agentId, payload.agent_id, payload.agent) ||
    pickString(
      searchParams.get("agentId"),
      searchParams.get("agent_id"),
      searchParams.get("agent"),
    );

  if (!agentId) {
    return respondWithError("agentId is required to fetch WhatsApp QR");
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(buildBackendUrl(agentId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let remotePayload = await remoteResponse.json().catch(() => ({}));

    // Handle array response: [ { data: ... } ]
    if (Array.isArray(remotePayload) && remotePayload.length > 0) {
      remotePayload = remotePayload[0];
    }

    if (!remoteResponse.ok) {
      const detail =
        typeof remotePayload?.detail === "string"
          ? remotePayload.detail
          : remotePayload?.message ??
            remotePayload?.error ??
            "Failed to fetch WhatsApp session detail";
      return respondWithError(detail, remoteResponse.status, {
        raw: remotePayload,
      });
    }

    // Extract data from nested object if present
    const payloadData = remotePayload?.data || remotePayload;

    const traceId =
      remotePayload?.traceId ||
      remotePayload?.trace_id ||
      payloadData?.traceId ||
      payloadData?.trace_id ||
      null;

    const record =
      upsertWhatsAppSessionRecord(
        {
          agentId,
          status: payloadData?.status || "pending",
          ...(typeof remotePayload === "object" && remotePayload !== null
            ? remotePayload
            : {}),
        },
        { traceId },
      ) || getWhatsAppSessionRecord(agentId);

    if (!record) {
      return respondWithError(
        "Unable to persist WhatsApp QR payload",
        500,
        { raw: remotePayload },
      );
    }

    const responseBody = buildWhatsAppSessionResponse(record, {
      rawPayload: remotePayload,
    });

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch WhatsApp QR", error);
    return respondWithError("Failed to reach WhatsApp QR service", 502);
  }
}
