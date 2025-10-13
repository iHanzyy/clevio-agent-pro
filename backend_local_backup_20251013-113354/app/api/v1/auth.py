from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.deps import get_db, get_current_user
from app.core.logging import logger
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.payment_service import PaymentService
from app.schemas.auth import (
    UserLogin, UserRegister, LoginResponse, RegisterResponse,
    ApiKeyRequest, ApiKeyResponse
)

router = APIRouter()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/register", response_model=RegisterResponse)
async def register_user(
    user_data: Optional[UserRegister] = None,
    email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    User registration endpoint - NO TOKEN RETURNED
    User must complete payment before getting access token
    """
    try:
        # Get credentials from either body or query params
        if user_data:
            user_email = user_data.email
            user_password = user_data.password
        elif email and password:
            user_email = email
            user_password = password
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email and password are required"
            )

        logger.info("Attempting user registration", email=user_email)

        # Create user with is_active=False
        user = auth_service.create_user(user_email, user_password)

        logger.info("✅ User registered successfully", user_id=str(user.id), is_active=False)

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


@router.post("/login", response_model=LoginResponse)
async def login_for_access_token(
    user_credentials: Optional[UserLogin] = None,
    email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticate user and return access token
    Only works for ACTIVE users (who completed payment)
    """
    try:
        # Get credentials
        if user_credentials:
            user_email = user_credentials.email
            user_password = user_credentials.password
        elif email and password:
            user_email = email
            user_password = password
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email and password are required"
            )

        logger.info("Login attempt", email=user_email)

        # Authenticate user
        user = auth_service.authenticate_user(user_email, user_password)

        if not user:
            logger.warning("Login failed - invalid credentials", email=user_email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Check if user is active (paid)
        if not user.is_active:
            logger.warning("Login failed - user not active", email=user_email)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not activated. Please complete payment first."
            )

        # Check subscription status
        payment_service = PaymentService(db)
        subscription_status = payment_service.get_subscription_status(user)

        # Generate token
        access_token = auth_service.create_access_token(str(user.id))

        logger.info("✅ Login successful", email=user_email, is_active=True)

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            is_active=subscription_status.is_active,
            expires_at=subscription_status.expires_at,
            plan_code=subscription_status.plan_code
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/login-for-payment")
async def login_for_payment(
    user_credentials: Optional[UserLogin] = None,
    email: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Special login endpoint for INACTIVE users who need to complete payment
    Returns token even if is_active=False, but only allows access to /payment routes
    """
    try:
        # Get credentials
        if user_credentials:
            user_email = user_credentials.email
            user_password = user_credentials.password
        elif email and password:
            user_email = email
            user_password = password
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email and password are required"
            )

        logger.info("Login for payment attempt", email=user_email)

        # Authenticate user
        user = auth_service.authenticate_user(user_email, user_password)

        if not user:
            logger.warning("Login failed - invalid credentials", email=user_email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Generate token even if inactive
        access_token = auth_service.create_access_token(str(user.id))

        logger.info("✅ Login for payment successful", email=user_email, is_active=user.is_active)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "email": user.email,
            "is_active": user.is_active,
            "message": "Please complete payment to activate your account" if not user.is_active else "Account active"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login for payment failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


# ✅ ADD THIS FUNCTION - Required by main.py for Google OAuth callback
async def process_google_callback(
    code: str,
    state: str,
    db: Session,
    auth_service: AuthService,
    scope: Optional[str] = None
):
    """
    Process Google OAuth callback
    This function is called by main.py for the Google OAuth redirect
    """
    try:
        logger.info("Processing Google OAuth callback", state=state)

        # Handle the OAuth callback
        result = await auth_service.handle_google_callback(code, state, scope)

        logger.info("✅ Google OAuth successful", user_id=result.get("user_id"))

        # Return success response
        return {
            "status": "success",
            "message": "Google authentication successful",
            "data": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Google OAuth callback failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}"
        )
