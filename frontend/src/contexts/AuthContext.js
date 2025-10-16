"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
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

  const persistUser = useCallback((updater) => {
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
  }, []);

  const applySubscription = useCallback(
    (details = {}) => {
      if (details?.plan_code) {
        apiService.setPlanCode(details.plan_code);
      }
      persistUser((prev) => {
        const nextSubscription = {
          ...(prev?.subscription || {}),
          ...details,
          is_active:
            details?.is_active ??
            prev?.subscription?.is_active ??
            details?.active ??
            false,
        };
        const isActive =
          details?.is_active ??
          nextSubscription.is_active ??
          prev?.is_active ??
          false;

        return {
          ...(prev || {}),
          is_active: isActive,
          subscription: nextSubscription,
        };
      });
    },
    [persistUser]
  );

  const checkAuth = useCallback(async () => {
    try {
      const hasSession = apiService.hasSessionToken();
      const hasApiKey = apiService.hasApiKey();

      if (!hasSession && !hasApiKey) {
        persistUser(null);
        setLoading(false);
        return;
      }

      const profile = await apiService.getCurrentUser().catch((err) => {
        console.warn("Unable to load profile", err);
        return null;
      });
      if (!profile) {
        throw new Error("Unable to refresh session");
      }

      let subscription = null;
      try {
        subscription = await apiService.getSubscriptionStatus();
      } catch (statusError) {
        console.warn("Payment status unavailable", statusError);
      }

      if (subscription?.plan_code) {
        apiService.setPlanCode(subscription.plan_code);
      }

      if (!apiService.hasApiKey()) {
        try {
          await apiService.ensureApiKey({ planCode: subscription?.plan_code });
          if (!apiService.hasApiKey()) {
            console.warn("No API key after ensureApiKey during checkAuth");
          }
        } catch (ensureErr) {
          console.warn("Unable to ensure API key during checkAuth", ensureErr);
        }
      }

      persistUser((prev) => {
        const nextSubscription = subscription
          ? {
              ...(prev?.subscription || {}),
              is_active:
                subscription?.is_active ??
                prev?.subscription?.is_active ??
                profile?.is_active ??
                false,
              plan_code:
                subscription?.plan_code ?? prev?.subscription?.plan_code ?? null,
              expires_at:
                subscription?.expires_at ?? prev?.subscription?.expires_at ?? null,
              days_remaining:
                subscription?.days_remaining ??
                prev?.subscription?.days_remaining ??
                null,
            }
          : prev?.subscription || {
              is_active: profile?.is_active ?? prev?.is_active ?? false,
              plan_code: prev?.subscription?.plan_code ?? null,
              expires_at: prev?.subscription?.expires_at ?? null,
              days_remaining: prev?.subscription?.days_remaining ?? null,
            };

        const nextIsActive =
          subscription?.is_active ??
          profile?.is_active ??
          prev?.is_active ??
          nextSubscription?.is_active ??
          false;

        return {
          email: profile.email,
          is_active: nextIsActive,
          subscription: nextSubscription,
          user_id: profile.id ?? prev?.user_id ?? null,
        };
      });
    } catch (error) {
      console.warn("Auth check failed", error);
      apiService.clearAllTokens();
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);

      if (response?.access_token) {
        apiService.setSessionToken(response.access_token);

        let profile = null;
        try {
          profile = await apiService.getCurrentUser();
        } catch (profileError) {
          console.warn("Unable to fetch profile after login", profileError);
        }

        let subscription = response?.subscription || null;

        if (!subscription || !subscription.plan_code) {
          try {
            const refreshed = await apiService.getSubscriptionStatus();
            if (refreshed) {
              subscription = {
                ...(subscription || {}),
                ...refreshed,
              };
            }
          } catch (subscriptionError) {
            console.warn(
              "Unable to fetch subscription after login",
              subscriptionError
            );
          }
        }

        const isSubscriptionActive =
          subscription?.is_active ?? profile?.is_active ?? response?.is_active;

        if (
          isSubscriptionActive &&
          subscription &&
          subscription.plan_code
        ) {
          apiService.setPlanCode(subscription.plan_code);
          const planCode =
            subscription?.plan_code || response?.plan_code || "PRO_M";
          try {
            const apiKeyResponse = await apiService.generateApiKey(
              planCode
            );
            if (apiKeyResponse?.access_token) {
              console.log("✅ Generated API key after login", apiKeyResponse);
              apiService.setApiKey(apiKeyResponse.access_token);
              subscription = {
                ...(subscription || {}),
                plan_code: apiKeyResponse.plan_code || planCode,
                is_active: true,
                expires_at: apiKeyResponse?.expires_at || subscription?.expires_at,
                days_remaining:
                  apiKeyResponse?.days_remaining ?? subscription?.days_remaining,
              };
            } else {
              console.warn(
                "API key endpoint returned without access_token",
                apiKeyResponse
              );
            }
          } catch (apiKeyError) {
            console.warn("Unable to generate API key", apiKeyError);
          }
        } else if (isSubscriptionActive) {
          console.warn(
            "Subscription appears active but lacks plan_code; skipping API key generation."
          );
        }

        if (!apiService.hasApiKey()) {
          try {
            await apiService.ensureApiKey({ planCode: subscription?.plan_code });
            if (!apiService.hasApiKey()) {
              console.warn("No API key available after ensureApiKey");
            }
          } catch (ensureErr) {
            console.warn("Unable to ensure API key", ensureErr);
          }
        }

        const isActive = profile?.is_active ?? true;
        const nextUser = {
          email: profile?.email || email,
          user_id: profile?.id || response.user_id,
          is_active: isSubscriptionActive ?? isActive,
          subscription: {
            is_active: isSubscriptionActive ?? isActive,
            plan_code:
              subscription?.plan_code ||
              response?.plan_code ||
              profile?.subscription_plan ||
              null,
            expires_at:
              subscription?.expires_at || response?.expires_at || null,
            days_remaining:
              subscription?.days_remaining || response?.days_remaining || null,
          },
        };
        persistUser(nextUser);

        applySubscription({
          is_active: nextUser.subscription.is_active,
          plan_code: nextUser.subscription.plan_code,
          expires_at: nextUser.subscription.expires_at,
          days_remaining: nextUser.subscription.days_remaining,
        });

        return {
          success: true,
          is_active: isActive,
        };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    apiService.clearAllTokens();
    apiService.clearLastOrderId();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pending_credentials");
      sessionStorage.removeItem("pending_plan_code");
      sessionStorage.removeItem("pending_order_id");
      sessionStorage.removeItem("pending_registration");
    }
    persistUser(null);
  };

  const updateSubscription = async () => {
    try {
      const subscription = await apiService.getSubscriptionStatus();
      if (subscription?.plan_code) {
        apiService.setPlanCode(subscription.plan_code);
      }
      applySubscription({
        is_active: subscription?.is_active ?? false,
        plan_code: subscription?.plan_code ?? null,
        expires_at: subscription?.expires_at ?? null,
        days_remaining: subscription?.days_remaining ?? null,
      });
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
    applySubscription,
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
