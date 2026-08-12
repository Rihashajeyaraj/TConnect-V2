from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class EnrollmentRequest(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    face_data_url: Optional[str] = None
    biometric_hash: Optional[str] = None
    face_template_vector: Optional[List[float]] = None
    device_info: Optional[str] = None
    liveness_verified: Optional[bool] = True
    liveness_challenge_action: Optional[str] = None


class LivenessVerifyRequest(BaseModel):
    employee_id: Optional[str] = None
    challenge_type: str  # "blink", "head_turn", "smile"
    motion_metrics: Optional[Dict[str, Any]] = None
    frame_sample: Optional[str] = None


class FaceMatchRequest(BaseModel):
    live_face_vector: List[float]
    target_employee_id: Optional[str] = None
    threshold: Optional[float] = 0.85


class ClockInRequest(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    attendance_date: Optional[str] = None
    check_in_time: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    check_in_latitude: Optional[float] = None
    check_in_longitude: Optional[float] = None
    check_in_address: Optional[str] = None
    location_name: Optional[str] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    enrollment_status: Optional[str] = "ENROLLED"
    attendance_status: Optional[str] = "Present"
    verified_by_face: Optional[bool] = True
    liveness_verified: Optional[bool] = True
    liveness_score: Optional[float] = 0.98
    face_match_confidence: Optional[float] = 0.95
    notes: Optional[str] = None
    remarks: Optional[str] = None
    verification_token: Optional[str] = None


class ClockOutRequest(BaseModel):
    attendance_id: Optional[str] = None
    employee_id: Optional[str] = None
    attendance_date: Optional[str] = None
    check_out_time: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    check_out_latitude: Optional[float] = None
    check_out_longitude: Optional[float] = None
    check_out_address: Optional[str] = None
    total_working_hours: Optional[str] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    verified_by_face: Optional[bool] = True
    liveness_verified: Optional[bool] = True
    liveness_score: Optional[float] = 0.98
    summary: Optional[str] = None
    remarks: Optional[str] = None
    verification_token: Optional[str] = None


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
    location_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    remarks: Optional[str] = None
