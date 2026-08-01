from typing import Optional
from pydantic import BaseModel


class OpportunityCreate(BaseModel):
    title: str
    customer_name: str
    expected_revenue: float
    stage: Optional[str] = "QUALIFICATION"
    expected_closing_date: Optional[str] = None


class OpportunityUpdateStage(BaseModel):
    stage: str
    notes: Optional[str] = None


class OpportunityResponse(BaseModel):
    id: Optional[str] = None
    title: str
    customer_name: str
    expected_revenue: float
    stage: str
    owner_id: Optional[str] = None
