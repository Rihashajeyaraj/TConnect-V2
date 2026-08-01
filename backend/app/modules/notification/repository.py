from typing import List, Optional, Dict, Any
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_notifications: List[Dict[str, Any]] = []


class NotificationRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.NOTIFICATION, "user_notifications").select("*").eq("recipient_id", user_id).execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("notifications").select("*").eq("recipient_id", user_id).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for notifications: {e}")
        return [n for n in _in_memory_notifications if n.get("recipient_id") == user_id]

    def create_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or f"notif_{len(_in_memory_notifications)+1:03d}"
        try:
            res = self.helper.table(SchemaEnum.NOTIFICATION, "user_notifications").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("notifications").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored notification in memory fallback: {e}")

        _in_memory_notifications.append(data)
        return data
