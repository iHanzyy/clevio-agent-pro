import { headers } from "next/headers";
import { NextResponse } from "next/server";

const FALLBACK_IP_SERVICES = ["https://api.ipify.org?format=json"];

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
      console.warn("[api/ip] Failed to fetch IP from", endpoint, error);
    }
  }
  return null;
}

export async function GET(request) {
  try {
    const headerList = await headers();
    let ip =
      request?.ip ||
      extractIpFromHeaders(headerList) ||
      (await fetchExternalIp());

    if (ip === "::1" || ip === "127.0.0.1") {
      const external = await fetchExternalIp();
      if (external) {
        ip = external;
      }
    }

    if (!ip) {
      return NextResponse.json(
        { success: false, error: "Unable to determine IP address" },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, ip });
  } catch (error) {
    console.error("[api/ip] Unexpected failure", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve IP address" },
      { status: 500 }
    );
  }
}
