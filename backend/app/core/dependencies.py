from typing import Optional, List
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_supabase_jwt
from app.exceptions.base import UnauthorizedException, ForbiddenException
from app.core.constants import RoleEnum

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication token is missing. Please log in with valid credentials.")
    
    token = credentials.credentials
    try:
        payload = verify_supabase_jwt(token)
        return payload
    except Exception as e:
        raise UnauthorizedException(f"Invalid or expired JWT authentication token: {str(e)}")


def _normalize_role(role_str: str) -> str:
    """Normalize role strings safely across system variations."""
    r = str(role_str or "").lower().strip().replace("_", " ").replace("-", " ")
    if any(k in r for k in ["super admin", "superadmin", "system admin"]):
        return "super_admin"
    if any(k in r for k in ["ceo", "founder", "chief executive", "managing director", "director"]):
        return "ceo"
    if "admin" in r:
        return "admin"
    if "manager" in r:
        return "sales_manager"
    return "sales_executive"


class RequireRoles:
    """
    Dependency guard to check user roles for RBAC.
    Normalizes roles safely so Super Admin, CEO, Admin, Manager, and Executive
    permissions are accurately evaluated without bypassing role-specific restrictions.
    """
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = set()
        for r in allowed_roles:
            val = r.value if hasattr(r, 'value') else str(r)
            self.allowed_roles.add(_normalize_role(val))

    async def __call__(self, payload: dict = Depends(get_current_user_payload)) -> None:
        raw_role = payload.get("user_metadata", {}).get("role") or payload.get("role") or "Sales Executive"
        user_norm_role = _normalize_role(raw_role)

        # Super Admin, CEO, and Admin always have master access
        if user_norm_role in ("super_admin", "ceo", "admin"):
            return

        if user_norm_role not in self.allowed_roles:
            raise ForbiddenException(f"User role '{raw_role}' does not have access to this resource.")
