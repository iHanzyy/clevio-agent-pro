"use client";

export const TRIAL_AGENT_STORAGE_KEY = "trialPendingAgentPayload";

const isBrowser = () => typeof window !== "undefined";

export const saveTrialAgentPayload = (data) => {
  if (!isBrowser()) {
    return false;
  }
  try {
    const payload = {
      ...(data || {}),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      TRIAL_AGENT_STORAGE_KEY,
      JSON.stringify(payload),
    );
    return true;
  } catch (error) {
    console.warn("Failed to persist trial agent payload", error);
    return false;
  }
};

export const readTrialAgentPayload = () => {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(TRIAL_AGENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to read trial agent payload", error);
    return null;
  }
};

export const clearTrialAgentPayload = () => {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(TRIAL_AGENT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to remove trial agent payload", error);
  }
};
