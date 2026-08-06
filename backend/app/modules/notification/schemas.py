from typing import Optional
from pydantic import BaseModel, Extra


class NotificationCreate(BaseModel):
    recipient_id: Optional[str] = None
    recipient_role: Optional[str] = "all"
    recipientRole: Optional[str] = "all"
    employee_id: Optional[str] = None
    employee_code: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    title: Optional[str] = "System Notification"
    message: Optional[str] = ""
    type: Optional[str] = "INFO"
    notification_type: Optional[str] = None
    reference_module: Optional[str] = "CRM"
    module: Optional[str] = None
    is_read: Optional[bool] = False
    read: Optional[bool] = False

    class Config:
        extra = Extra.allow


class NotificationResponse(BaseModel):
    id: Optional[str] = None
    recipient_id: Optional[str] = None
    employee_id: Optional[str] = None
    title: str
    message: str
    type: str = "INFO"
    is_read: bool = False
    created_at: Optional[str] = None
