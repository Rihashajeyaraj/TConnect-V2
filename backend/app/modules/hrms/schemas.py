from typing import Optional, List
from pydantic import BaseModel, validator
import re


class EmployeeCreate(BaseModel):
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[str] = None
    department: Optional[str] = "Sales & Business Development"
    designation: Optional[str] = "Sales Executive"
    role: Optional[str] = "Sales Executive"
    organization: Optional[str] = "TwiteConnect Technologies"
    company_id: Optional[str] = "TC-001"
    branch: Optional[str] = "Chennai Head Office"
    joining_date: Optional[str] = None
    password: Optional[str] = None
    send_welcome_email: Optional[bool] = True
    annual_leaves: Optional[int] = 12
    sick_leaves: Optional[int] = 10
    other_leaves: Optional[int] = 10
    half_day_permissions: Optional[int] = 6
    short_permissions: Optional[int] = 2
    incentive_percentage: Optional[float] = 5.0

    @validator("phone", "mobile", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return v
        val_str = str(v).strip()
        if val_str == "—" or val_str == "":
            return None
        cleaned = re.sub(r"\D", "", val_str)
        if cleaned in ("", "91", "0") or len(cleaned) < 5:
            return None
        if len(cleaned) == 12 and cleaned.startswith("91"):
            cleaned = cleaned[2:]
        elif len(cleaned) == 11 and cleaned.startswith("0"):
            cleaned = cleaned[1:]
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError("Enter a valid contact number (10 to 15 digits).")
        return cleaned


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    annual_leaves: Optional[int] = None
    sick_leaves: Optional[int] = None
    other_leaves: Optional[int] = None
    half_day_permissions: Optional[int] = None
    short_permissions: Optional[int] = None
    incentive_percentage: Optional[float] = None

    # Profile & Banking Details
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    work_location: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    pan_id: Optional[str] = None
    personal_email: Optional[str] = None
    alternate_contact: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    primary_skills: Optional[str] = None
    secondary_skills: Optional[str] = None
    tools: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_relationship: Optional[str] = None
    emergency_contact: Optional[str] = None
    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    branch: Optional[str] = None
    profile_photo: Optional[str] = None

    @validator("phone", "mobile", "alternate_contact", "emergency_contact", pre=True, allow_reuse=True)
    def validate_phone_number(cls, v):
        if not v:
            return v
        val_str = str(v).strip()
        if val_str == "—" or val_str == "":
            return None
        cleaned = re.sub(r"\D", "", val_str)
        if cleaned in ("", "91", "0") or len(cleaned) < 5:
            return None
        if len(cleaned) == 12 and cleaned.startswith("91"):
            cleaned = cleaned[2:]
        elif len(cleaned) == 11 and cleaned.startswith("0"):
            cleaned = cleaned[1:]
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError("Enter a valid contact number (10 to 15 digits).")
        return cleaned


class EmployeeResponse(BaseModel):
    id: Optional[str] = None
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = True
    annual_leaves: Optional[int] = 12
    sick_leaves: Optional[int] = 10
    other_leaves: Optional[int] = 10
    half_day_permissions: Optional[int] = 6
    short_permissions: Optional[int] = 2
    incentive_percentage: Optional[float] = 5.0

    # Profile & Banking Details
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    work_location: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    pan_id: Optional[str] = None
    personal_email: Optional[str] = None
    alternate_contact: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    primary_skills: Optional[str] = None
    secondary_skills: Optional[str] = None
    tools: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_relationship: Optional[str] = None
    emergency_contact: Optional[str] = None
    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    branch: Optional[str] = None
    profile_photo: Optional[str] = None


class SalaryUpdate(BaseModel):
    monthly_salary: float

