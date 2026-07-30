from typing import Optional
from pydantic import BaseModel


class VisitCreate(BaseModel):
    title: str
    customer_id: str
    purpose: str
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None


class VisitCheckIn(BaseModel):
    latitude: float
    longitude: float
    check_in_notes: Optional[str] = None


class VisitCheckOut(BaseModel):
    latitude: float
    longitude: float
    summary_notes: Optional[str] = None


class VisitResponse(BaseModel):
    id: Optional[str] = None
    title: str
    customer_id: str
    visitor_id: str
    purpose: str
    status: str
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
