from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(String(100), unique=True, nullable=False)
    transaction_id = Column(String(200), nullable=True)
    gross_amount = Column(Numeric(10, 2), nullable=False)  # Changed from Decimal to Numeric
    plan_code = Column(String(10), nullable=False)  # PRO_M or PRO_Y
    payment_type = Column(String(50), nullable=True)
    transaction_status = Column(String(50), default="pending")
    transaction_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="payments")
