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
