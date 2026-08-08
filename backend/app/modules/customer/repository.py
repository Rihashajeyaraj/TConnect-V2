from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_customers: List[Dict[str, Any]] = []


class CustomerRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_customers(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()
        user_name = str((user_payload or {}).get("name") or "").strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")

        fetched_customers = []
        for schema_attempt in ["crm", "public"]:
            try:
                if schema_attempt == "crm":
                    res = self.supabase.schema("crm").table("customers").select("*").execute()
                else:
                    res = self.supabase.table("customers").select("*").execute()

                if res.data is not None and len(res.data) > 0:
                    enriched = []
                    for c in res.data:
                        row = dict(c)
                        lid = row.get("lead_id")
                        if lid:
                            try:
                                lead_res = self.supabase.schema("crm").table("leads").select(
                                    "company_name,contact_person,mobile,email,city,category,assigned_to"
                                ).eq("lead_id", lid).single().execute()
                                if lead_res.data:
                                    ld = lead_res.data
                                    row["name"] = row.get("name") or ld.get("company_name")
                                    row["company"] = row.get("company") or ld.get("company_name")
                                    row["person"] = row.get("person") or ld.get("contact_person")
                                    row["phone"] = row.get("phone") or ld.get("mobile")
                                    row["email"] = row.get("email") or ld.get("email")
                                    row["city"] = row.get("city") or ld.get("city")
                                    row["leadNumber"] = row.get("leadNumber") or lid
                                    row["assigned_to"] = row.get("assigned_to") or ld.get("assigned_to")
                            except Exception:
                                pass
                        row.setdefault("status", "Active Customer")
                        enriched.append(row)
                    fetched_customers = enriched
                    break
            except Exception as e:
                logger.debug(f"Customers fetch attempt in {schema_attempt} notice: {e}")
                logger.warning(f"get_all_customers attempt '{attempt}' failed: {e}")

        if not fetched_customers:
            fetched_customers = _in_memory_customers

        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            fetched_customers = [c for c in fetched_customers if is_record_accessible(c, allowed)]

        return fetched_customers

    def create_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        customer_id = data.get("id") or data.get("customer_id") or str(uuid.uuid4())
        lead_id = data.get("lead_id")

        comp_name = data.get("name") or data.get("company") or data.get("company_name") or data.get("account_name") or "Converted Client"
        person_name = data.get("person") or data.get("contact_person") or data.get("contactPerson") or "Point of Contact"
        phone_num = data.get("phone") or data.get("mobile") or ""
        email_addr = data.get("email") or ""
        city_name = data.get("city") or data.get("address") or "Chennai"
        assigned_to = data.get("assigned_to") or data.get("accountManager") or "Sales Executive"
        assigned_email = data.get("assigned_to_email") or data.get("email") or ""

        # Resolve user's reporting manager email
        mgr_email = str(data.get("reporting_manager_email") or "").lower().strip()
        if not mgr_email and assigned_email:
            try:
                from app.modules.users.repository import UserRepository
                all_u = UserRepository().get_all_users()
                for u in all_u:
                    e_mail = str(u.get("email") or "").lower().strip()
                    if e_mail == assigned_email.lower().strip():
                        mgr_email = str(u.get("reporting_manager_email") or "").lower().strip()
                        break
            except Exception:
                pass

        if not lead_id or len(str(lead_id)) != 36:
            try:
                from app.modules.crm.repository import CRMRepository
                crm_repo = CRMRepository()
                new_lead = crm_repo.create_lead({
                    "company_name": comp_name,
                    "contact_person": person_name,
                    "mobile": phone_num,
                    "email": email_addr,
                    "city": city_name,
                    "assigned_to": assigned_to,
                    "assigned_to_email": assigned_email,
                    "notes": f"Precursor lead auto-created for customer '{comp_name}'"
                })
                lead_id = new_lead.get("lead_id") or new_lead.get("id")
            except Exception as e:
                logger.warning(f"Could not auto-create precursor lead for customer: {e}")

        notes_raw = str(data.get("notes") or data.get("reachOutReason") or data.get("onboardingRemarks") or f"Customer account for {comp_name}")
        full_notes = f"{notes_raw} | AssignedTo: {assigned_to} | Email: {assigned_email} | Manager: {mgr_email}"

        payload = {
            "customer_id": customer_id,
            "lead_id": lead_id,
            "billing_address": data.get("billing_address") or data.get("address") or city_name,
            "shipping_address": data.get("shipping_address") or data.get("address") or city_name,
            "notes": full_notes,
            "is_active": True,
        }
        if data.get("gstin_tax_id") or data.get("gstin"):
            payload["gstin_tax_id"] = str(data.get("gstin_tax_id") or data.get("gstin"))

        logger.info(f"[CUSTOMER INSERT REQUEST] Inserting into crm.customers with payload: {payload}")

        inserted_row = None
        # 1. Primary: crm.customers
        try:
            res = self.supabase.schema("crm").table("customers").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[CUSTOMER INSERT SUCCESS] Customer created in crm.customers: {res.data[0]}")
                inserted_row = res.data[0]
        except Exception as e:
            logger.debug(f"crm.customers insert notice: {e}")

        # 2. Fallback: public.customers
        if not inserted_row:
            try:
                res = self.supabase.table("customers").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"[CUSTOMER INSERT SUCCESS] Customer created in public.customers: {res.data[0]}")
                    inserted_row = res.data[0]
            except Exception as e:
                logger.error(f"Error creating customer in public.customers: {e}")

        if not inserted_row:
            payload["id"] = customer_id
            inserted_row = payload
            _in_memory_customers.append(payload)

        # Enrich returned customer dict for frontend & APIs
        result = dict(inserted_row)
        result["id"] = result.get("customer_id") or customer_id
        result["name"] = comp_name
        result["company"] = comp_name
        result["person"] = person_name
        result["phone"] = phone_num
        result["email"] = email_addr
        result["city"] = city_name
        result["assigned_to"] = assigned_to
        result["accountManager"] = assigned_to
        return result

    def get_customer_by_id(self, cust_id: str) -> Optional[Dict[str, Any]]:
        customers = self.get_all_customers()
        for cust in customers:
            if str(cust.get("id")) == str(cust_id):
                return cust
        return None

    def update_customer(self, cust_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        for payload in [updates, {k: v for k, v in updates.items() if v is not None}]:
            try:
                res = self.helper.table(SchemaEnum.CUSTOMER, "accounts").update(payload).eq("id", cust_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                try:
                    res = self.supabase.table("customers").update(payload).eq("id", cust_id).execute()
                    if res.data and len(res.data) > 0:
                        return res.data[0]
                except Exception as e:
                    logger.warning(f"Customer update attempt failed: {e}")

        for cust in _in_memory_customers:
            if str(cust.get("id")) == str(cust_id):
                cust.update(updates)
                return cust
        return updates

