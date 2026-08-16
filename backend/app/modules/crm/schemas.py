from typing import Optional
from pydantic import BaseModel, Extra, validator
import re


class LeadCreate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_person: Optional[str] = None
    person: Optional[str] = None
    name: Optional[str] = None
    contact_email: Optional[str] = None
    email: Optional[str] = None
    contact_phone: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = "Hot"
    priority: Optional[str] = "High"
    value: Optional[str] = "450000"
    expected_value: Optional[str] = "450000"
    source: Optional[str] = "Field Research (SE)"
    status: Optional[str] = "New"
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assignedTo: Optional[str] = None
    assignedToEmail: Optional[str] = None
    employee_id: Optional[str] = None
    employee_code: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("phone", "mobile", "contact_phone", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return v
        cleaned = re.sub(r"\D", "", str(v))
        if len(cleaned) != 10:
            raise ValueError("Enter a valid 10-digit phone number.")
        return cleaned

    class Config:
        extra = Extra.allow


class LeadUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    company: Optional[str] = None
    contact_name: Optional[str] = None
    contact_person: Optional[str] = None
    person: Optional[str] = None
    contact_email: Optional[str] = None
    email: Optional[str] = None
    contact_phone: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    value: Optional[str] = None
    expected_value: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("phone", "mobile", "contact_phone", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return v
        cleaned = re.sub(r"\D", "", str(v))
        if len(cleaned) != 10:
            raise ValueError("Enter a valid 10-digit phone number.")
        return cleaned

    class Config:
        extra = Extra.allow


class LeadResponse(BaseModel):
    id: Optional[str] = None
    lead_id: Optional[str] = None
    title: Optional[str] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = "Hot"
    priority: Optional[str] = "High"
    value: Optional[str] = None
    status: Optional[str] = "New"
    source: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
