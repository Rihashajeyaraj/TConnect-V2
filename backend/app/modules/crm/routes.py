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
    """Retrieve all CRM leads."""
    leads = service.list_leads()
    return StandardResponse.success_response(
        data=leads,
        message="Leads list retrieved successfully"
    )


@router.post("/leads", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Create a new CRM lead."""
    lead = service.create_lead(data)
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
    """Retrieve lead details by ID."""
    lead = service.get_lead(lead_id)
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
    """Update lead details."""
    updated = service.update_lead(lead_id, data)
    return StandardResponse.success_response(
        data=updated,
        message="Lead details updated successfully"
    )

