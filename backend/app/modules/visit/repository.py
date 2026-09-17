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

    def _standardize_visit(self, v: Dict[str, Any]) -> Dict[str, Any]:
        if not v:
            return {}
        row = dict(v)
        # Expose standard field names for frontend compatibility
        row["customer_name"] = row.get("client_name") or row.get("company_name") or row.get("customer_name") or "Prospect Client"
        row["customer"] = row["customer_name"]
        row["client"] = row["customer_name"]
        row["company"] = row.get("company_name") or row["customer_name"]
        row["assigned_to_email"] = row.get("assigned_to_email")
        row["assignedToEmail"] = row.get("assigned_to_email")
        row["assigned_to"] = row.get("employee_name") or row.get("assigned_to") or row.get("executive") or "Sales Executive"
        row["executive"] = row["assigned_to"]
        row["lead_number"] = row.get("lead_number") or row.get("lead_id") or ""
        row["leadNumber"] = row.get("lead_number") or row.get("lead_id") or ""
        row["lead_id"] = row.get("lead_id") or row.get("lead_number") or ""

        # ── Purpose & Products Discussed ──────────────────────────────────────
        purpose_val = row.get("purpose") or row.get("product") or row.get("products_discussed") or "Site Visit & Demo"
        row["product"] = purpose_val
        row["purpose"] = purpose_val
        row["products_discussed"] = purpose_val
        row["visit_purpose"] = purpose_val

        # ── Location & Address ────────────────────────────────────────────────
        loc_val = row.get("location") or row.get("address") or row.get("check_in_address") or "Chennai"
        row["location"] = loc_val
        row["address"] = loc_val
        row["gps_location"] = loc_val

        row["remarks"] = row.get("remarks") or row.get("notes") or ""
        row["notes"] = row.get("notes") or row.get("remarks") or ""
        row["discussion_summary"] = row["remarks"] or purpose_val

        # ── Scheduled Visit Date (preferred/scheduled date, NOT created_at) ────
        notes_str = str(row.get("notes") or "")
        raw_sched_date = row.get("visit_date") or row.get("date") or row.get("scheduled_date") or row.get("scheduledDate")
        if not raw_sched_date and "Visit Date:" in notes_str:
            try:
                raw_sched_date = notes_str.split("Visit Date:")[1].split("|")[0].strip()
            except Exception:
                pass

        # Fallback to created_at or today if raw_sched_date is missing
        if not raw_sched_date:
            raw_sched_date = row.get("created_at") or datetime.utcnow().strftime("%Y-%m-%d")

        if raw_sched_date:
            raw_str = str(raw_sched_date).strip().split("T")[0].split(" ")[0]
            if "-" in raw_str and len(raw_str) == 10:
                parts = raw_str.split("-")
                if len(parts) == 3 and len(parts[0]) == 4:
                    formatted_date = f"{parts[0]}-{parts[1]}-{parts[2]}"
                else:
                    formatted_date = raw_str
            elif "/" in raw_str:
                parts = raw_str.split("/")
                if len(parts) == 3:
                    if len(parts[2]) == 4:
                        formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
                    else:
                        formatted_date = f"{parts[0]}-{parts[1]}-{parts[2]}"
                else:
                    formatted_date = raw_str
            else:
                formatted_date = raw_str
        else:
            formatted_date = datetime.utcnow().strftime("%Y-%m-%d")

        row["created_at"] = row.get("created_at")
        row["visit_date"] = formatted_date
        row["date"] = formatted_date
        row["scheduledDate"] = formatted_date

        # ── Scheduled Visit Time ──────────────────────────────────────────────
        stored_time = row.get("visit_time") or row.get("time") or row.get("scheduled_time") or row.get("scheduledTime")
        if not stored_time and "Visit Time:" in notes_str:
            try:
                stored_time = notes_str.split("Visit Time:")[1].split("|")[0].strip()
            except Exception:
                pass
        row["visit_time"] = stored_time or "10:00 AM"
        row["time"] = row["visit_time"]
        row["scheduledTime"] = row["visit_time"]

        row["check_in_time"] = row.get("check_in_time")
        row["check_out_time"] = row.get("check_out_time")

        return row

    def get_all_visits(self, user_payload: Dict[str, Any] = None, page: Optional[int] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)

        # ── P1 True DB Pagination & SQL Security Scoping Path ──
        if page is not None and limit is not None and page > 0 and limit > 0:
            limit = min(limit, 100)
            offset = (page - 1) * limit
            visits = []
            cols = "id, visit_id, lead_id, customer_id, title, visitor_name, employee_code, visit_date, check_in_time, check_out_time, status, created_at"
            for schema_name in [SchemaEnum.VISIT.value, "public"]:
                try:
                    q = self.supabase.schema(schema_name).table("visits").select(cols) if schema_name != "public" else self.supabase.table("visits").select(cols)
                    if allowed is not None:
                        conds = []
                        if allowed.get("emails"):
                            em_list = [f'"{e}"' for e in allowed["emails"] if e]
                            if em_list:
                                conds.append(f"visitor_email.in.({','.join(em_list)})")
                        if allowed.get("codes"):
                            cd_list = [f'"{c}"' for c in allowed["codes"] if c]
                            if cd_list:
                                conds.append(f"employee_code.in.({','.join(cd_list)})")
                        if conds:
                            q = q.or_(",".join(conds))
                    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
                    if res.data:
                        visits = [self._standardize_visit(v) for v in res.data]
                        break
                except Exception as e:
                    logger.debug(f"P1 DB visits query fetch notice in {schema_name}: {e}")

            if not visits:
                all_visits = self._fetch_all_visits_unscoped()
                res = [v for v in all_visits if is_record_accessible(v, allowed)] if allowed else list(all_visits)
                return res[offset : offset + limit]

            scoped = [v for v in visits if is_record_accessible(v, allowed)] if allowed else visits
            return scoped

        # ── Unpaginated Fallback / Lookup Path ──
        all_visits = self._fetch_all_visits_unscoped()
        if allowed is not None:
            return [v for v in all_visits if is_record_accessible(v, allowed)]
        return list(all_visits)

    def _fetch_all_visits_unscoped(self) -> List[Dict[str, Any]]:
        visits = []
        try:
            res = self.supabase.schema(SchemaEnum.VISIT.value).table("visits").select("*").execute()
            if res.data is not None and len(res.data) > 0:
                visits = [self._standardize_visit(v) for v in res.data]
        except Exception as e:
            logger.debug(f"visit.visits fetch notice: {e}")

        if not visits:
            try:
                res = self.supabase.table("visits").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    visits = [self._standardize_visit(v) for v in res.data]
            except Exception as e:
                logger.warning(f"Failed fetching visits from public.visits: {e}")

        if not visits:
            visits = [self._standardize_visit(v) for v in _in_memory_visits]
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

        lead_id = str(data.get("lead_number") or data.get("leadNumber") or data.get("lead_id") or data.get("lead_code") or f"LD-{str(uuid.uuid4())[:6].upper()}")
        loc_str = str(data.get("location") or data.get("address") or data.get("location_name") or "Chennai Site")
        product_str = str(data.get("product") or data.get("product_name") or data.get("purpose") or "Site Visit / Product Demo")
        remarks_str = str(data.get("remarks") or data.get("notes") or data.get("discussion_summary") or "Site Visit Scheduled")
        v_date = data.get("visit_date") or data.get("date") or data.get("scheduled_time")
        v_date_clean = None
        if v_date:
            v_date_str = str(v_date).strip()
            if "/" in v_date_str:
                parts = v_date_str.split("/")
                if len(parts) == 3:
                    if len(parts[2]) == 4:
                        v_date_clean = f"{parts[2]}-{parts[1]}-{parts[0]}"
                    elif len(parts[0]) == 4:
                        v_date_clean = f"{parts[0]}-{parts[1]}-{parts[2]}"
            else:
                v_date_clean = v_date_str.split("T")[0].split(" ")[0]
        if not v_date_clean:
            v_date_clean = now_iso.split("T")[0]

        v_time = data.get("visit_time") or data.get("time") or "10:00 AM"
        full_notes = f"{remarks_str} | Visit Date: {v_date_clean} | Visit Time: {v_time} | Product: {product_str} | Executive: {se_name} | Email: {se_email} | EMP: {emp_id}"

        payload = {
            "id": visit_id,
            "visit_id": visit_id,
            "lead_id": lead_id,
            "employee_id": emp_id if emp_id else None,
            "employee_name": se_name,
            "client_name": customer_name,
            "company_name": data.get("company_name") or data.get("company") or customer_name,
            "assigned_to_email": se_email if se_email else None,
            "purpose": product_str,
            "visit_date": v_date_clean,
            "visit_time": v_time,
            "status": data.get("status") or data.get("visit_status") or "SCHEDULED",
            "location": loc_str,
            "notes": full_notes,
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

        print("[VISIT REPOSITORY] schema=field_management")
        print("[VISIT REPOSITORY] table=visits")
        print("[VISIT REPOSITORY] final payload:", payload)

        try:
            res = self.supabase.schema("field_management").table("visits").insert(payload).execute()
            print("[VISIT REPOSITORY] Supabase response:", res.data)
            if res.data and len(res.data) > 0:
                logger.info(f"[VISIT INSERT SUCCESS] Saved visit in field_management.visits: {res.data[0]}")
                return self._standardize_visit(res.data[0])
            else:
                raise RuntimeError("No data returned from database insert operation.")
        except Exception as e:
            print("[VISIT REPOSITORY] Supabase exception, trying fallback to public.visits:", repr(e))
            try:
                # Fallback to public schema visits table
                public_payload = {
                    "id": visit_id,
                    "visit_id": visit_id,
                    "employee_id": emp_id if emp_id else None,
                    "employee_name": se_name,
                    "employee_phone": emp_phone,
                    "customer_id": customer_id,
                    "customer_name": customer_name,
                    "location": loc_str,
                    "notes": full_notes,
                    "status": data.get("status") or "SCHEDULED",
                    "visit_date": v_date_clean,
                    "visit_time": v_time,
                    "created_at": now_iso,
                }
                if latitude is not None:
                    public_payload["latitude"] = float(latitude)
                if longitude is not None:
                    public_payload["longitude"] = float(longitude)

                res_pub = self.supabase.table("visits").insert(public_payload).execute()
                if res_pub.data and len(res_pub.data) > 0:
                    logger.info(f"[VISIT INSERT SUCCESS] Saved fallback visit in public.visits: {res_pub.data[0]}")
                    return self._standardize_visit(res_pub.data[0])
            except Exception as ex_pub:
                logger.error(f"Fallback insert to public.visits failed: {ex_pub}")

            # Try minimal payload in field_management schema as last resort
            try:
                minimal_payload = {
                    "id": visit_id,
                    "visit_id": visit_id,
                    "lead_id": lead_id,
                    "employee_name": se_name,
                    "client_name": customer_name,
                    "purpose": product_str,
                    "visit_date": v_date_clean,
                    "visit_time": v_time,
                    "status": data.get("status") or "SCHEDULED",
                    "location": loc_str,
                    "notes": full_notes,
                    "created_at": now_iso,
                }
                res_min = self.supabase.schema("field_management").table("visits").insert(minimal_payload).execute()
                if res_min.data and len(res_min.data) > 0:
                    logger.info(f"[VISIT INSERT SUCCESS] Saved minimal fallback visit: {res_min.data[0]}")
                    return self._standardize_visit(res_min.data[0])
            except Exception as ex_min:
                logger.error(f"Fallback insert to field_management minimal failed: {ex_min}")

            logger.warning(f"All database insert attempts failed for visit '{visit_id}'. Saving to in-memory fallback.")
            std_payload = self._standardize_visit(payload)
            _in_memory_visits.append(std_payload)
            return std_payload

    def complete_visit(self, visit_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        updates["status"] = "COMPLETED"
        updates["visit_status"] = "COMPLETED"
        updates["check_out_time"] = updates.get("check_out_time") or datetime.utcnow().isoformat()

        # Try to update field_management.visits first
        try:
            res = self.supabase.schema(SchemaEnum.VISIT.value).table("visits").update(updates).eq("id", visit_id).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Visit {visit_id} completed in field_management.visits")
                return self._standardize_visit(res.data[0])
        except Exception:
            try:
                res = self.supabase.table("visits").update(updates).eq("id", visit_id).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"Visit {visit_id} completed in public.visits")
                    return self._standardize_visit(res.data[0])
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

            # Date range filter — compare against SCHEDULED visit_date (not created_at)
            from_date = params.get("from_date")
            to_date = params.get("to_date")
            # v.visit_date is now in DD/MM/YYYY format — convert to ISO for comparison
            v_date_str = str(v.get("visit_date") or v.get("date") or "")
            if (from_date or to_date) and v_date_str:
                # Remove time part if any
                v_date = v_date_str.split("T")[0].split(" ")[0].strip()
                # Convert DD/MM/YYYY -> YYYY-MM-DD
                if "/" in v_date:
                    parts = v_date.split("/")
                    if len(parts) == 3:
                        if len(parts[2]) == 4:  # DD/MM/YYYY
                            v_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
                        elif len(parts[0]) == 4:  # YYYY/MM/DD
                            v_date = f"{parts[0]}-{parts[1]}-{parts[2]}"
                if from_date and v_date < from_date:
                    continue
                if to_date and v_date > to_date:
                    continue
            elif (from_date or to_date) and not v_date_str:
                # Visit has no scheduled date — skip in date-filtered views
                continue

            filtered.append(v)

        # Compute 9 Top KPI metrics dynamically from the filtered list
        scheduled_today = len([x for x in filtered if "schedule" in str(x.get("status") or x.get("visit_status") or "").lower()])
        completed_today = len([x for x in filtered if "complete" in str(x.get("status") or x.get("visit_status") or "").lower()])
        pending_count = len([x for x in filtered if "pending" in str(x.get("status") or x.get("visit_status") or "").lower() or "check" in str(x.get("status") or "").lower()])
        missed_count = len([x for x in filtered if "miss" in str(x.get("status") or x.get("visit_status") or "").lower() or "cancel" in str(x.get("status") or "").lower()])
        converted_count = len([x for x in filtered if "convert" in str(x.get("lead_status") or "").lower()])
        followup_count = len([x for x in filtered if "follow" in str(x.get("lead_status") or "").lower()])
        hot_count = len([x for x in filtered if "hot" in str(x.get("lead_priority") or x.get("priority") or "").lower()])
        warm_count = len([x for x in filtered if "warm" in str(x.get("lead_priority") or x.get("priority") or "").lower()])
        cold_count = len([x for x in filtered if "cold" in str(x.get("lead_priority") or x.get("priority") or "").lower()])

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
