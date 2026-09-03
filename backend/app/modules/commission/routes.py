from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from app.core.dependencies import get_current_user_payload
from app.modules.commission.repository import CommissionRepository
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/commission", tags=["commission"])
repo = CommissionRepository()

@router.get("/rules", response_model=List[Dict[str, Any]])
def get_commission_rules(
    active_only: bool = Query(True),
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Retrieve active commission calculation rules."""
    return repo.get_commission_rules(active_only=active_only)

@router.post("/rules", status_code=status.HTTP_201_CREATED)
def create_commission_rule(
    rule_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Create a new commission incentive rule (Admin/Manager only)."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only Finance/Admin can configure commission rules")

    created = repo.create_commission_rule(rule_data)
    try:
        create_audit_log(
            "COMMISSION_RULE_CREATED", "finance.commission_rules", user_payload,
            entity_id=created.get("id", ""), module="Finance",
            description=f"Created commission rule: {created.get('rule_name')}"
        )
    except Exception:
        pass
    return created

@router.put("/rules/{rule_id}")
def update_commission_rule(
    rule_id: str,
    rule_data: Dict[str, Any],
    user_payload: Dict[str, Any] = Depends(get_current_user_payload)
):
    """Update existing commission rule."""
    user_role = str(user_payload.get("role") or "").lower()
    if not any(r in user_role for r in ["admin", "ceo", "manager"]):
        raise HTTPException(status_code=403, detail="Only Finance/Admin can edit commission rules")

    updated = repo.update_commission_rule(rule_id, rule_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Commission rule not found")

    try:
        create_audit_log(
            "COMMISSION_RULE_UPDATED", "finance.commission_rules", user_payload,
            entity_id=rule_id, module="Finance",
            description=f"Updated commission rule ID: {rule_id}"
        )
    except Exception:
        pass
    return updated
