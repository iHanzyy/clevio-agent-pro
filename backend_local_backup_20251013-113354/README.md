# Clevio Agent Pro - LangChain Agent API

A production-ready, scalable API for creating and managing AI agents with dynamic tool integration, built with FastAPI, LangChain, and PostgreSQL. Features include MCP (Model Context Protocol) integration, RAG (Retrieval-Augmented Generation), and comprehensive Google Workspace integration.

## 🚀 Features

### Core Capabilities

- **Dynamic Agent Creation**: Create custom AI agents with configurable tools and system prompts
- **MCP Tool Federation**: Connect external MCP servers (e.g., n8n) and merge their tools with whitelist filtering
- **RAG Support**: Upload domain documents, embed them with pgvector, and enable context-aware responses
- **Conversation Memory**: Persistent session-based chat history with automatic context replay
- **Real-time Execution**: Asynchronous agent execution with streaming support and status tracking

### Authentication & Security

- **Two-Step Authentication**: Separate user registration from API key generation
- **Plan-Based API Keys**: Generate API keys with expiration periods (PRO_M: 30 days, PRO_Y: 365 days)
- **Google OAuth Integration**: Secure authentication with automatic scope handling
- **JWT Security**: Token-based authentication with refresh mechanism
- **Scope-Based Access**: Fine-grained permission control for external services

### Built-in Tools

- **Google Workspace**: Gmail (read/send), Google Sheets, Google Calendar, Google Docs, Google Drive
- **File Operations**: CSV, JSON, PDF, Excel, PPTX, DOCX, TXT processing
- **Custom Tools**: Register and execute custom tools with JSON Schema validation
- **MCP Tools**: Dynamic tool discovery from external MCP servers

### Architecture

- **Microservices-Ready**: Modular service layer design
- **Scalable Database**: PostgreSQL with pgvector for embeddings
- **Caching Layer**: Redis for session management and performance
- **Production-Ready**: Comprehensive logging, health checks, and monitoring

## 📋 Prerequisites

- **Python**: 3.11 or higher
- **PostgreSQL**: 15+ with pgvector extension
- **Redis**: 7.0 or higher
- **Google OAuth Credentials**: For Google Workspace integration
- **OpenAI API Key**: For LLM operations

## 🛠️ Installation

### 1. Clone and Setup Environment

```bash
git clone https://github.com/yourusername/clevio-agent-pro.git
cd clevio-agent-pro/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Security
SECRET_KEY=your-secure-secret-key-here  # pragma: allowlist secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clevio_agent_pro  # pragma: allowlist secret

# Redis
REDIS_URL=redis://localhost:6379/0

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# CORS (optional)
BACKEND_CORS_ORIGINS=["http://localhost:3000"]

# Logging (optional)
LOG_LEVEL=INFO
```

### 3. Database Setup

```bash
# Create database
createdb clevio_agent_pro

# Install pgvector extension
psql -d clevio_agent_pro -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Or use the helper script
DATABASE_URL="postgresql://user:password@localhost:5432/clevio_agent_pro" \
  ./scripts/install_pgvector.sh

# Run migrations
alembic upgrade head
```

### 4. Start Services

```bash
# Start Redis (if not running)
redis-server

# Start the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Verify Installation

Visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🐳 Docker Setup

### Development Environment

```bash
docker-compose up -d
```

This will start:

- PostgreSQL with pgvector
- Redis
- Application server

### Production Environment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Includes:

- Nginx reverse proxy
- SSL/TLS termination
- Production-optimized settings

## 📚 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "created_at": "2025-01-08T10:00:00Z"
}
```

#### Generate API Key

```http
POST /api/v1/auth/api-key
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securepassword",
  "plan_code": "PRO_M"
}
```

Response:

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_at": "2025-02-07T10:00:00Z"
}
```

**Plan Codes:**

- `PRO_M`: 30-day expiration (monthly)
- `PRO_Y`: 365-day expiration (yearly)

#### Google OAuth Flow

```http
POST /api/v1/auth/google/auth
Content-Type: application/json

{
  "scopes": ["gmail.readonly", "calendar", "sheets"],
  "state": "optional-state-string"
}
```

Response:

```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "state-identifier"
}
```

After user authorization, Google redirects to:

```
GET /api/v1/auth/google/callback?code=AUTH_CODE&state=STATE
```

### Agent Endpoints

#### Create Agent

```http
POST /api/v1/agents
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Email Assistant",
  "tools": ["gmail", "calendar"],
  "config": {
    "llm_model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 1000,
    "system_prompt": "You are a helpful email assistant."
  }
}
```

#### Create Agent with MCP Integration

```http
POST /api/v1/agents
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Market Research Agent",
  "tools": ["gmail"],
  "config": {
    "llm_model": "gpt-4o-mini",
    "temperature": 0.5
  },
  "mcp_servers": {
    "market": {
      "transport": "streamable_http",
      "url": "https://n8n.example.com/mcp/market/sse",
      "headers": {
        "Authorization": "Bearer TENANT_TOKEN"
      }
    }
  },
  "allowed_tools": [
    "market.google_trends",
    "market.shopee_scrape"
  ]
}
```

#### Execute Agent

```http
POST /api/v1/agents/{agent_id}/execute
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "input": "Read my latest emails and summarize them",
  "parameters": {},
  "session_id": "user-session-123"
}
```

Response:

```json
{
  "execution_id": "uuid",
  "agent_id": "uuid",
  "status": "completed",
  "response": "Here's a summary of your latest emails...",
  "session_id": "user-session-123",
  "created_at": "2025-01-08T10:00:00Z",
  "completed_at": "2025-01-08T10:00:05Z"
}
```

#### Upload Documents (RAG)

```http
POST /api/v1/agents/{agent_id}/documents
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: document.pdf
chunk_size: 1000
chunk_overlap: 200
```

#### List Agents

```http
GET /api/v1/agents
Authorization: Bearer YOUR_TOKEN
```

#### Get Agent Details

```http
GET /api/v1/agents/{agent_id}
Authorization: Bearer YOUR_TOKEN
```

#### Update Agent

```http
PUT /api/v1/agents/{agent_id}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Name",
  "config": {
    "temperature": 0.8
  }
}
```

#### Delete Agent

```http
DELETE /api/v1/agents/{agent_id}
Authorization: Bearer YOUR_TOKEN
```

### Tool Endpoints

#### List Tools

```http
GET /api/v1/tools?tool_type=CUSTOM
Authorization: Bearer YOUR_TOKEN
```

#### Create Custom Tool

```http
POST /api/v1/tools
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "custom_calculator",
  "description": "Performs mathematical calculations",
  "schema": {
    "type": "object",
    "properties": {
      "expression": {
        "type": "string",
        "description": "Mathematical expression to evaluate"
      }
    },
    "required": ["expression"]
  },
  "type": "CUSTOM"
}
```

#### Execute Tool

```http
POST /api/v1/tools/execute
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "tool_id": "uuid",
  "parameters": {
    "expression": "2 + 2"
  }
}
```

## 🔧 Configuration

### Environment Variables Reference

| Variable                      | Description                       | Required | Default               |
| ----------------------------- | --------------------------------- | -------- | --------------------- |
| `SECRET_KEY`                  | JWT secret key for token signing  | ✅       | -                     |
| `DATABASE_URL`                | PostgreSQL connection string      | ✅       | -                     |
| `REDIS_URL`                   | Redis connection string           | ✅       | -                     |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID            | ✅       | -                     |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth client secret        | ✅       | -                     |
| `GOOGLE_REDIRECT_URI`         | Google OAuth redirect URI         | ✅       | -                     |
| `OPENAI_API_KEY`              | OpenAI API key                    | ✅       | -                     |
| `API_V1_STR`                  | API version prefix                | ❌       | `/api/v1`             |
| `PROJECT_NAME`                | Project name                      | ❌       | `LangChain Agent API` |
| `ALGORITHM`                   | JWT algorithm                     | ❌       | `HS256`               |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration                  | ❌       | `43200` (30 days)     |
| `BACKEND_CORS_ORIGINS`        | CORS allowed origins (JSON array) | ❌       | `[]`                  |
| `LOG_LEVEL`                   | Logging level                     | ❌       | `INFO`                |

### Google OAuth Setup

1. **Create Google Cloud Project**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs**

   - Gmail API
   - Google Calendar API
   - Google Sheets API
   - Google Drive API
   - Google Docs API

3. **Create OAuth 2.0 Credentials**

   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
   - For production, add your domain's callback URL

4. **Configure Application**
   - Copy Client ID and Client Secret to `.env`
   - Update `GOOGLE_REDIRECT_URI` to match your redirect URI

**Note:** The system automatically handles scope expansion from Google. When requesting `drive.file`, Google may add broader scopes (`drive`, `drive.photos.readonly`) which are accepted as long as all requested scopes are granted.

## 💡 Usage Examples

### Complete Authentication Flow

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Step 1: Register user
register_response = requests.post(
    f"{BASE_URL}/auth/register",
    json={
        "email": "user@example.com",
        "password": "securepassword123"
    }
)
user_data = register_response.json()
print(f"✅ User registered: {user_data['user_id']}")

# Step 2: Generate API key (PRO_M = 30 days)
api_key_response = requests.post(
    f"{BASE_URL}/auth/api-key",
    json={
        "username": "user@example.com",
        "password": "securepassword123",
        "plan_code": "PRO_M"
    }
)
token_data = api_key_response.json()
token = token_data["access_token"]
print(f"✅ API key generated, expires: {token_data['expires_at']}")

# Step 3: Use token for authenticated requests
headers = {"Authorization": f"Bearer {token}"}
```

### Creating an Agent with Google Tools

```python
# Create agent with Gmail and Calendar
agent_response = requests.post(
    f"{BASE_URL}/agents",
    headers=headers,
    json={
        "name": "Personal Assistant",
        "tools": ["gmail", "calendar"],
        "config": {
            "llm_model": "gpt-4o-mini",
            "temperature": 0.7,
            "system_prompt": "You are a helpful personal assistant."
        }
    }
)

agent = agent_response.json()
print(f"✅ Agent created: {agent['id']}")

# Check if OAuth is required
if agent.get("auth_required"):
    print(f"🔐 Complete OAuth: {agent['auth_url']}")
    print(f"State: {agent['auth_state']}")
    # User must visit auth_url and authorize
```

### Creating an Agent with MCP Tools

```python
# Create agent with MCP server integration
mcp_agent_response = requests.post(
    f"{BASE_URL}/agents",
    headers=headers,
    json={
        "name": "Market Research Agent",
        "tools": [],  # No built-in tools
        "config": {
            "llm_model": "gpt-4o-mini",
            "temperature": 0.5,
            "system_prompt": "You are a market research expert."
        },
        "mcp_servers": {
            "n8n_market": {
                "transport": "streamable_http",
                "url": "https://n8n.example.com/mcp/market/sse",
                "headers": {
                    "Authorization": "Bearer YOUR_N8N_TOKEN"
                }
            }
        },
        "allowed_tools": [
            "n8n_market.google_trends",
            "n8n_market.shopee_scrape",
            "n8n_market.competitor_analysis"
        ]
    }
)

mcp_agent = mcp_agent_response.json()
print(f"✅ MCP Agent created: {mcp_agent['id']}")
```

### Executing Agent with Session Memory

```python
session_id = "user-123-session"

# First interaction
execute_response = requests.post(
    f"{BASE_URL}/agents/{agent['id']}/execute",
    headers=headers,
    json={
        "input": "My name is John. Read my latest emails.",
        "session_id": session_id
    }
)
result = execute_response.json()
print(f"Response: {result['response']}")

# Second interaction - agent remembers context
execute_response_2 = requests.post(
    f"{BASE_URL}/agents/{agent['id']}/execute",
    headers=headers,
    json={
        "input": "What was my name again?",
        "session_id": session_id
    }
)
result_2 = execute_response_2.json()
print(f"Response: {result_2['response']}")
# Expected: "Your name is John."
```

### Uploading Documents for RAG

```python
# Upload document for RAG
with open("company_handbook.pdf", "rb") as f:
    files = {"file": f}
    data = {
        "chunk_size": 1000,
        "chunk_overlap": 200
    }
    upload_response = requests.post(
        f"{BASE_URL}/agents/{agent['id']}/documents",
        headers=headers,
        files=files,
        data=data
    )

upload_result = upload_response.json()
print(f"✅ Uploaded {upload_result['chunks_created']} chunks")

# Now agent can answer questions about the document
execute_response = requests.post(
    f"{BASE_URL}/agents/{agent['id']}/execute",
    headers=headers,
    json={
        "input": "What is the vacation policy according to the handbook?",
        "session_id": session_id
    }
)
```

### Creating and Using Custom Tools

```python
# Create custom tool
tool_response = requests.post(
    f"{BASE_URL}/tools",
    headers=headers,
    json={
        "name": "weather_api",
        "description": "Gets current weather for a location",
        "schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name"
                },
                "units": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature units"
                }
            },
            "required": ["location"]
        },
        "type": "CUSTOM"
    }
)

tool = tool_response.json()
print(f"✅ Tool created: {tool['id']}")

# Execute tool directly
execute_tool_response = requests.post(
    f"{BASE_URL}/tools/execute",
    headers=headers,
    json={
        "tool_id": tool['id'],
        "parameters": {
            "location": "Jakarta",
            "units": "celsius"
        }
    }
)
```

## 🏗️ Architecture

### System Components

```
┌─────────────────┐
│   API Gateway   │  FastAPI with routing & middleware
│   (FastAPI)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│ Auth  │ │  Agent    │  Service Layer
│Service│ │  Service  │
└───┬───┘ └──┬────────┘
    │        │
┌───▼────────▼───┐
│   Tool Service │
│  Execution Svc │
└───┬────────┬───┘
    │        │
┌───▼───┐ ┌──▼─────┐
│  DB   │ │ Redis  │  Data Layer
│ (PG+  │ │(Cache) │
│vector)│ │        │
└───────┘ └────────┘
```

### Service Layer Architecture

- **Auth Service** ([`app/services/auth_service.py`](app/services/auth_service.py))

  - User registration and authentication
  - API key generation with plan-based expiration
  - Google OAuth flow management
  - Token refresh and validation

- **Agent Service** ([`app/services/agent_service.py`](app/services/agent_service.py))

  - Agent lifecycle management (CRUD)
  - MCP server configuration and validation
  - Tool whitelist enforcement
  - Document upload and RAG setup

- **Tool Service** ([`app/services/tool_service.py`](app/services/tool_service.py))

  - Built-in tool registration
  - Custom tool validation
  - Tool execution with error handling
  - MCP tool discovery and integration

- **Execution Service** ([`app/services/execution_service.py`](app/services/execution_service.py))

  - Agent execution orchestration
  - Session-based memory management
  - LangChain agent initialization
  - Conversation history replay

- **Embedding Service** ([`app/services/embedding_service.py`](app/services/embedding_service.py))
  - Document chunking and processing
  - Vector embedding generation
  - Similarity search with pgvector
  - RAG context retrieval

### Database Schema

**Key Tables:**

- `users` - User accounts
- `api_keys` - Plan-based API keys with expiration
- `agents` - Agent configurations and MCP settings
- `tools` - Built-in and custom tools
- `executions` - Conversation history and results
- `embeddings` - Vector embeddings for RAG
- `google_tokens` - Encrypted OAuth tokens

### Security Features

- **JWT Authentication**: Secure token-based auth with expiration
- **OAuth 2.0**: Google Workspace integration with automatic scope handling
- **Encrypted Storage**: OAuth tokens stored with Fernet encryption
- **API Key Management**: Plan-based expiration (30/365 days)
- **Scope-Based Access**: Fine-grained permission control
- **Input Validation**: Pydantic schemas for all requests
- **Rate Limiting**: Configurable per-endpoint limits
- **CORS Protection**: Configurable origin whitelist

### Performance Optimizations

- **Connection Pooling**: PostgreSQL connection pool with max 20 connections
- **Redis Caching**: Session data and frequent queries
- **Async Processing**: Non-blocking I/O with FastAPI
- **Lazy Loading**: Tools and embeddings loaded on-demand
- **Query Optimization**: Indexed columns for frequent lookups
- **Batch Processing**: Efficient document chunking

## 🧪 Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth_service.py

# Run with verbose output
pytest -v
```

### Code Quality

```bash
# Install dev dependencies
pip install black isort flake8 mypy

# Format code
black app/ tests/
isort app/ tests/

# Lint code
flake8 app/ tests/

# Type checking
mypy app/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Add new field to agents"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current version
alembic current
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install git hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

Configuration in [`.pre-commit-config.yaml`](.pre-commit-config.yaml)

## 📊 Monitoring & Logging

### Application Logging

The application uses structured JSON logging with the following fields:

- `timestamp`: ISO 8601 timestamp
- `level`: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `message`: Log message
- `module`: Source module
- `function`: Source function
- `extra`: Additional context

Configure log level via `LOG_LEVEL` environment variable.

### Health Checks

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-01-08T10:00:00Z"
}
```

### Metrics

Key metrics to monitor:

- Request latency (p50, p95, p99)
- Error rate by endpoint
- Database connection pool usage
- Redis cache hit rate
- Agent execution duration
- Token refresh rate

## 🚀 Deployment

### Production Environment Variables

```bash
# Security - Use strong, random values
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Database - Use managed service
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/clevio_agent_pro

# Redis - Use managed service
REDIS_URL=redis://prod-redis.example.com:6379/0

# Google OAuth - Use production credentials
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-client-secret
GOOGLE_REDIRECT_URI=https://api.yourapp.com/api/v1/auth/google/callback

# OpenAI - Use organization key
OPENAI_API_KEY=sk-proj-...

# CORS - Restrict to frontend domain
BACKEND_CORS_ORIGINS=["https://app.yourapp.com"]

# Logging - Use INFO or WARNING in production
LOG_LEVEL=INFO

# Optional: Sentry for error tracking
SENTRY_DSN=https://...@sentry.io/...
```

### Docker Production Deployment

```bash
# Build production image
docker build -t clevio-agent-pro:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Kubernetes Deployment

```yaml
# Example deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clevio-agent-pro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: clevio-agent-pro
  template:
    metadata:
      labels:
        app: clevio-agent-pro
    spec:
      containers:
        - name: app
          image: clevio-agent-pro:latest
          ports:
            - containerPort: 8000
          env:
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: secret-key
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Production Checklist

- [ ] Set strong `SECRET_KEY`
- [ ] Use managed PostgreSQL service
- [ ] Use managed Redis service
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting
- [ ] Configure CORS properly
- [ ] Set up CI/CD pipeline
- [ ] Enable automatic scaling
- [ ] Configure security headers
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Document runbooks for incidents

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -l | grep clevio_agent_pro

# Test connection
psql -d clevio_agent_pro -c "SELECT version();"
```

#### Redis Connection Errors

```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG

# Check Redis connection
redis-cli -h localhost -p 6379
```

#### Google OAuth Issues

**Problem**: "Scope has changed" errors
**Solution**: This is expected behavior. Google automatically adds broader scopes (e.g., `drive` when requesting `drive.file`). The system handles this gracefully.

**Problem**: OAuth redirect URI mismatch
**Solution**: Ensure `GOOGLE_REDIRECT_URI` in `.env` matches the redirect URI configured in Google Cloud Console.

**Problem**: Missing required scopes
**Solution**: Re-authenticate by calling `/api/v1/auth/google/auth` with required scopes.

#### MCP Server Connection Issues

**Problem**: MCP tools not appearing
**Solution**:

1. Verify MCP server URL is accessible
2. Check `mcp_servers` configuration in agent
3. Ensure tools are in `allowed_tools` whitelist
4. Check MCP server logs for errors

#### Embedding/RAG Issues

**Problem**: Document upload fails
**Solution**:

1. Check file size limits
2. Verify supported file types (PDF, DOCX, TXT, CSV, JSON)
3. Check pgvector extension is installed: `SELECT * FROM pg_extension WHERE extname = 'vector';`

**Problem**: Poor RAG results
**Solution**:

1. Adjust `chunk_size` and `chunk_overlap` parameters
2. Try different embedding models
3. Increase number of retrieved chunks

### Debugging Tips

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Check application logs
tail -f logs/app.log

# Monitor database queries (PostgreSQL)
psql -d clevio_agent_pro
SET log_statement = 'all';

# Monitor Redis operations
redis-cli monitor

# Test endpoint with curl
curl -v http://localhost:8000/health
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow PEP 8 style guide
   - Add tests for new features
   - Update documentation
4. **Run tests and quality checks**
   ```bash
   pytest
   black app/ tests/
   flake8 app/ tests/
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style

- Use Black for code formatting
- Follow PEP 8 naming conventions
- Write docstrings for public functions
- Add type hints where possible
- Keep functions focused and small

### Testing Guidelines

- Write unit tests for new features
- Maintain > 80% code coverage
- Test edge cases and error conditions
- Use fixtures for common test data

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- [API Guide](API_GUIDE.md) - Detailed API documentation
- [How to Use](how-to-use.md) - Step-by-step usage examples
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [PRD](PRD%20LANGCHAIN%20API.md) - Product requirements document

### Getting Help

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share ideas
- **Email**: support@yourapp.com

### Community

- Star the repository if you find it useful
- Share your use cases and feedback
- Contribute improvements and bug fixes

## 📝 Changelog

### v1.2.0 (Current)

- ✨ Added MCP (Model Context Protocol) integration
- ✨ Added RAG support with pgvector embeddings
- ✨ Added session-based conversation memory
- ✨ Added document upload and processing
- ✨ Added allowed_tools whitelist for MCP
- 🐛 Fixed Google OAuth scope validation
- 🐛 Fixed token refresh mechanism
- 📚 Updated comprehensive documentation

### v1.1.0

- 🐛 Fixed Google OAuth scope expansion handling
- 🐛 Enhanced token refresh with scope changes
- 📚 Improved error messages for authentication

### v1.0.0

- 🎉 Initial release
- ✨ Basic agent management
- ✨ Google OAuth integration
- ✨ Built-in tools (Gmail, Sheets, Calendar, Drive)
- ✨ Custom tool registration
- ✨ LangChain integration
- 🐳 Docker deployment setup

## 🙏 Acknowledgments

Built with:

- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [LangChain](https://python.langchain.com/) - LLM application framework
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search
- [Redis](https://redis.io/) - In-memory data store
- [OpenAI](https://openai.com/) - LLM provider

---

**Made with ❤️ by the Clevio Team**

For more information, visit our [website](https://yourapp.com) or check out the [documentation](https://docs.yourapp.com).
