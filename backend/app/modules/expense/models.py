from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ExpenseClaimModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    category: str
    amount: float
    currency: str = "INR"
    description: str
    receipt_url: Optional[str] = None
    status: str = "SUBMITTED"
    created_at: Optional[datetime] = None
