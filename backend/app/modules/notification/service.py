from typing import List, Dict, Any
from app.modules.notification.repository import NotificationRepository
from app.modules.notification.schemas import NotificationCreate


class NotificationService:
    def __init__(self, repo: NotificationRepository = None):
        self.repo = repo or NotificationRepository()

    def list_user_notifications(self, user_id: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_user_notifications(user_id, user_payload)

    def get_unread_count(self, user_id: str, user_payload: Dict[str, Any] = None) -> int:
        return self.repo.get_unread_count(user_id, user_payload)

    def create_notification(self, data: Any, sender_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = data.model_dump() if hasattr(data, "model_dump") else (data if isinstance(data, dict) else {})
        payload["is_read"] = False

        # If employee identity not provided in payload, stamp from sender JWT
        if sender_payload and not payload.get("employee_id"):
            payload["employee_id"] = str(sender_payload.get("sub") or sender_payload.get("user_id") or "")
            payload["employee_code"] = str(sender_payload.get("employee_code") or sender_payload.get("employee_id") or "")

        return self.repo.create_notification(payload)

    def mark_as_read(self, notification_id: str) -> Dict[str, Any]:
        return self.repo.mark_as_read(notification_id)

    def mark_all_as_read(self, user_id: str, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.mark_all_as_read(user_id, user_payload)

    # ── Push Subscription ────────────────────────────────────────────────────

    def save_push_subscription(
        self,
        user_id: str,
        user_email: str,
        endpoint: str,
        p256dh: str,
        auth: str,
    ) -> Dict[str, Any]:
        return self.repo.save_push_subscription(
            user_id=user_id,
            user_email=user_email,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
        )

    def delete_push_subscription(self, user_id: str, endpoint: str) -> bool:
        return self.repo.delete_push_subscription(user_id=user_id, endpoint=endpoint)

    # ── Live Chat Service ───────────────────────────────────────────────────

    def get_chat_contacts(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_chat_contacts(user_payload)

    def get_chat_messages(
        self,
        user_payload: Dict[str, Any],
        contact_type: str = None,
        contact_id: str = None,
        contact_email: str = None
    ) -> List[Dict[str, Any]]:
        return self.repo.get_chat_messages(user_payload, contact_type=contact_type, contact_id=contact_id, contact_email=contact_email)

    def send_chat_message(self, user_payload: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repo.send_chat_message(user_payload, data)

