from typing import Optional, Any
from pydantic import BaseModel, ConfigDict


class OpportunityCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: Optional[str] = None
    company: Optional[str] = None
    customer_name: Optional[str] = None
    expected_revenue: Optional[float] = None
    value: Optional[Any] = None
    stage: Optional[str] = "Lead"
    probability: Optional[int] = 30
    rep: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    expected_closing_date: Optional[str] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None


class OpportunityUpdateStage(BaseModel):
    model_config = ConfigDict(extra="allow")

    stage: str
    probability: Optional[int] = None
    notes: Optional[str] = None


class OpportunityResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    customer_name: Optional[str] = None
    expected_revenue: Optional[float] = None
    value: Optional[Any] = None
    stage: Optional[str] = None
    probability: Optional[int] = None
    owner_id: Optional[str] = None

