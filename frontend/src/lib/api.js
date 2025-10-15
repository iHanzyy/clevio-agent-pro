const DEFAULT_API_BASE_URL = "/api/proxy";
const SESSION_TOKEN_KEY = "auth_session_token";
const API_KEY_STORAGE_KEY = "auth_api_key_token";

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
      envBase && envBase.trim() ? envBase.trim() : DEFAULT_API_BASE_URL
    );
    this.sessionToken = null;
    this.apiKeyToken = null;
    this.initialized = false;

    if (typeof window !== "undefined") {
      const savedSession = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const legacyToken = sessionStorage.getItem("auth_token");
      const savedApiKey =
        sessionStorage.getItem(API_KEY_STORAGE_KEY) || legacyToken;

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
    }
  }

  setBaseUrl(url) {
    this.baseUrl = normalizeBaseUrl(url);
    console.log("🌐 API base URL set to:", this.baseUrl);
  }

  setSessionToken(token) {
    console.log(
      "🔑 Setting session token:",
      token ? "***" + token.slice(-10) : "null"
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
      token ? "***" + token.slice(-10) : "null"
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

  async ensureApiKey() {
    if (this.apiKeyToken) {
      return;
    }

    try {
      const latest = await this.getInformationN8N();
      const accessToken =
        latest?.access_token ||
        latest?.data?.access_token ||
        latest?.payload?.access_token ||
        null;
      if (accessToken) {
        this.setApiKey(accessToken);
      }
    } catch (err) {
      console.warn("Unable to ensure API key from payment status", err);
    }
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
        ")"
      );
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(
        "📤 Request with auth header (type:",
        authType || "auto",
        ")"
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
      console.error("❌ API Request failed:", error);

      // More specific error messages
      if (error.message === "Failed to fetch") {
        throw new Error(
          "Cannot connect to server. Please check:\n" +
            "1. DevTunnel is running\n" +
            "2. Backend server is active on port 8000\n" +
            "3. Check browser console for CORS errors"
        );
      }

      throw error;
    }
  }

  // Auth endpoints
  async register(identifier, password, extraParams = {}) {
    const params = new URLSearchParams({
      ...extraParams,
      email: identifier,
      password,
    });
    return this.request(`/auth/register?${params.toString()}`, {
      method: "POST",
    });
  }

  async login(identifier, password) {
    const params = new URLSearchParams({ email: identifier, password });
    return this.request(`/auth/login?${params.toString()}`, {
      method: "POST",
    });
  }

  async generateApiKey(username, password, planCode = "PRO_M") {
    return this.request("/auth/api-key", {
      method: "POST",
      skipContentType: false,
      authType: "session",
      body: JSON.stringify({
        username,
        password,
        plan_code: planCode,
      }),
    });
  }

  async getSubscriptionStatus() {
    return this.request("/payment/status", {
      authType: "session",
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
    const payload = orderId ? { order_id: orderId } : {};

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
          `Failed to fetch payment status (${response.status})`
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
      }
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
    return this.request("/agents/", {
      authType: "apiKey",
      authFallback: "session",
    });
  }

  async createAgent(payload) {
    await this.ensureApiKey();
    return this.request("/agents/", {
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
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.detail || error.message || "Failed to upload knowledge documents"
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

  // File upload for agents
  async uploadDocument(agentId, file) {
    const formData = new FormData();
    formData.append("file", file);

    const headers = this.authHeader();

    const response = await fetch(
      `${this.baseUrl}/agents/${agentId}/documents`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Upload failed");
    }

    return response.json();
  }
}

export const apiService = new ApiService();
