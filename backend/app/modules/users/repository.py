from typing import List, Dict, Any, Optional
import uuid
import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.exceptions.base import BadRequestException, NotFoundException
from app.core.logger import logger

_in_memory_users: List[Dict[str, Any]] = []

import threading
_users_cache_lock = threading.Lock()
_USERS_CACHE = None
_USERS_CACHE_TIMESTAMP = 0.0
CACHE_TTL_SECONDS = 300.0 # Cache users for 5 minutes

def _clear_users_cache():
    global _USERS_CACHE, _USERS_CACHE_TIMESTAMP
    _USERS_CACHE = None
    _USERS_CACHE_TIMESTAMP = 0.0


def _generate_employee_code() -> str:
    """Generate a unique employee code using timestamp + short UUID suffix."""
    now = datetime.datetime.utcnow()
    suffix = uuid.uuid4().hex[:4].upper()
    return f"TC-EMP-{now.strftime('%y%m')}-{suffix}"


class UserRepository:
    def __init__(self):
        self.client = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_users(self) -> List[Dict[str, Any]]:
        global _USERS_CACHE, _USERS_CACHE_TIMESTAMP
        import time
        now = time.time()
        if _USERS_CACHE is not None and (now - _USERS_CACHE_TIMESTAMP) < CACHE_TTL_SECONDS:
            return _USERS_CACHE

        with _users_cache_lock:
            now = time.time()
            if _USERS_CACHE is not None and (now - _USERS_CACHE_TIMESTAMP) < CACHE_TTL_SECONDS:
                return _USERS_CACHE
            return self._get_all_users_impl()

    def _get_all_users_impl(self) -> List[Dict[str, Any]]:
        global _USERS_CACHE, _USERS_CACHE_TIMESTAMP
        import time

        # 1. Fetch raw employees from hrms.employees table
        db_employees = []
        try:
            res = self.client.schema("hrms").table("employees").select("*").execute()
            if res.data and len(res.data) > 0:
                db_employees = res.data
        except Exception as e:
            try:
                res = self.client.table("employees").select("*").execute()
                if res.data and len(res.data) > 0:
                    db_employees = res.data
            except Exception:
                pass

        # 2. Build employee maps by ID, Email, and Name for reporting manager resolution
        emp_map_by_id = {}
        emp_map_by_email = {}
        emp_map_by_name = {}
        for emp in db_employees:
            e_id = str(emp.get("employee_id") or emp.get("id") or emp.get("auth_user_id") or "").strip()
            u_id = str(emp.get("user_id") or "").strip()
            e_email = str(emp.get("email") or "").strip().lower()
            e_name = str(emp.get("name") or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() or "").strip().lower()

            if e_id:
                emp_map_by_id[e_id] = emp
            if u_id:
                emp_map_by_id[u_id] = emp
            if e_email:
                emp_map_by_email[e_email] = emp
            if e_name:
                emp_map_by_name[e_name] = emp

        # Helper to resolve manager info from all possible manager columns
        def resolve_manager(emp):
            m_id = emp.get("reporting_manager_id") or emp.get("manager_id")
            m_name = emp.get("reporting_manager_name") or emp.get("manager_name")
            m_email = emp.get("reporting_manager_email") or emp.get("manager_email")

            raw_mgr = emp.get("reporting_manager")
            if raw_mgr:
                raw_str = str(raw_mgr).strip()
                if raw_str in emp_map_by_id:
                    matched = emp_map_by_id[raw_str]
                    m_id = m_id or str(matched.get("employee_id") or matched.get("id") or matched.get("user_id") or "")
                    m_name = m_name or matched.get("name") or f"{matched.get('first_name', '')} {matched.get('last_name', '')}".strip()
                    m_email = m_email or matched.get("email")
                elif raw_str.lower() in emp_map_by_email:
                    matched = emp_map_by_email[raw_str.lower()]
                    m_id = m_id or str(matched.get("employee_id") or matched.get("id") or matched.get("user_id") or "")
                    m_name = m_name or matched.get("name") or f"{matched.get('first_name', '')} {matched.get('last_name', '')}".strip()
                    m_email = m_email or matched.get("email")
                elif raw_str.lower() in emp_map_by_name:
                    matched = emp_map_by_name[raw_str.lower()]
                    m_id = m_id or str(matched.get("employee_id") or matched.get("id") or matched.get("user_id") or "")
                    m_name = m_name or matched.get("name") or f"{matched.get('first_name', '')} {matched.get('last_name', '')}".strip()
                    m_email = m_email or matched.get("email")
                elif not m_name:
                    m_name = raw_str

            # Default manager's reporting manager to the CEO
            emp_role = str(emp.get("role") or emp.get("designation") or "").lower()
            is_manager = "manager" in emp_role and "executive" not in emp_role and "ceo" not in emp_role and "admin" not in emp_role
            if is_manager and (not m_id or m_name in (None, "Not Assigned", "", "—")):
                # Scan emp_map_by_email for CEO to get real UUID/code
                ceo_uuid = None
                ceo_name = "Dr. Twite Executive"
                ceo_email = "ceo@tconnect.com"
                for k in ["ceo@tconnect.com", "ceo@twiteconnect.com", "founder@tconnect.com"]:
                    if k in emp_map_by_email:
                        matched_ceo = emp_map_by_email[k]
                        ceo_uuid = str(matched_ceo.get("employee_id") or matched_ceo.get("id") or matched_ceo.get("user_id") or "")
                        ceo_name = matched_ceo.get("name") or f"{matched_ceo.get('first_name', '')} {matched_ceo.get('last_name', '')}".strip() or ceo_name
                        ceo_email = matched_ceo.get("email") or ceo_email
                        break
                m_id = ceo_uuid or "EMP000001"
                m_name = ceo_name
                m_email = ceo_email

            if m_id and str(m_id) in emp_map_by_id:
                matched = emp_map_by_id[str(m_id)]
                m_name = m_name or matched.get("name") or f"{matched.get('first_name', '')} {matched.get('last_name', '')}".strip()
                m_email = m_email or matched.get("email")

            if m_email and str(m_email).lower() in emp_map_by_email:
                matched = emp_map_by_email[str(m_email).lower()]
                m_id = m_id or str(matched.get("employee_id") or matched.get("id") or matched.get("user_id") or "")
                m_name = m_name or matched.get("name") or f"{matched.get('first_name', '')} {matched.get('last_name', '')}".strip()

            return (str(m_id) if m_id else None), m_name, m_email

        # 3. Format db users
        db_users = []
        for emp in db_employees:
            emp_id = str(emp.get("employee_id") or emp.get("id") or f"usr_{uuid.uuid4()}")
            mgr_id, mgr_name, mgr_email = resolve_manager(emp)
            
            u_dict = {
                "id": emp_id,
                "auth_user_id": str(emp.get("user_id") or emp.get("auth_user_id") or emp_id),
                "employee_id": emp_id,
                "employee_code": emp.get("employee_code") or "N/A",
                "first_name": emp.get("first_name") or "",
                "last_name": emp.get("last_name") or "",
                "name": emp.get("name") or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() or "User Account",
                "email": emp.get("email", "user@tconnect.com"),
                "phone": emp.get("phone") or emp.get("mobile", "+91 99999 00000"),
                "role": emp.get("role") or emp.get("designation", "Sales Executive"),
                "dept": emp.get("dept") or emp.get("department", "Sales & Business Development"),
                "department": emp.get("department") or emp.get("dept", "Sales & Business Development"),
                "designation": emp.get("designation") or emp.get("role", "Sales Executive"),
                "status": emp.get("status", "Active"),
                "lastLogin": "Recently",
                "accessPassword": emp.get("accessPassword") or emp.get("password", "TConnect2026#"),
                "reporting_manager_id": mgr_id,
                "reporting_manager_name": mgr_name,
                "reporting_manager_email": mgr_email,
            }
            for k, v in emp.items():
                if k not in u_dict or u_dict[k] is None:
                    u_dict[k] = v
            db_users.append(u_dict)

        # 4. Load from Supabase Auth and merge
        auth_users_list = []
        try:
            admin_client = get_supabase_admin_client() or self.client
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                res_users = auth_admin.admin.list_users()
                if res_users:
                    users_data = res_users if isinstance(res_users, list) else getattr(res_users, "users", [])
                    for u in users_data:
                        meta = getattr(u, "user_metadata", {}) or {}
                        # Check if db user has manager resolution for this user
                        matching_db = next((d for d in db_users if str(d["email"]).lower() == str(u.email).lower() or d["id"] == str(u.id)), None)
                        mgr_id = matching_db.get("reporting_manager_id") if matching_db else meta.get("reporting_manager_id")
                        mgr_name = matching_db.get("reporting_manager_name") if matching_db else meta.get("reporting_manager_name")
                        mgr_email = matching_db.get("reporting_manager_email") if matching_db else meta.get("reporting_manager_email")

                        auth_users_list.append({
                            "id": str(u.id),
                            "auth_user_id": str(u.id),
                            "employee_id": matching_db.get("employee_id") if matching_db else str(u.id),
                            "employee_code": (matching_db.get("employee_code") if matching_db and matching_db.get("employee_code") != "N/A" else None) or meta.get("employee_code") or "N/A",
                            "name": meta.get("full_name") or (matching_db.get("name") if matching_db else None) or u.email.split("@")[0].replace(".", " ").title(),
                            "email": u.email,
                            "phone": meta.get("phone") or (matching_db.get("phone") if matching_db else None) or "+91 99999 00000",
                            "role": meta.get("role") or (matching_db.get("role") if matching_db else None) or "Sales Executive",
                            "dept": meta.get("dept") or meta.get("department") or (matching_db.get("dept") if matching_db else None) or "Sales & Business Development",
                            "status": meta.get("status") or "Active",
                            "lastLogin": "Recently",
                            "accessPassword": "Set via Supabase Auth",
                            "reporting_manager_id": mgr_id,
                            "reporting_manager_name": mgr_name,
                            "reporting_manager_email": mgr_email,
                        })
                logger.info(f"UserRepository: loaded {len(auth_users_list)} users from Supabase Auth")
        except Exception as auth_err:
            logger.warning(f"Supabase Auth list_users error: {auth_err}")

        # Combine with db users, matching by either email or id / auth_user_id to prevent duplicates
        all_combined = []
        auth_map_by_id = {str(u["id"]): u for u in auth_users_list}
        auth_map_by_email = {str(u["email"]).lower(): u for u in auth_users_list}
        
        merged_ids = set()
        merged_emails = set()
        
        for db_u in db_users:
            db_uid = db_u.get("id") or db_u.get("auth_user_id") or db_u.get("user_id")
            db_email = str(db_u.get("email") or "").lower().strip()
            
            matched_auth = None
            if db_uid and str(db_uid) in auth_map_by_id:
                matched_auth = auth_map_by_id[str(db_uid)]
            elif db_email and db_email in auth_map_by_email:
                matched_auth = auth_map_by_email[db_email]
                
            if matched_auth:
                # Merge DB employee values into Auth user record, keeping DB values as primary
                merged_user = matched_auth.copy()
                for k, v in db_u.items():
                    if v is not None and v != "" and v != "N/A" and v != "None":
                        merged_user[k] = v
                all_combined.append(merged_user)
                merged_ids.add(str(matched_auth["id"]))
                merged_emails.add(str(matched_auth["email"]).lower())
            else:
                # Add standalone DB user
                all_combined.append(db_u)
                
        # Add remaining Auth users that were not merged
        for auth_u in auth_users_list:
            if str(auth_u["id"]) not in merged_ids and str(auth_u["email"]).lower() not in merged_emails:
                all_combined.append(auth_u)
                
        _USERS_CACHE = all_combined
        _USERS_CACHE_TIMESTAMP = time.time()
        return all_combined

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a user in Supabase Auth AND sync them to the HRMS employee portal.
        """
        _clear_users_cache()
        user_id = str(uuid.uuid4())
        first_name = user_data.get("first_name") or user_data.get("name", "User").split(" ")[0]
        last_name = user_data.get("last_name") or (
            " ".join(user_data.get("name", "").split(" ")[1:]) if " " in user_data.get("name", "") else ""
        )
        full_name = f"{first_name} {last_name}".strip()

        emp_code = user_data.get("employee_code") or _generate_employee_code()
        role = user_data.get("role", "Sales Executive")
        dept = user_data.get("dept") or user_data.get("department", "Sales & Business Development")
        phone = user_data.get("phone", "+91 99999 99999")
        email = user_data.get("email")
        password = user_data.get("password") or user_data.get("accessPassword", "TConnect2026#")
        gender = user_data.get("gender", "Male")
        dob = user_data.get("date_of_birth")
        emergency_contact = user_data.get("emergency_contact")

        reporting_manager_id = user_data.get("reporting_manager_id")
        reporting_manager_name = user_data.get("reporting_manager_name")
        reporting_manager_email = user_data.get("reporting_manager_email")

        new_user = {
            "id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "name": full_name,
            "email": email,
            "phone": phone,
            "emergency_contact": emergency_contact,
            "gender": gender,
            "date_of_birth": dob,
            "role": role,
            "dept": dept,
            "status": user_data.get("status", "Active"),
            "lastLogin": "Just now",
            "accessPassword": password,
            "employee_code": emp_code,
            "reporting_manager_id": reporting_manager_id,
            "reporting_manager_name": reporting_manager_name,
            "reporting_manager_email": reporting_manager_email,
            "annual_leaves": user_data.get("annual_leaves", 12),
            "half_day_permissions": user_data.get("half_day_permissions", 6),
            "short_permissions": user_data.get("short_permissions", 2),
            "incentive_percentage": float(user_data.get("incentive_percentage", 5.0)),
        }

        # ── Step 1: Create user in Supabase Auth (auth.users) ──────────────────
        auth_uid = user_id
        admin_client = get_supabase_admin_client() or self.client
        try:
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                auth_res = auth_admin.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "role": role,
                        "full_name": full_name,
                        "first_name": first_name,
                        "last_name": last_name,
                        "dept": dept,
                        "department": dept,
                        "phone": phone,
                        "gender": gender,
                        "date_of_birth": dob,
                        "emergency_contact": emergency_contact,
                        "employee_code": emp_code,
                        "status": new_user["status"],
                        "reporting_manager_id": reporting_manager_id,
                        "reporting_manager_name": reporting_manager_name,
                        "reporting_manager_email": reporting_manager_email,
                        "annual_leaves": new_user["annual_leaves"],
                        "half_day_permissions": new_user["half_day_permissions"],
                        "short_permissions": new_user["short_permissions"],
                        "incentive_percentage": new_user["incentive_percentage"],
                    }
                })
                if auth_res and hasattr(auth_res, "user") and auth_res.user:
                    auth_uid = str(auth_res.user.id)
                    new_user["id"] = auth_uid
                logger.info(f"✅ Supabase Auth user created: {email} (UID: {auth_uid})")
        except Exception as auth_err:
            logger.warning(f"Supabase Auth create_user notice for {email}: {auth_err}")

        # ── Step 2: Sync to HRMS module (hrms.employees) ───────────────────────
        try:
            from app.modules.hrms.repository import HRMSRepository
            hrms_repo = HRMSRepository()
            hrms_payload = {
                "employee_id": auth_uid,
                "user_id": auth_uid,
                "auth_user_id": auth_uid,
                "employee_code": emp_code,
                "first_name": first_name,
                "last_name": last_name,
                "name": full_name,
                "email": email,
                "phone": phone,
                "role": role,
                "designation": role,
                "department": dept,
                "dept": dept,
                "gender": gender,
                "date_of_birth": dob,
                "emergency_contact": emergency_contact,
                "status": new_user["status"],
                "password": password,
                "company_id": user_data.get("company_id", "TC-001"),
                "reporting_manager": reporting_manager_id,
                "annual_leaves": new_user["annual_leaves"],
                "half_day_permissions": new_user["half_day_permissions"],
                "short_permissions": new_user["short_permissions"],
                "incentive_percentage": new_user["incentive_percentage"],
            }
            hrms_record = hrms_repo.sync_employee_from_user(hrms_payload)
            logger.info(f"✅ HRMS employee record synced for {email} (emp_code: {emp_code})")
            new_user["employee_id"] = hrms_record.get("employee_id", auth_uid)
        except Exception as hrms_err:
            logger.warning(f"HRMS sync notice for {email}: {hrms_err}")

        _in_memory_users.insert(0, new_user)
        return new_user

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        _clear_users_cache()

        # Remove password and accessPassword from updates if empty/None so existing employee password is NEVER overwritten!
        clean_updates = {k: v for k, v in updates.items() if v is not None}
        if "password" in clean_updates and not str(clean_updates["password"]).strip():
            del clean_updates["password"]
        if "accessPassword" in clean_updates and not str(clean_updates["accessPassword"]).strip():
            del clean_updates["accessPassword"]

        updates = clean_updates
        target = None
        for idx, u in enumerate(_in_memory_users):
            if u["id"] == user_id or u.get("email") == updates.get("email"):
                _in_memory_users[idx].update({k: v for k, v in updates.items() if v is not None})
                target = _in_memory_users[idx]
                break

        if not target:
            target = {
                "id": user_id,
                "name": updates.get("name", "Updated User"),
                "email": updates.get("email", "updated@tconnect.com"),
                "phone": updates.get("phone", "+91 99999 99999"),
                "role": updates.get("role", "Sales Executive"),
                "dept": updates.get("dept", "Sales & Business"),
                "status": updates.get("status", "Active"),
                "lastLogin": "Just now",
                "accessPassword": updates.get("accessPassword") or updates.get("password", "TConnect2026#"),
                "reporting_manager_id": updates.get("reporting_manager_id"),
                "reporting_manager_name": updates.get("reporting_manager_name"),
                "reporting_manager_email": updates.get("reporting_manager_email"),
            }
            _in_memory_users.insert(0, target)

        # Sync update to Supabase Auth user_metadata
        try:
            admin_client = get_supabase_admin_client() or self.client
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin") and updates:
                meta_update = {}
                for k in ["role", "dept", "department", "status", "reporting_manager_id", "reporting_manager_name", "reporting_manager_email", "annual_leaves", "half_day_permissions", "short_permissions", "incentive_percentage"]:
                    if updates.get(k) is not None:
                        meta_update[k] = updates[k]
                if updates.get("name"):
                    meta_update["full_name"] = updates["name"]
                if meta_update:
                    auth_admin.admin.update_user_by_id(user_id, {"user_metadata": meta_update})
        except Exception as meta_err:
            logger.debug(f"Auth metadata update notice: {meta_err}")

        # If the user being updated is a manager, propagate name/email changes to subordinates
        new_name = updates.get("name")
        new_email = updates.get("email")
        if new_name or new_email:
            propagate_updates = {}
            if new_name:
                propagate_updates["reporting_manager_name"] = new_name
            if new_email:
                propagate_updates["reporting_manager_email"] = new_email
            try:
                self.client.schema("hrms").table("employees").update(propagate_updates).or_(f"reporting_manager_id.eq.{user_id},reporting_manager.eq.{user_id}").execute()
            except Exception as e:
                logger.debug(f"Could not propagate manager details: {e}")

        # Resolve manager details from hrms.employees or _in_memory_users
        mgr_id_val = updates.get("reporting_manager_id") or updates.get("reporting_manager")
        mgr_name_val = updates.get("reporting_manager_name")
        mgr_email_val = updates.get("reporting_manager_email")
        resolved_mgr_uuid = None
        is_uuid = lambda x: x and len(str(x)) == 36 and "-" in str(x)

        if mgr_id_val or mgr_email_val or mgr_name_val:
            try:
                mgr_query = self.client.schema("hrms").table("employees").select("employee_id, employee_code, name, email")
                if mgr_id_val:
                    mgr_query = mgr_query.or_(f"employee_id.eq.{mgr_id_val},user_id.eq.{mgr_id_val},employee_code.eq.{mgr_id_val}")
                elif mgr_email_val:
                    mgr_query = mgr_query.eq("email", str(mgr_email_val).strip().lower())
                elif mgr_name_val:
                    mgr_query = mgr_query.eq("name", str(mgr_name_val).strip())
                
                mgr_res = mgr_query.limit(1).execute()
                if mgr_res.data:
                    resolved_mgr_uuid = mgr_res.data[0]["employee_id"]
                    if not mgr_name_val:
                        mgr_name_val = mgr_res.data[0].get("name")
                    if not mgr_email_val:
                        mgr_email_val = mgr_res.data[0].get("email")
            except Exception as e:
                logger.debug(f"Manager resolution notice: {e}")

            if not resolved_mgr_uuid and is_uuid(mgr_id_val):
                resolved_mgr_uuid = str(mgr_id_val)

        db_updates = {}
        if updates.get("name"):
            db_updates["first_name"] = updates["name"].split(" ")[0]
            db_updates["last_name"] = " ".join(updates["name"].split(" ")[1:]) if " " in updates["name"] else ""
        if updates.get("email"):
            db_updates["email"] = updates["email"]
        if updates.get("role"):
            db_updates["designation"] = updates["role"]
            db_updates["role"] = updates["role"]
        if updates.get("status"):
            db_updates["status"] = updates["status"]
        if "reporting_manager_id" in updates or "reporting_manager" in updates:
            db_updates["reporting_manager"] = resolved_mgr_uuid
            db_updates["reporting_manager_id"] = resolved_mgr_uuid or (str(mgr_id_val) if mgr_id_val else None)
        if "reporting_manager_name" in updates or mgr_name_val is not None:
            db_updates["reporting_manager_name"] = mgr_name_val if ("reporting_manager_id" in updates and updates.get("reporting_manager_id")) else updates.get("reporting_manager_name")
        if "reporting_manager_email" in updates or mgr_email_val is not None:
            db_updates["reporting_manager_email"] = mgr_email_val if ("reporting_manager_id" in updates and updates.get("reporting_manager_id")) else updates.get("reporting_manager_email")
        profile_fields = [
            "first_name", "last_name", "name", "email", "phone", "mobile", "role", "designation",
            "dept", "department", "status", "gender", "date_of_birth", "joining_date",
            "employment_type", "work_mode", "work_location", "marital_status", "blood_group",
            "pan_id", "personal_email", "alternate_contact", "current_address", "permanent_address",
            "city", "state", "country", "postal_code", "primary_skills", "secondary_skills",
            "tools", "emergency_name", "emergency_relationship", "emergency_contact",
            "account_holder", "bank_name", "account_number", "ifsc", "branch", "profile_photo",
            "annual_leaves", "sick_leaves", "other_leaves", "half_day_permissions", "short_permissions",
            "incentive_percentage", "employee_code"
        ]
        for field in profile_fields:
            if field in updates and updates[field] is not None:
                db_updates[field] = updates[field]

        print("[REPORTING MANAGER]")
        print(f"employee_id: {user_id}")
        print(f"selected_manager_id: {updates.get('reporting_manager_id')}")
        print(f"selected_manager_name: {updates.get('reporting_manager_name')}")
        print("database schema: hrms")
        print("database table: employees")
        print(f"update payload: {db_updates}")

        db_err = None
        db_res = None
        user_email = updates.get("email") or (target.get("email") if target else None)
        if not user_email:
            try:
                matching_u = next((u for u in _in_memory_users if u["id"] == user_id), None)
                if matching_u:
                    user_email = matching_u.get("email")
            except Exception:
                pass

        try:
            # 1. Try updating by employee_id, user_id, auth_user_id, or employee_code
            res = self.client.schema("hrms").table("employees").update(db_updates).or_(
                f"employee_id.eq.{user_id},user_id.eq.{user_id},auth_user_id.eq.{user_id},employee_code.eq.{user_id}"
            ).execute()
            if res.data and len(res.data) > 0:
                db_res = res.data
                logger.info(f"✅ Successfully updated hrms.employees record in Supabase: {user_id}")
            else:
                # 2. Try updating by email (fallback for mismatched auth/db records)
                if user_email:
                    res = self.client.schema("hrms").table("employees").update(db_updates).eq("email", user_email).execute()
                    if res.data and len(res.data) > 0:
                        db_res = res.data
                        logger.info(f"✅ Successfully updated hrms.employees by email in Supabase: {user_email}")
        except Exception as e1:
            logger.warning(f"Full employee update attempt failed: {e1}, retrying with standard schema columns...")
            # Fallback: Retry with only guaranteed standard schema columns
            clean_updates = {
                k: v for k, v in db_updates.items() 
                if k in ("reporting_manager", "first_name", "last_name", "name", "email", "role", "designation", "department", "dept", "status", "phone")
            }
            try:
                res = self.client.schema("hrms").table("employees").update(clean_updates).or_(
                    f"employee_id.eq.{user_id},user_id.eq.{user_id},auth_user_id.eq.{user_id},employee_code.eq.{user_id}"
                ).execute()
                if res.data and len(res.data) > 0:
                    db_res = res.data
                    logger.info(f"✅ Successfully updated hrms.employees (standard cols) in Supabase: {user_id}")
                elif user_email:
                    res = self.client.schema("hrms").table("employees").update(clean_updates).eq("email", user_email).execute()
                    if res.data and len(res.data) > 0:
                        db_res = res.data
                        logger.info(f"✅ Successfully updated hrms.employees by email (standard cols) in Supabase: {user_email}")
            except Exception as e2:
                logger.error(f"Fallback employee update failed: {e2}")

        # 3. Also update public.users table if it exists
        try:
            pub_updates = {}
            if "name" in updates:
                pub_updates["name"] = updates["name"]
            if "email" in updates:
                pub_updates["email"] = updates["email"]
            if "role" in updates:
                pub_updates["role"] = updates["role"]
            if "status" in updates:
                pub_updates["status"] = updates["status"]
            if resolved_mgr_uuid or mgr_id_val:
                pub_updates["reporting_manager_id"] = str(resolved_mgr_uuid or mgr_id_val)
                pub_updates["reporting_manager_name"] = mgr_name_val
                pub_updates["reporting_manager_email"] = mgr_email_val
            elif "reporting_manager_id" in updates and not updates.get("reporting_manager_id"):
                pub_updates["reporting_manager_id"] = None
                pub_updates["reporting_manager_name"] = None
                pub_updates["reporting_manager_email"] = None
            if pub_updates:
                self.client.table("users").update(pub_updates).or_(f"id.eq.{user_id},email.eq.{user_email}").execute()
        except Exception:
            pass

        # 4. If no record was updated in hrms.employees, create/sync it dynamically
        if not db_res:
            try:
                from app.modules.hrms.repository import HRMSRepository
                hrms_repo = HRMSRepository()

                u_name = updates.get("name") or (target.get("name") if target else "User Account")
                u_email = user_email or updates.get("email") or "user@tconnect.com"
                u_phone = updates.get("phone") or (target.get("phone") if target else "+91 99999 00000")
                u_role = updates.get("role") or (target.get("role") if target else "Sales Executive")
                u_dept = updates.get("dept") or updates.get("department") or (target.get("dept") if target else "Sales & Business Development")
                u_status = updates.get("status") or (target.get("status") if target else "Active")
                u_password = updates.get("accessPassword") or updates.get("password") or (target.get("accessPassword") if target else "TConnect2026#")
                u_manager = resolved_mgr_uuid

                hrms_payload = {
                    "employee_id": user_id,
                    "user_id": user_id,
                    "auth_user_id": user_id,
                    "employee_code": updates.get("employee_code") or (target.get("employee_code") if target else None) or f"EMP-{u_email.split('@')[0].upper()}",
                    "first_name": u_name.split(" ")[0],
                    "last_name": " ".join(u_name.split(" ")[1:]) if " " in u_name else "",
                    "name": u_name,
                    "email": u_email,
                    "phone": u_phone,
                    "role": u_role,
                    "designation": u_role,
                    "department": u_dept,
                    "dept": u_dept,
                    "status": u_status,
                    "password": u_password,
                    "company_id": "TC-001",
                    "reporting_manager": u_manager,
                }
                db_res = [hrms_repo.sync_employee_from_user(hrms_payload)]
                logger.info(f"✅ Synced fresh employee record to hrms.employees in Supabase: {user_id}")
            except Exception as sync_err:
                logger.warning(f"Employee sync fallback notice: {sync_err}")

        # Sync assigned role into organization.user_roles table
        if updates.get("role"):
            try:
                role_raw = str(updates["role"]).lower().strip()
                role_id = "sales_executive"
                if "manager" in role_raw:
                    role_id = "sales_manager"
                elif "admin" in role_raw:
                    role_id = "admin"
                elif "ceo" in role_raw or "founder" in role_raw:
                    role_id = "ceo"
                elif "super" in role_raw:
                    role_id = "super_admin"
                
                db_ur = {
                    "user_id": user_id,
                    "role_id": role_id
                }
                self.client.schema("organization").table("user_roles").upsert(db_ur).execute()
                logger.info(f"Synced user role mapping to organization.user_roles: user={user_id}, role={role_id}")
            except Exception as r_err:
                logger.debug(f"Failed to upsert organization.user_roles user={user_id}: {r_err}")

        return target

    def delete_user(self, user_id: str) -> bool:
        _clear_users_cache()
        global _in_memory_users
        _in_memory_users = [u for u in _in_memory_users if u["id"] != user_id]

        try:
            admin_client = get_supabase_admin_client() or self.client
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                auth_admin.admin.delete_user(user_id)
                logger.info(f"✅ Deleted user {user_id} from Supabase Auth")
        except Exception as auth_del_err:
            logger.warning(f"Auth delete notice for {user_id}: {auth_del_err}")

        try:
            self.client.schema("hrms").table("employees").delete().eq("employee_id", user_id).execute()
            logger.info(f"✅ Deleted employee {user_id} from hrms.employees")
        except Exception:
            try:
                self.client.table("employees").delete().eq("employee_id", user_id).execute()
            except Exception as err:
                logger.warning(f"Supabase employee delete fallback: {err}")

        return True

    def assign_sales_executives(self, manager_id: str, executive_ids: List[str]) -> Dict[str, Any]:
        """
        Assign one or more Sales Executives to a Sales Manager.
        Only Admin/Super Admin/CEO can invoke this.
        Updates reporting_manager_id, reporting_manager_name, reporting_manager_email
        and sends real-time notifications to BOTH manager and executive.
        """
        _clear_users_cache()
        all_users = self.get_all_users()
        manager = None
        for u in all_users:
            if str(u.get("id")) == str(manager_id) or str(u.get("user_id")) == str(manager_id) or str(u.get("employee_id")) == str(manager_id):
                manager = u
                break

        if not manager:
            raise BadRequestException(f"Target Sales Manager with ID '{manager_id}' not found.")

        m_id = str(manager.get("id") or manager.get("user_id") or manager.get("employee_id"))
        m_name = str(manager.get("name") or manager.get("full_name") or "Sales Manager")
        m_email = str(manager.get("email") or "").lower().strip()

        from app.modules.notification.repository import NotificationRepository
        notif_repo = NotificationRepository()

        # 1. Resolve currently assigned subordinates for this manager
        prev_subordinates = []
        for u in all_users:
            r_id = str(u.get("reporting_manager_id") or u.get("reporting_manager") or "").lower().strip()
            r_email = str(u.get("reporting_manager_email") or "").lower().strip()
            if r_id == m_id.lower().strip() or r_email == m_email:
                prev_subordinates.append(u)

        # 2. Find which of those are NO LONGER in the new selected executive_ids list, and unassign them
        new_executive_set = {str(eid).strip() for eid in executive_ids}
        for p_sub in prev_subordinates:
            p_id = str(p_sub.get("id") or p_sub.get("user_id") or p_sub.get("employee_id")).strip()
            p_email = str(p_sub.get("email") or "").lower().strip()

            # If previous subordinate is NOT in the new list, set reporting manager to None
            if p_id not in new_executive_set:
                self.update_user(p_id, {
                    "reporting_manager_id": None,
                    "reporting_manager_name": None,
                    "reporting_manager_email": None
                })
                # Send Unassignment Notification
                try:
                    notif_repo.create_notification({
                        "recipient_id": p_id,
                        "recipient_email": p_email,
                        "employee_id": p_id,
                        "recipient_role": "Sales Executive",
                        "title": "Reporting Manager Unassigned",
                        "message": f"You have been unassigned from Sales Manager {m_name}. You are currently unassigned to any manager.",
                        "type": "ASSIGNMENT"
                    })
                except Exception as notif_err:
                    logger.debug(f"Unassignment notification notice: {notif_err}")

        # 3. Assign new list of executives
        assigned_execs = []
        for exec_id in executive_ids:
            # Find executive target details for notification
            exec_user = None
            for u in all_users:
                if str(u.get("id")) == str(exec_id) or str(u.get("user_id")) == str(exec_id) or str(u.get("employee_id")) == str(exec_id):
                    exec_user = u
                    break

            exec_name = str(exec_user.get("name") or exec_user.get("full_name") or "Sales Executive") if exec_user else "Sales Executive"
            exec_email = str(exec_user.get("email") or "").lower().strip() if exec_user else ""

            updates = {
                "reporting_manager_id": m_id,
                "reporting_manager_name": m_name,
                "reporting_manager_email": m_email,
            }
            self.update_user(exec_id, updates)
            assigned_execs.append(exec_id)

            # Send notifications to BOTH Manager & Executive
            try:
                # 1. Notification to Sales Executive
                notif_repo.create_notification({
                    "recipient_id": exec_id,
                    "recipient_email": exec_email,
                    "employee_id": exec_id,
                    "recipient_role": "Sales Executive",
                    "title": "Reporting Manager Assigned",
                    "message": f"You have been assigned to Sales Manager {m_name} ({m_email}). All your leads, field visits, and reports are now managed by {m_name}.",
                    "type": "ASSIGNMENT"
                })

                # 2. Notification to Sales Manager (Only if they weren't already assigned)
                if not any(str(p.get("id")) == str(exec_id) or str(p.get("user_id")) == str(exec_id) for p in prev_subordinates):
                    notif_repo.create_notification({
                        "recipient_id": m_id,
                        "recipient_email": m_email,
                        "employee_id": m_id,
                        "recipient_role": "Sales Manager",
                        "title": "New Sales Executive Assigned",
                        "message": f"Sales Executive {exec_name} ({exec_email}) has been assigned to your team under your direct management.",
                        "type": "ASSIGNMENT"
                    })
            except Exception as notif_err:
                logger.warning(f"Assignment notification failed for exec '{exec_id}': {notif_err}")

        logger.info(f"Assigned {len(assigned_execs)} executives to manager {m_name} ({m_email})")
        return {
            "manager_id": m_id,
            "manager_name": m_name,
            "manager_email": m_email,
            "assigned_executive_ids": assigned_execs,
            "count": len(assigned_execs)
        }

    def get_assigned_executives_for_manager(self, manager_id: str) -> List[Dict[str, Any]]:
        all_users = self.get_all_users()
        m_clean = str(manager_id).lower().strip()
        assigned = []
        for u in all_users:
            r_id = str(u.get("reporting_manager_id") or "").lower().strip()
            r_email = str(u.get("reporting_manager_email") or "").lower().strip()
            r_name = str(u.get("reporting_manager_name") or "").lower().strip()
            if r_id == m_clean or r_email == m_clean or r_name == m_clean:
                assigned.append(u)
        return assigned

    def get_manager_executive_hierarchy(self) -> Dict[str, Any]:
        """
        Builds a full Manager -> Assigned Executives hierarchy.
        Returns all managers with their subordinate executives, plus the unassigned pool.
        """
        all_users = self.get_all_users()

        managers = []
        executives = []

        for u in all_users:
            r = str(u.get("role") or "").lower()
            if any(k in r for k in ["manager", "admin", "ceo", "founder"]):
                managers.append(u)
            else:
                executives.append(u)

        hierarchy = []
        assigned_exec_ids = set()

        for mgr in managers:
            m_id = str(mgr.get("id") or mgr.get("employee_id") or mgr.get("auth_user_id") or "").strip().lower()
            m_email = str(mgr.get("email") or "").strip().lower()
            m_name = str(mgr.get("name") or "").strip().lower()

            assigned = []
            for exec_u in executives:
                r_id = str(exec_u.get("reporting_manager_id") or "").strip().lower()
                r_email = str(exec_u.get("reporting_manager_email") or "").strip().lower()
                r_name = str(exec_u.get("reporting_manager_name") or "").strip().lower()

                if (m_id and r_id == m_id) or (m_email and r_email == m_email) or (m_name and r_name == m_name):
                    assigned.append(exec_u)
                    assigned_exec_ids.add(str(exec_u.get("id") or exec_u.get("employee_id")))

            hierarchy.append({
                "manager": mgr,
                "assigned_executives": assigned,
                "team_size": len(assigned)
            })

        unassigned_execs = [
            e for e in executives 
            if str(e.get("id") or e.get("employee_id")) not in assigned_exec_ids
            and not e.get("reporting_manager_id") 
            and not e.get("reporting_manager_name")
            and not e.get("reporting_manager_email")
        ]

        return {
            "managers_count": len(managers),
            "executives_count": len(executives),
            "assigned_executives_count": len(assigned_exec_ids),
            "unassigned_executives_count": len(unassigned_execs),
            "hierarchy": hierarchy,
            "unassigned_executives": unassigned_execs,
            "all_managers": managers,
            "all_executives": executives
        }
