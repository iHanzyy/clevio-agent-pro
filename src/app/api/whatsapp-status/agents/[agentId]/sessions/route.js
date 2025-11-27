import { NextResponse } from "next/server";

const DEFAULT_WHATSAPP_STATUS_BASE_URL = process.env.WHATSAPP_STATUS_BASE_URL;

const resolveStatusServiceBaseUrl = () => {
  const candidates = [
    process.env.WHATSAPP_STATUS_BASE_URL,
    process.env.NEXT_PUBLIC_WHATSAPP_STATUS_BASE_URL,
  ];

  for (const raw of candidates) {
    if (typeof raw !== "string") {
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed.replace(/\/+$/, "");
    }
  }

  return DEFAULT_WHATSAPP_STATUS_BASE_URL;
};

const buildRemoteSessionUrl = (agentId) => {
  const baseUrl = resolveStatusServiceBaseUrl();
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}/sessions/${encodeURIComponent(agentId)}`;
};

async function relayResponse(remoteResponse) {
  const text = await remoteResponse.text();

  if (!remoteResponse.ok) {
    if (!text) {
      return NextResponse.json(
        { detail: "Unexpected response from WhatsApp session service" },
        { status: remoteResponse.status },
      );
    }

    try {
      const payload = JSON.parse(text);
      if (typeof payload === "string") {
        return NextResponse.json(
          { detail: payload },
          { status: remoteResponse.status },
        );
      }
      return NextResponse.json(payload, {
        status: remoteResponse.status,
      });
    } catch (_error) {
      return NextResponse.json(
        { detail: text },
        { status: remoteResponse.status },
      );
    }
  }

  if (!text) {
    return NextResponse.json(null, {
      status: remoteResponse.status,
    });
  }

  try {
    const payload = JSON.parse(text);
    return NextResponse.json(payload, {
      status: remoteResponse.status,
    });
  } catch (_error) {
    return new NextResponse(text, {
      status: remoteResponse.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

export async function DELETE(_request, context) {
  const resolvedParams = (context && (await context.params)) ?? {};
  const agentIdParam = resolvedParams?.agentId;

  if (!agentIdParam || typeof agentIdParam !== "string") {
    return NextResponse.json(
      { detail: "agentId path parameter is required" },
      { status: 400 },
    );
  }

  const remoteUrl = buildRemoteSessionUrl(agentIdParam);
  if (!remoteUrl) {
    return NextResponse.json(
      { detail: "WhatsApp session service is not configured" },
      { status: 503 },
    );
  }

  try {
    console.log(`DELETE WhatsApp session: ${remoteUrl}`);

    const remoteResponse = await fetch(remoteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`DELETE response status: ${remoteResponse.status}`);

    if (remoteResponse.status === 404) {
      // Session not found - treat as successful delete (idempotent)
      return NextResponse.json(
        {
          data: {
            deleted: false,
            message: "Session not found (already deleted)"
          }
        },
        { status: 200 },
      );
    }

    return await relayResponse(remoteResponse);
  } catch (error) {
    console.error("Failed to delete WhatsApp session", {
      agentId: agentIdParam,
      error,
    });
    return NextResponse.json(
      { detail: "Failed to reach WhatsApp session service" },
      { status: 502 },
    );
  }
}