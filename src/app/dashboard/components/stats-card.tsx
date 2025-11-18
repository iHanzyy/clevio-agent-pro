import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import NumberFlow from '@number-flow/react'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className
}: StatsCardProps) {
  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.15, ease: 'easeInOut' }
      }}
      whileTap={{ scale: 0.98 }}
      className={cn("hover-lift", className)}
    >
      <Card className="relative overflow-hidden border-0 card-shadow-xl">
        <CardContent className="p-6">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-primary opacity-90" />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/90 mb-2">
                  {title}
                </p>

                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-3xl font-bold text-white">
                    <NumberFlow
                      value={value}
                      format={{
                        notation: 'compact',
                        maximumFractionDigits: 1
                      }}
                    />
                  </p>

                  {trend && (
                    <span className={cn(
                      "text-xs font-medium flex items-center gap-1",
                      trend.isPositive ? "text-green-300" : "text-red-300"
                    )}>
                      {trend.isPositive ? '↑' : '↓'}
                      {Math.abs(trend.value)}%
                    </span>
                  )}
                </div>

                {description && (
                  <p className="text-sm text-white/80">
                    {description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm">
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}