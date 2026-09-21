from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_customers: List[Dict[str, Any]] = []
_CUSTOMERS_CACHE: Optional[List[Dict[str, Any]]] = None
_CUSTOMERS_CACHE_TIMESTAMP: float = 0.0
_CUSTOMERS_CACHE_TTL: float = 30.0


def _clear_customers_cache():
    global _CUSTOMERS_CACHE, _CUSTOMERS_CACHE_TIMESTAMP
    _CUSTOMERS_CACHE = None
    _CUSTOMERS_CACHE_TIMESTAMP = 0.0


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

    def get_all_customers(self, user_payload: Dict[str, Any] = None, page: Optional[int] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)

        # ── P1 True DB Pagination & SQL Security Scoping Path ──
        if page is not None and limit is not None and page > 0 and limit > 0:
            limit = min(limit, 100)
            offset = (page - 1) * limit
            customers = []
            cols = "id, name, company, person, phone, email, city, lead_id, contract_value, status, created_by, assigned_to, assigned_to_email, created_at, updated_at"
            for schema_attempt in ["crm", "public"]:
                try:
                    q = self.supabase.schema(schema_attempt).table("customers").select(cols) if schema_attempt != "public" else self.supabase.table("customers").select(cols)
                    if allowed is not None:
                        conds = []
                        if allowed.get("emails"):
                            em_list = [f'"{e}"' for e in allowed["emails"] if e]
                            if em_list:
                                conds.append(f"assigned_to_email.in.({','.join(em_list)})")
                        if allowed.get("ids"):
                            id_list = [f'"{i}"' for i in allowed["ids"] if i]
                            if id_list:
                                conds.append(f"created_by.in.({','.join(id_list)})")
                        if conds:
                            q = q.or_(",".join(conds))
                    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
                    if res.data:
                        customers = res.data
                        break
                except Exception as e:
                    logger.debug(f"P1 DB customers fetch in {schema_attempt} notice: {e}")

            if not customers:
                unscoped = self._get_unscoped_cached_customers()
                res = [c for c in unscoped if is_record_accessible(c, allowed)] if allowed else list(unscoped)
                return res[offset : offset + limit]

            # Security verification
            scoped_customers = [c for c in customers if is_record_accessible(c, allowed)] if allowed else customers
            return scoped_customers

        # ── Unpaginated Fallback / Lookup Path ──
        unscoped = self._get_unscoped_cached_customers(user_payload, page=page, limit=limit)
        if allowed is not None:
            return [c for c in unscoped if is_record_accessible(c, allowed)]
        return list(unscoped)

    def _get_unscoped_cached_customers(self, user_payload: Dict[str, Any] = None, page: Optional[int] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        global _CUSTOMERS_CACHE, _CUSTOMERS_CACHE_TIMESTAMP
        import time
        now = time.time()
        if _CUSTOMERS_CACHE is not None and (now - _CUSTOMERS_CACHE_TIMESTAMP) < _CUSTOMERS_CACHE_TTL:
            return _CUSTOMERS_CACHE
        return self._fetch_and_enrich_customers_uncached(user_payload=user_payload, page=page, limit=limit)

    def _fetch_and_enrich_customers_uncached(self, user_payload: Dict[str, Any] = None, page: Optional[int] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        global _CUSTOMERS_CACHE, _CUSTOMERS_CACHE_TIMESTAMP
        import time

        fetched_customers = []
        for schema_attempt in ["crm", "public"]:
            try:
                if schema_attempt == "crm":
                    res = self.supabase.schema("crm").table("customers").select("*").execute()
                else:
                    res = self.supabase.table("customers").select("*").execute()

                if res.data is not None and len(res.data) > 0:
                    lead_ids = [str(c["lead_id"]) for c in res.data if c.get("lead_id") and is_valid_uuid(c.get("lead_id"))]
                    lead_map = {}
                    if lead_ids:
                        try:
                            leads_res = self.supabase.schema("crm").table("leads").select(
                                "lead_id,company_name,contact_person,mobile,email,city,category,assigned_to"
                            ).in_("lead_id", lead_ids).execute()
                            if leads_res.data:
                                for ld in leads_res.data:
                                    lead_map[str(ld["lead_id"])] = ld
                        except Exception as le:
                            logger.debug(f"Batch leads lookup notice: {le}")

                    enriched = []
                    for c in res.data:
                        row = dict(c)
                        lid = str(row.get("lead_id") or "")
                        if lid and lid in lead_map:
                            ld = lead_map[lid]
                            row["name"] = row.get("name") or ld.get("company_name")
                            row["company"] = row.get("company") or ld.get("company_name")
                            row["person"] = row.get("person") or ld.get("contact_person")
                            row["phone"] = row.get("phone") or ld.get("mobile")
                            row["email"] = row.get("email") or ld.get("email")
                            row["city"] = row.get("city") or ld.get("city")
                            row["leadNumber"] = row.get("leadNumber") or str(lid)[:8].upper()
                            row["assigned_to"] = row.get("assigned_to") or ld.get("assigned_to")
                        row.setdefault("status", "Active Customer")
                        enriched.append(row)
                    fetched_customers = enriched
                    break
            except Exception as e:
                logger.debug(f"Customers fetch attempt in {schema_attempt} notice: {e}")

        if not fetched_customers:
            fetched_customers = list(_in_memory_customers)

        res_list = fetched_customers

        # Dynamic mapping/enrichment of manager and executive hierarchies
        try:
            from app.modules.users.repository import UserRepository
            all_users = UserRepository().get_all_users()
            
            user_map_by_email = {}
            user_map_by_name = {}
            for u in all_users:
                u_email = str(u.get("email") or "").lower().strip()
                if u_email:
                    user_map_by_email[u_email] = u
                u_name = str(u.get("name") or u.get("full_name") or "").lower().strip()
                if u_name:
                    user_map_by_name[u_name] = u

            from app.modules.crm.repository import CRMRepository
            all_leads = CRMRepository().get_all_leads()
            lead_map = {str(l.get("lead_id") or l.get("id")): l for l in all_leads}

            # Fetch visits
            visits = []
            try:
                res_visits = self.supabase.schema("field_management").table("visits").select("customer_id, check_in_time, status").execute()
                if res_visits.data:
                    visits = res_visits.data
            except Exception:
                try:
                    res_visits = self.supabase.table("visits").select("customer_id, check_in_time, status").execute()
                    if res_visits.data:
                        visits = res_visits.data
                except Exception:
                    pass
            
            last_visit_map = {}
            for v in visits:
                cid = str(v.get("customer_id") or "")
                v_time = v.get("check_in_time")
                if cid and v_time:
                    if cid not in last_visit_map or v_time > last_visit_map[cid]:
                        last_visit_map[cid] = v_time[:10]
                        
            # Fetch followups
            followups = []
            try:
                res_f = self.supabase.schema("crm").table("followups").select("lead_id, scheduled_date, status").execute()
                if res_f.data:
                    followups = res_f.data
            except Exception:
                try:
                    res_f = self.supabase.table("followups").select("lead_id, scheduled_date, status").execute()
                    if res_f.data:
                        followups = res_f.data
                except Exception:
                    pass
            
            next_followup_map = {}
            for f in followups:
                lid = str(f.get("lead_id") or "")
                sched = f.get("scheduled_date")
                status = str(f.get("status") or "").lower()
                if lid and sched and "completed" not in status and "cancel" not in status:
                    if lid not in next_followup_map or sched < next_followup_map[lid]:
                        next_followup_map[lid] = sched[:10]

            for row in res_list:
                cid = str(row.get("customer_id") or row.get("id") or "")
                lid = str(row.get("lead_id") or "")
                
                lead = lead_map.get(lid) if lid else None
                
                se_email = ""
                se_name = ""
                sm_email = ""
                sm_name = ""
                product_val = "TwiteConnect CRM"
                cust_notes = str(row.get("notes") or "")
                if "|" in cust_notes:
                    for part in cust_notes.split("|"):
                        if "Product:" in part:
                            product_val = part.split("Product:")[-1].strip()
                
                # Customer table own columns are the primary source of truth!
                se_name = row.get("sales_executive") or ""
                sm_name = row.get("sales_manager") or ""

                if lead:
                    if not se_name:
                        se_name = lead.get("assigned_to") or ""
                        se_email = str(lead.get("assigned_to_email") or "").lower().strip()
                    if not sm_name:
                        sm_name = lead.get("sales_manager") or ""
                        sm_email = str(lead.get("reporting_manager_email") or "").lower().strip()
                    product_val = lead.get("product_name") or lead.get("product") or product_val
                    
                notes = str(row.get("notes") or "")
                if not se_name and "AssignedTo:" in notes:
                    for part in notes.split("|"):
                        if "AssignedTo:" in part:
                            se_name = part.split("AssignedTo:")[-1].strip()
                            
                se_user = None
                if se_email:
                    se_user = user_map_by_email.get(se_email)
                if not se_user and se_name:
                    se_user = user_map_by_name.get(se_name.lower().strip())
                    
                se_id = ""
                sm_id = ""
                if se_user:
                    se_email = str(se_user.get("email") or "").lower().strip()
                    se_name = se_user.get("name") or se_name
                    se_id = str(se_user.get("id") or se_user.get("auth_user_id") or "")
                    
                    sm_email = sm_email or str(se_user.get("reporting_manager_email") or "").lower().strip()
                    sm_name = sm_name or se_user.get("reporting_manager_name") or ""
                    
                if sm_email:
                    sm_user = user_map_by_email.get(sm_email)
                    if sm_user:
                        sm_name = sm_name or sm_user.get("name") or ""
                        sm_id = str(sm_user.get("id") or sm_user.get("auth_user_id") or "")

                # If the assigned Sales Executive has resigned, left, or is inactive
                if se_user:
                    status_lower = str(se_user.get("status") or "").lower().strip()
                    is_se_inactive = status_lower in ("inactive", "deactivated", "terminated", "disabled", "resigned", "left") or se_user.get("is_active") is False
                    if is_se_inactive:
                        se_name = "Needs Reassignment"
                        se_id = ""
                        
                if not se_name:
                    se_name = "Direct/Unassigned"
                if not sm_name:
                    sm_name = "Direct/Unassigned"
                    
                row["customer_id"] = cid
                row["customer_name"] = row.get("name") or row.get("company") or "Unnamed Customer"
                row["sales_manager_id"] = sm_id
                row["sales_manager_name"] = sm_name
                row["sales_executive_id"] = se_id
                row["sales_executive_name"] = se_name
                row["product"] = product_val
                
                row["manager_id"] = sm_id
                row["manager_name"] = sm_name
                row["executive_id"] = se_id
                row["executive_name"] = se_name
                row["assigned_to"] = se_name
                row["assigned_to_email"] = se_email
                row["sales_executive"] = se_name
                row["sales_manager"] = sm_name
                row["reporting_manager_name"] = sm_name
                row["reporting_manager_email"] = sm_email
                
                val = float(row.get("contract_value") or row.get("revenue") or row.get("value") or 0.0)
                row["amount"] = val
                row["revenue"] = val
                
                row["last_visit"] = last_visit_map.get(cid) or "No visits"
                row["next_followup"] = next_followup_map.get(lid) or "No follow-up"
        except Exception as e_enrich:
            logger.warning(f"Error enriching customer details directory: {e_enrich}")

        _CUSTOMERS_CACHE = res_list
        _CUSTOMERS_CACHE_TIMESTAMP = time.time()
        return res_list

    def create_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        _clear_customers_cache()
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

        # Resolve manager name and executive name to populate sales_executive / sales_manager!
        se_name = assigned_to
        sm_name = "Direct/Unassigned"
        
        try:
            from app.modules.users.repository import UserRepository
            all_users = UserRepository().get_all_users()
            user_map_by_email = {str(u.get("email") or "").lower().strip(): u for u in all_users}
            user_map_by_name = {str(u.get("name") or u.get("full_name") or "").lower().strip(): u for u in all_users}
            
            se_user = None
            if lead_info and lead_info.get("assigned_to_email"):
                se_user = user_map_by_email.get(str(lead_info.get("assigned_to_email")).lower().strip())
            if not se_user and assigned_to:
                se_user = user_map_by_name.get(assigned_to.lower().strip())
                if not se_user:
                    se_user = user_map_by_email.get(assigned_to.lower().strip())
            
            se_id = None
            if se_user:
                se_name = se_user.get("name") or se_name
                sm_name = se_user.get("reporting_manager_name") or "Direct/Unassigned"
                se_id = se_user.get("user_id") or se_user.get("id") or se_user.get("employee_id")
        except Exception:
            pass

        # Generate a NEW unique customer id
        customer_uuid = str(uuid.uuid4())

        # Resolve product from data / lead_info
        product_val = data.get("product") or data.get("product_name") or data.get("package_tier") or data.get("packageTier")
        if not product_val and lead_info:
            product_val = lead_info.get("product_name") or lead_info.get("product")
        if not product_val:
            product_val = "TwiteConnect CRM"

        notes_raw = str(data.get("notes") or data.get("reachOutReason") or data.get("onboardingRemarks") or f"Customer account for {comp_name}")
        full_notes = f"{notes_raw} | AssignedTo: {assigned_to} | Product: {product_val}"

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
            "sales_executive": se_name,
            "sales_manager": sm_name,
            "original_owner": se_name,
            "current_owner": se_name,
            "generated_by_employee_name": se_name,
            "generated_by_employee_id": se_id,
            "status": "Active Customer",
            "notes": full_notes,
            "is_active": True,
        }
        # Carry GPS coordinates from data or from source lead
        _lat = data.get("latitude") or (lead_info.get("latitude") if lead_info else None)
        _lng = data.get("longitude") or (lead_info.get("longitude") if lead_info else None)
        if _lat is not None:
            try:
                payload["latitude"] = float(_lat)
            except (TypeError, ValueError):
                pass
        if _lng is not None:
            try:
                payload["longitude"] = float(_lng)
            except (TypeError, ValueError):
                pass

        logger.info(f"[CUSTOMER INSERT] Saving into crm.customers: {payload}")

        # Upsert client contact profile
        try:
            from app.modules.crm.repository import CRMRepository
            CRMRepository().upsert_contact_record({
                "company_name": comp_name,
                "contact_person": person_name,
                "phone": phone_num,
                "email": email_addr,
                "city": city_name,
                "address": address_val,
                "assigned_to": assigned_to,
                "assigned_to_email": data.get("assigned_to_email")
            })
        except Exception as e_c:
            logger.debug(f"upsert_contact_record notice in create_customer: {e_c}")

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
                    **({"latitude": payload["latitude"]} if "latitude" in payload else {}),
                    **({"longitude": payload["longitude"]} if "longitude" in payload else {}),
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
        db_updates = {}
        
        # 1. Normalize company name
        comp = updates.get("company_name") or updates.get("company") or updates.get("name")
        if comp:
            db_updates["name"] = comp
            db_updates["company"] = comp
            db_updates["company_name"] = comp
            
        # 2. Normalize contact person
        person = updates.get("contact_person") or updates.get("person") or updates.get("contactPerson")
        if person:
            db_updates["contact_person"] = person
            db_updates["person"] = person
            
        # 3. Normalize email & phone
        if "email" in updates:
            db_updates["email"] = updates["email"]
        if "phone" in updates:
            db_updates["phone"] = updates["phone"]
        elif "mobile" in updates:
            db_updates["phone"] = updates["mobile"]
            
        # 4. Normalize city & location
        city = updates.get("city") or updates.get("location")
        if city:
            db_updates["city"] = city
            db_updates["location"] = city
        if "address" in updates:
            db_updates["address"] = updates["address"]
            
        # 5. Normalize executive assignment
        exec_val = updates.get("sales_executive") or updates.get("sales_executive_name") or updates.get("executive_name") or updates.get("assignedExecutive") or updates.get("assigned_to")
        if exec_val:
            db_updates["sales_executive"] = exec_val
            
        # 6. Normalize manager assignment
        mgr_val = updates.get("sales_manager") or updates.get("sales_manager_name") or updates.get("manager_name")
        if mgr_val:
            db_updates["sales_manager"] = mgr_val
            
        # 7. Normalize contract value
        rev_val = updates.get("contract_value") or updates.get("revenue") or updates.get("contractValue") or updates.get("value")
        if rev_val is not None:
            if isinstance(rev_val, (int, float)):
                db_updates["contract_value"] = float(rev_val)
            else:
                try:
                    clean_val = "".join(c for c in str(rev_val) if c.isdigit() or c == '.')
                    db_updates["contract_value"] = float(clean_val) if clean_val else 0.0
                except ValueError:
                    db_updates["contract_value"] = 0.0
                    
        # 8. Normalize status & notes
        if "status" in updates:
            db_updates["status"] = updates["status"]
        notes = updates.get("notes") or updates.get("reachOutReason") or updates.get("specialRemarks")
        if notes:
            db_updates["notes"] = notes
            
        # 9. Carry GPS coordinates
        if "latitude" in updates:
            db_updates["latitude"] = updates["latitude"]
        if "longitude" in updates:
            db_updates["longitude"] = updates["longitude"]

        # Upsert client contact profile
        try:
            existing_customers = self.get_all_customers()
            target_cust = None
            for c in existing_customers:
                if str(c.get("id")) == str(cust_id) or str(c.get("customer_id")) == str(cust_id):
                    target_cust = c
                    break
            if target_cust:
                merged = {**target_cust, **updates}
                from app.modules.crm.repository import CRMRepository
                CRMRepository().upsert_contact_record({
                    "company_name": merged.get("company_name") or merged.get("company"),
                    "contact_person": merged.get("contact_person") or merged.get("person"),
                    "phone": merged.get("phone") or merged.get("mobile"),
                    "email": merged.get("email"),
                    "city": merged.get("city") or "Chennai",
                    "address": merged.get("address"),
                    "assigned_to": merged.get("assigned_to"),
                    "assigned_to_email": merged.get("assigned_to_email")
                })
        except Exception as e_c:
            logger.debug(f"upsert_contact_record notice in update_customer: {e_c}")

        for payload in [db_updates, {k: v for k, v in db_updates.items() if v is not None}]:
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

