from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from sqlalchemy.orm import Session
import requests
from fastapi import HTTPException

from app.core.config import settings
from app.core.logging import logger
from app.models.user import User
from app.models import Payment, ApiKey
from app.schemas.payment import (
    PaymentPlan,
    PaymentCreateResponse,
    PaymentWebhookRequest,
    PaymentHistoryResponse,
    SubscriptionStatusResponse,
)

# Import Payment model only if it exists
try:
    from app.models.payment import Payment
    PAYMENT_MODEL_AVAILABLE = True
except ImportError:
    PAYMENT_MODEL_AVAILABLE = False


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
        """Initiate payment via N8N webhook (or mock fallback)."""
        if plan_code not in self.plans:
            raise HTTPException(status_code=400, detail="Invalid plan code")

        plan = self.plans[plan_code]

        user_prefix = str(user.id).replace("-", "")[:10]
        order_id = f"ORD-{user_prefix}-{uuid4().hex[:6]}"

        logger.info("Creating payment", user_id=str(user.id), plan=plan_code)

        webhook_url = settings.N8N_MIDTRANS_WEBHOOK_URL
        if not webhook_url:
            logger.error(
                "N8N_MIDTRANS_WEBHOOK_URL is not configured; cannot initiate payment",
                user_id=str(user.id),
                plan_code=plan_code,
            )
            raise HTTPException(
                status_code=503,
                detail="Payment processor is not configured. Please contact support.",
            )

        status = "pending"
        message = "Payment request submitted. Please follow the instructions sent by our payment partner."
        redirect_url: Optional[str] = None

        payload_for_n8n = {
            "user_id": str(user.id),
            "email": str(user.email),
            "plan_code": str(plan_code),
            "harga": str(plan.price),
        }

        try:
            response = requests.post(
                webhook_url,
                json=payload_for_n8n,
                timeout=15,
            )
            response.raise_for_status()
            logger.info("Forwarded payment request to n8n", order_id=order_id, status_code=response.status_code)

            try:
                response_payload = response.json()
            except ValueError:
                response_payload = {}

            if isinstance(response_payload, dict):
                redirect_url = response_payload.get("redirect_url") or response_payload.get("redirectUrl")
                message = response_payload.get("message", message)
            else:
                logger.debug("n8n response not JSON", payload=str(response_payload))
        except Exception as exc:
            logger.error("Failed to invoke n8n Midtrans webhook", order_id=order_id, error=str(exc))
            raise HTTPException(status_code=502, detail="Failed to contact payment processor. Please try again shortly.")

        if PAYMENT_MODEL_AVAILABLE:
            try:
                payment = Payment(
                    user_id=user.id,
                    order_id=order_id,
                    gross_amount=plan.price,
                    plan_code=plan_code,
                    transaction_status="pending" if status == "pending" else "settlement",
                    transaction_time=datetime.now(timezone.utc) if status == "completed" else None,
                )
                self.db.add(payment)
                self.db.commit()
                logger.info("Payment record stored", order_id=order_id, status=payment.transaction_status)
            except Exception as exc:
                logger.error("Failed to persist payment record", error=str(exc))
                self.db.rollback()

        return PaymentCreateResponse(
            order_id=order_id,
            gross_amount=plan.price,
            status=status,
            message=message,
            redirect_url=redirect_url,
        )

    def _activate_mock_subscription(self, user: User, plan_code: str) -> None:
        plan = self.plans[plan_code]
        expires_at = datetime.now(timezone.utc) + timedelta(days=plan.duration_days)

        user.is_active = True
        if hasattr(user, "subscription_expires_at"):
            user.subscription_expires_at = expires_at
        if hasattr(user, "subscription_plan"):
            user.subscription_plan = plan_code

        existing_key = self.db.query(ApiKey).filter(
            ApiKey.user_id == user.id,
            ApiKey.plan_code == plan_code,
        ).first()

        if existing_key:
            existing_key.is_active = True
            existing_key.expires_at = expires_at
            existing_key.access_token = existing_key.access_token or f"sk-{uuid4().hex}"
        else:
            api_key = ApiKey(
                user_id=user.id,
                access_token=f"sk-{uuid4().hex}",
                plan_code=plan_code,
                expires_at=expires_at,
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            self.db.add(api_key)

        self.db.commit()
        self.db.refresh(user)

    def _create_midtrans_transaction(self, order_id: str, plan: PaymentPlan, user: User) -> str:
        """Create Midtrans Snap transaction (legacy fallback)."""
        import base64

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
            logger.error(f"Midtrans API Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            raise Exception(f"Failed to create Midtrans transaction: {str(e)}")

    def handle_webhook(self, webhook_data: PaymentWebhookRequest) -> bool:
        """Handle Midtrans webhook notification"""
        if not PAYMENT_MODEL_AVAILABLE:
            return True

        try:
            payment = self.db.query(Payment).filter(
                Payment.order_id == webhook_data.order_id
            ).first()

            if not payment:
                return False

            # Update payment status
            payment.transaction_status = webhook_data.transaction_status
            payment.transaction_id = webhook_data.transaction_id
            payment.transaction_time = datetime.now(timezone.utc)

            # If payment successful, activate user subscription
            user = None
            if webhook_data.transaction_status == "settlement":
                user = self.db.query(User).filter(User.id == payment.user_id).first()
                if user:
                    plan = self.plans[payment.plan_code]
                    expires_at = datetime.now(timezone.utc) + timedelta(days=plan.duration_days)

                    # Update user
                    user.is_active = True
                    if hasattr(user, 'subscription_expires_at'):
                        user.subscription_expires_at = expires_at
                    if hasattr(user, 'subscription_plan'):
                        user.subscription_plan = payment.plan_code

                    # Create/update API key
                    api_key = self.db.query(ApiKey).filter(
                        ApiKey.user_id == user.id
                    ).first()

                    if api_key:
                        api_key.is_active = True
                        api_key.expires_at = expires_at
                        api_key.plan_code = payment.plan_code
                        api_key.access_token = api_key.access_token or f"sk-{uuid4().hex}"
                    else:
                        api_key = ApiKey(
                            user_id=user.id,
                            access_token=f"sk-{uuid4().hex}",
                            plan_code=payment.plan_code,
                            expires_at=expires_at,
                            is_active=True,
                            created_at=datetime.now(timezone.utc)
                        )
                        self.db.add(api_key)

            self.db.commit()
            if webhook_data.transaction_status == "settlement" and user:
                self.db.refresh(user)
            return True
        except Exception as e:
            logger.error(f"Webhook processing failed: {e}")
            self.db.rollback()
            return False

    def get_payment_history(self, user: User) -> List[PaymentHistoryResponse]:
        """Get user's payment history"""
        if not PAYMENT_MODEL_AVAILABLE:
            return []

        try:
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
        except Exception:
            return []

    def get_subscription_status(self, user: User) -> SubscriptionStatusResponse:
        """Get user's current subscription status"""
        try:
            # Get the most recent active API key
            active_key = (
                self.db.query(ApiKey)
                .filter(
                    ApiKey.user_id == user.id,
                    ApiKey.is_active == True
                )
                .order_by(ApiKey.expires_at.desc())
                .first()
            )

            # Make sure we're comparing timezone-aware datetimes
            now = datetime.now(timezone.utc)

            if active_key:
                # Ensure expires_at is timezone-aware
                expires_at = active_key.expires_at
                if expires_at.tzinfo is None:
                    # If naive, assume UTC
                    expires_at = expires_at.replace(tzinfo=timezone.utc)

                is_active = expires_at > now

                logger.info(
                    f"📊 Subscription status check",
                    user_id=str(user.id),
                    is_active=is_active,
                    plan_code=active_key.plan_code,
                    expires_at=expires_at
                )

                return SubscriptionStatusResponse(
                    is_active=is_active,
                    plan_code=active_key.plan_code,
                    expires_at=expires_at
                )

            logger.warning(f"⚠️ No active API key found for user {user.id}")

            # Fallback to user record if available (e.g., activation occurred but key missing)
            if getattr(user, "is_active", False):
                return SubscriptionStatusResponse(
                    is_active=True,
                    plan_code=getattr(user, "subscription_plan", None),
                    expires_at=getattr(user, "subscription_expires_at", None)
                )

            return SubscriptionStatusResponse(
                is_active=False,
                plan_code=None,
                expires_at=None
            )

        except Exception as e:
            logger.error(f"Error getting subscription status: {str(e)}")
            # Return inactive status on error
            return SubscriptionStatusResponse(
                is_active=False,
                plan_code=None,
                expires_at=None
            )
