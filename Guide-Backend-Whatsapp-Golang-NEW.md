# Curl Examples

Base URL: `http://localhost:8080/api/v1` (default port 8080). No auth header required. `apiKey` in create session payload is your Langchain API key and is stored with the session.

## Create Session (get QR base64)
```bash
curl -X POST http://localhost:8080/api/v1/sessions/create \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_01","agentName":"Bot Test","apiKey":"your-langchain-api-key", "langchainUrl" : "https://new-langchain.chiefaiofficer.id/api/v1/agents/{agentId}/execute"}'
```

## Get Session Status
Query param:
```bash
curl -X GET "http://localhost:8080/api/v1/sessions/status?agentId=agent_01"
```

Request body:
```bash
curl -X GET http://localhost:8080/api/v1/sessions/status \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_01"}'
```

## Get Session Detail
```bash
curl -X GET "http://localhost:8080/api/v1/sessions/detail?agentId=agent_01"
```

## Delete Session
```bash
curl -X DELETE http://localhost:8080/api/v1/sessions/delete \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_01"}'
```

## Reconnect Session
```bash
curl -X POST http://localhost:8080/api/v1/sessions/reconnect \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_01"}'
```
