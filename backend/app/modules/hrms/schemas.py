from typing import Optional, List
from pydantic import BaseModel


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


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: Optional[str] = None
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[str] = None
    department: str
    designation: str
    role: str
    is_active: bool = True
