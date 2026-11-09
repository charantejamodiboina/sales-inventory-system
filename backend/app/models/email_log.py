import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class EmailEventType(str, enum.Enum):
    APPROVAL_REQUEST = "APPROVAL_REQUEST"
    ORDER_APPROVED = "ORDER_APPROVED"
    ORDER_REJECTED = "ORDER_REJECTED"

class DeliveryStatus(str, enum.Enum):
    SENT = "SENT"
    FALLBACK_LOGGED = "FALLBACK_LOGGED"
    FAILED = "FAILED"

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(100), nullable=False)
    recipient_name = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    body_text = Column(Text, nullable=False)
    event_type = Column(Enum(EmailEventType), nullable=False)
    related_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=True)
    delivery_status = Column(Enum(DeliveryStatus), nullable=False, default=DeliveryStatus.FALLBACK_LOGGED)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("SalesOrder", back_populates="email_logs")

