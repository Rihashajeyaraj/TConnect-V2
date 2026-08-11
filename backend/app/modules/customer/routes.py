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
    updated = service.update_customer(cust_id, data)
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
    return StandardResponse.success_response(
        data={"deleted_id": cust_id},
        message="Customer deleted successfully",
    )
