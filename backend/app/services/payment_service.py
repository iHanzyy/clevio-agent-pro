from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from sqlalchemy.orm import Session
from sqlalchemy import update
from app.core.config import settings
from app.core.logging import logger
from app.models.user import User
from app.models import Payment, ApiKey
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
        
        logger.info(f"Creating payment for user {user.id}, plan: {plan_code}")
        
        # Check if we have real Midtrans credentials
        if settings.MIDTRANS_SERVER_KEY and settings.MIDTRANS_CLIENT_KEY:
            # Use real Midtrans
            snap_token = self._create_midtrans_transaction(order_id, plan, user)
            logger.info(f"Real Midtrans token created: {snap_token[:20]}...")
        else:
            # Use mock for development - IMMEDIATELY activate user
            snap_token = f"mock_snap_token_{uuid4().hex[:8]}"
            logger.info(f"🎭 MOCK PAYMENT MODE - Activating user {user.id}")
            
            try:
                # Calculate expiration date
                expires_at = datetime.now(timezone.utc) + timedelta(days=plan.duration_days)
                
                # Step 1: Update user status
                result = self.db.execute(
                    update(User)
                    .where(User.id == user.id)
                    .values(
                        is_active=True,
                        subscription_expires_at=expires_at,
                        subscription_plan=plan_code
                    )
                )
                
                logger.info(f"✅ User status updated, rows affected: {result.rowcount}")
                
                # Step 2: Create or update API key for the user
                existing_key = self.db.query(ApiKey).filter(
                    ApiKey.user_id == user.id,
                    ApiKey.plan_code == plan_code
                ).first()
                
                if existing_key:
                    # Update existing key
                    existing_key.is_active = True
                    existing_key.expires_at = expires_at
                    logger.info(f"♻️ Updated existing API key: {existing_key.id}")
                else:
                    # Create new API key
                    api_key = ApiKey(
                        user_id=user.id,
                        key=f"sk-{uuid4().hex}",
                        plan_code=plan_code,
                        expires_at=expires_at,
                        is_active=True
                    )
                    self.db.add(api_key)
                    logger.info(f"🔑 Created new API key for user")
                
                # Commit all changes
                self.db.commit()
                
                # Verify the update
                updated_user = self.db.query(User).filter(User.id == user.id).first()
                api_keys_count = self.db.query(ApiKey).filter(
                    ApiKey.user_id == user.id,
                    ApiKey.is_active == True
                ).count()
                
                logger.info(
                    f"✅ MOCK PAYMENT ACTIVATION COMPLETE",
                    user_id=str(updated_user.id),
                    is_active=updated_user.is_active,
                    plan=getattr(updated_user, 'subscription_plan', None),
                    expires_at=getattr(updated_user, 'subscription_expires_at', None),
                    active_api_keys=api_keys_count
                )
                
                if not updated_user.is_active:
                    logger.error(f"❌ WARNING: User {user.id} is still inactive after update!")
                    raise Exception("Failed to activate user")
                
                if api_keys_count == 0:
                    logger.error(f"❌ WARNING: No active API keys for user {user.id}!")
                    raise Exception("Failed to create API key")
                    
            except Exception as e:
                logger.error(f"❌ Failed to activate user in mock mode: {e}")
                self.db.rollback()
                raise
        
        # Create payment record only if Payment model exists
        if PAYMENT_MODEL_AVAILABLE:
            try:
                # Set status to 'settlement' immediately for mock payments
                payment_status = "settlement" if snap_token.startswith("mock_") else "pending"
                
                payment = Payment(
                    user_id=user.id,
                    order_id=order_id,
                    gross_amount=plan.price,
                    plan_code=plan_code,
                    transaction_status=payment_status,
                    transaction_time=datetime.now(timezone.utc) if payment_status == "settlement" else None
                )
                self.db.add(payment)
                self.db.commit()
                logger.info(f"💳 Payment record created: {order_id}, status: {payment_status}")
            except Exception as e:
                logger.error(f"Payment record creation failed: {e}")
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
                    else:
                        api_key = ApiKey(
                            user_id=user.id,
                            key=f"sk-{uuid4().hex}",
                            plan_code=payment.plan_code,
                            expires_at=expires_at,
                            is_active=True
                        )
                        self.db.add(api_key)
            
            self.db.commit()
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
