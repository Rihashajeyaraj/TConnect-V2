from typing import Optional
from pydantic import BaseModel, Extra, validator
import re


class CustomerCreate(BaseModel):
    """Direct Add customer — lead_id is OPTIONAL (not always needed)."""
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
    # Optional: link to an existing lead if one exists
    lead_id: Optional[str] = None
    value: Optional[str] = None
    revenue: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator("phone", "mobile", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return v
        cleaned = re.sub(r"\D", "", str(v))
        if len(cleaned) != 10:
            raise ValueError("Enter a valid 10-digit phone number.")
        return cleaned

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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contract_value: Optional[float] = None
    status: Optional[str] = None

    @validator("phone", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return v
        cleaned = re.sub(r"\D", "", str(v))
        if len(cleaned) != 10:
            raise ValueError("Enter a valid 10-digit phone number.")
        return cleaned

    class Config:
        extra = Extra.allow


class ConversionRequest(BaseModel):
    """
    Optional extra data supplied alongside a conversion request.
    All fields are optional — the service resolves missing fields
    from the source record (lead/followup/visit).
    """
    # Contact overrides (used when source record is incomplete)
    company_name: Optional[str] = None
    company: Optional[str] = None
    contact_person: Optional[str] = None
    person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    # Assignee (defaults to authenticated user)
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    # Optional lead link for visit/followup conversions
    lead_id: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        extra = Extra.allow


class ConversionResponse(BaseModel):
    """Envelope returned by all conversion endpoints."""
    customer: dict
    created: bool
    source: str
    match_reason: Optional[str] = None


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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
