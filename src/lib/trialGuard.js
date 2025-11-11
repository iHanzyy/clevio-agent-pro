"use client";

const TRIAL_USED_EMAILS_KEY = "trialUsedEmails";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const readUsedEmails = () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(TRIAL_USED_EMAILS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[trialGuard] Failed to read stored emails", error);
    return [];
  }
};

const writeUsedEmails = (list) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      TRIAL_USED_EMAILS_KEY,
      JSON.stringify(Array.from(new Set(list))),
    );
  } catch (error) {
    console.warn("[trialGuard] Failed to persist emails", error);
  }
};

export const hasUsedTrialEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }
  const used = readUsedEmails();
  return used.includes(normalized);
};

export const markTrialEmailUsed = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return;
  }
  const used = readUsedEmails();
  if (!used.includes(normalized)) {
    used.push(normalized);
    writeUsedEmails(used);
  }
};
