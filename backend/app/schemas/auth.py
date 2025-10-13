from pydantic import BaseModel, validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum
from uuid import UUID


class PlanCode(str, Enum):
    PRO_M = "PRO_M"
    PRO_Y = "PRO_Y"


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    sub: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    email: str


class GoogleAuthResponse(BaseModel):
    auth_url: str
    state: str


class GoogleAuthCallback(BaseModel):
    code: str
    state: str


class UserLogin(BaseModel):
    email: str
    password: str

    @validator("email")
    def _validate_email(cls, value: str) -> str:
        if not value or "@" not in value:
            raise ValueError("Valid email address required")
        return value.lower().strip()


class UserRegister(BaseModel):
    email: str
    password: str

    @validator("email")
    def _validate_email(cls, value: str) -> str:
        if not value or "@" not in value:
            raise ValueError("Valid email address required")
        return value.lower().strip()

    @validator("password")
    def _validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID
    email: str
    is_active: bool
    expires_at: Optional[datetime] = None
    plan_code: Optional[str] = None
    days_remaining: Optional[int] = None


class RegisterResponse(BaseModel):
    user_id: UUID
    email: str
    is_active: bool
    message: str


class AuthTokenCreate(BaseModel):
    service: str
    access_token: str
    refresh_token: Optional[str] = None
    scope: List[str]
    expires_at: Optional[datetime] = None


class AuthToken(BaseModel):
    id: str
    user_id: str
    service: str
    scope: List[str]
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyRequest(BaseModel):
    username: str
    password: str
    plan_code: PlanCode


class ApiKeyResponse(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime
    plan_code: str


class ApiKeyUpdateRequest(BaseModel):
    username: str
    password: str
    access_token: str
    plan_code: PlanCode


class UserPasswordUpdateRequest(BaseModel):
    user_id: UUID
    new_password: str
