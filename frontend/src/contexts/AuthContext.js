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
      if (details?.api_key) {
        apiService.setApiKey(details.api_key);
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
    [persistUser],
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

      const resolvedPlanCode =
        subscription?.plan_code || apiService.getPlanCode?.() || null;

      if (resolvedPlanCode) {
        apiService.setPlanCode(resolvedPlanCode);
        if (subscription && !subscription.plan_code) {
          subscription.plan_code = resolvedPlanCode;
        }
      }

      if (subscription?.api_key) {
        apiService.setApiKey(subscription.api_key);
      }

      let inferredPlanCode = resolvedPlanCode;

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
                subscription?.plan_code ??
                prev?.subscription?.plan_code ??
                resolvedPlanCode ??
                null,
              api_key:
                subscription?.api_key ?? prev?.subscription?.api_key ?? null,
              expires_at:
                subscription?.expires_at ??
                prev?.subscription?.expires_at ??
                null,
              days_remaining:
                subscription?.days_remaining ??
                prev?.subscription?.days_remaining ??
                null,
            }
          : prev?.subscription || {
              is_active: profile?.is_active ?? prev?.is_active ?? false,
              plan_code:
                prev?.subscription?.plan_code ??
                resolvedPlanCode ??
                null,
              api_key: prev?.subscription?.api_key ?? null,
              expires_at: prev?.subscription?.expires_at ?? null,
              days_remaining: prev?.subscription?.days_remaining ?? null,
            };

        const nextIsActive =
          subscription?.is_active ??
          profile?.is_active ??
          prev?.is_active ??
          nextSubscription?.is_active ??
          false;

        inferredPlanCode =
          nextSubscription?.plan_code ??
          resolvedPlanCode ??
          subscription?.plan_code ??
          prev?.subscription?.plan_code ??
          inferredPlanCode ??
          null;

        return {
          email: profile.email,
          is_active: nextIsActive,
          subscription: nextSubscription,
          user_id: profile.id ?? prev?.user_id ?? null,
        };
      });

      if (!apiService.hasApiKey()) {
        const fallbackPlanCode =
          inferredPlanCode || apiService.getPlanCode?.() || null;
        if (fallbackPlanCode) {
          try {
            await apiService.generateApiKey({
              planCode: fallbackPlanCode,
              username: profile?.email ?? null,
              useSessionAuth: true,
            });
          } catch (apiKeyError) {
            console.warn(
              "Unable to auto-generate API key during auth refresh",
              apiKeyError,
            );
          }
        }
      }
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

      const sessionToken =
        response?.access_token ??
        response?.accessToken ??
        response?.token ??
        response?.jwt ??
        response?.data?.access_token ??
        response?.data?.token ??
        null;

      if (sessionToken) {
        apiService.setSessionToken(sessionToken);

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
              subscriptionError,
            );
          }
        }

        const isSubscriptionActive =
          subscription?.is_active ?? profile?.is_active ?? response?.is_active;

        const resolvedPlanCode =
          subscription?.plan_code ||
          response?.plan_code ||
          profile?.subscription_plan ||
          apiService.getPlanCode?.() ||
          null;

        if (resolvedPlanCode) {
          apiService.setPlanCode(resolvedPlanCode);
          if (subscription && !subscription.plan_code) {
            subscription.plan_code = resolvedPlanCode;
          }
        }

        const inheritedApiKey =
          subscription?.api_key ||
          response?.api_key ||
          response?.api_access_token ||
          profile?.api_key ||
          null;

        if (inheritedApiKey) {
          apiService.setApiKey(inheritedApiKey);
        } else if (!apiService.hasApiKey()) {
          console.warn(
            "No API key supplied during login; relying on existing stored key",
          );
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
              resolvedPlanCode ||
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

        if (!apiService.hasApiKey()) {
          const fallbackPlanCode =
            nextUser.subscription.plan_code ||
            subscription?.plan_code ||
            resolvedPlanCode ||
            apiService.getPlanCode?.() ||
            null;

          if (fallbackPlanCode) {
            try {
              await apiService.generateApiKey({
                planCode: fallbackPlanCode,
                username: nextUser.email,
                password,
                useSessionAuth: true,
              });
            } catch (apiKeyError) {
              console.warn(
                "Unable to auto-generate API key after login",
                apiKeyError,
              );
            }
          }
        }

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
