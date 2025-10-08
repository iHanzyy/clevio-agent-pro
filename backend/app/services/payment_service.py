from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import uuid4
import requests
import json
import base64

from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User
from app.models.payment import Payment
from app.schemas.payment import (
    PaymentPlan, PaymentCreateResponse, PaymentWebhookRequest,
    PaymentHistoryResponse, SubscriptionStatusResponse
)


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

        # Payment plans
        self.plans = {
            "PRO_M": PaymentPlan(
                code="PRO_M",
                name="Pro Monthly",
                price=Decimal("100000"),  # Rp 100,000
                duration_days=30
            ),
            "PRO_Y": PaymentPlan(
                code="PRO_Y",
                name="Pro Yearly",
                price=Decimal("1000000"),  # Rp 1,000,000
                duration_days=365
            )
        }

    def get_plans(self) -> List[PaymentPlan]:
        """Get all available payment plans"""
        return list(self.plans.values())

    def create_payment(self, user: User, plan_code: str) -> PaymentCreateResponse:
        """Create Midtrans payment transaction"""
        if plan_code not in self.plans:
            raise ValueError(f"Invalid plan code: {plan_code}")

        plan = self.plans[plan_code]
        order_id = f"ORDER-{user.id}-{uuid4().hex[:8]}"

        # Create payment record
        payment = Payment(
            user_id=user.id,
            order_id=order_id,
            gross_amount=plan.price,
            plan_code=plan_code,
            transaction_status="pending"
        )
        self.db.add(payment)
        self.db.commit()

        # Create Midtrans Snap transaction
        snap_token = self._create_midtrans_transaction(order_id, plan, user)

        return PaymentCreateResponse(
            snap_token=snap_token,
            order_id=order_id,
            gross_amount=plan.price
        )

    def _create_midtrans_transaction(self, order_id: str, plan: PaymentPlan, user: User) -> str:
        """Create Midtrans Snap transaction"""
        # Create base64 encoded auth header
        auth_string = f"{settings.MIDTRANS_SERVER_KEY}:"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')

        # Midtrans API endpoint
        if settings.MIDTRANS_IS_PRODUCTION:
            url = "https://app.midtrans.com/snap/v1/transactions"
        else:
            url = "https://app.sandbox.midtrans.com/snap/v1/transactions"

        # Transaction details
        payload = {
            "transaction_details": {
                "order_id": order_id,
                "gross_amount": int(plan.price)
            },
            "customer_details": {
                "email": user.email,
                "first_name": user.email.split('@')[0]
            },
            "item_details": [{
                "id": plan.code,
                "price": int(plan.price),
                "quantity": 1,
                "name": plan.name
            }]
        }

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth_b64}"
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()

            result = response.json()
            return result["token"]

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to create Midtrans transaction: {str(e)}")

    def handle_webhook(self, webhook_data: PaymentWebhookRequest) -> bool:
        """Handle Midtrans webhook notification"""
        payment = self.db.query(Payment).filter(
            Payment.order_id == webhook_data.order_id
        ).first()

        if not payment:
            return False

        # Update payment status
        payment.transaction_status = webhook_data.transaction_status
        payment.transaction_id = webhook_data.transaction_id
        payment.transaction_time = datetime.utcnow()

        # If payment successful, activate user subscription
        if webhook_data.transaction_status == "settlement":
            user = self.db.query(User).filter(User.id == payment.user_id).first()
            if user:
                plan = self.plans[payment.plan_code]
                user.is_active = True
                user.subscription_expires_at = datetime.utcnow() + timedelta(days=plan.duration_days)
                user.subscription_plan = payment.plan_code

        self.db.commit()
        return True

    def get_payment_history(self, user: User) -> List[PaymentHistoryResponse]:
        """Get user's payment history"""
        payments = self.db.query(Payment).filter(
            Payment.user_id == user.id
        ).order_by(Payment.created_at.desc()).all()

        return [
            PaymentHistoryResponse(
                id=payment.id,
                order_id=payment.order_id,
                gross_amount=payment.gross_amount,
                plan_code=payment.plan_code,
                transaction_status=payment.transaction_status,
                created_at=payment.created_at
            )
            for payment in payments
        ]

    def get_subscription_status(self, user: User) -> SubscriptionStatusResponse:
        """Get user's current subscription status"""
        if not user.is_active:
            return SubscriptionStatusResponse(is_active=False)

        if user.subscription_expires_at and user.subscription_expires_at < datetime.utcnow():
            # Subscription expired, deactivate user
            user.is_active = False
            self.db.commit()
            return SubscriptionStatusResponse(is_active=False)

        days_remaining = None
        if user.subscription_expires_at:
            days_remaining = (user.subscription_expires_at - datetime.utcnow()).days

        return SubscriptionStatusResponse(
            is_active=True,
            expires_at=user.subscription_expires_at,
            plan_code=user.subscription_plan,
            days_remaining=days_remaining
        )
