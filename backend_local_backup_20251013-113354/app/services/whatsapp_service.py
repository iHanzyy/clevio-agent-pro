import qrcode
import io
import base64
from typing import Optional, Dict, Any
from uuid import uuid4
import asyncio
import json
from datetime import datetime

from sqlalchemy.orm import Session
from app.models.agent import Agent
from app.models.user import User


class WhatsAppSession:
    def __init__(self, session_id: str, agent_id: str, user_id: str):
        self.session_id = session_id
        self.agent_id = agent_id
        self.user_id = user_id
        self.qr_code = None
        self.is_connected = False
        self.created_at = datetime.utcnow()


class WhatsAppService:
    def __init__(self, db: Session):
        self.db = db
        self.active_sessions: Dict[str, WhatsAppSession] = {}

    def create_session(self, agent_id: str, user_id: str) -> Dict[str, Any]:
        """Create new WhatsApp session and generate QR code"""
        session_id = f"wa_session_{uuid4().hex[:8]}"

        # Create session
        session = WhatsAppSession(session_id, agent_id, user_id)

        # Generate QR code (mock for now - in real implementation this would come from whatsapp-web.js)
        qr_data = f"https://wa.me/qr/{session_id}?agent={agent_id}"

        # Create QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)

        # Convert to base64 image
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        session.qr_code = qr_base64
        self.active_sessions[session_id] = session

        return {
            "session_id": session_id,
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "status": "waiting_for_scan"
        }

    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get session connection status"""
        session = self.active_sessions.get(session_id)
        if not session:
            return {"status": "not_found"}

        return {
            "session_id": session_id,
            "status": "connected" if session.is_connected else "waiting_for_scan",
            "agent_id": session.agent_id,
            "created_at": session.created_at.isoformat()
        }

    def stop_session(self, session_id: str, user_id: str) -> bool:
        """Stop WhatsApp session"""
        session = self.active_sessions.get(session_id)
        if session and session.user_id == user_id:
            del self.active_sessions[session_id]
            return True
        return False

    def simulate_connection(self, session_id: str) -> bool:
        """Simulate WhatsApp connection (for testing)"""
        session = self.active_sessions.get(session_id)
        if session:
            session.is_connected = True
            return True
        return False
