from fastapi import APIRouter, Depends, status
from app.schemas.response import StandardResponse
from app.core.dependencies import get_current_user_payload
from app.modules.customer.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from app.modules.customer.service import CustomerService
from app.modules.customer.permissions import CanViewCustomers, CanManageCustomers

router = APIRouter(prefix="/customers", tags=["Customer Management"])


def get_service() -> CustomerService:
    return CustomerService()


@router.get("", response_model=StandardResponse)
async def list_customers(
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewCustomers),
    service: CustomerService = Depends(get_service)
):
    """List all customer accounts."""
    customers = service.list_customers()
    return StandardResponse.success_response(
        data=customers,
        message="Customers list retrieved successfully"
    )


@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanManageCustomers),
    service: CustomerService = Depends(get_service)
):
    """Create a new customer account."""
    cust = service.create_customer(data)
    return StandardResponse.success_response(
        data=cust,
        message="Customer created successfully"
    )


@router.get("/{cust_id}", response_model=StandardResponse)
async def get_customer(
    cust_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    rbac: None = Depends(CanViewCustomers),
    service: CustomerService = Depends(get_service)
):
    """Get customer details by ID."""
    cust = service.get_customer(cust_id)
    return StandardResponse.success_response(
        data=cust,
        message="Customer details retrieved successfully"
    )
