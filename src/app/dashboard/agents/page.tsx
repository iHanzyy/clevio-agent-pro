"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
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
  ArrowRight,
  QrCode,
  X,
  Mail,
  Calendar,
  Globe,
  FileText,
  Calculator,
  Search as SearchIcon
} from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"
import { resolveSessionQrImage } from "@/lib/whatsappQr"
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
    google_tools?: string[]
  }
  allowed_tools?: string[]
  google_tools?: string[]
  mcp_tools?: string[]
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
        <Card key={i} className="card-shadow overflow-hidden bg-gradient-to-br from-background to-muted/50 dark:from-gray-900 dark:to-gray-800/50">
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
    className="rounded-xl border border-dashed border-border p-6 sm:p-10 text-center bg-card dark:bg-gray-800/50"
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
  onDisconnectWhatsApp,
  onDeleteWhatsApp,
  refreshLoading,
  deleteLoading,
  sessionError,
  initialLoading
}: {
  agent: Agent
  onView: (agent: Agent) => void
  onRefreshStatus: (agent: Agent) => void
  onConnectWhatsApp: (agent: Agent) => void
  onDisconnectWhatsApp: (agent: Agent) => void
  onDeleteWhatsApp: (agent: Agent) => void
  refreshLoading?: boolean
  deleteLoading?: boolean
  sessionError?: string
  initialLoading?: boolean
}) => {
  // Debug logging for WhatsApp status
  console.log(`Agent ${agent.id} WhatsApp status:`, {
    whatsapp_connected: agent.whatsapp_connected,
    whatsapp_status: agent.whatsapp_status,
    last_message_at: agent.last_message_at
  })
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

  // Dynamic WhatsApp status configuration based on agent's current status
  const getWhatsAppConfig = () => {
    const status = agent.whatsapp_status?.toLowerCase()

    if (status === 'connected' || agent.whatsapp_connected) {
      return whatsappStatusConfig.connected
    } else if (status === 'connecting') {
      return whatsappStatusConfig.connecting
    } else {
      return whatsappStatusConfig.disconnected
    }
  }

  const whatsappConfig = getWhatsAppConfig()

  const getCapabilityIcon = (capability) => {
    const iconMap = {
      'gmail': Mail,
      'gmail_get_message': Mail,
      'gmail_create_draft': Mail,
      'gmail_send_message': Mail,
      'gmail_read_messages': Mail,
      'gmail_list_messages': Mail,
      'google_calendar': Calendar,
      'google_calendar_create_event': Calendar,
      'google_calendar_list_events': Calendar,
      'google_calendar_get_event': Calendar,
      'google_sheets': FileText,
      'google_sheets_get_values': FileText,
      'google_sheets_update_values': FileText,
      'google_sheets_create_spreadsheet': FileText,
      'google_sheets_list_spreadsheets': FileText,
      'google_docs': FileText,
      'google_docs_list_documents': FileText,
      'google_docs_get_document': FileText,
      'google_docs_create_document': FileText,
      'google_docs_append_text': FileText,
      'google_docs_delete_document': FileText,
      'web_search': SearchIcon,
      'docx_generate': FileText,
      'deep_research': SearchIcon,
      'calculator_sse': Calculator,
      'WhatsApp': MessageCircle,
      'whatsapp': MessageCircle,
    };

    // Check for Gmail tools
    if (capability.toLowerCase().includes('gmail') || capability.toLowerCase().includes('google_') && capability.toLowerCase().includes('mail')) {
      return Mail;
    }

    // Check for Calendar tools
    if (capability.toLowerCase().includes('calendar') || capability.toLowerCase().includes('google_') && capability.toLowerCase().includes('cal')) {
      return Calendar;
    }

    // Check for web/search tools
    if (capability.toLowerCase().includes('search') || capability.toLowerCase().includes('web')) {
      return SearchIcon;
    }

    // Check for document tools
    if (capability.toLowerCase().includes('doc') || capability.toLowerCase().includes('generate') || capability.toLowerCase().includes('file')) {
      return FileText;
    }

    // Check for calculator
    if (capability.toLowerCase().includes('calc') || capability.toLowerCase().includes('number')) {
      return Calculator;
    }

    // Default to globe for unknown tools
    return Globe;
  };

  // Create unique capabilities with icons
  const uniqueCapabilities: Array<{ id: string; icon: any; name: string }> = [];

  const googleTools = agent?.google_tools || [];

  // Add Gmail if any Gmail tool is enabled
  if (
    googleTools.some(tool => tool.toLowerCase().includes('gmail')) ||
    agent?.allowed_tools?.some(tool => tool.toLowerCase().includes('gmail'))
  ) {
    uniqueCapabilities.push({ id: 'gmail', icon: Mail, name: 'Gmail' });
  }

  // Add Calendar if any Calendar tool is enabled
  if (
    googleTools.some(tool => tool.toLowerCase().includes('calendar')) ||
    agent?.allowed_tools?.some(tool => tool.toLowerCase().includes('calendar'))
  ) {
    uniqueCapabilities.push({ id: 'calendar', icon: Calendar, name: 'Calendar' });
  }

  // Add WhatsApp (always present)
  uniqueCapabilities.push({ id: 'whatsapp', icon: MessageCircle, name: 'WhatsApp' });

  // Add other MCP tools
  const capabilitySources = [
    ...(googleTools || []),
    ...(agent?.allowed_tools || []),
    ...(agent?.mcp_tools || []),
  ];

  capabilitySources.forEach(tool => {
    const toolLower = tool.toLowerCase();
    if (!toolLower.includes('gmail') && !toolLower.includes('calendar') && !toolLower.includes('whatsapp')) {
      const icon = getCapabilityIcon(tool);
      uniqueCapabilities.push({ id: tool, icon, name: tool });
    }
  });

  const capabilityList = uniqueCapabilities;

  const handleRefreshStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onRefreshStatus(agent)
  }

  const handleConnectWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onConnectWhatsApp(agent)
  }

  const handleDisconnectWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onDisconnectWhatsApp(agent)
  }

  const handleDeleteWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onDeleteWhatsApp(agent)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="hover-lift cursor-pointer group w-full h-full"
      onClick={() => onView(agent)}
    >
      <Card className="card-shadow hover:shadow-2xl transition-all duration-300 overflow-hidden border-0 bg-gradient-to-br from-background to-muted/50 h-full rounded-2xl sm:rounded-3xl dark:from-gray-900 dark:to-gray-800/50">
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
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {capabilityList.slice(0, 5).map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <div
                      key={capability.id}
                      className="w-8 h-8 rounded-lg border border-surface-strong/60 bg-surface flex items-center justify-center group-hover:border-accent transition-colors"
                      title={capability.name}
                    >
                      <Icon className="h-4 w-4 text-muted" />
                    </div>
                  );
                })}
                {capabilityList.length > 5 && (
                  <div className="w-8 h-8 rounded-lg border border-surface-strong/60 bg-surface flex items-center justify-center">
                    <span className="text-xs font-medium text-muted">
                      +{capabilityList.length - 5}
                    </span>
                  </div>
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

              {!agent.whatsapp_connected ? (
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
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 px-3 sm:px-4 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-full transition-colors shadow-sm"
                  onClick={handleDisconnectWhatsApp}
                >
                  <WifiOff className="h-3 w-3" />
                  <span className="ml-1 hidden sm:inline">Disconnect</span>
                  <span className="ml-1 sm:hidden">Disconnect</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-semibold rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteWhatsApp}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                <span className="ml-1 hidden sm:inline">Delete</span>
              </Button>
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
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [whatsAppRefreshMap, setWhatsAppRefreshMap] = useState({})
  const [whatsAppDeleteMap, setWhatsAppDeleteMap] = useState({})
  const [whatsAppErrors, setWhatsAppErrors] = useState({})
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; agent: Agent | null; qrCode: string | null }>({
    isOpen: false,
    agent: null,
    qrCode: null
  })
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const closeQrModal = useCallback(() => {
    setQrModal({ isOpen: false, agent: null, qrCode: null })
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
  }, [])

  const getApiKeyForWhatsApp = useCallback(async () => {
    let apiKey = typeof apiService.getCurrentApiKey === "function"
      ? apiService.getCurrentApiKey()
      : null

    if (!apiKey) {
      try {
        await apiService.ensureApiKey()
        apiKey = typeof apiService.getCurrentApiKey === "function"
          ? apiService.getCurrentApiKey()
          : null
      } catch (err) {
        console.warn("Unable to resolve API key for WhatsApp", err)
      }
    }

    if (!apiKey) {
      throw new Error("API key unavailable. Please refresh session or generate an API key.")
    }

    return apiKey
  }, [])

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const agentsData = await apiService.getAgents()
      console.log('Raw agents data:', agentsData)

      // Fetch WhatsApp status for each agent to get the most up-to-date status
      const agentsWithStatus: Agent[] = []

      // Process agents in batches to avoid overwhelming the API
      const batchSize = 3
      for (let i = 0; i < (agentsData || []).length; i += batchSize) {
        const batch = (agentsData || []).slice(i, i + batchSize)

        const batchResults = await Promise.allSettled(
          batch.map(async (agent: Agent) => {
            try {
              // Add small delay to prevent overwhelming the API
              await new Promise(resolve => setTimeout(resolve, 100))

              const statusData = await apiService.getWhatsAppConnectionStatus(agent.id)
              console.log(`WhatsApp status for agent ${agent.id}:`, statusData)

              return {
                ...agent,
                whatsapp_connected: statusData?.connected || statusData?.isActive || agent.whatsapp_connected || false,
                whatsapp_status: statusData?.status || agent.whatsapp_status || 'unknown',
                last_message_at: statusData?.lastConnectedAt || agent.last_message_at
              }
            } catch (error) {
              console.warn(`Failed to fetch WhatsApp status for agent ${agent.id}:`, error)
              // Keep original status if fetch fails
              return {
                ...agent,
                whatsapp_connected: agent.whatsapp_connected || false,
                whatsapp_status: agent.whatsapp_status || 'unknown'
              }
            }
          })
        )

        // Add successful results to our agents list
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            agentsWithStatus.push(result.value)
          }
        })
      }

      console.log('Agents with updated WhatsApp status:', agentsWithStatus)
      setAgents(agentsWithStatus)

    } catch (error: any) {
      setError(error.message || "Failed to load agents")

      // Redirect to login if unauthorized
      if (error.message?.includes("Invalid API key") || error.message?.includes("Unauthorized")) {
        router.push("/login")
      }
    } finally {
      setLoading(false)
      setLoadingStatus(false)
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

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

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
      await apiService.ensureApiKey()
      const statusData = await apiService.getWhatsAppConnectionStatus(agentId)

      console.log('Status data from API:', statusData)

      // Update agent with WhatsApp status - using the correct field names from the new API response
      setAgents(prevAgents =>
        prevAgents.map(a =>
          a.id === agentId
            ? {
                ...a,
                whatsapp_connected: statusData?.connected || statusData?.isActive || false,
                whatsapp_status: statusData?.status || 'unknown',
                last_message_at: statusData?.lastConnectedAt || a.last_message_at
              }
            : a
        )
      )
    } catch (error: any) {
      console.error('Error refreshing WhatsApp status:', error)
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
      await apiService.ensureApiKey()
      const apiKey = await getApiKeyForWhatsApp()

      // First, create WhatsApp session (ignore "session_created" gating; always try fetch QR)
      const sessionData = await apiService.createWhatsAppSession({
        userId: user?.user_id || '',
        agentId: agent.id,
        agentName: agent.name,
        apiKey
      })

      // Then fetch QR code
      const qrData = await apiService.fetchWhatsAppQr(agent.id)
      const qrImage =
        resolveSessionQrImage(qrData) ||
        resolveSessionQrImage(sessionData) ||
        qrData?.qr?.base64 ||
        qrData?.qr?.image ||
        null

      if (!qrImage) {
        throw new Error('QR code unavailable right now. Please retry in a moment.')
      }

      // Show QR modal
      setQrModal({
        isOpen: true,
        agent: agent,
        qrCode: qrImage
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
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusData = await apiService.getWhatsAppConnectionStatus(agent.id)
          console.log('Polling status data:', statusData)

          // Check for connected status using multiple possible fields
          const isConnected = statusData?.connected ||
                            statusData?.isActive ||
                            statusData?.status === 'connected'

          if (isConnected) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
            setQrModal({ isOpen: false, agent: null, qrCode: null })

            // Update agent status to connected
            setAgents(prevAgents =>
              prevAgents.map(a =>
                a.id === agent.id
                  ? {
                      ...a,
                      whatsapp_connected: true,
                      whatsapp_status: 'connected',
                      last_message_at: statusData?.lastConnectedAt || a.last_message_at
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
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        setQrModal(current => current.isOpen ? { isOpen: false, agent: null, qrCode: null } : current)
      }, 300000)
    } catch (error: any) {
      setWhatsAppErrors((prev) => ({
        ...prev,
        [agent.id]: 'Failed to connect WhatsApp: ' + (error.message || 'Unknown error')
      }))
    }
  }

  const handleDisconnectWhatsApp = async (agent: Agent) => {
    try {
      // Clear any existing error
      setWhatsAppErrors((prev) => {
        const next = { ...prev }
        delete next[agent.id]
        return next
      })

      // Set loading state
      setWhatsAppRefreshMap((prev) => ({ ...prev, [agent.id]: true }))

      await apiService.ensureApiKey()
      console.log(`Disconnecting WhatsApp for agent: ${agent.id}`)

      // Call disconnect API
      await apiService.disconnectWhatsApp(agent.id)

      // Update agent status to disconnected
      setAgents(prevAgents =>
        prevAgents.map(a =>
          a.id === agent.id
            ? {
                ...a,
                whatsapp_connected: false,
                whatsapp_status: 'disconnected'
              }
            : a
        )
      )

      console.log(`Successfully disconnected WhatsApp for agent: ${agent.id}`)

      // Optional: Refresh status after a short delay to ensure backend is updated
      setTimeout(async () => {
        try {
          await handleRefreshWhatsAppStatus(agent)
        } catch (error) {
          console.log('Status refresh after disconnect failed, but disconnect was successful')
        }
      }, 1000)

    } catch (error: any) {
      console.error('Error disconnecting WhatsApp:', error)
      setWhatsAppErrors((prev) => ({
        ...prev,
        [agent.id]: error?.message || "Unable to disconnect WhatsApp. Please try again."
      }))
    } finally {
      setWhatsAppRefreshMap((prev) => {
        const next = { ...prev }
        delete next[agent.id]
        return next
      })
    }
  }

  const handleDeleteWhatsAppSession = async (agent: Agent) => {
    const agentId = agent.id

    const confirmed = typeof window !== "undefined"
      ? window.confirm("Delete WhatsApp session for this agent?")
      : true
    if (!confirmed) {
      return
    }

    // Clear error for this agent
    setWhatsAppErrors((prev) => {
      const next = { ...prev }
      delete next[agentId]
      return next
    })

    setWhatsAppDeleteMap((prev) => ({ ...prev, [agentId]: true }))

    try {
      await apiService.ensureApiKey()
      await apiService.deleteWhatsAppSession(agentId)

      // Update local state to reflect deletion
      setAgents((prevAgents) =>
        prevAgents.map((a) =>
          a.id === agentId
            ? {
                ...a,
                whatsapp_connected: false,
                whatsapp_status: 'disconnected'
              }
            : a
        )
      )

      // Close QR modal if it belongs to the deleted agent
      if (qrModal.isOpen && qrModal.agent?.id === agentId) {
        closeQrModal()
      }
    } catch (error: any) {
      console.error('Error deleting WhatsApp session:', error)
      setWhatsAppErrors((prev) => ({
        ...prev,
        [agentId]: error?.message || "Unable to delete WhatsApp session. Please try again."
      }))
    } finally {
      setWhatsAppDeleteMap((prev) => {
        const next = { ...prev }
        delete next[agentId]
        return next
      })
    }
  }

  // Filter agents based on search
  const normalizedAgents = agents.map((agent) => {
    const normalizedActive =
      agent?.is_active ||
      (agent as any)?.isActive ||
      ((agent as any)?.status === 'active') ||
      Boolean((agent as any)?.active || false)

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
                onDisconnectWhatsApp={handleDisconnectWhatsApp}
                refreshLoading={Boolean(whatsAppRefreshMap[agent.id])}
                onDeleteWhatsApp={handleDeleteWhatsAppSession}
                deleteLoading={Boolean(whatsAppDeleteMap[agent.id])}
                sessionError={whatsAppErrors[agent.id]}
                initialLoading={loadingStatus}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* QR Code Modal */}
      {qrModal.isOpen && qrModal.agent && qrModal.qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-2xl bg-card dark:bg-gray-800 border border-border dark:border-gray-700 shadow-xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <Button
              onClick={closeQrModal}
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-foreground">
                Connect WhatsApp
              </h3>

              <div className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Open WhatsApp &gt; Linked Devices and scan this QR code to connect the agent.
                  </p>

                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-xl border-2 border-border shadow-lg">
                      <Image
                        src={qrModal.qrCode.startsWith('data:') ? qrModal.qrCode : `data:image/png;base64,${qrModal.qrCode}`}
                        alt="WhatsApp QR Code"
                        width={256}
                        height={256}
                        unoptimized
                        className="h-auto w-64"
                      />
                    </div>
                  </div>

                  
                  <div className="text-left space-y-2 bg-card rounded-lg p-4 dark:bg-gray-800/50">
                    <h4 className="font-semibold text-foreground text-sm">How to connect:</h4>
                    <ol className="space-y-1 text-sm text-muted-foreground">
                      <li>1. Open WhatsApp on your phone</li>
                      <li>2. Go to <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong></li>
                      <li>3. Scan this QR code to connect</li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    
                    <Button
                      onClick={() => qrModal.agent && handleRefreshWhatsAppStatus(qrModal.agent)}
                      disabled={Boolean(qrModal.agent && whatsAppRefreshMap[qrModal.agent.id])}
                      variant="outline"
                      className="flex-1"
                    >
                      {qrModal.agent && whatsAppRefreshMap[qrModal.agent.id] ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh Status
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={closeQrModal}
                      variant="outline"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
