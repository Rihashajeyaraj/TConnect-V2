from typing import Optional, List
from pydantic import BaseModel, EmailStr


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
