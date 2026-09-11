from typing import List, Dict, Any
from app.modules.crm.repository import CRMRepository
from app.modules.crm.schemas import LeadCreate, LeadUpdate
from app.exceptions.base import NotFoundException
from app.core.scoping import enforce_record_access, normalize_user_role


class CRMService:
    def __init__(self, repo: CRMRepository = None):
        self.repo = repo or CRMRepository()

    def list_leads(self, user_payload: Dict[str, Any] = None, page: int = None, limit: int = None) -> List[Dict[str, Any]]:
        return self.repo.get_all_leads(user_payload, page=page, limit=limit)

    def create_lead(self, data: LeadCreate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        payload = data.model_dump(exclude_unset=False)
        if not payload.get("status"):
            payload["status"] = "New"

        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_name = str((user_payload or {}).get("name") or (user_payload or {}).get("full_name") or "")
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "")
        user_role = normalize_user_role((user_payload or {}).get("role"))

        # Sales Executives can ONLY create leads assigned to themselves
        if user_role == "sales_executive" or not payload.get("assigned_to"):
            if user_name:
                payload["assigned_to"] = user_name
            if user_email:
                payload["assigned_to_email"] = user_email
            if user_emp_code:
                payload["employee_code"] = user_emp_code

        if user_email and not payload.get("assigned_to_email"):
            payload["assigned_to_email"] = user_email
        if user_name and not payload.get("assigned_to"):
            payload["assigned_to"] = user_name
        if user_emp_code and not payload.get("employee_code"):
            payload["employee_code"] = user_emp_code

        payload["created_by_email"] = user_email
        return self.repo.create_lead(payload, user_payload)

    def get_lead(self, lead_id: str, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        lead = self.repo.get_lead_by_id(lead_id)
        if not lead:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        if user_payload:
            enforce_record_access(lead, user_payload, "lead")
        return lead

    def update_lead(self, lead_id: str, data: LeadUpdate, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        existing = self.repo.get_lead_by_id(lead_id)
        if not existing:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "lead")

        payload = data.model_dump(exclude_unset=True)
        return self.repo.update_lead(lead_id, payload)

    def get_team_leads(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.get_team_leads(user_payload, params)

    def list_followups(self, user_payload: Dict[str, Any] = None, active_only: bool = True) -> List[Dict[str, Any]]:
        return self.repo.get_all_followups(user_payload, active_only=active_only)

    def create_followup(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        return self.repo.create_followup(data, user_payload)

    def update_followup(self, followup_id: str, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        existing = self.repo.get_followup_by_id(followup_id)
        if not existing:
            raise NotFoundException(resource="Follow-up", identifier=followup_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "follow-up")

        return self.repo.update_followup(followup_id, data)

    def delete_followup(self, followup_id: str, user_payload: Dict[str, Any] = None) -> bool:
        existing = self.repo.get_followup_by_id(followup_id)
        if not existing:
            raise NotFoundException(resource="Follow-up", identifier=followup_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "follow-up")

        return self.repo.delete_followup(followup_id)

    def delete_lead(self, lead_id: str, user_payload: Dict[str, Any] = None) -> bool:
        existing = self.repo.get_lead_by_id(lead_id)
        if not existing:
            raise NotFoundException(resource="Lead", identifier=lead_id)
        if user_payload:
            enforce_record_access(existing, user_payload, "lead")

        return self.repo.delete_lead(lead_id)

    def search_contacts(self, query: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        return self.repo.search_contacts(query, user_payload)

    def unassign_employee_records(self, employee: dict):
        import logging
        logger = logging.getLogger("TwiteConnect Backend")
        from datetime import datetime, timezone

        emp_email = str(employee.get("email") or "").lower().strip()
        emp_name = str(employee.get("name") or "").strip()
        emp_code = str(employee.get("employee_code") or "").strip()
        emp_role = str(employee.get("role") or "").lower().strip()

        from app.database.supabase import get_supabase_admin_client
        sp = get_supabase_admin_client()
        if not sp:
            logger.warning("Unassign employee records failed: Supabase admin client not initialized")
            return

        if "manager" in emp_role:
            # Sales Manager deactivated: nullify manager fields
            if emp_name:
                try:
                    # Update Leads
                    sp.schema("crm").table("leads").update({"sales_manager": None}).eq("sales_manager", emp_name).execute()
                    # Update Customers
                    sp.schema("crm").table("customers").update({"sales_manager": None}).eq("sales_manager", emp_name).execute()
                    logger.info(f"✅ Nullified manager records for deactivated manager: {emp_name}")
                except Exception as e:
                    logger.warning(f"Unassigning manager records failed: {e}")
        else:
            # Sales Executive deactivated: nullify executive fields and track history
            # Update Leads
            try:
                q = sp.schema("crm").table("leads").select("id, assigned_to, original_owner")
                if emp_email:
                    q = q.eq("assigned_to_email", emp_email)
                elif emp_code:
                    q = q.eq("employee_code", emp_code)
                elif emp_name:
                    q = q.eq("assigned_to", emp_name)
                else:
                    return

                res = q.execute()
                if res.data:
                    for lead in res.data:
                        lead_id = lead["id"]
                        orig_owner = lead.get("original_owner") or lead.get("assigned_to") or emp_name
                        sp.schema("crm").table("leads").update({
                            "previous_owner": lead.get("assigned_to") or emp_name,
                            "original_owner": orig_owner,
                            "current_owner": None,
                            "assigned_to": None,
                            "assigned_to_email": None,
                            "employee_code": None,
                            "reassigned_at": datetime.now(timezone.utc).isoformat(),
                            "reassignment_reason": "Employee Deactivation"
                        }).eq("id", lead_id).execute()
                    logger.info(f"✅ Unassigned {len(res.data)} leads owned by deactivated executive: {emp_name}")
            except Exception as e:
                logger.warning(f"Unassigning executive leads failed: {e}")

            # Update Customers
            try:
                q = sp.schema("crm").table("customers").select("id", "sales_executive", "original_owner")
                if emp_name:
                    q = q.eq("sales_executive", emp_name)
                else:
                    return

                res = q.execute()
                if res.data:
                    for cust in res.data:
                        cust_id = cust["id"]
                        orig_owner = cust.get("original_owner") or cust.get("sales_executive") or emp_name
                        sp.schema("crm").table("customers").update({
                            "previous_owner": cust.get("sales_executive") or emp_name,
                            "original_owner": orig_owner,
                            "current_owner": None,
                            "sales_executive": None,
                            "reassigned_at": datetime.now(timezone.utc).isoformat(),
                            "reassignment_reason": "Employee Deactivation"
                        }).eq("id", cust_id).execute()
                    logger.info(f"✅ Unassigned {len(res.data)} customers owned by deactivated executive: {emp_name}")
            except Exception as e:
                logger.warning(f"Unassigning executive customers failed: {e}")

    def bulk_reassign_leads(self, lead_ids: list, new_employee_id: str, reassigned_by: str, reason: str) -> int:
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
        logger.info(f"[REASSIGN LEAD START] IDs: {lead_ids}, Target Emp ID: {new_employee_id}, Reassigned By: {reassigned_by}, Reason: {reason}")
        
        success_count = 0
        updated_leads = []
        for lead_id in lead_ids:
            try:
                # 1. Try to find the lead using 4 combinations of schema + key
                lead = None
                schema_used = None
                key_used = None

                # Option 1: crm.leads with lead_id
                try:
                    res = sp.schema("crm").table("leads").select("*").eq("lead_id", lead_id).execute()
                    if res.data and len(res.data) > 0:
                        lead = res.data[0]
                        schema_used = "crm"
                        key_used = "lead_id"
                except Exception:
                    pass

                # Option 2: crm.leads with id
                if not lead:
                    try:
                        res = sp.schema("crm").table("leads").select("*").eq("id", lead_id).execute()
                        if res.data and len(res.data) > 0:
                            lead = res.data[0]
                            schema_used = "crm"
                            key_used = "id"
                    except Exception:
                        pass

                # Option 3: public.leads with lead_id
                if not lead:
                    try:
                        res = sp.table("leads").select("*").eq("lead_id", lead_id).execute()
                        if res.data and len(res.data) > 0:
                            lead = res.data[0]
                            schema_used = "public"
                            key_used = "lead_id"
                    except Exception:
                        pass

                # Option 4: public.leads with id
                if not lead:
                    try:
                        res = sp.table("leads").select("*").eq("id", lead_id).execute()
                        if res.data and len(res.data) > 0:
                            lead = res.data[0]
                            schema_used = "public"
                            key_used = "id"
                    except Exception:
                        pass

                if not lead:
                    logger.warning(f"Lead {lead_id} not found in any schema/key combination, skipping.")
                    continue

                # Store original owner name if not set (no "—" strings to avoid UUID cast errors)
                orig_owner = lead.get("original_owner") or lead.get("assigned_to_name") or lead.get("assigned_to") or None
                prev_owner = lead.get("current_owner") or lead.get("assigned_to") or None

                # Resolve the new employee's identifier fields
                new_uid = new_emp.get("user_id") or new_emp.get("id") or new_emp.get("employee_id")
                new_name = new_emp.get("name") or new_emp.get("full_name") or None
                new_email = new_emp.get("email") or None
                new_emp_code = new_emp.get("employee_code") or new_emp.get("employee_id") or None
                new_mgr_name = new_emp.get("reporting_manager_name") or "Direct/Unassigned"

                # Validate UUID format for assigned_to column
                assigned_to_val = new_uid if (new_uid and len(str(new_uid)) == 36 and "-" in str(new_uid)) else None

                update_payload = {
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

                # Dynamically filter out columns that do not exist in the selected database table
                update_payload = {k: v for k, v in update_payload.items() if k in lead}

                # Perform the UPDATE on the exact schema and key that found the record
                if schema_used == "crm":
                    upd_res = sp.schema("crm").table("leads").update(update_payload).eq(key_used, lead_id).execute()
                else:
                    upd_res = sp.table("leads").update(update_payload).eq(key_used, lead_id).execute()

                # Step 5 — Verify immediately after UPDATE
                if upd_res.data and len(upd_res.data) > 0:
                    # Query again using exact same verified combination
                    if schema_used == "crm":
                        verify_res = sp.schema("crm").table("leads").select("*").eq(key_used, lead_id).execute()
                    else:
                        verify_res = sp.table("leads").select("*").eq(key_used, lead_id).execute()
                    
                    if verify_res.data and len(verify_res.data) > 0:
                        verified_lead = verify_res.data[0]
                        # Verify the current Sales Executive matches the new employee name or UUID
                        curr_exec = verified_lead.get("assigned_to")
                        if curr_exec == new_name or curr_exec == new_uid or (assigned_to_val and curr_exec == assigned_to_val):
                            success_count += 1
                            updated_leads.append(verified_lead)
                            logger.info(f"[REASSIGN LEAD SUCCESS] Lead {lead_id} reassigned to {new_name} via {schema_used}.leads.{key_used}. Verified.")
                        else:
                            logger.error(f"[REASSIGN LEAD VERIFICATION FAILED] Lead {lead_id} DB value after update was '{curr_exec}' instead of '{new_name}'/'{new_uid}'")
                    else:
                        logger.error(f"[REASSIGN LEAD VERIFICATION FAILED] Lead {lead_id} could not be read back after update.")
                else:
                    logger.error(f"DB UPDATE for lead {lead_id} returned no rows. Schema: {schema_used}, Key: {key_used}")
            except Exception as e:
                logger.error(f"Failed to reassign lead {lead_id}: {e}")
                raise e

        logger.info(f"[REASSIGN LEAD END] Success Count: {success_count}/{len(lead_ids)}")
        return success_count, updated_leads

