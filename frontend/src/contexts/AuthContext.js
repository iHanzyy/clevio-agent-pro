"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { apiService } from "@/lib/api";

const STORAGE_KEY = "auth_user";
const AuthContext = createContext();

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

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
    if (isNonEmptyString(candidate)) {
      return candidate;
    }
  }

  return null;
};

const resolvePlanCode = (...inputs) => {
  for (const input of inputs) {
    if (!input) continue;
    if (isNonEmptyString(input)) {
      return input.trim();
    }
    if (typeof input === "object") {
      const candidates = [
        input.plan_code,
        input.planCode,
        input.plan?.code,
        input.plan?.plan_code,
        input.subscription_plan,
        input.subscriptionPlan,
        input.plan?.slug,
      ];
      const matched = candidates.find(isNonEmptyString);
      if (matched) {
        return matched.trim();
      }
    }
  }
  return null;
};

const resolveApiKey = (...inputs) => {
  for (const input of inputs) {
    if (!input) continue;
    if (isNonEmptyString(input)) {
      return input.trim();
    }
    if (typeof input === "object") {
      const directCandidates = [
        input.api_key,
        input.apiKey,
        input.api_access_token,
        input.apiAccessToken,
        input.access_token,
        input.accessToken,
        input.token,
      ];
      const direct = directCandidates.find(isNonEmptyString);
      if (direct) {
        return direct.trim();
      }
      const fromCollections = pickApiKeyFromCollection(input);
      if (fromCollections) {
        return fromCollections.trim();
      }
    }
  }
  return null;
};

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
  const logoutRequestedRef = useRef(false);

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
      const resolvedPlanCode = resolvePlanCode(
        details,
        details?.plan,
        details?.subscription,
      );
      if (resolvedPlanCode) {
        apiService.setPlanCode(resolvedPlanCode);
      }
      const resolvedApiKey = resolveApiKey(
        details,
        details?.subscription,
        details?.api_keys,
      );
      if (resolvedApiKey) {
        apiService.setApiKey(resolvedApiKey);
      }
      persistUser((prev) => {
        const nextSubscription = {
          ...(prev?.subscription || {}),
          ...details,
          is_active:
            details?.is_active ??
            details?.isActive ??
            prev?.subscription?.is_active ??
            details?.active ??
            false,
        };
        if (resolvedPlanCode && !nextSubscription.plan_code) {
          nextSubscription.plan_code = resolvedPlanCode;
        }
        if (resolvedApiKey && !nextSubscription.api_key) {
          nextSubscription.api_key = resolvedApiKey;
        }
        const isActive =
          details?.is_active ??
          details?.isActive ??
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
      if (logoutRequestedRef.current) {
        logoutRequestedRef.current = false;
        persistUser(null);
        setLoading(false);
        return;
      }

      const hasSession = apiService.hasSessionToken();
      const hasApiKey = apiService.hasApiKey();
      const currentSessionToken =
        apiService.getAuthToken?.({ primary: "session" }) || null;

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

      const planCodeFromSources =
        resolvePlanCode(
          subscription,
          subscription?.plan,
          subscription?.subscription,
          profile,
        ) || apiService.getPlanCode?.() || null;

      if (planCodeFromSources) {
        apiService.setPlanCode(planCodeFromSources);
      }

      const subscriptionApiKey = resolveApiKey(
        subscription,
        subscription?.api_keys,
        subscription?.subscription,
        profile,
      );
      if (subscriptionApiKey && subscriptionApiKey !== currentSessionToken) {
        apiService.setApiKey(subscriptionApiKey);
      } else if (!apiService.hasApiKey()) {
        try {
          const existingKeys = await apiService.listApiKeys();
          const activeKey =
            existingKeys.find(
              (item) => item?.is_active ?? item?.isActive ?? false,
            ) || existingKeys[0];
          const resolvedKey =
            activeKey?.access_token ||
            activeKey?.api_key ||
            activeKey?.token ||
            activeKey?.accessToken ||
            activeKey?.apiKey ||
            null;
          if (resolvedKey && resolvedKey !== currentSessionToken) {
            apiService.setApiKey(resolvedKey);
          }
        } catch (apiKeyListError) {
          console.warn("Unable to load API keys during auth refresh", {
            error: apiKeyListError,
          });
        }
      }

      let inferredPlanCode = planCodeFromSources;
      const fallbackApiKey =
        subscriptionApiKey ||
        resolveApiKey(profile, subscription?.api_keys) ||
        null;

      persistUser((prev) => {
        const mergedSubscription = {
          ...(prev?.subscription || {}),
          ...(subscription || {}),
        };

        const subscriptionPlanCode =
          resolvePlanCode(
            mergedSubscription,
            mergedSubscription.plan,
            planCodeFromSources,
          ) || planCodeFromSources || mergedSubscription.plan_code || null;

        if (subscriptionPlanCode) {
          mergedSubscription.plan_code = subscriptionPlanCode;
        }

        const subscriptionApiKeyForState =
          resolveApiKey(
            mergedSubscription,
            mergedSubscription.api_keys,
            fallbackApiKey,
          ) || fallbackApiKey || mergedSubscription.api_key || null;

        if (subscriptionApiKeyForState) {
          mergedSubscription.api_key = subscriptionApiKeyForState;
        }

        mergedSubscription.is_active =
          mergedSubscription.is_active ??
          mergedSubscription.isActive ??
          subscription?.is_active ??
          subscription?.isActive ??
          profile?.is_active ??
          profile?.isActive ??
          false;

        mergedSubscription.expires_at =
          mergedSubscription.expires_at ??
          mergedSubscription.expiresAt ??
          subscription?.expires_at ??
          subscription?.expiresAt ??
          null;

        mergedSubscription.days_remaining =
          mergedSubscription.days_remaining ??
          mergedSubscription.daysRemaining ??
          subscription?.days_remaining ??
          subscription?.daysRemaining ??
          null;

        const nextIsActive =
          mergedSubscription.is_active ??
          profile?.is_active ??
          prev?.is_active ??
          false;

        inferredPlanCode =
          mergedSubscription.plan_code ??
          planCodeFromSources ??
          prev?.subscription?.plan_code ??
          inferredPlanCode ??
          null;

        return {
          email: profile.email,
          is_active: nextIsActive,
          subscription: mergedSubscription,
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
    let loginSucceeded = false;
    try {
      logoutRequestedRef.current = false;
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
          subscription?.is_active ??
          subscription?.isActive ??
          profile?.is_active ??
          profile?.isActive ??
          response?.is_active ??
          response?.isActive;

        const planCodeFromSources =
          resolvePlanCode(
            subscription,
            subscription?.plan,
            subscription?.subscription,
            response,
            response?.plan,
            response?.subscription,
            profile,
          ) || apiService.getPlanCode?.() || null;

        if (planCodeFromSources) {
          apiService.setPlanCode(planCodeFromSources);
          if (subscription && !subscription.plan_code) {
            subscription.plan_code = planCodeFromSources;
          }
        }

        const inheritedApiKey = resolveApiKey(
          subscription,
          subscription?.api_keys,
          subscription?.subscription,
          response,
          response?.api_keys,
          response?.subscription,
          profile,
        );

        if (inheritedApiKey && inheritedApiKey !== sessionToken) {
          apiService.setApiKey(inheritedApiKey);
        } else if (!apiService.hasApiKey()) {
          console.warn("No API key supplied during login; checking vault");
          try {
            const existingKeys = await apiService.listApiKeys();
            const activeKey =
              existingKeys.find(
                (item) => item?.is_active ?? item?.isActive ?? false,
              ) || existingKeys[0];
            const resolvedKey =
              activeKey?.access_token ||
              activeKey?.api_key ||
              activeKey?.token ||
              activeKey?.accessToken ||
              activeKey?.apiKey ||
              null;
            if (resolvedKey && resolvedKey !== sessionToken) {
              apiService.setApiKey(resolvedKey);
            }
          } catch (apiKeyListError) {
            console.warn("Unable to load existing API keys", apiKeyListError);
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
              planCodeFromSources ||
              subscription?.plan_code ||
              subscription?.planCode ||
              response?.plan_code ||
              response?.planCode ||
              profile?.subscription_plan ||
              profile?.subscriptionPlan ||
              null,
            expires_at:
              subscription?.expires_at ||
              subscription?.expiresAt ||
              response?.expires_at ||
              response?.expiresAt ||
              null,
            days_remaining:
              subscription?.days_remaining ||
              subscription?.daysRemaining ||
              response?.days_remaining ||
              response?.daysRemaining ||
              null,
            api_key: inheritedApiKey || null,
          },
        };
        persistUser(nextUser);

        applySubscription({
          is_active: nextUser.subscription.is_active,
          plan_code: nextUser.subscription.plan_code,
          expires_at: nextUser.subscription.expires_at,
          days_remaining: nextUser.subscription.days_remaining,
          api_key: nextUser.subscription.api_key,
        });

      if (!apiService.hasApiKey()) {
        const fallbackPlanCode =
          nextUser.subscription.plan_code ||
          subscription?.plan_code ||
          subscription?.planCode ||
          planCodeFromSources ||
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
        } else if (!apiService.hasApiKey()) {
          try {
            const existingKeys = await apiService.listApiKeys();
            const activeKey =
              existingKeys.find(
                (item) => item?.is_active ?? item?.isActive ?? false,
              ) || existingKeys[0];
            const resolvedKey =
              activeKey?.access_token ||
              activeKey?.api_key ||
              activeKey?.token ||
              activeKey?.accessToken ||
              activeKey?.apiKey ||
              null;
            if (resolvedKey) {
              apiService.setApiKey(resolvedKey);
            }
          } catch (apiKeyListError) {
            console.warn(
              "Unable to recover API key from list after login",
              apiKeyListError,
            );
          }
        }
      }

        loginSucceeded = true;
        return {
          success: true,
          is_active: isActive,
        };
      }

      return { success: false, error: "Invalid credentials" };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (!loginSucceeded) {
        apiService.clearAllTokens();
        persistUser(null);
      }
    }
  };

  const logout = () => {
    logoutRequestedRef.current = true;
    apiService.clearAllTokens();
    apiService.clearLastOrderId();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pending_credentials");
      sessionStorage.removeItem("pending_plan_code");
      sessionStorage.removeItem("pending_order_id");
      sessionStorage.removeItem("pending_registration");
      sessionStorage.removeItem("pending_order_suffix");
      sessionStorage.removeItem("payment_settlement_status");
      sessionStorage.removeItem("payment_last_email");
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
