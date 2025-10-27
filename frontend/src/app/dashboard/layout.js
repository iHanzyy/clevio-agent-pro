"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { apiService } from "@/lib/api";
import AnimatedHamburgerButton from "@/components/AnimatedHamburgerButton";
import { motion, AnimatePresence } from "framer-motion";

const SIDEBAR_W = 256;

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const subscription = user?.subscription;
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        const saved = localStorage.getItem("dashSidebarOpen");
        setSidebarOpen(saved === "1");
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashSidebarOpen", sidebarOpen ? "1" : "0");
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedPreference = localStorage.getItem("darkMode");
    if (storedPreference !== null) {
      setDarkMode(storedPreference === "true");
    } else if (window.matchMedia) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", darkMode.toString());
    }
  }, [darkMode]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const formattedPlan = useMemo(() => {
    const code =
      subscription?.plan_code || apiService.getPlanCode?.() || "NO_PLAN";
    const labelMap = {
      PRO_M: "Pro Monthly",
      PRO_Y: "Pro Yearly",
      BASIC: "Basic",
      FREE: "Free",
      NO_PLAN: "No Plan",
    };

    return labelMap[code] || code;
  }, [subscription?.plan_code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Agents",
      href: "/dashboard/agents",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
      ),
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  const isActive = (path) => pathname === path;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Dark Mode Toggle - Fixed position */}
      <button
        onClick={toggleDarkMode}
        className="hidden lg:block fixed right-6 top-6 z-50 p-2.5 rounded-full bg-surface border border-surface-strong/60 hover:bg-surface-strong/40 transition-all duration-200 shadow-lg"
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {darkMode ? (
          <svg
            className="w-5 h-5 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      {/* Hamburger Desktop */}
      <div className="hidden lg:block fixed left-7 top-6 z-50">
        <AnimatedHamburgerButton
          initialOpen={sidebarOpen}
          onToggle={setSidebarOpen}
        />
      </div>

      {/* Logo Desktop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block fixed left-20 top-4 z-50"
          >
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/clevioAIAssistantsLogo.png"
                alt="Clevio AI Assistants"
                width={120}
                height={120}
                className="mb-0"
              />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger Mobile */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="lg:hidden fixed right-4 top-4 z-50"
      >
        <AnimatedHamburgerButton
          key={`mobile-hamburger-${sidebarOpen}`}
          initialOpen={sidebarOpen}
          onToggle={setSidebarOpen}
        />
      </motion.div>

      {/* Logo Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed left-4 top-4 z-50"
          >
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/clevioAIAssistantsLogo.png"
                alt="Clevio AI Assistants"
                width={100}
                height={100}
                className="mb-0"
              />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen relative">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ x: -SIDEBAR_W }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_W }}
              transition={{
                duration: 0.4,
                ease: "easeInOut",
              }}
              style={{ width: SIDEBAR_W }}
              className="fixed inset-y-0 left-0 z-40 bg-surface border-r border-surface-strong/30 shadow-xl"
            >
              <div className="flex flex-col h-full pt-20">
                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive(item.href)
                          ? "bg-accent/10 text-accent shadow-sm"
                          : "text-muted hover:bg-surface-strong/40 hover:text-foreground"
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  ))}
                </nav>

                {/* Subscription Status */}
                {subscription && (
                  <div className="px-6 py-4 border-t border-surface-strong/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted uppercase tracking-wide">
                        Plan
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          subscription.is_active
                            ? "bg-accent/15 text-accent"
                            : "bg-surface-strong/40 text-muted"
                        }`}
                      >
                        {formattedPlan}
                      </span>
                    </div>
                    {subscription.days_remaining !== null &&
                      subscription.days_remaining !== undefined && (
                        <p className="text-xs text-muted">
                          {subscription.days_remaining} days remaining
                        </p>
                      )}
                  </div>
                )}

                {/* User Menu */}
                <div className="px-6 py-4 border-t border-surface-strong/30 bg-surface-strong/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-sm font-bold text-accent-foreground">
                          {user.email?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 text-muted hover:text-accent rounded-lg hover:bg-surface-strong/40 flex-shrink-0 transition-all duration-200"
                      title="Logout"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content area */}
        <motion.div
          className="w-full h-screen overflow-y-auto"
          animate={{
            transform: sidebarOpen
              ? `translateX(${SIDEBAR_W}px)`
              : "translateX(0px)",
            width: sidebarOpen ? `calc(100% - ${SIDEBAR_W}px)` : "100%",
          }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
        >
          <div className="min-h-screen">
            <div
              className={`mx-auto ${
                sidebarOpen
                  ? "max-w-7xl px-6 sm:px-8 lg:px-12"
                  : "max-w-7xl px-8 sm:px-12 lg:px-16"
              } py-8 pt-24 transition-all duration-400`}
            >
              {children}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            >
              <motion.div
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mx-auto max-w-sm px-6 py-3 pt-20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-3 bg-surface rounded-2xl p-6 border border-surface-strong/30 shadow-2xl">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                        isActive(item.href)
                          ? "bg-accent/10 text-accent shadow-sm"
                          : "text-muted hover:bg-surface-strong/40 hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      <span className="font-semibold text-base">
                        {item.name}
                      </span>
                    </Link>
                  ))}

                  <button
                    onClick={logout}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3
                               text-foreground font-semibold
                               bg-surface-strong/40 hover:bg-surface-strong/60
                               ring-1 ring-surface-strong/30
                               transition-all duration-200"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-20 px-4 sm:px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}
