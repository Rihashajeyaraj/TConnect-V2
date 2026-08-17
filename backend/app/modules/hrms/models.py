from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class EmployeeModel(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[str] = None  # URL or JSON array string of uploaded employee documents
    department: str
    designation: str
    role: str = "Sales Executive"
    is_active: bool = True
    annual_leaves: Optional[int] = 12
    half_day_permissions: Optional[int] = 6
    short_permissions: Optional[int] = 2
    incentive_percentage: Optional[float] = 5.0
    created_at: Optional[datetime] = None


class DepartmentModel(BaseModel):
    id: Optional[str] = None
    name: str
    code: str
    description: Optional[str] = None
