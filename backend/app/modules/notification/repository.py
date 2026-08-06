from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_notifications: List[Dict[str, Any]] = []


class NotificationRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_user_notifications(self, user_id: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        notifs = []

        # 1. Try public.notifications
        try:
            res = self.supabase.table("notifications").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                notifs = res.data
        except Exception as e:
            logger.warning(f"public.notifications fetch failed: {e}")

        # 2. Fallback to schema helper
        if not notifs:
            try:
                res = self.helper.table(SchemaEnum.NOTIFICATION, "notifications").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    notifs = res.data
            except Exception as e:
                logger.warning(f"notification.notifications fetch failed: {e}")

        # 3. In-memory fallback
        if not notifs:
            notifs = _in_memory_notifications

        # Filter by recipient
        if user_id or user_email or user_emp_code:
            notifs = [
                n for n in notifs
                if str(n.get("recipient_id") or "").strip() == user_id
                or str(n.get("employee_id") or "").strip() in (user_id, user_emp_code)
                or str(n.get("recipient_email") or "").lower() == user_email
            ]

        return notifs

    def get_unread_count(self, user_id: str, user_payload: Dict[str, Any] = None) -> int:
        notifs = self.get_user_notifications(user_id, user_payload)
        return len([n for n in notifs if not n.get("is_read", False)])

    def create_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        notif_id = data.get("id") or data.get("notification_id")
        if not notif_id or len(str(notif_id)) != 36:
            notif_id = str(uuid.uuid4())

        now_iso = datetime.utcnow().isoformat()

        recip_role = str(data.get("recipient_role") or data.get("recipientRole") or "all")
        title_str = str(data.get("title") or "System Notification")
        msg_str = str(data.get("message") or "")
        type_str = str(data.get("type") or data.get("notification_type") or "INFO")

        payload = {
            "id": notif_id,
            "recipient_role": recip_role,
            "title": title_str,
            "message": msg_str,
            "type": type_str,
            "is_read": bool(data.get("is_read") or data.get("read") or False),
            "created_at": now_iso,
        }

        # Optional recipient identity if valid UUID or email
        recip_id = data.get("recipient_id") or data.get("employee_id") or data.get("user_id")
        if recip_id and len(str(recip_id)) == 36 and "-" in str(recip_id):
            payload["recipient_id"] = str(recip_id)
        
        recip_email = data.get("recipient_email") or data.get("employee_email")
        if recip_email:
            payload["recipient_email"] = str(recip_email)

        logger.info(f"[NOTIFICATION INSERT REQUEST] Inserting into public.notifications with payload: {payload}")

        # 1. Try public.notifications
        try:
            res = self.supabase.table("notifications").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[NOTIFICATION INSERT SUCCESS] Saved notification in public.notifications: {res.data[0]}")
                return res.data[0]
        except Exception as e:
            logger.error(f"Error creating notification in public.notifications: {e}")

        # 2. Try notification.notifications via helper
        try:
            res = self.helper.table(SchemaEnum.NOTIFICATION, "notifications").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[NOTIFICATION INSERT SUCCESS] Saved notification in notification.notifications: {res.data[0]}")
                return res.data[0]
        except Exception as e:
            logger.error(f"Error creating notification in notification.notifications: {e}")

        payload["id"] = notif_id
        _in_memory_notifications.append(payload)
        return payload

    def mark_as_read(self, notification_id: str) -> Dict[str, Any]:
        try:
            res = self.supabase.table("notifications").update({"is_read": True, "read": True}).eq("id", notification_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"mark_as_read failed: {e}")

        for n in _in_memory_notifications:
            if str(n.get("id")) == str(notification_id):
                n["is_read"] = True
                n["read"] = True
                return n
        return {"id": notification_id, "is_read": True}
