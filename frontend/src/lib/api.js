const DEFAULT_API_BASE_URL = "/api/proxy";
const SESSION_TOKEN_KEY = "auth_session_token";
const API_KEY_STORAGE_KEY = "auth_api_key_token";
const LAST_ORDER_ID_KEY = "payment_last_order_id";
const LAST_PLAN_CODE_KEY = "auth_plan_code";

const normalizeBaseUrl = (url) => {
  if (!url) return DEFAULT_API_BASE_URL;
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

class ApiService {
  constructor() {
    const envBase =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_API_BASE_URL
        : null;

    this.baseUrl = normalizeBaseUrl(
      envBase && envBase.trim() ? envBase.trim() : DEFAULT_API_BASE_URL,
    );
    this.sessionToken = null;
    this.apiKeyToken = null;
    this.initialized = false;
    this.lastOrderId = null;
    this.lastPlanCode = null;

    console.log("🔑 Checking stored tokens");
    if (typeof window !== "undefined") {
      const savedSession = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const legacyToken = sessionStorage.getItem("auth_token");
      const savedApiKey =
        sessionStorage.getItem(API_KEY_STORAGE_KEY) || legacyToken;
      const savedOrderId = sessionStorage.getItem(LAST_ORDER_ID_KEY);
      const savedPlanCode = sessionStorage.getItem(LAST_PLAN_CODE_KEY);

      if (savedSession) {
        this.sessionToken = savedSession;
        this.initialized = true;
        console.log("🔑 Session token loaded from storage");
      }

      if (savedApiKey) {
        this.apiKeyToken = savedApiKey;
        this.initialized = true;
        console.log("🆔 API key loaded from storage");
      }

      if (savedOrderId) {
        this.lastOrderId = savedOrderId;
      }

      if (savedPlanCode) {
        this.lastPlanCode = savedPlanCode;
      }
    }
  }

  setBaseUrl(url) {
    this.baseUrl = normalizeBaseUrl(url);
    console.log("🌐 API base URL set to:", this.baseUrl);
  }

  setSessionToken(token) {
    console.log(
      "🔑 Setting session token:",
      token ? "***" + token.slice(-10) : "null",
    );
    this.sessionToken = token || null;
    this.initialized = true;

    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    }
  }

  setApiKey(token) {
    console.log(
      "🆔 Setting API key:",
      token ? "***" + token.slice(-10) : "null",
    );
    this.apiKeyToken = token || null;
    this.initialized = true;

    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem(API_KEY_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      // Drop legacy storage key if present
      sessionStorage.removeItem("auth_token");
    }
  }

  /**
   * Legacy compatibility: treat setToken as setting the API key.
   */
  setToken(token) {
    this.setApiKey(token);
  }

  clearSessionToken() {
    console.log("🗑️ Clearing session token");
    this.sessionToken = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }

  clearApiKey() {
    console.log("🗑️ Clearing API key");
    this.apiKeyToken = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      sessionStorage.removeItem("auth_token");
    }
  }

  clearToken() {
    this.clearApiKey();
  }

  clearAllTokens() {
    this.clearSessionToken();
    this.clearApiKey();
    this.initialized = false;
  }

  setLastOrderId(orderId) {
    this.lastOrderId = orderId || null;
    if (typeof window !== "undefined") {
      if (orderId) {
        sessionStorage.setItem(LAST_ORDER_ID_KEY, orderId);
      } else {
        sessionStorage.removeItem(LAST_ORDER_ID_KEY);
      }
    }
  }

  clearLastOrderId() {
    this.setLastOrderId(null);
  }

  setPlanCode(planCode) {
    console.log("📦 Setting plan code", planCode);
    this.lastPlanCode = planCode || null;
    if (typeof window !== "undefined") {
      if (planCode) {
        sessionStorage.setItem(LAST_PLAN_CODE_KEY, planCode);
      } else {
        sessionStorage.removeItem(LAST_PLAN_CODE_KEY);
      }
    }
  }

  getPlanCode() {
    return this.lastPlanCode;
  }

  hasSessionToken() {
    return Boolean(this.sessionToken);
  }

  hasApiKey() {
    return Boolean(this.apiKeyToken);
  }

  getAuthToken({ primary = "apiKey", fallback = null } = {}) {
    if (primary === "apiKey" && this.apiKeyToken) return this.apiKeyToken;
    if (primary === "session" && this.sessionToken) return this.sessionToken;
    if (primary === "auto") {
      return this.apiKeyToken || this.sessionToken || null;
    }

    if (fallback) {
      if (fallback === "apiKey" && this.apiKeyToken) return this.apiKeyToken;
      if (fallback === "session" && this.sessionToken) return this.sessionToken;
      if (fallback === "auto") {
        return this.apiKeyToken || this.sessionToken || null;
      }
    }

    return null;
  }

  async ensureApiKey({ planCode = null } = {}) {
    if (this.apiKeyToken) {
      return;
    }

    console.warn("ensureApiKey() skipped; API keys are managed by backend", {
      planCode,
      lastPlanCode: this.lastPlanCode,
    });
  }

  getHeaders({ authType = null, includeContentType = false, fallback } = {}) {
    const headers = {};

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    const token = this.getAuthToken({ primary: authType, fallback });
    if (authType && !token) {
      console.warn(
        "⚠️ Auth requested but no token available for",
        authType,
        " (fallback:",
        fallback,
        ")",
      );
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(
        "📤 Request with auth header (type:",
        authType || "auto",
        ")",
      );
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const {
      authType,
      authFallback,
      auth = false,
      includeAuth,
      skipContentType,
      ...fetchOptions
    } = options;

    const shouldIncludeAuth = authType || auth || includeAuth;
    const resolvedAuthType = authType || (shouldIncludeAuth ? "apiKey" : null);
    const includeContentType =
      !skipContentType && fetchOptions.body !== undefined;

    console.log(`🌐 API Request: ${fetchOptions.method || "GET"} ${endpoint}`, {
      baseUrl: this.baseUrl,
      hasSessionToken: !!this.sessionToken,
      hasApiKey: !!this.apiKeyToken,
      authType: resolvedAuthType,
    });

    const headers = {
      ...this.getHeaders({
        authType: resolvedAuthType,
        includeContentType,
        fallback: authFallback,
      }),
      ...(fetchOptions.headers || {}),
    };

    const config = {
      ...fetchOptions,
      headers,
    };

    try {
      console.log("🧾 Fetch options", { endpoint, options: config });
      console.log("🚀 Fetching:", url);
      console.log("📋 Config:", config);

      const response = await fetch(url, config);
      console.log(`📥 Response: ${response.status} ${response.statusText}`);

      let data = null;
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (response.status !== 204) {
        if (isJson) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = text ? { detail: text } : null;
        }
      }

      console.log("📬 API response", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        let message = `HTTP error! status: ${response.status}`;
        const detail = data?.detail;

        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((item) => item?.msg || item?.detail || JSON.stringify(item))
            .join(", ");
        } else if (detail && typeof detail === "object") {
          message = JSON.stringify(detail);
        }

        throw new Error(message);
      }

      return data;
    } catch (error) {
      console.error("❌ API request failed", {
        endpoint,
        baseUrl: this.baseUrl,
        method: fetchOptions.method || "GET",
        error,
      });
      console.error("❌ API Request failed:", error);

      // More specific error messages
      if (error.message === "Failed to fetch") {
        throw new Error(
          "Cannot connect to server. Please check:\n" +
            "1. DevTunnel is running\n" +
            "2. Backend server is active on port 8000\n" +
            "3. Check browser console for CORS errors",
        );
      }

      throw error;
    }
  }

  // Auth endpoints
  async register(identifier, password, extraParams = {}) {
    const query = new URLSearchParams({ email: identifier, password });

    return this.request(`/auth/register?${query.toString()}`, {
      method: "POST",
      body: JSON.stringify({
        email: identifier,
        password,
        ...extraParams,
      }),
    });
  }

  async login(identifier, password) {
    const query = new URLSearchParams({ email: identifier, password });

    return this.request(`/auth/login?${query.toString()}`, {
      method: "POST",
      body: JSON.stringify({ email: identifier, password }),
    });
  }

  async generateApiKey(planCode = null) {
    console.warn(
      "generateApiKey() called but backend-managed keys are expected. Skipping.",
      { planCode },
    );
    return null;
  }

  async getSubscriptionStatus() {
    const profile = await this.request("/auth/me", {
      authType: "session",
    });

    if (!profile || typeof profile !== "object") {
      return null;
    }

    const subscription =
      profile.subscription && typeof profile.subscription === "object"
        ? profile.subscription
        : null;

    const planCode =
      subscription?.plan_code ||
      profile.subscription_plan ||
      profile.plan_code ||
      null;

    const isActive =
      subscription?.is_active ??
      profile.subscription_active ??
      profile.is_active ??
      false;

    return {
      is_active: Boolean(isActive),
      plan_code: planCode,
      expires_at:
        subscription?.expires_at || profile.subscription_expires_at || null,
      days_remaining:
        subscription?.days_remaining ||
        profile.subscription_days_remaining ||
        null,
      api_key:
        subscription?.api_key ||
        profile.api_key ||
        profile.api_access_token ||
        null,
    };
  }

  async getCurrentUser() {
    return this.request("/auth/me", {
      authType: "session",
      authFallback: "apiKey",
    });
  }

  async updateApiKey(username, password, accessToken, planCode) {
    return this.request("/auth/api-key/update", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        access_token: accessToken,
        plan_code: planCode,
      }),
      authType: "session",
    });
  }

  async getInformationN8N(orderId) {
    if (!orderId) {
      console.warn("getInformationN8N invoked without orderId");
      return null;
    }

    this.setLastOrderId(orderId);

    const payload = { order_id: orderId };

    const response = await fetch("/api/v1/payment/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(
        detail?.error ||
          detail?.detail ||
          `Failed to fetch payment status (${response.status})`,
      );
    }

    return response.json();
  }

  async notifyPaymentWebhook(payload) {
    const response = await fetch(
      "https://n8n-new.chiefaiofficer.id/webhook/pembayaranMidtrans",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      let detail = "Failed to trigger payment webhook";
      try {
        const data = await response.json();
        if (data && typeof data.detail === "string") {
          detail = data.detail;
        }
      } catch (err) {
        detail = await response.text();
      }
      throw new Error(detail);
    }

    try {
      return await response.json();
    } catch (err) {
      return null;
    }
  }

  authHeader({ primary = "apiKey", fallback = "session" } = {}) {
    const token = this.getAuthToken({ primary, fallback });
    if (!token) {
      console.warn("⚠️ Attempting to use auth header without available token");
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  // Agent endpoints (require API key)
  async getAgents() {
    await this.ensureApiKey();
    return this.request("/agents", {
      authType: "apiKey",
      authFallback: "session",
    });
  }

  async createAgent(payload) {
    console.log("🔐 Using auth header", {
      hasApiKey: this.hasApiKey(),
      planCode: this.getPlanCode?.(),
    });

    await this.ensureApiKey();
    return this.request("/agents", {
      method: "POST",
      authType: "apiKey",
      body: JSON.stringify(payload),
    });
  }

  async getAgent(agentId) {
    await this.ensureApiKey();
    return this.request(`/agents/${agentId}`, {
      authType: "apiKey",
    });
  }

  async updateAgent(agentId, data) {
    await this.ensureApiKey();
    return this.request(`/agents/${agentId}`, {
      method: "PUT",
      authType: "apiKey",
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(agentId) {
    await this.ensureApiKey();
    return this.request(`/agents/${agentId}`, {
      method: "DELETE",
      authType: "apiKey",
    });
  }

  async executeAgent(agentId, input, parameters = {}, sessionId = null) {
    await this.ensureApiKey();
    const payload = { input, parameters };
    if (sessionId) {
      payload.session_id = sessionId;
    }

    return this.request(`/agents/${agentId}/execute`, {
      method: "POST",
      authType: "apiKey",
      body: JSON.stringify(payload),
    });
  }

  async getAgentDocuments(agentId) {
    return this.request(`/agents/${agentId}/documents`, {
      authType: "apiKey",
    });
  }

  async uploadAgentDocuments(agentId, files) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const headers = this.authHeader();

    const response = await fetch(
      `${this.baseUrl}/agents/${agentId}/documents`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.detail || error.message || "Failed to upload knowledge documents",
      );
    }

    return response.json();
  }

  // Tools endpoints
  async getTools() {
    return this.request("/tools/", {
      authType: "apiKey",
    });
  }
}

export const apiService = new ApiService();
