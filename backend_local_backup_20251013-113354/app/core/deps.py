from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import verify_token
from app.models import User
from app.services.auth_service import AuthService
from app.services.agent_service import AgentService
from app.services.tool_service import ToolService
from app.services.execution_service import ExecutionService
from app.services.embedding_service import EmbeddingService
from app.core.logging import logger

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    require_active: bool = True  # NEW: Make activation check optional
) -> User:
    """Get current authenticated user via JWT token"""
    try:
        token = credentials.credentials

        logger.info(f"🔐 Authenticating JWT token: {token[:20]}...")

        try:
            payload = verify_token(token)
            user_id = payload.get("sub")

            logger.info(f"✅ JWT valid, user_id: {user_id}")

            if not user_id:
                logger.error("❌ JWT missing 'sub' claim")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )

            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"❌ User not found: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )

            # Only check is_active if required
            if require_active and not user.is_active:
                logger.error(f"❌ User inactive: {user.email}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Inactive user. Please complete payment first."
                )

            logger.info(f"✅ User authenticated: {user.email}, active: {user.is_active}")
            return user

        except HTTPException:
            raise
        except Exception as jwt_error:
            logger.error(f"❌ JWT verification failed: {str(jwt_error)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


def get_current_user_for_payment(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user for payment routes - allows INACTIVE users
    """
    return get_current_user(credentials, db, require_active=False)


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Service dependencies
def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def get_agent_service(
    db: Session = Depends(get_db)
) -> AgentService:
    return AgentService(db)  # REMOVED current_user.id - AgentService doesn't need it in __init__


def get_tool_service(db: Session = Depends(get_db)) -> ToolService:
    return ToolService(db)


def get_execution_service(
    db: Session = Depends(get_db)
) -> ExecutionService:
    return ExecutionService(db)  # REMOVED current_user.id - ExecutionService doesn't need it in __init__


def get_embedding_service(db: Session = Depends(get_db)) -> EmbeddingService:
    return EmbeddingService(db)
