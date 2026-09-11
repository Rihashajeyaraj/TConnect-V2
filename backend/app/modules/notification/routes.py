from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.notification.schemas import NotificationCreate, NotificationResponse
from app.modules.notification.service import NotificationService
from app.modules.notification.permissions import CanViewNotifications
from app.modules.notification import push_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_service() -> NotificationService:
    return NotificationService()


# ── Notification CRUD ─────────────────────────────────────────────────────────

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


# ── Web Push Subscription ─────────────────────────────────────────────────────

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    p256dh:   str
    auth:     str


@router.get("/vapid-public-key", response_model=StandardResponse)
async def get_vapid_public_key():
    """Return the VAPID public key so the frontend can subscribe to Web Push."""
    key = push_service.get_public_key()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push is not configured on this server."
        )
    return StandardResponse.success_response(
        data={"vapid_public_key": key},
        message="VAPID public key retrieved"
    )


@router.post(
    "/push-subscription",
    response_model=StandardResponse,
    status_code=status.HTTP_201_CREATED
)
async def register_push_subscription(
    body: PushSubscriptionRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: NotificationService = Depends(get_service)
):
    """
    Register (or update) this device's Web Push subscription.

    User identity is derived entirely from the authenticated JWT —
    the frontend must NOT supply a user_id in the request body.
    """
    # Derive identity from verified JWT — never from request body
    user_id    = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    user_email = str(
        user_payload.get("email") or
        (user_payload.get("user_metadata") or {}).get("email") or
        ""
    ).lower().strip()

    if not user_id and not user_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cannot identify user.")

    if not body.endpoint or not body.p256dh or not body.auth:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="endpoint, p256dh, and auth are required.")

    result = service.save_push_subscription(
        user_id=user_id,
        user_email=user_email,
        endpoint=body.endpoint,
        p256dh=body.p256dh,
        auth=body.auth,
    )
    return StandardResponse.success_response(
        data={"registered": True},
        message="Push subscription registered"
    )


@router.delete("/push-subscription", response_model=StandardResponse)
async def unregister_push_subscription(
    body: PushSubscriptionRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: NotificationService = Depends(get_service)
):
    """
    Remove this device's push subscription (called on logout or manual opt-out).
    Only removes the subscription if it belongs to the authenticated user.
    """
    user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cannot identify user.")

    success = service.delete_push_subscription(user_id=user_id, endpoint=body.endpoint)
    return StandardResponse.success_response(
        data={"removed": success},
        message="Push subscription removed" if success else "Subscription not found"
    )
