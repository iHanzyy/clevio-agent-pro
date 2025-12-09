import { NextResponse } from "next/server";
import {
  deleteWhatsAppSessionRecord,
  getWhatsAppSessionRecord,
  pruneWhatsAppSessionRecords,
  upsertWhatsAppSessionRecord,
} from "@/lib/server/whatsappSessionStore";
import { buildWhatsAppSessionResponse } from "@/lib/server/whatsappSessionResponses";

const DEFAULT_BACKEND_BASE_URL =
  process.env.WHATSAPP_BACKEND_BASE_URL ||
  process.env.WHATSAPP_STATUS_BASE_URL ||
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

export async function DELETE(_request, context) {
  const params = (context && (await context.params)) || {};
  const agentId = params?.agentId;

  if (!agentId || typeof agentId !== "string") {
    return respondWithError("agentId parameter is required", 400);
  }

  pruneWhatsAppSessionRecords();

  try {
    const remoteResponse = await fetch(
      buildBackendUrl("/sessions/delete"),
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId }),
      },
    );

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
            `Failed to fetch WhatsApp session (${remoteResponse.status})`;
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
      return respondWithError("Session not found", 404);
    }

    return NextResponse.json(buildWhatsAppSessionResponse(record), {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch WhatsApp session", {
      agentId,
      error,
    });
    return respondWithError("Failed to reach WhatsApp session service", 502);
  }
}
