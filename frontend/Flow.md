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
