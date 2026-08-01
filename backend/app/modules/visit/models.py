from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class VisitModel(BaseModel):
    id: Optional[str] = None
    title: str
    customer_id: str
    visitor_id: str
    purpose: str
    status: str = "SCHEDULED"
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None  # Location / Site address visited
    notes: Optional[str] = None
    remarks: Optional[str] = None  # Executive remarks after visit
    created_at: Optional[datetime] = None
