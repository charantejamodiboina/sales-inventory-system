from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.order import OrderStatus

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1)
    discount_amount: float = Field(default=0.0, ge=0)
    tax_rate: float = Field(default=0.05, ge=0, le=1.0)  # e.g. 5% default tax
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    customer_name: Optional[str] = None
    created_by_user_id: int
    created_by_username: Optional[str] = None
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    status: OrderStatus
    approval_required: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderApprovalHistoryItem(BaseModel):
    id: int
    decided_by_username: Optional[str] = None
    action: str
    comments: Optional[str] = None
    threshold_amount: float
    order_total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

class OrderDetailResponse(OrderResponse):
    items: List[OrderItemResponse] = []
    approval_history: List[OrderApprovalHistoryItem] = []

