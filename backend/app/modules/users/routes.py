from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse
from app.modules.users.service import UserService
from app.modules.settings.permissions import CanManageSettings

router = APIRouter(prefix="/users", tags=["User Account Management"])


def get_service() -> UserService:
    return UserService()


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
    """Delete an employee user portal account."""
    service.delete_user(user_id)
    return StandardResponse.success_response(
        data={"user_id": user_id},
        message="User account deleted successfully"
    )
