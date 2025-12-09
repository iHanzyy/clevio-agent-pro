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
const AuthContext = createContext();
const AUTH_SESSION_STORAGE_KEY = "authSession";

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

const shouldDeferAuthCheck = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const pathname = window.location.pathname || "";
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/payment")
  );
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutRequestedRef = useRef(false);
  const trialSessionRef = useRef(false);

  const persistUser = useCallback((updater) => {
    setUser((prev) => {
      return typeof updater === "function" ? updater(prev) : updater;
    });
  }, []);

  const applySubscription = useCallback(
    (details = {}) => {
      console.log('[AuthContext] applySubscription called with:', details);

      const resolvedPlanCode = resolvePlanCode(
        details,
        details?.plan,
        details?.subscription,
      );

      console.log('[AuthContext] resolved plan code:', resolvedPlanCode);

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
        if (resolvedPlanCode) {
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

  const applyTrialState = useCallback(
    ({
      apiKey,
      planCode = "TRIAL",
      expiresAt = null,
      ipAddress = null,
      metadata = null,
    } = {}) => {
      if (!apiKey) {
        console.warn("applyTrialState called without apiKey");
        return;
      }

      apiService.setApiKey(apiKey);
      if (planCode) {
        apiService.setPlanCode(planCode);
      }

      persistUser((prev) => {
        const base = prev || {};
        const nextSubscription = {
          ...(base.subscription || {}),
          is_active: true,
          plan_code: planCode,
          api_key: apiKey,
          expires_at: expiresAt || base.subscription?.expires_at || null,
          metadata: metadata || base.subscription?.metadata || null,
        };

        return {
          ...base,
          email: base.email || null,
          is_active: true,
          is_trial: true,
          trial: {
            ...(base.trial || {}),
            ip_address: ipAddress || base.trial?.ip_address || null,
            started_at:
              base.trial?.started_at || new Date().toISOString(),
          },
          subscription: nextSubscription,
        };
      });
    },
    [persistUser],
  );

const startTrialSession = useCallback(
  (details = {}) => {
      const {
        apiKey,
        planCode = "TRIAL",
        expiresAt = null,
        ipAddress = null,
        metadata = null,
      } = details || {};

      if (!apiKey) {
        throw new Error("Trial session requires an API key");
      }

      trialSessionRef.current = true;
      applyTrialState({ apiKey, planCode, expiresAt, ipAddress, metadata });

      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            "trialSession",
            JSON.stringify({
              apiKey,
              planCode,
              expiresAt,
              ipAddress,
              metadata,
            }),
          );
          window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        } catch (error) {
          console.warn("Unable to persist trial session", error);
        }
      }

      setLoading(false);
  },
  [applyTrialState],
);

  const restoreTrialSessionFromStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const stored = window.sessionStorage.getItem("trialSession");
      if (!stored) {
        return null;
      }
      const parsed = JSON.parse(stored);
      if (!parsed?.apiKey) {
        return null;
      }
      if (!apiService.hasSessionToken()) {
        trialSessionRef.current = true;
        applyTrialState({
          apiKey: parsed.apiKey,
          planCode: parsed.planCode,
          expiresAt: parsed.expiresAt,
          ipAddress: parsed.ipAddress,
          metadata: parsed.metadata,
        });
      }
      return parsed;
    } catch (error) {
      console.warn("Unable to restore trial session from storage", error);
      return null;
    }
  }, [applyTrialState]);

  const checkAuth = useCallback(async () => {
    try {
      if (
        !trialSessionRef.current &&
        !apiService.hasSessionToken() &&
        !apiService.hasApiKey()
      ) {
        if (typeof window !== "undefined") {
          try {
            const stored = window.sessionStorage.getItem(
              AUTH_SESSION_STORAGE_KEY,
            );
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.sessionToken) {
                apiService.setSessionToken(parsed.sessionToken);
              }
              if (parsed?.apiKey) {
                apiService.setApiKey(parsed.apiKey);
              }
              if (parsed?.planCode) {
                apiService.setPlanCode(parsed.planCode);
              }
            }
          } catch (error) {
            console.warn("Failed to restore persisted auth session", error);
          }
        }
        const restored = restoreTrialSessionFromStorage();
        if (restored && apiService.hasApiKey() && !apiService.hasSessionToken()) {
          setLoading(false);
          return;
        }
      }

      if (
        trialSessionRef.current &&
        apiService.hasApiKey() &&
        !apiService.hasSessionToken()
      ) {
        setLoading(false);
        return;
      }

      if (logoutRequestedRef.current) {
        logoutRequestedRef.current = false;
        persistUser(null);
        setLoading(false);
        return;
      }

      const hasSessionToken = apiService.hasSessionToken();
      const hasApiKey = apiService.hasApiKey();
      if (shouldDeferAuthCheck() && !hasSessionToken && !hasApiKey) {
        setLoading(false);
        return;
      }

      const currentSessionToken =
        apiService.getAuthToken?.({ primary: "session" }) || null;

      const profile = await apiService.getCurrentUser().catch((err) => {
        const message = String(err?.message || "").toLowerCase();
        if (!message.includes("not authenticated")) {
          console.warn("Unable to load profile", err);
        }
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

      if (typeof window !== "undefined") {
        try {
          const authSnapshot = {
            sessionToken: apiService.getAuthToken?.({ primary: "session" }),
            apiKey: apiService.getAuthToken?.({
              primary: "apiKey",
              fallback: "session",
            }),
            planCode:
              apiService.getPlanCode?.() ||
              inferredPlanCode ||
              planCodeFromSources ||
              null,
          };
          window.sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify(authSnapshot),
          );
        } catch (error) {
          console.warn("Unable to persist auth session snapshot", error);
        }
      }

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
      const message = String(error?.message || "").toLowerCase();
      if (!message.includes("unable to refresh session")) {
        console.warn("Auth check failed", error);
      }
      apiService.clearAllTokens();
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, [persistUser, restoreTrialSessionFromStorage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.sessionToken) {
          apiService.setSessionToken(parsed.sessionToken);
        }
        if (parsed?.apiKey) {
          apiService.setApiKey(parsed.apiKey);
        }
        if (parsed?.planCode) {
          apiService.setPlanCode(parsed.planCode);
        }
      }
    } catch (error) {
      console.warn("Unable to restore persisted auth tokens", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const restored = restoreTrialSessionFromStorage();
      if (restored) {
        setLoading(false);
      }
    } catch (error) {
      console.warn("Unable to restore trial session", error);
    }
  }, [restoreTrialSessionFromStorage]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (identifier, password) => {
    let loginSucceeded = false;
    try {
      const normalizedIdentifier =
        typeof identifier === "string"
          ? identifier.trim()
          : identifier != null
            ? String(identifier)
            : "";
      if (!normalizedIdentifier) {
        return { success: false, error: "Email or phone number is required" };
      }
      logoutRequestedRef.current = false;
      const response = await apiService.login(normalizedIdentifier, password);

      const sessionToken =
        response?.access_token ??
        response?.accessToken ??
        response?.token ??
        response?.jwt ??
        response?.jwt_token ??
        response?.data?.jwt_token ??
        response?.data?.access_token ??
        response?.data?.token ??
        null;
      if (sessionToken) {
        apiService.setSessionToken(sessionToken);
      }

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

      const backendDeclaredSuccess =
        response?.success === true ||
        response?.status === "success" ||
        response?.detail === "login successful";

      if (!sessionToken && !profile && !backendDeclaredSuccess) {
        return { success: false, error: "Invalid credentials" };
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

      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
              sessionToken,
              apiKey: apiService.getAuthToken?.({
                primary: "apiKey",
                fallback: "session",
              }),
              planCode:
                nextUser.subscription.plan_code ||
                planCodeFromSources ||
                null,
            }),
          );
          window.sessionStorage.removeItem("trialSession");
          trialSessionRef.current = false;
        } catch (error) {
          console.warn("Unable to persist login session", error);
        }
      }

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
    persistUser(null);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        window.sessionStorage.removeItem("trialSession");
      } catch (error) {
        console.warn("Unable to clear stored auth session", error);
      }
    }
  };

  const updateSubscription = async () => {
    try {
      const subscription = await apiService.getSubscriptionStatus();
      console.log('[AuthContext] Raw subscription data:', subscription);

      if (subscription?.plan_code) {
        apiService.setPlanCode(subscription.plan_code);
      }

      const subscriptionData = {
        is_active: subscription?.is_active ?? false,
        plan_code: subscription?.plan_code ?? null,
        expires_at: subscription?.expires_at ?? null,
        days_remaining: subscription?.days_remaining ?? null,
      };

      console.log('[AuthContext] Applying subscription data:', subscriptionData);

      applySubscription(subscriptionData);
      return subscription;
    } catch (error) {
      console.error('[AuthContext] Error updating subscription:', error);
      return null;
    }
  };

  const updatePassword = useCallback(
    async (newPassword) => {
      const targetUserId = user?.user_id || user?.id;
      if (!targetUserId) {
        throw new Error("Unable to determine user id");
      }
      return apiService.updateUserPassword({
        userId: targetUserId,
        newPassword,
      });
    },
    [user],
  );

  const value = {
    user,
    subscription: user?.subscription,
    loading,
    login,
    logout,
    checkAuth,
    updateSubscription,
    applySubscription,
    startTrialSession,
    updatePassword,
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
