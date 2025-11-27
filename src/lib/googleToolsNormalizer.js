"use client";

/**
 * Normalize google_tools payloads that may arrive as:
 * - an array of tool IDs
 * - a JSON stringified array (e.g., '["google_calendar_create_event"]')
 * - a comma/whitespace separated string with or without quotes
 *   (e.g., '"google_calendar_get_events", "google_calendar_create_event"')
 *
 * Returns a deduplicated array of clean tool IDs.
 */
export const normalizeGoogleTools = (rawValue) => {
  if (!rawValue) return [];

  // Helper: safely JSON.parse text, returning [] on any failure
  const tryParseArray = (text) => {
    if (typeof text !== "string" || !text.trim()) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  // Begin with direct array handling
  let list = Array.isArray(rawValue) ? rawValue : [];

  // Handle string inputs
  if (!list.length && typeof rawValue === "string") {
    const trimmed = rawValue.trim();

    // 1) JSON array string
    list = tryParseArray(trimmed);

    // 2) JSON array string but missing brackets (wrap with [])
    if (!list.length && !trimmed.startsWith("[")) {
      list = tryParseArray(`[${trimmed}]`);
    }

    // 3) Fallback: split by comma/whitespace
    if (!list.length) {
      list = trimmed
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  // Final cleanup: strip surrounding quotes/backticks and backslashes, trim, dedupe
  const cleaned = list
    .filter((item) => typeof item === "string")
    .map((item) =>
      item
        .trim()
        // remove leading/trailing quotes/backticks (single/double/grave)
        .replace(/^["'`]+/, "")
        .replace(/["'`]+$/, "")
        // remove lingering backslashes used for escaping quotes
        .replace(/^\\+/, "")
        .replace(/\\+$/, "")
    )
    .filter(Boolean)
    .map((item) => {
      const lower = item.toLowerCase();

      // Legacy short prefixes from n8n
      if (lower.startsWith("calendar_") && !lower.startsWith("google_")) {
        return `google_${item.replace(/^calendar_/i, "google_calendar_")}`.replace(
          /^google_google_/,
          "google_"
        );
      }
      if (lower.startsWith("sheets_") && !lower.startsWith("google_")) {
        return `google_${item.replace(/^sheets_/i, "google_sheets_")}`.replace(
          /^google_google_/,
          "google_"
        );
      }
      if (lower.startsWith("docs_") && !lower.startsWith("google_")) {
        return `google_${item.replace(/^docs_/i, "google_docs_")}`.replace(
          /^google_google_/,
          "google_"
        );
      }

      // If already prefixed or gmail_* just return
      return item;
    });

  return Array.from(new Set(cleaned));
};
