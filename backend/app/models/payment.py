from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base
import uuid


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(String(100), unique=True, nullable=False)
    transaction_id = Column(String(200), nullable=True)
    gross_amount = Column(Numeric(10, 2), nullable=False)
    plan_code = Column(String(10), nullable=False)
    payment_type = Column(String(50), nullable=True)
    transaction_status = Column(String(50), default="pending")
    transaction_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="payments")

    def __repr__(self):
        return f"<Payment(id={self.id}, order_id={self.order_id}, status={self.transaction_status})>"
