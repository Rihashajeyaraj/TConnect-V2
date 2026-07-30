from typing import List, Dict, Any
from app.modules.notification.repository import NotificationRepository
from app.modules.notification.schemas import NotificationCreate


class NotificationService:
    def __init__(self, repo: NotificationRepository = None):
        self.repo = repo or NotificationRepository()

    def list_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        return self.repo.get_user_notifications(user_id)

    def create_notification(self, data: NotificationCreate) -> Dict[str, Any]:
        payload = data.model_dump()
        payload["is_read"] = False
        return self.repo.create_notification(payload)
