"use client"

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  Settings,
  X,
  Package,
  Zap,
  LogOut,
  Menu
} from 'lucide-react'
import { FEATURES } from '@/config/features'
import { navigateTo } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NavItem {
  key: string
  label: string
  icon: any
  path?: string
  badge?: string
  isMainAction?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'DASHBOARD',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    key: 'AGENTS',
    label: 'Agents',
    icon: Bot,
    path: '/dashboard/agents'
  },
  {
    key: 'SETTINGS',
    label: 'Settings',
    icon: Settings,
    path: '/dashboard/settings'
  },
  {
    key: 'ADD_ONS',
    label: 'Add-ons',
    icon: Package,
    path: '/coming-soon'
  }
]

// Sign Out Component
const SignOutButton = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { logout } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
        "text-muted-foreground hover:text-destructive"
      )}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.15 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={handleSignOut}
    >
      <div className="flex items-center justify-center w-5 h-5 text-muted-foreground">
        <LogOut className="h-5 w-5" />
      </div>

      <span className={cn(
        "font-medium",
        isMobile ? "text-sm" : "text-sm"
      )}>
        Sign Out
      </span>
    </motion.div>
  )
}

const STATUS_CONFIG = {
  active: {
    label: 'Live',
    bgColor: 'bg-success/10',
    textColor: 'text-success',
    borderColor: 'border-success/20',
    iconColor: 'text-success'
  },
  'coming-soon': {
    label: 'Coming Soon',
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
    iconColor: 'text-warning'
  },
  'under-development': {
    label: 'In Development',
    bgColor: 'bg-muted/10',
    textColor: 'text-muted-foreground',
    borderColor: 'border-muted/20',
    iconColor: 'text-muted-foreground'
  }
}

interface NavItemProps {
  item: NavItem
  isActive?: boolean
  isMobile?: boolean
  onClick?: () => void
}

const NavItemComponent = ({ item, isActive, isMobile = false, onClick }: NavItemProps) => {
  const feature = FEATURES[item.key]
  const status = feature?.status || 'active'
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
  const Icon = item.icon

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }

    if (item.path) {
      // If the feature exists and is active, navigate
      if (feature?.status === 'active') {
        window.location.href = item.path
      }
      // If feature doesn't exist, navigate anyway (for items not in FEATURES config)
      else if (!feature) {
        window.location.href = item.path
      }
      // Handle coming soon and under development
      else if (feature) {
        if (feature.status === 'coming-soon') {
          navigateTo.comingSoon()
        } else if (feature.status === 'under-development') {
          navigateTo.underDevelopment()
        }
      }
    }
  }

  const content = (
    <motion.div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
        isActive
          ? "text-white shadow-md"
          : "text-muted-foreground"
      )}
      style={{
        background: isActive
          ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
          : 'transparent'
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.15 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <div className={cn(
        "flex items-center justify-center w-5 h-5",
        isActive ? "text-white" : statusConfig.iconColor
      )}>
        <Icon className="h-5 w-5" />
      </div>

      <span className={cn(
        "font-medium",
        isMobile ? "text-sm" : "text-sm"
      )}>
        {item.label}
      </span>

      {item.badge && (
        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0.5">
          {item.badge}
        </Badge>
      )}

      {feature && feature.status !== 'active' && (
        <Badge
          variant="outline"
          className={cn(
            "ml-auto text-xs px-2 py-0.5 border-current/20",
            statusConfig.bgColor,
            statusConfig.textColor,
            statusConfig.borderColor
          )}
        >
          {statusConfig.label}
        </Badge>
      )}
    </motion.div>
  )

  return content
}

interface DesktopNavProps {
  className?: string
}

export const DesktopNav = ({ className }: DesktopNavProps) => {
  const pathname = usePathname()

  return (
    <nav className={cn("hidden lg:block", className)}>
      <div className="bg-card border border-border rounded-xl card-shadow p-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = Boolean(item.path && (
              pathname === item.path ||
              (item.path !== '/dashboard' && pathname?.startsWith(item.path))
            ))
            return (
              <NavItemComponent
                key={item.key}
                item={item}
                isActive={isActive}
              />
            )
          })}

          {/* Divider */}
          <div className="my-2 border-t border-border"></div>

          {/* Sign Out Button */}
          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}


export const MobileNav = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Mobile Navigation Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 lg:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 p-4">
                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = Boolean(item.path && (
                      pathname === item.path ||
                      (item.path !== '/dashboard' && pathname?.startsWith(item.path))
                    ))
                    return (
                      <NavItemComponent
                        key={item.key}
                        item={item}
                        isActive={isActive}
                        isMobile
                      />
                    )
                  })}

                  {/* Divider */}
                  <div className="my-2 border-t border-border"></div>

                  {/* Sign Out Button */}
                  <SignOutButton isMobile />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>Powered by Clevio AI</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface BottomNavProps {
  className?: string
}

export const BottomNav = ({ className }: BottomNavProps) => {
  const pathname = usePathname()

  // Only show main navigation items in bottom nav
  const bottomNavItems = NAV_ITEMS.filter(item =>
    ['DASHBOARD', 'AGENTS', 'SETTINGS', 'ADD_ONS'].includes(item.key)
  )

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 lg:hidden",
      className
    )}>
      <div className="flex items-center justify-around py-2">
        {bottomNavItems.map((item) => {
          const isActive = Boolean(item.path && (
            pathname === item.path ||
            (item.path !== '/dashboard' && pathname?.startsWith(item.path))
          ))
          const Icon = item.icon

          return (
            <motion.button
              key={item.key}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (item.path) {
                  window.location.href = item.path
                }
              }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">
                {item.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

interface MobileMenuButtonProps {
  onClick: () => void
  className?: string
}

export const MobileMenuButton = ({ onClick, className }: MobileMenuButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("lg:hidden", className)}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

// Main Navigation component that handles both desktop and mobile
export default function DashboardNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      <DesktopNav />
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <BottomNav />
    </>
  )
}