from typing import Optional, List
from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    department: str
    designation: str
    role: Optional[str] = "Sales Executive"


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
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
    department: str
    designation: str
    role: str
    is_active: bool = True
