"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = sessionStorage.getItem("auth_token");
      if (token) {
        apiService.setToken(token);
        // Get subscription status to validate token and get user info
        const status = await apiService.getSubscriptionStatus();
        setSubscription(status);
        setUser({ token }); // Minimal user object

        // If subscription is expired, logout
        if (!status.is_active) {
          logout();
          return;
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await apiService.login(email, password);
    apiService.setToken(response.access_token);
    setUser({
      id: response.user_id,
      email: response.email,
      token: response.access_token,
    });
    setSubscription({
      is_active: response.is_active,
      expires_at: response.expires_at,
      plan_code: response.plan_code,
    });
    return response;
  };

  const register = async (email, password) => {
    return await apiService.register(email, password);
  };

  const logout = () => {
    apiService.clearToken();
    setUser(null);
    setSubscription(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const updateSubscription = async () => {
    try {
      const status = await apiService.getSubscriptionStatus();
      setSubscription(status);
      return status;
    } catch (error) {
      console.error("Failed to update subscription:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        login,
        register,
        logout,
        updateSubscription,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
