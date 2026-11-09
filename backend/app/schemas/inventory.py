from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.inventory import InventoryChangeType

class InventoryTransactionResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    change_type: InventoryChangeType
    quantity_change: int
    previous_stock: int
    new_stock: int
    reference_order_id: Optional[int] = None
    performed_by_username: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RestockRequest(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = "Manual restock"

