from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class AuditLogModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    action: str
    resource: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None
