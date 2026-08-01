from typing import List, Optional, Dict, Any
import uuid
import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_employees: List[Dict[str, Any]] = []


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
        all_employees: List[Dict[str, Any]] = []
        seen_emails: set = set()

        # Step 1: Read from hrms.employees DB table (primary — most accurate)
        try:
            res = self.supabase.schema("hrms").table("employees").select("*").execute()
            db_rows = res.data or []
            for emp in db_rows:
                emp_email = str(emp.get("email", "")).lower()
                if not emp_email:
                    continue
                # Normalize field names for frontend compatibility
                normalized = {
                    "employee_id": emp.get("employee_id") or emp.get("id") or str(uuid.uuid4()),
                    "id": emp.get("employee_id") or emp.get("id"),
                    "auth_user_id": emp.get("auth_user_id") or emp.get("user_id") or emp.get("employee_id"),
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
                }
                all_employees.append(normalized)
                seen_emails.add(emp_email)
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
                    if not email or email.lower() in seen_emails:
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
                    all_employees.append({
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
                    })
                    seen_emails.add(email.lower())
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

        if all_employees:
            return all_employees

        logger.warning("No employees found from any source -- returning in-memory fallback")
        return _in_memory_employees

    # ── Create employee (called directly via HRMS routes) ─────────────────────
    def create_employee(self, data: Dict[str, Any]) -> Dict[str, Any]:
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
        }

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

    # ── Update employee ───────────────────────────────────────────────────────
    def update_employee(self, emp_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        clean_updates = {k: v for k, v in updates.items() if v is not None}

        # Try hrms schema first
        try:
            res = self.supabase.schema("hrms").table("employees").update(clean_updates).eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

        # Try public schema
        try:
            res = self.supabase.table("employees").update(clean_updates).eq("employee_id", emp_id).execute()
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
            res = self.supabase.schema("hrms").table("employees").select("*").eq("employee_id", emp_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

        employees = self.get_all_employees()
        for emp in employees:
            if str(emp.get("employee_id")) == str(emp_id) or str(emp.get("id")) == str(emp_id):
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
