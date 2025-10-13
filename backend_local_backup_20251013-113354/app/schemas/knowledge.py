from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class KnowledgeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    filename: str
    content_type: Optional[str] = None
    size_bytes: int
    chunk_count: int
    created_at: datetime
    metadata: Optional[Any] = Field(default=None, alias="metadata_json")


class KnowledgeDocumentUploadResponse(BaseModel):
    documents: list[KnowledgeDocumentResponse]
    total_chunks: int
