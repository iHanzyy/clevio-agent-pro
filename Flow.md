# Product Architecture

- Next.js App Router UI lives under `src/app`, with client components coordinating flows for registration, billing, agent management, and integrations.
- `src/lib/api.js` exposes a single `apiService` instance that wraps all network calls, normalises backend responses, and caches tokens/API keys strictly in-memory.
- `src/contexts/AuthContext.js` owns session bootstrap: it exchanges credentials for session tokens, fetches the active subscription, materialises (or generates) API keys, and exposes helper actions (`login`, `logout`, `updateSubscription`, `updatePassword`).
- Several Next.js API routes relay or enrich requests so the browser never talks to privileged services directly.

**Terminology used below**

- `SC_BACKEND` → `https://new-langchain.chiefaiofficer.id/api/v1` (proxied through `/api/proxy`).
- `N8N_MAIN` → `https://n8n-new.chiefaiofficer.id`.
- `WHATSAPP_SERVICE` → value of `process.env.WHATSAPP_SESSIONS_URL` (defaults to the dev tunnel in `.env.local`).
- `ApiService` methods are referenced by their function name in `src/lib/api.js`.

## Local API routes

- `/api/proxy/[...path]` – transparent proxy to `SC_BACKEND`, preserves method/headers and injects CORS-safe `Origin`.
- `/api/v1/payment/status` – in-memory store for Midtrans status payloads; accepts writes from n8n (`POST`) and readbacks from the payment page (`POST`/`GET`).
- `/api/webhook/n8n-template` – scratchpad for template interview results; supports `PUT` (register session), `POST` (n8n completion payload), `GET` (frontend poll).
- `/api/n8n-webhook` – generic passthrough for template chat (legacy; the new UI uses `AiAssistat` directly).
- `/api/whatsapp-sessions` – relays WhatsApp session CRUD to `WHATSAPP_SERVICE`.

# Authentication & Subscription Lifecycle

## Registration & payment kickoff

```mermaid
flowchart LR
    form[/Register form/] --> submit[POST /api/proxy/auth/register]
    submit --> success{200?}
    success -->|yes| pay[/Redirect → /payment?user_id&email/]
    success -->|no| error[Surface inline error]
    pay --> selectPlan[Select plan\nPRO_M | PRO_Y]
    selectPlan --> webhook[POST N8N_MAIN/webhook/pembayaranMidtrans]
    webhook --> order[receive order_id + redirect URL]
    order --> statusCache[apiService.setLastOrderId + setPlanCode]
    order -->|has redirect| midtrans[window.location → Midtrans]
    order -->|no redirect| pollStart[(start status polling)]
```

1. `Register` page calls `apiService.register(email, password)` → `/api/proxy/auth/register`. The response is normalised to extract `user_id` & `email`.
2. On success the UI clears any stale payment state (`apiService.clearLastOrderId`) and pushes the browser to `/payment?user_id=…&email=…`.
3. The payment screen initialises `ApiService` with the plan coming from the query string, restores pending registration info, and waits for the user to pick a plan.
4. Submitting a plan invokes `apiService.notifyPaymentWebhook`, which POSTs `{user_id, email, plan_code, charge, order_suffix}` to `N8N_MAIN/webhook/pembayaranMidtrans`.
5. The N8N response may contain:
   - `order_id` – cached via `apiService.setLastOrderId`.
   - `redirect_url`/`snap_url` – if present the browser navigates straight to Midtrans.
   - `access_token`/`session_token` – opportunistically stored as API key or session token for subsequent calls.

## Payment settlement loop

```mermaid
flowchart LR
    n8n[(N8N Midtrans bridge)] -- POST status payload --> store[/api/v1/payment/status::POST/]
    store --> cache[(In-memory status map)]
    payUI[/payment page/] -- poll --> reader[/api/v1/payment/status::POST/]
    reader --> cache
    cache --> reader
    reader --> decide{settled?}
    decide -->|yes + auth| dash[/router.replace("/dashboard")/]
    decide -->|yes + guest| login[/router.replace("/login?settlement=1&email=…")/]
    decide -->|pending| banner[Inline status banner + continue polling]
```

1. N8N is expected to forward every webhook (Midtrans notifications, manual callbacks) to `POST /api/v1/payment/status`. The handler merges payloads into a singleton `Map`, keyed by `order_id` (or by `order_suffix` until the order id is known).
2. The payment page polls the same endpoint through `apiService.getInformationN8N(orderId, orderSuffix)`, which POSTs `{order_id, order_suffix}` and receives the last stored payload.
3. If the response shows `transaction_status` ∈ `{settlement, capture}` (or `success === true`), the page:
   - Refreshes the subscription (`useAuth.updateSubscription`) when a session already exists, then redirects to `/dashboard`.
   - Otherwise constructs `/login?settlement=1&email=…` so the login form can prefill the email and display the settlement banner.
4. Non-settled states (e.g., `pending`, `deny`) surface as inline warnings while the page keeps polling every 10 seconds.

## Login & session refresh

```mermaid
flowchart TD
    loginUI[/Login form/] --> post[POST /api/proxy/auth/login]
    post --> session{access_token?}
    session -->|yes| cacheToken[apiService.setSessionToken]
    post --> profile[GET /api/proxy/auth/me]
    profile --> subscription[GET /api/proxy/auth/subscription-status]
    subscription --> keyCheck{API key found?}
    keyCheck -->|yes| ready[Hydrated user context]
    keyCheck -->|no| generate[apiService.generateApiKey(plan_code)]
    generate --> ready
    ready --> route{is_active?}
    route -->|true| dash[/push("/dashboard")/]
    route -->|false| inlineError[Show inactive subscription message]
```

1. `useAuth.login` sends credentials to `/api/proxy/auth/login`. Any bearer token returned (`access_token`, `jwt_token`, etc.) is cached with `apiService.setSessionToken`.
2. It then fetches `/auth/me` and `/auth/subscription-status`, merging the results into `AuthContext` state and persisting `plan_code`, `is_active`, and any supplied API keys.
3. If no API key is available, `apiService` attempts to `listApiKeys` and falls back to `generateApiKey({ planCode, useSessionAuth: true })`.
4. Successful logins resolve `{ success: true, is_active }`; the page routes to `/dashboard` only when the subscription flag is active. Errors clear tokens and keep the user on the form.
5. On every mount `AuthProvider.checkAuth` replays this hydration flow so page refreshes remain stateless on the client.

## Subscription & API-key management highlights

- `apiService.ensureApiKey` is invoked before any agent/knowledge request. It prefers existing API keys, then subscription data, then `listApiKeys`, and finally `generateApiKey`.
- Plan codes are persisted in-memory so Midtrans settlements can immediately mint a key the next time a protected resource is touched.
- All tokens live in JavaScript memory only; no `localStorage`/`sessionStorage` usage for credentials.

# Agent Lifecycle

## Manual agent creation

```mermaid
flowchart LR
    dash[/dashboard → "Create agent"/] --> form[/dashboard/agents/new/]
    form --> payload[AgentForm builds payload]
    payload --> submit[POST /api/proxy/agents/ (apiKey auth)]
    submit --> response{auth_required?}
    response -->|yes| redirect[/push("/dashboard/agents/{id}?authUrl=…")/]
    response -->|no| redirectNo[/push("/dashboard/agents/{id}")/]
```

1. `dashboard/agents/new/page.js` optionally pre-fills the form with data saved by the template interview (read from `sessionStorage` when `fromInterview=true`).
2. `AgentForm` enforces at least one tool (`gmail` or `calendar`), constructs `config`, `allowed_tools`, plus optional MCP server metadata from `NEXT_PUBLIC_MCP_SERVER_URL`.
3. Submission calls `apiService.createAgent`, which POSTs via `/api/proxy/agents/` using the active API key. Any returned `auth_url`/`auth_state` are forwarded as query params.
4. The router navigates to the agent detail page, where follow-up setup (Google auth, WhatsApp link, document upload) takes place.

## Template-guided agent creation

```mermaid
flowchart LR
    list[/dashboard/agents/templates/] --> confirm[TemplateConfirmationDialog]
    confirm --> sessionId[Generate sessionId]
    sessionId --> register[PUT /api/webhook/n8n-template]
    register --> chat[/dashboard/agents/templates/chat/]
    chat --> aiAssistat[AiAssistat → POST N8N_MAIN/webhook/templateAgent]
    aiAssistat --> n8nReply[(N8N emits interview steps)]
    n8nReply -->|status != completed| aiAssistat
    n8nReply -->|status == completed| webhookPost[POST /api/webhook/n8n-template]
    webhookPost --> store[(session store)]
    chat --> poll[GET /api/webhook/n8n-template?session=…]
    poll -->|found| stash[sessionStorage.pendingAgentData]
    stash --> redirect[/push("/dashboard/agents/new?fromInterview=true")/]
```

1. The template gallery (`dashboard/agents/templates/page.js`) lets users pick a curated configuration; confirmation generates a deterministic session id and pushes to `/templates/chat`.
2. The chat page registers the session (`PUT /api/webhook/n8n-template`) and mounts `AiAssistat`, a lightweight chat UI that POSTs messages to `N8N_MAIN/webhook/templateAgent` with template metadata.
3. When the interview is complete, n8n POSTs `status: "completed"` plus `agent_data` back to `/api/webhook/n8n-template`.
4. The chat page polls `GET /api/webhook/n8n-template?session=…`, normalises the payload, caches it in `sessionStorage` under `pendingAgentData`, and redirects to the regular creation form.

### Trial onboarding & sandbox

1. When a visitor clicks “Start Free Trial” on the marketing page, the frontend calls `/api/trial`. The route resolves the caller’s public IP (`/api/ip` fallback) and proxies `POST /auth/api-key/trial` to `SC_BACKEND`, returning a `TRIAL` plan API key.
2. `AuthContext.startTrialSession` stores the key, plan code, and IP metadata in memory and `sessionStorage.trialSession`, tagging the user as `is_trial`. On reload, `restoreTrialSessionFromStorage` runs only when no authenticated session token is present; otherwise the persisted full session (`sessionStorage.authSession`) takes precedence so paid accounts stay signed in.
3. Trial users can run through the template → interview → agent form flow, but after submitting the form the app captures the new agent id (`sessionStorage.trialAgentContext`) and redirects them to `/trial/chat` instead of the full dashboard.
4. The `/trial/chat` route now mirrors the dashboard “Test the Agent” console: it loads the trial agent, calls `executeAgent(agentId, …)` for every prompt, and reveals intermediate steps for debugging while still blocking non-trial accounts via a redirect to `/dashboard`.

## Agent detail operations

- Loads agent metadata via `apiService.getAgent(agentId)` and immediately guards unauthenticated viewers by redirecting through `/login`.
- **Chat sandbox** – submits prompts to `apiService.executeAgent(agentId, input, {}, sessionId)` and streams replies into a local transcript with intermediate step hints.
- **Knowledge management** – lists existing uploads (with detailed metadata) via `apiService.getAgentDocuments`, supports multi-file `uploadAgentDocuments`, and removal through `deleteAgentDocument`.
- **WhatsApp connectivity** – polls `apiService.getWhatsAppSession(agentId)` and triggers new sessions through `createWhatsAppSession({ userId, agentId, apiKey })`.
- **Google Workspace auth** – detects Gmail/Calendar tooling and repeatedly calls `apiService.checkGoogleAuthStatus`. When an `auth_url` is returned, it prompts the operator to authorise and polls until tokens appear.
- **API key discovery** – multiple helper methods (`getCurrentApiKey`, `ensureApiKey`) are reused to power both integrations without exposing secrets to the DOM.

## Knowledge upload flow

```mermaid
flowchart LR
    userSelect[User selects files] --> uploadBtn[Click "Upload"]
    uploadBtn --> apiHeader[apiService.authHeader() → Bearer + X-API-Key]
    apiHeader --> postDocs[POST /api/proxy/agents/{id}/documents]
    postDocs --> ingest[Backend ingests → chunk + embed]
    ingest --> list[GET /api/proxy/agents/{id}/documents]
    list --> uiUpdate[Refresh document list + success toast]
```

1. The detail page enforces at least one file and posts each file with `FormData` (`file`, `chunk_size`, `chunk_overlap`, `batch_size`).
2. Any failure bubbles up as a descriptive toast (e.g., AES-encrypted PDF hint when PyCryptodome is missing backend-side).
3. Successful uploads trigger a fresh listing so the UI reflects new embeddings immediately.

## WhatsApp linking flow

```mermaid
flowchart LR
    detail[/Agent detail/] --> start{Session active?}
    start -->|no| createBtn[Trigger "Connect WhatsApp"]
    createBtn --> payload[{userId, agentId, apiKey}]
    payload --> postLocal[POST /api/whatsapp-sessions]
    postLocal --> remote[WHATSAPP_SERVICE POST /sessions]
    remote --> result{qr provided?}
    result -->|yes| qr[Display QR + start countdown]
    detail --> poll[Poll /api/whatsapp-sessions?agentId=… every 5s]
    poll --> normalize[apiService.normalizeWhatsAppSession]
    normalize --> statusCard[Update badges + metrics]
    normalize -->|isActive| stopPoll[Stop polling]
```

1. Clicking “Connect WhatsApp” calls `createWhatsAppSession`, passing the logged-in user id, agent id, name, and API key.
2. The Next API route forwards the payload to `WHATSAPP_SERVICE`. Any QR image/URL/expiry returned is surfaced in the UI with a countdown.
3. While the session is pending the page polls every 5 s using `getWhatsAppSession`, normalising myriad response shapes into `{ isActive, status, qrImage, updatedAt }`.
4. Once `isActive` becomes true, polling stops and the dashboard stats increment the “Connected WhatsApp” counter.

## Google Workspace connector flow

```mermaid
flowchart LR
    detect[Agent uses Gmail/Calendar] --> statusPing[GET /api/proxy/auth/google]
    statusPing -->|auth_url| prompt[Show "Connect Google" CTA]
    prompt --> oauth[User authorises via auth_url]
    oauth --> callback[(Backend stores tokens)]
    callback --> statusPing
    statusPing -->|tokens[]| connected[Mark Google Connected]
    connected --> refresh[Allow manual "Refresh status"]
```

1. The detail page infers Google tool usage from `allowed_tools` and only surfaces the card when relevant.
2. `apiService.checkGoogleAuthStatus` returns either an `auth_url` (pending) or a list of tokens (connected). The UI stores these in `googleAuthInfo`.
3. While pending, the page polls every 5 s; when tokens arrive it stops polling, clears query params, and marks the connector as ready.
4. Operators can manually refresh the status if an auth URL remains valid but tokens haven’t landed yet.

# Templates & interview chat

- `AiAssistat` (`src/components/ui/ai-assistat.jsx`) is a bespoke chat widget built for template interviews:
  - Sends an initial greeting as soon as the webhook responds, caches the first response per session id, and gracefully retries when the widget remounts.
  - Normalises arbitrary n8n payloads and extracts readable messages, falling back to JSON stringification when needed.
  - Broadcasts `onComplete(agent_data)` to the chat page, which in turn triggers the hand-off described earlier.
- `TemplateChat.js` retains the legacy `@n8n/chat` integration but is no longer used by the active template flow.

# Configuration reference

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL=/api/proxy` | Makes all browser fetches route through the proxy (points to `SC_BACKEND`). |
| `BACKEND_BASE_URL` | Server-side default for the proxy route. |
| `NEXT_PUBLIC_MCP_SERVER_URL` | Injected into agent payloads as the default MCP SSE endpoint. |
| `N8N_WEBHOOK_URL`, `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Chat/interview webhook defaults (used by `AiAssistat` and legacy chat). |
| `WHATSAPP_SESSIONS_URL` (optional) | Remote WhatsApp session manager; defaults to the dev tunnel when unset. |

# Key files

- `src/lib/api.js` – exhaustive request helper, including payment polling, agent CRUD, knowledge management, WhatsApp tooling, and Google Auth utilities.
- `src/contexts/AuthContext.js` – memoised auth store, exposes imperative methods to react components.
- `src/app/payment/page.js` – orchestrates plan selection, n8n notify, settlement polling, and routing decisions.
- `src/app/dashboard/agents/templates/chat/page.js` – glue code between template selection, n8n interviews, and the standard agent creation flow.
- `src/app/dashboard/agents/[agentId]/page.js` – the most feature-rich screen; centralises chat, knowledge upload, WhatsApp linking, and Google OAuth.
