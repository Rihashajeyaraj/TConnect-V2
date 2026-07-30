from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.visit.schemas import VisitCreate, VisitCheckIn, VisitCheckOut, VisitResponse
from app.modules.visit.service import VisitService
from app.modules.visit.permissions import CanViewVisits, CanRecordVisits

router = APIRouter(prefix="/visits", tags=["Visit Management"])


def get_service() -> VisitService:
    return VisitService()


@router.get("", response_model=StandardResponse)
async def list_visits(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewVisits),
    service: VisitService = Depends(get_service)
):
    """Retrieve all scheduled or completed field visits."""
    visits = service.list_visits()
    return StandardResponse.success_response(
        data=visits,
        message="Visits list retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_visit(
    data: VisitCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanRecordVisits),
    service: VisitService = Depends(get_service)
):
    """Schedule a new field visit."""
    visitor_id = user_payload.get("sub", "user_001")
    visit = service.create_visit(data, visitor_id)
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
    """Check-in to a field visit with geo-location."""
    visit = service.check_in(visit_id, data)
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
    """Check-out of a field visit."""
    visit = service.check_out(visit_id, data)
    return StandardResponse.success_response(
        data=visit,
        message="Checked out of visit successfully"
    )
