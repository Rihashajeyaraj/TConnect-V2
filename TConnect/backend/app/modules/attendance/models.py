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
    status: str = "PRESENT"
    notes: Optional[str] = None
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
