from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.crm.schemas import LeadCreate, LeadUpdate, LeadResponse
from app.modules.crm.service import CRMService
from app.modules.crm.permissions import CanViewLeads, CanManageLeads

router = APIRouter(prefix="/crm", tags=["CRM"])


def get_service() -> CRMService:
    return CRMService()


@router.get("/leads", response_model=StandardResponse)
async def list_leads(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Retrieve leads filtered by authenticated user."""
    leads = service.list_leads(user_payload)
    return StandardResponse.success_response(
        data=leads,
        message="Leads list retrieved successfully"
    )


@router.get("/team-leads", response_model=StandardResponse)
async def list_team_leads(
    manager_id: str = None,
    sales_executive_id: str = None,
    priority: str = None,
    status: str = None,
    category: str = None,
    search: str = None,
    from_date: str = None,
    to_date: str = None,
    page: int = 1,
    limit: int = 50,
    sort: str = "created_at_desc",
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Retrieve team leads & summary metrics belonging to logged-in Sales Manager."""
    params = {
        "manager_id": manager_id,
        "sales_executive_id": sales_executive_id,
        "priority": priority,
        "status": status,
        "category": category,
        "search": search,
        "from_date": from_date,
        "to_date": to_date,
        "page": page,
        "limit": limit,
        "sort": sort,
    }
    team_data = service.get_team_leads(user_payload, params)
    return StandardResponse.success_response(
        data=team_data,
        message="Team lead reports retrieved successfully"
    )


@router.post("/leads", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Create a new CRM lead."""
    lead = service.create_lead(data, user_payload)
    return StandardResponse.success_response(
        data=lead,
        message="Lead created successfully"
    )


@router.get("/leads/{lead_id}", response_model=StandardResponse)
async def get_lead(
    lead_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Retrieve lead details by ID with IDOR access authorization."""
    lead = service.get_lead(lead_id, user_payload)
    return StandardResponse.success_response(
        data=lead,
        message="Lead details retrieved successfully"
    )


@router.put("/leads/{lead_id}", response_model=StandardResponse)
async def update_lead(
    lead_id: str,
    data: LeadUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageLeads),
    service: CRMService = Depends(get_service)
):
    """Update lead details with authorization check."""
    updated = service.update_lead(lead_id, data, user_payload)
    return StandardResponse.success_response(
        data=updated,
        message="Lead details updated successfully"
    )


@router.delete("/leads/{lead_id}", response_model=StandardResponse)
async def delete_lead(
    lead_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Delete a CRM lead with authorization check."""
    service.delete_lead(lead_id, user_payload)
    return StandardResponse.success_response(
        data={"deleted": True},
        message="Lead deleted successfully"
    )


@router.get("/followups", response_model=StandardResponse)
async def list_followups(
    active_only: bool = True,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Retrieve follow-ups for the authenticated user."""
    followups = service.list_followups(user_payload, active_only=active_only)
    return StandardResponse.success_response(
        data=followups,
        message="Follow-ups list retrieved successfully"
    )


@router.post("/followups", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_followup(
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Create a new follow-up in CRM."""
    flw = service.create_followup(data, user_payload)
    return StandardResponse.success_response(
        data=flw,
        message="Follow-up scheduled successfully"
    )


@router.put("/followups/{followup_id}", response_model=StandardResponse)
async def update_followup(
    followup_id: str,
    data: dict,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageLeads),
    service: CRMService = Depends(get_service)
):
    """Update follow-up details or outcome with authorization check."""
    updated = service.update_followup(followup_id, data, user_payload)
    return StandardResponse.success_response(
        data=updated,
        message="Follow-up updated successfully"
    )


@router.delete("/followups/{followup_id}", response_model=StandardResponse)
async def delete_followup(
    followup_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageLeads),
    service: CRMService = Depends(get_service)
):
    """Delete a follow-up with authorization check."""
    service.delete_followup(followup_id, user_payload)
    return StandardResponse.success_response(
        data={"deleted": True},
        message="Follow-up removed successfully"
    )
