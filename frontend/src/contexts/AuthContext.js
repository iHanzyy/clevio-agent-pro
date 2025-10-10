"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "@/lib/api";

const STORAGE_KEY = "auth_user";
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (_err) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const persistUser = (updater) => {
    setUser((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        if (next) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log("🔍 Checking auth - Token exists:", !!apiService.token);

      if (!apiService.token) {
        persistUser(null);
        setLoading(false);
        return;
      }

      console.log("✅ Auth restored from session");

      // Try to get subscription status to verify token
      try {
        const subscription = await apiService.getSubscriptionStatus();
        persistUser((prev) => ({
          ...(prev || {}),
          is_active: subscription?.is_active ?? prev?.is_active,
          subscription,
        }));
      } catch (error) {
        console.warn("⚠️ Failed to fetch subscription:", error.message);
        // Token might be invalid, clear it
        apiService.clearToken();
        persistUser(null);
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      apiService.clearToken();
      persistUser(null);
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
        const nextUser = {
          email: response.email,
          is_active: response.is_active,
          subscription: {
            is_active: response.is_active,
            plan_code: response.plan_code || null,
            expires_at: response.expires_at || null,
            days_remaining: response.days_remaining ?? null,
          },
        };
        persistUser(nextUser);
        console.log("✅ Login successful");
        return { success: true };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      if (error.message?.includes("Account not activated")) {
        try {
          const paymentResponse = await apiService.loginForPayment(
            email,
            password
          );

          if (paymentResponse.access_token) {
            apiService.setToken(paymentResponse.access_token);
            const nextUser = {
              email: paymentResponse.email,
              is_active: paymentResponse.is_active,
              subscription: {
                is_active: paymentResponse.is_active,
                plan_code: paymentResponse.plan_code || null,
                expires_at: paymentResponse.expires_at || null,
                days_remaining: paymentResponse.days_remaining ?? null,
              },
            };
            persistUser(nextUser);
            console.log("✅ Login for payment successful");
            return { success: true, redirect: "payment" };
          }
        } catch (paymentError) {
          console.error("❌ Login for payment error:", paymentError);
          return {
            success: false,
            error:
              paymentError.message ||
              "Account inactive. Please complete payment to continue.",
          };
        }
      }

      console.error("❌ Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    console.log("👋 Logging out");
    apiService.clearToken();
    persistUser(null);
  };

  const updateSubscription = async () => {
    try {
      const subscription = await apiService.getSubscriptionStatus();
      persistUser((prev) => ({
        ...(prev || {}),
        is_active: subscription?.is_active ?? prev?.is_active,
        subscription,
      }));
      return subscription;
    } catch (error) {
      console.error("Failed to update subscription:", error);
      return null;
    }
  };

  const value = {
    user,
    subscription: user?.subscription,
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
