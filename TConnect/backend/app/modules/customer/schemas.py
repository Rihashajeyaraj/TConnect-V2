from typing import Optional
from pydantic import BaseModel


class CustomerCreate(BaseModel):
    account_name: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None


class CustomerUpdate(BaseModel):
    account_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: Optional[str] = None
    account_name: str
    contact_person: str
    email: str
    phone: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
