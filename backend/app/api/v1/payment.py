from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import uuid4

from app.core.deps import (
    get_current_user,
    get_current_user_for_payment,
    get_db,
    get_payment_service,
)
from app.models.user import User
from app.schemas.payment import (
    PaymentPlan,
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentWebhookRequest,
    PaymentHistoryResponse,
    SubscriptionStatusResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> PaymentService:
    return PaymentService(db)


@router.get("/plans", response_model=List[PaymentPlan])
async def get_payment_plans(payment_service: PaymentService = Depends(get_service)):
    return payment_service.get_plans()


@router.post("/create", response_model=PaymentCreateResponse)
async def create_payment(
    request: PaymentCreateRequest,
    current_user: User = Depends(get_current_user_for_payment),
    payment_service: PaymentService = Depends(get_service),
):
    return payment_service.create_payment(current_user, request.plan_code)


@router.post("/confirm")
async def confirm_payment(
    payload: PaymentWebhookRequest,
    payment_service: PaymentService = Depends(get_service),
):
    success = payment_service.handle_webhook(payload)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown order ID")
    return {"status": "success"}


@router.post("/webhook")
async def payment_webhook(request: Request, payment_service: PaymentService = Depends(get_service)):
    try:
        payload_json = await request.json()
        payload = PaymentWebhookRequest(**payload_json)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payload: {exc}")

    success = payment_service.handle_webhook(payload)
    return {"status": "success" if success else "error"}


@router.get("/history", response_model=List[PaymentHistoryResponse])
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_service),
):
    return payment_service.get_payment_history(current_user)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user_for_payment),
    payment_service: PaymentService = Depends(get_service),
):
    return payment_service.get_subscription_status(current_user)
