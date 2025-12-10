const DEFAULT_API_BASE_URL = "/api/proxy";
const WHATSAPP_SESSIONS_URL = "/api/whatsapp-sessions";
const isProductionEnv =
  typeof process !== "undefined" && process.env.NODE_ENV === "production";
const API_DEBUG_ENABLED =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_API_DEBUG === "1") ||
  (!isProductionEnv &&
    (typeof process === "undefined" ||
      process.env.NEXT_PUBLIC_API_DEBUG !== "0"));

const debugLog = (...args) => {
  if (API_DEBUG_ENABLED) {
    console.log(...args);
  }
};
const DEFAULT_WHATSAPP_STATUS_BASE = "/api/whatsapp-sessions/status";
const DEFAULT_PAYMENT_WEBHOOK =
  "https://n8n.srv651498.hstgr.cloud/webhook/pembayaranMidtrans";
const DEFAULT_LANGCHAIN_BASE_URL = "https://new-langchain.chiefaiofficer.id/api/v1";

const resolveWhatsAppStatusBaseUrl = () => {
  if (typeof process !== "undefined") {
    const raw = process.env.NEXT_PUBLIC_WHATSAPP_STATUS_BASE_URL;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed) {
        return trimmed.replace(/\/+$/, "");
      }
    }
  }
  return DEFAULT_WHATSAPP_STATUS_BASE;
};

const buildWhatsAppStatusCheckUrl = (agentId) => {
  if (!agentId) {
    return null;
  }
  const base = resolveWhatsAppStatusBaseUrl();
  const normalizedBase =
    base === "/"
      ? ""
      : base.endsWith("/")
      ? base.slice(0, -1)
      : base;
  const url = new URL(
    normalizedBase.startsWith("http")
      ? normalizedBase
      : `http://dummy${normalizedBase}`,
  );
  url.searchParams.set("agentId", agentId);
  const serialized =
    normalizedBase.startsWith("http") || normalizedBase.startsWith("/")
      ? `${normalizedBase}?${url.searchParams.toString()}`
      : `/${normalizedBase}?${url.searchParams.toString()}`;
  return serialized;
};

const buildWhatsAppUrl = (agentId = null) => {
  if (
    typeof WHATSAPP_SESSIONS_URL === "string" &&
    (WHATSAPP_SESSIONS_URL.startsWith("http://") ||
      WHATSAPP_SESSIONS_URL.startsWith("https://"))
  ) {
    const url = new URL(WHATSAPP_SESSIONS_URL);
    if (agentId) {
      url.searchParams.set("agentId", agentId);
    }
    return url.toString();
  }

  const base =
    typeof WHATSAPP_SESSIONS_URL === "string" &&
    WHATSAPP_SESSIONS_URL.length > 0
      ? WHATSAPP_SESSIONS_URL
      : "/api/whatsapp-sessions";

  if (agentId) {
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}agentId=${encodeURIComponent(agentId)}`;
  }
  return base;
};

const buildWhatsAppQrUrl = (agentId = null) => {
  const base =
    typeof WHATSAPP_SESSIONS_URL === "string" &&
    WHATSAPP_SESSIONS_URL.length > 0
      ? WHATSAPP_SESSIONS_URL
      : "/api/whatsapp-sessions";

  const normalizeBase = (value) =>
    value.endsWith("/") ? value.slice(0, -1) : value;

  if (base.startsWith("http://") || base.startsWith("https://")) {
    const url = new URL(normalizeBase(base) + "/qr");
    if (agentId) {
      url.searchParams.set("agentId", agentId);
    }
    return url.toString();
  }

  const qrPath = `${normalizeBase(base)}/qr`;
  if (agentId) {
    const separator = qrPath.includes("?") ? "&" : "?";
    return `${qrPath}${separator}agentId=${encodeURIComponent(agentId)}`;
  }
  return qrPath;
};

const buildWhatsAppAgentResourceUrl = (agentId, suffix = "") => {
  if (!agentId) {
    return null;
  }
  const base =
    typeof WHATSAPP_SESSIONS_URL === "string" &&
    WHATSAPP_SESSIONS_URL.length > 0
      ? WHATSAPP_SESSIONS_URL
      : "/api/whatsapp-sessions";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedSuffix =
    typeof suffix === "string" && suffix.length
      ? `/${suffix.replace(/^\/+/, "")}`
      : "";
  return `${normalizedBase}/${encodeURIComponent(agentId)}${normalizedSuffix}`;
};

const resolvePaymentWebhookUrl = () => {
  if (typeof process !== "undefined") {
    const candidates = [
      process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL,
      process.env.NEXT_PUBLIC_N8N_PAYMENT_WEBHOOK_URL,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return DEFAULT_PAYMENT_WEBHOOK;
};
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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const looksLikeEmail = (value) => emailPattern.test(value);
const normalizePhoneIdentifier = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const hasPlusPrefix = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  if (!digitsOnly) {
    return "";
  }
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
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
    debugLog("🔑 ApiService initialized");
  }

  setBaseUrl(url) {
    this.baseUrl = url && url.trim() ? url.trim() : DEFAULT_API_BASE_URL;
    debugLog("🌐 API base URL set to:", this.baseUrl);
  }

  setSessionToken(token) {
    debugLog(
      "🔑 Setting session token:",
      token ? "***" + token.slice(-10) : "null"
    );
    this.sessionToken = token || null;
    this.initialized = true;
  }

  setApiKey(token) {
    if (token && token === this.sessionToken) {
      console.warn("⚠️ Ignoring API key that matches session token");
      return;
    }
    debugLog(
      "🆔 Setting API key:",
      token ? "***" + token.slice(-10) : "null"
    );
    this.apiKeyToken = token || null;
    this.initialized = true;
  }

  /**
   * Legacy compatibility: treat setToken as setting the API key.
   */
  setToken(token) {
    this.setApiKey(token);
  }

  clearSessionToken() {
    debugLog("🗑️ Clearing session token");
    this.sessionToken = null;
  }

  clearApiKey() {
    debugLog("🗑️ Clearing API key");
    this.apiKeyToken = null;
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
  }

  clearLastOrderId() {
    this.setLastOrderId(null);
  }

  getLastOrderId() {
    return this.lastOrderId;
  }

  setPlanCode(planCode) {
    debugLog("📦 Setting plan code", planCode);
    this.lastPlanCode = planCode || null;
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

  getCurrentApiKey() {
    return this.apiKeyToken;
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
        ")"
      );
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      if (authType === "apiKey") {
        headers["X-API-Key"] = token;
      }
      debugLog("📤 Request with auth header", {
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

    debugLog(`🌐 API Request: ${fetchOptions.method || "GET"} ${endpoint}`, {
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
      credentials: fetchOptions.credentials ?? "include",
    };

    try {
      debugLog("🧾 Fetch options", { endpoint, options: config });
      debugLog("🚀 Fetching:", url);
      debugLog("📋 Config:", config);

      const response = await fetch(url, config);
      debugLog(`📥 Response: ${response.status} ${response.statusText}`);

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

      debugLog("📬 API response", {
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
            "3. Check browser console for CORS errors"
        );
      }

      throw error;
    }
  }

  // Auth endpoints
  async register(identifier, password, extraParams = {}) {
    const payload = { ...extraParams };
    const params = new URLSearchParams();
    if (identifier !== undefined && identifier !== null) {
      payload.email = identifier;
      params.set("email", String(identifier));
    }
    if (password !== undefined && password !== null) {
      payload.password = password;
      params.set("password", String(password));
    }

    const query = params.toString();

    return this.request(`/auth/register${query ? `?${query}` : ""}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async login(identifier, password) {
    const params = new URLSearchParams();
    const normalizedIdentifier =
      typeof identifier === "string"
        ? identifier.trim()
        : identifier != null
          ? String(identifier)
          : "";
    if (normalizedIdentifier) {
      params.set("identifier", normalizedIdentifier);
      if (looksLikeEmail(normalizedIdentifier)) {
        params.set("email", normalizedIdentifier);
      } else {
        const normalizedPhone = normalizePhoneIdentifier(normalizedIdentifier);
        if (normalizedPhone) {
          params.set("phone", normalizedPhone);
        }
      }
    }
    if (password !== undefined && password !== null) {
      params.set("password", String(password));
    }

    const serialized = params.toString();

    return this.request(`/auth/login${serialized ? `?${serialized}` : ""}`, {
      method: "POST",
      body: serialized,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
        { planCode }
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
      response = await this.request(
        "/auth/api-keys",
        requestWithSuppressedLogs
      );
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
    const hasSession = this.hasSessionToken();
    const hasApiKey = this.hasApiKey();
    const authType = hasSession ? "session" : hasApiKey ? "apiKey" : null;
    const authFallback =
      authType === "session" && hasApiKey ? "apiKey" : undefined;

    const profile = await this.request("/auth/me", {
      authType,
      authFallback,
      suppressErrorLog: true,
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
        (value) => typeof value === "string" && value.trim().length > 0
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
    const hasSession = this.hasSessionToken();
    const hasApiKey = this.hasApiKey();
    const authType = hasSession ? "session" : hasApiKey ? "apiKey" : null;
    const authFallback =
      authType === "session" && hasApiKey ? "apiKey" : undefined;

    return this.request("/auth/me", {
      authType,
      authFallback,
      suppressErrorLog: true,
    });
  }

  async checkGoogleAuthStatus(arg = null) {
    // Backward compatible signature: accepts agentId or an options object.
    let agentId = null;
    if (typeof arg === "string" || typeof arg === "number") {
      agentId = arg;
    } else if (arg && typeof arg === "object") {
      agentId = arg.agentId || arg.agent_id || null;
    }

    const payload = agentId ? { agent_id: agentId } : {};

    return this.request("/auth/refresh-status-google", {
      method: "POST",
      authType: "apiKey",
      authFallback: "session",
      body: JSON.stringify(payload),
      suppressErrorLog: true,
    });
  }

  async listGoogleAuthTokens() {
    return this.request("/auth/google", {
      authType: "session",
      suppressErrorLog: true,
    });
  }

  async getRequiredToolScopes(tools = []) {
    const normalized =
      Array.isArray(tools) && tools.length
        ? tools
            .map((tool) =>
              typeof tool === "string" ? tool.trim() : ""
            )
            .filter(Boolean)
        : [];
    const search =
      normalized.length > 0
        ? `?tools=${encodeURIComponent(normalized.join(","))}`
        : "";
    return this.request(`/tools/scopes/required${search}`, {
      authType: "session",
      suppressErrorLog: true,
    });
  }

  async startGoogleAuth(scopes = [], agentId = null) {
    const normalizedScopes =
      Array.isArray(scopes) && scopes.length
        ? scopes
            .map((scope) =>
              typeof scope === "string" ? scope.trim() : ""
            )
            .filter(Boolean)
        : [];

    const payload = {
      scopes: normalizedScopes,
    };

    if (agentId) {
      payload.agent_id = agentId;
    }

    return this.request("/auth/google", {
      method: "POST",
      authType: "session",
      body: JSON.stringify(payload),
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
        const notFound = message.includes("404") || /not found/i.test(message);

        if (methodNotAllowed || notFound) {
          console.info(
            `API endpoint ${endpoint} does not support listing keys; falling back`
          );
          continue;
        }

        throw error;
      }
    }

    return [];
  }

  async updateUserPassword({ userId, newPassword }) {
    const payload = JSON.stringify({
      user_id: userId,
      new_password: newPassword,
    });

    return this.request("/auth/user/update-password", {
      method: "POST",
      body: payload,
      authType: "session",
    });
  }

  async getInformationN8N(orderId, orderSuffix = null) {
    if (!orderId && !orderSuffix) {
      console.warn("getInformationN8N invoked without orderId or orderSuffix");
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
          `Failed to fetch payment status (${response.status})`
      );
    }

    return response.json();
  }

  async notifyPaymentWebhook(payload) {
    const webhookUrl = resolvePaymentWebhookUrl();
    if (!webhookUrl) {
      throw new Error("Payment webhook URL is not configured.");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

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
    debugLog("🔐 Using auth header", {
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
    const normalise = (data) => {
      if (!data) {
        return [];
      }
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray(data?.uploads)) {
        return data.uploads;
      }
      if (Array.isArray(data?.items)) {
        return data.items;
      }
      if (Array.isArray(data?.data)) {
        return data.data;
      }
      if (Array.isArray(data?.results)) {
        return data.results;
      }
      return data ? [data] : [];
    };

    const mapDocument = (doc) => {
      if (!doc || typeof doc !== "object") {
        return null;
      }
      return {
        id: doc.id || doc.upload_id || doc.uploadId || null,
        filename: doc.filename || doc.name || "Unknown",
        contentType:
          doc.content_type ||
          doc.contentType ||
          doc.mime_type ||
          doc.mimeType ||
          "Unknown",
        sizeBytes:
          doc.size_bytes ?? doc.sizeBytes ?? doc.size ?? doc.file_size ?? null,
        chunkCount: doc.chunk_count ?? doc.chunkCount ?? doc.chunks ?? null,
        createdAt: doc.created_at || doc.createdAt || null,
        updatedAt: doc.updated_at || doc.updatedAt || null,
        details: doc.details || null,
        raw: doc,
      };
    };

    const buildUrl = (path) => {
      const normalized = normalizeEndpoint(path);
      const attempts = new Set([normalized]);
      if (!/[?&]format=/.test(normalized)) {
        const separator = normalized.includes("?") ? "&" : "?";
        attempts.add(`${normalized}${separator}format=detailed`);
      }
      return Array.from(attempts);
    };

    const fetchDocuments = async (path) => {
      const response = await this.request(path, {
        authType: "apiKey",
      });

      const items = normalise(response).map(mapDocument).filter(Boolean);

      return {
        items,
        supportsListing: true,
      };
    };

    const attempted = new Set();
    const candidates = [
      `/agents/${agentId}/documents`,
      `/agents/${agentId}/documents/`,
    ]
      .flatMap((path) => buildUrl(path))
      .filter((candidate) => {
        if (attempted.has(candidate)) return false;
        attempted.add(candidate);
        return true;
      });

    for (const candidate of candidates) {
      try {
        return await fetchDocuments(candidate);
      } catch (error) {
        const message = String(error?.message || "");
        const methodNotAllowed =
          /method not allowed/i.test(message) || message.includes("405");
        if (methodNotAllowed) {
          continue;
        }
        throw error;
      }
    }

    console.info("Document listing unsupported by backend");
    return {
      items: [],
      supportsListing: false,
    };
  }

  async uploadAgentDocuments(
    agentId,
    files,
    { chunkSize = 400, chunkOverlap = 80, batchSize = 50 } = {}
  ) {
    const headers = this.authHeader();
    const url = joinBaseAndEndpoint(
      this.baseUrl,
      normalizeEndpoint(`/agents/${agentId}/documents`)
    );

    const uploadResults = [];
    const normalizedResults = [];
    const fileList = Array.from(files || []);

    for (const [index, file] of fileList.entries()) {
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

      let payload = null;
      try {
        payload = await response.json();
      } catch (_parseError) {
        payload = null;
      }
      uploadResults.push(payload);
      normalizedResults.push(payload);
    }

    return {
      items: normalizedResults,
      raw: uploadResults,
    };
  }

  async deleteAgentDocument(agentId, uploadId) {
    await this.ensureApiKey();
    return this.request(`/agents/${agentId}/documents/${uploadId}`, {
      method: "DELETE",
      authType: "apiKey",
    });
  }

  normalizeWhatsAppSession(data) {
    if (!data) {
      return {
        isActive: false,
        status: "inactive",
        qrImage: null,
        qrUrl: null,
        sessionId: null,
        raw: null,
      };
    }

    const rawInput = Array.isArray(data) ? data[0] || {} : data;
    const mergeNestedSessionPayload = (input) => {
      if (!input || typeof input !== "object") {
        return input;
      }
      const merged = { ...input };
      if (Array.isArray(merged.results) && merged.results.length > 0) {
        const nestedResult = merged.results.find(
          (entry) => entry && typeof entry === "object",
        );
        if (nestedResult) {
          Object.assign(merged, nestedResult);
        }
      }
      if (
        merged.data &&
        typeof merged.data === "object" &&
        !Array.isArray(merged.data)
      ) {
        Object.assign(merged, merged.data);
      }
      return merged;
    };

    const session =
      rawInput && typeof rawInput === "object"
        ? mergeNestedSessionPayload(rawInput)
        : {};

    if (
      session &&
      typeof session === "object" &&
      typeof session.base64 === "string"
    ) {
      const compactBase64 = session.base64.replace(/\s+/g, "");
      if (!session.qr || typeof session.qr !== "object") {
        session.qr = { base64: compactBase64 };
      } else if (!session.qr.base64) {
        session.qr.base64 = compactBase64;
      }
      if (!session.qr_base64) {
        session.qr_base64 = compactBase64;
      }
      if (!session.qrBase64) {
        session.qrBase64 = compactBase64;
      }
    }

    if (
      session &&
      typeof session === "object" &&
      typeof session.contentType === "string" &&
      session.contentType.trim()
    ) {
      const normalizedContentType = session.contentType.trim();
      if (!session.qr_content_type) {
        session.qr_content_type = normalizedContentType;
      }
      if (!session.qrContentType) {
        session.qrContentType = normalizedContentType;
      }
    }

    if (
      session &&
      typeof session === "object" &&
      typeof session.qrUpdatedAt === "string" &&
      !session.qr_updated_at
    ) {
      session.qr_updated_at = session.qrUpdatedAt;
    }

    const toIsoString = (input) => {
      if (!input && input !== 0) {
        return null;
      }
      if (input instanceof Date) {
        return input.toISOString();
      }
      if (typeof input === "number" && Number.isFinite(input)) {
        const isMilliseconds = input > 1e12;
        const milliseconds = isMilliseconds ? input : input * 1000;
        return new Date(milliseconds).toISOString();
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed) {
          return null;
        }
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) {
          return new Date(parsed).toISOString();
        }
        return null;
      }
      if (typeof input === "object") {
        const seconds =
          input.seconds ??
          input.second ??
          input._seconds ??
          input.epochSeconds ??
          null;
        const nanos =
          input.nanoseconds ??
          input.nanos ??
          input.nanoSeconds ??
          input._nanoseconds ??
          0;
        if (typeof seconds === "number" && Number.isFinite(seconds)) {
          return new Date(seconds * 1000 + Math.round(nanos / 1e6)).toISOString();
        }
      }
      return null;
    };

    let rawStatus =
      session.status ||
      session.session_status ||
      session.state ||
      session.sessionState ||
      session.connection_state ||
      "";
    if (rawStatus && typeof rawStatus === "object") {
      rawStatus =
        rawStatus.state ||
        rawStatus.status ||
        rawStatus.value ||
        rawStatus.current ||
        "";
    }
    const normalizedStatus = String(rawStatus || "").toLowerCase();
    const isActive =
      session.is_active === true ||
      session.active === true ||
      normalizedStatus === "active" ||
      normalizedStatus === "connected" ||
      normalizedStatus === "ready";
    const statusUpdatedSource =
      session.qr_updated_at ||
      session.qrUpdatedAt ||
      session.status_updated_at ||
      session.statusUpdatedAt ||
      (typeof session.status === "object"
        ? session.status.updatedAt ||
          session.status.updated_at ||
          session.status.lastUpdatedAt ||
          session.status.last_connected_at ||
          session.status.lastConnectedAt ||
          null
        : null) ||
      session.updated_at ||
      session.updatedAt ||
      null;
    const statusUpdatedAt =
      toIsoString(statusUpdatedSource) ||
      (typeof statusUpdatedSource === "string"
        ? statusUpdatedSource
        : null);

    const qrString =
      typeof session.qr === "string" && session.qr.trim().length
        ? session.qr.trim()
        : null;

    const qrRecord =
      (typeof session.qr === "object" && session.qr) ||
      session.qr_details ||
      session.qrDetails ||
      session.qr_code_details ||
      session.qrCodeDetails ||
      null;

    const sessionDetails =
      session.session ||
      session.session_details ||
      session.sessionDetails ||
      null;

    const qrGeneratedSource =
      (qrRecord &&
        (qrRecord.generated_at ||
          qrRecord.generatedAt ||
          qrRecord.created_at ||
          qrRecord.createdAt ||
          qrRecord.issued_at ||
          qrRecord.issuedAt)) ||
      session.qr_generated_at ||
      session.qrGeneratedAt ||
      session.qr_created_at ||
      session.qrCreatedAt ||
      statusUpdatedSource ||
      null;

    const expiresSourceFromRecord =
      (qrRecord &&
        (qrRecord.expires_at ||
          qrRecord.expiresAt ||
          qrRecord.expired_at ||
          qrRecord.expiredAt ||
          qrRecord.valid_until ||
          qrRecord.validUntil)) ||
      session.qr_expires_at ||
      session.qrExpiresAt ||
      session.qr_expired_at ||
      session.qrExpiredAt ||
      null;

    const expiresInSeconds =
      (typeof qrRecord?.expires_in === "number"
        ? qrRecord.expires_in
        : null) ??
      (typeof qrRecord?.expires_in_seconds === "number"
        ? qrRecord.expires_in_seconds
        : null) ??
      (typeof qrRecord?.ttl === "number" ? qrRecord.ttl : null);

    const qrGeneratedAt =
      toIsoString(qrGeneratedSource) ||
      (typeof qrGeneratedSource === "string"
        ? qrGeneratedSource
        : null);

    let qrExpiresAt =
      toIsoString(expiresSourceFromRecord) ||
      (typeof expiresSourceFromRecord === "string"
        ? expiresSourceFromRecord
        : null);

    if (!qrExpiresAt && typeof expiresInSeconds === "number") {
      const baseIso =
        qrGeneratedAt ||
        (toIsoString(statusUpdatedSource) ||
          statusUpdatedAt) ||
        new Date().toISOString();
      const baseMs = Date.parse(baseIso);
      if (!Number.isNaN(baseMs)) {
        qrExpiresAt = new Date(
          baseMs + Math.max(0, expiresInSeconds) * 1000,
        ).toISOString();
      }
    }

    const rawQrContent =
      qrString ||
      session.base64 ||
      session.qrBase64 ||
      session.qr_base64 ||
      session.qrCodeBase64 ||
      session.qr_code_base64 ||
      session.qrCode ||
      session.qr_code ||
      (qrRecord &&
        (qrRecord.base64 ||
          qrRecord.data ||
          qrRecord.qr ||
          qrRecord.qrCode ||
          qrRecord.qr_code ||
          qrRecord.qrCodeBase64 ||
          null)) ||
      session.qr_image ||
      session.qrImage ||
      session.image ||
      session.qrCodeImage ||
      null;
    const qrContentType =
      (qrRecord &&
        (qrRecord.contentType || qrRecord.mime_type || qrRecord.mimeType)) ||
      session.qr_content_type ||
      session.qrContentType ||
      session.qrCodeContentType ||
      session.image_type ||
      "image/png";

    let qrImage = null;
    let qrUrl = null;
    let qrBase64 = null;

    const normalizeBase64 = (value) =>
      typeof value === "string" ? value.replace(/\s+/g, "") : value;

    if (typeof rawQrContent === "string") {
      const trimmed = rawQrContent.trim();
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://")
      ) {
        qrUrl = trimmed;
      } else if (trimmed.startsWith("data:")) {
        qrImage = trimmed;
      } else {
        const compact = normalizeBase64(trimmed);
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
          qrBase64 = compact;
          qrImage = `data:${qrContentType};base64,${compact}`;
        }
      }
    } else if (rawQrContent && typeof rawQrContent === "object") {
      const nestedBase64 =
        normalizeBase64(
          rawQrContent.base64 || rawQrContent.data || rawQrContent.qr || null,
        );
      if (typeof nestedBase64 === "string") {
        qrBase64 = nestedBase64;
        qrImage = `data:${qrContentType};base64,${nestedBase64}`;
      }
      if (!qrUrl) {
        const nestedUrl =
          rawQrContent.url ||
          rawQrContent.qrUrl ||
          rawQrContent.redirect ||
          null;
        if (typeof nestedUrl === "string") {
          qrUrl = nestedUrl;
        }
      }
    }

    if (!qrUrl) {
      const urlCandidate =
        session.qr_url ||
        session.qrUrl ||
        session.deeplink_url ||
        session.deeplinkUrl ||
        null;
      if (typeof urlCandidate === "string") {
        qrUrl = urlCandidate;
      }
    }

    const resolvedSessionId =
      session.session_id ||
      session.sessionId ||
      session.id ||
      (sessionDetails &&
        (sessionDetails.session_id ||
          sessionDetails.sessionId ||
          sessionDetails.agentSessionId)) ||
      null;

    const hasSessionDetails = Boolean(
      resolvedSessionId ||
        session.agent_id ||
        session.agentId ||
        (sessionDetails &&
          (sessionDetails.agentId ||
            sessionDetails.userId ||
            sessionDetails.plan)) ||
        qrRecord ||
        session.base64 ||
        session.qrBase64 ||
        session.qr_base64
    );

    const finalStatus =
      normalizedStatus || (qrBase64 ? "waiting_scan" : "inactive");

    return {
      isActive,
      status: isActive ? "connected" : finalStatus,
      qrImage,
      qrUrl,
      qrBase64,
      qrGeneratedAt,
      qrExpiresAt,
      qrExpiresInSeconds:
        typeof expiresInSeconds === "number" ? expiresInSeconds : null,
      sessionId: resolvedSessionId,
      updatedAt: statusUpdatedAt,
      raw: hasSessionDetails ? rawInput : null,
    };
  }

  normalizeWhatsAppStatusSnapshot(payload) {
    if (!payload || typeof payload !== "object") {
      return {
        connected: false,
        status: "inactive",
        isActive: false,
        qrImage: null,
        rawStatus: payload ?? null,
      };
    }

    // Extract the main data object from the payload
    const data =
      payload.data && typeof payload.data === "object"
        ? payload.data
        : payload;

    // Extract live state information with fallbacks
    const liveState =
      data.liveState ||
      data.live_state ||
      data.status ||
      {};

    // Handle status from various possible locations
    const statusFromData = data.status || data.state;
    const statusFromLiveState = liveState.sessionState || liveState.state;
    const rawStatus = statusFromData || statusFromLiveState || "";

    const normalizedStatus = rawStatus.toString().toLowerCase();

    // Determine connection status based on multiple indicators
    const isActive =
      normalizedStatus === "connected" ||
      normalizedStatus === "ready" ||
      liveState.isReady === true ||
      liveState.hasClient === true;

    // Extract QR code information
    const qrString =
      (typeof liveState.qr === "string" && liveState.qr.trim().length
        ? liveState.qr.trim()
        : null) ||
      (typeof data.qr === "string" && data.qr.trim().length
        ? data.qr.trim()
        : null);

    const qrSource =
      (typeof liveState.qr === "object" && liveState.qr) ||
      liveState.qr_details ||
      liveState.qrDetails ||
      (typeof data.qr === "object" && data.qr) ||
      data.qrCode ||
      {};

    const qrBase64 =
      typeof qrSource.base64 === "string"
        ? qrSource.base64
        : typeof data.qrCodeBase64 === "string"
          ? data.qrCodeBase64
          : qrString && !qrString.startsWith("http") && !qrString.startsWith("data:")
            ? qrString
            : null;
    const qrContentType =
      qrSource.contentType ||
      qrSource.mime_type ||
      qrSource.mimeType ||
      data.qrCodeContentType ||
      data.qr_content_type ||
      "image/png";
    const qrImage =
      qrString && qrString.startsWith("data:")
        ? qrString
        : qrBase64 && qrContentType
          ? `data:${qrContentType};base64,${qrBase64}`
          : null;

    const finalStatus =
      normalizedStatus || (qrBase64 ? "waiting_scan" : "inactive");

    // Return comprehensive status object
    return {
      // Primary connection status
      connected: isActive,
      isActive,
      status: isActive ? "connected" : finalStatus,

      // Agent identification
      agentId: data.agentId || data.agent_id || null,
      agentName: data.agentName || data.agent_name || null,

      // QR code information
      qrImage,
      qrUrl:
        qrSource.url ||
        qrSource.qrUrl ||
        (qrString && qrString.startsWith("http") ? qrString : null),
      qrBase64,
      qrContentType,
      qrUpdatedAt: liveState.qrUpdatedAt || qrSource.updatedAt || null,

      // Timestamps
      lastConnectedAt: data.lastConnectedAt || null,
      lastDisconnectedAt: data.lastDisconnectedAt || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || liveState.qrUpdatedAt || null,

      // Trace information
      traceId:
        payload.traceId ||
        payload.trace_id ||
        data.traceId ||
        data.trace_id ||
        null,

      // Raw payload for debugging
      rawStatus: payload,
    };
  }

  async getWhatsAppSession(agentId) {
    if (!agentId) {
      return this.normalizeWhatsAppSession(null);
    }

    try {
      const response = await fetch(buildWhatsAppUrl(agentId), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        return this.normalizeWhatsAppSession(null);
      }
      if (response.status === 204) {
        return this.normalizeWhatsAppSession(null);
      }

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          detail || `Failed to fetch WhatsApp session (${response.status})`
        );
      }

      const payload = await response.json().catch(() => ({}));

      if (
        payload &&
        typeof payload === "object" &&
        "detail" in payload &&
        !("status" in payload || "session" in payload || "qr" in payload)
      ) {
        throw new Error(
          typeof payload.detail === "string"
            ? payload.detail
            : JSON.stringify(payload.detail)
        );
      }

      return this.normalizeWhatsAppSession(payload);
    } catch (error) {
      console.warn("Unable to load WhatsApp session", { agentId, error });
      throw error;
    }
  }

  async createWhatsAppSession({ userId, agentId, agentName, apiKey } = {}) {
    if (!agentId || !apiKey) {
      throw new Error("WhatsApp session requires agent ID and an API key.");
    }

    const payload = {
      agentId,
      agentName: agentName || agentId,
      apiKey,
      apikey: apiKey,
      langchainUrl: `${DEFAULT_LANGCHAIN_BASE_URL}/agents/${agentId}/execute`,
    };

    const response = await fetch(buildWhatsAppUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = `Failed to start WhatsApp session (${response.status})`;
      try {
        const data = await response.json();
        if (typeof data === "string") {
          message = data;
        } else if (data?.detail) {
          message =
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail);
        } else if (data?.message) {
          message =
            typeof data.message === "string"
              ? data.message
              : JSON.stringify(data.message);
        }
      } catch (_parseError) {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }

    const responsePayload = await response.json().catch(() => ({}));
    return this.normalizeWhatsAppSession(responsePayload);
  }

  async fetchWhatsAppQr(agentId) {
    if (!agentId) {
      throw new Error("Agent ID is required to fetch a WhatsApp QR code.");
    }

    const response = await fetch(buildWhatsAppQrUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      let message = `Failed to fetch WhatsApp QR (${response.status})`;
      try {
        const data = await response.json();
        if (typeof data === "string") {
          message = data;
        } else if (data?.detail) {
          message =
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail);
        } else if (data?.message) {
          message =
            typeof data.message === "string"
              ? data.message
              : JSON.stringify(data.message);
        }
      } catch (_parseError) {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }

    const payload = await response.json().catch(() => ({}));
    return this.normalizeWhatsAppSession(payload);
  }

  async getWhatsAppConnectionStatus(agentId) {
    if (!agentId) {
      throw new Error(
        "Agent identifier missing while requesting WhatsApp connection status."
      );
    }

    const url = buildWhatsAppStatusCheckUrl(agentId);
    if (!url) {
      throw new Error(
        "WhatsApp connection status endpoint not configured. Set NEXT_PUBLIC_WHATSAPP_STATUS_BASE_URL."
      );
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          detail ||
            `Failed to refresh WhatsApp connection status (${response.status})`
        );
      }

      const payload = await response.json().catch(() => ({}));
      debugLog("WhatsApp status response:", payload);

      const normalizedStatus = this.normalizeWhatsAppStatusSnapshot(payload);
      debugLog("Normalized WhatsApp status:", normalizedStatus);

      return normalizedStatus;
    } catch (error) {
      console.warn("Unable to refresh WhatsApp connection status", {
        agentId,
        error,
      });
      throw error;
    }
  }

  async deleteWhatsAppSession(agentId) {
    if (!agentId) {
      throw new Error("Agent ID is required to delete WhatsApp session.");
    }

    const proxyUrl = buildWhatsAppAgentResourceUrl(agentId);
    if (!proxyUrl) {
      throw new Error("Unable to resolve WhatsApp delete endpoint.");
    }

    debugLog(`DELETE WhatsApp session via proxy: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : payload?.message ||
            `Failed to delete WhatsApp session (${response.status})`;
      throw new Error(detail);
    }

    debugLog("WhatsApp session deleted via proxy:", payload);
    return payload;
  }

  // Specific disconnect WhatsApp function for user action
  async disconnectWhatsApp(agentId) {
    try {
      debugLog(`Attempting to disconnect WhatsApp for agent: ${agentId}`);
      const result = await this.deleteWhatsAppSession(agentId);
      debugLog(`WhatsApp disconnect successful for agent ${agentId}:`, result);
      return { success: true, message: "WhatsApp disconnected successfully", result };
    } catch (error) {
      debugLog(`WhatsApp disconnect failed for agent ${agentId}:`, error);
      throw new Error(`Failed to disconnect WhatsApp: ${error.message}`);
    }
  }

  async reconnectWhatsAppSession(agentId) {
    if (!agentId) {
      throw new Error("Agent ID is required to reconnect WhatsApp session.");
    }

    const url = buildWhatsAppAgentResourceUrl(agentId, "reconnect");
    if (!url) {
      throw new Error("Unable to resolve WhatsApp reconnect endpoint.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : payload?.message ||
            `Failed to reconnect WhatsApp session (${response.status})`;
      throw new Error(detail);
    }

    return this.normalizeWhatsAppSession(payload);
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
