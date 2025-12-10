# Product Architecture

- Next.js App Router UI lives under `src/app`, with client components coordinating flows for registration, billing, agent management, and integrations.
- `src/lib/api.js` exposes a single `apiService` instance that wraps all network calls, normalises backend responses, and caches tokens/API keys strictly in-memory.
- `src/contexts/AuthContext.js` owns session bootstrap: it exchanges credentials for session tokens, fetches the active subscription, materialises (or generates) API keys, and exposes helper actions (`login`, `logout`, `updateSubscription`, `updatePassword`).
- Several Next.js API routes relay or enrich requests so the browser never talks to privileged services directly.

**Terminology used below**

- `SC_BACKEND` → `https://new-langchain.chiefaiofficer.id/api/v1` (proxied through `/api/proxy`).
- `N8N_MAIN` → `https://n8n.srv651498.hstgr.cloud/`.
- `WHATSAPP_SERVICE` → Golang service at `WHATSAPP_BACKEND_BASE_URL` (default `http://localhost:8080/api/v1`) that exposes `/sessions/{create,status,detail,delete,reconnect}` and returns `qrCodeBase64` inline.
- `ApiService` methods are referenced by their function name in `src/lib/api.js`.

## Local API routes

- `/api/proxy/[...path]` – transparent proxy to `SC_BACKEND`, preserves method/headers and injects CORS-safe `Origin`.
- `/api/v1/payment/status` – in-memory store for Midtrans status payloads; accepts writes from n8n (`POST`) and readbacks from the payment page (`POST`/`GET`).
- `/api/webhook/n8n-template` – scratchpad for template interview results; supports `PUT` (register session), `POST` (n8n completion payload), `GET` (frontend poll).
- `/api/n8n-webhook` – generic passthrough for template chat (legacy; the new UI uses `AiAssistat` directly).
- `/api/whatsapp-sessions` – proxy to Go WhatsApp service (`/sessions/create` for POST, `/sessions/detail` for GET), caches the last QR/status per agent for UI polling.

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

1. `Register` page calls `apiService.register(email, password)` → `/api/proxy/auth/register` (credentials now live solely in the POST payload to avoid leaking into query strings). Registration now requires a valid email address—phone-based signups are disabled—so the response is normalised to extract `user_id` & `email`.
2. On success the UI clears any stale payment state (`apiService.clearLastOrderId`) and pushes the browser to `/payment?user_id=…&email=…`.
3. The payment screen initialises `ApiService` with the plan coming from the query string, restores pending registration info, and waits for the user to pick a plan.
4. Submitting a plan invokes `apiService.notifyPaymentWebhook`, which POSTs `{user_id, email, plan_code, charge, order_suffix}` to the Midtrans bridge defined by `NEXT_PUBLIC_PAYMENT_WEBHOOK_URL` (defaulting to `N8N_MAIN/webhook/pembayaranMidtrans`).
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

1. `useAuth.login` sends the identifier (email or phone number) plus password to `/api/proxy/auth/login`, and `apiService` includes both `identifier` and the corresponding `email`/`phone` params for backend compatibility. Any bearer token returned (`access_token`, `jwt_token`, etc.) is cached with `apiService.setSessionToken`.
2. It then fetches `/auth/me` and `/auth/subscription-status`, merging the results into `AuthContext` state and persisting `plan_code`, `is_active`, and any supplied API keys.
3. If no API key is available, `apiService` attempts to `listApiKeys` and falls back to `generateApiKey({ planCode, useSessionAuth: true })`.
4. Successful logins resolve `{ success: true, is_active }`; the page routes to `/dashboard` only when the subscription flag is active. Errors clear tokens and keep the user on the form.
5. On every mount `AuthProvider.checkAuth` replays this hydration flow so page refreshes remain stateless on the client.

## Subscription & API-key management highlights

- `apiService.ensureApiKey` is invoked before any agent/knowledge request. It prefers existing API keys, then subscription data, then `listApiKeys`, and finally `generateApiKey`.
- Plan codes are persisted in-memory so Midtrans settlements can immediately mint a key the next time a protected resource is touched.
- All tokens live in JavaScript memory only; no `localStorage`/`sessionStorage` usage for credentials.

# Agent Lifecycle

## Default agent creation (template-first)

```mermaid
flowchart LR
    dash[/dashboard → "Create agent" CTA/] --> gallery[/dashboard/agents/templates/]
    gallery --> confirm[TemplateConfirmationDialog]
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
    stash --> form[/dashboard/agents/new?fromInterview=true/]
    form --> payload[AgentForm builds payload (prefilled)]
    payload --> submit[POST /api/proxy/agents/ (apiKey auth)]
    submit --> response{auth_required?}
    response -->|yes| redirect[/push("/dashboard/agents/{id}?authUrl=…")/]
    response -->|no| redirectNo[/push("/dashboard/agents/{id}")/]
```

1. Tombol/CTA “Create agent” **selalu** membuka galeri template (`/dashboard/agents/templates`); tidak langsung ke form kosong. Tombol “Customize Agent” di galeri memulai wawancara dengan template khusus “Custom Agent”, bukan lompat ke form.
2. Setelah memilih template, dialog konfirmasi membuat `sessionId` deterministik lalu mendaftarkan sesi ke `/api/webhook/n8n-template`; router lanjut ke halaman chat.
3. Halaman chat menjalankan wawancara via `AiAssistat` yang POST ke `N8N_MAIN/webhook/templateAgent` dengan metadata template.
4. Ketika n8n mengembalikan `status: "completed"` + `agent_data`, payload itu disimpan oleh `/api/webhook/n8n-template`.
5. Chat mem-poll `GET /api/webhook/n8n-template?session=…`, menaruh hasilnya ke `sessionStorage.pendingAgentData`, lalu redirect ke `/dashboard/agents/new?fromInterview=true`.
6. `AgentForm` memanfaatkan `pendingAgentData` untuk prefill, memvalidasi tools (minimal Gmail/Calendar), dan menambahkan metadata MCP bila ada. Jika halaman `/dashboard/agents/new` dibuka tanpa hasil wawancara, UI memblokir akses dan memaksa user kembali ke galeri template.
7. Submit memanggil `apiService.createAgent` melalui `/api/proxy/agents/`; setelah sukses, frontend wajib memicu OAuth per agent lewat `POST /auth/google` dengan body `{ scopes, agent_id }` (diturunkan dari agent yang baru dibuat). Respons `auth_url`/`auth_state` diteruskan di redirect detail page.
8. Untuk akun berbayar (PRO_M/PRO_Y), ketika redirect ke `/dashboard/agents/{id}` selesai dan agent memiliki `google_tools`, halaman detail otomatis memunculkan modal “Connect Google”. Modal ini menjalankan `/auth/google` dengan `agent_id` tersebut; CTA “Connect” membuka OAuth, sedangkan “Lanjut tanpa Google” membutuhkan konfirmasi dan menampilkan peringatan bahwa Gmail/Calendar tidak akan berfungsi sampai koneksi diselesaikan.

### Payload Create Agent (frontend → backend)
- `google_tools`: daftar aksi Google/Gmail yang dipilih (dipisah dari `mcp_tools`).
- `tools`: **opsional**; untuk MCP-only cukup kosong/tidak dikirim agar backend tidak menolak tool id. Jangan selipkan `google_tools` di sini.
- `mcp_servers`: selalu `{ calculator_sse: { transport: "sse", url: "http://0.0.0.0:8190/sse" } }` kecuali `NEXT_PUBLIC_MCP_SERVER_URL` dioverride.
- `mcp_tools`: hanya berisi pilihan MCP (mis. `web_search`), **tidak** otomatis memasukkan `google_tools`.

### Catatan bypass manual
- Form kosong `/dashboard/agents/new` diblokir ketika tidak membawa hasil wawancara (kecuali flag darurat `allowDirect=1`). Urutan wajib: Create → Template → Interview → Form → Create. CTA “Customize Agent” sudah otomatis lewat wawancara, jadi jangan lagi arahkan ke form langsung.

### Trial onboarding & sandbox

1. Clicking “Start Free Trial” still calls `/api/trial`, but the CTA now routes visitors to `/trial/templates` after `AuthContext.startTrialSession` records the returned `TRIAL` API key inside `sessionStorage.trialSession`.
2. The guest-only template gallery + interview chat mirrors the authenticated version. When n8n finishes the interview, the payload is cached as `sessionStorage.pendingAgentData`, `/trial/agent-form?fromInterview=true` auto-prefills `AgentForm`, and submitting that form serialises the create-agent payload into `localStorage.trialPendingAgentPayload` before sending the browser to `/register?trial=1`.
3. Successful registration pushes to `/payment?plan=TRIAL&source=trial-flow`. Selecting the “Free Trial” plan skips Midtrans: the payment page POSTS the zero-charge payload to `notifyPaymentWebhook`, reads the staged agent config from `localStorage`, forces `plan_code: "TRIAL"`, and calls `apiService.createAgent`. A 200 response clears `localStorage.trialPendingAgentPayload` and redirects the visitor to `/login?trial=1`.
4. After login the standard dashboard layout loads; subscription refreshes pick up the `TRIAL` plan that was activated via n8n. The legacy `/trial/chat` route remains for authenticated trial accounts who already created an agent and want a sandboxed console.
5. Every time a trial account is activated, the browser stores the normalised email in `localStorage.trialUsedEmails`. The register form checks this list before attempting another trial signup, showing a modal that explains the trial has already been consumed on this device.

> **UI/UX parity rule:** The template gallery (`/dashboard/agents/templates` and `/trial/templates`), interview/chat experience, and AgentForm shell must look and behave the same across the paid flow (PRO_M/PRO_Y) and the trial flow. Only the underlying logic (plan codes, tool locking, provisioning behaviour) may diverge. Any design tweaks to one surface must be applied to the other to avoid losing the interview-to-form context.

## Agent detail operations

- Loads agent metadata via `apiService.getAgent(agentId)` and immediately guards unauthenticated viewers by redirecting through `/login`.
- **Chat sandbox** – submits prompts to `apiService.executeAgent(agentId, input, {}, sessionId)` and streams replies into a local transcript with intermediate step hints.
- **Knowledge management** – lists existing uploads (with detailed metadata) via `apiService.getAgentDocuments`, supports multi-file `uploadAgentDocuments`, and removal through `deleteAgentDocument`.
- **WhatsApp connectivity** – polls `apiService.getWhatsAppSession(agentId)` and triggers new sessions through `createWhatsAppSession({ userId, agentId, apiKey })`.
- **Google Workspace auth (per agent)** – detects Gmail/Calendar tooling and repeatedly calls `apiService.checkGoogleAuthStatus` (POST `/auth/refresh-status-google`). OAuth is now scoped per agent: setiap agent baru harus dijalankan `/auth/google` dengan `agent_id`. Ketika `auth_url` dikembalikan, UI memandu user untuk authorize dan polling berjalan sampai token masuk.
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
    createBtn --> payload[{agentId, agentName, apiKey}]
    payload --> postLocal[POST /api/whatsapp-sessions<br/>(create → /sessions/create)]
    postLocal --> qr[QR from response (qrCodeBase64)]
    qr --> show[Display QR + start countdown]
    detail --> pollStatus[Poll /api/whatsapp-sessions/status?agentId=…]
    pollStatus --> normalize[normalizeWhatsAppStatusSnapshot]
    normalize --> statusCard[Update badges + metrics]
    normalize -->|connected| stopPoll[Stop polling]
    normalize -->|waiting_scan| refetchQr[/api/whatsapp-sessions/qr → /sessions/detail]
```

1. Clicking “Connect WhatsApp” calls `createWhatsAppSession`, passing `agentId`, optional `agentName`, and the Langchain `apiKey`.
2. The proxy posts to the Go service `/sessions/create`; the response already carries `qrCodeBase64` so the UI can display QR without a delay.
3. Polling uses `/api/whatsapp-sessions/status?agentId=…` (→ `/sessions/status`) every few seconds until `status === "connected"`; if status returns `waiting_scan`/`qr_timeout`, the UI can refetch `/api/whatsapp-sessions/qr` (→ `/sessions/detail`) to get a fresh QR.
4. Disconnects use `DELETE /api/whatsapp-sessions/{agentId}` (→ `/sessions/delete`); reconnect uses `POST /api/whatsapp-sessions/{agentId}/reconnect` (→ `/sessions/reconnect`).
5. Refer to `Guide-Backend-Whatsapp-Golang-NEW.md` (curl examples) and `web-integration-GOWHATSAPP.md` (frontend polling hints) for the latest payload shapes.

## Google Workspace connector flow (per-agent auth)

```mermaid
flowchart LR
    detect[Agent created with google_tools] --> modal[Auto-show Google Connect Modal]
    modal --> userAction{User clicks "Connect with Google"}
    userAction -->|yes| startAuth[POST /auth/google with agent_id]
    userAction -->|skip| skipFlow[Show warning that Gmail/Calendar won't work]
    startAuth --> authUrl[Receive auth_url → open OAuth popup]
    authUrl --> startPolling[Start polling every 3 seconds]
    startPolling --> checkStatus[POST /auth/refresh-status-google with agent_id]
    checkStatus -->|tokens[]| connected[Mark as Connected]
    checkStatus -->|auth_url| keepPolling[Continue polling]
    connected --> stopPolling[Stop polling]
    skipFlow --> continue[Continue without Google features]
```

1. **Per-agent authentication**: Setiap agent baru dengan `google_tools` harus melakukan OAuth terpisah melalui `/auth/google` dengan `agent_id` di payload. Tidak ada auto-refresh status tanpa user action.

2. **Trigger flow**:
   - Saat agent berhasil dibuat dengan `google_tools`, modal "Connect Google" otomatis muncul
   - User dapat menekan tombol "Connect with Google" atau "Continue with Google" di card integration
   - Modal tidak akan auto-close sampai user selesai OAuth atau eksplisit skip

3. **Manual-only polling**: Status check hanya dimulai setelah user klik tombol "Connect" atau "Refresh Status":
   - `POST /auth/google` dengan payload `{ scopes, agent_id }` → dapat `auth_url`
   - Buka OAuth popup lalu mulai polling `/auth/refresh-status-google` setiap 3 detik
   - Stop polling ketika `tokens[]` ada atau user menutup modal
   - **Page visibility**: Polling otomatis berhenti saat user navigasi ke halaman lain (document.hidden)

4. **User experience**:
   - Tidak ada auto-refresh background yang mengganggu
   - User harus eksplisit klik tombol untuk memulai dan refresh status
   - Modal menampilkan peringatan keras jika user memilih skip tanpa connect
   - Status tetap terlihat di card integration manual
   - **SessionStorage cleanup**: Setelah Google auth berhasil, `pendingGoogleConnectAgent` dan `GOOGLE_CONNECT_PROMPT_KEY` dihapus dari sessionStorage

5. **API contracts**:
   - `POST /auth/google` dengan body `{ scopes: [...], agent_id: "..." }`
   - `POST /auth/refresh-status-google` dengan body `{ agent_id: "..." }`
   - Kedua endpoint wajib menyertakan `agent_id` karena auth terikat per agent, bukan per user

# Security defaults

- `apiService` only emits verbose request/response logging when `NEXT_PUBLIC_API_DEBUG=1` (the flag defaults to enabled in development and disabled in production) so bearer/session tokens never show up in customer consoles by accident.
- Authentication helpers still send credentials in the POST payload, but they also append email/password to the query string to satisfy the legacy FastAPI contract. (The backend currently ignores body-only submissions.) Consider migrating the backend to read the body so the query fallback can be removed later.
- `updatePassword` now requires an authenticated session; API-key-only contexts can no longer rotate user credentials.

# TypeScript build settings

- The root `tsconfig.json` enables `strictNullChecks` and `exactOptionalPropertyTypes` (while leaving other `strict` flags opt-in) so Next.js 15’s default type checking pipeline runs without the `TS5053` error that occurs when exact optional properties are used without null checking. Keep these flags in place whenever adding new configs or extending the project.

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
| `NEXT_PUBLIC_API_DEBUG` (optional) | When set to `1`, forces verbose `apiService` logging even outside development; set to `0` to silence logs locally. |
| `BACKEND_BASE_URL` | Server-side default for the proxy route. |
| `NEXT_PUBLIC_MCP_SERVER_URL` | Injected into agent payloads as the default MCP SSE endpoint. |
| `N8N_WEBHOOK_URL`, `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Chat/interview webhook defaults (used by `AiAssistat` and legacy chat). |
| `WHATSAPP_BACKEND_BASE_URL` (optional) | Base URL for the WhatsApp backend (`https://lfzlwlbz-3000.asse.devtunnels.ms`), used for both session creation and forced QR generation. |
| `WHATSAPP_SESSIONS_URL` (optional) | Remote WhatsApp session manager; defaults to the dev tunnel when unset. |

# Key files

- `src/lib/api.js` – exhaustive request helper, including payment polling, agent CRUD, knowledge management, WhatsApp tooling, and Google Auth utilities.
- `src/contexts/AuthContext.js` – memoised auth store, exposes imperative methods to react components.
- `src/app/payment/page.js` – orchestrates plan selection, n8n notify, settlement polling, and routing decisions.
- `src/app/dashboard/agents/templates/chat/page.js` – glue code between template selection, n8n interviews, and the standard agent creation flow.
- `src/app/dashboard/agents/[agentId]/page.js` – the most feature-rich screen; centralises chat, knowledge upload, WhatsApp linking, and Google OAuth.
