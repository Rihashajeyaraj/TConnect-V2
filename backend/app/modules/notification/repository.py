from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger
from app.modules.notification import push_service

_in_memory_notifications: List[Dict[str, Any]] = []


class NotificationRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def _standardize_notification(self, n: Dict[str, Any]) -> Dict[str, Any]:
        if not n:
            return {}
        row = dict(n)
        row["id"] = str(row.get("id") or row.get("notification_id") or uuid.uuid4())
        row["message"] = row.get("description") or row.get("message") or ""
        row["type"] = row.get("category") or row.get("type") or "INFO"
        row["notification_type"] = row.get("category") or row.get("type") or "INFO"

        link = str(row.get("link") or "")
        recip_email = str(row.get("recipient_email") or "").lower().strip()
        recip_id = str(row.get("recipient_id") or row.get("employee_id") or row.get("recipient_user_id") or "").strip()

        if not recip_email and "email:" in link:
            for part in link.split("|"):
                if part.startswith("email:"):
                    recip_email = part.replace("email:", "").lower().strip()

        if not recip_id and "emp_id:" in link:
            for part in link.split("|"):
                if part.startswith("emp_id:"):
                    recip_id = part.replace("emp_id:", "").strip()

        row["recipient_id"] = recip_id
        row["employee_id"] = recip_id
        row["recipient_email"] = recip_email
        row["recipient_role"] = str(row.get("recipient_role") or "all").lower().strip()
        
        if "unread" in row and row.get("unread") is not None:
            is_read_flag = not bool(row.get("unread"))
        else:
            is_read_flag = bool(row.get("is_read") or row.get("read") or False)
            
        row["read"] = is_read_flag
        row["is_read"] = is_read_flag
        return row

    def get_user_notifications(self, user_id: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        meta = (user_payload or {}).get("user_metadata", {})
        user_email = str((user_payload or {}).get("email") or meta.get("email") or "").lower().strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or meta.get("employee_code") or meta.get("employee_id") or "").strip().lower()
        user_id_str = str(user_id or (user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "").strip().lower()
        user_role = str((user_payload or {}).get("role") or meta.get("role") or "").strip().lower()

        notifs = []

        # 1. Primary: system.notifications
        try:
            res = self.supabase.schema("system").table("notifications").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                notifs = [self._standardize_notification(n) for n in res.data]
        except Exception as e:
            logger.debug(f"system.notifications fetch notice: {e}")

        # Combine DB notifications with in-memory notifications
        for mem in _in_memory_notifications:
            std = self._standardize_notification(mem)
            if not any(str(n.get("id")) == str(std.get("id")) for n in notifs):
                notifs.append(std)

        # Strict privacy filtering by targeted recipient, assigned employee, reporting manager, or broadcast role
        filtered = []
        for n in notifs:
            r_id = str(n.get("recipient_id") or n.get("recipient_user_id") or n.get("employee_id") or "").strip().lower()
            r_email = str(n.get("recipient_email") or "").lower().strip()
            r_role = str(n.get("recipient_role") or "all").strip().lower()

            assoc_email = str(n.get("assigned_to_email") or n.get("employee_email") or n.get("user_email") or "").lower().strip()
            assoc_id = str(n.get("assigned_to_id") or n.get("user_id") or "").lower().strip()
            mgr_email = str(n.get("manager_email") or n.get("reporting_manager_email") or "").lower().strip()
            mgr_id = str(n.get("manager_id") or n.get("reporting_manager_id") or "").lower().strip()

            if any(role_kw in user_role for role_kw in ["admin", "ceo"]):
                filtered.append(n)
                continue

            email_match = bool((r_email and user_email and r_email == user_email) or (assoc_email and user_email and assoc_email == user_email))
            id_match = bool((r_id and (r_id == user_id_str or r_id == user_emp_code)) or (assoc_id and (assoc_id == user_id_str or assoc_id == user_emp_code)))
            mgr_match = bool(("manager" in user_role or "lead" in user_role or "tl" in user_role) and ((mgr_email and user_email and mgr_email == user_email) or (mgr_id and (mgr_id == user_id_str or mgr_id == user_emp_code))))

            if email_match or id_match or mgr_match:
                filtered.append(n)
                continue

            # Untargeted role broadcast check
            has_any_target = bool(r_email or r_id or assoc_email or assoc_id or mgr_email or mgr_id)
            if not has_any_target:
                role_match = (
                    r_role in ["all", "", "everyone"] or
                    r_role == user_role or
                    (r_role in user_role or user_role in r_role) or
                    ("executive" in r_role and "executive" in user_role) or
                    (("manager" in r_role or "lead" in r_role) and ("manager" in user_role or "lead" in user_role or "tl" in user_role))
                )
                if role_match:
                    filtered.append(n)

        filtered.sort(
            key=lambda x: str(x.get("created_at") or x.get("timestamp") or ""),
            reverse=True
        )
        return filtered



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

        recip_role_clean = recip_role.lower().strip()

        # When sending a reply or message targeting manager/team_lead, employee_id is the sender's code, not recipient_id
        if recip_role_clean in ["manager", "team_lead", "lead", "tl", "admin", "ceo"] or "REPLY" in type_str.upper():
            recip_email = data.get("recipient_email")
            recip_id = data.get("recipient_id") or data.get("recipient_user_id")
        else:
            recip_email = data.get("recipient_email") or data.get("employee_email")
            recip_id = data.get("recipient_id") or data.get("employee_id") or data.get("user_id") or data.get("recipient_user_id")

        recip_user_id = None
        if recip_id and len(str(recip_id)) == 36 and "-" in str(recip_id):
            recip_user_id = str(recip_id)
        elif recip_email:
            try:
                emp_res = self.supabase.schema("hrms").table("employees").select("user_id, employee_id").eq("email", str(recip_email).lower().strip()).limit(1).execute()
                if emp_res.data and emp_res.data[0].get("user_id"):
                    recip_user_id = str(emp_res.data[0]["user_id"])
            except Exception as e:
                logger.debug(f"Employee email lookup notice: {e}")

        meta_parts = []
        if recip_email:
            meta_parts.append(f"email:{str(recip_email).lower().strip()}")
        if recip_id:
            meta_parts.append(f"emp_id:{str(recip_id).strip()}")
        link_str = "|".join(meta_parts) if meta_parts else str(data.get("link") or "")

        # Build database-conforming payload matching system.notifications schema EXACTLY
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
        if recip_user_id:
            db_payload["recipient_user_id"] = recip_user_id
        if link_str:
            db_payload["link"] = link_str

        # Build fully enriched request object for in-memory sync
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
        if recip_email:
            req_obj["recipient_email"] = str(recip_email).lower().strip()
        if data.get("employee_id"):
            req_obj["employee_id"] = str(data.get("employee_id")).strip()
        if data.get("sender_name"):
            req_obj["sender_name"] = str(data.get("sender_name")).strip()
        if data.get("sender_email"):
            req_obj["sender_email"] = str(data.get("sender_email")).strip()

        _in_memory_notifications.append(req_obj)

        logger.info(f"[NOTIFICATION INSERT REQUEST] Inserting into system.notifications for recipient_user_id: {recip_user_id} role: {recip_role}")

        # 1. Primary: system.notifications
        try:
            res = self.supabase.schema("system").table("notifications").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[NOTIFICATION INSERT SUCCESS] Saved notification ID: {res.data[0].get('id')}")
                return self._standardize_notification(res.data[0])
        except Exception as e:
            logger.warning(f"system.notifications insert notice: {e}")


        # ── Web Push dispatch (fire-and-forget, never blocks notification creation) ──
        # Determine recipient identity for subscription lookup
        push_user_id   = str(recip_user_id or recip_id or "").strip()
        push_user_email = str(recip_email or "").strip().lower()

        if push_user_id or push_user_email:
            try:
                # Re-compute unread count AFTER the insert so the count is accurate
                fresh_unread = self.get_unread_count(push_user_id or "", {
                    "email": push_user_email,
                    "sub": push_user_id,
                })

                push_payload = {
                    "type":         "new_notification",
                    "title":        title_str,
                    "body":         msg_str,
                    "unread_count": fresh_unread,
                    "url":          "/notifications",
                }

                subs = self.get_push_subscriptions_for_user(
                    user_id=push_user_id, user_email=push_user_email
                )

                if subs:
                    def _remove_stale(endpoints: List[str]) -> None:
                        for ep in endpoints:
                            self.delete_push_subscription_by_endpoint(ep)

                    push_service.send_push_to_subscriptions_async(
                        subs, push_payload, on_remove=_remove_stale
                    )
                    logger.info(
                        "[WebPush] Dispatching push to %d subscription(s) for user %s (unread=%d)",
                        len(subs), push_user_id or push_user_email, fresh_unread
                    )
            except Exception as push_err:  # noqa: BLE001
                # Push failure must NEVER cause notification creation to fail
                logger.warning("[WebPush] Push dispatch error (non-fatal): %s", push_err)

        return req_obj

    # ──────────────────────────────────────────────────────────────────────────
    # Push Subscription CRUD
    # ──────────────────────────────────────────────────────────────────────────

    def save_push_subscription(
        self,
        user_id: str,
        user_email: str,
        endpoint: str,
        p256dh: str,
        auth: str,
    ) -> Dict[str, Any]:
        """Upsert a push subscription for the authenticated user.
        Uses endpoint as the unique key — multiple devices are supported.
        """
        now_iso = datetime.utcnow().isoformat() + "Z"
        payload = {
            "user_id":    str(user_id).strip(),
            "user_email": str(user_email).strip().lower() if user_email else None,
            "endpoint":   endpoint,
            "p256dh":     p256dh,
            "auth":       auth,
            "updated_at": now_iso,
        }
        try:
            res = (
                self.supabase
                .schema("system")
                .table("push_subscriptions")
                .upsert(payload, on_conflict="endpoint")
                .execute()
            )
            if res.data:
                logger.info("[WebPush] Subscription saved for user %s", user_id[:8])
                return res.data[0]
        except Exception as e:
            logger.warning("[WebPush] save_push_subscription error: %s", e)
        return payload

    def delete_push_subscription(
        self,
        user_id: str,
        endpoint: str,
    ) -> bool:
        """Remove a subscription by endpoint for the authenticated user."""
        try:
            (
                self.supabase
                .schema("system")
                .table("push_subscriptions")
                .delete()
                .eq("endpoint", endpoint)
                .eq("user_id", str(user_id).strip())
                .execute()
            )
            logger.info("[WebPush] Subscription deleted for user %s", user_id[:8])
            return True
        except Exception as e:
            logger.warning("[WebPush] delete_push_subscription error: %s", e)
            return False

    def delete_push_subscription_by_endpoint(self, endpoint: str) -> bool:
        """Remove stale/expired subscription by endpoint only (called from push dispatch)."""
        try:
            (
                self.supabase
                .schema("system")
                .table("push_subscriptions")
                .delete()
                .eq("endpoint", endpoint)
                .execute()
            )
            logger.info("[WebPush] Stale subscription removed: %s…", endpoint[:40])
            return True
        except Exception as e:
            logger.warning("[WebPush] delete_by_endpoint error: %s", e)
            return False

    def get_push_subscriptions_for_user(
        self,
        user_id: str = "",
        user_email: str = "",
    ) -> List[Dict[str, Any]]:
        """Return all push subscriptions for a user (matched by id OR email)."""
        results: List[Dict[str, Any]] = []
        try:
            q = self.supabase.schema("system").table("push_subscriptions").select("*")
            if user_id:
                q = q.eq("user_id", str(user_id).strip())
            elif user_email:
                q = q.eq("user_email", str(user_email).strip().lower())
            else:
                return []
            res = q.execute()
            if res.data:
                results = res.data
        except Exception as e:
            logger.warning("[WebPush] get_push_subscriptions error: %s", e)
        return results

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
