# Register Flow

```mermaid
flowchart LR
    title[Register]
    reg[Register:\ncurl -X POST "${BASE_URL_SCp}/auth/register?email=newuser@example.com&password=changeme"]
    plan[Choose Plan:\nPRO_M or PRO_Y]
    send[Send Information to N8n:\n"user id"\n"email"\n"plan code"\n"charge"\n"order suffix"]
    receive[Get information from N8n:\n{\n  "success": true,\n  "status": true,\n  "transaction_status": "settlement",\n  "order_id": "...",\n  "plan_code": "PRO_M",\n  "received": "...",\n  "source": "n8n"\n}]
    status[Check Payment Status:\nwebhook frontend: /payment/status]
    decision{Settlement?}
    success[Log in interface]
    retry[back to payment interface]

    title --> reg --> plan --> send --> receive --> status --> decision
    decision -->|Yes| success
    decision -->|No| retry
```

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

1. **Auto-fetch status** – Every agent card and the detail page call `GET /api/whatsapp-sessions?agentId=...` (proxied through Next.js) as soon as the component mounts.  
2. **Display state**  
   - `active`/`connected`: show the green “Active” badge; background polling stops.  
   - `awaiting_qr`/`pending`: show the “Scan WhatsApp QR” prompt and start polling every 5 s.  
   - `not_found`/`inactive`: show “Not linked”.  
   - Network errors keep the previous state so you don’t see an unexpected downgrade.
3. **Start / re-link** – Clicking “Scan WhatsApp QR” or “Re-link WhatsApp” sends a `POST /api/whatsapp-sessions` with `{ userId, agentId, agentName, Apikey }`. The response includes `qr.base64` or a URL which the UI renders as an image/deeplink.
4. **Poll until connected** – While the service reports `awaiting_qr`, the frontend keeps polling `GET` every 5 s. Once `active` is returned, the UI promotes the status badge and polling stops automatically.
5. **Manual refresh** – The “Refresh Status” button triggers another `GET`. To prevent flicker, the UI preserves the last active state if the service briefly responds with `inactive/not_found` without any new metadata.
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
4. **Use the knowledge** – vectors are stored in the `embeddings` table so the agent can reference the uploaded document during conversations.
