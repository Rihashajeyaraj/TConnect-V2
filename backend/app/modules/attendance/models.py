from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class AttendanceLogModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    clock_in_time: str
    clock_out_time: Optional[str] = None
    clock_in_lat: Optional[float] = None
    clock_in_lng: Optional[float] = None
    location_name: Optional[str] = None  # Visit location name/address
    status: str = "PRESENT"
    notes: Optional[str] = None
    remarks: Optional[str] = None  # Sales executive remarks on location visit
    created_at: Optional[datetime] = None


class LeaveRequestModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    status: str = "PENDING"
    created_at: Optional[datetime] = None
