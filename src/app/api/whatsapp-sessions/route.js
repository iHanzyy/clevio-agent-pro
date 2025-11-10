import { NextResponse } from "next/server";
import {
  getWhatsAppSessionRecord,
  pruneWhatsAppSessionRecords,
  upsertWhatsAppSessionRecord,
} from "@/lib/server/whatsappSessionStore";
import {
  buildWhatsAppNotFoundResponse,
  buildWhatsAppSessionResponse,
} from "@/lib/server/whatsappSessionResponses";

const DEFAULT_BACKEND_BASE_URL =
  process.env.WHATSAPP_BACKEND_BASE_URL ??
  "https://lfzlwlbz-3000.asse.devtunnels.ms";

const buildBackendUrl = (path = "/") => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
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

export async function GET(request) {
  pruneWhatsAppSessionRecords();
  const agentId = request.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return respondWithError("agentId query parameter is required", 400);
  }

  const record = getWhatsAppSessionRecord(agentId);
  if (!record) {
    return buildWhatsAppNotFoundResponse();
  }

  return NextResponse.json(buildWhatsAppSessionResponse(record), {
    status: 200,
  });
}

export async function POST(request) {
  let payload = null;
  try {
    payload = await parseJsonFromBody(request);
  } catch (error) {
    return respondWithError(
      "Invalid JSON payload. Ensure the request body is valid JSON or set Content-Type: application/json.",
      400,
      { detail: error instanceof Error ? error.message : String(error) },
    );
  }

  if (!payload || typeof payload !== "object") {
    return respondWithError(
      "Request payload must be a JSON object containing userId, agentId, and apiKey.",
    );
  }

  const userId = pickString(payload.userId, payload.user_id);
  const agentId = pickString(payload.agentId, payload.agent_id, payload.agent);
  const agentName =
    pickString(payload.agentName, payload.agent_name) || agentId || null;
  const apiKey = pickString(
    payload.apiKey,
    payload.api_key,
    payload.apikey,
    payload.Apikey,
    payload.ApiKey,
  );

  if (!userId || !agentId || !apiKey) {
    return respondWithError(
      "WhatsApp session requires userId, agentId, and apiKey.",
    );
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(buildBackendUrl("/sessions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        agentId,
        agentName: agentName || agentId,
        apikey: apiKey,
        apiKey,
      }),
    });

    const remotePayload = await remoteResponse.json().catch(() => ({}));

    if (!remoteResponse.ok) {
      const detail =
        typeof remotePayload?.detail === "string"
          ? remotePayload.detail
          : remotePayload?.message ??
            remotePayload?.error ??
            "Failed to create WhatsApp session";
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
      ) ||
      getWhatsAppSessionRecord(agentId);

    const responseBody = buildWhatsAppSessionResponse(record, {
      rawPayload: remotePayload,
    });

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    console.error("Failed to create WhatsApp session", error);
    return respondWithError(
      "Failed to reach WhatsApp session service",
      502,
    );
  }
}

const parseJsonFromBody = async (request) => {
  const contentType = request.headers.get("content-type") || "";

  const tryParse = async (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (_err) {
      return null;
    }
  };

  if (contentType.includes("application/json") || !contentType) {
    try {
      return await request.json();
    } catch (_err) {
      const fallbackText = await request.text().catch(() => null);
      const parsed = await tryParse(fallbackText);
      if (parsed !== null) {
        return parsed;
      }
      if (fallbackText && !contentType.includes("application/json")) {
        return fallbackText;
      }
      throw _err;
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const textBody = await request.text().catch(() => "");
    const params = new URLSearchParams(textBody);
    const formPayload = {};
    for (const [key, value] of params.entries()) {
      formPayload[key] = value;
    }
    if ("payload" in formPayload) {
      const parsed = await tryParse(formPayload.payload);
      if (parsed !== null) {
        return parsed;
      }
    }
    return formPayload;
  }

  const rawText = await request.text().catch(() => "");
  const parsed = await tryParse(rawText);
  if (parsed !== null) {
    return parsed;
  }
  return rawText || null;
};
