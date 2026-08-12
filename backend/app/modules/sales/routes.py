from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Dict, Any, Optional
from app.modules.sales.service import SalesTargetService
from app.modules.sales.schemas import SalesTargetCreate, SalesTargetUpdate, SalesTargetResponse
from app.core.dependencies import get_current_user_payload
from app.core.logger import logger

router = APIRouter(prefix="", tags=["Sales Management"])
service = SalesTargetService()


@router.get("/targets", response_model=List[Dict[str, Any]])
def get_targets(user_payload: Dict[str, Any] = Depends(get_current_user_payload)):
    """Fetch sales targets scoped to current manager or executive."""
    return service.list_targets(user_payload)


@router.post("/targets", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_target(
    target_data: SalesTargetCreate,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Create a new sales target assigned to an executive."""
    return service.create_target(target_data, user_payload)


@router.put("/targets/{target_id}", response_model=Dict[str, Any])
def update_target(target_id: str, updates: SalesTargetUpdate):
    """Update an existing sales target."""
    return service.update_target(target_id, updates)


@router.delete("/targets/{target_id}")
def delete_target(target_id: str):
    """Delete a sales target."""
    service.delete_target(target_id)
    return {"status": "success", "message": f"Target {target_id} deleted successfully"}


@router.get("/revenue-breakdown", response_model=Dict[str, Any])
def get_team_revenue_breakdown(
    mode: Optional[str] = Query("This Month", description="Date filter: Today, This Week, This Month, Custom"),
    start_date: Optional[str] = Query(None, description="Custom start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Custom end date YYYY-MM-DD"),
    manager_id: Optional[str] = Query(None, description="Target manager ID (Admin/CEO override only)"),
    user_payload: Dict[str, Any] = Depends(get_current_user_payload),
):
    """
    Sales Manager team revenue & 5% incentive breakdown.
    RBAC: Manager identity derived from JWT — Sales Managers cannot override manager_id.
    """
    try:
        breakdown = service.get_team_revenue_breakdown(
            user_payload=user_payload,
            mode=mode,
            start_date=start_date,
            end_date=end_date,
            target_manager_id=manager_id,
        )
        return {"success": True, "message": "Team revenue breakdown retrieved successfully", "data": breakdown}
    except Exception as e:
        logger.warning(f"Revenue breakdown error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

