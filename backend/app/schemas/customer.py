from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=30)
    address: str = Field(..., min_length=3)
    city: Optional[str] = None
    company_name: Optional[str] = None
    is_active: bool = True

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=5, max_length=30)
    address: Optional[str] = Field(None, min_length=3)
    city: Optional[str] = None
    company_name: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

