from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.audit.schemas import AuditLogResponse
from app.modules.audit.service import AuditService, create_audit_log
from app.modules.audit.permissions import CanViewAuditLogs

router = APIRouter(prefix="/audit", tags=["Audit & Activity Logs"])


def get_service() -> AuditService:
    return AuditService()


@router.get("/logs", response_model=StandardResponse)
async def list_audit_logs(
    user_email: Optional[str] = Query(None, description="Filter by performer email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    action: Optional[str] = Query(None, description="Filter by action e.g. LEAD_CREATED"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type e.g. crm.leads"),
    from_date: Optional[str] = Query(None, description="From date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="To date YYYY-MM-DD"),
    limit: int = Query(200, description="Max records to return"),
    offset: int = Query(0, description="Pagination offset"),
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewAuditLogs),
    service: AuditService = Depends(get_service),
):
    """Retrieve security audit logs with optional filters. CEO / Super Admin only."""
    filters = {
        "user_email": user_email,
        "role": role,
        "action": action,
        "entity_type": entity_type,
        "from_date": from_date,
        "to_date": to_date,
        "limit": limit,
        "offset": offset,
    }
    logs = service.list_logs_filtered({k: v for k, v in filters.items() if v is not None}, user_payload)
    return StandardResponse.success_response(
        data=logs,
        message=f"Audit logs retrieved successfully ({len(logs)} records)"
    )


@router.post("/log", response_model=StandardResponse)
async def log_frontend_event(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
):
    """
    Frontend-emitted audit event (e.g. sidebar reorder save, HRMS toggle save).
    Any authenticated user may call this for their own actions.
    User identity and role are ALWAYS taken from the JWT — not the request body.
    Only action, entity_type, entity_id, module, description,
    previous_value, new_value are accepted from the caller.
    """
    action = str(data.get("action") or "UNKNOWN_ACTION")
    
    # Restrict POST /audit/log to a whitelist of legitimate frontend configuration events
    ALLOWED_FRONTEND_ACTIONS = {
        "SIDEBAR_ORDER_CHANGED",
        "SIDEBAR_ORDER_RESET",
        "HRMS_TOGGLE_ORDER_CHANGED",
        "HRMS_TOGGLE_ORDER_RESET",
        "NEARBY_CLIENT_DETECTED",
        "MANAGER_NEARBY_CLIENT",
    }
    
    if action not in ALLOWED_FRONTEND_ACTIONS and not action.startswith("MANAGER_NOTIF_"):
        raise HTTPException(
            status_code=400,
            detail=f"Action '{action}' is not permitted to be submitted directly from the frontend client."
        )

    create_audit_log(
        action=action,
        entity_type=str(data.get("entity_type") or "frontend"),
        user_payload=user_payload,
        entity_id=str(data.get("entity_id") or ""),
        module=str(data.get("module") or "Configuration"),
        description=str(data.get("description") or ""),
        previous_value=data.get("previous_value"),
        new_value=data.get("new_value"),
        details=data.get("details") or {},
    )
    return StandardResponse.success_response(
        data={"logged": True},
        message="Audit event recorded"
    )
