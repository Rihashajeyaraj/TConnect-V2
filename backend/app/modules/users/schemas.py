from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, validator
import re


class UserCreate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = "+91 99999 99999"
    emergency_contact: Optional[str] = None
    gender: Optional[str] = "Male"
    date_of_birth: Optional[str] = None
    password: str
    role: str = "Sales Executive"
    dept: Optional[str] = "Sales & Business Development"
    department: Optional[str] = "Sales & Business Development"
    employee_code: Optional[str] = None
    status: Optional[str] = "Active"
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    reporting_manager_email: Optional[str] = None
    annual_leaves: Optional[int] = 12
    half_day_permissions: Optional[int] = 6
    short_permissions: Optional[int] = 2
    incentive_percentage: Optional[float] = 5.0

    @validator("phone", "emergency_contact", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return None
        cleaned = re.sub(r"\D", "", str(v))
        if not cleaned:
            return None
        if len(cleaned) > 10:
            cleaned = cleaned[-10:]
        if len(cleaned) < 10:
            cleaned = cleaned.zfill(10)
        return cleaned


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    accessPassword: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    dept: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    reporting_manager_email: Optional[str] = None
    annual_leaves: Optional[int] = None
    half_day_permissions: Optional[int] = None
    short_permissions: Optional[int] = None
    incentive_percentage: Optional[float] = None

    @validator("phone", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return None
        cleaned = re.sub(r"\D", "", str(v))
        if not cleaned:
            return None
        if len(cleaned) > 10:
            cleaned = cleaned[-10:]
        if len(cleaned) < 10:
            cleaned = cleaned.zfill(10)
        return cleaned


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    dept: Optional[str] = None
    status: str
    lastLogin: Optional[str] = "Recently"
    accessPassword: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    reporting_manager_email: Optional[str] = None
    annual_leaves: Optional[int] = 12
    half_day_permissions: Optional[int] = 6
    short_permissions: Optional[int] = 2
    incentive_percentage: Optional[float] = 5.0


class AssignManagerRequest(BaseModel):
    manager_id: str
    executive_ids: List[str]
