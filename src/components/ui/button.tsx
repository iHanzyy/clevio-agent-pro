import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-white shadow-md hover:shadow-lg",
        destructive:
          "text-white shadow-sm hover:shadow-md",
        outline:
          "border bg-background shadow-sm hover:shadow-md",
        secondary:
          "shadow-sm hover:shadow-md",
        ghost:
          "transition-smooth",
        link:
          "transition-smooth underline-offset-4 hover:underline",
        success:
          "text-white shadow-sm hover:shadow-md",
        warning:
          "text-white shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
        fab: "h-14 w-14 rounded-full shadow-lg hover:shadow-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Get variant styles
    const getVariantStyles = () => {
      switch (variant) {
        case 'default':
          return {
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: 'var(--primary-foreground)',
            border: 'none',
          }
        case 'destructive':
          return {
            background: 'var(--destructive)',
            color: 'var(--destructive-foreground)',
            border: 'none',
          }
        case 'outline':
          return {
            background: 'var(--background)',
            color: 'var(--foreground)',
            borderColor: 'var(--border)',
            borderWidth: '1px',
            borderStyle: 'solid',
          }
        case 'secondary':
          return {
            background: 'var(--surface)',
            color: 'var(--foreground)',
            border: 'none',
          }
        case 'ghost':
          return {
            background: 'transparent',
            color: 'var(--muted-foreground)',
            border: 'none',
          }
        case 'link':
          return {
            background: 'transparent',
            color: 'var(--primary)',
            border: 'none',
            textDecoration: 'none',
          }
        case 'success':
          return {
            background: 'var(--success)',
            color: 'var(--success-foreground)',
            border: 'none',
          }
        case 'warning':
          return {
            background: 'var(--warning)',
            color: 'var(--warning-foreground)',
            border: 'none',
          }
        default:
          return {
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: 'var(--primary-foreground)',
            border: 'none',
          }
      }
    }

    // Get hover styles
    const getHoverStyles = () => {
      const baseStyles = {
        transform: 'translateY(-1px)',
        transition: 'transform 150ms ease-in-out',
      }

      switch (variant) {
        case 'ghost':
          return {
            ...baseStyles,
            backgroundColor: 'var(--surface)',
          }
        case 'link':
          return {
            ...baseStyles,
            textDecoration: 'underline',
          }
        default:
          return baseStyles
      }
    }

    const combinedStyles = {
      ...getVariantStyles(),
      ...style,
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          "hover-lift"
        )}
        style={combinedStyles}
        ref={ref}
        onMouseEnter={(e) => {
          const hoverStyles = getHoverStyles()
          Object.assign(e.currentTarget.style, hoverStyles)
        }}
        onMouseLeave={(e) => {
          Object.keys(getHoverStyles()).forEach(key => {
            e.currentTarget.style[key] = ''
          })
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = 'none'
          e.currentTarget.style.boxShadow = `0 0 0 2px var(--primary)`
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = ''
        }}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }