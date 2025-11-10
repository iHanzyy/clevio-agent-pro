import { headers } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE = "https://new-langchain.chiefaiofficer.id";
const API_PREFIX = "/api/v1";
const FALLBACK_IP_SERVICES = ["https://api.ipify.org?format=json"];

const backendBase =
  process.env.BACKEND_BASE_URL && process.env.BACKEND_BASE_URL.length > 0
    ? process.env.BACKEND_BASE_URL
    : DEFAULT_BACKEND_BASE;

function extractIpFromHeaders(headerList) {
  if (!headerList) return null;

  const candidates = [
    headerList.get("x-client-ip"),
    headerList.get("x-forwarded-for"),
    headerList.get("x-real-ip"),
    headerList.get("cf-connecting-ip"),
    headerList.get("fastly-client-ip"),
    headerList.get("true-client-ip"),
    headerList.get("x-cluster-client-ip"),
    headerList.get("x-forwarded"),
    headerList.get("forwarded-for"),
    headerList.get("forwarded"),
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") continue;
    const value = candidate.split(",")[0]?.trim();
    if (value && value !== "unknown") {
      return value;
    }
  }
  return null;
}

async function fetchExternalIp() {
  for (const endpoint of FALLBACK_IP_SERVICES) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      if (data?.ip) {
        return data.ip;
      }
    } catch (error) {
      console.warn("[api/trial] Failed to fetch IP from", endpoint, error);
    }
  }
  return null;
}

function pickApiKey(data) {
  if (!data || typeof data !== "object") return null;

  const candidates = [
    data.api_key,
    data.apiKey,
    data.access_token,
    data.accessToken,
    data.token,
    data.key,
    data?.api?.key,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (Array.isArray(data.api_keys)) {
    const active =
      data.api_keys.find((item) => item?.is_active ?? item?.isActive) ||
      data.api_keys[0];
    if (active) {
      const nested = pickApiKey(active);
      if (nested) return nested;
    }
  }

  return null;
}

function resolvePlanCode(data) {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.plan_code,
    data.planCode,
    data.plan?.code,
    data.plan?.plan_code,
    data.subscription_plan,
    data.subscriptionPlan,
    data.plan_slug,
  ];
  for (const value of candidates) {
    if (value && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

async function resolveClientIp(requestBody) {
  const headerList = await headers();
  const provided =
    (typeof requestBody === "object" && requestBody
      ? requestBody.ip_user || requestBody.ip
      : null) || null;

  let resolved =
    provided ||
    extractIpFromHeaders(headerList) ||
    headerList.get("remote-addr") ||
    headerList.get("remote_addr") ||
    null;

  if (!resolved || resolved === "::1" || resolved === "127.0.0.1") {
    const external = await fetchExternalIp();
    if (external) {
      resolved = external;
    }
  }

  return resolved;
}

export async function POST(request) {
  try {
    let body = null;
    try {
      body = await request.json();
    } catch (error) {
      body = null;
    }

    const ipAddress = await resolveClientIp(body);

    if (!ipAddress) {
      return NextResponse.json(
        { success: false, error: "Unable to determine client IP address" },
        { status: 400 }
      );
    }

    const backendUrl = new URL(
      `${API_PREFIX.replace(/\/+$/, "")}/auth/api-key/trial`,
      backendBase
    ).toString();

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ip_user: ipAddress }),
    });

    let payload = null;
    try {
      payload = await backendResponse.json();
    } catch (error) {
      payload = null;
    }

    if (!backendResponse.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Trial request failed with status ${backendResponse.status}`;
      return NextResponse.json(
        { success: false, error: message, status: backendResponse.status },
        { status: backendResponse.status }
      );
    }

    const apiKey =
      pickApiKey(payload) ||
      pickApiKey(payload?.data) ||
      pickApiKey(payload?.result);

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Backend did not return an API key",
          payload,
        },
        { status: 502 }
      );
    }

    const expiresAt =
      payload?.expires_at ||
      payload?.expiresAt ||
      payload?.data?.expires_at ||
      payload?.data?.expiresAt ||
      null;

    const planCode =
      resolvePlanCode(payload) ||
      resolvePlanCode(payload?.data) ||
      resolvePlanCode(payload?.subscription) ||
      "TRIAL";

    return NextResponse.json({
      success: true,
      apiKey,
      planCode,
      expiresAt,
      ip: ipAddress,
      raw: payload,
    });
  } catch (error) {
    console.error("[api/trial] Unexpected error", error);
    return NextResponse.json(
      { success: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
