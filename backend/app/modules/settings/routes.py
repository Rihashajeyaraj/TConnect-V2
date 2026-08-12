from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.settings.schemas import SettingsUpdate, SettingsResponse
from app.modules.settings.service import SettingsService
from app.modules.settings.permissions import CanManageSettings
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/settings", tags=["Application Settings"])


def get_service() -> SettingsService:
    return SettingsService()


@router.get("/business", response_model=StandardResponse)
async def get_settings(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    """Get system settings configuration."""
    settings_data = service.get_settings()
    return StandardResponse.success_response(
        data=settings_data,
        message="Business settings retrieved successfully"
    )


@router.put("/business", response_model=StandardResponse)
async def update_settings(
    data: SettingsUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageSettings),
    service: SettingsService = Depends(get_service)
):
    """Update business settings configuration."""
    # Fetch existing settings to compare if possible
    try:
        existing = service.get_settings()
    except Exception:
        existing = {}

    updated = service.update_settings(data)
    update_dict = data.model_dump(exclude_none=True)
    
    # Determine permission action vs general settings update
    if "role_permissions" in update_dict:
        action = "ROLE_PERMISSION_CHANGED"
        desc = "Role permissions configuration updated"
        prev_val = {"role_permissions": existing.get("role_permissions")}
        new_val = {"role_permissions": update_dict.get("role_permissions")}
    elif "permissions" in update_dict:
        action = "PERMISSION_CHANGED"
        desc = "System permissions configuration updated"
        prev_val = {"permissions": existing.get("permissions")}
        new_val = {"permissions": update_dict.get("permissions")}
    else:
        action = "SETTINGS_UPDATED"
        desc = "Business settings updated"
        prev_val = {"settings": {k: existing.get(k) for k in update_dict.keys() if existing} if existing else None}
        new_val = update_dict

    create_audit_log(
        action, "organization.settings", user_payload,
        module="Settings",
        description=desc,
        previous_value=prev_val,
        new_value=new_val,
    )
    return StandardResponse.success_response(
        data=updated,
        message="Business settings updated successfully"
    )
