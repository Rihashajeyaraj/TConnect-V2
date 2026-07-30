from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class NotificationModel(BaseModel):
    id: Optional[str] = None
    recipient_id: str
    title: str
    message: str
    type: str = "INFO"
    is_read: bool = False
    created_at: Optional[datetime] = None
