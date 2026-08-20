from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.customer.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    ConversionRequest,
)
from app.modules.customer.service import CustomerService
from app.modules.customer.permissions import CanViewCustomers, CanManageCustomers
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/customer", tags=["Customer Management"])


def get_service() -> CustomerService:
    return CustomerService()


# ── List / Read ───────────────────────────────────────────────────────────────

@router.get("/customers", response_model=StandardResponse)
async def list_customers(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewCustomers),
    service: CustomerService = Depends(get_service),
):
    """List all customer accounts scoped to the authenticated user."""
    customers = service.list_customers(user_payload)
    return StandardResponse.success_response(
        data=customers,
        message="Customers list retrieved successfully",
    )


@router.get("/customers/{cust_id}", response_model=StandardResponse)
async def get_customer(
    cust_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewCustomers),
    service: CustomerService = Depends(get_service),
):
    """Get customer details by ID."""
    cust = service.get_customer(cust_id)
    return StandardResponse.success_response(
        data=cust,
        message="Customer details retrieved successfully",
    )


# ── Direct Add Customer ───────────────────────────────────────────────────────

@router.post("/customers", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service),
):
    """
    Direct Add Customer.
    lead_id is OPTIONAL — pass it only when the customer is known to
    come from an existing lead. If omitted, a standalone customer is
    created without generating a fake lead.
    Duplicate prevention is still applied (email / phone / company+person).
    """
    try:
        result = service.create_customer(data)
        create_audit_log(
            "CUSTOMER_CREATED", "crm.customers", user_payload,
            entity_id=str(result.get("customer_id") or result.get("id") or ""),
            module="Customer",
            description=f"Customer created: {data.name or data.company or ''}",
            new_value={"name": data.name, "company": data.company, "email": data.email},
        )
        return StandardResponse.success_response(
            data=result,
            message="Customer created successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ── Centralized Conversion Endpoints ─────────────────────────────────────────

@router.post(
    "/convert/lead/{lead_id}",
    response_model=StandardResponse,
    status_code=status.HTTP_200_OK,
    summary="Convert a CRM Lead to a Customer",
)
async def convert_lead_to_customer(
    lead_id: str,
    data: ConversionRequest = ConversionRequest(),
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service),
):
    """
    Lead -> Customer conversion.
    1. Validates lead UUID.
    2. Checks for existing customer by lead_id (no duplicates).
    3. Creates customer in crm.customers if not found.
    4. Marks crm.leads status = 'Converted to Customer'.
    5. Preserves lead history (does not delete).
    Returns: { customer, created, source, match_reason }
    """
    extra = data.model_dump(exclude_none=True)
    try:
        result = service.convert_lead_to_customer(lead_id, extra, user_payload)
        msg = "Lead converted to Customer" if result["created"] else "Customer already exists (returned existing)"
        create_audit_log(
            "LEAD_CONVERTED", "crm.customers", user_payload,
            entity_id=str(result.get("customer", {}).get("id") or lead_id),
            module="CRM",
            description=f"Lead {lead_id} converted to Customer",
            previous_value={"status": "Lead"},
            new_value={"status": "Customer", "lead_id": lead_id, "created": result["created"]},
        )
        return StandardResponse.success_response(data=result, message=msg)
    except ValueError as e:
        code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/convert/followup/{followup_id}",
    response_model=StandardResponse,
    status_code=status.HTTP_200_OK,
    summary="Convert a Follow-up to a Customer",
)
async def convert_followup_to_customer(
    followup_id: str,
    data: ConversionRequest = ConversionRequest(),
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service),
):
    """
    Follow-up -> Customer conversion.
    1. Resolves follow-up record and linked lead (if any).
    2. Checks for existing customer (duplicate prevention).
    3. Creates customer in crm.customers if needed.
    4. Updates follow-up: status=Converted, customer_id=actual customer UUID.
    5. Updates linked lead status if present.
    6. Follow-up is preserved in history (not deleted).
    7. Follow-up will no longer appear in active follow-up lists.
    Returns: { customer, created, source, match_reason }
    """
    extra = data.model_dump(exclude_none=True)
    try:
        result = service.convert_followup_to_customer(followup_id, extra, user_payload)
        msg = (
            "Follow-up converted to Customer"
            if result["created"]
            else "Customer already exists (returned existing, follow-up linked)"
        )
        create_audit_log(
            "FOLLOWUP_CONVERTED", "crm.customers", user_payload,
            entity_id=str(result.get("customer", {}).get("id") or followup_id),
            module="CRM",
            description=f"Follow-up {followup_id} converted to Customer",
            previous_value={"status": "Follow-up"},
            new_value={"status": "Customer", "followup_id": followup_id, "created": result["created"]},
        )
        return StandardResponse.success_response(data=result, message=msg)
    except ValueError as e:
        code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/convert/visit/{visit_id}",
    response_model=StandardResponse,
    status_code=status.HTTP_200_OK,
    summary="Convert a Visit record to a Customer",
)
async def convert_visit_to_customer(
    visit_id: str,
    data: ConversionRequest = ConversionRequest(),
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service),
):
    """
    Visit -> Customer conversion.
    1. Resolves visit record; extracts lead_id if available.
    2. Checks for existing customer (duplicate prevention).
    3. Creates customer in crm.customers if needed.
    4. Links customer_id to visit record.
    5. Updates linked lead status if present.
    6. Visit history preserved (not deleted).
    Returns: { customer, created, source, match_reason }
    """
    extra = data.model_dump(exclude_none=True)
    try:
        result = service.convert_visit_to_customer(visit_id, extra, user_payload)
        msg = (
            "Visit converted to Customer"
            if result["created"]
            else "Customer already exists (returned existing, visit linked)"
        )
        create_audit_log(
            "VISIT_CONVERTED", "crm.customers", user_payload,
            entity_id=str(result.get("customer", {}).get("id") or visit_id),
            module="Field Management",
            description=f"Visit {visit_id} converted to Customer",
            previous_value={"status": "Visit"},
            new_value={"status": "Customer", "visit_id": visit_id, "created": result["created"]},
        )
        return StandardResponse.success_response(data=result, message=msg)
    except ValueError as e:
        code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ── Update / Delete ───────────────────────────────────────────────────────────

@router.put("/customers/{cust_id}", response_model=StandardResponse)
async def update_customer(
    cust_id: str,
    data: CustomerUpdate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service),
):
    """Update customer contact details."""
    # Fetch existing customer to compare assignments
    try:
        existing_cust = service.get_customer(cust_id)
        prev_assigned = existing_cust.get("assigned_to") or existing_cust.get("assigned_to_email")
    except Exception:
        existing_cust = None
        prev_assigned = None

    updated = service.update_customer(cust_id, data)
    update_dict = data.model_dump(exclude_none=True)
    
    new_assigned = update_dict.get("assigned_to") or update_dict.get("assigned_to_email")

    if new_assigned and new_assigned != prev_assigned:
        action = "CUSTOMER_ASSIGNED" if not prev_assigned else "CUSTOMER_REASSIGNED"
        desc = f"Customer {cust_id} {action.lower().replace('_', ' ')} to {new_assigned}"
        prev_val = {"assigned_to": prev_assigned}
        new_val = {"assigned_to": new_assigned}
    else:
        action = "CUSTOMER_UPDATED"
        desc = f"Customer {cust_id} updated"
        prev_val = {"details": {k: existing_cust.get(k) for k in update_dict.keys() if existing_cust} if existing_cust else None}
        new_val = update_dict

    create_audit_log(
        action, "crm.customers", user_payload,
        entity_id=cust_id, module="Customer",
        description=desc,
        previous_value=prev_val,
        new_value=new_val,
    )
    return StandardResponse.success_response(
        data=updated,
        message="Customer updated successfully",
    )


@router.delete("/customers/{cust_id}", response_model=StandardResponse)
async def delete_customer(
    cust_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service),
):
    """Delete a customer account record from crm.customers."""
    service.delete_customer(cust_id)
    create_audit_log(
        "CUSTOMER_DELETED", "crm.customers", user_payload,
        entity_id=cust_id, module="Customer",
        description=f"Customer {cust_id} deleted",
    )
    return StandardResponse.success_response(
        data={"deleted_id": cust_id},
        message="Customer deleted successfully",
    )

from pydantic import BaseModel
from typing import List, Optional

class BulkReassignCustomersPayload(BaseModel):
    customer_ids: List[str]
    new_employee_id: str
    reassignment_reason: Optional[str] = "CEO Bulk Reassignment"

@router.post("/customers/reassign", response_model=StandardResponse)
async def reassign_customers(
    payload: BulkReassignCustomersPayload,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service)
):
    from app.core.scoping import normalize_user_role
    role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role") or "")
    if role not in ("admin", "super_admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only Admin can perform bulk reassignment.")

    try:
        success_count, updated_customers = service.bulk_reassign_customers(
            customer_ids=payload.customer_ids,
            new_employee_id=payload.new_employee_id,
            reassigned_by=user_payload.get("name") or user_payload.get("email") or "Admin",
            reason=payload.reassignment_reason
        )
        if success_count == 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail="No customers were updated in the database. Check the customer IDs and try again.")
        return StandardResponse.success_response(
            data={"reassigned_count": success_count, "updated_customers": updated_customers},
            message=f"Successfully reassigned {success_count} customers."
        )
    except Exception as e:
        from fastapi import HTTPException
        # Propagate actual exception details cleanly with CORS headers
        raise HTTPException(status_code=500, detail=f"Database or service error: {str(e)}")
