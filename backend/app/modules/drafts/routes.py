from fastapi import APIRouter, Depends, Query
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.drafts.schemas import DraftSave
from app.modules.drafts.service import DraftsService
from app.modules.drafts.repository import DraftsRepository

router = APIRouter(prefix="/auto-save", tags=["Auto-Save Drafts"])

def get_repository() -> DraftsRepository:
    return DraftsRepository()

def get_service(repository: DraftsRepository = Depends(get_repository)) -> DraftsService:
    return DraftsService(repository)

@router.post("/drafts", response_model=StandardResponse)
async def save_draft(
    payload: DraftSave,
    user_payload: dict = Depends(get_current_user_payload),
    service: DraftsService = Depends(get_service)
):
    """Save or update a form draft for the authenticated user."""
    user_id = user_payload.get("sub")
    draft = service.save_draft(user_id, payload.form_key, payload.record_id, payload.draft_data)
    return StandardResponse.success_response(
        data={"draft": draft},
        message="Draft saved successfully"
    )

@router.get("/drafts/{form_key}", response_model=StandardResponse)
async def get_draft(
    form_key: str,
    record_id: str = Query("new"),
    user_payload: dict = Depends(get_current_user_payload),
    service: DraftsService = Depends(get_service)
):
    """Retrieve the saved draft matching the form key and record ID."""
    user_id = user_payload.get("sub")
    draft = service.get_draft(user_id, form_key, record_id)
    return StandardResponse.success_response(
        data={"draft": draft},
        message="Draft retrieved successfully"
    )

@router.delete("/drafts/{form_key}", response_model=StandardResponse)
async def delete_draft(
    form_key: str,
    record_id: str = Query("new"),
    user_payload: dict = Depends(get_current_user_payload),
    service: DraftsService = Depends(get_service)
):
    """Clear the saved draft matching the form key and record ID."""
    user_id = user_payload.get("sub")
    success = service.delete_draft(user_id, form_key, record_id)
    return StandardResponse.success_response(
        data={"success": success},
        message="Draft cleared successfully"
    )
