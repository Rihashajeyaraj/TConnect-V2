from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_visits: List[Dict[str, Any]] = []


class VisitRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_visits(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()
        user_name = str((user_payload or {}).get("name") or "").strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")

        visits = []
        try:
            res = self.supabase.schema("field_management").table("visits").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                visits = res.data
        except Exception as e:
            logger.debug(f"field_management.visits fetch notice: {e}")

        if not visits:
            try:
                res = self.supabase.table("visits").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    visits = res.data
            except Exception as e:
                logger.warning(f"Failed fetching visits from public.visits: {e}")

        if not visits:
            visits = _in_memory_visits

        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            visits = [v for v in visits if is_record_accessible(v, allowed)]

        return visits

    def create_visit(self, data: Dict[str, Any]) -> Dict[str, Any]:
        visit_id = data.get("id") or data.get("visit_id") or str(uuid.uuid4())
        lead_id = data.get("lead_id") or data.get("lead_code") or f"LD-{str(uuid.uuid4())[:6].upper()}"
        now_iso = datetime.utcnow().isoformat()

        se_name = str(data.get("employee_name") or data.get("assigned_to") or data.get("assignedTo") or data.get("executive") or "Sales Executive")
        se_email = str(data.get("employee_email") or data.get("assigned_to_email") or data.get("assignedToEmail") or "")
        emp_id = str(data.get("employee_id") or data.get("employee_code") or data.get("visitor_id") or "")
        emp_phone = str(data.get("employee_phone") or data.get("phone") or "")

        customer_name = str(data.get("customer_name") or data.get("customerName") or data.get("company") or data.get("customer") or data.get("client") or "Prospect Client")
        raw_cust_id = data.get("customer_id") or data.get("customerId")
        customer_id = str(raw_cust_id) if (raw_cust_id and len(str(raw_cust_id)) == 36 and "-" in str(raw_cust_id)) else None

        latitude = data.get("latitude") or data.get("gps_lat") or data.get("lat")
        longitude = data.get("longitude") or data.get("gps_lng") or data.get("lng")

        # Resolve user's reporting manager email
        mgr_email = str(data.get("reporting_manager_email") or "").lower().strip()
        if not mgr_email and (se_email or emp_id):
            try:
                from app.modules.users.repository import UserRepository
                all_u = UserRepository().get_all_users()
                for u in all_u:
                    e_mail = str(u.get("email") or "").lower().strip()
                    e_code = str(u.get("employee_code") or u.get("employee_id") or "").strip()
                    if (se_email and e_mail == se_email.lower().strip()) or (emp_id and e_code == emp_id):
                        mgr_email = str(u.get("reporting_manager_email") or "").lower().strip()
                        break
            except Exception:
                pass

        loc_str = str(data.get("location") or data.get("address") or data.get("location_name") or "Chennai Site")
        notes_str = str(data.get("notes") or data.get("discussion_summary") or data.get("remarks") or "Client Visit")
        full_notes = f"{notes_str} | Executive: {se_name} | Email: {se_email} | EMP: {emp_id} | Manager: {mgr_email}"

        payload = {
            "visit_id": visit_id,
            "employee_id": emp_id if emp_id else None,
            "employee_name": se_name,
            "employee_phone": emp_phone if emp_phone else None,
            "customer_id": customer_id,
            "customer_name": customer_name,
            "location": loc_str,
            "notes": full_notes,
            "status": data.get("status") or data.get("visit_status") or "SCHEDULED",
            "visit_date": data.get("visit_date") or data.get("date") or now_iso[:10],
            "visit_time": data.get("visit_time") or data.get("time") or "10:00 AM",
            "check_in_time": data.get("check_in_time") or None,
            "check_out_time": data.get("check_out_time") or None,
            "created_at": now_iso,
        }
        if latitude is not None:
            try:
                payload["latitude"] = float(latitude)
            except Exception:
                pass
        if longitude is not None:
            try:
                payload["longitude"] = float(longitude)
            except Exception:
                pass

        logger.info(f"[VISIT INSERT REQUEST] Attempting insert into field_management.visits with payload: {payload}")

        # 1. Primary: field_management.visits
        try:
            res = self.supabase.schema("field_management").table("visits").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[VISIT INSERT SUCCESS] Saved visit in field_management.visits: {res.data[0]}")
                out_visit = res.data[0]
                out_visit["id"] = out_visit.get("visit_id") or visit_id
                out_visit["customer"] = customer_name
                out_visit["client"] = customer_name
                out_visit["executive"] = se_name
                out_visit["assignedToEmail"] = se_email
                return out_visit
        except Exception as e:
            logger.debug(f"field_management.visits insert notice: {e}")

        # 2. Fallback: public.visits
        try:
            res = self.supabase.table("visits").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[VISIT INSERT SUCCESS] Saved visit in public.visits: {res.data[0]}")
                out_visit = res.data[0]
                out_visit["id"] = out_visit.get("visit_id") or visit_id
                out_visit["customer"] = customer_name
                out_visit["client"] = customer_name
                out_visit["executive"] = se_name
                out_visit["assignedToEmail"] = se_email
                return out_visit
        except Exception as e:
            logger.error(f"Error creating visit in public.visits: {e}")

        payload["id"] = visit_id
        payload["customer"] = customer_name
        payload["client"] = customer_name
        payload["executive"] = se_name
        payload["assignedToEmail"] = se_email
        _in_memory_visits.append(payload)
        return payload

    def complete_visit(self, visit_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        updates["status"] = "COMPLETED"
        updates["visit_status"] = "COMPLETED"
        updates["check_out_time"] = updates.get("check_out_time") or datetime.utcnow().isoformat()

        # Try to update field_management.visits first
        try:
            res = self.supabase.schema("field_management").table("visits").update(updates).eq("id", visit_id).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Visit {visit_id} completed in field_management.visits")
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("visits").update(updates).eq("id", visit_id).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"Visit {visit_id} completed in public.visits")
                    return res.data[0]
            except Exception as e:
                logger.warning(f"visits complete update failed: {e}")

        # Try in-memory
        for v in _in_memory_visits:
            if str(v.get("id")) == str(visit_id) or str(v.get("visit_id")) == str(visit_id):
                v.update(updates)
                return v

        return self.create_visit({"id": visit_id, **updates})

    def get_visit_by_id(self, visit_id: str) -> Optional[Dict[str, Any]]:
        visits = self.get_all_visits()
        for v in visits:
            if str(v.get("id")) == str(visit_id) or str(v.get("visit_id")) == str(visit_id):
                return v
        return None

    def get_team_audit_visits(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        params = params or {}
        all_visits = self.get_all_visits(user_payload=user_payload)

        se_filter = str(params.get("sales_executive_id") or params.get("executive") or "").lower().strip()
        visit_status_filter = str(params.get("visit_status") or params.get("status") or "").lower().strip()
        lead_status_filter = str(params.get("lead_status") or "").lower().strip()
        priority_filter = str(params.get("priority") or "").lower().strip()
        search_filter = str(params.get("search") or "").lower().strip()

        filtered = []
        for v in all_visits:
            if not v:
                continue

            if se_filter and se_filter != "all":
                v_se_email = str(v.get("assigned_to_email") or v.get("assignedToEmail") or v.get("email") or "").lower().strip()
                v_se_name = str(v.get("assigned_to") or v.get("assignedTo") or v.get("executive") or "").lower().strip()
                v_se_code = str(v.get("employee_id") or v.get("employee_code") or "").lower().strip()

                se_clean = se_filter.split('@')[0] if '@' in se_filter else se_filter
                se_clean = se_clean.replace('-', '').replace('_', '')

                matches_se = (
                    v_se_email == se_filter
                    or v_se_name == se_filter
                    or v_se_code == se_filter
                    or (len(se_clean) >= 2 and (se_clean in v_se_email or se_clean in v_se_name or se_clean in v_se_code))
                )
                if not matches_se:
                    continue

            if visit_status_filter and visit_status_filter != "all":
                v_st = str(v.get("visit_status") or v.get("status") or "").lower().strip()
                if visit_status_filter not in v_st:
                    continue

            if lead_status_filter and lead_status_filter != "all":
                l_st = str(v.get("lead_status") or "").lower().strip()
                if lead_status_filter not in l_st:
                    continue

            if priority_filter and priority_filter != "all":
                pr = str(v.get("lead_priority") or v.get("priority") or "").lower().strip()
                if priority_filter not in pr:
                    continue

            if search_filter:
                c_name = str(v.get("customer_name") or v.get("company") or v.get("title") or "").lower()
                poc = str(v.get("poc_name") or v.get("contact_person") or "").lower()
                v_id = str(v.get("visit_id") or v.get("id") or "").lower()
                l_id = str(v.get("lead_id") or v.get("lead_code") or "").lower()
                se_n = str(v.get("assigned_to") or v.get("executive") or "").lower()

                if not (search_filter in c_name or search_filter in poc or search_filter in v_id or search_filter in l_id or search_filter in se_n):
                    continue

            filtered.append(v)

        # Compute 9 Top KPI metrics
        scheduled_today = len([x for x in all_visits if "schedule" in str(x.get("status") or x.get("visit_status") or "").lower()])
        completed_today = len([x for x in all_visits if "complete" in str(x.get("status") or x.get("visit_status") or "").lower()])
        pending_count = len([x for x in all_visits if "pending" in str(x.get("status") or x.get("visit_status") or "").lower() or "check" in str(x.get("status") or "").lower()])
        missed_count = len([x for x in all_visits if "miss" in str(x.get("status") or x.get("visit_status") or "").lower() or "cancel" in str(x.get("status") or "").lower()])
        converted_count = len([x for x in all_visits if "convert" in str(x.get("lead_status") or "").lower()])
        followup_count = len([x for x in all_visits if "follow" in str(x.get("lead_status") or "").lower()])
        hot_count = len([x for x in all_visits if "hot" in str(x.get("lead_priority") or x.get("priority") or "").lower()])
        warm_count = len([x for x in all_visits if "warm" in str(x.get("lead_priority") or x.get("priority") or "").lower()])
        cold_count = len([x for x in all_visits if "cold" in str(x.get("lead_priority") or x.get("priority") or "").lower()])

        page = int(params.get("page") or 1)
        limit = int(params.get("limit") or 50)
        start = (page - 1) * limit
        end = start + limit
        paginated = filtered[start:end]

        return {
            "summary": {
                "scheduled_today": scheduled_today,
                "completed_today": completed_today,
                "pending_visits": pending_count,
                "missed_visits": missed_count,
                "converted_customers": converted_count,
                "followups": followup_count,
                "hot_leads": hot_count,
                "warm_leads": warm_count,
                "cold_leads": cold_count,
            },
            "visits": paginated,
            "total": len(filtered),
            "page": page,
            "limit": limit,
        }
