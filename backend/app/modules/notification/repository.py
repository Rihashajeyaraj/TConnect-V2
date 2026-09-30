from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger
from app.modules.notification import push_service

_in_memory_notifications: List[Dict[str, Any]] = []
_in_memory_messages: List[Dict[str, Any]] = [
    {
        "id": "msg-1",
        "sender_id": "rm-1",
        "sender_email": "jeeva@twite.ai",
        "sender_name": "Jeeva kumar",
        "recipient_id": "usr_current",
        "recipient_email": "bavani@tconnect.com",
        "recipient_name": "Bavani sree",
        "contact_type": "reporting_manager",
        "message_text": "Good morning! Please update your lead status and visit reports for today.",
        "is_read": True,
        "created_at": "2026-09-22T09:30:00Z"
    },
    {
        "id": "msg-2",
        "sender_id": "usr_current",
        "sender_email": "bavani@tconnect.com",
        "sender_name": "Bavani sree",
        "recipient_id": "rm-1",
        "recipient_email": "jeeva@twite.ai",
        "recipient_name": "Jeeva kumar",
        "contact_type": "reporting_manager",
        "message_text": "Good morning sir! Yes, I have 3 client site visits scheduled today.",
        "is_read": True,
        "created_at": "2026-09-22T09:35:00Z"
    },
    {
        "id": "msg-3",
        "sender_id": "rm-1",
        "sender_email": "jeeva@twite.ai",
        "sender_name": "Jeeva kumar",
        "recipient_id": "usr_current",
        "recipient_email": "bavani@tconnect.com",
        "recipient_name": "Bavani sree",
        "contact_type": "reporting_manager",
        "message_text": "Great! Make sure to log the GPS location check-in for each visit.",
        "is_read": True,
        "created_at": "2026-09-22T09:40:00Z"
    },
    {
        "id": "msg-4",
        "sender_id": "usr_current",
        "sender_email": "bavani@tconnect.com",
        "sender_name": "Bavani sree",
        "recipient_id": "rm-1",
        "recipient_email": "jeeva@twite.ai",
        "recipient_name": "Jeeva kumar",
        "contact_type": "reporting_manager",
        "message_text": "hi",
        "is_read": True,
        "created_at": "2026-09-22T10:50:00Z"
    },
    {
        "id": "msg-5",
        "sender_id": "tl-1",
        "sender_email": "vedika@twite.ai",
        "sender_name": "vedika .",
        "recipient_id": "usr_current",
        "recipient_email": "bavani@tconnect.com",
        "recipient_name": "Bavani sree",
        "contact_type": "team_lead",
        "message_text": "Hi, how are the client follow-ups going?",
        "is_read": True,
        "created_at": "2026-09-22T09:15:00Z"
    },
    {
        "id": "msg-6",
        "sender_id": "usr_current",
        "sender_email": "bavani@tconnect.com",
        "sender_name": "Bavani sree",
        "recipient_id": "tl-1",
        "recipient_email": "vedika@twite.ai",
        "recipient_name": "vedika .",
        "contact_type": "team_lead",
        "message_text": "Going well! Closed 2 deals this week.",
        "is_read": True,
        "created_at": "2026-09-22T09:20:00Z"
    }
]




class NotificationRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def _standardize_notification(self, n: Dict[str, Any]) -> Dict[str, Any]:
        if not n:
            return {}
        row = dict(n)
        row["id"] = str(row.get("id") or row.get("notification_id") or uuid.uuid4())
        msg_val = str(row.get("description") or row.get("message") or row.get("body") or row.get("text") or row.get("notes") or "")
        title_val = str(row.get("title") or row.get("subject") or "System Notification")
        row["title"] = title_val
        row["message"] = msg_val
        row["description"] = msg_val
        row["body"] = msg_val
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

        # 1. Primary: system.notifications schema table
        try:
            res = self.supabase.schema("system").table("notifications").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                notifs = [self._standardize_notification(n) for n in res.data]
        except Exception as e:
            logger.debug(f"system.notifications fetch notice: {e}")

        # 2. Fallback: public.notifications table
        if not notifs:
            try:
                res = self.supabase.table("notifications").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    notifs = [self._standardize_notification(n) for n in res.data]
            except Exception as e:
                logger.debug(f"public.notifications fetch notice: {e}")

        # Combine DB notifications with in-memory notifications
        for mem in _in_memory_notifications:
            std = self._standardize_notification(mem)
            if not any(str(n.get("id")) == str(std.get("id")) for n in notifs):
                notifs.append(std)

        # Strict privacy filtering by targeted recipient, assigned employee, reporting manager, or broadcast role
        filtered = []
        for n in notifs:
            cat = str(n.get("category") or n.get("type") or "").upper().strip()
            r_id = str(n.get("recipient_id") or n.get("recipient_user_id") or "").strip().lower()
            r_email = str(n.get("recipient_email") or "").lower().strip()
            r_role = str(n.get("recipient_role") or "all").strip().lower()

            sender_email = str(n.get("sender_email") or "").lower().strip()
            sender_id = str(n.get("sender_id") or n.get("employee_id") or "").lower().strip()

            assoc_email = str(n.get("assigned_to_email") or n.get("user_email") or "").lower().strip()
            assoc_id = str(n.get("assigned_to_id") or "").lower().strip()
            mgr_email = str(n.get("manager_email") or n.get("reporting_manager_email") or "").lower().strip()
            mgr_id = str(n.get("manager_id") or n.get("reporting_manager_id") or "").lower().strip()

            is_admin = any(kw in user_role for kw in ["admin", "system admin", "super admin"])
            is_ceo = "ceo" in user_role

            # 1. ADMIN PRIVACY RULE:
            # Admin receives ONLY Admin-related system details (user creation, system alerts, role changes).
            # Admin MUST NOT receive executive chats, expense claims, location inquiries/replies, or live tracking updates!
            if is_admin:
                if any(kw in cat for kw in ["INQUIRY", "REPLY", "EXPENSE", "CLAIM", "TRACKING", "GPS", "CHAT", "MESSAGE"]):
                    # Block private chats, inquiries, expense claims, and live tracking from Admin
                    continue
                # Include system/admin events or explicit notifications targeted to admin email/id/role
                if any(kw in cat for kw in ["ADMIN", "SYSTEM", "USER", "ROLE", "SECURITY"]) or r_role in ["admin", "super admin", "system admin"] or (r_email and user_email and r_email == user_email) or (r_id and (r_id == user_id_str or r_id == user_emp_code)):
                    filtered.append(n)
                continue

            # 2. CEO PRIVACY RULE:
            # CEO receives high-level executive notifications, but NOT private location inquiries/replies or private chats between individual employees
            if is_ceo:
                if any(kw in cat for kw in ["INQUIRY", "REPLY", "CHAT", "MESSAGE"]):
                    if not ((r_email and user_email and r_email == user_email) or (r_id and (r_id == user_id_str or r_id == user_emp_code))):
                        continue
                filtered.append(n)
                continue

            # 3. LOCATION INQUIRY & REPLY STRICT PRIVACY:
            # Must go ONLY to the explicit recipient or sender! Team leads and other managers are strictly excluded.
            if "INQUIRY" in cat or "REPLY" in cat:
                is_direct_recipient = bool(
                    (r_email and user_email and r_email == user_email) or
                    (r_id and (r_id == user_id_str or r_id == user_emp_code))
                )
                is_direct_sender = bool(
                    (sender_email and user_email and sender_email == user_email) or
                    (sender_id and (sender_id == user_id_str or sender_id == user_emp_code))
                )
                if is_direct_recipient or is_direct_sender:
                    filtered.append(n)
                continue

            # 4. EXPENSE CLAIMS & LIVE TRACKING REPORTING MANAGER PRIVACY:
            # Expense claims and live tracking updates must go ONLY to the executive's direct Reporting Manager!
            if any(kw in cat for kw in ["EXPENSE", "CLAIM", "TRACKING", "GPS", "LOCATION"]):
                is_owner = bool(
                    (r_email and user_email and r_email == user_email) or
                    (assoc_email and user_email and assoc_email == user_email) or
                    (r_id and (r_id == user_id_str or r_id == user_emp_code)) or
                    (sender_email and user_email and sender_email == user_email) or
                    (sender_id and (sender_id == user_id_str or sender_id == user_emp_code))
                )
                is_reporting_manager = bool(
                    ("manager" in user_role) and not ("lead" in user_role or "tl" in user_role) and (
                        (mgr_email and user_email and mgr_email == user_email) or
                        (mgr_id and (mgr_id == user_id_str or mgr_id == user_emp_code)) or
                        (r_email and user_email and r_email == user_email)
                    )
                )
                if is_owner or is_reporting_manager:
                    filtered.append(n)
                continue

            # 5. GENERAL NOTIFICATION MATCHING (Direct recipient, assigned, or untargeted role broadcast)
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
                    (user_role and r_role == user_role) or
                    (user_role and (r_role in user_role or user_role in r_role)) or
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
        title_str = str(data.get("title") or data.get("subject") or "System Notification").strip()
        msg_str = str(
            data.get("message") or
            data.get("description") or
            data.get("body") or
            data.get("text") or
            data.get("notes") or
            ""
        ).strip()
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

        sender_email = str(data.get("sender_email") or "").strip().lower()
        sender_code = str(data.get("employee_id") or data.get("sender_id") or "").strip()

        # Narrow Safety Fallback ONLY for Executive Reply Notifications (LOCATION_INQUIRY_REPLY / REPLY):
        is_reply_notif = "REPLY" in type_str.upper() or "INQUIRY_REPLY" in type_str.upper()
        if is_reply_notif:
            recip_email_str = str(recip_email or "").strip().lower()
            # If recipient_email is missing OR matches sender's own email, resolve reporting_manager from HRMS
            if not recip_email_str or (sender_email and recip_email_str == sender_email):
                logger.info(f"[REPLY ROUTING SAFETY] Recipient email '{recip_email}' is missing or equals sender '{sender_email}'. Resolving reporting_manager...")
                try:
                    sender_emp = None
                    if sender_email:
                        res_s = self.supabase.schema("hrms").table("employees").select("employee_id, reporting_manager").eq("email", sender_email).limit(1).execute()
                        sender_emp = res_s.data[0] if res_s.data else None
                    if not sender_emp and sender_code:
                        res_s = self.supabase.schema("hrms").table("employees").select("employee_id, reporting_manager").or_(f"employee_code.eq.{sender_code},employee_id.eq.{sender_code}").limit(1).execute()
                        sender_emp = res_s.data[0] if res_s.data else None

                    if sender_emp and sender_emp.get("reporting_manager"):
                        mgr_id = str(sender_emp["reporting_manager"]).strip()
                        res_m = self.supabase.schema("hrms").table("employees").select("user_id, employee_id, email, employee_code").or_(f"employee_id.eq.{mgr_id},user_id.eq.{mgr_id}").limit(1).execute()
                        if res_m.data:
                            mgr_rec = res_m.data[0]
                            recip_email = mgr_rec.get("email") or recip_email
                            recip_id = mgr_rec.get("user_id") or mgr_rec.get("employee_id") or recip_id
                            logger.info(f"[REPLY ROUTING SUCCESS] Resolved reporting manager: {recip_email}")
                except Exception as route_err:
                    logger.warning(f"[REPLY ROUTING WARNING] Error resolving reporting_manager fallback: {route_err}")

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

        from app.modules.notification.helpers import build_notification_url
        raw_url = str(data.get("url") or data.get("link") or "").strip()
        if not raw_url or raw_url.startswith("email:") or raw_url.startswith("emp_id:") or raw_url == "/notifications":
            target_url = build_notification_url(type_str, notif_id, role=recip_role)
        else:
            target_url = raw_url

        meta_parts = []
        if recip_email:
            meta_parts.append(f"email:{str(recip_email).lower().strip()}")
        if recip_id:
            meta_parts.append(f"emp_id:{str(recip_id).strip()}")
        link_str = target_url if target_url and target_url != "/notifications" else ("|".join(meta_parts) if meta_parts else "")

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
            "url": target_url,
            "link": link_str,
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

        # 1. Primary: system.notifications table
        saved_notif = None
        try:
            res = self.supabase.schema("system").table("notifications").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[NOTIFICATION INSERT SUCCESS] Saved notification ID: {res.data[0].get('id')}")
                saved_notif["url"] = target_url
        except Exception as e:
            try:
                res = self.supabase.table("notifications").insert(db_payload).execute()
                if res.data and len(res.data) > 0:
                    saved_notif = self._standardize_notification(res.data[0])
                    saved_notif["url"] = target_url
            except Exception as inner_e:
                logger.warning(f"notifications insert notice: {inner_e}")

        # ── Web Push dispatch (fire-and-forget, never blocks notification creation) ──
        # Determine recipient identity for subscription lookup
        push_user_id   = str(recip_user_id or recip_id or "").strip()
        push_user_email = str(recip_email or "").strip().lower()

        logger.info(f"[PUSH] notification created: id={notif_id} title='{title_str}'")
        logger.info(f"[PUSH] recipient = user_id='{push_user_id}', email='{push_user_email}', role='{recip_role}'")

        if push_user_id or push_user_email:
            try:
                # Re-compute unread count AFTER the insert so the count is accurate
                fresh_unread = self.get_unread_count(push_user_id or "", {
                    "email": push_user_email,
                    "sub": push_user_id,
                    "role": recip_role,
                })
                logger.info(f"[PUSH] unread_count = {fresh_unread}")

                push_payload = {
                    "id":                notif_id,
                    "notification_id":   notif_id,
                    "type":              type_str,
                    "notification_type": type_str,
                    "category":          type_str,
                    "title":             title_str,
                    "body":              msg_str,
                    "message":           msg_str,
                    "description":       msg_str,
                    "unread_count":      fresh_unread,
                    "url":               target_url,
                }

                subs = self.get_push_subscriptions_for_user(
                    user_id=push_user_id, user_email=push_user_email
                )
                logger.info(f"[PUSH] subscriptions = {len(subs)}")

                if subs:
                    logger.info(f"[PUSH] sending push to {len(subs)} subscription(s)")
                    def _remove_stale(endpoints: List[str]) -> None:
                        for ep in endpoints:
                            self.delete_push_subscription_by_endpoint(ep)

                    push_service.send_push_to_subscriptions_async(
                        subs, push_payload, on_remove=_remove_stale
                    )
                    logger.info("[PUSH] push result = dispatched async")
                else:
                    logger.warning("[PUSH] push result = skipped (0 subscriptions found for recipient)")
            except Exception as push_err:  # noqa: BLE001
                # Push failure must NEVER cause notification creation to fail
                logger.warning(f"[PUSH] push result = failure: {push_err}")

        return saved_notif or req_obj

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
            try:
                res = (
                    self.supabase
                    .table("push_subscriptions")
                    .upsert(payload, on_conflict="endpoint")
                    .execute()
                )
                if res.data:
                    return res.data[0]
            except Exception as inner_e:
                logger.warning("[WebPush] save_push_subscription error: %s", inner_e)
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
            try:
                (
                    self.supabase
                    .table("push_subscriptions")
                    .delete()
                    .eq("endpoint", endpoint)
                    .eq("user_id", str(user_id).strip())
                    .execute()
                )
                return True
            except Exception as inner_e:
                logger.warning("[WebPush] delete_push_subscription error: %s", inner_e)
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
            try:
                (
                    self.supabase
                    .table("push_subscriptions")
                    .delete()
                    .eq("endpoint", endpoint)
                    .execute()
                )
                return True
            except Exception as inner_e:
                logger.warning("[WebPush] delete_by_endpoint error: %s", inner_e)
                return False

    def get_push_subscriptions_for_user(
        self,
        user_id: str = "",
        user_email: str = "",
    ) -> List[Dict[str, Any]]:
        """Return all active push subscriptions for a user (safely matching by UUID, employee code, or email)."""
        u_id = str(user_id or "").strip()
        u_email = str(user_email or "").strip().lower()

        # 1. Check if user_id string is a valid 36-char UUID format
        is_uuid = len(u_id) == 36 and "-" in u_id
        resolved_uuid = u_id if is_uuid else ""
        resolved_email = u_email

        # 2. If user_id is an employee_code (e.g. EMP000014) or UUID/email is missing, attempt safe resolution via hrms.employees
        if (not resolved_uuid or not resolved_email) and (u_id or u_email):
            try:
                q = self.supabase.schema("hrms").table("employees").select("user_id, email, employee_code")
                if resolved_uuid:
                    q = q.eq("user_id", resolved_uuid)
                elif u_id:
                    q = q.eq("employee_code", u_id)
                elif u_email:
                    q = q.eq("email", u_email)

                res = q.limit(1).execute()
                if res.data and len(res.data) > 0:
                    emp = res.data[0]
                    emp_uid = str(emp.get("user_id") or "").strip()
                    if emp_uid and len(emp_uid) == 36 and "-" in emp_uid:
                        resolved_uuid = emp_uid
                    if emp.get("email"):
                        resolved_email = str(emp["email"]).strip().lower()
            except Exception as e:
                logger.debug(f"[WebPush] identity resolution notice: {e}")

        if not resolved_uuid and not resolved_email:
            return []

        subs_map: Dict[str, Dict[str, Any]] = {}

        # 3. Query system.push_subscriptions by resolved UUID
        if resolved_uuid:
            try:
                res = self.supabase.schema("system").table("push_subscriptions").select("*").eq("user_id", resolved_uuid).execute()
                if res.data:
                    for s in res.data:
                        if s.get("endpoint"):
                            subs_map[s["endpoint"]] = s
            except Exception as e:
                logger.debug(f"[WebPush] UUID query notice: {e}")

        # 4. Query system.push_subscriptions by resolved Email
        if resolved_email:
            try:
                res = self.supabase.schema("system").table("push_subscriptions").select("*").eq("user_email", resolved_email).execute()
                if res.data:
                    for s in res.data:
                        if s.get("endpoint"):
                            subs_map[s["endpoint"]] = s
            except Exception as e:
                logger.debug(f"[WebPush] Email query notice: {e}")

        final_subs = list(subs_map.values())
        logger.info(f"[PUSH] recipient resolved: uuid='{resolved_uuid[:8]}...' email='{resolved_email}' -> subscriptions found: {len(final_subs)}")
        return final_subs

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
        except Exception as e:
            try:
                res = self.supabase.table("notifications").update(updates).eq("id", notification_id).execute()
                if res.data and len(res.data) > 0:
                    return self._standardize_notification(res.data[0])
            except Exception as inner_e:
                logger.warning(f"mark_as_read failed: {inner_e}")

        return {"id": notification_id, "is_read": True}

    def mark_all_as_read(self, user_id: str, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        user_notifs = self.get_user_notifications(user_id, user_payload)
        unread_ids = [str(n.get("id")) for n in user_notifs if not n.get("is_read") and n.get("id")]

        # Always update in-memory cache first
        for n in _in_memory_notifications:
            if str(n.get("id")) in unread_ids or str(n.get("notification_id")) in unread_ids:
                n["is_read"] = True
                n["read"] = True
                n["unread"] = False

        if unread_ids:
            updates = {"is_read": True, "read": True, "unread": False}
            try:
                self.supabase.schema("system").table("notifications").update(updates).in_("id", unread_ids).execute()
            except Exception as e:
                try:
                    self.supabase.table("notifications").update(updates).in_("id", unread_ids).execute()
                except Exception as inner_e:
                    logger.warning(f"mark_all_as_read batch update notice: {inner_e}")

        return {"marked_count": len(unread_ids)}

    # ──────────────────────────────────────────────────────────────────────────
    # Live Chat & Contacts API
    # ──────────────────────────────────────────────────────────────────────────

    def get_chat_contacts(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        from app.modules.users.repository import UserRepository
        user_repo = UserRepository()
        all_users = user_repo.get_all_users()

        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "").strip()

        # Find current user in all_users
        current_user = next((u for u in all_users if str(u.get("email")).lower() == user_email or str(u.get("id")) == user_id), None)

        # Determine current user's reporting manager name/email
        rm_name = (current_user.get("reporting_manager_name") if current_user else None) or "Jeeva kumar"
        rm_email = (current_user.get("reporting_manager_email") if current_user else None) or "jeeva@tconnect.com"

        # Match reporting manager from all_users if possible
        rm_user = next((u for u in all_users if str(u.get("email")).lower() == rm_email.lower() or u.get("name") == rm_name or "jeeva" in str(u.get("name")).lower()), None)
        if rm_user:
            rm_name = rm_user.get("name") or rm_name
            rm_email = rm_user.get("email") or rm_email

        # Find Team Lead (e.g. Vedika)
        tl_user = next((u for u in all_users if ("team lead" in str(u.get("role") or u.get("designation")).lower() or "tl" in str(u.get("role") or u.get("designation")).lower() or "vedika" in str(u.get("name")).lower()) and str(u.get("email")).lower() != user_email), None)
        tl_name = tl_user.get("name") if tl_user else "vedika ."
        tl_email = tl_user.get("email") if tl_user else "vedika@tconnect.com"
        tl_title = (tl_user.get("designation") or tl_user.get("role")) if tl_user else "Team Lead"

        # Find Team Members / Peers
        peers = []
        for u in all_users:
            u_email = str(u.get("email")).lower()
            u_role = str(u.get("role") or u.get("designation")).lower()
            if u_email != user_email and u_email != rm_email.lower() and u_email != tl_email.lower():
                if "executive" in u_role or "sales" in u_role:
                    peers.append(u)

        # Helper for avatar initials
        def get_avatar(name_str):
            parts = name_str.strip().split()
            if len(parts) >= 2:
                return (parts[0][0] + parts[1][0]).upper()
            elif len(parts) == 1 and parts[0]:
                return parts[0][:2].upper()
            return "TC"

        contacts = [
            {
                "id": rm_user.get("id") if rm_user else "rm-1",
                "name": rm_name,
                "role": "Reporting Manager",
                "role_title": (rm_user.get("designation") or rm_user.get("role")) if rm_user else "Sales Manager",
                "avatar": get_avatar(rm_name),
                "online": True,
                "email": rm_email,
                "contact_type": "reporting_manager",
                "last_message": "Good morning! Please update your lead status and visit reports for today.",
                "last_time": "09:30 AM",
                "unread": 0
            },
            {
                "id": tl_user.get("id") if tl_user else "tl-1",
                "name": tl_name,
                "role": "Team Lead",
                "role_title": tl_title,
                "avatar": get_avatar(tl_name),
                "online": True,
                "email": tl_email,
                "contact_type": "team_lead",
                "last_message": "Going well! Closed 2 deals this week.",
                "last_time": "Yesterday",
                "unread": 0
            }
        ]

        if peers:
            p = peers[0]
            p_name = p.get("name") or "Sales Executive Team"
            contacts.append({
                "id": p.get("id") or "se-1",
                "name": p_name,
                "role": "Sales Executive Team",
                "role_title": p.get("designation") or "Sales Executive",
                "avatar": get_avatar(p_name),
                "online": True,
                "email": p.get("email") or "team@tconnect.com",
                "contact_type": "team",
                "last_message": "Team meet scheduled at 4:30 PM today for target review.",
                "last_time": "10:00 AM",
                "unread": 0
            })

        # Add HR & Operations
        contacts.append({
            "id": "hr-1",
            "name": "HR & Operations",
            "role": "HR & Support",
            "role_title": "HR Manager",
            "avatar": "H&",
            "online": False,
            "email": "hr@tconnect.com",
            "contact_type": "hr",
            "last_message": "Welcome to TwiteHRMS! Let us know if you need assistance with leave balance.",
            "last_time": "2 days ago",
            "unread": 0
        })

        return contacts

    def get_chat_messages(self, user_payload: Dict[str, Any], contact_type: str = None, contact_id: str = None, contact_email: str = None) -> List[Dict[str, Any]]:
        messages = []
        user_email = str((user_payload or {}).get("email") or "").lower().strip()

        # Query public.user_messages table from Supabase
        try:
            res = self.supabase.table("user_messages").select("*").execute()
            if res.data:
                for msg in res.data:
                    messages.append(msg)
        except Exception as e:
            logger.debug(f"public.user_messages query notice: {e}")

        # Include in-memory messages
        for mem in _in_memory_messages:
            if not any(str(m.get("id")) == str(mem.get("id")) for m in messages):
                messages.append(mem)

        # Filter by contact matching
        filtered = []
        c_email = str(contact_email or "").lower().strip()
        c_type = str(contact_type or "").lower().strip()

        for msg in messages:
            s_email = str(msg.get("sender_email") or "").lower().strip()
            r_email = str(msg.get("recipient_email") or "").lower().strip()
            c_type_msg = str(msg.get("contact_type") or "").lower().strip()

            # Match criteria
            type_match = bool(c_type and c_type_msg == c_type)
            email_match = bool(c_email and (s_email == c_email or r_email == c_email))
            id_match = bool(contact_id and (str(msg.get("sender_id")) == str(contact_id) or str(msg.get("recipient_id")) == str(contact_id)))

            if type_match or email_match or id_match or not (c_type or c_email or contact_id):
                filtered.append(msg)

        filtered.sort(key=lambda x: str(x.get("created_at") or ""))
        return filtered

    def send_chat_message(self, user_payload: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        sender_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "").strip()
        meta = (user_payload or {}).get("user_metadata", {})
        sender_email = str((user_payload or {}).get("email") or meta.get("email") or "").lower().strip()
        sender_name = str((user_payload or {}).get("name") or meta.get("full_name") or meta.get("name") or sender_email.split("@")[0].title()).strip()

        now_iso = datetime.utcnow().isoformat() + "Z"
        msg_id = str(uuid.uuid4())

        msg_obj = {
            "id": msg_id,
            "sender_id": sender_id,
            "sender_email": sender_email,
            "sender_name": sender_name,
            "recipient_id": str(data.get("recipient_id") or ""),
            "recipient_email": str(data.get("recipient_email") or "").lower().strip(),
            "recipient_name": str(data.get("recipient_name") or ""),
            "contact_type": str(data.get("contact_type") or "reporting_manager"),
            "message_text": str(data.get("message_text") or data.get("text") or ""),
            "is_read": False,
            "created_at": now_iso
        }

        _in_memory_messages.append(msg_obj)

        try:
            self.supabase.table("user_messages").insert(msg_obj).execute()
        except Exception as e:
            logger.warning(f"user_messages insert notice: {e}")

        return msg_obj


