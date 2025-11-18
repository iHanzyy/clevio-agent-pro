# CLAUDE.md - Clevio AI Staff Project Guide

## Project Overview
Clevio AI Staff is a Next.js-based AI Agent Management Platform focused on WhatsApp automation for the Indonesian market. The platform enables businesses to automate customer service and sales conversations through AI agents that work 24/7.

**Key Value Proposition**: Save up to 80% on employee costs with AI staff that handles customer chats 24/7. Setup in 5 minutes without technical expertise.

## Technology Stack

### Core Framework
- **Next.js 15** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS v4** with custom design system
- **ESLint** with Next.js configuration

### UI/UX Libraries
- **Radix UI** for accessible components
- **Framer Motion** for animations
- **Lucide React** for icons
- **Class Variance Authority** for component variants
- **Tailwind Merge** for utility class combination

### State Management & Data
- **React Context API** for authentication state
- **SessionStorage** for client-side persistence
- **Custom API Service** with dual authentication (session + API key)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (proxy for backend)
│   ├── dashboard/         # Dashboard pages
│   ├── coming-soon/       # Coming soon pages
│   ├── under-development/ # Under development pages
│   ├── login/             # Authentication pages
│   ├── register/          # Registration pages
│   ├── payment/           # Payment pages
│   └── trial/             # Trial pages
├── components/            # React components
│   ├── marketing/         # Marketing landing pages
│   ├── templates/         # Template components
│   ├── ui/               # Reusable UI components
│   └── (various feature components)
├── contexts/             # React contexts (AuthContext)
├── config/               # Configuration files
├── data/                 # Static data (agent templates, MCP tools)
├── lib/                  # Utility libraries
│   ├── api.js            # API service with WhatsApp integration
│   ├── navigation.js     # Navigation helpers for feature gating
│   ├── utils.js          # Utility functions
│   └── server/           # Server-side utilities
└── styles/               # Global styles and fonts
```

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Vercel build (if deploying to Vercel)
npm run vercel-build
```

## Key Architecture Patterns

### 1. Feature Gating System
The project implements a sophisticated feature gating system in `/src/config/features.js`:
- **Active features**: Fully functional routes
- **Coming soon**: Show placeholder pages with countdown
- **Under development**: Show maintenance pages

### 2. Navigation Helpers
Centralized navigation system in `/src/lib/navigation.js`:
```javascript
import { navigateTo } from '@/lib/navigation';
// Usage: onClick={navigateTo.comingSoon}
```

### 3. Authentication System
Dual authentication system supporting:
- **Session-based auth** (traditional user login)
- **API key auth** (for AI agent access)
- **Trial sessions** with automatic key generation
- **Persistent sessions** via sessionStorage

### 4. API Service Pattern
Comprehensive API service in `/src/lib/api.js`:
- Automatic token management
- WhatsApp integration for agent automation
- Document upload/management
- Error handling with debugging support
- Environment-aware configuration

### 5. Component Architecture
- **DashboardNav**: Status-aware navigation component
- **Template components**: Reusable UI patterns
- **Status pages**: 404, coming soon, under development with animations

## Configuration Files

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: Backend API endpoint
- `NEXT_PUBLIC_WHATSAPP_STATUS_BASE_URL`: WhatsApp service URL
- `NEXT_PUBLIC_API_DEBUG`: Debug mode toggle
- `NODE_ENV`: Environment (development/production)

### Key Settings
- **Unoptimized images** in Next.js config (likely for WhatsApp QR codes)
- **File watching optimized** for Linux development
- **Webpack polling** for better development experience

## Important Development Notes

### WhatsApp Integration
- QR code generation and management for WhatsApp Web
- Session state management for active connections
- Agent-based automation system
- Status monitoring and reconnection capabilities

### Indonesian Market Focus
- All UI text and marketing content in Indonesian
- Pricing references to UMR (Minimum Regional Wage)
- Localized payment processing integration

### API Proxy Pattern
- All backend requests routed through `/api/proxy/[...path]`
- Handles authentication, error handling, and debugging
- Supports both session and API key authentication

## Code Quality Standards

### TypeScript Configuration
- Strict null checks enabled
- ES2017 target with modern JavaScript features
- Path aliases: `@/*` → `./src/*`
- Bundler module resolution

### Linting
- Next.js core web vitals rules
- Ignores build directories
- Flat ESLint configuration

### Styling
- Tailwind CSS with custom color system
- CSS variables for theme consistency
- Dark mode support with class strategy

## Key Dependencies to Understand

### Core Dependencies
- `next: 15.5.4` - React framework
- `react: 19.1.0` - UI library
- `tailwindcss: 4` - Styling framework

### Specialized Libraries
- `@number-flow/react` - Animated number transitions
- `canvas-confetti` - Celebration effects
- `framer-motion: 12.23.24` - Complex animations
- `tw-animate-css` - Tailwind animation utilities

## Development Best Practices

1. **Use the feature gating system** for new features
2. **Follow the authentication patterns** for secure endpoints
3. **Implement proper error handling** in API calls
4. **Use the navigation helpers** for consistent UX
5. **Follow the TypeScript strict mode** settings
6. **Maintain the component structure** for consistency

## Backend Integration

The project expects a backend API with these endpoints:
- `/auth/*` - Authentication and user management
- `/agents/*` - AI agent management
- `/tools` - Available tools for agents
- `/integrations/whatsapp/*` - WhatsApp integration
- `/documents` - Document management

API service automatically handles authentication, token management, and error handling.