"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log("🔍 Checking auth - Token exists:", !!apiService.token);

      if (!apiService.token) {
        setLoading(false);
        return;
      }

      console.log("✅ Auth restored from session");

      // Try to get subscription status to verify token
      try {
        const subscription = await apiService.getSubscriptionStatus();
        setUser({ subscription });
      } catch (error) {
        console.warn("⚠️ Failed to fetch subscription:", error.message);
        // Token might be invalid, clear it
        apiService.clearToken();
        setUser(null);
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      apiService.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login for:", email);
      const response = await apiService.login(email, password);

      if (response.access_token) {
        apiService.setToken(response.access_token);
        setUser({
          email: response.email,
          is_active: response.is_active,
        });
        console.log("✅ Login successful");
        return { success: true };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      console.error("❌ Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    console.log("👋 Logging out");
    apiService.clearToken();
    setUser(null);
  };

  const updateSubscription = async () => {
    try {
      const subscription = await apiService.getSubscriptionStatus();
      setUser((prev) => ({ ...prev, subscription }));
      return subscription;
    } catch (error) {
      console.error("Failed to update subscription:", error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    updateSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
