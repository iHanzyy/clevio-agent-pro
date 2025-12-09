import { NextResponse } from "next/server";

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const summarizeWhatsAppRecord = (record) => {
  const normalizedState = isNonEmptyString(record.status)
    ? record.status
    : record.isActive
      ? "active"
      : "pending";

  return {
    state: normalizedState,
    entry: {
      agentId: record.agentId,
      status: normalizedState,
      isActive: record.isActive,
      qrUpdatedAt: record.qrUpdatedAt,
      qrExpiresAt: record.qrExpiresAt,
      qrExpiresInSeconds: record.qrExpiresInSeconds,
      base64: record.qrBase64,
      qrBase64: record.qrBase64,
      qr_base64: record.qrBase64,
      qrCodeBase64: record.qrBase64,
      contentType: record.qrContentType,
      qrContentType: record.qrContentType,
      qr_content_type: record.qrContentType,
      qrImage: record.qrImage,
      qrUrl: record.qrUrl,
      receivedAt: record.receivedAt,
      traceId: record.traceId,
      qr: {
        base64: record.qrBase64,
        contentType: record.qrContentType,
        updatedAt: record.qrUpdatedAt,
        expiresAt: record.qrExpiresAt,
        url: record.qrUrl,
      },
    },
  };
};

export const buildWhatsAppSessionResponse = (
  record,
  { rawPayload = null, totalStored = 1, extraEntries = [] } = {},
) => {
  if (!record) {
    return {
      success: false,
      status: {
        state: "not_found",
        updatedAt: new Date().toISOString(),
      },
      message: "Session not found",
    };
  }

  const { state, entry } = summarizeWhatsAppRecord(record);

  return {
    success: true,
    stored: totalStored,
    agentId: record.agentId,
    status: {
      state,
      updatedAt: record.qrUpdatedAt || record.receivedAt,
    },
    base64: record.qrBase64,
    qrBase64: record.qrBase64,
    qr_base64: record.qrBase64,
    qrCodeBase64: record.qrBase64,
    contentType: record.qrContentType,
    qrContentType: record.qrContentType,
    qr_content_type: record.qrContentType,
    qrImage: record.qrImage,
    qrUrl: record.qrUrl,
    qrUpdatedAt: record.qrUpdatedAt,
    qrExpiresAt: record.qrExpiresAt,
    qrExpiresInSeconds: record.qrExpiresInSeconds,
    traceId: record.traceId,
    isActive: record.isActive,
    results: [entry, ...extraEntries],
    data: record,
    raw: rawPayload ?? record.raw ?? null,
  };
};

export const buildWhatsAppNotFoundResponse = () =>
  NextResponse.json(
    {
      success: false,
      status: {
        state: "not_found",
        updatedAt: new Date().toISOString(),
      },
      message: "Session not found",
    },
    { status: 200 },
  );
