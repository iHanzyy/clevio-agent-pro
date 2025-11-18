import { motion } from 'framer-motion'
import {
  Bot,
  MessageSquare,
  MoreVertical,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Agent {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'training'
  conversations?: number
  lastActive?: string
  model?: string
  createdAt?: string
  whatsappConnected?: boolean
}

interface RecentAgentsProps {
  agents?: Agent[]
  loading?: boolean
  onCreateAgent?: () => void
  onAgentClick?: (agent: Agent) => void
  className?: string
}

const EmptyState = ({ onCreateAgent }: { onCreateAgent?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-12 text-center"
  >
    {/* Icon */}
    <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
      <Bot className="h-8 w-8 text-muted-foreground" />
    </div>

    {/* Text */}
    <h3 className="text-lg font-semibold text-foreground mb-2">
      No agents yet
    </h3>
    <p className="text-muted-foreground mb-6 max-w-sm">
      Create your first AI agent to start automating your customer service and sales conversations.
    </p>

    {/* CTA Button */}
    <Button
      onClick={onCreateAgent}
      size="lg"
      className="bg-gradient-primary hover-lift"
    >
      <Plus className="h-4 w-4 mr-2" />
      Create Your First Agent
    </Button>
  </motion.div>
)

const AgentCard = ({
  agent,
  onClick
}: {
  agent: Agent;
  onClick?: (agent: Agent) => void
}) => {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Active' },
    inactive: { variant: 'muted' as const, label: 'Inactive' },
    training: { variant: 'warning' as const, label: 'Training' }
  }

  const config = statusConfig[agent.status]

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="hover-lift cursor-pointer"
      onClick={() => onClick?.(agent)}
    >
      <Card className="card-shadow hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">
                  {agent.name}
                </h4>
                {agent.model && (
                  <p className="text-xs text-muted-foreground">
                    {agent.model}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
              {agent.whatsappConnected && (
                <Badge variant="success" className="text-xs">
                  WhatsApp
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle menu click
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {agent.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {agent.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {agent.conversations !== undefined && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{agent.conversations.toLocaleString()} chats</span>
              </div>
            )}
            {agent.lastActive && (
              <div>
                Last active {agent.lastActive}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="card-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export function RecentAgents({
  agents = [],
  loading = false,
  onCreateAgent,
  onAgentClick,
  className
}: RecentAgentsProps) {
  const hasAgents = agents.length > 0

  // Sort agents by creation date (most recent first) and take only the first 5
  const sortedAgents = [...agents]
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Agents</CardTitle>

          {hasAgents && (
            <Button
              onClick={onCreateAgent}
              size="sm"
              className="bg-gradient-primary hover-lift"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <LoadingState />
        ) : hasAgents ? (
          <div className="space-y-4">
            {sortedAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                {...(onAgentClick && { onClick: onAgentClick })}
              />
            ))}
          </div>
        ) : onCreateAgent ? (
          <EmptyState onCreateAgent={onCreateAgent} />
        ) : null}
      </CardContent>
    </Card>
  )
}