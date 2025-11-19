"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Bot,
  Plus,
  RefreshCw,
  Trash2,
  Search,
  Smartphone,
  Wifi,
  WifiOff,
  Loader2,
  MessageCircle,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  description?: string
  is_active: boolean
  model_name?: string
  last_message_at?: string
  whatsapp_status?: string
  created_at?: string
  whatsapp_connected?: boolean
  whatsapp_qr?: string
  config?: {
    system_message?: string
    system_prompt?: string
  }
  allowed_tools?: string[]
}


const AgentsPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div>
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
      <div className="h-10 w-32 bg-muted rounded" />
    </div>

    {/* Search Skeleton */}
    <div className="flex-1 h-10 bg-muted rounded" />

    {/* Agents Grid Skeleton */}
    <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 lg:grid-cols-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="card-shadow overflow-hidden bg-gradient-to-br from-white to-gray-50">
          {/* Card Header Skeleton */}
          <div className="h-1 sm:h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 sm:h-5 w-3/4 bg-muted rounded mb-1" />
                  <div className="h-3 sm:h-4 w-1/2 bg-muted rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-muted rounded-full flex-shrink-0 ml-2" />
            </div>

            {/* Description Skeleton */}
            <div className="space-y-1 mb-3 sm:mb-6">
              <div className="h-3 sm:h-4 w-full bg-muted rounded" />
              <div className="h-3 sm:h-4 w-2/3 bg-muted rounded" />
            </div>

            {/* Capabilities Skeleton */}
            <div className="mb-3 sm:mb-6">
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="flex flex-wrap gap-2">
                <div className="h-5 w-16 bg-muted rounded-full" />
                <div className="h-5 w-20 bg-muted rounded-full" />
                <div className="h-5 w-18 bg-muted rounded-full" />
              </div>
            </div>

            {/* WhatsApp Status Skeleton */}
            <div className="bg-muted/30 rounded-lg border p-3 sm:p-4 mb-3 sm:mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-4 h-4 bg-muted rounded-full flex-shrink-0" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 bg-muted rounded" />
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            </div>

            {/* Action Button Skeleton */}
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

const EmptyState = ({ onCreateAgent }: { onCreateAgent: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-dashed border-surface-strong/60 p-6 sm:p-10 text-center bg-surface"
  >
    <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6">
      <Bot className="h-8 w-8 text-white" />
    </div>

    <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
      You haven&apos;t created any agents yet
    </h3>

    <p className="text-muted-foreground text-base max-w-md mx-auto mb-8">
      Build your first agent to automate workflows across Gmail, WhatsApp, and more.
    </p>

    <Button
      onClick={onCreateAgent}
      size="lg"
      variant="default"
      className="px-8 bg-gradient-primary hover-lift"
    >
      <Plus className="h-5 w-5 mr-2" />
      Create your first agent
    </Button>
  </motion.div>
)

const AgentCard = ({
  agent,
  onView,
  onRefreshStatus,
  onConnectWhatsApp,
  refreshLoading,
  sessionError
}: {
  agent: Agent
  onView: (agent: Agent) => void
  onRefreshStatus: (agent: Agent) => void
  onConnectWhatsApp: (agent: Agent) => void
  refreshLoading?: boolean
  sessionError?: string
}) => {
  const statusConfig = {
    active: { label: 'Active', color: 'text-green-600' },
    inactive: { label: 'Inactive', color: 'text-gray-500' },
    training: { label: 'Training', color: 'text-yellow-600' }
  }

  const whatsappStatusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      label: 'Connected',
      helper: 'WhatsApp is connected and ready'
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      label: 'Disconnected',
      helper: 'Connect WhatsApp to enable messaging'
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      label: 'Connecting',
      helper: 'Please wait while we establish connection'
    }
  }

  const config = statusConfig[agent.is_active ? 'active' : 'inactive']
  const whatsappConfig = agent.whatsapp_connected
    ? whatsappStatusConfig.connected
    : whatsappStatusConfig.disconnected

  const capabilityList = Array.isArray(agent?.allowed_tools)
    ? [...agent.allowed_tools]
    : []
  if (!capabilityList.includes("WhatsApp")) {
    capabilityList.push("WhatsApp")
  }

  const handleRefreshStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onRefreshStatus(agent)
  }

  const handleConnectWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onConnectWhatsApp(agent)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="hover-lift cursor-pointer group w-full h-full"
      onClick={() => onView(agent)}
    >
      <Card className="card-shadow hover:shadow-2xl transition-all duration-300 overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 h-full rounded-2xl sm:rounded-3xl">
        {/* Card Header with Gradient */}
        <div className="h-1 sm:h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>

        <CardContent className="p-4 sm:p-6 flex flex-col h-full">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                {/* Status Indicator */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white",
                  agent.is_active ? "bg-green-500" : "bg-gray-400"
                )}></div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg sm:text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                  {agent.name}
                </h4>
                {agent.model_name && (
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    {agent.model_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 sm:text-right">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold",
                  config.label === 'Active' && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200",
                  config.label === 'Inactive' && "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200",
                  config.label === 'Training' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
                )}
              >
                <span className="inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-current opacity-70"></span>
                {config.label}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 sm:mb-6 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">
              {agent.config?.system_message || agent.config?.system_prompt || "No system prompt provided yet."}
            </p>
          </div>

          {/* Capabilities */}
          <div className="mb-4 sm:mb-6 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[13px] text-muted">
              <span className="font-medium text-muted">Capabilities</span>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {capabilityList.slice(0, 3).map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full border border-surface-strong bg-background px-2 sm:px-3 py-0.5 sm:py-1 font-medium text-muted"
                  >
                    {capability}
                  </span>
                ))}
                {capabilityList.length > 3 && (
                  <span className="rounded-full border border-surface-strong bg-background px-2 sm:px-3 py-0.5 sm:py-1 font-medium text-muted">
                    +{capabilityList.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp Status Section */}
          <div className={cn(
            "rounded-lg border p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 flex-shrink-0",
            whatsappConfig.bgColor
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <whatsappConfig.icon className={cn("h-4 w-4 flex-shrink-0", whatsappConfig.color, refreshLoading && "animate-spin")} />
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold", whatsappConfig.color)}>
                  WhatsApp {whatsappConfig.label}
                </p>
                {agent.last_message_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(agent.last_message_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-semibold rounded-full border border-surface-storng hover:border-accent hover:text-foreground transition-colors"
                onClick={handleRefreshStatus}
                disabled={refreshLoading}
              >
                <RefreshCw className={cn("h-3 w-3", refreshLoading && "animate-spin")} />
                <span className="ml-1 hidden sm:inline">{refreshLoading ? "Refreshing..." : "Refresh"}</span>
              </Button>

              {!agent.whatsapp_connected && (
                <Button
                  variant="default"
                  size="sm"
                  style={{ backgroundColor: '#25D366' }}
                  className="h-7 sm:h-8 px-3 sm:px-4 text-xs font-semibold text-white hover:bg-[#128c7e] rounded-full transition-colors shadow-sm"
                  onClick={handleConnectWhatsApp}
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="ml-1 hidden sm:inline">Connect</span>
                  <span className="ml-1 sm:hidden">Connect</span>
                </Button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {sessionError && (
            <div className="mb-4 sm:mb-6 flex-shrink-0">
              <p className="rounded-md bg-rose-500/10 px-3 py-2 text-[10px] sm:text-xs font-medium text-rose-600">
                {sessionError}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-auto">
            <Link href={`/dashboard/agents/${agent.id}`}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
                  onClick={(e: any) => e.stopPropagation()}>
              View details
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] text-muted">
                {whatsappConfig.helper}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function AgentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; agent: Agent | null; qrCode: string | null }>({
    isOpen: false,
    agent: null,
    qrCode: null
  })
  const [whatsAppRefreshMap, setWhatsAppRefreshMap] = useState({})
  const [whatsAppErrors, setWhatsAppErrors] = useState({})

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const agentsData = await apiService.getAgents()
      setAgents(agentsData || [])

    } catch (error: any) {
      setError(error.message || "Failed to load agents")

      // Redirect to login if unauthorized
      if (error.message?.includes("Invalid API key") || error.message?.includes("Unauthorized")) {
        router.push("/login")
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // Authentication check
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (!user.subscription?.is_active) {
      router.push("/payment")
      return
    }

    loadAgents()
  }, [authLoading, user, router, loadAgents])

  const handleCreateAgent = () => {
    router.push('/dashboard/agents/templates')
  }

  const handleViewAgent = (agent: Agent) => {
    router.push(`/dashboard/agents/${agent.id}`)
  }

  const handleRefreshWhatsAppStatus = async (agent: Agent) => {
    const agentId = agent.id

    setWhatsAppErrors((prev) => {
      const next = { ...prev }
      delete next[agentId]
      return next
    })

    setWhatsAppRefreshMap((prev) => ({ ...prev, [agentId]: true }))

    try {
      const statusData = await apiService.getWhatsAppConnectionStatus(agentId)

      // Update agent with WhatsApp status
      setAgents(prevAgents =>
        prevAgents.map(a =>
          a.id === agentId
            ? {
                ...a,
                whatsapp_connected: statusData?.connected || false,
                whatsapp_status: statusData?.status || 'unknown'
              }
            : a
        )
      )
    } catch (error: any) {
      setWhatsAppErrors((prev) => ({
        ...prev,
        [agentId]: error?.message || "Unable to refresh WhatsApp status. Please try again."
      }))
    } finally {
      setWhatsAppRefreshMap((prev) => {
        const next = { ...prev }
        delete next[agentId]
        return next
      })
    }
  }

  const handleConnectWhatsApp = async (agent: Agent) => {
    try {
      // First, create WhatsApp session
      const sessionData = await apiService.createWhatsAppSession({
        userId: user?.user_id || '',
        agentId: agent.id,
        agentName: agent.name,
        apiKey: user?.api_keys?.[0]?.access_token || ''
      })

      // Then fetch QR code
      if (sessionData?.session_created) {
        const qrData = await apiService.fetchWhatsAppQr(agent.id)

        if (qrData?.qr?.base64) {
          // Show QR modal
          setQrModal({
            isOpen: true,
            agent: agent,
            qrCode: qrData.qr.base64
          })

          // Update agent status
          setAgents(prevAgents =>
            prevAgents.map(a =>
              a.id === agent.id
                ? {
                    ...a,
                    whatsapp_connected: false,
                    whatsapp_status: 'connecting'
                  }
                : a
            )
          )

          // Start polling for status updates
          const pollInterval = setInterval(async () => {
            try {
              const statusData = await apiService.getWhatsAppConnectionStatus(agent.id)
              if (statusData?.connected) {
                clearInterval(pollInterval)
                setQrModal({ isOpen: false, agent: null, qrCode: null })

                // Update agent status to connected
                setAgents(prevAgents =>
                  prevAgents.map(a =>
                    a.id === agent.id
                      ? {
                          ...a,
                          whatsapp_connected: true,
                          whatsapp_status: 'connected'
                        }
                      : a
                  )
                )
              }
            } catch (error) {
              console.error('Error polling WhatsApp status:', error)
            }
          }, 3000)

          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval)
            if (qrModal.isOpen) {
              setQrModal({ isOpen: false, agent: null, qrCode: null })
            }
          }, 300000)
        }
      }
    } catch (error: any) {
      setWhatsAppErrors((prev) => ({
        ...prev,
        [agent.id]: 'Failed to connect WhatsApp: ' + (error.message || 'Unknown error')
      }))
    }
  }

  // Filter agents based on search
  const normalizedAgents = agents.map((agent) => {
    const normalizedActive =
      agent?.is_active ??
      (agent as any)?.isActive ??
      ((agent as any)?.status === 'active') ??
      Boolean((agent as any)?.active)

    return {
      ...agent,
      is_active: Boolean(normalizedActive),
    }
  })

  const filteredAgents = normalizedAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.config?.system_message?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading || loading) {
    return (
      <div className="container-spacing">
        <AgentsPageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-spacing">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error Loading Agents
            </h3>
            <p className="text-muted-foreground mb-4">
              {error}
            </p>
            <Button onClick={loadAgents} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Your Agents
          </h1>
          <p className="text-muted-foreground">
            Manage, edit, and monitor the assistants you&apos;ve created.
          </p>
        </div>

        <Button
          onClick={handleCreateAgent}
          size="lg"
          variant="default"
          className="bg-gradient-primary hover-lift w-full sm:w-auto"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Agent
        </Button>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {agents.length === 0 ? (
          <EmptyState onCreateAgent={handleCreateAgent} />
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No agents found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms
            </p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 lg:grid-cols-2 auto-rows-max">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onView={handleViewAgent}
                onRefreshStatus={handleRefreshWhatsAppStatus}
                onConnectWhatsApp={handleConnectWhatsApp}
                refreshLoading={Boolean(whatsAppRefreshMap[agent.id])}
                sessionError={whatsAppErrors[agent.id]}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* QR Code Modal */}
      {qrModal.isOpen && qrModal.agent && qrModal.qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-sm rounded-2xl border border-surface-strong/60 bg-surface p-6 text-center shadow-xl"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setQrModal({ isOpen: false, agent: null, qrCode: null })}
              className="absolute right-3 top-3 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted hover:bg-surface-storng/60"
            >
              Close
            </button>

            {/* Modal Header */}
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
              Connect WhatsApp
            </h3>
            {qrModal.agent?.name && (
              <p className="text-xs text-muted mb-4">
                Agent: {qrModal.agent.name}
              </p>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-border">
                <Image
                  src={`data:image/png;base64,${qrModal.qrCode}`}
                  alt="WhatsApp QR Code"
                  width={256}
                  height={256}
                  className="w-64 h-64"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for connection...</span>
              </div>

              <p className="text-xs text-muted-foreground px-2">
                QR codes expire after about 60 seconds. Refresh if the scan times out.
              </p>

              <Button
                variant="outline"
                onClick={() => setQrModal({ isOpen: false, agent: null, qrCode: null })}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
