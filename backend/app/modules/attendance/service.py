from typing import List, Dict, Any
import time
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import ClockInRequest, ClockOutRequest, EnrollmentRequest
from app.exceptions.base import NotFoundException, ForbiddenException
from app.core.scoping import enforce_record_access, normalize_user_role


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
        caller_role = normalize_user_role((user_payload or {}).get("role"))
        if caller_role == "sales_executive":
            raise ForbiddenException("Sales Executives are not authorized to approve or reject leave requests.")

        all_leaves = self.repo.get_leave_requests(user_payload)
        target_leave = next((l for l in all_leaves if str(l.get("id")) == str(request_id) or str(l.get("leave_id")) == str(request_id) or str(l.get("leave_request_id")) == str(request_id)), None)

        if not target_leave:
            raise NotFoundException(resource="Leave request", identifier=request_id)

        if user_payload:
            enforce_record_access(target_leave, user_payload, "leave request")

        return self.repo.update_leave_status(request_id, status_str, comment, user_payload)
