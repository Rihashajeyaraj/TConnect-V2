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
        raise UnauthorizedException("Bearer authorization token is missing")
    
    token = credentials.credentials
    payload = verify_supabase_jwt(token)
    return payload


class RequireRoles:
    """
    Dependency guard to check user roles for RBAC.
    """
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = [r.value if hasattr(r, 'value') else r for r in allowed_roles]

    async def __call__(self, payload: dict = Depends(get_current_user_payload)) -> None:
        user_role = payload.get("user_metadata", {}).get("role") or payload.get("role")
        if not user_role or user_role not in self.allowed_roles:
            raise ForbiddenException(f"User role '{user_role}' does not have access to this resource.")
