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
  process.env.WHATSAPP_STATUS_BASE_URL ||
  process.env.WHATSAPP_BACKEND_BASE_URL ||
  "http://localhost:8080/api/v1";

const buildBackendUrl = (path = "/", params = {}) => {
  const trimmedBase = DEFAULT_BACKEND_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${trimmedBase}${normalizedPath}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, value);
  });
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

export async function GET(request) {
  pruneWhatsAppSessionRecords();
  const agentId =
    request.nextUrl.searchParams.get("agentId") ||
    request.nextUrl.searchParams.get("agent_id");

  if (!agentId) {
    return respondWithError("agentId query parameter is required", 400);
  }

  try {
    const remoteResponse = await fetch(
      buildBackendUrl("/sessions/detail", { agentId }),
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    const remotePayload = await remoteResponse.json().catch(() => ({}));

    if (!remoteResponse.ok) {
      const detail =
        typeof remotePayload?.detail === "string"
          ? remotePayload.detail
          : remotePayload?.message ||
            remotePayload?.error ||
            "Failed to fetch WhatsApp session detail";
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
          ...(typeof remotePayload === "object" && remotePayload !== null
            ? remotePayload
            : {}),
        },
        { traceId },
      ) || getWhatsAppSessionRecord(agentId);

    if (!record) {
      return buildWhatsAppNotFoundResponse();
    }

    return NextResponse.json(
      buildWhatsAppSessionResponse(record, {
        rawPayload: remotePayload,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch WhatsApp session detail", {
      agentId,
      error,
    });
    return respondWithError(
      "Failed to reach WhatsApp session service",
      502,
    );
  }
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
      "Request payload must be a JSON object containing agentId and apiKey.",
    );
  }

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

  if (!agentId || !apiKey) {
    return respondWithError(
      "WhatsApp session requires agentId and apiKey.",
    );
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(
      buildBackendUrl("/sessions/create"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          agentName: agentName || agentId,
          apiKey,
          langchainUrl: `https://new-langchain.chiefaiofficer.id/api/v1/agents/${agentId}/execute`,
        }),
      },
    );

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
            "Failed to create WhatsApp session";
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
