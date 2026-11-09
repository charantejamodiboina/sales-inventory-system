from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="General", nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    cost_price = Column(Numeric(12, 2), default=0.00, nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    reorder_threshold = Column(Integer, default=10, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order_items = relationship("SalesOrderItem", back_populates="product")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product")

