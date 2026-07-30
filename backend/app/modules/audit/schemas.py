from typing import Optional, Dict, Any
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: Optional[str] = None
    user_id: str
    action: str
    resource: str
    details: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
