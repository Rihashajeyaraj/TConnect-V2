from typing import List, Dict, Any, Optional
from app.modules.audit.repository import AuditRepository
from app.core.logger import logger


class AuditService:
    def __init__(self, repo: AuditRepository = None):
        self.repo = repo or AuditRepository()

    def list_logs(self) -> List[Dict[str, Any]]:
        return self.repo.get_logs()

    def list_logs_filtered(self, filters: Dict[str, Any], user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_logs_filtered(filters, user_payload)

    def create_log(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.create_log(data, user_payload)


# ── Module-level helper ─────────────────────────────────────────────────────────
# Import this ONE function in any route/service that needs to create an audit event.
# It never raises — audit failures are logged but never break the caller operation.

def _trigger_ceo_admin_alert_notification(
    action: str,
    description: str,
    user_payload: Dict[str, Any],
    details: Optional[Dict[str, Any]] = None
):
    try:
        meta = (user_payload or {}).get("user_metadata") or {}
        actor_role = str((user_payload or {}).get("role") or meta.get("role") or "").lower().strip()
        actor_name = str(
            (user_payload or {}).get("name")
            or meta.get("name")
            or (user_payload or {}).get("email")
            or "Admin"
        ).strip()

        # Check if performed by Admin / Super Admin (or system admin)
        is_admin_actor = any(kw in actor_role for kw in ["admin", "super", "system"])
        if not is_admin_actor:
            return

        action_upper = str(action or "").upper().strip()

        # Map Admin actions to CEO Alert titles
        titles = {
            "LEAVE_DAYS_CHANGED": "⚠️ Admin Alert: Employee Leave Days Changed",
            "LEAVE_UPDATED": "⚠️ Admin Alert: Employee Leave Days Updated",
            "PASSWORD_CHANGED": "🔒 Admin Alert: Employee Password Changed",
            "PASSWORD_RESET_APPROVED": "🔒 Admin Alert: Password Reset Approved",
            "EMPLOYEE_DEACTIVATED": "⛔ Admin Alert: Employee Account Deactivated",
            "USER_DEACTIVATED": "⛔ Admin Alert: Employee Account Deactivated",
            "MANAGER_ASSIGNED": "👥 Admin Alert: Reporting Manager Reassigned",
            "MANAGER_CHANGED": "👥 Admin Alert: Reporting Manager Reassigned",
            "CLIENT_REASSIGNED": "🎯 Admin Alert: Client Portfolio Reassigned",
            "LEAD_REASSIGNED": "🎯 Admin Alert: Sales Lead Reassigned",
            "CLIENT_LEAD_REASSIGNED": "🎯 Admin Alert: Client / Lead Reassigned",
            "SALARY_UPDATED": "💰 Admin Alert: Employee Salary Updated",
            "EMPLOYEE_ROLE_CHANGED": "💼 Admin Alert: Employee Role Changed",
        }

        # Check if action is one of the targeted Admin change categories
        title = None
        for k, v in titles.items():
            if k in action_upper or action_upper.startswith(k):
                title = v
                break

        if not title:
            if "PASSWORD" in action_upper:
                title = "🔒 Admin Alert: Employee Password Changed"
            elif "DEACTIVAT" in action_upper:
                title = "⛔ Admin Alert: Employee Account Deactivated"
            elif "REASSIGN" in action_upper or "MANAGER" in action_upper:
                title = "👥 Admin Alert: Manager / Client Reassigned"
            elif "LEAVE" in action_upper:
                title = "⚠️ Admin Alert: Employee Leave Days Changed"
            elif "SALARY" in action_upper:
                title = "💰 Admin Alert: Employee Salary Updated"
            elif is_admin_actor and ("EMPLOYEE" in action_upper or "USER" in action_upper):
                title = "⚠️ Admin Alert: Employee Data Updated"
            else:
                return

        from app.modules.notification.repository import NotificationRepository

        notif_msg = description or f"Admin {actor_name} modified employee data."

        NotificationRepository().create_notification({
            "recipient_role": "CEO",
            "title": title,
            "message": notif_msg,
            "type": "WARNING",
            "notification_type": "WARNING",
            "category": "ADMIN_ACTION_ALERT",
            "link": "/ceo/hrms",
        })
        logger.info(f"[CEO ALERT NOTIFICATION] Successfully created CEO alert notification: title='{title}', actor='{actor_name}'")
    except Exception as ex:
        logger.debug(f"CEO Admin alert notification trigger notice: {ex}")


def create_audit_log(
    action: str,
    entity_type: str,
    user_payload: Dict[str, Any],
    *,
    entity_id: str = "",
    module: str = "",
    description: str = "",
    previous_value: Any = None,
    new_value: Any = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    try:
        AuditRepository().create_log(
            {
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "module": module,
                "description": description,
                "previous_value": previous_value,
                "new_value": new_value,
                "details": details or {},
            },
            user_payload,
        )

        # ── Trigger CEO Alert Notification for Admin Changes ──
        _trigger_ceo_admin_alert_notification(action, description, user_payload, details)
    except Exception as e:
        logger.warning(f"Audit log creation failed (non-fatal): action={action} error={e}")

