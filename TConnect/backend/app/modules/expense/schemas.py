from typing import Optional
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str
    currency: Optional[str] = "INR"
    receipt_url: Optional[str] = None


class ExpenseApproval(BaseModel):
    status: str
    remarks: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: Optional[str] = None
    user_id: str
    category: str
    amount: float
    currency: str
    description: str
    receipt_url: Optional[str] = None
    status: str
