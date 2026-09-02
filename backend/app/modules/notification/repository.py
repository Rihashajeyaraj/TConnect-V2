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

    def _standardize_notification(self, n: Dict[str, Any]) -> Dict[str, Any]:
        if not n:
            return {}
        row = dict(n)
        # Map DB columns back to legacy/frontend keys
        row["id"] = str(row.get("id") or row.get("notification_id") or uuid.uuid4())
        row["message"] = row.get("description") or row.get("message") or ""
        row["type"] = row.get("category") or row.get("type") or "INFO"
        row["notification_type"] = row.get("category") or row.get("type") or "INFO"
        row["recipient_id"] = row.get("recipient_user_id") or row.get("recipient_id")
        row["read"] = row.get("is_read") or row.get("read") or False
        row["is_read"] = row.get("is_read") or row.get("read") or False
        return row

    def get_user_notifications(self, user_id: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        notifs = []

        # 1. Primary: system.notifications
        try:
            res = self.supabase.schema("system").table("notifications").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                notifs = [self._standardize_notification(n) for n in res.data]
        except Exception as e:
            logger.debug(f"system.notifications fetch notice: {e}")

        # 2. Fallback: public.notifications
        if not notifs:
            try:
                res = self.supabase.table("notifications").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    notifs = [self._standardize_notification(n) for n in res.data]
            except Exception as e:
                logger.warning(f"public.notifications fetch failed: {e}")

        # Combine DB notifications with in-memory notifications
        for mem in _in_memory_notifications:
            std = self._standardize_notification(mem)
            if not any(str(n.get("id")) == str(std.get("id")) for n in notifs):
                notifs.append(std)

        # Filter by recipient
        if user_id or user_email or user_emp_code:
            user_role = str((user_payload or {}).get("role") or "").strip().lower()
            filtered = []
            for n in notifs:
                r_id = str(n.get("recipient_id") or n.get("recipient_user_id") or "").strip()
                r_role = str(n.get("recipient_role") or "").strip().lower()
                r_email = str(n.get("recipient_email") or "").lower().strip()
                
                # Flexible role match (e.g. "executive" vs "Sales Executive", "manager" vs "Sales Manager")
                role_match = (
                    r_role in ["all", ""] or
                    r_role == user_role or
                    ("executive" in r_role and "executive" in user_role) or
                    ("manager" in r_role and "manager" in user_role)
                )

                id_match = (r_id and user_id and r_id == user_id) or (r_id and user_emp_code and r_id.lower() == user_emp_code.lower())
                email_match = (r_email and user_email and r_email == user_email)

                if role_match or id_match or email_match:
                    filtered.append(n)
            return filtered

        return notifs

    def get_unread_count(self, user_id: str, user_payload: Dict[str, Any] = None) -> int:
        notifs = self.get_user_notifications(user_id, user_payload)
        return len([n for n in notifs if not n.get("is_read", False)])

    def create_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        notif_id = data.get("id") or data.get("notification_id")
        if not notif_id or len(str(notif_id)) != 36:
            notif_id = str(uuid.uuid4())

        now_iso = datetime.utcnow().isoformat() + "Z"

        recip_role = str(data.get("recipient_role") or data.get("recipientRole") or "all")
        title_str = str(data.get("title") or "System Notification")
        msg_str = str(data.get("message") or "")
        type_str = str(data.get("type") or data.get("notification_type") or data.get("category") or "INFO")
        is_read_val = bool(data.get("is_read") or data.get("read") or False)

        # Build database-conforming payload
        db_payload = {
            "id": notif_id,
            "recipient_role": recip_role,
            "category": type_str,
            "title": title_str,
            "description": msg_str,
            "unread": not is_read_val,
            "is_read": is_read_val,
            "read": is_read_val,
            "created_at": now_iso,
        }

        recip_email = data.get("recipient_email") or data.get("employee_email")
        if recip_email:
            db_payload["recipient_email"] = str(recip_email).lower().strip()

        recip_id = data.get("recipient_id") or data.get("employee_id") or data.get("user_id") or data.get("recipient_user_id")
        is_uuid = lambda x: x and len(str(x)) == 36 and "-" in str(x)
        if recip_id and is_uuid(recip_id):
            db_payload["recipient_user_id"] = str(recip_id)

        # Build fully enriched legacy request object for in-memory fallback & instant sync
        req_obj = {
            "id": notif_id,
            "notification_id": notif_id,
            "recipient_role": recip_role,
            "title": title_str,
            "message": msg_str,
            "category": type_str,
            "type": type_str,
            "is_read": is_read_val,
            "read": is_read_val,
            "created_at": now_iso,
        }
        if recip_id:
            req_obj["recipient_id"] = str(recip_id)
            req_obj["employee_id"] = str(recip_id)
        if recip_email:
            req_obj["recipient_email"] = str(recip_email).lower().strip()

        _in_memory_notifications.append(req_obj)

        logger.info(f"[NOTIFICATION INSERT REQUEST] Inserting into system.notifications with payload: {db_payload}")

        # 1. Primary: system.notifications
        try:
            res = self.supabase.schema("system").table("notifications").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[NOTIFICATION INSERT SUCCESS] Saved notification in system.notifications: {res.data[0]}")
                return self._standardize_notification(res.data[0])
        except Exception as e:
            logger.debug(f"system.notifications insert notice: {e}")

        # 2. Fallback: public.notifications
        try:
            res = self.supabase.table("notifications").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[NOTIFICATION INSERT SUCCESS] Saved notification in public.notifications: {res.data[0]}")
                return self._standardize_notification(res.data[0])
        except Exception as e:
            logger.error(f"Error creating notification in public.notifications: {e}")

        return req_obj

    def mark_as_read(self, notification_id: str) -> Dict[str, Any]:
        updates = {"is_read": True, "read": True, "unread": False}
        
        # Always update in-memory cache first so getNotifications never returns old unread items
        for n in _in_memory_notifications:
            if str(n.get("id")) == str(notification_id) or str(n.get("notification_id")) == str(notification_id):
                n["is_read"] = True
                n["read"] = True
                n["unread"] = False

        try:
            res = self.supabase.schema("system").table("notifications").update(updates).eq("id", notification_id).execute()
            if res.data and len(res.data) > 0:
                return self._standardize_notification(res.data[0])
        except Exception:
            try:
                res = self.supabase.table("notifications").update(updates).eq("id", notification_id).execute()
                if res.data and len(res.data) > 0:
                    return self._standardize_notification(res.data[0])
            except Exception as e:
                logger.warning(f"mark_as_read failed: {e}")

        return {"id": notification_id, "is_read": True}
