from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.core.scoping import get_allowed_user_identifiers, is_record_accessible, normalize_user_role
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse, AssignManagerRequest
from app.modules.users.service import UserService
from app.modules.settings.permissions import CanManageSettings
from app.exceptions.base import ForbiddenException
from app.modules.audit.service import create_audit_log
from app.core.logger import logger

router = APIRouter(prefix="/users", tags=["User Account Management"])


def get_service() -> UserService:
    return UserService()


def _require_admin_or_superadmin(user_payload: dict):
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
    if role not in ("admin", "super_admin", "ceo"):
        raise ForbiddenException("Only Admin or Super Admin/CEO can assign Sales Executives to a Sales Manager.")


@router.get("", response_model=StandardResponse)
async def get_all_users(
    user_payload: dict = Depends(get_current_user_payload),
    service: UserService = Depends(get_service)
):
    """Retrieve system employee user accounts scoped to the authenticated user's role and team."""
    all_users = service.get_users()
    allowed = get_allowed_user_identifiers(user_payload)
    if allowed is not None:
        scoped_users = [u for u in all_users if is_record_accessible(u, allowed)]
    else:
        scoped_users = all_users

    return StandardResponse.success_response(
        data=scoped_users,
        message="System user accounts retrieved successfully"
    )


@router.post("/assign-manager", response_model=StandardResponse)
async def assign_sales_executives(
    data: AssignManagerRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: UserService = Depends(get_service)
):
    """Assign one or more Sales Executives to a Sales Manager (Admin / Super Admin / CEO only)."""
    _require_admin_or_superadmin(user_payload)
    
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
    service: UserService = Depends(get_service)
):
    """Get all Sales Executives assigned to a specific Sales Manager (Manager team isolation enforced)."""
    caller_role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
    caller_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    caller_email = str(user_payload.get("email") or "").lower().strip()
    caller_code = str(user_payload.get("employee_code") or user_payload.get("employee_id") or "").strip()

    # Sales Executives cannot inspect team assignments
    if caller_role == "sales_executive":
        raise ForbiddenException("Sales Executives are not authorized to view team management records.")

    # Sales Managers can ONLY view their own team
    if caller_role == "sales_manager":
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
    rbac: None = Depends(CanManageSettings),
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
    rbac: None = Depends(CanManageSettings),
    service: UserService = Depends(get_service)
):
    """Update employee user account credentials and details."""
    updated = service.update_user(user_id, data)
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
    rbac: None = Depends(CanManageSettings),
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
