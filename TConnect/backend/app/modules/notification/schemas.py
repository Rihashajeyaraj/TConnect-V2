from typing import Optional
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    recipient_id: str
    title: str
    message: str
    type: Optional[str] = "INFO"


class NotificationResponse(BaseModel):
    id: Optional[str] = None
    recipient_id: str
    title: str
    message: str
    type: str
    is_read: bool = False
