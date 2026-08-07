from typing import List, Dict, Any
import time
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import ClockInRequest, ClockOutRequest, EnrollmentRequest


class AttendanceService:
    def __init__(self, repo: AttendanceRepository = None):
        self.repo = repo or AttendanceRepository()

    def get_enrollment_status(self, emp_id: str, email: str = "") -> Dict[str, Any]:
        return self.repo.get_enrollment_status(emp_id, email)

    def enroll(self, data: EnrollmentRequest) -> Dict[str, Any]:
        return self.repo.save_enrollment(data.dict())

    def list_logs(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_logs(user_payload)

    def clock_in(self, user_id: str, data: ClockInRequest) -> Dict[str, Any]:
        payload = data.dict()
        payload["user_id"] = user_id
        return self.repo.create_log(payload)

    def clock_out(self, user_id: str, data: ClockOutRequest) -> Dict[str, Any]:
        payload = data.dict()
        payload["user_id"] = user_id
        return self.repo.clock_out(payload)

    def submit_leave_request(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.create_leave_request(data, user_payload)

    def get_leave_requests(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_leave_requests(user_payload)

    def update_leave_status(self, request_id: str, status_str: str, comment: str = "", user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.update_leave_status(request_id, status_str, comment, user_payload)
