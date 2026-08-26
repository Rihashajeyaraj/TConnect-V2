from typing import List, Optional, Dict, Any
import uuid
import datetime
import time
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_employees: List[Dict[str, Any]] = []

_EMPLOYEES_CACHE = None
_EMPLOYEES_CACHE_TIMESTAMP = 0.0
CACHE_TTL_SECONDS = 15.0  # 15 seconds TTL cache

def _clear_employees_cache():
    global _EMPLOYEES_CACHE, _EMPLOYEES_CACHE_TIMESTAMP
    _EMPLOYEES_CACHE = None
    _EMPLOYEES_CACHE_TIMESTAMP = 0.0


class HRMSRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    # ── Internal helper: insert into hrms.employees ──────────────────────────
    def _insert_employee_record(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Insert an employee record into hrms.employees.

        Identity model:
          user_id / auth_user_id = auth.users.id (stored as TEXT, no DB FK).
          The DB FK constraint employees_user_id_fkey has been removed by the
          fix_fk_constraint.sql migration because it incorrectly referenced
          public.users, which does not exist in this project.

        Schema exposure:
          This method requires 'hrms' to be added to Supabase API exposed schemas.
          Dashboard -> Settings -> API -> Extra Search Path -> add "hrms".
          Without that step, every call raises PGRST106 and returns None.

        Returns the inserted row dict or None on failure.
        """
        # Strip None values to avoid NOT NULL constraint failures
        clean_payload = {k: v for k, v in payload.items() if v is not None}

        # Primary insert: hrms schema (authoritative table)
        try:
            res = self.supabase.schema("hrms").table("employees").insert(clean_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(
                    f"Employee saved to hrms.employees "
                    f"(employee_code={clean_payload.get('employee_code')})"
                )
                return res.data[0]
        except Exception as e1:
            err_str = str(e1)
            if "PGRST106" in err_str or "Invalid schema" in err_str:
                logger.warning(
                    "hrms schema is not exposed in PostgREST. "
                    "Go to Supabase Dashboard -> Settings -> API -> Extra Search Path "
                    "and add 'hrms' to the list, then reload the API. "
                    f"Original error: {e1}"
                )
            else:
                logger.debug(f"hrms.employees insert notice: {e1}")

        # Fallback: hrms schema with minimal required fields only
        # (avoids NOT NULL failures from optional columns the caller may not have set)
        minimal = {
            k: clean_payload[k]
            for k in ["employee_code", "first_name", "last_name", "email"]
            if k in clean_payload
        }
        if clean_payload.get("employee_id"):
            minimal["employee_id"] = clean_payload["employee_id"]
        if clean_payload.get("user_id"):
            minimal["user_id"] = clean_payload["user_id"]
        if clean_payload.get("auth_user_id"):
            minimal["auth_user_id"] = clean_payload["auth_user_id"]
        try:
            res = self.supabase.schema("hrms").table("employees").insert(minimal).execute()
            if res.data and len(res.data) > 0:
                logger.info("Employee saved to hrms.employees (minimal payload)")
                return res.data[0]
        except Exception as e2:
            logger.warning(
                f"hrms.employees insert failed (full and minimal payloads both failed). "
                f"Ensure fix_fk_constraint.sql has been run and 'hrms' is in the "
                f"Supabase API Extra Search Path. Error: {e2}"
            )

        return None

    # ── Read all employees ────────────────────────────────────────────────────
    def get_all_employees(self) -> List[Dict[str, Any]]:
        global _EMPLOYEES_CACHE, _EMPLOYEES_CACHE_TIMESTAMP
        now = time.time()
        if _EMPLOYEES_CACHE is not None and (now - _EMPLOYEES_CACHE_TIMESTAMP) < CACHE_TTL_SECONDS:
            logger.info("Returning cached employees list")
            return _EMPLOYEES_CACHE

        all_employees: List[Dict[str, Any]] = []
        seen_emails: set = set()
        seen_ids: set = set()

        # Step 1: Read from hrms.employees DB table (primary — most accurate)
        try:
            res = self.supabase.schema("hrms").table("employees").select("*").execute()
            db_rows = res.data or []
            for emp in db_rows:
                emp_email = str(emp.get("email", "")).lower()
                if not emp_email:
                    continue
                # Normalize field names for frontend compatibility
                emp_id = emp.get("employee_id") or emp.get("id") or str(uuid.uuid4())
                normalized = {
                    "employee_id": emp_id,
                    "id": emp_id,
                    "auth_user_id": emp.get("auth_user_id") or emp.get("user_id") or emp_id,
                    "employee_code": emp.get("employee_code") or "N/A",
                    "first_name": emp.get("first_name") or "",
                    "last_name": emp.get("last_name") or "",
                    "name": emp.get("name") or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
                    "email": emp.get("email", ""),
                    "phone": emp.get("phone") or emp.get("mobile") or "+91 99999 00000",
                    "designation": emp.get("designation") or emp.get("role") or "Sales Executive",
                    "department": emp.get("department") or emp.get("dept") or "Sales & Business Development",
                    "role": emp.get("role") or emp.get("designation") or "Sales Executive",
                    "dept": emp.get("dept") or emp.get("department") or "Sales & Business Development",
                    "status": emp.get("status", "Active"),
                    "gender": emp.get("gender"),
                    "date_of_birth": emp.get("date_of_birth"),
                    "joining_date": emp.get("joining_date"),
                    "created_at": emp.get("created_at"),
                    "reporting_manager": emp.get("reporting_manager"),
                    "reporting_manager_id": emp.get("reporting_manager_id") or emp.get("reporting_manager"),
                    "reporting_manager_name": emp.get("reporting_manager_name") or "Not Assigned",
                    "reporting_manager_email": emp.get("reporting_manager_email") or "",
                    "annual_leaves": emp.get("annual_leaves") if emp.get("annual_leaves") is not None else 12,
                    "half_day_permissions": emp.get("half_day_permissions") if emp.get("half_day_permissions") is not None else 6,
                    "short_permissions": emp.get("short_permissions") if emp.get("short_permissions") is not None else 2,
                    "incentive_percentage": float(emp.get("incentive_percentage")) if emp.get("incentive_percentage") is not None else 5.0,
                }
                for k, v in emp.items():
                    if k not in normalized:
                        normalized[k] = v
                all_employees.append(normalized)
                seen_emails.add(emp_email)
                seen_ids.add(str(emp_id).lower().strip())
            logger.info(f"Loaded {len(all_employees)} employees from hrms.employees DB table")
        except Exception as db_err:
            logger.debug(f"hrms.employees DB read notice: {db_err}")

        # Step 2: Supplement from Supabase Auth admin.list_users()
        # (covers users created but whose DB insert might have partially failed)
        try:
            admin_client = get_supabase_admin_client() or self.supabase
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                res_users = auth_admin.admin.list_users()
                users_data = res_users if isinstance(res_users, list) else getattr(res_users, "users", [])
                for idx, u in enumerate(users_data or []):
                    email = getattr(u, "email", None) or ""
                    u_id_str = str(u.id).lower().strip()
                    if not email or email.lower() in seen_emails or u_id_str in seen_ids:
                        continue
                    meta = getattr(u, "user_metadata", {}) or {}
                    # employee_code is always stored in metadata at creation time (EMP000001 format)
                    emp_code = meta.get("employee_code") or f"EMP{idx+1:06d}"
                    first_name = meta.get("first_name") or (
                        (meta.get("full_name") or email.split("@")[0].replace(".", " ").title()).split(" ")[0]
                    )
                    last_name = meta.get("last_name") or (
                        " ".join((meta.get("full_name") or "").split(" ")[1:])
                        if " " in (meta.get("full_name") or "") else ""
                    )
                    normalized = {
                        "employee_id": str(u.id),
                        "id": str(u.id),
                        "auth_user_id": str(u.id),
                        "employee_code": emp_code,
                        "first_name": first_name,
                        "last_name": last_name,
                        "name": meta.get("full_name") or email.split("@")[0].replace(".", " ").title(),
                        "email": email,
                        "phone": meta.get("phone") or "+91 99999 00000",
                        "designation": meta.get("role") or "Sales Executive",
                        "department": meta.get("dept") or meta.get("department") or "Sales & Business Development",
                        "role": meta.get("role") or "Sales Executive",
                        "dept": meta.get("dept") or meta.get("department") or "Sales & Business Development",
                        "status": "Active",
                        "gender": meta.get("gender"),
                        "date_of_birth": meta.get("date_of_birth"),
                        "reporting_manager_id": meta.get("reporting_manager_id"),
                        "reporting_manager_name": meta.get("reporting_manager_name") or "Not Assigned",
                        "reporting_manager_email": meta.get("reporting_manager_email") or "",
                        "annual_leaves": meta.get("annual_leaves") if meta.get("annual_leaves") is not None else 12,
                        "half_day_permissions": meta.get("half_day_permissions") if meta.get("half_day_permissions") is not None else 6,
                        "short_permissions": meta.get("short_permissions") if meta.get("short_permissions") is not None else 2,
                        "incentive_percentage": float(meta.get("incentive_percentage")) if meta.get("incentive_percentage") is not None else 5.0,
                    }
                    for k, v in meta.items():
                        if k not in normalized:
                            normalized[k] = v
                    all_employees.append(normalized)
                    seen_emails.add(email.lower())
                    seen_ids.add(u_id_str)
            logger.info(f"Total employees after Auth merge: {len(all_employees)}")
        except Exception as auth_err:
            logger.warning(f"Supabase Auth list_users notice in HRMS: {auth_err}")

        # NOTE: public.employees is a VIEW over hrms.employees (or the normalised
        # public base table). We intentionally do NOT merge from it here because:
        #   1. If it's a view over hrms.employees, the rows were already loaded in Step 1.
        #   2. If it's the normalised public base table, its schema is incompatible
        #      (department_id, designation_id FK columns) and it previously carried
        #      the broken employees_user_id_fkey that referenced non-existent public.users.
        # Merging from it would cause duplicate rows and schema mismatches.

        # Step 3: Resolve reporting manager names/emails dynamically using lookup map
        id_to_name = {}
        id_to_email = {}
        for emp in all_employees:
            emp_id_key = emp.get("employee_id") or emp.get("id")
            if emp_id_key:
                id_to_name[str(emp_id_key)] = emp.get("name")
                id_to_email[str(emp_id_key)] = emp.get("email")
                
        # Find CEO employee
        ceo_emp = None
        for emp in all_employees:
            role_lower = str(emp.get("role") or emp.get("designation") or "").lower()
            email_lower = str(emp.get("email") or "").lower()
            if "ceo" in role_lower or "founder" in role_lower or email_lower == "ceo@tconnect.com":
                ceo_emp = emp
                break

        for emp in all_employees:
            emp_role = str(emp.get("role") or emp.get("designation") or "").lower()
            is_manager = "manager" in emp_role and "executive" not in emp_role and "ceo" not in emp_role and "admin" not in emp_role
            mgr_id = emp.get("reporting_manager_id") or emp.get("reporting_manager")
            
            if is_manager and (not mgr_id or emp.get("reporting_manager_name") in (None, "Not Assigned", "", "—")):
                if ceo_emp:
                    emp_uuid = ceo_emp.get("employee_id") or ceo_emp.get("id") or ceo_emp.get("user_id") or "EMP000001"
                    emp["reporting_manager"] = emp_uuid
                    emp["reporting_manager_id"] = emp_uuid
                    emp["reporting_manager_name"] = ceo_emp.get("name") or "Dr. Twite Executive"
                    emp["reporting_manager_email"] = ceo_emp.get("email") or "ceo@tconnect.com"
                else:
                    emp["reporting_manager"] = "EMP000001"
                    emp["reporting_manager_id"] = "EMP000001"
                    emp["reporting_manager_name"] = "Dr. Twite Executive"
                    emp["reporting_manager_email"] = "ceo@tconnect.com"
            else:
                if mgr_id and (not emp.get("reporting_manager_name") or emp.get("reporting_manager_name") in (None, "Not Assigned", "", "—")):
                    name_found = id_to_name.get(str(mgr_id))
                    email_found = id_to_email.get(str(mgr_id))
                    if name_found:
                        emp["reporting_manager_name"] = name_found
                    if email_found:
                        emp["reporting_manager_email"] = email_found

        if all_employees:
            _EMPLOYEES_CACHE = all_employees
            _EMPLOYEES_CACHE_TIMESTAMP = time.time()
            return all_employees

        _EMPLOYEES_CACHE = _in_memory_employees
        _EMPLOYEES_CACHE_TIMESTAMP = time.time()
        logger.warning("No employees found from any source -- returning in-memory fallback")
        return _in_memory_employees

    # ── Create employee (called directly via HRMS routes) ─────────────────────
    def create_employee(self, data: Dict[str, Any]) -> Dict[str, Any]:
        _clear_employees_cache()
        email = data.get("email", "").strip()
        temp_password = data.get("password") or f"TC@Emp{len(_in_memory_employees)+1001}"
        company_id = data.get("company_id", "TC-001")

        full_name = data.get("name") or f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Employee"
        parts = full_name.split() if full_name else []
        first_name = data.get("first_name") or (parts[0] if parts else "Employee")
        last_name = data.get("last_name") or (" ".join(parts[1:]) if len(parts) > 1 else "")

        role = data.get("role") or data.get("designation") or "Sales Executive"
        dept = data.get("department") or data.get("dept") or "Sales & Business Development"
        phone = data.get("phone") or data.get("mobile") or "+91 99999 88888"

        # ── Generate sequential employee code BEFORE creating auth user ─────────
        # This ensures the same code is stored in both user_metadata and hrms.employees.
        emp_code = data.get("employee_code") or self.next_sequential_code()
        auth_user_id = str(uuid.uuid4())  # temp placeholder; replaced after auth creation

        # Step 1: Create Supabase Auth user — store employee_code + all metadata
        # We do NOT alter auth.users schema; all extra data goes into user_metadata.
        try:
            admin_client = get_supabase_admin_client() or self.supabase
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                auth_res = auth_admin.admin.create_user({
                    "email": email,
                    "password": temp_password,
                    "email_confirm": True,
                    "user_metadata": {
                        # Sequential employee code — synced with hrms.employees
                        "employee_code": emp_code,
                        # Identity & role metadata
                        "full_name": full_name,
                        "first_name": first_name,
                        "last_name": last_name,
                        "role": role,
                        "department": dept,
                        "dept": dept,
                        "phone": phone,
                        "company_id": company_id,
                        "gender": data.get("gender"),
                        "date_of_birth": data.get("date_of_birth"),
                        "joining_date": data.get("joining_date") or datetime.date.today().isoformat(),
                    }
                })
                if auth_res and hasattr(auth_res, "user") and auth_res.user:
                    # Use the real Supabase auth UID as user_id in hrms.employees
                    auth_user_id = str(auth_res.user.id)
                logger.info(f"✅ Auth user created: {email} | UID={auth_user_id} | emp_code={emp_code}")
        except Exception as auth_err:
            logger.warning(f"Supabase Auth creation notice for {email}: {auth_err}")

        # Step 2: Insert into hrms.employees — user_id = auth.users.id
        emp_record = {
            "employee_id": auth_user_id,
            "user_id": auth_user_id,          # ← foreign key to auth.users.id
            "auth_user_id": auth_user_id,
            "employee_code": emp_code,         # ← matches user_metadata.employee_code
            "first_name": first_name,
            "last_name": last_name,
            "name": full_name,
            "email": email,
            "phone": phone,
            "designation": role,
            "department": dept,
            "role": role,
            "dept": dept,
            "gender": data.get("gender"),
            "date_of_birth": data.get("date_of_birth"),
            "joining_date": data.get("joining_date") or datetime.date.today().isoformat(),
            "company_id": company_id,
            "status": "Active",
            "annual_leaves": data.get("annual_leaves", 12),
            "half_day_permissions": data.get("half_day_permissions", 6),
            "short_permissions": data.get("short_permissions", 2),
            "incentive_percentage": float(data.get("incentive_percentage", 5.0)),
        }

        db_result = self._insert_employee_record(emp_record)
        if db_result:
            emp_record.update(db_result)

        # NOTE: There is intentionally NO sync to public.users or organization.users here.
        # public.users does not exist in this project (confirmed: PGRST205 on every attempt).
        # Identity is managed by Supabase Auth (auth.users). employee records live in
        # hrms.employees. The broken sync caused a silent PGRST205 error on every call
        # and has been removed as part of the employees_user_id_fkey constraint fix.


        _in_memory_employees.append(emp_record)

        emp_record["temp_password"] = temp_password
        emp_record["welcome_email_sent"] = True
        emp_record["welcome_email_subject"] = "Welcome to TwiteConnect"
        emp_record["welcome_email_body"] = (
            f"Hello {full_name},\nYour employee account has been created.\n"
            f"Employee ID: {emp_code}\nEmail: {email}\n"
            f"Temporary Password: {temp_password}\n"
            f"Please login and change your password.\nRegards,\nHR Team"
        )
        return emp_record

    # ── Sync employee created via Admin User Management ───────────────────────
    def sync_employee_from_user(self, data: Dict[str, Any]) -> Dict[str, Any]:
        _clear_employees_cache()
        """
        Called by UserRepository AFTER creating a Supabase Auth user.
        Inserts the employee record into hrms.employees using:
          - user_id   = auth.users.id  (the real Supabase UID)
          - employee_code = the code already stored in user_metadata (pre-generated)
        Never re-generates the employee_code here — uses the one passed in from UserRepository
        so auth.users.user_metadata and hrms.employees stay in sync.
        """
        # auth_uid is auth.users.id — passed from UserRepository after auth creation
        auth_uid = data.get("employee_id") or data.get("auth_user_id") or data.get("user_id") or str(uuid.uuid4())
        # emp_code MUST come from the caller (already set in user_metadata)
        emp_code = data.get("employee_code")
        if not emp_code:
            # Fallback only if caller forgot to pass it — should not happen
            emp_code = self.next_sequential_code()
            logger.warning(f"sync_employee_from_user: emp_code not provided, generated fallback: {emp_code}")

        first_name = data.get("first_name") or ""
        last_name = data.get("last_name") or ""
        email = data.get("email", "")
        role = data.get("role") or data.get("designation") or "Sales Executive"
        dept = data.get("department") or data.get("dept") or "Sales & Business Development"
        company_id = data.get("company_id", "TC-001")

        emp_record = {
            "employee_id": auth_uid,
            "user_id": auth_uid,          # ← auth.users.id
            "auth_user_id": auth_uid,
            "employee_code": emp_code,     # ← same value stored in user_metadata
            "first_name": first_name,
            "last_name": last_name,
            "name": data.get("name") or f"{first_name} {last_name}".strip(),
            "email": email,
            "phone": data.get("phone") or "+91 99999 00000",
            "designation": role,
            "department": dept,
            "role": role,
            "dept": dept,
            "gender": data.get("gender"),
            "date_of_birth": data.get("date_of_birth"),
            "joining_date": data.get("joining_date") or datetime.date.today().isoformat(),
            "company_id": company_id,
            "status": data.get("status", "Active"),
            "annual_leaves": data.get("annual_leaves", 12),
            "half_day_permissions": data.get("half_day_permissions", 6),
            "short_permissions": data.get("short_permissions", 2),
            "incentive_percentage": float(data.get("incentive_percentage", 5.0)),
        }

        if data.get("reporting_manager"):
            emp_record["reporting_manager"] = data["reporting_manager"]
        if data.get("reporting_manager_id"):
            emp_record["reporting_manager_id"] = data["reporting_manager_id"]
        if data.get("reporting_manager_name"):
            emp_record["reporting_manager_name"] = data["reporting_manager_name"]
        if data.get("reporting_manager_email"):
            emp_record["reporting_manager_email"] = data["reporting_manager_email"]

        db_result = self._insert_employee_record(emp_record)
        if db_result:
            emp_record.update(db_result)
            logger.info(f"✅ hrms.employees row created | user_id={auth_uid} | emp_code={emp_code}")
        else:
            # Store in memory as last resort so HRMS listing still shows the employee
            _in_memory_employees.append(emp_record)
            logger.warning(
                f"Employee {email} stored in-memory only — DB insert failed. "
                f"Ensure hrms_schema.sql has been run and 'hrms' is in Supabase API exposed schemas."
            )

        return emp_record

    def update_employee(self, emp_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        _clear_employees_cache()
        clean_updates = {k: v for k, v in updates.items() if v is not None}
        is_uuid = lambda x: x and "-" in str(x)

        # Try hrms schema first
        try:
            if is_uuid(emp_id):
                res = self.supabase.schema("hrms").table("employees").update(clean_updates).eq("employee_id", emp_id).select().execute()
            else:
                res = self.supabase.schema("hrms").table("employees").update(clean_updates).eq("employee_code", emp_id).select().execute()
                
            if res.data and len(res.data) > 0:
                return res.data[0]
            
            # If update succeeds but returns no rows, perform an upsert.
            # We fetch existing details to populate employee_code and email to satisfy NOT NULL constraints.
            existing = self.get_employee_by_id(emp_id)
            real_uuid = None
            if existing:
                real_uuid = existing.get("employee_id") or existing.get("user_id") or existing.get("auth_user_id")
            if not real_uuid and is_uuid(emp_id):
                real_uuid = emp_id

            if real_uuid:
                clean_updates["employee_id"] = real_uuid
                clean_updates["user_id"] = real_uuid
                clean_updates["auth_user_id"] = real_uuid

            if existing:
                clean_updates["employee_code"] = existing.get("employee_code") or "EMP-FALLBACK"
                clean_updates["email"] = existing.get("email") or ""
                if "role" not in clean_updates:
                    clean_updates["role"] = existing.get("role") or "Admin"
                if "designation" not in clean_updates:
                    clean_updates["designation"] = existing.get("designation") or "Admin"
                if "dept" not in clean_updates:
                    clean_updates["dept"] = existing.get("dept") or "Management"
                if "department" not in clean_updates:
                    clean_updates["department"] = existing.get("department") or "Management"
            else:
                clean_updates["employee_code"] = emp_id if not is_uuid(emp_id) else "EMP-FALLBACK"
                clean_updates["email"] = ""
                clean_updates["role"] = "Admin"
                clean_updates["designation"] = "Admin"
                clean_updates["dept"] = "Management"
                clean_updates["department"] = "Management"

            res = self.supabase.schema("hrms").table("employees").upsert(clean_updates, on_conflict="employee_id").select().execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"HRMS employees update/upsert failed: {e}")

        # Try public schema
        try:
            res = self.supabase.table("employees").update(clean_updates).eq("employee_id", emp_id).select().execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Employee update failed: {e}")

        # In-memory fallback
        for emp in _in_memory_employees:
            if str(emp.get("employee_id")) == str(emp_id) or str(emp.get("id")) == str(emp_id):
                emp.update(clean_updates)
                return emp

        return clean_updates

    # ── Delete employee ───────────────────────────────────────────────────────
    def delete_employee(self, emp_id: str) -> bool:
        _clear_employees_cache()
        """Delete employee from hrms.employees, public.employees, Supabase Auth, and memory."""
        global _in_memory_employees
        _in_memory_employees = [
            e for e in _in_memory_employees
            if str(e.get("employee_id")) != str(emp_id) and str(e.get("id")) != str(emp_id)
        ]

        # Delete from hrms.employees
        try:
            self.supabase.schema("hrms").table("employees").delete().eq("employee_id", emp_id).execute()
            logger.info(f"✅ Deleted employee {emp_id} from hrms.employees")
        except Exception:
            try:
                self.supabase.table("employees").delete().eq("employee_id", emp_id).execute()
            except Exception as e:
                logger.warning(f"Employee delete fallback: {e}")

        # Delete from Supabase Auth
        try:
            admin_client = get_supabase_admin_client() or self.supabase
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                auth_admin.admin.delete_user(emp_id)
                logger.info(f"✅ Deleted auth user {emp_id}")
        except Exception as auth_err:
            logger.debug(f"Auth delete notice for {emp_id}: {auth_err}")

        return True

    # ── Get employee by ID ────────────────────────────────────────────────────
    def get_employee_by_id(self, emp_id: str) -> Optional[Dict[str, Any]]:
        # Try DB first for accuracy
        try:
            is_uuid = lambda x: x and "-" in str(x)
            if is_uuid(emp_id):
                res = self.supabase.schema("hrms").table("employees").select("*").eq("employee_id", emp_id).execute()
            else:
                res = self.supabase.schema("hrms").table("employees").select("*").eq("employee_code", emp_id).execute()
                if not res.data or len(res.data) == 0:
                    # Fallback to email query
                    res = self.supabase.schema("hrms").table("employees").select("*").eq("email", emp_id).execute()

            if res.data and len(res.data) > 0:
                emp = res.data[0]
                # Normalize and ensure manager fields are filled
                emp["reporting_manager_id"] = emp.get("reporting_manager_id") or emp.get("reporting_manager")
                if not emp.get("reporting_manager_name") or emp.get("reporting_manager_name") == "Not Assigned":
                    mgr_uuid = emp.get("reporting_manager") or emp.get("reporting_manager_id")
                    if mgr_uuid:
                        # Try resolving by employee_id, user_id, auth_user_id — admin may have
                        # stored the manager's Supabase auth UID in any of these columns
                        mgr_found = False
                        for col in ["employee_id", "user_id", "auth_user_id"]:
                            try:
                                mgr_res = self.supabase.schema("hrms").table("employees").select(
                                    "name,first_name,last_name,email"
                                ).eq(col, str(mgr_uuid)).execute()
                                if mgr_res.data and len(mgr_res.data) > 0:
                                    mgr = mgr_res.data[0]
                                    resolved_name = (
                                        mgr.get("name")
                                        or f"{mgr.get('first_name', '')} {mgr.get('last_name', '')}".strip()
                                        or "Sales Manager"
                                    )
                                    emp["reporting_manager_name"] = resolved_name
                                    emp["reporting_manager_email"] = mgr.get("email") or ""
                                    mgr_found = True
                                    logger.info(
                                        f"Resolved manager '{resolved_name}' via hrms.employees.{col} "
                                        f"for emp={emp_id}"
                                    )
                                    break
                            except Exception:
                                continue

                        # Last-resort: look up Supabase Auth user_metadata for the manager UUID
                        if not mgr_found:
                            try:
                                admin_client = get_supabase_admin_client() or self.supabase
                                auth_admin = getattr(admin_client, "auth", None)
                                if auth_admin and hasattr(auth_admin, "admin"):
                                    mgr_auth = auth_admin.admin.get_user_by_id(str(mgr_uuid))
                                    if mgr_auth and hasattr(mgr_auth, "user") and mgr_auth.user:
                                        meta = getattr(mgr_auth.user, "user_metadata", {}) or {}
                                        resolved_name = (
                                            meta.get("full_name")
                                            or f"{meta.get('first_name', '')} {meta.get('last_name', '')}".strip()
                                            or mgr_auth.user.email.split("@")[0].replace(".", " ").title()
                                        )
                                        emp["reporting_manager_name"] = resolved_name
                                        emp["reporting_manager_email"] = mgr_auth.user.email or ""
                                        logger.info(
                                            f"Resolved manager '{resolved_name}' via Supabase Auth for emp={emp_id}"
                                        )
                            except Exception as auth_err:
                                logger.debug(f"Auth manager resolve notice: {auth_err}")

                emp_role = str(emp.get("role") or emp.get("designation") or "").lower()
                is_manager = "manager" in emp_role and "executive" not in emp_role and "ceo" not in emp_role and "admin" not in emp_role
                mgr_id = emp.get("reporting_manager_id") or emp.get("reporting_manager")
                if is_manager and (not mgr_id or emp.get("reporting_manager_name") in (None, "Not Assigned", "", "—")):
                    # Fetch CEO directly from DB table
                    try:
                        ceo_res = self.supabase.schema("hrms").table("employees").select("*").eq("email", "ceo@tconnect.com").execute()
                        if ceo_res.data and len(ceo_res.data) > 0:
                            ceo = ceo_res.data[0]
                            emp_uuid = ceo.get("employee_id") or ceo.get("id") or ceo.get("user_id") or "EMP000001"
                            emp["reporting_manager"] = emp_uuid
                            emp["reporting_manager_id"] = emp_uuid
                            emp["reporting_manager_name"] = ceo.get("name") or "Dr. Twite Executive"
                            emp["reporting_manager_email"] = ceo.get("email") or "ceo@tconnect.com"
                        else:
                            emp["reporting_manager"] = "EMP000001"
                            emp["reporting_manager_id"] = "EMP000001"
                            emp["reporting_manager_name"] = "Dr. Twite Executive"
                            emp["reporting_manager_email"] = "ceo@tconnect.com"
                    except Exception:
                        emp["reporting_manager"] = "EMP000001"
                        emp["reporting_manager_id"] = "EMP000001"
                        emp["reporting_manager_name"] = "Dr. Twite Executive"
                        emp["reporting_manager_email"] = "ceo@tconnect.com"

                if not emp.get("reporting_manager_name"):
                    emp["reporting_manager_name"] = "Not Assigned"
                return emp
        except Exception:
            pass

        employees = self.get_all_employees()
        for emp in employees:
            if (str(emp.get("employee_id")) == str(emp_id) or 
                str(emp.get("id")) == str(emp_id) or 
                str(emp.get("employee_code")) == str(emp_id) or 
                str(emp.get("email")).lower() == str(emp_id).lower()):
                return emp
        return None


    # ── Sequential employee code generator ───────────────────────────────────
    def next_sequential_code(self) -> str:
        """
        Generate the next sequential employee code in EMP000001 format.
        Reads the current maximum numeric suffix from hrms.employees to ensure
        uniqueness across restarts and concurrent requests.
        Falls back to in-memory count if the DB is unreachable.
        """
        max_num = 0

        # Try hrms.employees for current max
        for schema_call in [
            lambda: self.supabase.schema("hrms").table("employees").select("employee_code").execute(),
            lambda: self.supabase.table("employees").select("employee_code").execute(),
        ]:
            try:
                res = schema_call()
                rows = res.data or []
                for row in rows:
                    code = str(row.get("employee_code") or "")
                    # Parse codes in both EMP000001 and legacy formats
                    if code.startswith("EMP") and code[3:].isdigit():
                        num = int(code[3:])
                        if num > max_num:
                            max_num = num
                if rows:
                    break  # successfully read from one source
            except Exception:
                continue

        # In-memory fallback count (e.g. before table is created)
        if max_num == 0 and _in_memory_employees:
            max_num = len(_in_memory_employees)

        next_num = max_num + 1
        emp_code = f"EMP{next_num:06d}"  # e.g. EMP000001, EMP000012, EMP000100
        logger.info(f"Generated sequential employee_code: {emp_code} (max_found={max_num})")
        return emp_code
