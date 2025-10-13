from pydantic import BaseModel, validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum
from uuid import UUID


class UserLogin(BaseModel):
    email: str
    password: str


class UserRegister(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID
    email: str
    is_active: bool = False
    expires_at: Optional[datetime] = None
    plan_code: Optional[str] = None


class RegisterResponse(BaseModel):
    user_id: UUID
    email: str
    is_active: bool = False
    message: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class AuthTokenCreate(BaseModel):
    service: str
    access_token: str
    refresh_token: Optional[str] = None
    scope: List[str] = []
    expires_at: Optional[datetime] = None


class GoogleAuthRequest(BaseModel):
    email: str
    scopes: Optional[List[str]] = None


class GoogleAuthResponse(BaseModel):
    auth_url: str
    state: str


class GoogleAuthCallback(BaseModel):
    code: str
    state: str
    scope: Optional[str] = None


class AuthToken(BaseModel):
    id: UUID
    token_name: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool


class ApiKeyRequest(BaseModel):
    username: str
    password: str
    plan_code: Literal["PRO_M", "PRO_Y"]


class ApiKeyResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_id: UUID


class PlanCode(str, Enum):
    PRO_M = "PRO_M"
    PRO_Y = "PRO_Y"
