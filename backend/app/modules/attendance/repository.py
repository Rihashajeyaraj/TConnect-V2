from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_attendance: List[Dict[str, Any]] = []
_in_memory_leave_requests: List[Dict[str, Any]] = []
_in_memory_enrollments: Dict[str, Dict[str, Any]] = {}


class AttendanceRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    # ── 1. ENROLLMENT ────────────────────────────────────────────────────────
    def get_enrollment_status(self, emp_id: str, email: str = "") -> Dict[str, Any]:
        """Check if employee completed one-time facial/biometric enrollment."""
        key = str(emp_id or email).lower().strip()
        if key in _in_memory_enrollments:
            return _in_memory_enrollments[key]

        # Check Supabase enrollments
        try:
            res = self.supabase.table("enrollments").select("*").eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                _in_memory_enrollments[key] = res.data[0]
                return res.data[0]
        except Exception:
            pass

        return {"enrolled": False, "enrollment_status": "PENDING", "employee_id": emp_id}

    def save_enrollment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save employee facial / biometric enrollment data."""
        emp_id = str(data.get("employee_id") or data.get("employee_code") or "EMP000012")
        emp_name = str(data.get("employee_name") or data.get("name") or "Sales Executive")
        now_iso = datetime.utcnow().isoformat()

        entry = {
            "id": f"enroll_{uuid.uuid4()}",
            "employee_id": emp_id,
            "employee_name": emp_name,
            "enrollment_status": "ENROLLED",
            "enrolled": True,
            "face_data_url": data.get("face_data_url") or "",
            "biometric_hash": data.get("biometric_hash") or f"bio_{uuid.uuid4()}",
            "device_info": data.get("device_info") or "",
            "created_at": now_iso,
        }

        key = emp_id.lower().strip()
        _in_memory_enrollments[key] = entry

        try:
            res = self.supabase.table("enrollments").insert(entry).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Supabase enrollments table insert warning: {e}")

        return entry

    # ── 2. ATTENDANCE LOGS ───────────────────────────────────────────────────
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
            logs = list(_in_memory_attendance)

        if is_executive and (user_id or user_email or user_emp_code):
            logs = [
                a for a in logs
                if str(a.get("employee_id", "")) in (user_id, user_emp_code)
                or str(a.get("email", "")).lower() == user_email
                or str(a.get("user_id", "")) == user_id
            ]

        return logs

    def create_log(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record Attendance Check-In (Clock-In) with full GPS and location telemetry."""
        att_id = data.get("id") or data.get("attendance_id") or f"att_{uuid.uuid4()}"
        now_iso = datetime.utcnow().isoformat()
        today_date = data.get("attendance_date") or data.get("date") or now_iso[:10]

        emp_id = str(data.get("employee_id") or data.get("employee_code") or data.get("user_id") or "EMP000012")
        emp_name = str(data.get("employee_name") or data.get("user_name") or data.get("name") or "Sales Executive")

        lat = data.get("check_in_latitude") or data.get("latitude") or 13.0067
        lng = data.get("check_in_longitude") or data.get("longitude") or 80.2570
        addr = data.get("check_in_address") or data.get("work_location") or data.get("location_name") or "Adyar IT Corridor, Chennai"

        payload = {
            "id": att_id,
            "employee_id": emp_id,
            "employee_name": emp_name,
            "attendance_date": today_date,
            "date": today_date,
            "check_in_time": data.get("check_in_time") or data.get("punch_in_time") or "09:00 AM",
            "punch_in_time": data.get("check_in_time") or data.get("punch_in_time") or "09:00 AM",
            "check_out_time": data.get("check_out_time") or None,
            "punch_out_time": data.get("check_out_time") or None,
            "check_in_latitude": float(lat),
            "check_in_longitude": float(lng),
            "latitude": float(lat),
            "longitude": float(lng),
            "check_out_latitude": None,
            "check_out_longitude": None,
            "check_in_address": addr,
            "work_location": addr,
            "check_out_address": None,
            "total_working_hours": data.get("total_working_hours") or "0.0 hrs",
            "attendance_status": data.get("attendance_status") or data.get("status") or "Present",
            "status": data.get("attendance_status") or data.get("status") or "Present",
            "enrollment_status": data.get("enrollment_status") or "ENROLLED",
            "device_info": data.get("device_info") or "Web Desktop Browser",
            "ip_address": data.get("ip_address") or "127.0.0.1",
            "notes": data.get("notes") or data.get("remarks") or "Attendance Check-In logged with GPS",
            "created_at": now_iso
        }

        # 1. Try public.attendance
        try:
            res = self.supabase.table("attendance").insert(payload).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Error inserting into public.attendance: {e}")

        # 2. Try public.attendance_logs
        try:
            res = self.supabase.table("attendance_logs").insert(payload).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Error inserting into public.attendance_logs: {e}")

        _in_memory_attendance.insert(0, payload)
        return payload

    def clock_out(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record Attendance Check-Out (Clock-Out) & calculate total working hours."""
        att_id = data.get("attendance_id") or data.get("id")
        emp_id = str(data.get("employee_id") or data.get("employee_code") or "EMP000012")
        out_time = data.get("check_out_time") or "06:00 PM"

        lat = data.get("check_out_latitude") or data.get("latitude") or 13.0067
        lng = data.get("check_out_longitude") or data.get("longitude") or 80.2570
        addr = data.get("check_out_address") or "Adyar IT Corridor, Chennai"
        hrs = data.get("total_working_hours") or "9.0 hrs"

        # Update in memory record
        for a in _in_memory_attendance:
            if (att_id and str(a.get("id")) == str(att_id)) or (str(a.get("employee_id")) == emp_id and not a.get("check_out_time")):
                a["check_out_time"] = out_time
                a["punch_out_time"] = out_time
                a["check_out_latitude"] = float(lat)
                a["check_out_longitude"] = float(lng)
                a["check_out_address"] = addr
                a["total_working_hours"] = hrs
                a["attendance_status"] = "Completed"
                a["status"] = "Completed"
                return a

        # Update in Supabase if present
        try:
            res = self.supabase.table("attendance").update({
                "check_out_time": out_time,
                "punch_out_time": out_time,
                "check_out_latitude": float(lat),
                "check_out_longitude": float(lng),
                "check_out_address": addr,
                "total_working_hours": hrs,
                "attendance_status": "Completed",
            }).eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

        return {"employee_id": emp_id, "check_out_time": out_time, "total_working_hours": hrs}

    # ── 3. LEAVE REQUESTS ────────────────────────────────────────────────────
    def create_leave_request(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        req_id = data.get("id") or f"leave_{uuid.uuid4()}"
        now_iso = datetime.utcnow().isoformat()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        exec_name = str(data.get("executive_name") or data.get("executive") or (user_payload or {}).get("name") or "Sales Executive")
        exec_email = str(data.get("executive_email") or data.get("email") or (user_payload or {}).get("email") or "executive@tconnect.com").lower().strip()
        emp_code = str(data.get("employee_code") or data.get("employee_id") or (user_payload or {}).get("employee_code") or "EMP000012").strip()

        leave_type = str(data.get("leave_type") or data.get("type") or "Full Day Leave")
        reason_str = str(data.get("reason") or "Personal / Medical Leave")

        req_obj = {
            "id": req_id,
            "leave_id": req_id,
            "leave_type": leave_type,
            "from_date": data.get("from_date") or data.get("date") or today_str,
            "to_date": data.get("to_date") or data.get("date") or today_str,
            "time_slot": data.get("time_slot") or data.get("slot") or "Full Day",
            "duration": data.get("duration") or ("0.5 Day" if "Half" in leave_type else "2 Hours" if "Permission" in leave_type else "1 Day"),
            "reason": reason_str,
            "executive_name": exec_name,
            "executive": exec_name,
            "executive_email": exec_email,
            "employee_code": emp_code,
            "status": "Pending",
            "manager_comment": "",
            "created_at": now_iso
        }

        _in_memory_leave_requests.insert(0, req_obj)
        return req_obj

    def get_leave_requests(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return list(_in_memory_leave_requests)

    def update_leave_status(self, request_id: str, new_status: str, comment: str = "", user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        for r in _in_memory_leave_requests:
            if str(r.get("id")) == str(request_id) or str(r.get("leave_id")) == str(request_id):
                r["status"] = new_status
                r["manager_comment"] = comment
                return r
        return {}
