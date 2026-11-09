import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class InventoryChangeType(str, enum.Enum):
    INITIAL = "INITIAL"
    ORDER_DEDUCTION = "ORDER_DEDUCTION"
    RESTOCK = "RESTOCK"
    ADJUSTMENT = "ADJUSTMENT"
    REJECTION_RETURN = "REJECTION_RETURN"

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    change_type = Column(Enum(InventoryChangeType), nullable=False)
    quantity_change = Column(Integer, nullable=False)  # positive for additions, negative for deductions
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reference_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=True)
    performed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="inventory_transactions")
    reference_order = relationship("SalesOrder")
    performed_by_user = relationship("User")

