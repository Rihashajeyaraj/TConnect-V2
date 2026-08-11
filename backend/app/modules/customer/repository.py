from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_customers: List[Dict[str, Any]] = []


def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


class CustomerRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_customers(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
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
                        if lid and is_valid_uuid(lid):
                            try:
                                lead_res = self.supabase.schema("crm").table("leads").select(
                                    "company_name,contact_person,mobile,email,city,category,assigned_to"
                                ).eq("lead_id", str(lid)).single().execute()
                                if lead_res.data:
                                    ld = lead_res.data
                                    row["name"] = row.get("name") or ld.get("company_name")
                                    row["company"] = row.get("company") or ld.get("company_name")
                                    row["person"] = row.get("person") or ld.get("contact_person")
                                    row["phone"] = row.get("phone") or ld.get("mobile")
                                    row["email"] = row.get("email") or ld.get("email")
                                    row["city"] = row.get("city") or ld.get("city")
                                    row["leadNumber"] = row.get("leadNumber") or str(lid)[:8].upper()
                                    row["assigned_to"] = row.get("assigned_to") or ld.get("assigned_to")
                            except Exception:
                                pass
                        row.setdefault("status", "Active Customer")
                        enriched.append(row)
                    fetched_customers = enriched
                    break
            except Exception as e:
                logger.debug(f"Customers fetch attempt in {schema_attempt} notice: {e}")

        if not fetched_customers:
            fetched_customers = list(_in_memory_customers)

        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            scoped = [c for c in fetched_customers if is_record_accessible(c, allowed)]
            return scoped if scoped else fetched_customers

        return fetched_customers

    def create_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Resolve valid lead_id
        raw_lead_id = data.get("lead_id") or data.get("leadId")
        valid_lead_id = None
        if raw_lead_id and is_valid_uuid(raw_lead_id):
            valid_lead_id = str(raw_lead_id)

        # 2. Check if a customer already exists for this lead_id
        if valid_lead_id:
            try:
                res_exist = self.supabase.schema("crm").table("customers").select("*").eq("lead_id", valid_lead_id).execute()
                if res_exist.data and len(res_exist.data) > 0:
                    existing_cust = res_exist.data[0]
                    # Update lead status to Converted to Customer in crm.leads if necessary
                    try:
                        from app.modules.crm.repository import CRMRepository
                        CRMRepository().update_lead(valid_lead_id, {
                            "status": "Converted to Customer",
                            "converted_to_customer_id": existing_cust.get("id") or existing_cust.get("customer_id")
                        })
                    except Exception as e_up:
                        logger.warning(f"Could not update lead status on duplicate customer check: {e_up}")

                    # Return the existing customer
                    result = dict(existing_cust)
                    result["id"] = result.get("customer_id") or result.get("id")
                    result["customer_id"] = result.get("customer_id") or result.get("id")
                    result["status"] = "Active Customer"
                    return result
            except Exception as e:
                logger.warning(f"Failed querying existing customer for lead_id {valid_lead_id}: {e}")

        # 3. Retrieve lead information from CRM repository if valid_lead_id is present
        lead_info = None
        if valid_lead_id:
            try:
                from app.modules.crm.repository import CRMRepository
                lead_info = CRMRepository().get_lead_by_id(valid_lead_id)
            except Exception as e:
                logger.warning(f"Failed fetching lead by id {valid_lead_id}: {e}")

        # 4. Extract fields defaulting to lead values if available (Required Mapping Rules)
        comp_name = data.get("company_name") or data.get("company") or data.get("name")
        if lead_info:
            comp_name = lead_info.get("company_name") or lead_info.get("company") or comp_name
        if not comp_name:
            comp_name = "Converted Client"

        person_name = data.get("contact_person") or data.get("person")
        if lead_info:
            person_name = lead_info.get("contact_person") or lead_info.get("contact_name") or lead_info.get("person") or person_name
        if not person_name:
            person_name = "Point of Contact"

        email_addr = data.get("email")
        if lead_info:
            email_addr = lead_info.get("email") or lead_info.get("contact_email") or email_addr

        phone_num = data.get("phone") or data.get("mobile")
        if lead_info:
            phone_num = lead_info.get("mobile") or lead_info.get("contact_phone") or phone_num

        city_name = data.get("city") or data.get("location")
        if lead_info:
            city_name = lead_info.get("city") or city_name
        if not city_name:
            city_name = "Chennai"

        address_val = data.get("address")
        if lead_info:
            address_val = lead_info.get("address") or address_val
        if not address_val:
            address_val = city_name

        assigned_to = data.get("assigned_to") or data.get("accountManager") or "Sales Executive"
        if lead_info:
            assigned_to = lead_info.get("assigned_to") or assigned_to

        # 5. Generate a NEW unique customer id
        customer_uuid = str(uuid.uuid4())

        notes_raw = str(data.get("notes") or data.get("reachOutReason") or data.get("onboardingRemarks") or f"Customer account for {comp_name}")
        full_notes = f"{notes_raw} | AssignedTo: {assigned_to}"

        # Standard payload matching Supabase crm.customers
        payload = {
            "id": customer_uuid,
            "customer_id": customer_uuid,
            "lead_id": valid_lead_id,
            "name": comp_name,
            "company": comp_name,
            "company_name": comp_name,
            "contact_person": person_name,
            "person": person_name,
            "phone": phone_num,
            "mobile": phone_num,
            "email": email_addr if email_addr else None,
            "city": city_name,
            "location": city_name,
            "address": address_val,
            "status": "Active Customer",
            "notes": full_notes,
            "is_active": True,
        }

        logger.info(f"[CUSTOMER INSERT] Saving into crm.customers: {payload}")

        inserted_row = None
        # Insert ONLY into crm.customers (do NOT insert into public.customers for CRM conversion)
        try:
            res = self.supabase.schema("crm").table("customers").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[CUSTOMER INSERT SUCCESS] Created in crm.customers: {res.data[0]}")
                inserted_row = res.data[0]
        except Exception as e1:
            logger.warning(f"crm.customers insert attempt 1 failed: {e1}")
            try:
                minimal_payload = {
                    "id": customer_uuid,
                    "customer_id": customer_uuid,
                    "lead_id": valid_lead_id,
                    "name": comp_name,
                    "company": comp_name,
                    "company_name": comp_name,
                    "contact_person": person_name,
                    "phone": phone_num,
                    "email": email_addr if email_addr else None,
                    "address": address_val,
                    "notes": full_notes,
                    "status": "Active Customer",
                    "is_active": True,
                }
                res_min = self.supabase.schema("crm").table("customers").insert(minimal_payload).execute()
                if res_min.data and len(res_min.data) > 0:
                    logger.info(f"[CUSTOMER INSERT SUCCESS] Created with minimal payload in crm.customers: {res_min.data[0]}")
                    inserted_row = res_min.data[0]
            except Exception as e2:
                logger.error(f"crm.customers fallback insert failed: {e2}")

        if not inserted_row:
            inserted_row = payload
            _in_memory_customers.append(payload)

        # 6. Update the lead status to Converted/Customer in crm.leads
        if valid_lead_id:
            try:
                from app.modules.crm.repository import CRMRepository
                CRMRepository().update_lead(valid_lead_id, {
                    "status": "Converted to Customer",
                    "converted_to_customer_id": customer_uuid
                })
            except Exception as e_up:
                logger.warning(f"Failed to update lead status on customer creation: {e_up}")

        # Enrich returned customer object
        result = dict(inserted_row)
        result["id"] = result.get("customer_id") or customer_uuid
        result["customer_id"] = result.get("customer_id") or customer_uuid
        result["name"] = comp_name
        result["company"] = comp_name
        result["person"] = person_name
        result["phone"] = phone_num
        result["email"] = email_addr
        result["city"] = city_name
        result["assigned_to"] = assigned_to
        result["accountManager"] = assigned_to
        result["status"] = "Active Customer"
        return result

    def get_customer_by_id(self, cust_id: str) -> Optional[Dict[str, Any]]:
        customers = self.get_all_customers()
        for cust in customers:
            if str(cust.get("id")) == str(cust_id) or str(cust.get("customer_id")) == str(cust_id):
                return cust
        return None

    def update_customer(self, cust_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        for payload in [updates, {k: v for k, v in updates.items() if v is not None}]:
            try:
                res = self.supabase.schema("crm").table("customers").update(payload).or_(f"id.eq.{cust_id},customer_id.eq.{cust_id}").execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                try:
                    res = self.supabase.table("customers").update(payload).or_(f"id.eq.{cust_id},customer_id.eq.{cust_id}").execute()
                    if res.data and len(res.data) > 0:
                        return res.data[0]
                except Exception as e:
                    logger.warning(f"Customer update attempt failed: {e}")

        for cust in _in_memory_customers:
            if str(cust.get("id")) == str(cust_id) or str(cust.get("customer_id")) == str(cust_id):
                cust.update(updates)
                return cust
        return updates

    def delete_customer(self, cust_id: str) -> bool:
        deleted = False
        # 1. Try deleting from crm.customers
        try:
            res1 = self.supabase.schema("crm").table("customers").delete().or_(f"id.eq.{cust_id},customer_id.eq.{cust_id}").execute()
            if res1.data and len(res1.data) > 0:
                deleted = True
                logger.info(f"[CUSTOMER DELETE] Deleted customer {cust_id} from crm.customers")
        except Exception as e:
            logger.debug(f"crm.customers delete notice: {e}")

        # 2. Try deleting from public.customers
        try:
            res2 = self.supabase.table("customers").delete().or_(f"id.eq.{cust_id},customer_id.eq.{cust_id}").execute()
            if res2.data and len(res2.data) > 0:
                deleted = True
                logger.info(f"[CUSTOMER DELETE] Deleted customer {cust_id} from public.customers")
        except Exception as e:
            logger.debug(f"public.customers delete notice: {e}")

        # 3. Clean up in-memory fallback
        global _in_memory_customers
        _in_memory_customers = [
            c for c in _in_memory_customers
            if str(c.get("id")) != str(cust_id) and str(c.get("customer_id")) != str(cust_id)
        ]
        return True

