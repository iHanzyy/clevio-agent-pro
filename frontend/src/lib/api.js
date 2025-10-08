const API_BASE_URL = "http://127.0.0.1:8000/api/v1";
// Or use the tunnel URL if you fixed CORS
// const API_BASE_URL = "https://5qv3wb2p-8000.asse.devtunnels.ms/api/v1";

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;

    // Load token from sessionStorage on initialization
    if (typeof window !== "undefined") {
      this.token = sessionStorage.getItem("auth_token");
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("auth_token", token);
    }
  }

  clearToken() {
    this.token = null;
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
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.auth),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || `HTTP error! status: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("API Request failed:", error);
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

  // Payment endpoints
  async getPaymentPlans() {
    return this.request("/payment/plans");
  }

  async createPayment(planCode) {
    return this.request("/payment/create", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ plan_code: planCode }),
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

  async getPaymentConfig() {
    return this.request("/payment/config");
  }

  // Agent endpoints
  async getAgents() {
    return this.request("/agents/", {
      auth: true,
    });
  }

  async createAgent(name, tools = [], config = {}) {
    return this.request("/agents/", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ name, tools, config }),
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

  async executeAgent(agentId, input, parameters = {}) {
    return this.request(`/agents/${agentId}/execute`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ input, parameters }),
    });
  }

  // WhatsApp endpoints
  async createWhatsAppSession(agentId) {
    return this.request("/whatsapp/sessions", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ agent_id: agentId }),
    });
  }

  async getWhatsAppStatus(sessionId) {
    return this.request(`/whatsapp/sessions/${sessionId}`, {
      auth: true,
    });
  }

  async stopWhatsAppSession(sessionId) {
    return this.request(`/whatsapp/sessions/${sessionId}`, {
      method: "DELETE",
      auth: true,
    });
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
