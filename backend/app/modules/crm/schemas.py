from typing import Optional, List
from pydantic import BaseModel


class LeadCreate(BaseModel):
    title: str
    company_name: Optional[str] = None
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = "Website"
    assigned_to: Optional[str] = None


class LeadUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    assigned_to: Optional[str] = None


class LeadResponse(BaseModel):
    id: Optional[str] = None
    title: str
    company_name: Optional[str] = None
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    status: str = "NEW"
    source: Optional[str] = None
    assigned_to: Optional[str] = None
