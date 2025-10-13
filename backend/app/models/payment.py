from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(64), unique=True, nullable=False, index=True)
    plan_code = Column(String(16), nullable=False)
    gross_amount = Column(Numeric(12, 2), nullable=False)
    transaction_status = Column(String(32), nullable=False, default="pending")
    payment_type = Column(String(64), nullable=True)
    transaction_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Payment order={self.order_id} status={self.transaction_status}>"
