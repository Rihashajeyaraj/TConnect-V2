from fastapi import APIRouter, Depends
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.audit.schemas import AuditLogResponse
from app.modules.audit.service import AuditService
from app.modules.audit.permissions import CanViewAuditLogs

router = APIRouter(prefix="/audit", tags=["Audit & Activity Logs"])


def get_service() -> AuditService:
    return AuditService()


@router.get("/logs", response_model=StandardResponse)
async def list_audit_logs(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewAuditLogs),
    service: AuditService = Depends(get_service)
):
    """Retrieve security audit logs."""
    logs = service.list_logs()
    return StandardResponse.success_response(
        data=logs,
        message="Audit logs retrieved successfully"
    )
