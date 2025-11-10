import { NextResponse } from "next/server";
import {
  getWhatsAppSessionRecord,
  pruneWhatsAppSessionRecords,
  upsertWhatsAppSessionRecord,
} from "@/lib/server/whatsappSessionStore";
import { buildWhatsAppSessionResponse } from "@/lib/server/whatsappSessionResponses";

const DEFAULT_BACKEND_BASE_URL =
  process.env.WHATSAPP_BACKEND_BASE_URL ??
  "https://lfzlwlbz-3000.asse.devtunnels.ms";

const buildBackendUrl = (agentId) => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  const encodedAgentId = encodeURIComponent(agentId);
  return `${trimmedBase}/sessions/${encodedAgentId}/qr`;
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

const extractQrDetails = (payload = {}) => {
  if (!payload || typeof payload !== "object") {
    return {
      base64: null,
      contentType: "image/png",
      qrRaw: null,
    };
  }

  const qrCandidate =
    payload?.data?.qr ||
    payload?.qr ||
    payload?.data?.qr_code ||
    payload?.data?.qrCode ||
    payload?.qr_code ||
    payload?.qrCode ||
    null;

  const base64 =
    pickString(
      qrCandidate?.base64,
      qrCandidate?.qr,
      qrCandidate?.data,
      payload?.data?.base64,
      payload?.base64,
    ) || null;

  const contentType =
    pickString(
      qrCandidate?.contentType,
      qrCandidate?.mime_type,
      qrCandidate?.mimeType,
      payload?.contentType,
    ) || "image/png";

  return {
    base64,
    contentType,
    qrRaw: qrCandidate,
  };
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const remotePayload = await remoteResponse.json().catch(() => ({}));

    if (!remoteResponse.ok) {
      const detail =
        typeof remotePayload?.detail === "string"
          ? remotePayload.detail
          : remotePayload?.message ??
            remotePayload?.error ??
            "Failed to generate WhatsApp QR";
      return respondWithError(detail, remoteResponse.status, {
        raw: remotePayload,
      });
    }

    const { base64, contentType, qrRaw } = extractQrDetails(remotePayload);
    if (!base64) {
      return respondWithError(
        "WhatsApp backend did not return a QR payload",
        502,
        { raw: remotePayload },
      );
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
          qr: {
            ...(qrRaw && typeof qrRaw === "object" ? qrRaw : {}),
            base64,
            contentType,
          },
          qrUpdatedAt: new Date().toISOString(),
          data: remotePayload,
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
