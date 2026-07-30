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
    department: str
    designation: str
    role: str = "Sales Executive"
    is_active: bool = True
    created_at: Optional[datetime] = None


class DepartmentModel(BaseModel):
    id: Optional[str] = None
    name: str
    code: str
    description: Optional[str] = None
