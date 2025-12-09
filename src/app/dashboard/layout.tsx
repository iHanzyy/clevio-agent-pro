"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import {
  Sun,
  Moon,
  User
} from "lucide-react"

import { DesktopNav, BottomNav } from "./components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DashboardLogo = ({ width = 120, height = 120, priority = false }) => (
  <>
    <Image
      src="/clevioAISTAFF-Logo-Black.png"
      alt="Clevio AI Staff"
      width={width}
      height={height}
      priority={priority}
      className="dark:hidden"
    />
    <Image
      src="/clevioAISTAFF-Logo-White.png"
      alt="Clevio AI Staff"
      width={width}
      height={height}
      priority={priority}
      className="hidden dark:inline-block"
    />
  </>
)

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const { updateSubscription } = useAuth()
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(false)
  const hasRefreshedSubscription = useRef(false)

  // Refresh subscription info if needed
  useEffect(() => {
    if (!user) {
      hasRefreshedSubscription.current = false
      return
    }

    if (hasRefreshedSubscription.current) return
    hasRefreshedSubscription.current = true

    console.log('[Dashboard] Current user subscription:', user.subscription)
    const timer = setTimeout(() => {
      updateSubscription()
    }, 1500)

    return () => clearTimeout(timer)
  }, [user, updateSubscription])

  // Authentication check
  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (!user?.subscription?.is_active) {
      router.push("/payment")
      return
    }
  }, [loading, user, router])

  // Dark mode toggle
  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark"
    setDarkMode(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem("theme", newMode ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newMode)
  }

  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopNav className="hidden md:block fixed left-4 top-4 w-64 max-h-[calc(100vh-2rem)] overflow-y-auto z-30" />

      {/* Mobile Navigation */}
      <BottomNav className="md:hidden" />

      {/* Main Content */}
      <div className="md:pl-72 pb-20 md:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container-spacing h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DashboardLogo width={70} height={70} />
            </div>

            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="h-9 w-9"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-3">
                <Badge
                  variant={user?.subscription?.is_active ? "default" : "secondary"}
                  className="text-xs font-medium px-2 py-1"
                >
                  {(() => {
                    const planCode = user?.subscription?.plan_code;
                    if (!planCode || !user?.subscription?.is_active) {
                      return "NO PLAN";
                    }

                    // Handle different plan codes
                    if (planCode === "TRIAL") {
                      return "TRIAL";
                    }

                    const cleanPlan = planCode.replace("_", " ").replace("PRO ", "").trim();
                    let displayName: string;

                    if (cleanPlan === "M") {
                      displayName = "MONTHLY";
                    } else if (cleanPlan === "Y") {
                      displayName = "YEARLY";
                    } else {
                      displayName = cleanPlan.toUpperCase();
                    }

                    return (
                      <>
                        <span className="text-foreground">{displayName}</span>
                        {planCode.includes("Y") && planCode !== "TRIAL" && (
                          <span className="ml-1 text-xs opacity-75">Y</span>
                        )}
                      </>
                    );
                  })()}
                </Badge>

                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
