from typing import Dict, Any, List
import jose.jwt
from datetime import datetime, timedelta, timezone
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import LoginRequest, SignUpRequest, DevTokenRequest
from app.core.config import settings
from app.exceptions.base import UnauthorizedException, BadRequestException
from app.core.logger import logger


# ── Known default system accounts: email -> (role, accepted_passwords)
# All default accounts require explicit password verification.
KNOWN_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    # Super Admin accounts
    "admin@tconnect.com":         {"role": "Super Admin",     "passwords": ["Admin2026#"]},
    "admin@twiteconnect.com":     {"role": "Super Admin",     "passwords": ["Admin2026#"]},
    "superadmin@tconnect.com":    {"role": "Super Admin",     "passwords": ["Admin2026#"]},

    # CEO accounts
    "ceo@tconnect.com":           {"role": "CEO / Founder",   "passwords": ["Admin2026#"]},
    "ceo@twiteconnect.com":       {"role": "CEO / Founder",   "passwords": ["Admin2026#"]},
    "ceo.test@tconnect.com":      {"role": "CEO / Founder",   "passwords": ["Admin2026#"]},

    # Sales Manager accounts
    "manager@tconnect.com":       {"role": "Sales Manager",   "passwords": ["ManagerPassword2026#"]},
    "manager@twiteconnect.com":   {"role": "Sales Manager",   "passwords": ["ManagerPassword2026#"]},
    "vikram.singh@tconnect.com":  {"role": "Sales Manager",   "passwords": ["ManagerPassword2026#"]},

    # Sales Executive accounts
    "executive@tconnect.com":     {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "sales@tconnect.com":         {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "ashwini@twite.ai":           {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "ashwini@tconnect.com":       {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "rihasha@tconnect.com":       {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "ananya.roy@tconnect.com":    {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "john.doe@twiteconnect.in":   {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "mary.jane@twiteconnect.in":  {"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
    "robert.smith@twiteconnect.in":{"role": "Sales Specialist","passwords": ["SalesPassword2026#"]},
    "david.brown@twiteconnect.in":{"role": "Sales Executive", "passwords": ["SalesPassword2026#"]},
}


def _resolve_role_and_dashboard(role_val: str):
    """Return (dashboard_path, permissions_list) based on role string."""
    role_lower = (role_val or "").lower()
    if "ceo" in role_lower or "founder" in role_lower:
        return "/ceo", ["*"]
    elif "super admin" in role_lower or "superadmin" in role_lower:
        return "/admin", ["admin.*", "hrms.*", "settings.*", "users.*"]
    elif "admin" in role_lower:
        return "/admin", ["admin.*", "hrms.*", "settings.*", "users.*"]
    elif "manager" in role_lower:
        return "/manager", ["crm.read", "crm.write", "team.read", "visits.read", "reports.read"]
    else:
        return "/sales", ["crm.read", "crm.write", "visits.read", "visits.write", "attendance.write"]


class AuthService:
    def __init__(self, repo: AuthRepository = None):
        self.repo = repo or AuthRepository()

    def generate_dev_token(self, payload: DevTokenRequest) -> Dict[str, Any]:
        exp = datetime.now(timezone.utc) + timedelta(days=7)
        role_val = payload.role or "Sales Executive"
        dashboard, permissions = _resolve_role_and_dashboard(role_val)

        full_name = (payload.email or "").split("@")[0].replace(".", " ").title()

        token_payload = {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": payload.email,
            "role": role_val,
            "aud": "authenticated",
            "exp": int(exp.timestamp()),
            "user_metadata": {
                "role": role_val,
                "full_name": full_name,
            },
            "app_metadata": {"provider": "email", "roles": [role_val]},
        }

        secret = (
            settings.SUPABASE_JWT_SECRET
            if (settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET != "your-jwt-secret-from-supabase")
            else settings.SECRET_KEY
        )
        token = jose.jwt.encode(token_payload, secret, algorithm=settings.ALGORITHM)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "auth_user_id":   token_payload["sub"],
                "employee_id":    token_payload["sub"],
                "employee_code":  "EMP0001",
                "employee_name":  full_name,
                "full_name":      full_name,
                "email":          payload.email,
                "company_id":     "TC-001",
                "organization":   "TwiteConnect Technologies",
                "department":     "Sales & Business Development",
                "designation":    role_val,
                "role":           role_val,
                "status":         "Active",
                "permissions":    permissions,
                "dashboard":      dashboard,
                "first_login":    False,
            },
        }

    def login(self, credentials: LoginRequest) -> Dict[str, Any]:
        email   = (credentials.email or "").strip().lower()
        password = (credentials.password or "").strip()

        if not email or not password:
            raise UnauthorizedException("Invalid Username or Password.")

        # ── Step 1: Check account status across user sources ─────────────────
        user_record = None
        
        # Check UserRepository / in-memory users
        try:
            from app.modules.users.repository import UserRepository
            user_repo = UserRepository()
            all_users = user_repo.get_all_users()
            for u in all_users:
                if str(u.get("email", "")).strip().lower() == email:
                    user_record = u
                    break
        except Exception as err:
            logger.warning(f"UserRepository lookup notice: {err}")

        # Check HRMS employees if not found yet
        if not user_record:
            try:
                from app.modules.hrms.repository import HRMSRepository
                hrms_repo = HRMSRepository()
                all_emps = hrms_repo.get_all_employees()
                for emp in all_emps:
                    if str(emp.get("email", "")).strip().lower() == email:
                        user_record = emp
                        break
            except Exception as err:
                logger.warning(f"HRMS lookup notice: {err}")

        # Reject disabled/inactive users immediately
        if user_record:
            status_val = str(user_record.get("status") or user_record.get("employmentStatus") or "Active").strip().lower()
            if status_val in ["disabled", "inactive", "suspended", "terminated"]:
                raise UnauthorizedException("Account is disabled or inactive. Please contact Administrator.")

        # ── Step 2: Attempt Supabase GoTrue Auth ─────────────────────────────
        try:
            res = self.repo.sign_in_with_password(email, password)
            if res and getattr(res, "session", None) and getattr(res, "user", None):
                meta     = getattr(res.user, "user_metadata", {}) or {}
                role_val = (user_record and (user_record.get("role") or user_record.get("designation"))) or meta.get("role") or meta.get("designation") or "Sales Executive"
                emp_name = (user_record and (user_record.get("name") or user_record.get("full_name"))) or meta.get("full_name") or email.split("@")[0].replace(".", " ").title()
                emp_code = (user_record and (user_record.get("employee_code") or user_record.get("employee_id"))) or meta.get("employee_code") or "EMP0001"
                dept     = (user_record and (user_record.get("dept") or user_record.get("department"))) or meta.get("department") or "Sales & Business Development"
                dashboard, permissions = _resolve_role_and_dashboard(role_val)

                logger.info(f"Supabase GoTrue AUTH SUCCESS: {email} -> {role_val}")
                return {
                    "access_token":  res.session.access_token,
                    "refresh_token": res.session.refresh_token,
                    "token_type":    "bearer",
                    "user": {
                        "auth_user_id":   str(res.user.id),
                        "employee_id":    str(res.user.id),
                        "employee_code":  emp_code,
                        "employee_name":  emp_name,
                        "full_name":      emp_name,
                        "email":          res.user.email,
                        "company_id":     "TC-001",
                        "organization":   "TwiteConnect Technologies",
                        "department":     dept,
                        "designation":    role_val,
                        "role":           role_val,
                        "status":         "Active",
                        "permissions":    permissions,
                        "dashboard":      dashboard,
                    },
                }
        except Exception as e:
            logger.info(f"Supabase GoTrue sign-in notice for {email}: {e}")

        # ── Step 3: Validate Password against DB user record ──────────────────
        if user_record:
            saved_pass = str(user_record.get("accessPassword") or user_record.get("password") or "").strip()
            if saved_pass and saved_pass.lower() != "set via supabase auth":
                if saved_pass == password:
                    role_val = user_record.get("role") or user_record.get("designation") or "Sales Executive"
                    logger.info(f"DB Record AUTH SUCCESS: {email} -> {role_val}")
                    return self.generate_dev_token(DevTokenRequest(email=email, role=role_val))
                else:
                    logger.warning(f"DB Record AUTH FAILURE (wrong password) for {email}")
                    raise UnauthorizedException("Invalid Username or Password.")

        # ── Step 4: Validate Password against KNOWN_ACCOUNTS defaults ────────
        if email in KNOWN_ACCOUNTS:
            account = KNOWN_ACCOUNTS[email]
            accepted_passwords = account.get("passwords") or []
            if password in accepted_passwords:
                role_val = account["role"]
                logger.info(f"Known Account AUTH SUCCESS: {email} -> {role_val}")
                return self.generate_dev_token(DevTokenRequest(email=email, role=role_val))
            else:
                logger.warning(f"Known Account AUTH FAILURE (wrong password) for {email}")
                raise UnauthorizedException("Invalid Username or Password.")

        # ── Step 5: Authentication Failed ────────────────────────────────────
        raise UnauthorizedException("Invalid Username or Password.")

    def signup(self, credentials: SignUpRequest) -> Dict[str, Any]:
        try:
            res = self.repo.sign_up(credentials.email, credentials.password)
            return {
                "id":      getattr(res.user, "id", "new_user"),
                "email":   credentials.email,
                "message": "User registered successfully",
            }
        except Exception as e:
            logger.warning(f"Signup fallback: {e}")
            return self.generate_dev_token(
                DevTokenRequest(email=credentials.email, role="Sales Executive")
            )
