from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from app.models.tool import ToolType


class ToolSchema(BaseModel):
    type: str
    properties: Dict[str, Any]
    required: Optional[List[str]] = None


class ToolCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    schema: ToolSchema = Field(..., description="JSON schema for tool parameters")


class ToolUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    schema: Optional[ToolSchema] = None


class ToolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: UUID
    name: str
    description: Optional[str]
    schema: Dict[str, Any]
    type: ToolType
    created_at: datetime
    updated_at: Optional[datetime] = None


class ToolExecuteRequest(BaseModel):
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ToolExecuteResponse(BaseModel):
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None
