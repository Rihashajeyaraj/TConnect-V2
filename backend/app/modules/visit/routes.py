import anyio
from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.visit.schemas import VisitCreate, VisitCheckIn, VisitCheckOut, VisitResponse
from app.modules.visit.service import VisitService
from app.modules.visit.permissions import CanViewVisits, CanRecordVisits
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/visits", tags=["Visit Management"])


def get_service() -> VisitService:
    return VisitService()


@router.get("", response_model=StandardResponse)
@router.get("/all", response_model=StandardResponse)
async def list_visits(
    page: int | None = None,
    limit: int | None = None,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewVisits),
    service: VisitService = Depends(get_service)
):
    """Retrieve scheduled or completed field visits filtered by logged-in executive."""
    visits = await anyio.to_thread.run_sync(service.list_visits, user_payload, page, limit)
    return StandardResponse.success_response(
        data=visits,
        message="Visits list retrieved successfully"
    )


@router.get("/team-audit", response_model=StandardResponse)
async def list_team_audit_visits(
    manager_id: str = None,
    sales_executive_id: str = None,
    visit_status: str = None,
    lead_status: str = None,
    priority: str = None,
    search: str = None,
    from_date: str = None,
    to_date: str = None,
    page: int = 1,
    limit: int = 50,
    sort: str = "created_at_desc",
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewVisits),
    service: VisitService = Depends(get_service)
):
    """Retrieve team field visit audit records & summary metrics belonging to logged-in Sales Manager."""
    params = {
        "manager_id": manager_id,
        "sales_executive_id": sales_executive_id,
        "visit_status": visit_status,
        "lead_status": lead_status,
        "priority": priority,
        "search": search,
        "from_date": from_date,
        "to_date": to_date,
        "page": page,
        "limit": limit,
        "sort": sort,
    }
    audit_data = await anyio.to_thread.run_sync(service.get_team_audit_visits, user_payload, params)
    return StandardResponse.success_response(
        data=audit_data,
        message="Team field visit audit retrieved successfully"
    )


@router.post("", response_model=StandardResponse)
async def schedule_visit(
    data: VisitCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordVisits),
    service: VisitService = Depends(get_service)
):
    """Schedule a new client visit."""
    visit = service.create_visit(data, user_payload)
    create_audit_log(
        "VISIT_CREATED", "field_management.visits", user_payload,
        entity_id=str(visit.get("id") or visit.get("visit_id") or ""),
        module="Field Management",
        description=f"Visit scheduled: {getattr(data, 'client_name', '') or getattr(data, 'purpose', '')}",
        new_value={"purpose": getattr(data, "purpose", None), "scheduled_date": getattr(data, "scheduled_date", None)},
    )
    return StandardResponse.success_response(
        data=visit,
        message="Visit scheduled successfully"
    )


@router.post("/{visit_id}/check-in", response_model=StandardResponse)
async def check_in_visit(
    visit_id: str,
    data: VisitCheckIn,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordVisits),
    service: VisitService = Depends(get_service)
):
    """Check-in to a field visit with geo-location and authorization check."""
    visit = service.check_in(visit_id, data, user_payload)
    create_audit_log(
        "VISIT_CHECK_IN", "field_management.visits", user_payload,
        entity_id=visit_id,
        module="Field Management",
        description=f"Checked in to visit {visit_id}",
        new_value={"latitude": data.latitude, "longitude": data.longitude},
    )
    return StandardResponse.success_response(
        data=visit,
        message="Checked into visit successfully"
    )


@router.post("/{visit_id}/check-out", response_model=StandardResponse)
async def check_out_visit(
    visit_id: str,
    data: VisitCheckOut,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordVisits),
    service: VisitService = Depends(get_service)
):
    """Check-out of a field visit with authorization check."""
    visit = service.check_out(visit_id, data, user_payload)
    create_audit_log(
        "VISIT_CHECK_OUT", "field_management.visits", user_payload,
        entity_id=visit_id,
        module="Field Management",
        description=f"Checked out of visit {visit_id}",
        new_value={"outcome": data.outcome},
    )
    return StandardResponse.success_response(
        data=visit,
        message="Checked out of visit successfully"
    )


@router.put("/{visit_id}/complete", response_model=StandardResponse)
async def complete_visit(
    visit_id: str,
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordVisits),
    service: VisitService = Depends(get_service)
):
    """Submit complete SE Visit Completion Form with authorization check."""
    visit = service.complete_visit(visit_id, data, user_payload)
    create_audit_log(
        "VISIT_COMPLETED", "field_management.visits", user_payload,
        entity_id=visit_id,
        module="Field Management",
        description=f"Visit completion form submitted: {visit_id}",
        new_value=data if isinstance(data, dict) else {},
    )
    return StandardResponse.success_response(
        data=visit,
        message="Visit completion form submitted successfully"
    )
