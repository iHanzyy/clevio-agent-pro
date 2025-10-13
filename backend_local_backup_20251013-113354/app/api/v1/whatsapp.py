from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from uuid import UUID

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.whatsapp_service import WhatsAppService
from pydantic import BaseModel

router = APIRouter()


class WhatsAppSessionResponse(BaseModel):
    session_id: str
    qr_code: str
    status: str


class WhatsAppStatusResponse(BaseModel):
    session_id: str
    status: str
    agent_id: str
    created_at: str


def get_whatsapp_service(db: Session = Depends(get_db)) -> WhatsAppService:
    return WhatsAppService(db)


@router.post("/sessions", response_model=WhatsAppSessionResponse)
async def create_whatsapp_session(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),
    whatsapp_service: WhatsAppService = Depends(get_whatsapp_service)
):
    """Create new WhatsApp session for agent"""
    session_data = whatsapp_service.create_session(str(agent_id), str(current_user.id))
    return WhatsAppSessionResponse(**session_data)


@router.get("/sessions/{session_id}", response_model=WhatsAppStatusResponse)
async def get_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user),
    whatsapp_service: WhatsAppService = Depends(get_whatsapp_service)
):
    """Get WhatsApp session status"""
    status_data = whatsapp_service.get_session_status(session_id)
    if status_data["status"] == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return WhatsAppStatusResponse(**status_data)


@router.delete("/sessions/{session_id}")
async def stop_whatsapp_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    whatsapp_service: WhatsAppService = Depends(get_whatsapp_service)
):
    """Stop WhatsApp session"""
    success = whatsapp_service.stop_session(session_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return {"message": "Session stopped successfully"}


@router.post("/sessions/{session_id}/simulate-connect")
async def simulate_connection(
    session_id: str,
    current_user: User = Depends(get_current_user),
    whatsapp_service: WhatsAppService = Depends(get_whatsapp_service)
):
    """Simulate WhatsApp connection (for testing)"""
    success = whatsapp_service.simulate_connection(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return {"message": "Connection simulated successfully"}
