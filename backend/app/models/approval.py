import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Text, Numeric, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ApprovalAction(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class OrderApproval(Base):
    __tablename__ = "order_approvals"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    decided_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(Enum(ApprovalAction), nullable=False)
    comments = Column(Text, nullable=True)
    threshold_amount = Column(Numeric(12, 2), nullable=False)
    order_total_amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("SalesOrder", back_populates="approvals")
    decided_by_user = relationship("User", back_populates="approvals")

