from typing import Optional
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    # Core required fields
    category: str
    amount: float
    description: Optional[str] = ""
    currency: Optional[str] = "INR"
    receipt_url: Optional[str] = None

    # Employee identity (set from JWT in service, also accepted from frontend)
    employee_id: Optional[str] = None
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    employee_phone: Optional[str] = None
    user_id: Optional[str] = None

    # Visit/Customer context
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    visit_id: Optional[str] = None
    location: Optional[str] = None

    # Metadata
    date: Optional[str] = None
    submitted_date: Optional[str] = None
    remarks: Optional[str] = None
    bill_file_name: Optional[str] = None


class ExpenseApproval(BaseModel):
    status: str
    remarks: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    category: str
    amount: float
    currency: str
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: str
