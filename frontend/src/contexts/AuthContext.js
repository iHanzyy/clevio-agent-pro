"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const savedUser = sessionStorage.getItem("user");

      console.log("🔍 Checking auth - Token exists:", !!token);
      console.log("🔍 Checking auth - User exists:", !!savedUser);

      if (token && savedUser) {
        // CRITICAL: Set token in apiService FIRST
        apiService.setToken(token);

        const userData = JSON.parse(savedUser);
        setUser(userData);

        console.log("✅ Auth restored from session");

        // Fetch subscription status (optional, don't fail if it errors)
        try {
          const subStatus = await apiService.getSubscriptionStatus();
          setSubscription(subStatus);
          console.log("✅ Subscription loaded");
        } catch (error) {
          console.warn("⚠️ Failed to fetch subscription:", error.message);
          // Don't logout on subscription fetch failure
        }
      } else {
        console.log("ℹ️ No saved auth found");
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      // Only logout on critical errors
      if (
        error.message?.includes("Invalid API key") ||
        error.message?.includes("Unauthorized")
      ) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login...");

      const response = await apiService.login(email, password);

      console.log("✅ Login response received:", {
        hasToken: !!response.access_token,
        userId: response.user_id,
        email: response.email,
      });

      if (!response.access_token) {
        throw new Error("No access token received from server");
      }

      const token = response.access_token;
      const userData = {
        email: response.email || email,
        id: response.user_id || response.id,
      };

      // CRITICAL: Set token in apiService IMMEDIATELY
      apiService.setToken(token);

      // Save to sessionStorage
      sessionStorage.setItem("auth_token", token);
      sessionStorage.setItem("user", JSON.stringify(userData));

      console.log("💾 Token and user saved to sessionStorage");
      console.log("🔑 ApiService token set:", !!apiService.token);

      setUser(userData);

      // Fetch subscription status after login (optional)
      try {
        const subStatus = await apiService.getSubscriptionStatus();
        setSubscription(subStatus);
        console.log("✅ Subscription status loaded");
      } catch (error) {
        console.warn("⚠️ Failed to fetch subscription:", error.message);
        // Don't fail login if subscription fetch fails
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Login failed:", error);
      return {
        success: false,
        error: error.message || "Login failed. Please try again.",
      };
    }
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    apiService.clearToken();
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("user");
    setUser(null);
    setSubscription(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
