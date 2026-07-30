from typing import Optional
from pydantic import BaseModel


class OpportunityCreate(BaseModel):
    title: str
    customer_name: str
    expected_revenue: float
    stage: Optional[str] = "QUALIFICATION"
    probability: Optional[int] = 20
    expected_closing_date: Optional[str] = None


class OpportunityUpdateStage(BaseModel):
    stage: str
    probability: Optional[int] = None
    notes: Optional[str] = None


class OpportunityResponse(BaseModel):
    id: Optional[str] = None
    title: str
    customer_name: str
    expected_revenue: float
    stage: str
    probability: int
    owner_id: Optional[str] = None
