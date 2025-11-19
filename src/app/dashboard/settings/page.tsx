"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  User,
  Shield,
  LogOut,
  Eye,
  EyeOff
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"


interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

const SettingsSection = ({ title, description, children }: SettingsSectionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  </motion.div>
)

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  })

  // Authentication check
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    setFormData(prev => ({
      ...prev,
      name: user?.name || "",
      email: user?.email || ""
    }))
  }, [authLoading, user, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert("Passwords don't match")
      return
    }

    if (!formData.newPassword) {
      alert("Please enter a new password")
      return
    }

    setLoading(true)
    try {
      const { apiService } = await import("@/lib/api")
      await apiService.updateUserPassword({ userId: user?.id, newPassword: formData.newPassword })

      // Clear password fields
      setFormData({
        newPassword: "",
        confirmPassword: ""
      })
      alert("Password updated successfully")
    } catch (error) {
      console.error("Failed to change password:", error)
      alert("Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (authLoading) {
    return (
      <div className="container-spacing">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  
  return (
    <div className="container-spacing space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <SettingsSection
          title="Profile Information"
          description="View your account information."
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Status
                </label>
                <div className="flex items-center h-10">
                  <Badge variant={user?.is_active ? "default" : "secondary"}>
                    {user?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          title="Security"
          description="Manage your password and security settings."
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={loading || !formData.newPassword || !formData.confirmPassword}
              variant="default"
            >
              <Shield className="h-4 w-4 mr-2" />
              Update Password
            </Button>
          </div>
        </SettingsSection>

  
  
        {/* Account Management */}
        <SettingsSection
          title="Account Management"
          description="Manage your account access and sessions."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-destructive" />
                <div>
                  <h4 className="font-medium text-foreground">Sign Out</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your account on this device
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}