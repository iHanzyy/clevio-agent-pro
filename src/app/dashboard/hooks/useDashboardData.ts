"use client"

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiService } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface Agent {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'training'
  model?: string
  conversations?: number
  lastActive?: string
  whatsappConnected?: boolean
  createdAt?: string
}

export interface DashboardStats {
  totalAgents: number
  activeAgents: number
  totalConversations: number
  connectedWhatsApp: number
}

export const useDashboardData = () => {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalConversations: 0,
    connectedWhatsApp: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const agentsData = await apiService.getAgents()

      // Transform data to match our interface with robust status detection
      const transformedAgents: Agent[] = agentsData.map(agent => {
        const isActive =
          agent?.is_active ||
          agent?.isActive ||
          (agent?.status === 'active') ||
          Boolean(agent?.active)

        return {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          status: isActive ? 'active' : 'inactive',
          model: agent.model_name,
          conversations: agent.total_messages || 0,
          lastActive: agent.last_message_at
            ? new Date(agent.last_message_at).toLocaleDateString()
            : undefined,
          whatsappConnected: Boolean(agent?.whatsapp_connected)
        }
      })

      setAgents(transformedAgents)

      // Calculate stats
      const activeCount = transformedAgents.filter(agent => agent.status === 'active').length
      const whatsappConnectedCount = transformedAgents.filter(agent => agent.whatsappConnected).length
      const totalConversations = transformedAgents.reduce((sum, agent) => sum + (agent.conversations || 0), 0)

      setStats({
        totalAgents: transformedAgents.length,
        activeAgents: activeCount,
        totalConversations: totalConversations,
        connectedWhatsApp: whatsappConnectedCount
      })

    } catch (error: any) {
      setError(error.message || "Failed to load dashboard data")

      // Redirect to login if unauthorized
      if (error.message?.includes("Invalid API key") || error.message?.includes("Unauthorized")) {
        router.push("/login")
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  return {
    agents,
    stats,
    loading,
    error,
    authLoading,
    user,
    loadDashboardData
  }
}
