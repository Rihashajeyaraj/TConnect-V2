from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from app.core.dependencies import get_current_user_payload
from app.modules.holidays.repository import HolidayRepository
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/holidays", tags=["holidays"])
repo = HolidayRepository()

@router.get("", response_model=List[Dict[str, Any]])
def get_holidays(
    year: Optional[int] = Query(None),
    active_only: bool = Query(True),
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Retrieve holidays for HRMS calendar."""
    return repo.get_holidays(year=year, active_only=active_only)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_holiday(
    holiday_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Create a new holiday record (Admin/Manager only)."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can create holidays")

    created = repo.create_holiday(holiday_data)
    try:
        create_audit_log(
            "HOLIDAY_CREATED", "hrms.holidays", user_payload,
            entity_id=created.get("id", ""), module="HRMS",
            description=f"Created holiday: {created.get('title')}"
        )
    except Exception:
        pass
    return created

@router.put("/{holiday_id}")
def update_holiday(
    holiday_id: str,
    holiday_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Update existing holiday details."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can edit holidays")

    updated = repo.update_holiday(holiday_id, holiday_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Holiday not found")

    try:
        create_audit_log(
            "HOLIDAY_UPDATED", "hrms.holidays", user_payload,
            entity_id=holiday_id, module="HRMS",
            description=f"Updated holiday ID: {holiday_id}"
        )
    except Exception:
        pass
    return updated

@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: str,
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Delete or deactivate a holiday record."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only HR Managers or Admin can delete holidays")

    success = repo.delete_holiday(holiday_id)
    if not success:
        raise HTTPException(status_code=404, detail="Holiday not found")

    try:
        create_audit_log(
            "HOLIDAY_DELETED", "hrms.holidays", user_payload,
            entity_id=holiday_id, module="HRMS",
            description=f"Deleted holiday ID: {holiday_id}"
        )
    except Exception:
        pass
    return None
