from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Support BOTH bcrypt and bcrypt-sha256 for backwards compatibility
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],  # Try bcrypt_sha256 first, then bcrypt
    deprecated="auto"
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt (standard format)."""
    # Use standard bcrypt for NEW passwords
    return CryptContext(schemes=["bcrypt"], deprecated="auto").hash(password)


def create_access_token(data: Union[str, dict], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Either a user_id string OR a dict with 'sub' key
        expires_delta: Optional expiration time
    
    Returns:
        Encoded JWT token string
    """
    # Handle both string user_id and dict formats
    if isinstance(data, str):
        to_encode = {"sub": data}
    else:
        to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT token and return the payload dictionary.
    
    Returns:
        Dict containing the token payload with 'sub' (user_id) and 'exp' (expiration)
    
    Raises:
        JWTError if token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        return payload  # Return the full payload dict, not just user_id!
    except JWTError as e:
        raise JWTError(f"Token verification failed: {str(e)}")
