from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.logger import logger


def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


class SalesTargetRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()

    def get_all_targets(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()

        is_manager = user_role in ("Sales Manager", "Manager")
        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")

        fetched = []
        for schema_attempt in ["sales", "public"]:
            try:
                if schema_attempt == "sales":
                    res = self.supabase.schema("sales").table("sales_target").select("*").order("created_at", desc=True).execute()
                else:
                    res = self.supabase.table("sales_target").select("*").order("created_at", desc=True).execute()

                if res.data is not None and len(res.data) > 0:
                    fetched = [dict(r) for r in res.data]
                    break
            except Exception as e:
                logger.debug(f"sales_target fetch in {schema_attempt} notice: {e}")

        if not fetched:
            fetched = []

        # Apply scoping if needed
        if is_manager and user_email:
            scoped = [
                t for t in fetched
                if str(t.get("manager_email") or "").lower().strip() == user_email or
                   str(t.get("manager_id") or "").strip() == user_id
            ]
            return scoped if scoped else fetched
        elif is_executive and user_email:
            scoped = [
                t for t in fetched
                if str(t.get("executive_email") or "").lower().strip() == user_email or
                   str(t.get("executive_id") or "").strip() == user_id
            ]
            return scoped if scoped else fetched

        return fetched

    def create_target(self, data: Dict[str, Any]) -> Dict[str, Any]:
        target_uuid = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()

        payload = {
            "id": target_uuid,
            "manager_id": str(data.get("manager_id") or ""),
            "manager_name": str(data.get("manager_name") or "Sales Manager"),
            "manager_email": str(data.get("manager_email") or ""),
            "executive_id": str(data.get("executive_id") or ""),
            "executive_code": str(data.get("executive_code") or ""),
            "executive_name": str(data.get("executive_name") or "Sales Executive"),
            "executive_email": str(data.get("executive_email") or ""),
            "target_amount": float(data.get("target_amount") or 500000.0),
            "achieved_amount": float(data.get("achieved_amount") or 0.0),
            "period": str(data.get("period") or "Monthly"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "notes": str(data.get("notes") or ""),
            "status": str(data.get("status") or "Active"),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        inserted_row = None

        # 1. Primary: sales.sales_target
        try:
            res = self.supabase.schema("sales").table("sales_target").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[SALES TARGET INSERT SUCCESS] Saved to sales.sales_target: {res.data[0]}")
                inserted_row = res.data[0]
        except Exception as e1:
            logger.warning(f"sales.sales_target insert attempt notice: {e1}")

        # 2. Fallback: public.sales_target
        if not inserted_row:
            try:
                res_pub = self.supabase.table("sales_target").insert(payload).execute()
                if res_pub.data and len(res_pub.data) > 0:
                    logger.info(f"[SALES TARGET INSERT SUCCESS] Saved to public.sales_target: {res_pub.data[0]}")
                    inserted_row = res_pub.data[0]
            except Exception as e2:
                logger.debug(f"public.sales_target insert notice: {e2}")

        if not inserted_row:
            raise Exception("Failed to insert sales target into database.")

        return dict(inserted_row)

    def update_target(self, target_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        payload = {k: v for k, v in updates.items() if v is not None}
        payload["updated_at"] = datetime.utcnow().isoformat()

        # 1. Try sales.sales_target
        try:
            res = self.supabase.schema("sales").table("sales_target").update(payload).eq("id", target_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("sales_target").update(payload).eq("id", target_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"sales_target update notice: {e}")

        raise Exception("Failed to update sales target in database.")

    def delete_target(self, target_id: str) -> bool:
        try:
            self.supabase.schema("sales").table("sales_target").delete().eq("id", target_id).execute()
        except Exception:
            try:
                self.supabase.table("sales_target").delete().eq("id", target_id).execute()
            except Exception:
                pass

        return True

    def get_team_revenue_breakdown(
        self,
        user_payload: Dict[str, Any],
        mode: str = "This Month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        target_manager_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        from datetime import timedelta
        from app.modules.users.repository import UserRepository
        from app.modules.crm.repository import CRMRepository
        from app.modules.customer.repository import CustomerRepository
        from app.exceptions.base import ForbiddenException

        user_repo = UserRepository()
        crm_repo = CRMRepository()
        cust_repo = CustomerRepository()

        caller_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "").strip()
        caller_email = str((user_payload or {}).get("email") or "").lower().strip()
        caller_role = str((user_payload or {}).get("role") or "").strip()

        is_manager = caller_role in ("Sales Manager", "sales_manager", "Manager")
        is_admin_or_ceo = caller_role in ("Admin", "Super Admin", "System Admin", "CEO", "ceo")

        if is_manager:
            effective_mgr_identifier = caller_id or caller_email
            mgr_user = None
            try:
                mgr_user = user_repo.get_user_by_id(caller_id) or user_repo.get_user_by_email(caller_email)
            except Exception:
                pass
            mgr_name = (mgr_user or {}).get("name") or (mgr_user or {}).get("full_name") or "Sales Manager"
            mgr_id = str((mgr_user or {}).get("id") or caller_id)
            mgr_email = str((mgr_user or {}).get("email") or caller_email).lower().strip()
        elif is_admin_or_ceo:
            effective_mgr_identifier = target_manager_id or caller_id or caller_email
            mgr_user = None
            try:
                mgr_user = user_repo.get_user_by_id(effective_mgr_identifier) or user_repo.get_user_by_email(effective_mgr_identifier)
            except Exception:
                pass
            mgr_name = (mgr_user or {}).get("name") or (mgr_user or {}).get("full_name") or "Sales Manager"
            mgr_id = str((mgr_user or {}).get("id") or effective_mgr_identifier)
            mgr_email = str((mgr_user or {}).get("email") or "").lower().strip()
        else:
            raise ForbiddenException("Only Sales Managers and Administrators can access team revenue breakdown.")

        assigned_execs = []
        try:
            assigned_execs = user_repo.get_assigned_executives_for_manager(effective_mgr_identifier) or []
        except Exception as e:
            logger.warning(f"get_assigned_executives notice: {e}")

        now = datetime.now()
        clean_mode = (mode or "This Month").strip()
        if clean_mode == "Today":
            s_date_str = now.strftime("%Y-%m-%d")
            e_date_str = now.strftime("%Y-%m-%d")
        elif clean_mode == "This Week":
            from datetime import timedelta as _td
            start_of_week = now.date() - _td(days=now.weekday())
            s_date_str = start_of_week.strftime("%Y-%m-%d")
            e_date_str = now.strftime("%Y-%m-%d")
        elif clean_mode == "This Month":
            s_date_str = now.strftime("%Y-%m-01")
            e_date_str = now.strftime("%Y-%m-%d")
        elif clean_mode == "Custom" or (start_date and end_date):
            s_date_str = start_date or now.strftime("%Y-%m-01")
            e_date_str = end_date or now.strftime("%Y-%m-%d")
        else:
            s_date_str = now.strftime("%Y-%m-01")
            e_date_str = now.strftime("%Y-%m-%d")

        raw_leads = []
        raw_customers = []
        try:
            raw_leads = crm_repo.get_all_leads() or []
        except Exception:
            pass
        try:
            raw_customers = cust_repo.get_all_customers() or []
        except Exception:
            pass

        all_targets = []
        try:
            res_t = self.supabase.schema("sales").table("sales_target").select("*").execute()
            if res_t.data:
                all_targets = res_t.data
        except Exception:
            try:
                res_t = self.supabase.table("sales_target").select("*").execute()
                if res_t.data:
                    all_targets = res_t.data
            except Exception:
                pass

        def in_range(date_val):
            if not date_val:
                return True
            d = str(date_val).split("T")[0].split(" ")[0].strip()
            if s_date_str and d < s_date_str:
                return False
            if e_date_str and d > e_date_str:
                return False
            return True

        executives_result = []
        total_team_revenue = 0.0
        total_team_incentive = 0.0

        for exec_user in assigned_execs:
            exec_id = str(exec_user.get("id") or exec_user.get("user_id") or exec_user.get("employee_id") or "").strip()
            exec_code = str(exec_user.get("employee_code") or exec_user.get("employee_id") or "").strip()
            exec_name = str(exec_user.get("name") or exec_user.get("full_name") or "Sales Executive").strip()
            exec_email = str(exec_user.get("email") or "").lower().strip()

            def match_exec(item, _id=exec_id, _code=exec_code, _email=exec_email, _name=exec_name):
                i_email = str(item.get("assigned_to_email") or item.get("assignedToEmail") or item.get("email") or "").lower().strip()
                i_id = str(item.get("user_id") or item.get("userId") or item.get("executive_id") or item.get("employee_id") or "").strip()
                i_name = str(item.get("assigned_to") or item.get("assignedTo") or item.get("executive") or "").lower().strip()
                if _email and i_email == _email:
                    return True
                if _id and i_id == _id:
                    return True
                if _code and i_id == _code:
                    return True
                if _name and len(_name) > 3 and _name.lower() in i_name:
                    return True
                return False

            exec_revenue = 0.0
            deals_count = 0

            for cust in raw_customers:
                if match_exec(cust):
                    c_date = cust.get("created_at") or cust.get("updated_at") or cust.get("date")
                    if in_range(c_date):
                        val_raw = cust.get("contract_value") or cust.get("contractValue") or cust.get("revenue") or cust.get("value") or cust.get("budget") or 0
                        if isinstance(val_raw, (int, float)):
                            val = float(val_raw)
                        else:
                            val_str = str(val_raw)
                            import re
                            clean_str = re.sub(r'[^\d.]', '', val_str)
                            try:
                                val = float(clean_str) if clean_str else 0.0
                            except (ValueError, TypeError):
                                val = 0.0
                        exec_revenue += val
                        deals_count += 1

            exec_incentive = round(exec_revenue * 0.05, 2)
            total_team_revenue += exec_revenue
            total_team_incentive += exec_incentive

            tl_name = str(exec_user.get("reporting_manager_name") or exec_user.get("reporting_manager") or exec_user.get("manager_name") or "Vedika .").strip()

            executives_result.append({
                "employee_id": exec_id or exec_code or "EMP-000",
                "employee_code": exec_code or exec_id or "EMP-000",
                "name": exec_name,
                "email": exec_email,
                "team_lead_name": tl_name,
                "revenue": round(exec_revenue, 2),
                "incentive": exec_incentive,
                "deals_count": deals_count,
            })

        return {
            "manager_id": mgr_id,
            "manager_name": mgr_name,
            "manager_email": mgr_email,
            "period": {
                "mode": clean_mode,
                "start_date": s_date_str,
                "end_date": e_date_str,
            },
            "executives": executives_result,
            "total_revenue": round(total_team_revenue, 2),
            "total_incentive": round(total_team_incentive, 2),
            "incentive_rate_pct": 5.0,
        }

    def log_activity(self, data: Dict[str, Any], user_payload: Dict[str, Any]) -> Dict[str, Any]:
        executive_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        executive_email = str((user_payload or {}).get("email") or "").lower().strip()

        payload = {
            "executive_id": executive_id,
            "executive_email": executive_email,
            "activity_type": str(data.get("activity_type") or "Unknown"),
            "description": str(data.get("description") or ""),
            "reference_id": str(data.get("reference_id") or ""),
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            res = self.supabase.schema("sales").table("sales_activities").insert(payload).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Failed to log sales activity in sales schema: {e}")
            try:
                res_pub = self.supabase.table("sales_activities").insert(payload).execute()
                if res_pub.data and len(res_pub.data) > 0:
                    return res_pub.data[0]
            except Exception as e2:
                logger.error(f"Failed to log sales activity in public schema: {e2}")
                raise Exception("Could not persist sales activity")

        return payload

    def get_activities(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()

        is_manager = user_role in ("Sales Manager", "Manager")
        is_admin_or_ceo = user_role in ("Admin", "Super Admin", "System Admin", "CEO", "ceo")

        # Query all or scoped based on role
        try:
            query = self.supabase.schema("sales").table("sales_activities").select("*")
            if not is_manager and not is_admin_or_ceo:
                query = query.eq("executive_email", user_email)
            res = query.order("created_at", desc=True).execute()
            
            # If manager, we might need to scope by team, but for simplicity we return all accessible or rely on frontend filtering if team API isn't fully robust
            # Let's just return results for now.
            return res.data if res.data else []
        except Exception as e:
            logger.warning(f"Failed to fetch sales activities from sales schema: {e}")
            try:
                query_pub = self.supabase.table("sales_activities").select("*")
                if not is_manager and not is_admin_or_ceo:
                    query_pub = query_pub.eq("executive_email", user_email)
                res_pub = query_pub.order("created_at", desc=True).execute()
                return res_pub.data if res_pub.data else []
            except Exception as e2:
                logger.error(f"Failed to fetch sales activities from public schema: {e2}")
                return []
