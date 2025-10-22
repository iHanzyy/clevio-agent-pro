# Register Flow

```mermaid
flowchart LR
    reg[Register:\nPOST ${BASE_URL_SCp}/auth/register]
    redirect[Redirect to\n/payment?user_id=...&email=...]
    plan[Choose Plan (PRO_M or PRO_Y)]
    notify[Notify Midtrans bridge (n8n):\nPOST /api/v1/payment/webhook]
    poll[Poll status:\nGET /api/v1/payment/status?order_id=...]
    decision{Settlement?}
    dashboard[/Auto-activate\n→ /dashboard/]
    login[/Prompt to sign in\n→ /login?settlement=1&email=.../]
    pending[Stay on payment\npage + status banner]

    reg --> redirect --> plan --> notify --> poll --> decision
    decision -->|Yes & user authenticated| dashboard
    decision -->|Yes & user not authenticated| login
    decision -->|No| pending --> plan
```

### Step-by-step

1. **Registration** – the frontend calls `POST ${BASE_URL_SCp}/auth/register` with the email/password. The response supplies `user_id` and the confirmed email.
2. **Redirect to payment** – the UI immediately navigates to `/payment?user_id=...&email=...`; all state needed for follow-up requests is now carried in the query string or fetched from the backend.
3. **Plan selection** – the user picks `PRO_M` or `PRO_Y`. The frontend posts the plan, user id, and generated `order_suffix` to `/api/v1/payment/webhook` (proxied to n8n/Midtrans) and stores the resulting `order_id` in memory.
4. **Status polling** – the payment screen calls `/api/v1/payment/status?order_id=...` until Midtrans reports `settlement`/`capture`. Intermediate statuses surface as inline banners; the page no longer relies on `sessionStorage`.
5. **Completion routing**
   - If the user is already authenticated (e.g., they upgraded from inside the dashboard), the payment screen refreshes the subscription and sends them to `/dashboard`.
   - If the user is not authenticated, the payment screen redirects to `/login?settlement=1&email=...` so the login form can display the settlement message and prefill the email directly from the query parameters.

# Login Flow

```mermaid
flowchart LR
    form[/Login form\n(frontend /login)/]
    submit[POST ${BASE_URL_SCp}/auth/login\n(HTTP-only cookie issued)]
    profile[GET ${BASE_URL_SCp}/auth/me\n(using cookie or token)]
    subscription[GET ${BASE_URL_SCp}/auth/subscription-status]
    dashboard[/Redirect to /dashboard/]
    retry[Show inline error + stay on form]

    form --> submit --> profile --> subscription --> dashboard
    submit -->|401 / inactive| retry
    profile -->|inactive subscription| retry
```

### Step-by-step

1. **Submit credentials** – the login page posts `{ email, password }` to `/auth/login`. The backend answers with an HTTP-only session cookie and typically returns `jwt_token` (the bearer credential) alongside `token_type`.
2. **Hydrate the session** – whether a token is returned or not, the frontend immediately calls `/auth/me` and `/auth/subscription-status` using the new cookie. Any API key or plan metadata returned is stored in memory via `apiService` for the active runtime.
3. **Route by status**  
   - If `is_active` is `true`, the router sends the user to `/dashboard`.  
   - If the account is inactive (payment not settled), the login page surfaces an error message and keeps the user on the form.
4. **Prefill after settlement** – when redirected from payment, `/login?settlement=1&email=...` displays the settlement banner and pre-populates the email field using the query string (no client storage). If the user has not logged in yet, they can now use the same credentials they registered with; the login flow accepts both token-based and cookie-only responses.

# Create Agent Flow

```mermaid
flowchart LR
    start[Fetch API Key:\ncurl -H "Authorization: Bearer <session-token>" "${BASE_URL_SCp}/auth/me"]
    form[Fill Agent Form\n(Name, Model, System Prompt,\nTools: Gmail/Calendar)]
    post[Submit Form:\nPOST https://new-langchain.chiefaiofficer.id/api/v1/agents/\nHeaders:\nAuthorization: Bearer <api-key>\nX-API-Key: <api-key>\nContent-Type: application/json]
    payload[Payload Sent:\n{\n  "name": "Assistant",\n  "config": {\n    "llm_model": "gpt-4o-mini",\n    "temperature": 0.7,\n    "max_tokens": 1000,\n    "memory_type": "buffer",\n    "reasoning_strategy": "react",\n    "system_prompt": "You are a helpful research assistant. Remember the user."\n  },\n  "allowed_tools": ["gmail", "calendar"],\n  "tools": ["gmail"],\n  "mcp_servers": {\n    "default": {\n      "url": "https://lfzlwlbz-8190.asse.devtunnels.ms/sse"\n    }\n  }\n}]

    start --> form --> post --> payload
```

### Step-by-step

1. **Get the API key** – call `GET ${BASE_URL_SCp}/auth/me` with the session token. The response contains the active API key (`access_token`).
2. **Send the request** – `POST https://new-langchain.chiefaiofficer.id/api/v1/agents/`

   Required headers:
   - `Authorization: Bearer <api-key>`
   - `X-API-Key: <api-key>`
   - `Content-Type: application/json`

3. **Payload template**

```json
{
  "name": "Assistant",
  "config": {
    "llm_model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "memory_type": "buffer",
    "reasoning_strategy": "react",
    "system_prompt": "You are a helpful research assistant. Remember the user."
  },
  "allowed_tools": ["gmail", "calendar"],
  "tools": ["gmail"],
  "mcp_servers": {
    "default": {
      "url": "https://lfzlwlbz-8190.asse.devtunnels.ms/sse"
    }
  }
}
```

> **Note:** WhatsApp linking is managed after the agent is created from the agent detail page (Scan WhatsApp QR). It is not selectable during creation.

# WhatsApp Session Flow

```mermaid
flowchart TD
    load[Agent detail/dashboard loads] --> status[GET /api/whatsapp-sessions?agentId={id}]
    status -->|returns active| active[Show \"Active\" badge\nPolling stops]
    status -->|returns awaiting_qr| awaiting[Display \"Scan WhatsApp QR\" CTA\nBegin 5s polling loop]
    status -->|returns not_found/inactive| inactive[Show \"Not linked\" state]

    awaiting --> userClick[User clicks \"Scan WhatsApp QR\"] --> create[POST /api/whatsapp-sessions]
    create --> qr[Response with QR data/base64]
    qr --> displayQr[Show QR / deeplink to user]
    userScan[User scans QR in WhatsApp] --> status

    create -->|error| error[Display error toast\nKeep previous status]
    status -->|transient error| fallback[Keep last known active state\nRetry on next poll]
```

### Step-by-step

1. **Auto-fetch status** – Every agent card and the detail page call `GET /api/whatsapp-sessions?agentId=...` (proxied through Next.js) as soon as the component mounts. The UI keeps the last known status in component state so the badge does not flicker while polling.  
2. **Display state**  
   - `active`/`connected`: show the green “Active” badge; background polling stops.  
   - `awaiting_qr`/`pending`: show the “Scan WhatsApp QR” prompt and start polling every 5 s.  
   - `not_found`/`inactive`: show “Not linked”.  
   - Network errors keep the previous state so you don’t see an unexpected downgrade.
3. **Start / re-link** – Clicking “Scan WhatsApp QR” or “Re-link WhatsApp” sends a `POST /api/whatsapp-sessions` with `{ userId, agentId, agentName, Apikey }`. The response includes `qr.base64` or a URL which the UI renders as an image/deeplink.
4. **Poll until connected** – While the service reports `awaiting_qr`, the frontend keeps polling `GET` every 5 s. Once `active` is returned, the UI promotes the status badge and polling stops automatically.
5. **Manual refresh** – The “Refresh Status” button triggers another `GET`. To prevent flicker, the UI preserves the last active state if the service briefly responds with `inactive/not_found` without any new metadata.

# Auth Flow Notes

- Logging in calls `POST /auth/login`, stores tokens in memory for the current runtime, then immediately invokes `/auth/me` and `/auth/subscription-status` to rebuild the full user object.
- Because no browser storage is used, each page load performs a lightweight auth check; the backend-managed session cookie controls access.
- Logging out sets a guard flag so the subsequent auth check skips network requests, clears in-memory tokens/API keys, and redirects to `/login`.
# Document Upload Flow

```mermaid
flowchart LR
    start[Select Document:\n/pdf|docx|pptx|txt]
    call[Upload Document:\nPOST ${BASE_URL_SCp}/agents/{agent_id}/documents\nForm fields:\n- file\n- chunk_size\n- chunk_overlap\n- batch_size]
    process[Server Processing:\n1. Convert to plain text\n2. Clean noisy characters\n3. Chunk content\n4. Embed with OpenAI]
    store[Store in `embeddings` table]
    ready[Agent Ready:\nKnowledge available for retrieval]

    start --> call --> process --> store --> ready
```

### Step-by-step

1. **Prepare the file** – ensure it is one of the supported formats (`pdf`, `docx`, `pptx`, `txt`).
2. **Call the upload endpoint** – send a `POST` request to `${BASE_URL_SCp}/agents/{agent_id}/documents` with the file and chunk parameters (`chunk_size`, `chunk_overlap`, `batch_size`).
3. **Allow processing to finish** – the backend converts the document to text, removes distracting characters, creates overlapping chunks, and embeds them with OpenAI.
4. **Review history** – fetch `${BASE_URL_SCp}/agents/{agent_id}/documents` to retrieve the canonical upload history (including deleted items) for display in the dashboard.
5. **Delete when needed** – call `DELETE ${BASE_URL_SCp}/agents/{agent_id}/documents/{upload_id}` to remove a specific upload and its embeddings.
6. **Use the knowledge** – vectors are stored in the `embeddings` table so the agent can reference the uploaded document during conversations.
