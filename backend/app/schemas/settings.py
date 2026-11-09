from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: str
    description: Optional[str] = None
    updated_at: datetime
    updated_by_username: Optional[str] = None

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    setting_value: str = Field(..., min_length=1)
    description: Optional[str] = None

