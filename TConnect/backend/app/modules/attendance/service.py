from typing import List, Dict, Any
import time
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import ClockInRequest, ClockOutRequest, LeaveCreate


class AttendanceService:
    def __init__(self, repo: AttendanceRepository = None):
        self.repo = repo or AttendanceRepository()

    def list_logs(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_logs()

    def clock_in(self, user_id: str, data: ClockInRequest) -> Dict[str, Any]:
        payload = {
            "user_id": user_id,
            "clock_in_time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "clock_in_lat": data.latitude,
            "clock_in_lng": data.longitude,
            "notes": data.notes,
            "status": "PRESENT"
        }
        return self.repo.create_log(payload)

    def clock_out(self, user_id: str, data: ClockOutRequest) -> Dict[str, Any]:
        logs = self.repo.get_all_logs()
        for log in logs:
            if log.get("user_id") == user_id and not log.get("clock_out_time"):
                log["clock_out_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
                return log

        payload = {
            "user_id": user_id,
            "clock_in_time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "clock_out_time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "PRESENT"
        }
        return self.repo.create_log(payload)
