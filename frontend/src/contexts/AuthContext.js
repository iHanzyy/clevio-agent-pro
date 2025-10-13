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
      if (!apiService.token) {
        persistUser(null);
        setLoading(false);
        return;
      }

      const [profile, subscription] = await Promise.all([
        apiService.getCurrentUser().catch(() => null),
        apiService.getSubscriptionStatus().catch(() => null),
      ]);

      if (!profile || !subscription) {
        throw new Error("Unable to refresh session");
      }

      persistUser((prev) => ({
        email: profile.email,
        is_active: subscription.is_active,
        subscription: {
          is_active: subscription.is_active,
          plan_code: subscription.plan_code ?? null,
          expires_at: subscription.expires_at ?? null,
          days_remaining: subscription.days_remaining ?? null,
        },
        user_id: profile.id ?? prev?.user_id ?? null,
      }));
    } catch (error) {
      apiService.clearToken();
      persistUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);

      if (response.access_token) {
        apiService.setToken(response.access_token);
        const isActive = Boolean(response.is_active);
        const nextUser = {
          email: response.email,
          user_id: response.user_id,
          is_active: isActive,
          subscription: {
            is_active: isActive,
            plan_code: response.plan_code || null,
            expires_at: response.expires_at || null,
            days_remaining: response.days_remaining ?? null,
          },
        };
        persistUser(nextUser);
        return { success: true, redirect: isActive ? undefined : "payment" };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    apiService.clearToken();
    persistUser(null);
  };

  const updateSubscription = async () => {
    try {
      const subscription = await apiService.getSubscriptionStatus();
      persistUser((prev) => ({
        ...(prev || {}),
        is_active: subscription?.is_active ?? false,
        subscription: {
          is_active: subscription?.is_active ?? false,
          plan_code: subscription?.plan_code ?? null,
          expires_at: subscription?.expires_at ?? null,
          days_remaining: subscription?.days_remaining ?? null,
        },
      }));
      return subscription;
    } catch (error) {
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
