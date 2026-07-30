from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.settings.schemas import SettingsUpdate, SettingsResponse
from app.modules.settings.service import SettingsService
from app.modules.settings.permissions import CanManageSettings

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
    updated = service.update_settings(data)
    return StandardResponse.success_response(
        data=updated,
        message="Business settings updated successfully"
    )
