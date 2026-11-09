from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.email_log import EmailEventType, DeliveryStatus

class EmailLogResponse(BaseModel):
    id: int
    recipient_email: str
    recipient_name: str
    subject: str
    body_text: str
    event_type: EmailEventType
    related_order_id: Optional[int] = None
    delivery_status: DeliveryStatus
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

