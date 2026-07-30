from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.notification.schemas import NotificationCreate, NotificationResponse
from app.modules.notification.service import NotificationService
from app.modules.notification.permissions import CanViewNotifications

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_service() -> NotificationService:
    return NotificationService()


@router.get("", response_model=StandardResponse)
async def list_user_notifications(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewNotifications),
    service: NotificationService = Depends(get_service)
):
    """Get all notifications for the current authenticated user."""
    user_id = user_payload.get("sub", "user_001")
    notifications = service.list_user_notifications(user_id)
    return StandardResponse.success_response(
        data=notifications,
        message="User notifications retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: NotificationCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewNotifications),
    service: NotificationService = Depends(get_service)
):
    """Send an in-app notification to a user."""
    notif = service.create_notification(data)
    return StandardResponse.success_response(
        data=notif,
        message="Notification sent successfully"
    )
