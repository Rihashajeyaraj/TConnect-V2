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
    user_id = user_payload.get("sub") or user_payload.get("user_id") or ""
    notifications = service.list_user_notifications(user_id, user_payload)
    return StandardResponse.success_response(
        data=notifications,
        message="User notifications retrieved successfully"
    )


@router.get("/unread-count", response_model=StandardResponse)
async def get_unread_count(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewNotifications),
    service: NotificationService = Depends(get_service)
):
    """Get total unread notifications count for the current user."""
    user_id = user_payload.get("sub") or user_payload.get("user_id") or ""
    count = service.get_unread_count(user_id, user_payload)
    return StandardResponse.success_response(
        data={"unread_count": count},
        message="Unread notification count retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: NotificationCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewNotifications),
    service: NotificationService = Depends(get_service)
):
    """Send an in-app notification to a user."""
    notif = service.create_notification(data, sender_payload=user_payload)
    return StandardResponse.success_response(
        data=notif,
        message="Notification sent successfully"
    )


@router.patch("/{notification_id}/read", response_model=StandardResponse)
async def mark_notification_as_read(
    notification_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewNotifications),
    service: NotificationService = Depends(get_service)
):
    """Mark a notification as read."""
    res = service.mark_as_read(notification_id)
    return StandardResponse.success_response(
        data=res,
        message="Notification marked as read successfully"
    )

