from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.modules.sales.service import SalesTargetService
from app.modules.sales.schemas import SalesTargetCreate, SalesTargetUpdate, SalesTargetResponse
from app.core.dependencies import get_current_user_payload

router = APIRouter(prefix="/targets", tags=["Sales Targets"])
service = SalesTargetService()


@router.get("", response_model=List[Dict[str, Any]])
def get_targets(user_payload: Dict[str, Any] = Depends(get_current_user_payload)):
    """Fetch sales targets scoped to current manager or executive."""
    return service.list_targets(user_payload)


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_target(
    target_data: SalesTargetCreate,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Create a new sales target assigned to an executive."""
    return service.create_target(target_data, user_payload)


@router.put("/{target_id}", response_model=Dict[str, Any])
def update_target(target_id: str, updates: SalesTargetUpdate):
    """Update an existing sales target."""
    return service.update_target(target_id, updates)


@router.delete("/{target_id}")
def delete_target(target_id: str):
    """Delete a sales target."""
    success = service.delete_target(target_id)
    return {"status": "success", "message": f"Target {target_id} deleted successfully"}
