"use client"

import { useRouter } from 'next/navigation'
import { Agent } from './useDashboardData'

export const useDashboardActions = () => {
  const router = useRouter()

  const handleCreateAgent = () => {
    router.push('/dashboard/agents/templates')
  }

  const handleAgentClick = (agent: Agent) => {
    router.push(`/dashboard/agents/${agent.id}`)
  }

  const handleNavigateTo = (path: string) => {
    router.push(path)
  }

  return {
    handleCreateAgent,
    handleAgentClick,
    handleNavigateTo
  }
}
