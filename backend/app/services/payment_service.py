from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import uuid4

import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models import User, ApiKey, Payment
from app.schemas.payment import (
    PaymentPlan,
    PaymentCreateResponse,
    PaymentWebhookRequest,
    PaymentHistoryResponse,
    SubscriptionStatusResponse,
)


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.plans = {
            "PRO_M": PaymentPlan(code="PRO_M", name="Pro Monthly", price=Decimal("100000"), duration_days=30),
            "PRO_Y": PaymentPlan(code="PRO_Y", name="Pro Yearly", price=Decimal("1000000"), duration_days=365),
        }

    def get_plans(self) -> List[PaymentPlan]:
        return list(self.plans.values())

    def create_payment(self, user: User, plan_code: str) -> PaymentCreateResponse:
        if plan_code not in self.plans:
            raise HTTPException(status_code=400, detail="Invalid plan code")

        plan = self.plans[plan_code]
        order_id = f"ORD-{str(user.id).replace('-', '')[:10]}-{uuid4().hex[:6]}"

        webhook_url = settings.N8N_MIDTRANS_WEBHOOK_URL
        if not webhook_url:
            logger.error("N8N_MIDTRANS_WEBHOOK_URL is not configured", user_id=str(user.id))
            raise HTTPException(status_code=503, detail="Payment processor is unavailable. Please contact support.")

        payload: Dict[str, str] = {
            "user_id": str(user.id),
            "email": str(user.email),
            "plan_code": str(plan_code),
            "harga": str(plan.price),
            "order_id": str(order_id),
        }

        message = "Payment request submitted. Please follow the instructions sent by our payment partner."
        redirect_url: Optional[str] = None

        try:
            response = requests.post(webhook_url, json=payload, timeout=15)
            response.raise_for_status()
            logger.info("Forwarded payment request to n8n", order_id=order_id)
            try:
                response_payload = response.json()
                if isinstance(response_payload, dict):
                    redirect_url = response_payload.get("redirect_url") or response_payload.get("redirectUrl")
                    message = response_payload.get("message", message)
            except ValueError:
                logger.debug("n8n webhook returned non-JSON response")
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to call n8n webhook", error=str(exc))
            raise HTTPException(status_code=502, detail="Failed to contact payment processor. Please try again shortly.")

        payment_record = Payment(
            user_id=user.id,
            order_id=order_id,
            plan_code=plan_code,
            gross_amount=plan.price,
            transaction_status="pending",
        )
        self.db.add(payment_record)
        self.db.commit()

        return PaymentCreateResponse(
            order_id=order_id,
            gross_amount=plan.price,
            status="pending",
            message=message,
            redirect_url=redirect_url,
        )

    def handle_webhook(self, payload: PaymentWebhookRequest) -> bool:
        payment = self.db.query(Payment).filter(Payment.order_id == payload.order_id).first()
        if not payment:
            logger.warning("Webhook received for unknown order", order_id=payload.order_id)
            return False

        payment.transaction_status = payload.transaction_status
        payment.payment_type = payload.payment_type
        if payload.transaction_time:
            try:
                payment.transaction_time = datetime.fromisoformat(payload.transaction_time)
            except ValueError:
                payment.transaction_time = datetime.now(timezone.utc)

        user = self.db.query(User).filter(User.id == payment.user_id).first()

        if payload.transaction_status.lower() == "settlement" and user:
            self._activate_subscription(user, payment.plan_code, Decimal(str(payload.gross_amount or payment.gross_amount)))
            payment.transaction_status = "settlement"

        self.db.commit()
        return True

    def get_payment_history(self, user: User) -> List[PaymentHistoryResponse]:
        records = (
            self.db.query(Payment)
            .filter(Payment.user_id == user.id)
            .order_by(Payment.created_at.desc())
            .all()
        )

        history: List[PaymentHistoryResponse] = []
        for record in records:
            history.append(
                PaymentHistoryResponse(
                    id=record.id,
                    order_id=record.order_id,
                    gross_amount=Decimal(record.gross_amount),
                    plan_code=record.plan_code,
                    transaction_status=record.transaction_status,
                    payment_type=record.payment_type,
                    transaction_time=record.transaction_time,
                    created_at=record.created_at,
                )
            )
        return history

    def get_subscription_status(self, user: User) -> SubscriptionStatusResponse:
        active_key = (
            self.db.query(ApiKey)
            .filter(ApiKey.user_id == user.id, ApiKey.is_active == True)  # noqa: E712
            .order_by(ApiKey.expires_at.desc())
            .first()
        )

        now = datetime.now(timezone.utc)
        if active_key and active_key.expires_at:
            expires_at = active_key.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            is_active = expires_at > now
            days_remaining = max(0, (expires_at - now).days)
            return SubscriptionStatusResponse(
                is_active=is_active,
                plan_code=active_key.plan_code,
                expires_at=expires_at,
                days_remaining=days_remaining,
            )

        if user.subscription_expires_at:
            expires_at = user.subscription_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            is_active = expires_at > now
            days_remaining = max(0, (expires_at - now).days)
            return SubscriptionStatusResponse(
                is_active=is_active,
                plan_code=user.subscription_plan,
                expires_at=expires_at,
                days_remaining=days_remaining,
            )

        return SubscriptionStatusResponse(is_active=False)

    def _activate_subscription(self, user: User, plan_code: str, gross_amount: Decimal) -> None:
        plan = self.plans.get(plan_code)
        if not plan:
            logger.warning("Unknown plan during activation", plan_code=plan_code)
            return

        expires_at = datetime.now(timezone.utc) + timedelta(days=plan.duration_days)
        user.is_active = True
        user.subscription_plan = plan_code
        user.subscription_expires_at = expires_at

        api_key = (
            self.db.query(ApiKey)
            .filter(ApiKey.user_id == user.id, ApiKey.plan_code == plan_code)
            .first()
        )

        if api_key:
            api_key.is_active = True
            api_key.expires_at = expires_at
        else:
            api_key = ApiKey(
                user_id=user.id,
                access_token=str(uuid4()),
                plan_code=plan_code,
                expires_at=expires_at,
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            self.db.add(api_key)

        self.db.commit()
        logger.info("Subscription activated", user_id=str(user.id), plan=plan_code, amount=str(gross_amount))
