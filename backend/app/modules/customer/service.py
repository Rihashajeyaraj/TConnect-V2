from typing import List, Dict, Any, Optional
from app.modules.customer.repository import CustomerRepository
from app.modules.customer.schemas import CustomerCreate, CustomerUpdate
from app.modules.customer.conversion_service import CustomerConversionService
from app.exceptions.base import NotFoundException


class CustomerService:
    def __init__(
        self,
        repo: CustomerRepository = None,
        conversion: CustomerConversionService = None,
    ):
        self.repo = repo or CustomerRepository()
        self.conversion = conversion or CustomerConversionService()

    # ── Existing CRUD ──────────────────────────────────────────────────────

    def list_customers(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_customers(user_payload)

    def create_customer(self, data: CustomerCreate) -> Dict[str, Any]:
        """Direct Add flow — delegates to centralized conversion service."""
        payload = data.model_dump()
        return self.conversion.convert_to_customer(
            source="direct",
            source_id=None,
            extra_data=payload,
            user_payload={},
        )

    def get_customer(self, cust_id: str) -> Dict[str, Any]:
        cust = self.repo.get_customer_by_id(cust_id)
        if not cust:
            raise NotFoundException(resource="Customer", identifier=cust_id)
        return cust

    def update_customer(self, cust_id: str, data: CustomerUpdate) -> Dict[str, Any]:
        payload = data.model_dump(exclude_unset=True)
        return self.repo.update_customer(cust_id, payload)

    def delete_customer(self, cust_id: str) -> bool:
        return self.repo.delete_customer(cust_id)

    # ── Centralized Conversion ─────────────────────────────────────────────

    def convert_lead_to_customer(
        self,
        lead_id: str,
        extra_data: Dict[str, Any],
        user_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Lead → Customer via centralized service."""
        return self.conversion.convert_to_customer(
            source="lead",
            source_id=lead_id,
            extra_data=extra_data,
            user_payload=user_payload,
        )

    def convert_followup_to_customer(
        self,
        followup_id: str,
        extra_data: Dict[str, Any],
        user_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Follow-up → Customer via centralized service."""
        return self.conversion.convert_to_customer(
            source="followup",
            source_id=followup_id,
            extra_data=extra_data,
            user_payload=user_payload,
        )

    def convert_visit_to_customer(
        self,
        visit_id: str,
        extra_data: Dict[str, Any],
        user_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Visit → Customer via centralized service."""
        return self.conversion.convert_to_customer(
            source="visit",
            source_id=visit_id,
            extra_data=extra_data,
            user_payload=user_payload,
        )
