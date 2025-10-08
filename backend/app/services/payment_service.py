from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import uuid4

from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User
from app.schemas.payment import (
    PaymentPlan, PaymentCreateResponse, PaymentWebhookRequest,
    PaymentHistoryResponse, SubscriptionStatusResponse
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
        """Create payment transaction"""
        if plan_code not in self.plans:
            raise ValueError(f"Invalid plan code: {plan_code}")
        
        plan = self.plans[plan_code]
        
        # Generate order_id FIRST before using it
        user_prefix = str(user.id).replace("-", "")[:10]
        order_id = f"ORD-{user_prefix}-{uuid4().hex[:6]}"
        
        # Check if we have real Midtrans credentials
        if settings.MIDTRANS_SERVER_KEY and settings.MIDTRANS_CLIENT_KEY:
            # Use real Midtrans
            snap_token = self._create_midtrans_transaction(order_id, plan, user)
        else:
            # Use mock for development
            snap_token = f"mock_snap_token_{uuid4().hex[:8]}"
        
        # Create payment record only if Payment model exists
        if PAYMENT_MODEL_AVAILABLE:
            try:
                payment = Payment(
                    user_id=user.id,
                    order_id=order_id,
                    gross_amount=plan.price,
                    plan_code=plan_code,
                    transaction_status="pending"
                )
                self.db.add(payment)
                self.db.commit()
            except Exception as e:
                # If payment table doesn't exist, continue without saving
                pass

        return PaymentCreateResponse(
            snap_token=snap_token,
            order_id=order_id,
            gross_amount=plan.price
        )

    def _create_midtrans_transaction(self, order_id: str, plan: PaymentPlan, user: User) -> str:
        """Create Midtrans Snap transaction"""
        import requests
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
            # Log the actual error for debugging
            print(f"Midtrans API Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
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
            payment.transaction_time = datetime.utcnow()
            
            # If payment successful, activate user subscription
            if webhook_data.transaction_status == "settlement":
                user = self.db.query(User).filter(User.id == payment.user_id).first()
                if user:
                    plan = self.plans[payment.plan_code]
                    user.is_active = True
                    if hasattr(user, 'subscription_expires_at'):
                        user.subscription_expires_at = datetime.utcnow() + timedelta(days=plan.duration_days)
                    if hasattr(user, 'subscription_plan'):
                        user.subscription_plan = payment.plan_code
            
            self.db.commit()
            return True
        except Exception:
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
            # Check if user has subscription fields
            if not hasattr(user, 'subscription_expires_at'):
                # For development, return active status
                return SubscriptionStatusResponse(
                    is_active=True,
                    expires_at=None,
                    plan_code="DEV",
                    days_remaining=999
                )
            
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
                expires_at=getattr(user, 'subscription_expires_at', None),
                plan_code=getattr(user, 'subscription_plan', 'DEV'),
                days_remaining=days_remaining
            )
        except Exception:
            # If any error occurs, return active status for development
            return SubscriptionStatusResponse(
                is_active=True,
                expires_at=None,
                plan_code="DEV"
            )
