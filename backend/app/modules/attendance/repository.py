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


def parse_serialized_reason(reason_str: str) -> dict:
    res = {
        "raw_reason": reason_str or "",
        "leave_type": "Full Day Leave",
        "time_slot": "Full Day",
        "duration": "1 Day",
        "role": "Sales Executive",
        "employee_name": "Sales Executive",
        "employee_code": "EMP000012",
        "approved_by": None,
        "approved_at": None,
        "rejected_by": None,
        "rejected_at": None,
        "manager_comment": ""
    }
    if not reason_str:
        return res
        
    parts = [p.strip() for p in reason_str.split("|")]
    if len(parts) > 0:
        res["raw_reason"] = parts[0]
        
    for p in parts[1:]:
        if ":" in p:
            try:
                k, v = p.split(":", 1)
                k = k.strip().lower()
                v = v.strip()
                if k == "type":
                    res["leave_type"] = v
                elif k == "slot":
                    res["time_slot"] = v
                elif k == "duration":
                    res["duration"] = v
                elif k == "role":
                    res["role"] = v
                elif k == "emp_name":
                    res["employee_name"] = v
                elif k == "emp_code":
                    res["employee_code"] = v
                elif k == "approved_by":
                    res["approved_by"] = v
                elif k == "approved_at":
                    res["approved_at"] = v
                elif k == "rejected_by":
                    res["rejected_by"] = v
                elif k == "rejected_at":
                    res["rejected_at"] = v
                elif k in ("comment", "manager_comment", "reason"):
                    res["manager_comment"] = v
            except Exception:
                pass
                
    return res

def serialize_reason(raw_reason: str, leave_type: str, time_slot: str, duration: str, role: str, employee_name: str, employee_code: str, approved_by=None, approved_at=None, rejected_by=None, rejected_at=None, manager_comment=None) -> str:
    parts = [raw_reason or "Personal / Medical Leave"]
    parts.append(f"type:{leave_type or 'Full Day Leave'}")
    parts.append(f"slot:{time_slot or 'Full Day'}")
    parts.append(f"duration:{duration or '1 Day'}")
    parts.append(f"role:{role or 'Sales Executive'}")
    parts.append(f"emp_name:{employee_name or 'Sales Executive'}")
    parts.append(f"emp_code:{employee_code or 'EMP000012'}")
    if approved_by:
        parts.append(f"approved_by:{approved_by}")
    if approved_at:
        parts.append(f"approved_at:{approved_at}")
    if rejected_by:
        parts.append(f"rejected_by:{rejected_by}")
    if rejected_at:
        parts.append(f"rejected_at:{rejected_at}")
    if manager_comment:
        parts.append(f"comment:{manager_comment}")
    return " | ".join(parts)


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

        return {
            "employee_id": emp_id,
            "enrollment_status": "PENDING",
            "enrolled": False,
            "face_data_url": "",
            "biometric_hash": "",
            "device_info": "",
        }

    def save_enrollment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save employee facial / biometric enrollment data to hrms.enrollments."""
        emp_id = str(data.get("employee_id") or data.get("employee_code") or "EMP000012")
        emp_name = str(data.get("employee_name") or data.get("name") or "Sales Executive")
        now_iso = datetime.utcnow().isoformat()

        # Check and delete existing enrollment to avoid duplicate records
        existing_id = None
        try:
            res = self.supabase.schema("hrms").table("enrollments").select("id").eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                existing_id = res.data[0].get("id")
        except Exception:
            try:
                res = self.supabase.table("enrollments").select("id").eq("employee_id", emp_id).execute()
                if res.data and len(res.data) > 0:
                    existing_id = res.data[0].get("id")
            except Exception:
                pass

        if existing_id:
            try:
                self.supabase.schema("hrms").table("enrollments").delete().eq("id", existing_id).execute()
            except Exception:
                try:
                    self.supabase.table("enrollments").delete().eq("id", existing_id).execute()
                except Exception:
                    pass

        entry = {
            "id": f"enroll_{uuid.uuid4()}",
            "employee_id": emp_id,
            "employee_name": emp_name,
            "enrollment_status": "ENROLLED",
            "enrolled": True,
            "face_data_url": data.get("face_data_url") or "",
            "biometric_hash": data.get("biometric_hash") or f"bio_{uuid.uuid4()}",
            "device_info": data.get("device_info") or "",
            "face_template_vector": data.get("face_template_vector") or None,
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

    def get_all_enrollments(self) -> List[Dict[str, Any]]:
        """Retrieve all enrolled employees with valid face template vectors."""
        logs = []
        try:
            res = self.supabase.schema("hrms").table("enrollments").select("*").eq("enrolled", True).execute()
            if res.data is not None:
                logs = res.data
        except Exception:
            try:
                res = self.supabase.table("enrollments").select("*").eq("enrolled", True).execute()
                if res.data is not None:
                    logs = res.data
            except Exception:
                pass

        # Merge with in-memory enrollments
        existing_ids = {str(l.get("employee_id")) for l in logs if l.get("employee_id")}
        for key, entry in _in_memory_enrollments.items():
            emp_id = entry.get("employee_id")
            if emp_id and str(emp_id) not in existing_ids:
                logs.append(entry)

        # Filter for rows that have a valid 512-dimension vector
        valid_enrollments = []
        for entry in logs:
            vec = entry.get("face_template_vector")
            if isinstance(vec, str):
                try:
                    import json
                    vec = json.loads(vec)
                except Exception:
                    try:
                        cleaned = vec.strip("[]{} ")
                        if cleaned:
                            vec = [float(x.strip()) for x in cleaned.split(",")]
                    except Exception:
                        pass
            if isinstance(vec, list) and len(vec) == 512:
                entry["face_template_vector"] = vec
                valid_enrollments.append(entry)

        return valid_enrollments

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

        from datetime import datetime
        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        # Standardize field names for Frontend consumers across SE, SM, CEO
        standardized = []
        for l in logs:
            row = dict(l)
            row["name"] = row.get("name") or row.get("employee_name") or "Sales Executive"
            row["employee_name"] = row["name"]
            row["clockIn"] = row.get("check_in_time") or row.get("punch_in_time") or "09:00 AM"
            row["check_in_time"] = row["clockIn"]

            raw_out = row.get("check_out_time") or row.get("punch_out_time")
            log_date = str(row.get("attendance_date") or row.get("date") or row.get("created_at") or "").split("T")[0]

            # Auto logout logic: if employee forgot to log out (past date or missing checkout), set auto logout at 12:00 PM
            if (not raw_out or raw_out == "—") and log_date and log_date < today_str:
                raw_out = "12:00 PM"
                row["check_out_time"] = "12:00 PM"
                row["punch_out_time"] = "12:00 PM"
                row["total_working_hours"] = row.get("total_working_hours") or "Auto Logged Off (12:00 PM)"

            row["clockOut"] = raw_out or "—"
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

        lat = data.get("check_in_latitude") or data.get("latitude")
        lng = data.get("check_in_longitude") or data.get("longitude")
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
            "check_in_latitude": float(lat) if lat else None,
            "check_in_longitude": float(lng) if lng else None,
            "latitude": float(lat) if lat else None,
            "longitude": float(lng) if lng else None,
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
        today_date = data.get("attendance_date") or data.get("date") or datetime.utcnow().strftime("%Y-%m-%d")

        lat = data.get("check_out_latitude") or data.get("latitude")
        lng = data.get("check_out_longitude") or data.get("longitude")
        addr = data.get("check_out_address") or ("Location Unavailable" if lat is None else "Verified Location")
        hrs = data.get("total_working_hours") or "9.0 hrs"


        def calculate_duration_backend(in_time: str, out_time: str) -> str:
            from datetime import datetime
            formats = ["%I:%M:%S %p", "%I:%M %p", "%H:%M:%S", "%H:%M"]
            t1, t2 = None, None
            for fmt in formats:
                if not t1:
                    try:
                        t1 = datetime.strptime(in_time.strip(), fmt)
                    except Exception:
                        pass
                if not t2:
                    try:
                        t2 = datetime.strptime(out_time.strip(), fmt)
                    except Exception:
                        pass
            if t1 and t2:
                diff = t2 - t1
                secs = diff.total_seconds()
                if secs < 0:
                    secs += 24 * 3600
                h = int(secs // 3600)
                m = int((secs % 3600) // 60)
                if h > 0:
                    return f"{h}h {m}m"
                return f"{m}m"
            return "—"

        # Try to find the active check-in record for this employee from Supabase
        active_id = None
        in_time_str = None
        try:
            res_list = self.supabase.schema("hrms").table("attendance").select("*").eq("employee_id", emp_id).order("created_at", desc=True).execute()
            if res_list.data:
                for row in res_list.data:
                    c_out = row.get("check_out_time")
                    c_status = row.get("attendance_status") or row.get("status")
                    if not c_out or c_out == "—" or str(c_status).lower() == "logged in":
                        active_id = row.get("id")
                        in_time_str = row.get("check_in_time") or row.get("punch_in_time")
                        break
        except Exception as e:
            logger.warning(f"Error querying active attendance logs: {e}")

        if in_time_str:
            hrs = calculate_duration_backend(in_time_str, out_time)

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
                a["remarks"] = data.get("notes") or data.get("remarks") or a.get("remarks")
                a["notes"] = data.get("notes") or data.get("remarks") or a.get("notes")
                break

        # Update in Supabase hrms.attendance by specific active ID
        if active_id:
            try:
                res = self.supabase.schema("hrms").table("attendance").update({
                    "check_out_time": out_time,
                    "punch_out_time": out_time,
                    "check_out_latitude": float(lat),
                    "check_out_longitude": float(lng),
                    "check_out_address": addr,
                    "total_working_hours": hrs,
                    "attendance_status": "Logged off",
                    "status": "Logged off",
                    "notes": data.get("notes") or data.get("remarks") or "Attendance Check-Out logged with GPS"
                }).eq("id", active_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Error updating active log by ID in hrms: {e}")

        # Fallback to update in hrms.attendance by date
        try:
            res = self.supabase.schema("hrms").table("attendance").update({
                "check_out_time": out_time,
                "punch_out_time": out_time,
                "check_out_latitude": float(lat),
                "check_out_longitude": float(lng),
                "check_out_address": addr,
                "total_working_hours": hrs,
                "attendance_status": "Logged off",
                "status": "Logged off",
                "notes": data.get("notes") or data.get("remarks") or "Attendance Check-Out logged with GPS"
            }).eq("employee_id", emp_id).eq("attendance_date", today_date).execute()
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
                    "status": "Logged off",
                    "notes": data.get("notes") or data.get("remarks") or "Attendance Check-Out logged with GPS"
                }).eq("employee_id", emp_id).eq("attendance_date", today_date).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        return {"employee_id": emp_id, "check_out_time": out_time, "total_working_hours": hrs, "status": "Logged off"}

    # ── 3. LEAVE REQUESTS ────────────────────────────────────────────────────
    def _standardize_leave_requests(self, leave_requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not leave_requests:
            return []
        
        # Load employees for mapping
        emp_map = {}
        try:
            res_emp = self.supabase.schema("hrms").table("employees").select("employee_id, name, email, employee_code, role").execute()
            if res_emp.data:
                for e in res_emp.data:
                    if e.get("employee_id"):
                        emp_map[e.get("employee_id")] = e
        except Exception:
            try:
                res_emp = self.supabase.table("employees").select("id, employee_id, name, email, employee_code, role").execute()
                if res_emp.data:
                    for e in res_emp.data:
                        key = e.get("employee_id") or e.get("id")
                        if key:
                            emp_map[key] = e
            except Exception:
                pass

        standardized = []
        for lr in leave_requests:
            row = dict(lr)
            lr_id = row.get("leave_request_id") or row.get("id") or row.get("leave_id")
            row["id"] = lr_id
            row["leave_id"] = lr_id
            row["leave_request_id"] = lr_id
            
            # Parse serialized properties from reason column
            parsed = parse_serialized_reason(row.get("reason"))
            row["reason"] = parsed["raw_reason"]
            row["raw_reason"] = parsed["raw_reason"]
            row["leave_type"] = parsed["leave_type"]
            row["time_slot"] = parsed["time_slot"]
            row["duration"] = parsed["duration"]
            row["role"] = parsed["role"]
            row["manager_comment"] = parsed["manager_comment"]
            
            # Determine request_type (Leave or Permission) for CEO approval page
            row["request_type"] = "PERMISSION" if "permission" in str(parsed["leave_type"]).lower() else "LEAVE"
            
            emp_id = row.get("employee_id")
            if emp_id and emp_id in emp_map:
                emp = emp_map[emp_id]
                row["employee_name"] = emp.get("name") or parsed["employee_name"]
                row["executive_name"] = emp.get("name") or parsed["employee_name"]
                row["executive"] = emp.get("name") or parsed["employee_name"]
                row["executive_email"] = emp.get("email")
                row["email"] = emp.get("email")
                row["employee_code"] = emp.get("employee_code") or parsed["employee_code"]
                row["role"] = emp.get("role") or parsed["role"]
            else:
                row["employee_name"] = parsed["employee_name"] or row.get("employee_name") or "Sales Executive"
                row["executive_name"] = parsed["employee_name"] or row.get("executive_name") or "Sales Executive"
                row["executive"] = parsed["employee_name"] or row.get("executive") or "Sales Executive"
                row["executive_email"] = row.get("executive_email") or "executive@tconnect.com"
                row["email"] = row.get("executive_email") or "executive@tconnect.com"
                row["employee_code"] = parsed["employee_code"] or row.get("employee_code") or "EMP000012"
            standardized.append(row)
        return standardized

    # ── 3. LEAVE REQUESTS ────────────────────────────────────────────────────
    def create_leave_request(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        req_id = data.get("id") or data.get("leave_id") or data.get("leave_request_id") or str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        exec_name = str(data.get("executive_name") or data.get("executive") or (user_payload or {}).get("name") or "Sales Executive")
        exec_email = str(data.get("executive_email") or data.get("email") or (user_payload or {}).get("email") or "executive@tconnect.com").lower().strip()
        emp_code = str(data.get("employee_code") or data.get("employee_id") or (user_payload or {}).get("employee_code") or "EMP000012").strip()

        leave_type = str(data.get("leave_type") or data.get("type") or "Full Day Leave")
        reason_str = str(data.get("reason") or "Personal / Medical Leave")

        is_uuid = lambda x: x and len(str(x)) == 36 and "-" in str(x)
        leave_req_uuid = req_id if is_uuid(req_id) else str(uuid.uuid4())

        # Resolve employee UUID (employee_id) from database
        resolved_emp_id = None
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        
        try:
            if user_id:
                res = self.supabase.schema("hrms").table("employees").select("employee_id").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    resolved_emp_id = res.data[0].get("employee_id")
            
            if not resolved_emp_id and exec_email:
                res = self.supabase.schema("hrms").table("employees").select("employee_id").eq("email", exec_email).execute()
                if res.data and len(res.data) > 0:
                    resolved_emp_id = res.data[0].get("employee_id")

            if not resolved_emp_id and emp_code:
                res = self.supabase.schema("hrms").table("employees").select("employee_id").eq("employee_code", emp_code).execute()
                if res.data and len(res.data) > 0:
                    resolved_emp_id = res.data[0].get("employee_id")
        except Exception:
            pass

        if not resolved_emp_id:
            try:
                if user_id:
                    res = self.supabase.table("employees").select("id, employee_id").eq("user_id", user_id).execute()
                    if res.data and len(res.data) > 0:
                        resolved_emp_id = res.data[0].get("employee_id") or res.data[0].get("id")
                
                if not resolved_emp_id and exec_email:
                    res = self.supabase.table("employees").select("id, employee_id").eq("email", exec_email).execute()
                    if res.data and len(res.data) > 0:
                        resolved_emp_id = res.data[0].get("employee_id") or res.data[0].get("id")

                if not resolved_emp_id and emp_code:
                    res = self.supabase.table("employees").select("id, employee_id").eq("employee_code", emp_code).execute()
                    if res.data and len(res.data) > 0:
                        resolved_emp_id = res.data[0].get("employee_id") or res.data[0].get("id")
            except Exception:
                pass

        # Fallback to any employee's UUID to avoid foreign key errors
        if not resolved_emp_id or not is_uuid(resolved_emp_id):
            try:
                res = self.supabase.schema("hrms").table("employees").select("employee_id").limit(1).execute()
                if res.data and len(res.data) > 0:
                    resolved_emp_id = res.data[0].get("employee_id")
            except Exception:
                try:
                    res = self.supabase.table("employees").select("id, employee_id").limit(1).execute()
                    if res.data and len(res.data) > 0:
                        resolved_emp_id = res.data[0].get("employee_id") or res.data[0].get("id")
                except Exception:
                    pass

        # If still no valid UUID, try using user_id if valid, else fallback to a generated one
        if not resolved_emp_id or not is_uuid(resolved_emp_id):
            resolved_emp_id = user_id if is_uuid(user_id) else str(uuid.uuid4())

        time_slot = data.get("time_slot") or data.get("slot") or "Full Day"
        duration = data.get("duration") or ("0.5 Day" if "Half" in leave_type else "2 Hours" if "Permission" in leave_type else "1 Day")
        role = str((user_payload or {}).get("role") or "Sales Manager")

        req_obj = {
            "id": req_id,
            "leave_id": req_id,
            "leave_type": leave_type,
            "from_date": data.get("from_date") or data.get("date") or today_str,
            "to_date": data.get("to_date") or data.get("date") or today_str,
            "time_slot": time_slot,
            "duration": duration,
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

        serialized_reason = serialize_reason(
            raw_reason=reason_str,
            leave_type=leave_type,
            time_slot=time_slot,
            duration=duration,
            role=role,
            employee_name=exec_name,
            employee_code=emp_code
        )

        db_payload = {
            "leave_request_id": leave_req_uuid,
            "employee_id": resolved_emp_id,
            "leave_type_id": None,
            "from_date": req_obj["from_date"],
            "to_date": req_obj["to_date"],
            "reason": serialized_reason,
            "status": "Pending",
            "created_at": now_iso
        }

        # Try hrms.leave_requests in Supabase
        try:
            res = self.supabase.schema("hrms").table("leave_requests").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Leave request created in hrms.leave_requests: {res.data[0]}")
                return self._standardize_leave_requests(res.data)[0]
        except Exception as e:
            logger.warning(f"Failed to insert into hrms.leave_requests: {e}")
            try:
                res = self.supabase.table("leave_requests").insert(db_payload).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"Leave request created in public.leave_requests: {res.data[0]}")
                    return self._standardize_leave_requests(res.data)[0]
            except Exception as e2:
                logger.warning(f"Failed to insert into public.leave_requests: {e2}")

        _in_memory_leave_requests.insert(0, req_obj)
        return req_obj

    def get_leave_requests(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        raw_data = []
        try:
            res = self.supabase.schema("hrms").table("leave_requests").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                raw_data = res.data
        except Exception as e:
            logger.warning(f"Failed fetching leave requests from hrms.leave_requests: {e}")
            try:
                res = self.supabase.table("leave_requests").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    raw_data = res.data
            except Exception as e2:
                logger.warning(f"Failed fetching leave requests from public.leave_requests: {e2}")

        if not raw_data:
            raw_data = _in_memory_leave_requests

        standardized_requests = self._standardize_leave_requests(raw_data)

        # Scoping logic for Sales Managers
        user_payload = user_payload or {}
        user_role = str(user_payload.get("role") or "").lower().strip()

        if "manager" in user_role:
            from app.modules.users.repository import UserRepository
            user_repo = UserRepository()
            mgr_email = str(user_payload.get("email") or "").lower().strip()
            mgr_id = str(user_payload.get("id") or user_payload.get("user_id") or "").strip()
            mgr_code = str(user_payload.get("employee_code") or "").strip()
            effective_mgr_identifier = mgr_email or mgr_id or mgr_code

            assigned_execs = user_repo.get_assigned_executives_for_manager(effective_mgr_identifier) or []

            assigned_emails = {str(u.get("email") or "").lower().strip() for u in assigned_execs if u.get("email")}
            assigned_ids = {str(u.get("id") or u.get("user_id") or u.get("employee_id") or "").strip() for u in assigned_execs}
            assigned_codes = {str(u.get("employee_code") or u.get("employee_id") or "").strip() for u in assigned_execs}
            assigned_names = {str(u.get("name") or u.get("full_name") or "").lower().strip() for u in assigned_execs}
            assigned_names = {n for n in assigned_names if len(n) > 3}

            filtered_requests = []
            for req in standardized_requests:
                req_role = str(req.get("role") or "").lower().strip()
                # Exclude manager, admin, ceo requests
                if any(r in req_role for r in ("manager", "admin", "ceo")):
                    continue

                req_email = str(req.get("executive_email") or req.get("email") or "").lower().strip()
                req_id = str(req.get("employee_id") or "").strip()
                req_code = str(req.get("employee_code") or "").strip()
                req_name = str(req.get("executive_name") or req.get("employee_name") or "").lower().strip()

                is_match = False
                if req_email and req_email in assigned_emails:
                    is_match = True
                elif req_id and req_id in assigned_ids:
                    is_match = True
                elif req_code and req_code in assigned_codes:
                    is_match = True
                else:
                    for name in assigned_names:
                        if name in req_name:
                            is_match = True
                            break
                if is_match:
                    filtered_requests.append(req)
            return filtered_requests

        return standardized_requests

    def update_leave_status(self, request_id: str, new_status: str, comment: str = "", user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        # Resolve manager's employee_id from user_payload
        manager_emp_id = None
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = (user_payload or {}).get("email")
        is_uuid = lambda x: x and len(str(x)) == 36 and "-" in str(x)
        
        if user_id:
            try:
                res = self.supabase.schema("hrms").table("employees").select("employee_id").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    manager_emp_id = res.data[0].get("employee_id")
            except Exception:
                try:
                    res = self.supabase.table("employees").select("id, employee_id").eq("user_id", user_id).execute()
                    if res.data and len(res.data) > 0:
                        manager_emp_id = res.data[0].get("employee_id") or res.data[0].get("id")
                except Exception:
                    pass

        if not manager_emp_id and user_email:
            try:
                res = self.supabase.schema("hrms").table("employees").select("employee_id").eq("email", user_email).execute()
                if res.data and len(res.data) > 0:
                    manager_emp_id = res.data[0].get("employee_id")
            except Exception:
                try:
                    res = self.supabase.table("employees").select("id, employee_id").eq("email", user_email).execute()
                    if res.data and len(res.data) > 0:
                        manager_emp_id = res.data[0].get("employee_id") or res.data[0].get("id")
                except Exception:
                    pass

        # Get existing leave request to preserve other serialized properties
        existing_reason = ""
        try:
            res_exist = self.supabase.schema("hrms").table("leave_requests").select("reason").eq("leave_request_id", request_id).execute()
            if res_exist.data and len(res_exist.data) > 0:
                existing_reason = res_exist.data[0].get("reason") or ""
            else:
                res_exist = self.supabase.table("leave_requests").select("reason").eq("leave_request_id", request_id).execute()
                if res_exist.data and len(res_exist.data) > 0:
                    existing_reason = res_exist.data[0].get("reason") or ""
        except Exception:
            pass

        parsed = parse_serialized_reason(existing_reason)
        now_str = datetime.utcnow().isoformat()
        
        if str(new_status).lower() in ("approved", "accepted"):
            parsed["approved_by"] = manager_emp_id or user_id
            parsed["approved_at"] = now_str
            parsed["manager_comment"] = comment or parsed["manager_comment"]
        else:
            parsed["rejected_by"] = manager_emp_id or user_id
            parsed["rejected_at"] = now_str
            parsed["manager_comment"] = comment or parsed["manager_comment"]

        serialized_reason = serialize_reason(
            raw_reason=parsed["raw_reason"],
            leave_type=parsed["leave_type"],
            time_slot=parsed["time_slot"],
            duration=parsed["duration"],
            role=parsed["role"],
            employee_name=parsed["employee_name"],
            employee_code=parsed["employee_code"],
            approved_by=parsed["approved_by"],
            approved_at=parsed["approved_at"],
            rejected_by=parsed["rejected_by"],
            rejected_at=parsed["rejected_at"],
            manager_comment=parsed["manager_comment"]
        )

        updates = {
            "status": new_status,
            "approved_by": manager_emp_id if is_uuid(manager_emp_id) else None,
            "reason": serialized_reason
        }

        print("[LEAVE APPROVAL]")
        print("request: update_status")
        print(f"leave_id: {request_id}")
        print(f"new_status: {new_status}")
        print("database schema: hrms")
        print("database table: leave_requests")
        print(f"update payload: {updates}")

        db_err = None
        db_res = None

        # Try to update in Supabase hrms schema
        try:
            res = self.supabase.schema("hrms").table("leave_requests").update(updates).eq("leave_request_id", request_id).execute()
            if res.data and len(res.data) > 0:
                db_res = res.data
                print(f"database response: {res.data}")
                print("database error: None")
                return self._standardize_leave_requests(res.data)[0]
            else:
                raise RuntimeError("No matching leave request row found to update in hrms.leave_requests")
        except Exception as e:
            db_err = e
            # Try to update in Supabase public fallback schema
            try:
                res = self.supabase.table("leave_requests").update(updates).eq("leave_request_id", request_id).execute()
                if res.data and len(res.data) > 0:
                    db_res = res.data
                    print(f"database response: {res.data}")
                    print("database error: None")
                    return self._standardize_leave_requests(res.data)[0]
                else:
                    raise RuntimeError("No matching leave request row found to update in public.leave_requests")
            except Exception as e2:
                db_err = e2

        print("database response: None")
        print(f"database error: {db_err}")
        # Enforce error propagation and block memory fallback as a substitute
        raise RuntimeError(f"Database leave status update failed: {db_err}")
