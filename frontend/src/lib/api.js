const DEFAULT_API_BASE_URL = "/api/proxy";
const SESSION_TOKEN_KEY = "auth_session_token";
const API_KEY_STORAGE_KEY = "auth_api_key_token";
const LAST_ORDER_ID_KEY = "payment_last_order_id";
const LAST_PLAN_CODE_KEY = "auth_plan_code";
const joinBaseAndEndpoint = (base, endpoint) => {
  if (!base) return endpoint || "";
  if (!endpoint) return base;

  const hasTrailingSlash = base.endsWith("/");
  const hasLeadingSlash = endpoint.startsWith("/");

  if (hasTrailingSlash && hasLeadingSlash) {
    return `${base}${endpoint.slice(1)}`;
  }

  if (!hasTrailingSlash && !hasLeadingSlash) {
    return `${base}/${endpoint}`;
  }

  return `${base}${endpoint}`;
};

const normalizeEndpoint = (endpoint) => {
  if (!endpoint) return "/";
  const trimmed = endpoint.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/${trimmed}`;
};

const pickApiKeyFromCollection = (input) => {
  if (!input) return null;

  const lists = [];
  if (Array.isArray(input)) {
    lists.push(input);
  }
  if (Array.isArray(input?.api_keys)) {
    lists.push(input.api_keys);
  }
  if (Array.isArray(input?.items)) {
    lists.push(input.items);
  }
  if (Array.isArray(input?.data)) {
    lists.push(input.data);
  }

  for (const list of lists) {
    if (!Array.isArray(list) || list.length === 0) continue;
    const active =
      list.find((item) => item?.is_active ?? item?.isActive ?? false) ||
      list[0];
    if (!active) continue;
    const candidate =
      active.access_token ||
      active.api_key ||
      active.token ||
      active.accessToken ||
      active.apiKey ||
      null;
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

class ApiService {
  constructor() {
    const envBase =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_API_BASE_URL
        : null;

    this.baseUrl =
      envBase && envBase.trim() ? envBase.trim() : DEFAULT_API_BASE_URL;
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
    this.baseUrl = url && url.trim() ? url.trim() : DEFAULT_API_BASE_URL;
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
    if (token && token === this.sessionToken) {
      console.warn("⚠️ Ignoring API key that matches session token");
      return;
    }
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

    const sessionToken =
      typeof this.getAuthToken === "function"
        ? this.getAuthToken({ primary: "session" })
        : null;

    const planCandidates = new Set();
    if (planCode) planCandidates.add(planCode);
    if (typeof this.getPlanCode === "function") {
      const inferred = this.getPlanCode();
      if (inferred) planCandidates.add(inferred);
    }
    if (this.lastPlanCode) planCandidates.add(this.lastPlanCode);

    try {
      const subscription = await this.getSubscriptionStatus();
      if (subscription) {
        if (subscription.plan_code) {
          planCandidates.add(subscription.plan_code);
          this.setPlanCode(subscription.plan_code);
        }
        if (subscription.api_key && subscription.api_key !== sessionToken) {
          this.setApiKey(subscription.api_key);
          return;
        }
      }
      const availableKeys = await this.listApiKeys();
      const activeKey =
        availableKeys.find((item) => item?.is_active ?? item?.isActive) ||
        availableKeys[0];
      const resolvedKey =
        activeKey?.access_token ||
        activeKey?.token ||
        activeKey?.api_key ||
        activeKey?.accessToken ||
        activeKey?.apiKey ||
        activeKey?.key ||
        null;
      if (resolvedKey && resolvedKey !== sessionToken) {
        this.setApiKey(resolvedKey);
        return;
      }
    } catch (error) {
      console.warn("Unable to refresh subscription before API key request", {
        error,
      });
    }

    if (this.apiKeyToken) {
      return;
    }

    const resolvedPlanCode = Array.from(planCandidates).find(Boolean) || null;

    if (!resolvedPlanCode) {
      console.warn("No plan code available to auto-generate API key");
      return;
    }

    try {
      await this.generateApiKey({
        planCode: resolvedPlanCode,
        useSessionAuth: true,
      });
    } catch (error) {
      console.warn("Unable to auto-generate API key", {
        planCode: resolvedPlanCode,
        error,
      });
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
        ")",
      );
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      if (authType === "apiKey") {
        headers["X-API-Key"] = token;
      }
      console.log("📤 Request with auth header", {
        type: authType || "auto",
        tokenPreview: token ? `***${token.slice(-8)}` : "",
      });
    } else {
      console.warn("🚫 Missing auth token", { authType, fallback });
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    const url = joinBaseAndEndpoint(this.baseUrl, normalizedEndpoint);
    const {
      authType,
      authFallback,
      auth = false,
      includeAuth,
      skipContentType,
      suppressErrorLog = false,
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
      if (!suppressErrorLog) {
        console.error("❌ API request failed", {
          endpoint,
          baseUrl: this.baseUrl,
          method: fetchOptions.method || "GET",
          error,
        });
        console.error("❌ API Request failed:", error);
      }

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

  async generateApiKey(input = null) {
    const options =
      input && typeof input === "object" && !Array.isArray(input)
        ? input
        : { planCode: input };

    const {
      planCode = null,
      username = null,
      password = null,
      accessToken = null,
      useSessionAuth = false,
    } = options;

    const payload = {};

    if (username) {
      payload.username = username;
    }
    if (password) {
      payload.password = password;
    }
    if (planCode) {
      payload.plan_code = planCode;
    }
    if (accessToken) {
      payload.access_token = accessToken;
    }

    if (!username && !useSessionAuth) {
      console.warn(
        "generateApiKey() invoked without username; backend may require credentials.",
        { planCode },
      );
    }

    const requestConfig = {
      method: "POST",
      body: JSON.stringify(payload),
    };

    if (useSessionAuth && this.hasSessionToken()) {
      requestConfig.authType = "session";
    }

    let response;
    const requestWithSuppressedLogs = {
      ...requestConfig,
      suppressErrorLog: true,
    };

    try {
      response = await this.request("/auth/api-keys", requestWithSuppressedLogs);
    } catch (error) {
      const message = String(error?.message || "");
      const shouldRetry =
        message.includes("404") ||
        message.includes("405") ||
        /not found/i.test(message) ||
        /method not allowed/i.test(message);
      if (!shouldRetry) {
        throw error;
      }

      response = await this.request("/auth/api-key", requestWithSuppressedLogs);
    }

    const resolvedApiKey =
      response?.access_token ??
      response?.api_key ??
      response?.accessToken ??
      response?.token ??
      response?.data?.access_token ??
      response?.data?.api_key ??
      response?.data?.accessToken ??
      response?.apiKey ??
      response?.data?.apiKey ??
      null;

    if (resolvedApiKey) {
      this.setApiKey(resolvedApiKey);
    }

    return response;
  }

  async getSubscriptionStatus() {
    const profile = await this.request("/auth/me", {
      authType: "session",
    });

    if (!profile || typeof profile !== "object") {
      return null;
    }

    const rawSubscription =
      profile.subscription && typeof profile.subscription === "object"
        ? profile.subscription
        : {};

    const planCandidates = [
      rawSubscription.plan_code,
      rawSubscription.planCode,
      rawSubscription.plan?.code,
      rawSubscription.plan?.plan_code,
      profile.subscription_plan,
      profile.subscriptionPlan,
      profile.plan_code,
      profile.planCode,
      profile.plan?.code,
      profile.plan?.plan_code,
    ];

    const planCode =
      planCandidates.find(
        (value) => typeof value === "string" && value.trim().length > 0,
      ) || null;

    const isActive =
      rawSubscription.is_active ??
      rawSubscription.isActive ??
      profile.subscription_active ??
      profile.subscriptionActive ??
      profile.is_active ??
      profile.isActive ??
      false;

    let apiKey =
      rawSubscription.api_key ||
      rawSubscription.apiKey ||
      profile.api_key ||
      profile.apiKey ||
      profile.api_access_token ||
      profile.apiAccessToken ||
      null;

    if (!apiKey) {
      const apiKeyCollections = [
        rawSubscription.api_keys,
        rawSubscription.items,
        rawSubscription.data,
        profile.api_keys,
        profile.items,
        profile.data,
      ];

      for (const collection of apiKeyCollections) {
        const candidate = pickApiKeyFromCollection(collection);
        if (candidate) {
          apiKey = candidate;
          break;
        }
      }
    }

    const expiresAt =
      rawSubscription.expires_at ||
      rawSubscription.expiresAt ||
      profile.subscription_expires_at ||
      profile.subscriptionExpiresAt ||
      null;

    const daysRemaining =
      rawSubscription.days_remaining ||
      rawSubscription.daysRemaining ||
      profile.subscription_days_remaining ||
      profile.subscriptionDaysRemaining ||
      null;

    return {
      is_active: Boolean(isActive),
      plan_code: planCode,
      expires_at: expiresAt,
      days_remaining: daysRemaining,
      api_key: apiKey,
    };
  }

  async getCurrentUser() {
    return this.request("/auth/me", {
      authType: "session",
      authFallback: "apiKey",
    });
  }

  async updateApiKey(username, password, accessToken, planCode) {
    const payload = JSON.stringify({
      username,
      password,
      access_token: accessToken,
      plan_code: planCode,
    });

    try {
      return await this.request("/auth/api-key/update", {
        method: "POST",
        body: payload,
        authType: "session",
        suppressErrorLog: true,
      });
    } catch (error) {
      const message = String(error?.message || "");
      const shouldRetry =
        message.includes("404") ||
        message.includes("405") ||
        /not found/i.test(message) ||
        /method not allowed/i.test(message);

      if (!shouldRetry) {
        throw error;
      }

      return this.request("/auth/api-keys/update", {
        method: "POST",
        body: payload,
        authType: "session",
        suppressErrorLog: true,
      });
    }
  }

  async listApiKeys() {
    const candidateEndpoints = ["/auth/api-keys", "/auth/api-key"];
    const sessionToken =
      typeof this.getAuthToken === "function"
        ? this.getAuthToken({ primary: "session" })
        : null;

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await this.request(endpoint, {
          authType: "session",
          suppressErrorLog: true,
        });

        if (Array.isArray(response)) {
          return response;
        }
        if (Array.isArray(response?.items)) {
          return response.items;
        }
        if (Array.isArray(response?.data)) {
          return response.data;
        }
        if (Array.isArray(response?.results)) {
          return response.results;
        }
        if (response && typeof response === "object") {
          const candidateToken =
            response.access_token ||
            response.api_key ||
            response.token ||
            response.accessToken ||
            response.apiKey ||
            null;
          if (candidateToken && candidateToken !== sessionToken) {
            return [response];
          }
        }
      } catch (error) {
        const message = String(error?.message || "");
        const methodNotAllowed =
          message.includes("405") || /method not allowed/i.test(message);
        const notFound =
          message.includes("404") || /not found/i.test(message);

        if (methodNotAllowed || notFound) {
          console.info(
            `API endpoint ${endpoint} does not support listing keys; falling back`,
          );
          continue;
        }

        throw error;
      }
    }

    return [];
  }

  async getInformationN8N(orderId, orderSuffix = null) {
    if (!orderId && !orderSuffix) {
      console.warn(
        "getInformationN8N invoked without orderId or orderSuffix",
      );
      return null;
    }

    if (orderId) {
      this.setLastOrderId(orderId);
    }

    const payload = {};
    if (orderId) {
      payload.order_id = orderId;
    }
    if (orderSuffix) {
      payload.order_suffix = orderSuffix;
    }

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
    const headers = { Authorization: `Bearer ${token}` };
    if (primary === "apiKey") {
      headers["X-API-Key"] = token;
    }
    return headers;
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
    console.log("🔐 Using auth header", {
      hasApiKey: this.hasApiKey(),
      planCode: this.getPlanCode?.(),
    });

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
    try {
      return await this.request(`/agents/${agentId}/documents/`, {
        authType: "apiKey",
        suppressErrorLog: true,
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (/method not allowed/i.test(message) || message.includes("405")) {
        console.info(
          "Document listing unsupported on backend. Returning empty list.",
        );
        return [];
      }
      throw error;
    }
  }

  async uploadAgentDocuments(
    agentId,
    files,
    {
      chunkSize = 400,
      chunkOverlap = 80,
      batchSize = 50,
    } = {},
  ) {
    const headers = this.authHeader();
    const url = joinBaseAndEndpoint(
      this.baseUrl,
      normalizeEndpoint(`/agents/${agentId}/documents/`),
    );

    const uploadResults = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chunk_size", String(chunkSize));
      formData.append("chunk_overlap", String(chunkOverlap));
      formData.append("batch_size", String(batchSize));

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        let fallbackMessage = "Failed to upload knowledge documents";
        try {
          const errorPayload = await response.json();
          if (typeof errorPayload === "string") {
            fallbackMessage = errorPayload;
          } else if (errorPayload?.detail) {
            fallbackMessage =
              typeof errorPayload.detail === "string"
                ? errorPayload.detail
                : JSON.stringify(errorPayload.detail);
          } else if (errorPayload?.message) {
            fallbackMessage =
              typeof errorPayload.message === "string"
                ? errorPayload.message
                : JSON.stringify(errorPayload.message);
          }
        } catch (_jsonError) {
          const text = await response.text();
          if (text) {
            fallbackMessage = text;
          }
        }
        if (
          /pycryptodome is required for aes algorithm/i.test(fallbackMessage)
        ) {
          fallbackMessage =
            "Failed to ingest document: PyCryptodome is required on the server for AES-encrypted PDFs. Ask your administrator to install the `pycryptodome` package or upload an unencrypted file.";
        }

        throw new Error(fallbackMessage);
      }

      try {
        const payload = await response.json();
        uploadResults.push(payload);
      } catch (_parseError) {
        uploadResults.push(null);
      }
    }

    return uploadResults;
  }

  // Tools endpoints
  async getTools() {
    return this.request("/tools", {
      authType: "apiKey",
    });
  }

  async getWhatsAppQrCode() {
    return this.request("/integrations/whatsapp/qr", {
      authType: "apiKey",
      authFallback: "session",
    });
  }
}

export const apiService = new ApiService();
