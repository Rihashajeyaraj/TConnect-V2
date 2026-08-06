from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_attendance: List[Dict[str, Any]] = []


class AttendanceRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_logs(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")

        logs = []
        try:
            res = self.supabase.table("attendance").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                logs = res.data
        except Exception:
            pass

        if not logs:
            try:
                res = self.supabase.table("attendance_logs").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    logs = res.data
            except Exception:
                pass

        if not logs:
            try:
                res = self.helper.table(SchemaEnum.ATTENDANCE, "logs").select("*").execute()
                if res.data is not None:
                    logs = res.data
            except Exception as e:
                logger.warning(f"Supabase attendance logs fetch error: {e}")

        if not logs:
            logs = _in_memory_attendance

        if is_executive and (user_id or user_email or user_emp_code):
            logs = [
                a for a in logs
                if str(a.get("employee_id", "")) in (user_id, user_emp_code)
                or str(a.get("email", "")).lower() == user_email
                or str(a.get("user_id", "")) == user_id
            ]

        return logs

    def create_log(self, data: Dict[str, Any]) -> Dict[str, Any]:
        att_id = data.get("id") or data.get("attendance_id") or str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        today_date = data.get("date") or data.get("attendance_date") or now_iso[:10]

        emp_id = str(data.get("employee_id") or data.get("user_id") or data.get("employee_code") or "EMP-101")
        emp_name = str(data.get("employee_name") or data.get("user_name") or data.get("name") or "Sales Executive")

        payload = {
            "id": att_id,
            "employee_id": emp_id,
            "employee_name": emp_name,
            "date": today_date,
            "status": data.get("status") or "Present",
            "punch_in_time": data.get("punch_in_time") or data.get("clock_in_time") or "09:00 AM",
            "punch_out_time": data.get("punch_out_time") or data.get("clock_out_time") or None,
            "work_location": data.get("work_location") or data.get("location_name") or "Field Office",
            "notes": data.get("notes") or data.get("remarks") or "Attendance logged",
            "created_at": now_iso
        }

        logger.info(f"[ATTENDANCE INSERT REQUEST] Inserting into attendance with payload: {payload}")

        # 1. Try public.attendance
        try:
            res = self.supabase.table("attendance").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[ATTENDANCE INSERT SUCCESS] Saved in public.attendance: {res.data[0]}")
                return res.data[0]
        except Exception as e:
            logger.error(f"Error inserting into public.attendance: {e}")

        # 2. Try public.attendance_logs
        try:
            res = self.supabase.table("attendance_logs").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[ATTENDANCE INSERT SUCCESS] Saved in public.attendance_logs: {res.data[0]}")
                return res.data[0]
        except Exception as e:
            logger.error(f"Error inserting into public.attendance_logs: {e}")

        payload["id"] = att_id
        _in_memory_attendance.append(payload)
        return payload
