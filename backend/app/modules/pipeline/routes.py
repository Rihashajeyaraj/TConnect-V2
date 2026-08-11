from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.pipeline.schemas import OpportunityCreate, OpportunityUpdateStage, OpportunityResponse
from app.modules.pipeline.service import PipelineService
from app.modules.pipeline.permissions import CanViewPipeline, CanManagePipeline

router = APIRouter(prefix="/pipeline", tags=["Pipeline & Opportunities"])


def get_service() -> PipelineService:
    return PipelineService()


@router.get("/opportunities", response_model=StandardResponse)
async def list_opportunities(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewPipeline),
    service: PipelineService = Depends(get_service)
):
    """Retrieve sales pipeline opportunities filtered by authenticated user."""
    opportunities = service.list_opportunities(user_payload)
    return StandardResponse.success_response(
        data=opportunities,
        message="Opportunities list retrieved successfully"
    )


@router.post("/opportunities", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    data: OpportunityCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewPipeline),
    service: PipelineService = Depends(get_service)
):
    """Create a new sales opportunity for the authenticated user."""
    opp = service.create_opportunity(data, user_payload)
    return StandardResponse.success_response(
        data=opp,
        message="Opportunity created successfully"
    )


@router.put("/opportunities/{opp_id}/stage", response_model=StandardResponse)
@router.patch("/opportunities/{opp_id}/stage", response_model=StandardResponse)
async def update_opportunity_stage(
    opp_id: str,
    data: OpportunityUpdateStage,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewPipeline),
    service: PipelineService = Depends(get_service)
):
    """Update sales stage for an opportunity with authorization check."""
    opp = service.update_stage(opp_id, data, user_payload)
    return StandardResponse.success_response(
        data=opp,
        message="Opportunity stage updated successfully"
    )
