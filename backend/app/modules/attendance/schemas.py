from typing import Optional
from pydantic import BaseModel


class ClockInRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class ClockOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    summary: Optional[str] = None


class LeaveCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str


class AttendanceResponse(BaseModel):
    id: Optional[str] = None
    user_id: str
    clock_in_time: str
    clock_out_time: Optional[str] = None
    status: str
    notes: Optional[str] = None
