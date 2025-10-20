import { NextResponse } from "next/server";

const REMOTE_WHATSAPP_URL =
  process.env.WHATSAPP_SESSIONS_URL ??
  "https://lfzlwlbz-3000.asse.devtunnels.ms/sessions";

const buildRemoteUrl = (agentId = null) => {
  const url = new URL(REMOTE_WHATSAPP_URL);
  if (agentId) {
    url.searchParams.set("agentId", agentId);
  }
  return url.toString();
};

async function relayResponse(remoteResponse) {
  const text = await remoteResponse.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_err) {
      payload = text;
    }
  }

  if (!remoteResponse.ok) {
    const errorBody =
      typeof payload === "string"
        ? { detail: payload }
        : payload || { detail: "Unexpected error from WhatsApp session service" };
    return NextResponse.json(errorBody, {
      status: remoteResponse.status,
    });
  }

  return NextResponse.json(payload ?? null, {
    status: remoteResponse.status,
  });
}

export async function GET(request) {
  const agentId = request.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json(
      { detail: "agentId query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const remoteResponse = await fetch(buildRemoteUrl(agentId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await relayResponse(remoteResponse);
  } catch (error) {
    console.error("Failed to fetch WhatsApp session", error);
    return NextResponse.json(
      { detail: "Failed to reach WhatsApp session service" },
      { status: 502 },
    );
  }
}

export async function POST(request) {
  let payload = null;
  try {
    payload = await request.json();
  } catch (_err) {
    return NextResponse.json(
      { detail: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { detail: "Request payload must be an object" },
      { status: 400 },
    );
  }

  try {
    const remoteResponse = await fetch(buildRemoteUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await relayResponse(remoteResponse);
  } catch (error) {
    console.error("Failed to create WhatsApp session", error);
    return NextResponse.json(
      { detail: "Failed to reach WhatsApp session service" },
      { status: 502 },
    );
  }
}
