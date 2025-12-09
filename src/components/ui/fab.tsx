import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FabProps {
  open?: boolean
  onToggle?: () => void
  onClick?: () => void
  icon?: 'add' | 'close'
  className?: string
  children?: React.ReactNode
}

export function Fab({
  open = false,
  onToggle,
  onClick,
  icon = 'add',
  className,
  children
}: FabProps) {
  const Icon = icon === 'add' ? Plus : X

  return (
    <motion.div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3",
        className
      )}
      initial={false}
      animate={open ? "open" : "closed"}
    >
      {/* Menu Items */}
      {open && children && (
        <motion.div
          variants={{
            open: {
              opacity: 1,
              y: 0,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
              }
            },
            closed: {
              opacity: 0,
              y: 20,
              transition: {
                staggerChildren: 0.05,
                staggerDirection: -1
              }
            }
          }}
          className="flex flex-col gap-3"
        >
          {children}
        </motion.div>
      )}

      {/* Main FAB */}
      <motion.div
        variants={{
          open: { rotate: 135 },
          closed: { rotate: 0 }
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <Button
          size="fab"
          onClick={open ? onToggle : onClick}
          className="bg-gradient-primary text-white shadow-lg hover:shadow-xl border-0"
        >
          <Icon className="h-6 w-6" />
        </Button>
      </motion.div>
    </motion.div>
  )
}

interface FabItemProps {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  className?: string
}

export function FabItem({ label, icon, onClick, className }: FabItemProps) {
  return (
    <motion.div
      variants={{
        open: {
          opacity: 1,
          scale: 1,
          transition: {
            duration: 0.2,
            ease: "easeOut"
          }
        },
        closed: {
          opacity: 0,
          scale: 0.5,
          transition: {
            duration: 0.1
          }
        }
      }}
      className={cn(
        "flex items-center gap-3 bg-white dark:bg-surface px-4 py-2 rounded-full shadow-lg border border-border",
        className
      )}
    >
      <span className="text-sm font-medium whitespace-nowrap">
        {label}
      </span>
      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white">
        {icon}
      </div>
    </motion.div>
  )
}