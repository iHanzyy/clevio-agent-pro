from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Optional
import time
from urllib.parse import urlparse

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging, logger
from app.api import api_router
from app.core.database import get_db
from app.core.deps import get_auth_service
from app.services.auth_service import AuthService
from app.api.v1.auth import process_google_callback
from sqlalchemy.orm import Session

# Import individual routers
from app.api.v1 import auth, agents, tools

# Import new routers (only if they exist)
try:
    from app.api.v1 import payment
    PAYMENT_AVAILABLE = True
except ImportError:
    PAYMENT_AVAILABLE = False

try:
    from app.api.v1 import whatsapp
    WHATSAPP_AVAILABLE = True
except ImportError:
    WHATSAPP_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("Starting up LangChain Agent API")

    # Create database tables
    init_db()
    logger.info("Database initialised")

    yield

    # Shutdown
    logger.info("Shutting down LangChain Agent API")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A scalable API for creating and managing AI agents with dynamic tool integration",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware - UPDATED WITH PROPER CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://5qv3wb2p-3000.asse.devtunnels.ms",
        "http://localhost:8000",
        "https://5qv3wb2p-8000.asse.devtunnels.ms",
        "*"  # Allow all origins for dev (remove in production)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Global CORS preflight handler
@app.options("/{path:path}")
async def global_preflight_handler(path: str) -> Response:
    """Handle CORS preflight requests globally."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log request
    logger.info(
        "Request started",
        method=request.method,
        url=str(request.url),
        client_ip=request.client.host if request.client else None
    )

    response = await call_next(request)

    # Log response
    process_time = time.time() - start_time
    logger.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        process_time=process_time
    )

    return response


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), url=str(request.url))

    # Always return CORS headers even on errors
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )


# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include individual routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(agents.router, prefix=f"{settings.API_V1_STR}/agents", tags=["agents"])
app.include_router(tools.router, prefix=f"{settings.API_V1_STR}/tools", tags=["tools"])

# Include payment router if available
if PAYMENT_AVAILABLE:
    app.include_router(payment.router, prefix=f"{settings.API_V1_STR}/payment", tags=["payment"])

# Include whatsapp router if available
if WHATSAPP_AVAILABLE:
    app.include_router(whatsapp.router, prefix=f"{settings.API_V1_STR}/whatsapp", tags=["whatsapp"])


# Google OAuth callback route
redirect_path = urlparse(settings.GOOGLE_REDIRECT_URI).path or ""
if redirect_path and redirect_path != f"{settings.API_V1_STR}/auth/google/callback":
    @app.get(redirect_path, include_in_schema=False)
    async def google_callback_alias(
        code: str,
        state: str,
        scope: Optional[str] = None,
        db: Session = Depends(get_db),
        auth_service: AuthService = Depends(get_auth_service),
    ):
        return await process_google_callback(code, state, db, auth_service, scope)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to LangChain Agent API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    """Return empty response for favicon requests."""
    return Response(status_code=204)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )
