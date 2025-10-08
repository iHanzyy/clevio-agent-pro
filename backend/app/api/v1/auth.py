from fastapi import APIRouter, Depends, HTTPException, Response, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from uuid import UUID
import base64
import json

from app.core.database import get_db
from app.core.deps import get_current_user, get_auth_service
from app.services.auth_service import (
    AuthService,
    DEFAULT_GOOGLE_SCOPES,
    normalize_scopes,
)
from app.models import User
from app.schemas.auth import (
    Token, GoogleAuthRequest, GoogleAuthResponse, GoogleAuthCallback,
    ApiKeyRequest, ApiKeyResponse, UserLogin, UserRegister, LoginResponse, RegisterResponse
)
from app.services.payment_service import PaymentService
from app.core.logging import logger

router = APIRouter()


@router.options("/{path:path}", include_in_schema=False)
async def auth_preflight(path: str) -> Response:
    """Handle CORS preflight requests for auth endpoints."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


@router.options("/", include_in_schema=False)
async def auth_preflight_root() -> Response:
    """Handle CORS preflight requests for auth root."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


@router.post("/login", response_model=LoginResponse)
async def login_for_access_token(
    user_credentials: Optional[UserLogin] = None,
    email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user and return access token - Supports both JSON body and query params"""

    # Handle both JSON body and query parameters
    if user_credentials:
        user_email = user_credentials.email
        user_password = user_credentials.password
    elif email and password:
        user_email = email
        user_password = password
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either provide JSON body with email/password or query parameters"
        )

    user = auth_service.authenticate_user(user_email, user_password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check subscription status
    payment_service = PaymentService(db)
    subscription_status = payment_service.get_subscription_status(user)

    # Generate token - FIX: Use the correct method signature
    access_token = auth_service.create_access_token(str(user.id))  # Pass user_id as string

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        is_active=subscription_status.is_active,
        expires_at=subscription_status.expires_at,
        plan_code=subscription_status.plan_code
    )


@router.post("/register", response_model=RegisterResponse)
async def register_user(
    user_data: Optional[UserRegister] = None,
    email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """User registration endpoint - Supports both JSON body and query params"""

    # Handle both JSON body and query parameters
    if user_data:
        user_email = user_data.email
        user_password = user_data.password
    elif email and password:
        user_email = email
        user_password = password
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either provide JSON body with email/password or query parameters"
        )

    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        user = auth_service.create_user(user_email, user_password)

        logger.info("User registered successfully", user_id=str(user.id))

        return RegisterResponse(
            user_id=user.id,
            email=user.email,
            is_active=False,
            message="Registration successful. Please complete payment to activate your account."
        )

    except HTTPException as exc:
        logger.warning("Registration failed", error=str(exc.detail), email=user_email)
        raise exc
    except Exception as e:
        logger.error("Registration failed", error=str(e), email=user_email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


async def _init_google_auth(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Shared helper for initiating Google OAuth authentication."""
    try:
        # For demo purposes, we'll use some default scopes
        # In production, these should be determined by the tools the user wants to use
        auth_response = auth_service.create_google_auth_url(
            str(current_user.id), DEFAULT_GOOGLE_SCOPES
        )

        logger.info("Google auth initiated", user_id=str(current_user.id))

        return auth_response

    except HTTPException as exc:
        logger.warning("Google auth initiation failed", error=str(exc.detail), user_id=str(current_user.id))
        raise exc
    except Exception as e:
        logger.error("Google auth initiation failed", error=str(e), user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google auth: {str(e)}"
        )


@router.post("/google/auth", response_model=GoogleAuthResponse)
async def google_auth_post(
    request: GoogleAuthRequest,  # kept for backward compatibility
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Initiate Google OAuth authentication (POST)."""
    return await _init_google_auth(current_user, auth_service)


@router.get("/google/auth", response_model=GoogleAuthResponse)
async def google_auth_get(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Initiate Google OAuth authentication (GET for clickable links)."""
    return await _init_google_auth(current_user, auth_service)


async def process_google_callback(
    code: str,
    state: str,
    db: Session,
    auth_service: AuthService,
    scope: Optional[str] = None,
):
    """Process Google OAuth callback and persist user credentials."""
    try:
        state_data: Dict[str, Any] = {}
        if state:
            try:
                padded_state = state + "=" * (-len(state) % 4)
                decoded_state = base64.urlsafe_b64decode(padded_state.encode("utf-8")).decode("utf-8")
                state_data = json.loads(decoded_state)
            except Exception:
                logger.warning("Failed to decode Google OAuth state", state=state)

        scopes = DEFAULT_GOOGLE_SCOPES
        state_scopes = state_data.get("s") if state_data else None
        if state_scopes:
            scopes = normalize_scopes(state_scopes)
        elif scope:
            scopes = normalize_scopes(scope.split())

        # Exchange code for tokens
        token_data = auth_service.exchange_google_code(code, state, scopes)

        user = None
        user_id_from_state = None
        state_user = state_data.get("u") if state_data else None
        if state_user:
            try:
                user_id_from_state = UUID(state_user)
                user = db.query(User).filter(User.id == user_id_from_state).first()
            except ValueError:
                logger.warning("Invalid user id in Google OAuth state", state=state)

        # Get or create user
        if not user:
            user = db.query(User).filter(User.email == token_data["email"]).first()
        if not user:
            # Create user with random password (they'll use Google OAuth)
            import secrets
            temp_password = secrets.token_urlsafe(32)
            user = auth_service.create_user(token_data["email"], temp_password)

        # Save auth token
        auth_service.save_auth_token(str(user.id), token_data)

        # Create access token
        access_token = auth_service.create_access_token(str(user.id))

        logger.info("Google OAuth callback processed", user_id=str(user.id))

        return {
            "message": "Google authentication successful",
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException as exc:
        logger.warning("Google OAuth callback failed", error=str(exc.detail))
        raise exc
    except Exception as e:
        logger.error("Google OAuth callback failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    scope: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Handle Google OAuth callback"""
    return await process_google_callback(code, state, db, auth_service, scope)


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }


@router.post("/api-key", response_model=ApiKeyResponse)
async def generate_api_key(
    request: ApiKeyRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Generate API key with plan-based expiration"""
    try:
        api_key_data = auth_service.generate_api_key(
            email=request.username,
            password=request.password,
            plan_code=request.plan_code
        )

        logger.info("API key generated successfully", user_id=api_key_data.get("user_id"), plan_code=request.plan_code)

        return ApiKeyResponse(**api_key_data)

    except HTTPException as exc:
        logger.warning("API key generation failed", error=str(exc.detail), username=request.username)
        raise exc
    except Exception as e:
        logger.error("API key generation failed", error=str(e), username=request.username)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate API key: {str(e)}"
        )


@router.get("/tokens")
async def get_user_tokens(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Get user's authentication tokens"""
    tokens = auth_service.get_user_auth_tokens(str(current_user.id))
    return {
        "tokens": [
            {
                "id": str(token.id),
                "service": token.service,
                "scope": token.scope,
                "expires_at": token.expires_at,
                "created_at": token.created_at
            }
            for token in tokens
        ]
    }
