from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import hmac
import hashlib

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.payment_service import PaymentService
from app.schemas.payment import (
    PaymentPlan, PaymentCreateRequest, PaymentCreateResponse,
    PaymentWebhookRequest, PaymentHistoryResponse, SubscriptionStatusResponse
)

router = APIRouter()


def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    return PaymentService(db)


@router.get("/plans", response_model=List[PaymentPlan])
async def get_payment_plans(
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get available payment plans"""
    return payment_service.get_plans()


@router.get("/config")
async def get_payment_config():
    """Get Midtrans configuration for frontend"""
    from app.core.config import settings
    return {
        "client_key": settings.MIDTRANS_CLIENT_KEY,
        "is_production": settings.MIDTRANS_IS_PRODUCTION
    }


@router.post("/create", response_model=PaymentCreateResponse)
async def create_payment(
    payment_request: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Create a payment transaction"""
    return payment_service.create_payment(current_user, payment_request.plan_code)


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Midtrans webhook notifications"""
    try:
        payload = await request.json()
        webhook_data = PaymentWebhookRequest(**payload)

        payment_service = PaymentService(db)
        success = payment_service.handle_webhook(webhook_data)

        return {"status": "success" if success else "error"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook processing failed: {str(e)}"
        )


@router.post("/mock-complete/{order_id}")
async def complete_mock_payment(
    order_id: str,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Complete a mock payment (development only)"""
    if settings.MIDTRANS_SERVER_KEY and settings.MIDTRANS_CLIENT_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock completion only available in development"
        )
    
    # Simulate webhook data
    webhook_data = PaymentWebhookRequest(
        order_id=order_id,
        transaction_status="settlement",
        transaction_id=f"MOCK-{uuid4().hex[:8]}",
        gross_amount="100000",
        payment_type="mock"
    )
    
    success = payment_service.handle_webhook(webhook_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete mock payment"
        )
    
    return {"status": "success", "message": "Mock payment completed"}


@router.get("/history", response_model=List[PaymentHistoryResponse])
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get user's payment history"""
    return payment_service.get_payment_history(current_user)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """Get current user's subscription status"""
    status = payment_service.get_subscription_status(current_user)
    
    # Log for debugging
    from app.core.logging import logger
    logger.info(
        "Subscription status check",
        user_id=str(current_user.id),
        is_active=status.is_active,
        plan_code=status.plan_code
    )
    
    return status
