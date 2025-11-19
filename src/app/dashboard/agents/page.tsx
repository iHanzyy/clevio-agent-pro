"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Bot,
  Plus,
  MessageSquare,
  RefreshCw,
  Trash2,
  Search,
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  MessageCircle
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  description?: string
  is_active: boolean
  model_name?: string
  total_messages?: number
  last_message_at?: string
  whatsapp_status?: string
  created_at?: string
  whatsapp_connected?: boolean
  whatsapp_qr?: string
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-muted rounded-lg" />
              <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded" />
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
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
      <Bot className="h-10 w-10 text-white" />
    </div>

    <h3 className="text-2xl font-semibold text-foreground mb-3">
      No Agents Yet
    </h3>

    <p className="text-muted-foreground text-lg max-w-md mb-8">
      Create your first AI agent to start automating customer service and sales conversations.
    </p>

    <Button
      onClick={onCreateAgent}
      size="lg"
      variant="default"
      className="px-8"
    >
      <Plus className="h-5 w-5 mr-2" />
      Create Your First Agent
    </Button>
  </motion.div>
)

const AgentCard = ({
  agent,
  onView,
  onRefreshStatus,
  onConnectWhatsApp
}: {
  agent: Agent
  onView: (agent: Agent) => void
  onRefreshStatus: (agent: Agent) => void
  onConnectWhatsApp: (agent: Agent) => void
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const statusConfig = {
    active: { variant: 'success' as const, label: 'Active', color: 'text-green-600' },
    inactive: { variant: 'muted' as const, label: 'Inactive', color: 'text-gray-500' },
    training: { variant: 'warning' as const, label: 'Training', color: 'text-yellow-600' }
  }

  const whatsappStatusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      label: 'Connected'
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      label: 'Disconnected'
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      label: 'Connecting'
    }
  }

  const config = statusConfig[agent.is_active ? 'active' : 'inactive']
  const whatsappConfig = agent.whatsapp_connected
    ? whatsappStatusConfig.connected
    : whatsappStatusConfig.disconnected

  const handleRefreshStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRefreshing(true)
    try {
      await onRefreshStatus(agent)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleConnectWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsConnecting(true)
    try {
      await onConnectWhatsApp(agent)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="hover-lift cursor-pointer group w-full"
      onClick={() => onView(agent)}
    >
      <Card className="card-shadow hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 h-full">
        {/* Card Header with Gradient */}
        <div className="h-1 sm:h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>

        <CardContent className="p-3 sm:p-4 md:p-6">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 md:w-14 sm:h-12 md:h-14 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Bot className="h-5 w-5 sm:h-6 md:h-7 w-5 sm:w-6 md:w-7 text-white" />
                </div>
                {/* Status Indicator */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white",
                  agent.is_active ? "bg-green-500" : "bg-gray-400"
                )}></div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base md:text-lg text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                  {agent.name}
                </h4>
                {agent.model_name && (
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
                    {agent.model_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0 ml-2">
              <Badge
                variant={config.variant}
                className={cn(
                  "text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1",
                  config.color
                )}
              >
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {agent.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-6 line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-6">
            <div className="bg-muted/30 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                <span className="text-[10px] sm:text-xs font-medium">Messages</span>
              </div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                {agent.total_messages || 0}
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Bot className="h-3 w-3" />
                <span className="text-[10px] sm:text-xs font-medium">Status</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold capitalize truncate">
                {agent.whatsapp_status || 'Unknown'}
              </p>
            </div>
          </div>

          {/* WhatsApp Status Section */}
          <div className={cn(
            "rounded-lg border p-2 sm:p-3 mb-3 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0",
            whatsappConfig.bgColor
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <whatsappConfig.icon className={cn("h-4 w-4 flex-shrink-0", whatsappConfig.color, agent.whatsapp_connected !== true && isConnecting && "animate-spin")} />
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold", whatsappConfig.color)}>
                  WhatsApp {whatsappConfig.label}
                </p>
                {agent.last_message_at && (
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(agent.last_message_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 sm:h-7 px-1 sm:px-2 text-xs flex-1 sm:flex-none"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                <span className="ml-1 hidden sm:inline">Refresh</span>
              </Button>

              {!agent.whatsapp_connected && (
                <Button
                  variant="default"
                  size="sm"
                  style={{ backgroundColor: '#25D366' }}
                  className="h-6 sm:h-7 px-1 sm:px-2 text-xs text-white hover:opacity-90 flex-1 sm:flex-none transition-opacity"
                  onClick={handleConnectWhatsApp}
                  disabled={isConnecting}
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="ml-1 hidden sm:inline">Connect WhatsApp</span>
                  <span className="ml-1 sm:hidden">Connect</span>
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors text-xs sm:text-sm"
              onClick={(e) => {
                e.stopPropagation()
                onView(agent)
              }}
            >
              View Details
            </Button>
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

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const agentsData = await apiService.getAgents()
      setAgents(agentsData)

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
    try {
      const statusData = await apiService.getWhatsAppConnectionStatus(agent.id)

      // Update agent with WhatsApp status
      setAgents(prevAgents =>
        prevAgents.map(a =>
          a.id === agent.id
            ? {
                ...a,
                whatsapp_connected: statusData?.connected || false,
                whatsapp_status: statusData?.status || 'unknown'
              }
            : a
        )
      )
    } catch (error: any) {
      console.error('Failed to refresh WhatsApp status:', error)
      // Show error message to user
      setError('Failed to refresh WhatsApp status: ' + (error.message || 'Unknown error'))
    }
  }

  const handleConnectWhatsApp = async (agent: Agent) => {
    try {
      // First, create WhatsApp session
      const sessionData = await apiService.createWhatsAppSession({
        userId: user?.id || '',
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
      console.error('Failed to connect WhatsApp:', error)
      setError('Failed to connect WhatsApp: ' + (error.message || 'Unknown error'))
    }
  }

  // Filter agents based on search
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="container-spacing space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            All Agents
          </h1>
          <p className="text-muted-foreground">
            Manage all your AI assistants and their configurations.
          </p>
        </div>

        <Button
          onClick={handleCreateAgent}
          size="lg"
          variant="default"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Agent
        </Button>
      </motion.div>

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
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onView={handleViewAgent}
                onRefreshStatus={handleRefreshWhatsAppStatus}
                onConnectWhatsApp={handleConnectWhatsApp}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* QR Code Modal */}
      {qrModal.isOpen && qrModal.agent && qrModal.qrCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-10 w-10 text-white" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">
                Connect WhatsApp
              </h3>

              <p className="text-muted-foreground mb-6">
                Scan this QR code with WhatsApp to connect &quot;{qrModal.agent.name}&quot;
              </p>

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

                <Button
                  variant="outline"
                  onClick={() => setQrModal({ isOpen: false, agent: null, qrCode: null })}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
