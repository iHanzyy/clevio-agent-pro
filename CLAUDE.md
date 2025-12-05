# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### 1. Dual Authentication Architecture
The system uses a sophisticated dual-auth pattern in `/src/contexts/AuthContext.js`:
- **Session-based auth** (traditional user login) generates both session tokens and API keys
- **API key auth** (primary for agent operations) with automatic token resolution
- **Trial sessions** with automatic API key generation based on user's plan
- **Persistent sessions** via sessionStorage with automatic restoration

### 2. Proxy-Based API Architecture
All backend requests route through `/api/proxy/[...path]` (`src/lib/api.js`):
- **Automatic token management** with intelligent fallback between API key and session token
- **WhatsApp integration** with QR code generation, session management, and connection monitoring
- **Environment-aware configuration** with debug mode toggling
- **Centralized error handling** and authentication logic

### 3. Feature Gating System
Centralized feature control in `/src/config/features.js`:
- **Three feature states**: `active`, `coming-soon`, `under-development`
- **Runtime query functions**: `isFeatureActive()`, `getComingSoonFeatures()`
- **Dynamic UI rendering** based on feature status

### 4. Navigation Architecture
Status-aware routing in `/src/lib/navigation.js`:
- **Dual navigation support**: Both window.location.href and Next.js router
- **Consistent UX** through centralized navigation helpers
- **Automatic redirection** to appropriate pages based on feature status

### 5. Agent Creation Flow (wajib ikuti)
- CTA "Create agent" **selalu** diarahkan ke galeri template (`/dashboard/agents/templates`), lanjut wawancara chat, lalu prefilled `AgentForm`, baru POST create agent. Tombol "Customize Agent" memulai wawancara dengan template khusus `custom-agent` (bukan lompat ke form).
- Jangan hubungkan CTA langsung ke form kosong; `/dashboard/agents/new` menolak akses jika tidak membawa hasil wawancara dan mengarahkan user kembali ke galeri template.
- Payload wawancara disimpan di `sessionStorage.pendingAgentData` dan harus dipakai untuk prefill form; jaga kontrak ini saat ubah UI template/chat.
- **UI/UX parity rule:** Template gallery, interview chat, dan AgentForm pada jalur trial (`/trial/*`) wajib identik dengan jalur berbayar (PRO_M/PRO_Y). Jika kamu mengubah desain, copy, atau struktur komponen pada salah satunya, segera samakan di jalur satunya agar context wawancara → form tidak pecah. Perbedaan hanya boleh pada logika (plan code, locking, provisioning), bukan tampilan/experience.
- Setelah agent berbayar dibuat dan dialihkan ke `/dashboard/agents/{id}`, bila konfigurasi mengandung `google_tools`, wajib munculkan modal "Connect Google" secara otomatis. Modal sama juga harus muncul saat user menekan tombol "Continue with Google" di kartu konektor. CTA "Connect" membuka OAuth, sementara "Lanjut tanpa Google" butuh klik kedua setelah peringatan bahwa Gmail/Calendar tidak akan berfungsi sampai koneksi selesai.

### 6. Create Agent Payload Rules
- `google_tools` harus dipisah dari `mcp_tools`; hanya isi aksi Gmail/Google yang dipilih.
- `mcp_servers` default: `{ calculator_sse: { transport: "sse", url: "http://0.0.0.0:8190/sse" } }` (override hanya via `NEXT_PUBLIC_MCP_SERVER_URL`).
- `mcp_tools` hanya berisi MCP pilihan (contoh: `web_search`), jangan inject Google tools ke sini; field `tools` opsional—untuk MCP-only kirim kosong/tidak dikirim.

### 7. WhatsApp QR Modal Konsistensi
- Gunakan gaya & UX yang sama antara `/dashboard/agents` dan `/dashboard/agents/{id}`: gradient header, card border, countdown expiry, tombol refresh status/new QR, dan tombol close di pojok.
- QR modal harus muncul segera setelah `createWhatsAppSession` + `fetchWhatsAppQr`, tidak menunggu flag khusus.

### 8. Google Integration Architecture (Per-Agent OAuth)
Google Workspace integration in `/src/lib/api.js` and `/src/app/dashboard/agents/[agentId]/page.js`:
- **Per-agent authentication**: Each agent requires separate OAuth via `/auth/google` with `agent_id` in payload
- **Manual-only status checking**: No auto-refresh; polling starts only after user clicks "Connect" or "Refresh Status"
- **Page visibility awareness**: Polling automatically stops when user navigates away (uses `document.visibilitychange` API)
- **Modal-driven flow**: Auto-show "Connect Google" modal when agent created with `google_tools`
- **SessionStorage cleanup**: Automatically clears `pendingGoogleConnectAgent` and `GOOGLE_CONNECT_PROMPT_KEY` after successful connection
- **API contracts**: `POST /auth/google` and `POST /auth/refresh-status-google` both require `agent_id`
- **User experience**: User must explicitly trigger actions; no background polling when page is not visible

### 9. WhatsApp Integration Architecture
Complex WhatsApp Web integration in `/src/lib/api.js`:
- **QR code flow**: Generation, expiration handling, and session validation
- **Session status monitoring**: Real-time connection status with automatic reconnection
- **Multi-agent support**: Individual WhatsApp sessions per AI agent
- **Data normalization**: Consistent UI rendering across various backend formats

## Configuration Files

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: Backend API endpoint
- `NEXT_PUBLIC_WHATSAPP_STATUS_BASE_URL`: WhatsApp service URL
- `NEXT_PUBLIC_API_DEBUG`: Debug mode toggle
- `NODE_ENV`: Environment (development/production)

### Development Best Practices

### Authentication Patterns
- Use the dual authentication system: session tokens for user management, API keys for agent operations
- Handle trial sessions with automatic API key generation
- Implement proper token fallback logic in API calls

### Feature Development
- Use the feature gating system for new features (`src/config/features.js`)
- Implement status-aware navigation using helpers from `src/lib/navigation.js`
- Follow the three feature states: `active`, `coming-soon`, `under-development`

### API Integration
- All backend requests should go through the proxy pattern in `/src/lib/api.js`
- Use automatic token resolution with intelligent fallback
- Implement proper WhatsApp session management for agent automation
- Handle environment-specific debugging with `NEXT_PUBLIC_API_DEBUG`

### Component Architecture
- Use `DashboardNav` as a reference for feature-aware component patterns
- Implement consistent error handling and user feedback
- Maintain the Indonesian market focus in all UI text and content

## Key Development Files

- **`src/lib/api.js`**: Core API service with dual authentication and WhatsApp integration
- **`src/contexts/AuthContext.js`**: Authentication state management with trial session support
- **`src/config/features.js`**: Feature gating configuration and status management
- **`src/lib/navigation.js`**: Centralized navigation helpers for consistent UX
- **`src/components/DashboardNav.jsx`**: Reference implementation for feature-aware components
- **`src/app/dashboard/layout.tsx`**: Authentication guard and subscription validation patterns

## Indonesian Market Focus
- All UI text and marketing content in Indonesian
- Pricing references to UMR (Minimum Regional Wage)
- Localized payment processing integration

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

## Backend Integration

The project expects a backend API with these endpoints:
- `/auth/*` - Authentication and user management
- `/agents/*` - AI agent management
- `/tools` - Available tools for agents
- `/integrations/whatsapp/*` - WhatsApp integration
- `/documents` - Document management

API service automatically handles authentication, token management, and error handling through the proxy pattern at `/api/proxy/[...path]`.