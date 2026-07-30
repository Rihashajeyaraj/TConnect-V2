from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class CustomerModel(BaseModel):
    id: Optional[str] = None
    account_name: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
