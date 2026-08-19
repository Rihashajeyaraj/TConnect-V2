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

    def bulk_reassign_customers(self, customer_ids: list, new_employee_id: str, reassigned_by: str, reason: str) -> int:
        import logging
        logger = logging.getLogger("TwiteConnect Backend")
        from datetime import datetime, timezone
        from app.modules.hrms.repository import HRMSRepository
        from app.database.supabase import get_supabase_admin_client

        sp = get_supabase_admin_client()
        new_emp = HRMSRepository().get_employee_by_id(new_employee_id)
        if not new_emp:
            raise NotFoundException(resource="Employee", identifier=new_employee_id)

        # Check if active
        is_inactive = str(new_emp.get("status") or "").lower() in ("inactive", "deactivated", "terminated", "disabled")
        is_not_active = new_emp.get("is_active") is False
        if is_inactive or is_not_active:
            raise Exception("Cannot assign customers to a deactivated employee.")

        success_count = 0
        for cust_id in customer_ids:
            try:
                res = sp.schema("crm").table("customers").select("*").or_(f"id.eq.{cust_id},customer_id.eq.{cust_id}").execute()
                if res.data:
                    cust = res.data[0]
                    orig_owner = cust.get("original_owner") or cust.get("sales_executive") or "—"
                    
                    sp.schema("crm").table("customers").update({
                        "sales_executive": new_emp.get("name"),
                        "original_owner": orig_owner,
                        "previous_owner": cust.get("sales_executive"),
                        "current_owner": new_emp.get("name"),
                        "reassigned_by": reassigned_by,
                        "reassigned_at": datetime.now(timezone.utc).isoformat(),
                        "reassignment_reason": reason
                    }).eq("id", cust.get("id")).execute()
                    success_count += 1
            except Exception as e:
                logger.error(f"Failed to reassign customer {cust_id}: {e}")
        return success_count
