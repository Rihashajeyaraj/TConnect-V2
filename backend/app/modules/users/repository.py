from typing import List, Dict, Any, Optional
import uuid
import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

# No mock data — all users are read from Supabase Auth admin.list_users()
_in_memory_users: List[Dict[str, Any]] = []


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
                        auth_users_list.append({
                            "id": str(u.id),
                            "auth_user_id": str(u.id),
                            "employee_id": str(u.id),
                            "employee_code": meta.get("employee_code") or "N/A",
                            "name": meta.get("full_name") or u.email.split("@")[0].replace(".", " ").title(),
                            "email": u.email,
                            "phone": meta.get("phone") or "+91 99999 00000",
                            "role": meta.get("role") or "Sales Executive",
                            "dept": meta.get("dept") or meta.get("department") or "Sales & Business Development",
                            "status": "Active",
                            "lastLogin": "Recently",
                            "accessPassword": "Set via Supabase Auth"
                        })
                logger.info(f"UserRepository: loaded {len(auth_users_list)} users from Supabase Auth")
        except Exception as auth_err:
            logger.warning(f"Supabase Auth list_users error: {auth_err}")

        db_users = []
        try:
            res = self.client.table("employees").select("*").execute()
            if res.data and len(res.data) > 0:
                existing_emails = {u["email"].lower() for u in auth_users_list}
                for emp in res.data:
                    emp_email = str(emp.get("email", "")).lower()
                    if emp_email and emp_email not in existing_emails:
                        db_users.append({
                            "id": str(emp.get("employee_id") or emp.get("id") or f"usr_{uuid.uuid4()}"),
                            "name": emp.get("name") or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() or "User Account",
                            "email": emp.get("email", "user@tconnect.com"),
                            "phone": emp.get("phone") or emp.get("mobile", "+91 99999 00000"),
                            "role": emp.get("role") or emp.get("designation", "Sales Executive"),
                            "dept": emp.get("dept") or emp.get("department", "Sales & Business Development"),
                            "status": emp.get("status", "Active"),
                            "lastLogin": "Recently",
                            "accessPassword": emp.get("accessPassword") or emp.get("password", "TConnect2026#"),
                        })
        except Exception as e:
            logger.debug(f"Supabase users lookup fallback: {e}")

        # Combine ensuring unique emails
        all_combined = auth_users_list + db_users
        existing_emails = {u["email"].lower() for u in all_combined}
        for u in _in_memory_users:
            if u["email"].lower() not in existing_emails:
                all_combined.append(u)

        return all_combined

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a user in Supabase Auth AND sync them to the HRMS employee portal.
        This is the single source of truth for user + employee creation from admin.
        """
        user_id = str(uuid.uuid4())
        first_name = user_data.get("first_name") or user_data.get("name", "User").split(" ")[0]
        last_name = user_data.get("last_name") or (
            " ".join(user_data.get("name", "").split(" ")[1:]) if " " in user_data.get("name", "") else ""
        )
        full_name = f"{first_name} {last_name}".strip()

        # Generate a persistent, unique employee code
        emp_code = user_data.get("employee_code") or _generate_employee_code()
        role = user_data.get("role", "Sales Executive")
        dept = user_data.get("dept") or user_data.get("department", "Sales & Business Development")
        phone = user_data.get("phone", "+91 99999 99999")
        email = user_data.get("email")
        password = user_data.get("password") or user_data.get("accessPassword", "TConnect2026#")
        gender = user_data.get("gender", "Male")
        dob = user_data.get("date_of_birth")
        emergency_contact = user_data.get("emergency_contact")

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
                        # Store all identity fields in metadata so HRMS
                        # get_all_employees() can read them without a DB query
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
                        "employee_code": emp_code,    # ← critical: persisted in auth
                    }
                })
                if auth_res and hasattr(auth_res, "user") and auth_res.user:
                    auth_uid = str(auth_res.user.id)
                    new_user["id"] = auth_uid
                logger.info(f"✅ Supabase Auth user created: {email} (UID: {auth_uid})")
        except Exception as auth_err:
            logger.warning(f"Supabase Auth create_user notice for {email}: {auth_err}")

        # ── Step 2: Sync to HRMS module (hrms.employees) ───────────────────────
        # Delegate to HRMSRepository so the HRMS portal immediately shows the employee.
        # Import here (not at top) to avoid circular import between users ↔ hrms modules.
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
            }
            hrms_record = hrms_repo.sync_employee_from_user(hrms_payload)
            logger.info(f"✅ HRMS employee record synced for {email} (emp_code: {emp_code})")
            new_user["employee_id"] = hrms_record.get("employee_id", auth_uid)
        except Exception as hrms_err:
            logger.warning(f"HRMS sync notice for {email}: {hrms_err}")

        # Step 2 complete -- HRMS sync is the authoritative employee record.
        # NOTE: There is NO Step 3 sync to public.users or organization.users.
        # public.users does not exist in this project. All identity is managed
        # by Supabase Auth (auth.users). The application reads identity from
        # auth.users via admin.list_users() and from hrms.employees for
        # HR-specific data. Adding a sync to a non-existent table would cause
        # a silent PGRST205 error on every user creation.

        # Store in local memory as fallback (allows GET /users to return the
        # newly created user even before the DB write is confirmed)
        _in_memory_users.insert(0, new_user)

        return new_user

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        target = None
        for idx, u in enumerate(_in_memory_users):
            if u["id"] == user_id:
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
            }
            _in_memory_users.insert(0, target)

        # Sync update to Supabase Auth user_metadata
        try:
            admin_client = get_supabase_admin_client() or self.client
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin") and updates:
                meta_update = {}
                if updates.get("role"):
                    meta_update["role"] = updates["role"]
                if updates.get("dept") or updates.get("department"):
                    meta_update["dept"] = updates.get("dept") or updates.get("department")
                if updates.get("name"):
                    meta_update["full_name"] = updates["name"]
                if meta_update:
                    auth_admin.admin.update_user_by_id(user_id, {"user_metadata": meta_update})
        except Exception as meta_err:
            logger.debug(f"Auth metadata update notice: {meta_err}")

        # Sync update to hrms.employees (authoritative HR table)
        try:
            db_updates = {
                "first_name": target["name"].split(" ")[0],
                "last_name": " ".join(target["name"].split(" ")[1:]) if " " in target["name"] else "",
                "email": target["email"],
                "designation": target.get("role"),
                "role": target.get("role"),
                "status": target["status"],
            }
            self.client.schema("hrms").table("employees").update(db_updates).eq("employee_id", user_id).execute()
        except Exception as hrms_err:
            # public.employees (the normalised base table with incompatible schema)
            # is intentionally NOT used as a fallback here. It previously had the
            # broken employees_user_id_fkey pointing to non-existent public.users.
            logger.warning(f"hrms.employees update notice for {user_id}: {hrms_err}")

        return target

    def delete_user(self, user_id: str) -> bool:
        global _in_memory_users
        _in_memory_users = [u for u in _in_memory_users if u["id"] != user_id]

        # Delete from Supabase Auth
        try:
            admin_client = get_supabase_admin_client() or self.client
            auth_admin = getattr(admin_client, "auth", None)
            if auth_admin and hasattr(auth_admin, "admin"):
                auth_admin.admin.delete_user(user_id)
                logger.info(f"✅ Deleted user {user_id} from Supabase Auth")
        except Exception as auth_del_err:
            logger.warning(f"Auth delete notice for {user_id}: {auth_del_err}")

        # Delete from hrms.employees
        try:
            self.client.schema("hrms").table("employees").delete().eq("employee_id", user_id).execute()
            logger.info(f"✅ Deleted employee {user_id} from hrms.employees")
        except Exception:
            try:
                self.client.table("employees").delete().eq("employee_id", user_id).execute()
            except Exception as err:
                logger.warning(f"Supabase employee delete fallback: {err}")

        return True
