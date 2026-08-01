from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class LeadModel(BaseModel):
    id: Optional[str] = None
    title: str
    company_name: Optional[str] = None
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: str = "NEW"
    source: Optional[str] = None
    address: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
