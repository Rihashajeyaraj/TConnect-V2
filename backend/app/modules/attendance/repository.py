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

        # Check Supabase hrms.enrollments
        try:
            res = self.supabase.schema("hrms").table("enrollments").select("*").eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                _in_memory_enrollments[key] = res.data[0]
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("enrollments").select("*").eq("employee_id", emp_id).execute()
                if res.data and len(res.data) > 0:
                    _in_memory_enrollments[key] = res.data[0]
                    return res.data[0]
            except Exception:
                pass

        return {"enrolled": False, "enrollment_status": "PENDING", "employee_id": emp_id}

    def save_enrollment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save employee facial / biometric enrollment data to hrms.enrollments."""
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
            res = self.supabase.schema("hrms").table("enrollments").insert(entry).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
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

        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO", "CEO / Founder")

        logs = []
        try:
            res = self.supabase.schema("hrms").table("attendance").select("*").order("created_at", desc=True).execute()
            if res.data is not None and len(res.data) > 0:
                logs = res.data
        except Exception:
            pass

        if not logs:
            try:
                res = self.supabase.table("attendance").select("*").order("created_at", desc=True).execute()
                if res.data is not None and len(res.data) > 0:
                    logs = res.data
            except Exception:
                pass

        if not logs:
            try:
                res = self.supabase.table("attendance_logs").select("*").order("created_at", desc=True).execute()
                if res.data is not None and len(res.data) > 0:
                    logs = res.data
            except Exception:
                pass

        # Merge with in-memory logs (avoiding duplicates)
        existing_ids = {str(l.get("id")) for l in logs if l.get("id")}
        for mem in _in_memory_attendance:
            if str(mem.get("id")) not in existing_ids:
                logs.append(mem)

        # Standardize field names for Frontend consumers across SE, SM, CEO
        standardized = []
        for l in logs:
            row = dict(l)
            row["name"] = row.get("name") or row.get("employee_name") or "Sales Executive"
            row["employee_name"] = row["name"]
            row["clockIn"] = row.get("check_in_time") or row.get("punch_in_time") or "09:00 AM"
            row["check_in_time"] = row["clockIn"]
            row["clockOut"] = row.get("check_out_time") or row.get("punch_out_time") or "—"
            row["check_out_time"] = row["clockOut"]
            row["mode"] = row.get("mode") or "Biometric"
            row["workHours"] = row.get("total_working_hours") or row.get("work_hours") or ("In Progress" if row["clockOut"] == "—" else "8.5 hrs")
            row["total_working_hours"] = row["workHours"]
            
            # Status mapping
            if row.get("check_out_time") and row.get("check_out_time") != "—":
                row["status"] = "Logged off"
                row["attendance_status"] = "Logged off"
            else:
                row["status"] = "Logged in"
                row["attendance_status"] = "Logged in"
            
            standardized.append(row)

        if is_executive and (user_id or user_email or user_emp_code):
            standardized = [
                a for a in standardized
                if str(a.get("employee_id", "")) in (user_id, user_emp_code)
                or str(a.get("email", "")).lower() == user_email
                or str(a.get("user_id", "")) == user_id
            ]

        return standardized

    def create_log(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record Attendance Check-In (Clock-In) to hrms.attendance with 'Logged in' status."""
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
            "check_out_time": None,
            "punch_out_time": None,
            "check_in_latitude": float(lat),
            "check_in_longitude": float(lng),
            "latitude": float(lat),
            "longitude": float(lng),
            "check_out_latitude": None,
            "check_out_longitude": None,
            "check_in_address": addr,
            "work_location": addr,
            "check_out_address": None,
            "total_working_hours": "In Progress",
            "attendance_status": "Logged in",
            "status": "Logged in",
            "mode": data.get("mode") or "Biometric",
            "enrollment_status": data.get("enrollment_status") or "ENROLLED",
            "device_info": data.get("device_info") or "Web Desktop Browser",
            "ip_address": data.get("ip_address") or "127.0.0.1",
            "notes": data.get("notes") or data.get("remarks") or "Attendance Check-In logged with GPS",
            "created_at": now_iso
        }

        # 1. Primary: hrms.attendance
        try:
            res = self.supabase.schema("hrms").table("attendance").insert(payload).execute()
            if res.data and len(res.data) > 0:
                _in_memory_attendance.insert(0, res.data[0])
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("attendance").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    _in_memory_attendance.insert(0, res.data[0])
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error inserting into attendance: {e}")

        _in_memory_attendance.insert(0, payload)
        return payload

    def clock_out(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record Attendance Check-Out in hrms.attendance with 'Logged off' status."""
        att_id = data.get("attendance_id") or data.get("id")
        emp_id = str(data.get("employee_id") or data.get("employee_code") or "EMP000012")
        out_time = data.get("check_out_time") or "06:00 PM"

        lat = data.get("check_out_latitude") or data.get("latitude") or 13.0067
        lng = data.get("check_out_longitude") or data.get("longitude") or 80.2570
        addr = data.get("check_out_address") or "Adyar IT Corridor, Chennai"
        hrs = data.get("total_working_hours") or "9.0 hrs"

        # Update in memory record
        for a in _in_memory_attendance:
            if (att_id and str(a.get("id")) == str(att_id)) or (str(a.get("employee_id")) == emp_id and (not a.get("check_out_time") or a.get("check_out_time") == "—")):
                a["check_out_time"] = out_time
                a["punch_out_time"] = out_time
                a["check_out_latitude"] = float(lat)
                a["check_out_longitude"] = float(lng)
                a["check_out_address"] = addr
                a["total_working_hours"] = hrs
                a["attendance_status"] = "Logged off"
                a["status"] = "Logged off"
                return a

        # Update in Supabase hrms.attendance
        try:
            res = self.supabase.schema("hrms").table("attendance").update({
                "check_out_time": out_time,
                "punch_out_time": out_time,
                "check_out_latitude": float(lat),
                "check_out_longitude": float(lng),
                "check_out_address": addr,
                "total_working_hours": hrs,
                "attendance_status": "Logged off",
                "status": "Logged off"
            }).eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("attendance").update({
                    "check_out_time": out_time,
                    "punch_out_time": out_time,
                    "check_out_latitude": float(lat),
                    "check_out_longitude": float(lng),
                    "check_out_address": addr,
                    "total_working_hours": hrs,
                    "attendance_status": "Logged off",
                    "status": "Logged off"
                }).eq("employee_id", emp_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        return {"employee_id": emp_id, "check_out_time": out_time, "total_working_hours": hrs, "status": "Logged off"}

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
            "employee_name": exec_name,
            "executive_name": exec_name,
            "executive": exec_name,
            "executive_email": exec_email,
            "employee_code": emp_code,
            "status": "Pending",
            "manager_comment": "",
            "created_at": now_iso
        }

        # Try hrms.leave_requests in Supabase
        try:
            res = self.supabase.schema("hrms").table("leave_requests").insert(req_obj).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("leave_requests").insert(req_obj).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        _in_memory_leave_requests.insert(0, req_obj)
        return req_obj

    def get_leave_requests(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        try:
            res = self.supabase.schema("hrms").table("leave_requests").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("leave_requests").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    return res.data
            except Exception:
                pass

        return list(_in_memory_leave_requests)

    def update_leave_status(self, request_id: str, new_status: str, comment: str = "", user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        try:
            res = self.supabase.schema("hrms").table("leave_requests").update({
                "status": new_status,
                "manager_comment": comment,
                "reviewed_by": "Chief Executive Officer",
            }).eq("id", request_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("leave_requests").update({
                    "status": new_status,
                    "manager_comment": comment,
                }).eq("id", request_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        for r in _in_memory_leave_requests:
            if str(r.get("id")) == str(request_id) or str(r.get("leave_id")) == str(request_id):
                r["status"] = new_status
                r["manager_comment"] = comment
                return r
        return {}
