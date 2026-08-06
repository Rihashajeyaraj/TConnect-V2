from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse, AssignManagerRequest
from app.modules.users.service import UserService
from app.modules.settings.permissions import CanManageSettings
from app.exceptions.base import ForbiddenException

router = APIRouter(prefix="/users", tags=["User Account Management"])


def get_service() -> UserService:
    return UserService()


def _require_admin_or_superadmin(user_payload: dict):
    role = str(user_payload.get("role") or "").strip().lower()
    if role not in ("admin", "super admin", "system admin", "ceo", "ceo / founder"):
        raise ForbiddenException("Only Admin or Super Admin can assign Sales Executives to a Sales Manager.")


@router.get("", response_model=StandardResponse)
async def get_all_users(
    user_payload: dict = Depends(get_current_user_payload),
    service: UserService = Depends(get_service)
):
    """Retrieve all system employee user accounts."""
    users_list = service.get_users()
    return StandardResponse.success_response(
        data=users_list,
        message="System user accounts retrieved successfully"
    )


@router.post("/assign-manager", response_model=StandardResponse)
async def assign_sales_executives(
    data: AssignManagerRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: UserService = Depends(get_service)
):
    """Assign one or more Sales Executives to a Sales Manager (Admin / Super Admin only)."""
    _require_admin_or_superadmin(user_payload)
    res = service.assign_sales_executives(data)
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
    """Get all Sales Executives assigned to a specific Sales Manager."""
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
    """Create a new employee user portal account with access email and password."""
    created = service.create_user(data)
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
    return StandardResponse.success_response(
        data={"id": user_id},
        message="Employee user account deleted successfully"
    )
