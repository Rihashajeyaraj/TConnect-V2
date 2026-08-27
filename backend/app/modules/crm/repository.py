from typing import List, Optional, Dict, Any
import uuid
import re
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_leads: List[Dict[str, Any]] = []

_UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

def _is_uuid_like(val: str) -> bool:
    """Returns True if val looks like a UUID."""
    return bool(_UUID_PATTERN.match(val.strip()))


class CRMRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_leads(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        leads = []
        try:
            res = self.supabase.schema("crm").table("leads").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                leads = res.data
        except Exception as e:
            logger.debug(f"crm.leads fetch notice: {e}")

        if not leads:
            try:
                res = self.supabase.table("leads").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    leads = res.data
            except Exception as e:
                logger.warning(f"Failed fetching leads from public.leads: {e}")

        if not leads:
            leads = _in_memory_leads

        # Enrich leads with user metadata from UserRepository & embedded notes tags
        user_map = {}
        try:
            from app.modules.users.repository import UserRepository
            users = UserRepository().get_all_users()
            for u in users:
                uid = str(u.get("id") or u.get("auth_user_id") or u.get("user_id") or "").strip()
                if uid:
                    user_map[uid] = u
        except Exception:
            pass

        enriched_leads = []
        for l in leads:
            row = dict(l)
            notes_str = str(row.get("notes") or row.get("remarks") or "")
            parsed_from_notes = {}
            if notes_str and "|" in notes_str:
                for part in notes_str.split("|"):
                    p_strip = part.strip()
                    if "Product:" in p_strip:
                        parsed_from_notes["product_name"] = p_strip.split("Product:")[-1].strip()
                    elif "Email:" in p_strip:
                        parsed_from_notes["assigned_to_email"] = p_strip.split("Email:")[-1].strip().lower()
                    elif "EMP:" in p_strip:
                        parsed_from_notes["employee_code"] = p_strip.split("EMP:")[-1].strip()
                    elif "Manager:" in p_strip:
                        parsed_from_notes["reporting_manager_email"] = p_strip.split("Manager:")[-1].strip().lower()
                    elif "AssignedTo:" in p_strip:
                        parsed_from_notes["assigned_to"] = p_strip.split("AssignedTo:")[-1].strip()
                    elif "Category:" in p_strip:
                        parsed_from_notes["category"] = p_strip.split("Category:")[-1].strip().title()

            # Set values: prioritize structured DB columns, fallback to notes
            row["product_name"] = row.get("product_name") or parsed_from_notes.get("product_name") or row.get("product") or parsed_from_notes.get("product")
            
            db_assigned = row.get("assigned_to")
            db_email = row.get("assigned_to_email")
            db_code = row.get("employee_code")
            db_mgr_email = row.get("reporting_manager_email")

            # Resolve user mapping using db_assigned UUID or created_by
            a_to = str(db_assigned or "").strip()
            c_by = str(row.get("created_by") or "").strip()
            matched_user = user_map.get(a_to) or user_map.get(c_by)

            if matched_user:
                status_lower = str(matched_user.get("status") or "").lower().strip()
                is_matched_inactive = status_lower in ("inactive", "deactivated", "terminated", "disabled", "resigned", "left") or matched_user.get("is_active") is False
                
                if is_matched_inactive:
                    row["assigned_to_email"] = None
                    row["assigned_to"] = "Needs Reassignment"
                    row["employee_code"] = None
                    row["reporting_manager_email"] = None
                else:
                    # Authoritative resolution from matched active user
                    row["assigned_to_email"] = str(matched_user.get("email") or "").lower().strip()
                    row["assigned_to"] = str(matched_user.get("name") or matched_user.get("full_name") or "")
                    row["employee_code"] = str(matched_user.get("employee_code") or matched_user.get("employee_id") or "")
                    row["reporting_manager_email"] = str(matched_user.get("reporting_manager_email") or "").lower().strip()
            else:
                # If no matched active user, fall back to DB values, then notes
                row["assigned_to"] = db_assigned or parsed_from_notes.get("assigned_to")
                row["assigned_to_email"] = db_email or parsed_from_notes.get("assigned_to_email")
                row["employee_code"] = db_code or parsed_from_notes.get("employee_code")
                row["reporting_manager_email"] = db_mgr_email or parsed_from_notes.get("reporting_manager_email")

            # If current_owner is set (updated on reassignment) and it is a name, it takes priority
            if row.get("current_owner"):
                co = str(row["current_owner"]).strip()
                if co and co not in ("None", "—"):
                    if not _is_uuid_like(co):
                        row["assigned_to"] = co
            
            # Resolve manager name and manager ID for leads
            mgr_email = row.get("reporting_manager_email")
            if mgr_email:
                matched_mgr = next((u for u in user_map.values() if str(u.get("email") or "").lower().strip() == mgr_email), None)
                if matched_mgr:
                    row["manager_name"] = str(matched_mgr.get("name") or matched_mgr.get("full_name") or "")
                    row["manager_id"] = str(matched_mgr.get("employee_code") or matched_mgr.get("employee_id") or "")

            # Enrich fields for standard frontend mapping
            row["id"] = row.get("lead_id")
            row["company"] = row.get("company_name")
            row["person"] = row.get("contact_person") or row.get("contact_name")
            row["phone"] = row.get("mobile") or row.get("contact_phone")
            row["value"] = row.get("expected_value")

            # Resolve status
            row["status"] = "New"
            if row.get("converted_to_customer_id") or row.get("converted_at"):
                row["status"] = "Converted to Customer"
            else:
                status_part = next((part.split("Status:")[-1].strip() for part in notes_str.split("|") if "Status:" in part), None)
                if status_part:
                    row["status"] = status_part

            # Resolve priority / category fallback
            category_part = next((part.split("Category:")[-1].strip() for part in notes_str.split("|") if "Category:" in part), None)
            if category_part:
                row["category"] = category_part.title()
                row["priority"] = category_part.title()
            else:
                row.setdefault("category", "Warm")
                row.setdefault("priority", "Medium")

            enriched_leads.append(row)

        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            enriched_leads = [l for l in enriched_leads if is_record_accessible(l, allowed)]

        return enriched_leads

    def create_lead(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        lead_id = data.get("id") or data.get("lead_id") or str(uuid.uuid4())
        lead_num = data.get("lead_number") or data.get("lead_code") or f"LD-{str(uuid.uuid4())[:6].upper()}"

        assigned_to_raw = data.get("assigned_to") or data.get("assignedTo") or (user_payload or {}).get("name") or "Sales Executive"
        assigned_to_email = str(data.get("assigned_to_email") or data.get("assignedToEmail") or (user_payload or {}).get("email") or "executive@tconnect.com").lower().strip()
        employee_code = str(data.get("employee_code") or data.get("employee_id") or (user_payload or {}).get("employee_code") or "EMP-101").strip()

        # Resolve user UUID & reporting manager from UserRepository
        assigned_user_id = None
        mgr_email = ""
        try:
            from app.modules.users.repository import UserRepository
            all_u = UserRepository().get_all_users()
            for u in all_u:
                e_mail = str(u.get("email") or "").lower().strip()
                e_code = str(u.get("employee_code") or u.get("employee_id") or "").strip()
                u_name = str(u.get("name") or u.get("full_name") or "").lower().strip()
                if (assigned_to_email and e_mail == assigned_to_email) or (employee_code and e_code == employee_code) or (assigned_to_raw and u_name == assigned_to_raw.lower().strip()):
                    assigned_user_id = str(u.get("id") or u.get("auth_user_id") or u.get("user_id") or "")
                    mgr_email = str(u.get("reporting_manager_email") or "").lower().strip()
                    break
        except Exception:
            pass

        company_val = str(data.get("company_name") or data.get("company") or data.get("title") or "Prospect Client")
        person_val = str(data.get("contact_person") or data.get("contact_name") or data.get("person") or data.get("name") or "Point of Contact")

        # Normalize mobile/email: empty string must become None to satisfy Supabase constraints
        # (some columns reject empty strings via CHECK constraints or NOT NULL).
        _mobile_raw = str(data.get("mobile") or data.get("phone") or data.get("contact_phone") or "").strip()
        mobile_val = _mobile_raw if _mobile_raw else None

        _email_raw = str(data.get("email") or data.get("contact_email") or "").strip().lower()
        email_val = _email_raw if _email_raw else None

        city_val = str(data.get("city") or "Chennai")

        # Safely extract numeric value from strings like "₹4,50,000" or "450000".
        # Use regex to strip all non-digit, non-decimal characters first.
        import re as _re
        _val_raw = str(data.get("expected_value") or data.get("value") or "0")
        _val_digits = _re.sub(r"[^0-9.]", "", _val_raw)
        try:
            expected_value_float = float(_val_digits) if _val_digits else 0.0
        except ValueError:
            expected_value_float = 0.0

        product_val = str(data.get("product_name") or data.get("product") or data.get("productRequirement") or "TwiteConnect CRM").strip()

        notes_raw = str(data.get("notes") or data.get("remarks") or "New lead added")
        category_val = str(data.get("category") or data.get("lead_type") or "Warm").strip().title()
        full_notes = f"{notes_raw} | Product: {product_val} | AssignedTo: {assigned_to_raw} | Email: {assigned_to_email} | EMP: {employee_code} | Manager: {mgr_email} | Category: {category_val}"

        # assigned_to in Supabase is a UUID column — pass None if we don't have a valid UUID.
        assigned_to_uuid = assigned_user_id if (assigned_user_id and len(assigned_user_id) == 36 and "-" in assigned_user_id) else None

        payload = {
            "lead_id": lead_id,
            "lead_number": lead_num,
            "company_name": company_val,
            "contact_person": person_val,
            "contact_name": person_val,
            "mobile": mobile_val,
            "contact_phone": mobile_val,
            "email": email_val,          # None when blank — never empty string
            "contact_email": email_val,  # None when blank — never empty string
            "city": city_val,
            "address": data.get("address") or city_val,
            "notes": full_notes,
            "remarks": full_notes,
            "assigned_to": assigned_to_uuid,
            "created_by": assigned_to_uuid,
            "expected_value": expected_value_float,  # always set — Supabase expects numeric
            "is_active": True,
        }
        # Persist exact GPS coordinates if provided
        lat = data.get("latitude")
        lng = data.get("longitude")
        if lat is not None:
            try:
                payload["latitude"] = float(lat)
            except (TypeError, ValueError):
                pass
        if lng is not None:
            try:
                payload["longitude"] = float(lng)
            except (TypeError, ValueError):
                pass

        # Upsert client contact profile
        try:
            self.upsert_contact_record({
                "company_name": company_val,
                "contact_person": person_val,
                "phone": mobile_val,
                "email": email_val,
                "city": city_val,
                "address": data.get("address") or city_val,
                "assigned_to": assigned_to_uuid,
                "assigned_to_email": assigned_to_email
            })
        except Exception as e_c:
            logger.debug(f"upsert_contact_record notice in create_lead: {e_c}")

        logger.info(f"[CRM INSERT REQUEST] Attempting insert into crm.leads with payload: {payload}")

        # 1. Primary: crm.leads
        primary_err = None
        try:
            res = self.supabase.schema("crm").table("leads").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[CRM INSERT SUCCESS] Saved lead in crm.leads: {res.data[0]}")
                out_lead = res.data[0]
                out_lead["company"] = company_val
                out_lead["person"] = person_val
                out_lead["product"] = product_val
                out_lead["product_name"] = product_val
                out_lead["assigned_to"] = assigned_to_raw
                out_lead["assigned_to_email"] = assigned_to_email
                out_lead["employee_code"] = employee_code
                out_lead["reporting_manager_email"] = mgr_email
                return out_lead
        except Exception as e:
            primary_err = str(e)
            logger.warning(f"crm.leads insert failure: {e}")

        # 2. Fallback: public.leads table
        fallback_err = None
        try:
            res = self.supabase.table("leads").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[CRM INSERT SUCCESS] Saved lead in public.leads: {res.data[0]}")
                out_lead = res.data[0]
                out_lead["company"] = company_val
                out_lead["person"] = person_val
                out_lead["product"] = product_val
                out_lead["product_name"] = product_val
                out_lead["assigned_to"] = assigned_to_raw
                out_lead["assigned_to_email"] = assigned_to_email
                out_lead["employee_code"] = employee_code
                out_lead["reporting_manager_email"] = mgr_email
                return out_lead
        except Exception as e:
            fallback_err = str(e)
            logger.error(f"Error creating lead in public.leads: {e}")

        from fastapi import HTTPException
        err_msg = primary_err or fallback_err or "Unknown database error"
        raise HTTPException(
            status_code=400,
            detail=f"Database persistence failed. Supabase error details: {err_msg}"
        )

    def update_lead(self, lead_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Fetch existing lead record first to merge notes/remarks
        target_lead = None
        try:
            existing_leads = self.get_all_leads()
            for l in existing_leads:
                if str(l.get("lead_id")) == str(lead_id) or str(l.get("id")) == str(lead_id):
                    target_lead = l
                    break
        except Exception:
            pass

        # Helper to sanitize and map input payload fields to actual db columns
        def sanitize_lead_payload(data: Dict[str, Any], existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
            p = dict(data)

            # Map fields
            lid = p.pop("id", None) or p.get("lead_id")
            if lid:
                p["lead_id"] = lid

            company = p.pop("company", None)
            if company:
                p["company_name"] = company

            person = p.pop("person", None)
            if person:
                p["contact_person"] = person
                p["contact_name"] = person

            phone = p.pop("phone", None)
            if phone:
                p["mobile"] = phone
                p["contact_phone"] = phone

            email = p.get("email")
            if email:
                p["contact_email"] = email

            val = p.pop("value", None) or p.get("expected_value")
            if val:
                val_str = str(val).replace("₹", "").replace(",", "").strip()
                try:
                    p["expected_value"] = float(val_str)
                except ValueError:
                    pass

            # Capture status
            status = p.pop("status", None)
            if status:
                if str(status).upper() in ("CONVERTED", "CONVERTED TO CUSTOMER", "CUSTOMER"):
                    from datetime import datetime
                    p["converted_at"] = datetime.utcnow().isoformat()

            # Capture category/priority and product
            category = p.pop("category", None)
            priority = p.pop("priority", None)
            product = p.pop("product", None) or p.pop("product_name", None)

            # Use existing notes as fallback baseline to prevent notes erasure
            existing_notes = str(existing.get("notes") or existing.get("remarks") or "") if existing else ""
            notes_str = str(p.get("notes") or p.get("remarks") or existing_notes)
            parts = [part.strip() for part in notes_str.split("|")] if notes_str else []

            new_parts = []
            has_cat = False
            has_status = False
            has_prod = False
            for part in parts:
                if "Category:" in part:
                    if category:
                        new_parts.append(f"Category: {category}")
                        has_cat = True
                    else:
                        new_parts.append(part)
                elif "Status:" in part:
                    if status:
                        new_parts.append(f"Status: {status}")
                        has_status = True
                    else:
                        new_parts.append(part)
                elif "Product:" in part:
                    if product:
                        new_parts.append(f"Product: {product}")
                        has_prod = True
                    else:
                        new_parts.append(part)
                else:
                    new_parts.append(part)

            if category and not has_cat:
                new_parts.append(f"Category: {category}")
            if status and not has_status:
                new_parts.append(f"Status: {status}")
            if product and not has_prod:
                new_parts.append(f"Product: {product}")

            if new_parts:
                p["notes"] = " | ".join(new_parts)
                p["remarks"] = " | ".join(new_parts)

            allowed_keys = {
                "lead_id", "lead_number", "company_name", "contact_person", "mobile", "email",
                "designation", "address", "city", "state", "country", "postal_code",
                "lead_source_id", "lead_status_id", "assigned_to", "expected_value",
                "remarks", "next_followup_date", "created_by", "updated_by", "is_active",
                "is_deleted", "created_at", "updated_at", "notes", "documents", "activities",
                "contact_name", "contact_email", "contact_phone", "converted_to_customer_id", "converted_at",
                "latitude", "longitude",
            }
            return {k: v for k, v in p.items() if k in allowed_keys}

        sanitized = sanitize_lead_payload(updates, target_lead)

        # Upsert client contact profile
        try:
            if target_lead:
                merged = {**target_lead, **sanitized}
                self.upsert_contact_record({
                    "company_name": merged.get("company_name") or merged.get("company"),
                    "contact_person": merged.get("contact_person") or merged.get("person"),
                    "phone": merged.get("mobile") or merged.get("phone"),
                    "email": merged.get("email"),
                    "city": merged.get("city") or "Chennai",
                    "address": merged.get("address"),
                    "assigned_to": merged.get("assigned_to"),
                    "assigned_to_email": merged.get("assigned_to_email")
                })
        except Exception as e_c:
            logger.debug(f"upsert_contact_record notice in update_lead: {e_c}")

        for payload in [sanitized, {k: v for k, v in sanitized.items() if v is not None}]:
            # 1. Try schema 'crm' with lead_id key
            try:
                res = self.supabase.schema("crm").table("leads").update(payload).eq("lead_id", lead_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

            # 2. Try schema 'crm' with id key
            try:
                res = self.supabase.schema("crm").table("leads").update(payload).eq("id", lead_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

            # 3. Try public table with lead_id key
            try:
                res = self.supabase.table("leads").update(payload).eq("lead_id", lead_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

            # 4. Try public table with id key
            try:
                res = self.supabase.table("leads").update(payload).eq("id", lead_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        for lead in _in_memory_leads:
            if str(lead.get("id")) == str(lead_id) or str(lead.get("lead_id")) == str(lead_id):
                lead.update(updates)
                return lead

        return {}

    def get_team_leads(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        params = params or {}
        try:
            # 1. Fetch all leads from Supabase / Memory
            all_leads = self.get_all_leads(user_payload=user_payload)

            # Restrict results to manager's assigned team if the user has a manager role
            user_payload = user_payload or {}
            user_role = str(user_payload.get("role") or "").lower().strip()
            if "manager" in user_role:
                from app.modules.users.repository import UserRepository
                user_repo = UserRepository()
                mgr_email = str(user_payload.get("email") or "").lower().strip()
                mgr_id = str(user_payload.get("id") or user_payload.get("user_id") or "").strip()
                mgr_code = str(user_payload.get("employee_code") or "").strip()
                effective_mgr_identifier = mgr_email or mgr_id or mgr_code

                assigned_execs = user_repo.get_assigned_executives_for_manager(effective_mgr_identifier) or []

                assigned_emails = {str(u.get("email") or "").lower().strip() for u in assigned_execs if u.get("email")}
                assigned_ids = {str(u.get("id") or u.get("user_id") or u.get("employee_id") or "").strip() for u in assigned_execs}
                assigned_codes = {str(u.get("employee_code") or u.get("employee_id") or "").strip() for u in assigned_execs}
                assigned_names = {str(u.get("name") or u.get("full_name") or "").lower().strip() for u in assigned_execs}
                assigned_names = {n for n in assigned_names if len(n) > 3}

                team_leads = []
                for l in (all_leads or []):
                    if not isinstance(l, dict):
                        continue
                    l_se_email = str(l.get("assigned_to_email") or l.get("assignedToEmail") or l.get("created_by_email") or l.get("email") or "").lower().strip()
                    l_se_id = str(l.get("user_id") or l.get("userId") or l.get("executive_id") or l.get("employee_id") or "").strip()
                    l_se_name = str(l.get("assigned_to") or l.get("assignedTo") or l.get("created_by_name") or l.get("executive") or "").lower().strip()

                    is_match = False
                    if l_se_email and l_se_email in assigned_emails:
                        is_match = True
                    elif l_se_id and (l_se_id in assigned_ids or l_se_id in assigned_codes):
                        is_match = True
                    else:
                        for name in assigned_names:
                            if name in l_se_name:
                                is_match = True
                                break
                    if is_match:
                        team_leads.append(l)
                all_leads = team_leads

            # 2. Filter parameters
            se_filter = str(params.get("sales_executive_id") or params.get("executive") or params.get("se_id") or "").lower().strip()
            priority_filter = str(params.get("priority") or "").lower().strip()
            status_filter = str(params.get("status") or "").lower().strip()
            category_filter = str(params.get("category") or "").lower().strip()
            search_filter = str(params.get("search") or "").lower().strip()

            filtered = []
            for l in (all_leads or []):
                if not isinstance(l, dict):
                    continue

                # Executive filter check
                if se_filter and se_filter != "all":
                    l_se_email = str(l.get("assigned_to_email") or l.get("assignedToEmail") or l.get("created_by_email") or l.get("email") or "").lower().strip()
                    l_se_name = str(l.get("assigned_to") or l.get("assignedTo") or l.get("created_by_name") or l.get("executive") or "").lower().strip()
                    l_se_code = str(l.get("employee_id") or l.get("employee_code") or "").lower().strip()

                    se_clean = se_filter.split('@')[0] if '@' in se_filter else se_filter
                    se_clean = se_clean.replace('-', '').replace('_', '')

                    matches_se = (
                        l_se_email == se_filter
                        or l_se_name == se_filter
                        or l_se_code == se_filter
                        or (len(se_clean) >= 2 and (se_clean in l_se_email or se_clean in l_se_name or se_clean in l_se_code))
                    )
                    if not matches_se:
                        continue

                # Priority check
                if priority_filter and priority_filter != "all":
                    l_priority = str(l.get("priority") or l.get("category") or "").lower().strip()
                    if priority_filter not in l_priority:
                        continue

                # Status check
                if status_filter and status_filter != "all":
                    l_status = str(l.get("status") or "").lower().strip()
                    if status_filter not in l_status:
                        continue

                # Category check
                if category_filter and category_filter != "all":
                    l_cat = str(l.get("category") or l.get("priority") or "").lower().strip()
                    if category_filter not in l_cat:
                        continue

                # Search check
                if search_filter:
                    l_company = str(l.get("company_name") or l.get("company") or l.get("title") or "").lower()
                    l_poc = str(l.get("contact_person") or l.get("contact_name") or l.get("person") or "").lower()
                    l_phone = str(l.get("mobile") or l.get("phone") or l.get("contact_phone") or "").lower()
                    l_num = str(l.get("lead_number") or l.get("lead_code") or l.get("id") or "").lower()
                    l_se = str(l.get("assigned_to") or l.get("assignedTo") or "").lower()

                    matches_q = (
                        search_filter in l_company
                        or search_filter in l_poc
                        or search_filter in l_phone
                        or search_filter in l_num
                        or search_filter in l_se
                    )
                    if not matches_q:
                        continue

                # Date range filter check
                from_date = params.get("from_date")
                to_date = params.get("to_date")
                l_date_str = str(l.get("created_at") or l.get("date") or "")
                if l_date_str:
                    l_date = l_date_str.split("T")[0].split(" ")[0].strip()
                    if from_date and l_date < from_date:
                        continue
                    if to_date and l_date > to_date:
                        continue

                filtered.append(l)

            # Calculate Summary Metrics
            hot_count = len([x for x in (filtered or []) if isinstance(x, dict) and str(x.get("category") or x.get("priority") or "").lower() == "hot"])
            warm_count = len([x for x in (filtered or []) if isinstance(x, dict) and str(x.get("category") or x.get("priority") or "").lower() == "warm"])
            cold_count = len([x for x in (filtered or []) if isinstance(x, dict) and str(x.get("category") or x.get("priority") or "").lower() == "cold"])
            converted_count = len([x for x in (filtered or []) if isinstance(x, dict) and "convert" in str(x.get("status") or "").lower()])
            lost_count = len([x for x in (filtered or []) if isinstance(x, dict) and "lost" in str(x.get("status") or "").lower()])

            page = int(params.get("page") or 1)
            limit = int(params.get("limit") or 50)
            start = (page - 1) * limit
            end = start + limit
            paginated = filtered[start:end]

            return {
                "summary": {
                    "total_leads": len(filtered or []),
                    "hot_leads": hot_count,
                    "warm_leads": warm_count,
                    "cold_leads": cold_count,
                    "converted_leads": converted_count,
                    "lost_leads": lost_count,
                    "today_leads": len(filtered or []),
                    "month_leads": len(filtered or []),
                },
                "leads": paginated,
                "total": len(filtered),
                "page": page,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error executing get_team_leads: {e}")
            return {
                "summary": {
                    "total_leads": 0,
                    "hot_leads": 0,
                    "warm_leads": 0,
                    "cold_leads": 0,
                    "converted_leads": 0,
                    "lost_leads": 0,
                    "today_leads": 0,
                    "month_leads": 0,
                },
                "leads": [],
                "total": 0,
                "page": 1,
                "limit": 50,
            }

    def get_lead_by_id(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a single lead by its ID.
        Searches by both 'id' (the enriched/frontend key) AND 'lead_id' (the Supabase PK)
        so leads stored in crm.leads are always resolvable regardless of which key is used.
        """
        leads = self.get_all_leads()
        lead_id_str = str(lead_id)
        for lead in leads:
            if str(lead.get("id")) == lead_id_str or str(lead.get("lead_id") or "") == lead_id_str:
                return lead
        return None

    # ── FOLLOW-UPS PERSISTENCE ────────────────────────────────────────────────
    def _standardize_followup(self, row: Dict[str, Any]) -> Dict[str, Any]:
        flw_id = str(row.get("follow_up_id") or row.get("id") or "")
        notes_raw = str(row.get("notes") or "")
        
        # Parse serialized metadata from notes if present
        meta = {}
        if "|" in notes_raw:
            parts = notes_raw.split("|")
            remark_main = parts[0].strip()
            for part in parts[1:]:
                if ":" in part:
                    k, v = part.split(":", 1)
                    meta[k.strip().lower()] = v.strip()
        else:
            remark_main = notes_raw

        cust_id_val = str(row.get("customer_id") or "")
        # If customer_id is a UUID, don't use it as company name fallback!
        is_cust_uuid = len(cust_id_val) == 36 and "-" in cust_id_val

        return {
            "id": flw_id,
            "follow_up_id": flw_id,
            "leadId": str(row.get("lead_id") or meta.get("leadid") or ""),
            "lead_id": str(row.get("lead_id") or meta.get("leadid") or ""),
            "leadNumber": meta.get("leadnumber") or "",
            "customer_id": cust_id_val,
            "customerId": cust_id_val,
            "company": meta.get("company") or (cust_id_val if not is_cust_uuid and cust_id_val else "Client Account"),
            "person": meta.get("person") or "Contact Person",
            "phone": meta.get("phone") or "",
            "email": meta.get("email") or "",
            "city": meta.get("city") or "Chennai",
            "category": meta.get("category") or "Warm",
            "scheduledDate": str(row.get("follow_up_date") or ""),
            "scheduledTime": str(row.get("follow_up_time") or "11:00 AM"),
            "remark": remark_main,
            "assignedTo": meta.get("assignedto") or "Sales Executive",
            "assignedToEmail": meta.get("email") or meta.get("assignedtoemail") or "",
            "status": row.get("status") or "Scheduled",
            "follow_up_type": row.get("follow_up_type") or "Call",
            "created_at": row.get("created_at") or ""
        }

    def get_all_followups(self, user_payload: Dict[str, Any] = None, active_only: bool = True) -> List[Dict[str, Any]]:
        """
        Fetch follow-ups from crm.follow_ups.

        active_only=True  → excludes Converted / Completed / Cancelled statuses.
                           Use for the active Follow-up tab/list.
        active_only=False → returns ALL follow-ups including converted ones.
                           Use for Client Log / history views.
        """
        INACTIVE = {"converted", "completed", "cancelled", "closed", "done"}
        try:
            res = self.supabase.schema("crm").table("follow_ups").select("*").order("created_at", desc=True).execute()
            if res.data is not None:
                standardized = [self._standardize_followup(r) for r in res.data]
                if active_only:
                    # Exclude follow-ups that have been converted/completed
                    standardized = [
                        f for f in standardized
                        if str(f.get("status") or "").lower().strip() not in INACTIVE
                    ]
                from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
                allowed = get_allowed_user_identifiers(user_payload)
                if allowed is not None:
                    standardized = [f for f in standardized if is_record_accessible(f, allowed)]
                return standardized
        except Exception as e:
            logger.warning(f"Failed to fetch follow_ups from crm schema: {e}")
        return []

    def get_followup_by_id(self, followup_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single follow-up by its UUID. Returns None if not found."""
        try:
            res = (
                self.supabase.schema("crm")
                .table("follow_ups")
                .select("*")
                .eq("follow_up_id", followup_id)
                .execute()
            )
            if res.data:
                return self._standardize_followup(res.data[0])
        except Exception as e:
            logger.warning(f"get_followup_by_id error: {e}")
        return None

    def create_followup(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        import datetime as dt
        flw_id = str(data.get("id") or data.get("follow_up_id") or uuid.uuid4())
        is_uuid = lambda x: x and len(str(x)) == 36 and "-" in str(x)
        
        # User & Lead resolution
        lead_id = data.get("leadId") or data.get("lead_id")
        lead_uuid = str(lead_id) if is_uuid(lead_id) else None
        
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        assigned_to_uuid = user_id if is_uuid(user_id) else None
        
        company = data.get("company") or data.get("company_name") or "Client Account"
        person = data.get("person") or data.get("contact_person") or "Contact Person"
        phone = data.get("phone") or data.get("mobile") or ""
        email = data.get("email") or data.get("contact_email") or ""
        city = data.get("city") or "Chennai"
        category = data.get("category") or "Warm"
        assigned_to = data.get("assignedTo") or (user_payload or {}).get("name") or "Sales Executive"
        assigned_to_email = data.get("assignedToEmail") or (user_payload or {}).get("email") or ""
        
        # Date & Time formatting
        sched_date = data.get("scheduledDate") or data.get("follow_up_date") or dt.datetime.utcnow().strftime("%Y-%m-%d")
        sched_time_raw = str(data.get("scheduledTime") or data.get("follow_up_time") or "11:00 AM")
        try:
            if "AM" in sched_time_raw.upper() or "PM" in sched_time_raw.upper():
                t_obj = dt.datetime.strptime(sched_time_raw.strip(), "%I:%M %p")
                db_time = t_obj.strftime("%H:%M:%S")
            else:
                db_time = sched_time_raw[:8]
        except Exception:
            db_time = "11:00:00"

        remark = data.get("remark") or data.get("notes") or "Follow-up scheduled"
        full_notes = f"{remark} | Company: {company} | Person: {person} | Phone: {phone} | Email: {email} | City: {city} | Category: {category} | AssignedTo: {assigned_to} | Email: {assigned_to_email} | LeadNumber: {data.get('leadNumber', '')}"

        db_payload = {
            "follow_up_id": flw_id if is_uuid(flw_id) else str(uuid.uuid4()),
            "lead_id": lead_uuid,
            "customer_id": company,
            "assigned_to": assigned_to_uuid,
            "follow_up_date": sched_date,
            "follow_up_time": db_time,
            "follow_up_type": data.get("follow_up_type") or "Call",
            "status": data.get("status") or "Scheduled",
            "subject": f"Follow-up: {company}",
            "notes": full_notes,
            "created_at": dt.datetime.utcnow().isoformat()
        }

        res = self.supabase.schema("crm").table("follow_ups").insert(db_payload).execute()
        if res.data and len(res.data) > 0:
            logger.info(f"Followup created in crm.follow_ups: {res.data[0]}")
            return self._standardize_followup(res.data[0])
        raise RuntimeError("Failed to insert follow-up into crm.follow_ups")

    def update_followup(self, followup_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        db_updates = {}
        if updates.get("status") is not None:
            db_updates["status"] = updates["status"]
        if updates.get("outcome") is not None:
            db_updates["outcome"] = updates["outcome"]
        if updates.get("notes") or updates.get("remark"):
            db_updates["notes"] = updates.get("notes") or updates.get("remark")
        if updates.get("scheduledDate"):
            db_updates["follow_up_date"] = updates["scheduledDate"]
        # customer_id — set when follow-up is converted to a customer
        if updates.get("customer_id") is not None:
            db_updates["customer_id"] = updates["customer_id"]
        if updates.get("completed_at") is not None:
            db_updates["completed_at"] = updates["completed_at"]

        if not db_updates:
            # Nothing to update — fetch and return current record
            return self.get_followup_by_id(followup_id) or {}

        try:
            res = self.supabase.schema("crm").table("follow_ups").update(db_updates).eq("follow_up_id", followup_id).execute()
            if res.data and len(res.data) > 0:
                return self._standardize_followup(res.data[0])
        except Exception as e:
            logger.error(f"update_followup failed for {followup_id}: {e}")
            raise RuntimeError(f"Failed to update follow-up '{followup_id}': {e}") from e

        raise RuntimeError(f"Follow-up '{followup_id}' not found or update returned no data")

    def delete_followup(self, followup_id: str) -> bool:
        self.supabase.schema("crm").table("follow_ups").delete().eq("follow_up_id", followup_id).execute()
        return True

    def delete_lead(self, lead_id: str) -> bool:
        global _in_memory_leads
        _in_memory_leads = [l for l in _in_memory_leads if str(l.get("id")) != str(lead_id) and str(l.get("lead_id")) != str(lead_id)]

        try:
            self.supabase.schema("crm").table("leads").delete().eq("lead_id", lead_id).execute()
        except Exception:
            pass

        try:
            self.supabase.table("leads").delete().eq("id", lead_id).execute()
        except Exception:
            pass
        return True

    def search_contacts(self, query: str, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search contacts in crm.contacts matching company name or phone."""
        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        
        results = []
        try:
            query_str = f"%{query}%"
            res = self.supabase.schema("crm").table("contacts").select("*").or_(f"company_name.ilike.{query_str},phone.ilike.{query_str}").limit(10).execute()
            if res.data:
                results = res.data
        except Exception as e:
            logger.debug(f"crm.contacts search error: {e}")
            try:
                query_str = f"%{query}%"
                res = self.supabase.table("contacts").select("*").or_(f"company_name.ilike.{query_str},phone.ilike.{query_str}").limit(10).execute()
                if res.data:
                    results = res.data
            except Exception:
                pass
        
        if allowed is not None:
            results = [c for c in results if is_record_accessible(c, allowed)]
        return results

    def upsert_contact_record(self, data: Dict[str, Any]) -> None:
        """Upsert contact details into crm.contacts whenever a lead/customer is processed."""
        company = data.get("company") or data.get("company_name")
        person = data.get("person") or data.get("contact_person") or data.get("name")
        phone = data.get("phone") or data.get("mobile")
        email = data.get("email")
        city = data.get("city") or data.get("location") or "Chennai"
        address = data.get("address") or data.get("full_address")
        assigned_to = data.get("assigned_to") or data.get("executive_id") or data.get("sales_executive_id")
        assigned_to_email = data.get("assigned_to_email") or data.get("executive_email")

        if not company or not phone or not person:
            return

        contact_payload = {
            "company_name": str(company).strip(),
            "contact_person": str(person).strip(),
            "phone": str(phone).strip(),
            "email": str(email).strip() if email else None,
            "city": str(city).strip(),
            "address": str(address).strip() if address else None,
            "assigned_to": str(assigned_to).strip() if assigned_to else None,
            "assigned_to_email": str(assigned_to_email).strip() if assigned_to_email else None
        }

        try:
            res_exist = self.supabase.schema("crm").table("contacts").select("id").or_(f"company_name.eq.{company},phone.eq.{phone}").execute()
            if res_exist.data and len(res_exist.data) > 0:
                contact_id = res_exist.data[0]["id"]
                self.supabase.schema("crm").table("contacts").update(contact_payload).eq("id", contact_id).execute()
            else:
                self.supabase.schema("crm").table("contacts").insert(contact_payload).execute()
        except Exception as e:
            logger.debug(f"Failed to upsert contact into crm.contacts: {e}")
            try:
                res_exist = self.supabase.table("contacts").select("id").or_(f"company_name.eq.{company},phone.eq.{phone}").execute()
                if res_exist.data and len(res_exist.data) > 0:
                    contact_id = res_exist.data[0]["id"]
                    self.supabase.table("contacts").update(contact_payload).eq("id", contact_id).execute()
                else:
                    self.supabase.table("contacts").insert(contact_payload).execute()
            except Exception as e_pub:
                logger.debug(f"Failed to upsert contact into public.contacts: {e_pub}")
