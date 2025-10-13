from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class PaymentPlan(BaseModel):
    code: str
    name: str
    price: Decimal
    duration_days: int


class PaymentCreateRequest(BaseModel):
    plan_code: str


class PaymentCreateResponse(BaseModel):
    order_id: str
    gross_amount: Decimal
    status: str
    message: str
    redirect_url: Optional[str] = None


class PaymentWebhookRequest(BaseModel):
    order_id: str
    transaction_status: str
    transaction_id: Optional[str] = None
    gross_amount: Optional[str] = None
    payment_type: Optional[str] = None
    transaction_time: Optional[str] = None


class PaymentHistoryResponse(BaseModel):
    id: UUID
    order_id: str
    gross_amount: Decimal
    plan_code: str
    transaction_status: str
    created_at: datetime


class SubscriptionStatusResponse(BaseModel):
    is_active: bool
    expires_at: Optional[datetime] = None
    plan_code: Optional[str] = None
    days_remaining: Optional[int] = None
