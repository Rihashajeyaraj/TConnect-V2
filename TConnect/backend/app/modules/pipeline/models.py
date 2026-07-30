from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class OpportunityModel(BaseModel):
    id: Optional[str] = None
    title: str
    customer_name: str
    expected_revenue: float
    stage: str = "QUALIFICATION"
    probability: int = 20
    owner_id: Optional[str] = None
    expected_closing_date: Optional[str] = None
    created_at: Optional[datetime] = None
