const STORE_KEY = "__whatsappQrSessionStore";
const MAX_ENTRY_AGE_MS = 15 * 60 * 1000; // drop entries after 15 minutes

const ensureStore = () => {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }
  return globalThis[STORE_KEY];
};

const normalizeAgentId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "object") {
    return (
      normalizeAgentId(value.agentId) ??
      normalizeAgentId(value.agent_id) ??
      normalizeAgentId(value.id) ??
      null
    );
  }
  return null;
};

const sanitizeBase64 = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const compact = value.replace(/\s+/g, "");
  return compact.length ? compact : null;
};

const coerceTimestamp = (value) => {
  if (!value && value !== 0) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  if (typeof value === "object") {
    const seconds =
      value.seconds ??
      value._seconds ??
      value.epochSeconds ??
      value.epoch_seconds ??
      null;
    const nanos =
      value.nanoseconds ??
      value.nanos ??
      value._nanoseconds ??
      value.nanoSeconds ??
      0;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return new Date(seconds * 1000 + Math.round(nanos / 1e6)).toISOString();
    }
  }
  return null;
};

const extractQrEnvelope = (payload = {}) => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const qr =
    payload.qr ||
    payload.qr_details ||
    payload.qrDetails ||
    payload.qr_code ||
    payload.qrCode ||
    (payload.data && payload.data.qr) ||
    (payload.data && payload.data.qrCode) ||
    null;

  // Some backends return the QR as a raw string (either data URL or pure base64).
  const qrString =
    typeof qr === "string" && qr.trim().length ? qr.trim() : null;

  const contentType =
    payload.qr_content_type ||
    payload.qrContentType ||
    payload.qrCodeContentType ||
    (payload.data && payload.data.qrContentType) ||
    qr?.contentType ||
    qr?.mime_type ||
    qr?.mimeType ||
    "image/png";

  const base64FromQrString =
    qrString && !qrString.startsWith("http") && !qrString.startsWith("data:")
      ? qrString
      : null;

  const base64 =
    payload.qr_base64 ||
    payload.qrBase64 ||
    payload.qrCodeBase64 ||
    payload.qr_code_base64 ||
    (payload.data && payload.data.qrCodeBase64) ||
    (payload.data && payload.data.qrBase64) ||
    qr?.base64 ||
    qr?.data ||
    qr?.qr ||
    qr?.qrCode ||
    qr?.qr_code ||
    payload.qrCode ||
    payload.qr_code ||
    // Fallback: when QR is supplied as a plain base64 string
    base64FromQrString ||
    null;

  const url =
    payload.qr_url ||
    payload.qrUrl ||
    payload.qrCodeUrl ||
    payload.qr_code_url ||
    qr?.url ||
    qr?.qrUrl ||
    qr?.deeplink ||
    null;

  const expiresAt =
    payload.qr_expires_at ||
    payload.qrExpiresAt ||
    qr?.expires_at ||
    qr?.expiresAt ||
    null;

  const expiresIn =
    payload.qr_expires_in ||
    payload.qrExpiresIn ||
    qr?.expires_in ||
    qr?.expiresIn ||
    null;

  return {
    contentType,
    base64: sanitizeBase64(base64),
    url: typeof url === "string" ? url : null,
    expiresAt: coerceTimestamp(expiresAt),
    expiresInSeconds:
      typeof expiresIn === "number" && Number.isFinite(expiresIn)
        ? expiresIn
        : null,
    qrString,
    raw: qr,
  };
};

export const upsertWhatsAppSessionRecord = (
  payload,
  { traceId: explicitTraceId } = {},
) => {
  const store = ensureStore();
  const agentId =
    normalizeAgentId(payload?.agentId ?? payload?.agent_id) ??
    normalizeAgentId(payload?.agent);

  if (!agentId) {
    return null;
  }

  const qrEnvelope = extractQrEnvelope(payload);
  const qrImage =
    payload.qrImage ||
    payload.qr_image ||
    (qrEnvelope.qrString && qrEnvelope.qrString.startsWith("data:")
      ? qrEnvelope.qrString
      : null) ||
    (qrEnvelope.base64
      ? `data:${qrEnvelope.contentType};base64,${qrEnvelope.base64}`
      : null);

  const qrUpdatedAt =
    coerceTimestamp(
      payload.qrUpdatedAt ||
        payload.qr_updated_at ||
        qrEnvelope?.raw?.updated_at ||
        qrEnvelope?.raw?.updatedAt,
    ) || new Date().toISOString();

  const status =
    payload.status ||
    payload.session_status ||
    payload.state ||
    payload.sessionState ||
    "pending";

  const record = {
    agentId,
    status: typeof status === "string" ? status : "pending",
    isActive:
      payload.isActive === true ||
      payload.is_active === true ||
      status === "active",
    qrImage,
    qrUrl:
      qrEnvelope.url ||
      (qrEnvelope.qrString?.startsWith("http") ? qrEnvelope.qrString : null),
    qrBase64: qrEnvelope.base64,
    qrContentType: qrEnvelope.contentType,
    qrExpiresAt: qrEnvelope.expiresAt,
    qrExpiresInSeconds: qrEnvelope.expiresInSeconds,
    qrUpdatedAt,
    receivedAt: new Date().toISOString(),
    traceId: explicitTraceId || payload.traceId || payload.trace_id || null,
    raw: payload,
  };

  store.set(agentId, record);
  return record;
};

export const getWhatsAppSessionRecord = (agentId) => {
  const store = ensureStore();
  return store.get(normalizeAgentId(agentId)) || null;
};

export const deleteWhatsAppSessionRecord = (agentId) => {
  const store = ensureStore();
  const normalizedId = normalizeAgentId(agentId);
  if (!normalizedId) {
    return false;
  }
  return store.delete(normalizedId);
};

export const listWhatsAppSessionRecords = () => {
  const store = ensureStore();
  return Array.from(store.values());
};

export const pruneWhatsAppSessionRecords = (ttlMs = MAX_ENTRY_AGE_MS) => {
  const store = ensureStore();
  if (!ttlMs || ttlMs <= 0) {
    return;
  }
  const now = Date.now();
  for (const [agentId, record] of store.entries()) {
    const ts = Date.parse(record.receivedAt || record.qrUpdatedAt || "");
    if (Number.isFinite(ts) && now - ts > ttlMs) {
      store.delete(agentId);
    }
  }
};
