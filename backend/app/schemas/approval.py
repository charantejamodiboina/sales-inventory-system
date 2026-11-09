from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.approval import ApprovalAction

class ApprovalDecisionRequest(BaseModel):
    action: ApprovalAction
    comments: Optional[str] = Field(None, max_length=500)

class ApprovalResponse(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    decided_by_user_id: int
    decided_by_username: Optional[str] = None
    action: ApprovalAction
    comments: Optional[str] = None
    threshold_amount: float
    order_total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

