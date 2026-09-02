from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.crm.schemas import LeadCreate, LeadUpdate, LeadResponse
from app.modules.crm.service import CRMService
from app.modules.crm.permissions import CanViewLeads, CanManageLeads
from app.modules.audit.service import create_audit_log

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
    create_audit_log(
        "LEAD_CREATED", "crm.leads", user_payload,
        entity_id=str(lead.get("lead_id") or lead.get("id") or ""),
        module="CRM",
        description=f"Lead created: {data.company_name or data.contact_person or 'New Lead'}",
        new_value={"company": data.company_name, "status": data.status or "Hot"},
    )
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
    # Fetch existing lead to compare status and assignments
    try:
        existing_lead = service.get_lead(lead_id, user_payload)
        prev_assigned = existing_lead.get("assigned_to")
        prev_status = existing_lead.get("status")
    except Exception:
        existing_lead = None
        prev_assigned = None
        prev_status = None

    updated = service.update_lead(lead_id, data, user_payload)
    update_dict = data.model_dump(exclude_none=True)
    
    new_assigned = update_dict.get("assigned_to")
    new_status = update_dict.get("status")

    # Determine action and description based on fields updated
    if new_assigned and new_assigned != prev_assigned:
        action = "LEAD_ASSIGNED" if not prev_assigned else "LEAD_REASSIGNED"
        desc = f"Lead {lead_id} {action.lower().replace('_', ' ')} to {new_assigned}"
        prev_val = {"assigned_to": prev_assigned}
        new_val = {"assigned_to": new_assigned}
    elif new_status and new_status != prev_status:
        action = "LEAD_STATUS_CHANGED"
        desc = f"Lead {lead_id} status changed from '{prev_status}' to '{new_status}'"
        prev_val = {"status": prev_status}
        new_val = {"status": new_status}
    else:
        action = "LEAD_UPDATED"
        desc = f"Lead updated: {lead_id}"
        prev_val = {"details": {k: existing_lead.get(k) for k in update_dict.keys() if existing_lead} if existing_lead else None}
        new_val = update_dict

    create_audit_log(
        action, "crm.leads", user_payload,
        entity_id=lead_id,
        module="CRM",
        description=desc,
        previous_value=prev_val,
        new_value=new_val,
    )
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
    create_audit_log(
        "LEAD_DELETED", "crm.leads", user_payload,
        entity_id=lead_id, module="CRM",
        description=f"Lead deleted: {lead_id}",
    )
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
    create_audit_log(
        "FOLLOWUP_CREATED", "crm.followups", user_payload,
        entity_id=str(flw.get("followup_id") or flw.get("id") or ""),
        module="CRM",
        description=f"Follow-up scheduled for lead: {data.get('lead_id', '')}",
        new_value={"lead_id": data.get("lead_id"), "date": data.get("scheduledDate") or data.get("date")},
    )
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
    status_val = str(data.get("status") or "").lower()
    if status_val == "converted":
        action = "FOLLOWUP_CONVERTED"
    elif status_val == "completed" or status_val == "done":
        action = "FOLLOWUP_COMPLETED"
    else:
        action = "FOLLOWUP_UPDATED"
    create_audit_log(
        action, "crm.followups", user_payload,
        entity_id=followup_id, module="CRM",
        description=f"Follow-up {action.lower().replace('_', ' ')}: {followup_id}",
        new_value={"status": data.get("status"), "outcome": data.get("outcome")},
    )
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
    create_audit_log(
        "FOLLOWUP_DELETED", "crm.followups", user_payload,
        entity_id=followup_id, module="CRM",
        description=f"Follow-up deleted: {followup_id}",
    )
    return StandardResponse.success_response(
        data={"deleted": True},
        message="Follow-up removed successfully"
    )


@router.get("/contacts/search", response_model=StandardResponse)
async def search_contacts(
    query: str = "",
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewLeads),
    service: CRMService = Depends(get_service)
):
    """Search contact database matching company name or phone."""
    contacts = service.search_contacts(query, user_payload)
    return StandardResponse.success_response(
        data=contacts,
        message="Contact search completed successfully"
    )

from pydantic import BaseModel
from typing import List, Optional

class BulkReassignLeadsPayload(BaseModel):
    lead_ids: List[str]
    new_employee_id: str
    reassignment_reason: Optional[str] = "CEO Bulk Reassignment"

@router.post("/leads/reassign", response_model=StandardResponse)
async def reassign_leads(
    payload: BulkReassignLeadsPayload,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageLeads),
    service: CRMService = Depends(get_service)
):
    from app.core.scoping import normalize_user_role
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role") or "")
    if role not in ("admin", "super_admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only Admin can perform bulk reassignment.")

    try:
        success_count, updated_leads = service.bulk_reassign_leads(
            lead_ids=payload.lead_ids,
            new_employee_id=payload.new_employee_id,
            reassigned_by=user_payload.get("name") or user_payload.get("email") or "Admin",
            reason=payload.reassignment_reason
        )
        if success_count == 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail="No leads were updated in the database. Check the lead IDs and try again.")

        from app.modules.audit.service import create_audit_log
        create_audit_log(
            "LEAD_REASSIGNED",
            "crm.leads",
            user_payload,
            description=f"Admin reassigned {success_count} lead(s) to executive '{payload.new_employee_id}'. Reason: {payload.reassignment_reason or 'Admin Reassignment'}",
            new_value={"new_employee_id": payload.new_employee_id, "lead_ids": payload.lead_ids}
        )

        return StandardResponse.success_response(
            data={"reassigned_count": success_count, "updated_leads": updated_leads},
            message=f"Successfully reassigned {success_count} leads."
        )
    except Exception as e:
        from fastapi import HTTPException
        # Propagate actual exception details cleanly with CORS headers
        raise HTTPException(status_code=500, detail=f"Database or service error: {str(e)}")
