from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_attendance: List[Dict[str, Any]] = []


class AttendanceRepository:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_logs(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.ATTENDANCE, "logs").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("attendance_logs").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for attendance logs: {e}")
        return _in_memory_attendance

    def create_log(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"att_{len(_in_memory_attendance)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.ATTENDANCE, "logs").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("attendance_logs").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored attendance in memory fallback: {e}")

        _in_memory_attendance.append(data)
        return data
