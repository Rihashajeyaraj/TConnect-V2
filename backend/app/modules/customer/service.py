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

    def list_customers(self, user_payload: Dict[str, Any] = None, page: int = None, limit: int = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_customers(user_payload, page=page, limit=limit)

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
        is_inactive = str(new_emp.get("status") or "").lower() in ("inactive", "deactivated", "terminated", "disabled", "resigned", "left")
        is_not_active = new_emp.get("is_active") is False
        if is_inactive or is_not_active:
            raise Exception("Cannot reassign to an inactive or resigned employee.")

        # Log and verify inputs
        logger.info(f"[REASSIGN CUSTOMER START] IDs: {customer_ids}, Target Emp ID: {new_employee_id}, Reassigned By: {reassigned_by}, Reason: {reason}")
        
        success_count = 0
        updated_customers = []
        for cust_id in customer_ids:
            try:
                # 1. Try to find the customer using 4 combinations of schema + key
                cust = None
                schema_used = None
                key_used = None

                # Option 1: crm.customers with customer_id
                try:
                    res = sp.schema("crm").table("customers").select("*").eq("customer_id", cust_id).execute()
                    if res.data and len(res.data) > 0:
                        cust = res.data[0]
                        schema_used = "crm"
                        key_used = "customer_id"
                except Exception:
                    pass

                # Option 2: crm.customers with id
                if not cust:
                    try:
                        res = sp.schema("crm").table("customers").select("*").eq("id", cust_id).execute()
                        if res.data and len(res.data) > 0:
                            cust = res.data[0]
                            schema_used = "crm"
                            key_used = "id"
                    except Exception:
                        pass

                # Option 3: public.customers with customer_id
                if not cust:
                    try:
                        res = sp.table("customers").select("*").eq("customer_id", cust_id).execute()
                        if res.data and len(res.data) > 0:
                            cust = res.data[0]
                            schema_used = "public"
                            key_used = "customer_id"
                    except Exception:
                        pass

                # Option 4: public.customers with id
                if not cust:
                    try:
                        res = sp.table("customers").select("*").eq("id", cust_id).execute()
                        if res.data and len(res.data) > 0:
                            cust = res.data[0]
                            schema_used = "public"
                            key_used = "id"
                    except Exception:
                        pass

                if not cust:
                    logger.warning(f"Customer {cust_id} not found in any schema/key combination, skipping.")
                    continue

                orig_owner = cust.get("original_owner") or cust.get("sales_executive") or None
                prev_owner = cust.get("sales_executive") or None

                new_name = new_emp.get("name") or new_emp.get("full_name") or None
                new_mgr_name = new_emp.get("reporting_manager_name") or "Direct/Unassigned"
                new_uid = new_emp.get("user_id") or new_emp.get("id") or new_emp.get("employee_id")

                cust_update = {
                    "sales_executive": new_name,
                    "sales_manager": new_mgr_name,
                    "original_owner": orig_owner,
                    "previous_owner": prev_owner,
                    "current_owner": new_name,
                    "reassigned_by": reassigned_by,
                    "reassigned_at": datetime.now(timezone.utc).isoformat(),
                    "reassignment_reason": reason
                }

                # Dynamically filter out columns that do not exist in the selected customer table
                cust_update = {k: v for k, v in cust_update.items() if k in cust}

                # Perform the UPDATE on the exact schema and key that found the record
                if schema_used == "crm":
                    upd_res = sp.schema("crm").table("customers").update(cust_update).eq(key_used, cust_id).execute()
                else:
                    upd_res = sp.table("customers").update(cust_update).eq(key_used, cust_id).execute()

                # Step 5 — Verify immediately after UPDATE
                if upd_res.data and len(upd_res.data) > 0:
                    # Query again using exact same verified combination
                    if schema_used == "crm":
                        verify_res = sp.schema("crm").table("customers").select("*").eq(key_used, cust_id).execute()
                    else:
                        verify_res = sp.table("customers").select("*").eq(key_used, cust_id).execute()
                    
                    if verify_res.data and len(verify_res.data) > 0:
                        verified_cust = verify_res.data[0]
                        curr_exec = verified_cust.get("sales_executive")
                        if curr_exec == new_name:
                            success_count += 1
                            updated_customers.append(verified_cust)
                            logger.info(f"[REASSIGN CUSTOMER SUCCESS] Customer {cust_id} reassigned to {new_name} via {schema_used}.customers.{key_used}. Verified.")
                        else:
                            logger.error(f"[REASSIGN CUSTOMER VERIFICATION FAILED] Customer {cust_id} DB value after update was '{curr_exec}' instead of '{new_name}'")
                    else:
                        logger.error(f"[REASSIGN CUSTOMER VERIFICATION FAILED] Customer {cust_id} could not be read back after update.")
                else:
                    logger.error(f"DB UPDATE for customer {cust_id} in {schema_used}.customers returned no rows. Payload: {cust_update}")

                # Also update the associated lead so the customer directory resolves correctly
                lead_id = cust.get("lead_id")
                if lead_id:
                    try:
                        new_email = new_emp.get("email") or None
                        new_emp_code = new_emp.get("employee_code") or new_emp.get("employee_id") or None
                        
                        # Find which schema the lead is in using sequential checks (avoiding .or_())
                        lead_schema = None
                        lead_key = None
                        lead_row = None
                        
                        # Check crm.leads.lead_id
                        try:
                            lead_check = sp.schema("crm").table("leads").select("*").eq("lead_id", lead_id).execute()
                            if lead_check.data and len(lead_check.data) > 0:
                                lead_row = lead_check.data[0]
                                lead_schema = "crm"
                                lead_key = "lead_id"
                        except Exception:
                            pass
                        
                        # Check crm.leads.id
                        if not lead_schema:
                            try:
                                lead_check = sp.schema("crm").table("leads").select("*").eq("id", lead_id).execute()
                                if lead_check.data and len(lead_check.data) > 0:
                                    lead_row = lead_check.data[0]
                                    lead_schema = "crm"
                                    lead_key = "id"
                            except Exception:
                                pass
                        
                        # Check public.leads.lead_id
                        if not lead_schema:
                            try:
                                lead_check = sp.table("leads").select("*").eq("lead_id", lead_id).execute()
                                if lead_check.data and len(lead_check.data) > 0:
                                    lead_row = lead_check.data[0]
                                    lead_schema = "public"
                                    lead_key = "lead_id"
                            except Exception:
                                pass
                        
                        # Check public.leads.id
                        if not lead_schema:
                            try:
                                lead_check = sp.table("leads").select("*").eq("id", lead_id).execute()
                                if lead_check.data and len(lead_check.data) > 0:
                                    lead_row = lead_check.data[0]
                                    lead_schema = "public"
                                    lead_key = "id"
                            except Exception:
                                pass
                            
                        if lead_schema and lead_row:
                            # Validate UUID format for associated lead's assigned_to column
                            assigned_to_val = new_uid if (new_uid and len(str(new_uid)) == 36 and "-" in str(new_uid)) else None
                            
                            lead_payload = {
                                "assigned_to": assigned_to_val,
                                "assigned_to_email": new_email,
                                "employee_code": new_emp_code,
                                "sales_manager": new_mgr_name,
                                "original_owner": orig_owner,
                                "previous_owner": prev_owner,
                                "current_owner": new_name,
                                "reassigned_by": reassigned_by,
                                "reassigned_at": datetime.now(timezone.utc).isoformat(),
                                "reassignment_reason": reason
                            }
                            # Filter lead payload to only include columns that exist in the lead row
                            lead_payload = {k: v for k, v in lead_payload.items() if k in lead_row}

                            if lead_schema == "crm":
                                sp.schema("crm").table("leads").update(lead_payload).eq(lead_key, lead_id).execute()
                            else:
                                sp.table("leads").update(lead_payload).eq(lead_key, lead_id).execute()
                            logger.info(f"[REASSIGN CUSTOMER - ASSOCIATED LEAD SUCCESS] Lead {lead_id} updated in {lead_schema}.leads via {lead_key}.")
                        else:
                            logger.warning(f"[REASSIGN CUSTOMER - ASSOCIATED LEAD NOT FOUND] Lead {lead_id} not found in DB.")
                    except Exception as e_lead:
                        logger.warning(f"Failed to update associated lead {lead_id} for customer {cust_id}: {e_lead}")

            except Exception as e:
                logger.error(f"Failed to reassign customer {cust_id}: {e}")
                raise e

        logger.info(f"[REASSIGN CUSTOMER END] Success Count: {success_count}/{len(customer_ids)}")
        return success_count, updated_customers

