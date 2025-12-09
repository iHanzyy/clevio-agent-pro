const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

const trimString = (value) =>
  typeof value === "string" ? value.trim() : "";

const pickStringFromObject = (object, keys = []) => {
  if (!object || typeof object !== "object") {
    return null;
  }
  for (const key of keys) {
    const candidate = trimString(object[key]);
    if (candidate) {
      return candidate;
    }
  }
  return null;
};

const extractFromNested = (raw, keys = []) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const direct = pickStringFromObject(raw, keys);
  if (direct) {
    return direct;
  }

  if (raw.data && typeof raw.data === "object") {
    const fromData = pickStringFromObject(raw.data, keys);
    if (fromData) {
      return fromData;
    }
    if (raw.data.qr && typeof raw.data.qr === "object") {
      const fromQr = pickStringFromObject(raw.data.qr, keys);
      if (fromQr) {
        return fromQr;
      }
    }
  }

  if (Array.isArray(raw.results)) {
    for (const entry of raw.results) {
      if (entry && typeof entry === "object") {
        const fromEntry = pickStringFromObject(entry, keys);
        if (fromEntry) {
          return fromEntry;
        }
        if (entry.data && typeof entry.data === "object") {
          const fromEntryData = pickStringFromObject(entry.data, keys);
          if (fromEntryData) {
            return fromEntryData;
          }
        }
      }
    }
  }

  return null;
};

const extractBase64FromRaw = (raw) =>
  extractFromNested(raw, [
    "base64",
    "qr",
    "qr_base64",
    "qrBase64",
    "qrCodeBase64",
    "qr_code_base64",
  ]);

const extractContentTypeFromRaw = (raw) =>
  extractFromNested(raw, [
    "contentType",
    "qr_content_type",
    "qrContentType",
    "qrCodeContentType",
    "mime_type",
    "mimeType",
  ]);

export const buildQrImageFromBase64 = (
  base64Value,
  contentType = "image/png",
) => {
  if (typeof base64Value !== "string") {
    return null;
  }
  const trimmed = base64Value.trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  const compact = trimmed.replace(/\s+/g, "");
  if (!BASE64_REGEX.test(compact)) {
    return null;
  }
  const normalizedContentType =
    typeof contentType === "string" && contentType.trim()
      ? contentType.trim()
      : "image/png";
  return `data:${normalizedContentType};base64,${compact}`;
};

export const resolveSessionQrImage = (session) => {
  if (!session || typeof session !== "object") {
    return null;
  }

  if (typeof session.qrImage === "string" && session.qrImage.trim()) {
    return session.qrImage.trim();
  }
  if (typeof session.qrUrl === "string" && session.qrUrl.trim()) {
    return session.qrUrl.trim();
  }
  if (typeof session.qr === "string" && session.qr.trim()) {
    const qrString = session.qr.trim();
    if (qrString.startsWith("data:") || qrString.startsWith("http")) {
      return qrString;
    }
    const contentType =
      session.qrContentType ||
      session.qr_content_type ||
      session.contentType ||
      "image/png";
    return buildQrImageFromBase64(qrString, contentType);
  }

  const base64Candidate =
    trimString(session.base64) ||
    trimString(session.qrBase64) ||
    trimString(session.qr_base64) ||
    trimString(session.qrCodeBase64) ||
    trimString(session.qr_code_base64) ||
    trimString(session.qr) ||
    extractBase64FromRaw(session.raw);

  if (!base64Candidate) {
    return null;
  }

  const contentType =
    session.qrContentType ||
    session.qr_content_type ||
    session.contentType ||
    extractContentTypeFromRaw(session.raw) ||
    "image/png";

  return buildQrImageFromBase64(base64Candidate, contentType);
};
