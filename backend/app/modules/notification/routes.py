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


@router.post("/mark-all-read", response_model=StandardResponse)
@router.patch("/mark-all-read", response_model=StandardResponse)
async def mark_all_notifications_as_read(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewNotifications),
    service: NotificationService = Depends(get_service)
):
    """Mark all notifications for current user as read in one batch query."""
    user_id = user_payload.get("sub") or user_payload.get("user_id") or ""
    res = service.mark_all_as_read(user_id, user_payload)
    return StandardResponse.success_response(
        data=res,
        message="All notifications marked as read successfully"
    )



# ── Live Chat Endpoints ───────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    recipient_id: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    contact_type: Optional[str] = "reporting_manager"
    message_text: str


@router.get("/chat/contacts", response_model=StandardResponse)
async def get_chat_contacts(
    user_payload: dict = Depends(get_current_user_payload),
    service: NotificationService = Depends(get_service)
):
    """Get chat contacts for current user (Reporting Manager, Team Lead, Peers, HR)."""
    contacts = service.get_chat_contacts(user_payload)
    return StandardResponse.success_response(
        data=contacts,
        message="Chat contacts retrieved successfully"
    )


@router.get("/chat/messages", response_model=StandardResponse)
async def get_chat_messages(
    contact_type: Optional[str] = None,
    contact_id: Optional[str] = None,
    contact_email: Optional[str] = None,
    user_payload: dict = Depends(get_current_user_payload),
    service: NotificationService = Depends(get_service)
):
    """Get chat messages for current user and selected contact."""
    messages = service.get_chat_messages(user_payload, contact_type=contact_type, contact_id=contact_id, contact_email=contact_email)
    return StandardResponse.success_response(
        data=messages,
        message="Chat messages retrieved successfully"
    )


@router.post("/chat/messages", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    body: ChatMessageCreate,
    user_payload: dict = Depends(get_current_user_payload),
    service: NotificationService = Depends(get_service)
):
    """Send a chat message to a contact."""
    msg = service.send_chat_message(user_payload, body.model_dump())
    return StandardResponse.success_response(
        data=msg,
        message="Chat message sent successfully"
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


class DirectPushTestRequest(BaseModel):
    title: Optional[str] = "TwiteConnect Test"
    body: Optional[str] = "Background push test"
    unread_count: Optional[int] = 7


@router.post("/push-test", response_model=StandardResponse)
async def direct_push_test(
    body: DirectPushTestRequest,
    user_payload: dict = Depends(get_current_user_payload),
    service: NotificationService = Depends(get_service)
):
    """Developer direct test endpoint to send Web Push to the authenticated user's subscriptions."""
    user_id = str(user_payload.get("sub") or user_payload.get("user_id") or "").strip()
    user_email = str(
        user_payload.get("email") or
        (user_payload.get("user_metadata") or {}).get("email") or
        ""
    ).lower().strip()

    subs = service.repo.get_push_subscriptions_for_user(user_id=user_id, user_email=user_email)
    if not subs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No push subscriptions found in system.push_subscriptions for user_id='{user_id}' email='{user_email}'"
        )

    test_payload = {
        "type": "test_push",
        "title": body.title or "TwiteConnect Test",
        "body": body.body or "Background push test",
        "unread_count": body.unread_count if body.unread_count is not None else 7,
        "url": "/notifications"
    }

    results = []
    for sub in subs:
        endpoint = sub.get("endpoint") or ""
        res = push_service.send_web_push(endpoint, sub.get("p256dh"), sub.get("auth"), test_payload)
        results.append({
            "endpoint_short": (endpoint[:35] + "...") if len(endpoint) > 35 else endpoint,
            "success": res.get("success"),
            "status_code": res.get("status_code"),
            "error": res.get("error")
        })

    return StandardResponse.success_response(
        data={"sent": len(results), "details": results, "payload": test_payload},
        message="Direct test push dispatched"
    )

