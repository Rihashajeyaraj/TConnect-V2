from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_leads: List[Dict[str, Any]] = []


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
            if notes_str and "|" in notes_str:
                for part in notes_str.split("|"):
                    p_strip = part.strip()
                    if "Product:" in p_strip:
                        row["product_name"] = p_strip.split("Product:")[-1].strip()
                        row["product"] = p_strip.split("Product:")[-1].strip()
                    elif "Email:" in p_strip:
                        row["assigned_to_email"] = p_strip.split("Email:")[-1].strip().lower()
                    elif "EMP:" in p_strip:
                        row["employee_code"] = p_strip.split("EMP:")[-1].strip()
                    elif "Manager:" in p_strip:
                        row["reporting_manager_email"] = p_strip.split("Manager:")[-1].strip().lower()
                    elif "AssignedTo:" in p_strip:
                        row["assigned_to"] = p_strip.split("AssignedTo:")[-1].strip()
                    elif "Category:" in p_strip:
                        row["category"] = p_strip.split("Category:")[-1].strip().title()

            a_to = str(row.get("assigned_to") or "").strip()
            c_by = str(row.get("created_by") or "").strip()
            matched_user = user_map.get(a_to) or user_map.get(c_by)
            if matched_user:
                row["assigned_to_email"] = row.get("assigned_to_email") or str(matched_user.get("email") or "").lower().strip()
                row["assigned_to"] = row.get("assigned_to") or str(matched_user.get("name") or matched_user.get("full_name") or "")
                row["employee_code"] = row.get("employee_code") or str(matched_user.get("employee_code") or matched_user.get("employee_id") or "")
                row["reporting_manager_email"] = row.get("reporting_manager_email") or str(matched_user.get("reporting_manager_email") or "").lower().strip()

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
        mobile_val = str(data.get("mobile") or data.get("phone") or data.get("contact_phone") or "")
        email_val = str(data.get("email") or data.get("contact_email") or "")
        city_val = str(data.get("city") or "Chennai")
        val_str = str(data.get("expected_value") or data.get("value") or "450000").replace("₹", "").replace(",", "").strip()

        product_val = str(data.get("product_name") or data.get("product") or data.get("productRequirement") or "TwiteConnect CRM").strip()

        notes_raw = str(data.get("notes") or data.get("remarks") or "New lead added")
        category_val = str(data.get("category") or data.get("lead_type") or "Warm").strip().title()
        full_notes = f"{notes_raw} | Product: {product_val} | AssignedTo: {assigned_to_raw} | Email: {assigned_to_email} | EMP: {employee_code} | Manager: {mgr_email} | Category: {category_val}"

        # assigned_to in Supabase is UUID column!
        assigned_to_uuid = assigned_user_id if (assigned_user_id and len(assigned_user_id) == 36 and "-" in assigned_user_id) else None

        payload = {
            "lead_id": lead_id,
            "lead_number": lead_num,
            "company_name": company_val,
            "contact_person": person_val,
            "contact_name": person_val,
            "mobile": mobile_val,
            "contact_phone": mobile_val,
            "email": email_val if email_val else None,
            "contact_email": email_val if email_val else None,
            "city": city_val,
            "address": data.get("address") or city_val,
            "notes": full_notes,
            "remarks": full_notes,
            "assigned_to": assigned_to_uuid,
            "created_by": assigned_to_uuid,
            "is_active": True,
        }
        if val_str.isdigit():
            payload["expected_value"] = float(val_str)

        logger.info(f"[CRM INSERT REQUEST] Attempting insert into crm.leads with payload: {payload}")

        # 1. Primary: crm.leads
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
            logger.debug(f"crm.leads insert notice: {e}")

        # 2. Fallback: public.leads table
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
            logger.error(f"Error creating lead in public.leads: {e}")

        payload["id"] = lead_id
        payload["company"] = company_val
        payload["person"] = person_val
        payload["assigned_to"] = assigned_to_raw
        payload["assigned_to_email"] = assigned_to_email
        payload["employee_code"] = employee_code
        _in_memory_leads.append(payload)
        return payload

    def update_lead(self, lead_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        for payload in [updates, {k: v for k, v in updates.items() if v is not None}]:
            try:
                res = self.helper.table(SchemaEnum.CRM, "leads").update(payload).eq("id", lead_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                try:
                    res = self.supabase.table("leads").update(payload).eq("id", lead_id).execute()
                    if res.data and len(res.data) > 0:
                        return res.data[0]
                except Exception as e:
                    logger.warning(f"Lead update attempt failed: {e}")

        for lead in _in_memory_leads:
            if str(lead.get("id")) == str(lead_id):
                lead.update(updates)
                return lead

        return {}

    def get_team_leads(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        params = params or {}
        try:
            # 1. Fetch all leads from Supabase / Memory
            all_leads = self.get_all_leads(user_payload=user_payload)

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

                filtered.append(l)

            # Calculate Summary Metrics
            hot_count = len([x for x in (all_leads or []) if isinstance(x, dict) and str(x.get("category") or x.get("priority") or "").lower() == "hot"])
            warm_count = len([x for x in (all_leads or []) if isinstance(x, dict) and str(x.get("category") or x.get("priority") or "").lower() == "warm"])
            cold_count = len([x for x in (all_leads or []) if isinstance(x, dict) and str(x.get("category") or x.get("priority") or "").lower() == "cold"])
            converted_count = len([x for x in (all_leads or []) if isinstance(x, dict) and "convert" in str(x.get("status") or "").lower()])
            lost_count = len([x for x in (all_leads or []) if isinstance(x, dict) and "lost" in str(x.get("status") or "").lower()])

            page = int(params.get("page") or 1)
            limit = int(params.get("limit") or 50)
            start = (page - 1) * limit
            end = start + limit
            paginated = filtered[start:end]

            return {
                "summary": {
                    "total_leads": len(all_leads or []),
                    "hot_leads": hot_count,
                    "warm_leads": warm_count,
                    "cold_leads": cold_count,
                    "converted_leads": converted_count,
                    "lost_leads": lost_count,
                    "today_leads": len(all_leads or []),
                    "month_leads": len(all_leads or []),
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
        leads = self.get_all_leads()
        for lead in leads:
            if str(lead.get("id")) == str(lead_id):
                return lead
        return None
