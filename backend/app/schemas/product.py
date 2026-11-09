from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    category: str = "General"
    unit_price: float = Field(..., gt=0)
    cost_price: float = Field(default=0.0, ge=0)
    current_stock: int = Field(default=0, ge=0)
    reorder_threshold: int = Field(default=10, ge=0)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, ge=0)
    reorder_threshold: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductStockAdjust(BaseModel):
    quantity_change: int
    notes: Optional[str] = "Manual inventory adjustment"

