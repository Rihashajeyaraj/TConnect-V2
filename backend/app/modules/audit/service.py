from typing import List, Dict, Any, Optional
from app.modules.audit.repository import AuditRepository
from app.core.logger import logger


class AuditService:
    def __init__(self, repo: AuditRepository = None):
        self.repo = repo or AuditRepository()

    def list_logs(self) -> List[Dict[str, Any]]:
        return self.repo.get_logs()

    def list_logs_filtered(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        return self.repo.get_logs_filtered(filters)

    def create_log(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.create_log(data, user_payload)


# ── Module-level helper ─────────────────────────────────────────────────────────
# Import this ONE function in any route/service that needs to create an audit event.
# It never raises — audit failures are logged but never break the caller operation.

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
    """
    Fire-and-forget audit log creator.

    Usage in any route (after a successful business operation):

        from app.modules.audit.service import create_audit_log
        try:
            create_audit_log("LEAD_CREATED", "crm.leads", user_payload,
                             entity_id=lead_id, description="Lead created")
        except Exception:
            pass

    Parameters
    ----------
    action        : e.g. "LEAD_CREATED", "USER_UPDATED", "LEAD_CONVERTED"
    entity_type   : e.g. "crm.leads", "hrms.employees", "crm.customers"
    user_payload  : FastAPI JWT payload dict from get_current_user_payload
    entity_id     : ID of the affected entity
    module        : Human-readable module name (stored in details)
    description   : Human-readable description of the change
    previous_value: Old state (dict/str/list) stored in details
    new_value     : New state (dict/str/list) stored in details
    details       : Any additional context dict
    """
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
    except Exception as e:
        logger.warning(f"Audit log creation failed (non-fatal): action={action} error={e}")
