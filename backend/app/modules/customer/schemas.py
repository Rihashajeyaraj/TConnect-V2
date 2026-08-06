from typing import Optional
from pydantic import BaseModel, Extra


class CustomerCreate(BaseModel):
    account_name: Optional[str] = None
    company_name: Optional[str] = None
    company: Optional[str] = None
    name: Optional[str] = None
    contact_person: Optional[str] = None
    person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    industry: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    accountManager: Optional[str] = None
    employee_id: Optional[str] = None
    employee_code: Optional[str] = None
    lead_id: Optional[str] = None
    value: Optional[str] = None
    revenue: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = Extra.allow


class CustomerUpdate(BaseModel):
    account_name: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

    class Config:
        extra = Extra.allow


class CustomerResponse(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    account_name: Optional[str] = None
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
