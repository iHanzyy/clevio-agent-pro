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
