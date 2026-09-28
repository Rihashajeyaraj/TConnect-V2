from typing import Dict, Any, Optional, List
import anyio
from pydantic import BaseModel
from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.response import StandardResponse
from app.core.dependencies import (
    get_current_user_payload, RequirePermissions, UserContext,
    get_employee_permission_map, set_employee_permissions,
    set_employee_single_permission, reset_employee_permissions_to_default,
    invalidate_employee_permission_cache
)
from app.core.scoping import get_allowed_user_identifiers, is_record_accessible, normalize_user_role
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse, AssignManagerRequest
from app.modules.users.service import UserService
from app.modules.auth.schemas import ApproveResetRequest
from app.modules.auth.service import AuthService
from app.exceptions.base import ForbiddenException
from app.modules.audit.service import create_audit_log
from app.core.logger import logger

router = APIRouter(prefix="/users", tags=["User Account Management"])


def get_service() -> UserService:
    return UserService()


@router.get("", response_model=StandardResponse)
async def get_all_users(
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.view")),
    service: UserService = Depends(get_service)
):
    """Retrieve system employee user accounts scoped to the authenticated user's permissions and data scope."""
    all_users = await anyio.to_thread.run_sync(service.get_users)
    scope = context.get_scope("admin.users.view")
    if scope == "OWN":
        scoped_users = [
            u for u in all_users 
            if str(u.get("id") or u.get("employee_id") or u.get("employee_code") or "") in (context.employee_id, context.user_id)
        ]
    elif scope == "TEAM":
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            scoped_users = [u for u in all_users if is_record_accessible(u, allowed)]
        else:
            scoped_users = all_users
    else:
        scoped_users = all_users

    return StandardResponse.success_response(
        data=scoped_users,
        message="System user accounts retrieved successfully"
    )


@router.get("/hierarchy", response_model=StandardResponse)
async def get_manager_executive_hierarchy(
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.view")),
    service: UserService = Depends(get_service)
):
    """Retrieve full Manager -> Assigned Executives mapping and hierarchy."""
    data = await anyio.to_thread.run_sync(service.get_manager_executive_hierarchy)
    return StandardResponse.success_response(
        data=data,
        message="Manager and executive hierarchy retrieved successfully"
    )


@router.post("/assign-manager", response_model=StandardResponse)
async def assign_sales_executives(
    data: AssignManagerRequest,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.edit")),
    service: UserService = Depends(get_service)
):
    """Assign one or more Sales Executives to a Sales Manager (requires admin.users.edit permission)."""
    # Fetch existing executives to compare managers before change
    executives_before = {}
    try:
        all_users = service.get_users()
        for u in all_users:
            if str(u.get("id")) in data.executive_ids or str(u.get("employee_id")) in data.executive_ids:
                executives_before[str(u.get("id"))] = u.get("reporting_manager_name")
                executives_before[str(u.get("employee_id"))] = u.get("reporting_manager_name")
    except Exception as e:
        logger.warning(f"Failed to fetch users before assignment comparison: {e}")

    try:
        res = service.assign_sales_executives(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Log MANAGER_ASSIGNED/MANAGER_CHANGED for each executive
    manager_name = res.get("manager_name") or "Sales Manager"
    for exec_id in data.executive_ids:
        prev_mgr = executives_before.get(str(exec_id))
        action = "MANAGER_CHANGED" if (prev_mgr and prev_mgr != manager_name) else "MANAGER_ASSIGNED"
        create_audit_log(
            action, "hrms.employees", user_payload,
            entity_id=str(exec_id),
            module="User Management",
            description=f"Executive {exec_id} assigned to Manager {manager_name} (previous: {prev_mgr or 'None'})",
            previous_value={"reporting_manager": prev_mgr},
            new_value={"reporting_manager": manager_name},
        )

    return StandardResponse.success_response(
        data=res,
        message=f"Successfully assigned {res.get('count', 0)} Sales Executives to Sales Manager {res.get('manager_name')}."
    )


@router.get("/manager-team/{manager_id}", response_model=StandardResponse)
async def get_assigned_executives(
    manager_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.view")),
    service: UserService = Depends(get_service)
):
    """Get all Sales Executives assigned to a specific Sales Manager."""
    scope = context.get_scope("admin.users.view")
    if scope == "OWN":
        raise ForbiddenException("Employees with OWN scope are not authorized to view manager team records.")

    caller_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    caller_email = str(user_payload.get("email") or "").lower().strip()
    caller_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "").strip()

    if scope == "TEAM":
        m_clean = str(manager_id).lower().strip()
        is_own_team = (
            m_clean in (caller_id.lower(), caller_email, caller_code.lower())
            or caller_id.lower() == m_clean
            or caller_email == m_clean
        )
        if not is_own_team:
            raise ForbiddenException("Sales Managers can only access their own assigned team members.")

    execs = service.get_assigned_executives_for_manager(manager_id)
    return StandardResponse.success_response(
        data=execs,
        message="Assigned Sales Executives retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.create")),
    service: UserService = Depends(get_service)
):
    """Create a new employee user portal account."""
    created = service.create_user(data)
    create_audit_log(
        "USER_CREATED", "hrms.employees", user_payload,
        entity_id=str(created.get("id") or created.get("employee_id") or ""),
        module="User Management",
        description=f"User account created: {data.email}",
        new_value={"name": data.name, "email": data.email, "role": data.role},
    )
    return StandardResponse.success_response(
        data=created,
        message="Employee portal access user account created successfully"
    )


@router.put("/{user_id}", response_model=StandardResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.edit")),
    service: UserService = Depends(get_service)
):
    """Update employee user account credentials and details."""
    updated = service.update_user(user_id, data)
    
    # ── Deactivation hook to unassign Leads and Customers ──────────────────
    is_inactive = str(updated.get("status") or "").lower() in ("inactive", "deactivated", "terminated", "disabled")
    if is_inactive:
        try:
            from app.modules.crm.service import CRMService
            CRMService().unassign_employee_records(updated)
        except Exception as e:
            logger.warning(f"Deactivation unassign hook from users route failed: {e}")

    update_dict = data.model_dump(exclude_none=True)
    create_audit_log(
        "USER_UPDATED", "hrms.employees", user_payload,
        entity_id=user_id, module="User Management",
        description=f"User {user_id} updated",
        new_value={k: v for k, v in update_dict.items() if k not in ("password", "accessPassword")},
    )
    return StandardResponse.success_response(
        data=updated,
        message="Employee user account updated successfully"
    )


@router.delete("/{user_id}", response_model=StandardResponse)
async def delete_user(
    user_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.disable")),
    service: UserService = Depends(get_service)
):
    """Delete employee user account."""
    service.delete_user(user_id)
    create_audit_log(
        "USER_DELETED", "hrms.employees", user_payload,
        entity_id=user_id, module="User Management",
        description=f"User {user_id} deleted",
    )
    return StandardResponse.success_response(
        data={"id": user_id},
        message="Employee user account deleted successfully"
    )


# ── Password Reset Request Routes (Permission Protected) ───────────────────

def get_auth_service() -> AuthService:
    return AuthService()


@router.get("/password-reset-requests", response_model=StandardResponse)
async def list_password_reset_requests(
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.view")),
    service: AuthService = Depends(get_auth_service),
):
    """List all pending employee password reset requests."""
    requests = service.get_all_reset_requests()
    return StandardResponse.success_response(
        data=requests,
        message=f"{len(requests)} pending password reset request(s) found."
    )


@router.post("/password-reset-requests/{email}/approve", response_model=StandardResponse)
async def approve_password_reset(
    email: str,
    payload: ApproveResetRequest,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.edit")),
    service: AuthService = Depends(get_auth_service),
):
    """Approve a password reset request — sets new password in Supabase and notifies employee."""
    result = service.approve_reset_request(email, payload.new_password, user_payload)
    return StandardResponse.success_response(
        data=result,
        message=result.get("message", "Password reset approved.")
    )


@router.post("/password-reset-requests/{email}/reject", response_model=StandardResponse)
async def reject_password_reset(
    email: str,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.users.edit")),
    service: AuthService = Depends(get_auth_service),
):
    """Reject a password reset request."""
    result = service.reject_reset_request(email, user_payload)
    return StandardResponse.success_response(
        data=result,
        message=result.get("message", "Password reset request rejected.")
    )


# ── Employee Permission Management Endpoints ─────────────────────────────────

class UpdateUserPermissionsPayload(BaseModel):
    permissions: Optional[Dict[str, bool]] = None
    scopes: Optional[Dict[str, str]] = None
    single_permission_key: Optional[str] = None
    is_granted: Optional[bool] = None
    data_scope: Optional[str] = None


@router.get("/{user_id}/permissions", response_model=StandardResponse)
async def get_user_permissions(
    user_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.permissions.manage")),
):
    """Get customized employee permissions map."""
    current_emp_code = str(
        user_payload.get("employee_code") or user_payload.get("employee_id") or ""
    ).strip()
    current_user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    
    is_self = (user_id == current_emp_code or user_id == current_user_id or user_id.lower() == "self")
    target_id = (context.employee_id or context.user_id) if is_self else user_id

    perm_map = get_employee_permission_map(target_id)
    return StandardResponse.success_response(
        data=perm_map,
        message=f"Permissions for user {target_id} retrieved successfully"
    )


@router.put("/{user_id}/permissions", response_model=StandardResponse)
async def update_user_permissions(
    user_id: str,
    payload: UpdateUserPermissionsPayload,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.permissions.manage")),
):
    """Update employee permissions or individual permission key/scope."""
    current_emp_code = str(
        user_payload.get("employee_code") or user_payload.get("employee_id") or ""
    ).strip()
    current_user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    
    # 1. Employee cannot modify own permissions (self-modification forbidden)
    is_self = (
        user_id == current_emp_code
        or user_id == current_user_id
        or user_id == context.employee_id
        or user_id == context.user_id
        or user_id.lower() == "self"
    )
    if is_self:
        raise ForbiddenException("Employees are strictly forbidden from modifying their own permissions.")

    # 2. Check ORG scope escalation: if trying to grant ORG scope, caller must have ORG scope for admin.permissions.manage
    if payload.scopes:
        for pkey, scope_val in payload.scopes.items():
            if str(scope_val).upper() == "ORG" and context.get_scope("admin.permissions.manage") != "ORG":
                raise ForbiddenException(f"Cannot grant ORG scope for '{pkey}' without holding ORG scope.")
    if payload.data_scope and str(payload.data_scope).upper() == "ORG":
        if context.get_scope("admin.permissions.manage") != "ORG":
            raise ForbiddenException("Cannot grant ORG scope without holding ORG scope.")

    # 3. Perform update
    if payload.single_permission_key is not None:
        updated = set_employee_single_permission(
            employee_id=user_id,
            permission_key=payload.single_permission_key,
            is_granted=payload.is_granted if payload.is_granted is not None else True,
            data_scope=payload.data_scope or "OWN",
            auth_user_id=current_user_id
        )
    else:
        updated = set_employee_permissions(
            employee_id=user_id,
            permissions=payload.permissions or {},
            scopes=payload.scopes or {},
            auth_user_id=current_user_id
        )

    # Invalidate cache
    invalidate_employee_permission_cache(user_id)

    create_audit_log(
        "EMPLOYEE_PERMISSIONS_UPDATED", "organization.employee_permissions", user_payload,
        entity_id=user_id, module="User Management",
        description=f"Permissions updated for employee {user_id}",
        new_value={"permissions": payload.permissions, "scopes": payload.scopes}
    )

    return StandardResponse.success_response(
        data=updated,
        message=f"Permissions for user {user_id} updated successfully"
    )


@router.post("/{user_id}/permissions/reset", response_model=StandardResponse)
async def reset_user_permissions(
    user_id: str,
    payload: Optional[Dict[str, Any]] = None,
    user_payload: dict = Depends(get_current_user_payload),
    context: UserContext = Depends(RequirePermissions("admin.permissions.manage")),
):
    """Reset employee permissions to designation default template."""
    current_emp_code = str(
        user_payload.get("employee_code") or user_payload.get("employee_id") or ""
    ).strip()
    current_user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()

    is_self = (
        user_id == current_emp_code
        or user_id == current_user_id
        or user_id == context.employee_id
        or user_id == context.user_id
        or user_id.lower() == "self"
    )
    if is_self:
        raise ForbiddenException("Employees are strictly forbidden from resetting their own permissions.")

    designation = (payload or {}).get("designation", "")
    if not designation:
        try:
            from app.modules.hrms.repository import HRMSRepository
            emp = HRMSRepository().get_employee_by_id(user_id)
            if emp:
                designation = emp.get("designation") or emp.get("role") or ""
        except Exception:
            pass

    reset_map = reset_employee_permissions_to_default(
        employee_id=user_id,
        designation=designation or "Sales Executive",
        auth_user_id=current_user_id
    )

    create_audit_log(
        "EMPLOYEE_PERMISSIONS_RESET", "organization.employee_permissions", user_payload,
        entity_id=user_id, module="User Management",
        description=f"Permissions reset to designation defaults for employee {user_id}",
    )

    return StandardResponse.success_response(
        data=reset_map,
        message=f"Permissions for user {user_id} reset to designation defaults successfully"
    )
