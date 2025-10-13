const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
    this.initialized = false;

    // Load token from sessionStorage on initialization
    if (typeof window !== "undefined") {
      const savedToken = sessionStorage.getItem("auth_token");
      if (savedToken) {
        this.token = savedToken;
        this.initialized = true;
        console.log("🔑 Token loaded from sessionStorage on init"); // Debug
      }
    }
  }

  setToken(token) {
    console.log("🔑 Setting token:", token ? "***" + token.slice(-10) : "null"); // Debug
    this.token = token;
    this.initialized = true;
    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem("auth_token", token);
      } else {
        sessionStorage.removeItem("auth_token");
      }
    }
  }

  clearToken() {
    console.log("🗑️ Clearing token"); // Debug
    this.token = null;
    this.initialized = false;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_token");
    }
  }

  getHeaders(includeAuth = false) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (includeAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
      console.log("📤 Request with auth header"); // Debug
    } else if (includeAuth && !this.token) {
      console.warn("⚠️ Auth requested but no token available"); // Debug
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // Add more detailed logging
    console.log(`🌐 API Request: ${options.method || "GET"} ${endpoint}`, {
      hasToken: !!this.token,
      includeAuth: options.auth || options.includeAuth,
    });

    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.auth || options.includeAuth),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Log response status
      console.log(`📥 Response: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || `HTTP error! status: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("❌ API Request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async register(email, password) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request("/auth/me", {
      auth: true,
    });
  }

  // Payment endpoints
  async getPaymentPlans() {
    return this.request("/payment/plans");
  }

  async createPayment(planCode) {
    return this.request("/payment/create", {
      method: "POST",
      body: JSON.stringify({ plan_code: planCode }),
      auth: true,
    });
  }

  async getPaymentHistory() {
    return this.request("/payment/history", {
      auth: true,
    });
  }

  async getSubscriptionStatus() {
    return this.request("/payment/status", {
      auth: true,
    });
  }

  // Agent endpoints
  async getAgents() {
    return this.request("/agents/", {
      auth: true,
    });
  }

  async createAgent(payload) {
    return this.request("/agents/", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    });
  }

  async getAgent(agentId) {
    return this.request(`/agents/${agentId}`, {
      auth: true,
    });
  }

  async updateAgent(agentId, data) {
    return this.request(`/agents/${agentId}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(agentId) {
    return this.request(`/agents/${agentId}`, {
      method: "DELETE",
      auth: true,
    });
  }

  async executeAgent(agentId, input, parameters = {}, sessionId = null) {
    const payload = { input, parameters };
    if (sessionId) {
      payload.session_id = sessionId;
    }

    return this.request(`/agents/${agentId}/execute`, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    });
  }

  async getAgentDocuments(agentId) {
    return this.request(`/agents/${agentId}/documents`, {
      auth: true,
    });
  }

  async uploadAgentDocuments(agentId, files) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch(
      `${this.baseUrl}/agents/${agentId}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
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
      auth: true,
    });
  }

  // File upload for agents
  async uploadDocument(agentId, file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${this.baseUrl}/agents/${agentId}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Upload failed");
    }

    return response.json();
  }
}

export const apiService = new ApiService();
