import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger
from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
_in_memory_eod_reports: List[Dict[str, Any]] = []


def _format_name_with_status(name: str, user_obj: Dict[str, Any] = None) -> str:
    if not user_obj or not name:
        return name
    status = str(user_obj.get("status") or "").strip().title()
    if status in ("Resigned", "Left", "Terminated", "Inactive", "Deactivated", "Disabled") or user_obj.get("is_active") is False:
        tag = f" [{status}]" if status in ("Resigned", "Left", "Terminated") else " [Inactive]"
        if tag not in name:
            return f"{name}{tag}"
    return name


class ReportsRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()
        self._geocoded_cache = {}

    def _reverse_geocode_coords(self, lat, lng) -> Optional[str]:
        if lat is None or lng is None:
            return None
        try:
            lat_f = float(lat)
            lng_f = float(lng)
            
            # Skip default mock / default coordinates if they are exactly the default ones
            # The default coordinates in database checks: 13.0067 and 80.2570
            if abs(lat_f - 13.0067) < 1e-4 and abs(lng_f - 80.2570) < 1e-4:
                return None
            if lat_f == 0.0 or lng_f == 0.0:
                return None
                
            key = f"{round(lat_f, 5)},{round(lng_f, 5)}"
            if key in self._geocoded_cache:
                return self._geocoded_cache[key]
                
            # Instant fallback to avoid blocking HTTP requests in lists and loops
            coords_str = f"Location ({lat_f:.4f}, {lng_f:.4f})"
            self._geocoded_cache[key] = coords_str
            return coords_str
        except Exception as e:
            logger.warning(f"Reverse geocode failed for {lat}, {lng}: {e}")
        return None

    def _safe_count(self, table: str, schema=None) -> int:
        """Safely count rows in a table, returning 0 on any error."""
        try:
            if schema:
                schema_name = schema.value if hasattr(schema, "value") else str(schema)
                res = self.supabase.schema(schema_name).table(table).select("id", count="exact").execute()
            else:
                res = self.supabase.table(table).select("id", count="exact").execute()
            if hasattr(res, "count") and res.count is not None:
                return res.count
            if res.data is not None:
                return len(res.data)
        except Exception:
            try:
                res = self.supabase.table(table).select("id", count="exact").execute()
                if hasattr(res, "count") and res.count is not None:
                    return res.count
                if res.data is not None:
                    return len(res.data)
            except Exception as e:
                logger.debug(f"Count failed for {table}: {e}")
        return 0

    def _safe_fetch(self, table: str, schema=None, filters: dict = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Safely fetch rows from a table."""
        try:
            if schema:
                schema_name = schema.value if hasattr(schema, "value") else str(schema)
                q = self.supabase.schema(schema_name).table(table).select("*").limit(limit)
            else:
                q = self.supabase.table(table).select("*").limit(limit)
            if filters:
                for k, v in filters.items():
                    q = q.eq(k, v)
            res = q.execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                q = self.supabase.table(table).select("*").limit(limit)
                if filters:
                    for k, v in filters.items():
                        q = q.eq(k, v)
                res = q.execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"Fetch failed for {table}: {e}")
        return []

    def _safe_fetch_cols(self, table: str, cols: str = "*", schema=None, filters: dict = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Safely fetch rows with explicit column selection."""
        try:
            if schema:
                schema_name = schema.value if hasattr(schema, "value") else str(schema)
                q = self.supabase.schema(schema_name).table(table).select(cols).limit(limit)
            else:
                q = self.supabase.table(table).select(cols).limit(limit)
            if filters:
                for k, v in filters.items():
                    q = q.eq(k, v)
            res = q.execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                q = self.supabase.table(table).select(cols).limit(limit)
                if filters:
                    for k, v in filters.items():
                        q = q.eq(k, v)
                res = q.execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"Fetch cols failed for {table}: {e}")
        return []

    def get_dashboard_counts(self) -> Dict[str, Any]:
        """Legacy method – basic counts only."""
        counts = {
            "total_leads": 0,
            "total_customers": 0,
            "total_visits": 0,
            "pipeline_value": 0.0,
            "pending_expenses": 0.0
        }
        try:
            leads_res = self.supabase.schema("crm").table("leads").select("id", count="exact").execute()
            if hasattr(leads_res, "count") and leads_res.count is not None:
                counts["total_leads"] = leads_res.count
        except Exception:
            try:
                leads_res = self.supabase.table("leads").select("id", count="exact").execute()
                if hasattr(leads_res, "count") and leads_res.count is not None:
                    counts["total_leads"] = leads_res.count
            except Exception:
                pass
        return counts

    def get_ceo_dashboard_counts(self) -> Dict[str, Any]:
        """Fetch and aggregate complete metrics for the CEO Command Center."""
        try:
            # 1. Fetch tables / repositories
            from app.modules.users.repository import UserRepository
            from app.modules.crm.repository import CRMRepository
            from app.modules.customer.repository import CustomerRepository

            user_repo = UserRepository()
            crm_repo = CRMRepository()
            customer_repo = CustomerRepository()

            all_users = user_repo.get_all_users()
            leads_raw = crm_repo.get_all_leads()
            customers_raw = customer_repo.get_all_customers()

            # Fetch active targets from Supabase sales.sales_target
            sales_targets = []
            try:
                res_tgt = self.supabase.schema("sales").table("sales_target").select("*").execute()
                if res_tgt.data is not None:
                    sales_targets = res_tgt.data
            except Exception as e:
                logger.debug(f"sales.sales_target fetch notice: {e}")
                try:
                    res_tgt = self.supabase.table("sales_target").select("*").execute()
                    if res_tgt.data is not None:
                        sales_targets = res_tgt.data
                except Exception as e2:
                    logger.warning(f"sales_target fallback fetch failed: {e2}")

            # Helper to parse currency/amount strings safely
            def _parse_amount(v):
                if v is None:
                    return 0.0
                if isinstance(v, (int, float)):
                    return float(v)
                s = str(v).replace("₹", "").replace(",", "").replace(" ", "").strip()
                try:
                    return float(s)
                except Exception:
                    return 0.0

            # Comprehensive user lookup maps from Admin portal
            user_map_by_email = {}
            user_map_by_name = {}
            user_map_by_id = {}
            manager_names_map = {}

            for u in all_users:
                u_email = str(u.get("email") or "").lower().strip()
                u_name = str(u.get("name") or u.get("full_name") or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()).strip()
                u_id = str(u.get("id") or u.get("employee_id") or u.get("employee_code") or "").lower().strip()
                u_role = str(u.get("role") or "").lower()

                if u_email:
                    user_map_by_email[u_email] = u
                if u_name:
                    user_map_by_name[u_name.lower()] = u
                if u_id:
                    user_map_by_id[u_id] = u

                if "manager" in u_role or "admin" in u_role or "ceo" in u_role:
                    if u_email:
                        manager_names_map[u_email] = u_name
                    if u_name:
                        manager_names_map[u_name.lower()] = u_name
                    if u_id:
                        manager_names_map[u_id] = u_name

            manager_names_by_email = manager_names_map

            # Enrich leads
            leads = []
            for l in leads_raw:
                row = dict(l)
                # Resolve Category: Hot, Cold, Warm
                cat = str(row.get("category") or "").strip().title()
                if cat not in ("Hot", "Warm", "Cold"):
                    priority = str(row.get("priority") or "").lower()
                    status = str(row.get("status") or "").lower()
                    if "high" in priority or "won" in status or "qualified" in status:
                        cat = "Hot"
                    elif "medium" in priority or "contacted" in status or "opportunity" in status:
                        cat = "Warm"
                    else:
                        cat = "Cold"
                row["category"] = cat

                # Resolve SM and SE Names
                se_email = str(row.get("assigned_to_email") or row.get("sales_executive_email") or "").lower().strip()
                raw_se = row.get("assigned_to") or row.get("sales_executive") or row.get("assignedExecutive") or row.get("accountManager") or ""
                se_user = None
                if se_email and se_email in user_map_by_email:
                    se_user = user_map_by_email[se_email]
                elif raw_se and raw_se.lower().strip() in user_map_by_name:
                    se_user = user_map_by_name[raw_se.lower().strip()]
                elif raw_se and raw_se.lower().strip() in user_map_by_id:
                    se_user = user_map_by_id[raw_se.lower().strip()]

                se_name = se_user.get("name") if se_user else (raw_se or "Direct/Unassigned")
                row["sales_executive"] = se_name
                row["sales_executive_email"] = se_email or (se_user.get("email") if se_user else "")

                sm_email = str(row.get("reporting_manager_email") or row.get("sales_manager_email") or "").lower().strip()
                if not sm_email and se_user:
                    sm_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                row["reporting_manager_email"] = sm_email

                sm_name = manager_names_map.get(sm_email)
                if not sm_name and se_user:
                    sm_name = se_user.get("reporting_manager_name")
                if not sm_name:
                    raw_sm = row.get("sales_manager") or row.get("manager_name") or row.get("manager")
                    if raw_sm and raw_sm.lower().strip() in manager_names_map:
                        sm_name = manager_names_map[raw_sm.lower().strip()]
                    else:
                        sm_name = raw_sm or ("Direct/Unassigned" if not sm_email else sm_email.split("@")[0].replace(".", " ").title())
                row["sales_manager"] = sm_name

                leads.append(row)

            # Enrich customers from all executive and manager records
            customers = []
            seen_cust_keys = set()
            for c in customers_raw:
                row = dict(c)
                cust_name = row.get("name") or row.get("company") or row.get("company_name") or "Customer Account"
                cust_key = str(row.get("id") or row.get("customer_id") or cust_name).lower().strip()
                if cust_key in seen_cust_keys:
                    continue
                seen_cust_keys.add(cust_key)

                # Resolve Sales Executive from Admin users
                se_email = str(row.get("assigned_to_email") or row.get("sales_executive_email") or row.get("executive_email") or "").lower().strip()
                raw_se = row.get("assigned_to") or row.get("sales_executive") or row.get("assignedExecutive") or row.get("accountManager") or row.get("account_manager") or row.get("executive") or ""
                
                se_user = None
                if se_email and se_email in user_map_by_email:
                    se_user = user_map_by_email[se_email]
                elif raw_se and raw_se.lower().strip() in user_map_by_name:
                    se_user = user_map_by_name[raw_se.lower().strip()]
                elif raw_se and raw_se.lower().strip() in user_map_by_id:
                    se_user = user_map_by_id[raw_se.lower().strip()]

                se_name = se_user.get("name") if se_user else (raw_se or "Direct/Unassigned")
                row["sales_executive"] = se_name
                row["sales_executive_email"] = se_email or (se_user.get("email") if se_user else "")

                # Resolve Sales Manager
                sm_email = str(row.get("reporting_manager_email") or row.get("sales_manager_email") or "").lower().strip()
                if not sm_email and se_user:
                    sm_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                row["reporting_manager_email"] = sm_email

                sm_name = manager_names_map.get(sm_email)
                if not sm_name and se_user:
                    sm_name = se_user.get("reporting_manager_name")
                    if not sm_name and "manager" in str(se_user.get("role") or "").lower():
                        sm_name = se_user.get("name")
                if not sm_name:
                    raw_sm = row.get("sales_manager") or row.get("reporting_manager_name") or row.get("manager_name") or row.get("manager")
                    if raw_sm and raw_sm.lower().strip() in manager_names_map:
                        sm_name = manager_names_map[raw_sm.lower().strip()]
                    else:
                        sm_name = raw_sm or ("Direct/Unassigned" if not sm_email else sm_email.split("@")[0].replace(".", " ").title())
                row["sales_manager"] = sm_name

                # Product & Package Tier
                row["product"] = row.get("product") or row.get("packageTier") or row.get("tier") or row.get("product_name") or "Enterprise Plan"

                # Contract Value / Revenue parsing
                val = _parse_amount(row.get("contract_value") or row.get("revenue") or row.get("contractValue") or row.get("annual_revenue") or row.get("value") or row.get("amount") or 0.0)
                row["contract_value"] = val
                row["amount"] = val

                customers.append(row)

            employees = self._safe_fetch_cols("employees", cols="employee_id, is_active, status, joining_date, created_at", schema="hrms", limit=1000)
            if not employees:
                employees = self._safe_fetch_cols("employees", cols="employee_id, is_active, status, joining_date, created_at", limit=1000)

            from app.modules.pipeline.repository import PipelineRepository
            opportunities = PipelineRepository().get_all_opportunities()
            attendance = self._safe_fetch_cols("attendance", cols="date, status, clock_in", limit=1000)
            visits = self._safe_fetch_cols("visits", cols="id, status", schema="field_management", limit=1000)
            settings_list = self._safe_fetch("company_profile", schema="organization", limit=1)
            if not settings_list:
                settings_list = self._safe_fetch("organization_settings", limit=1)

            # 2. Company Details
            org_settings = settings_list[0] if settings_list else {
                "company_name": "TwiteConnect Technologies Pvt. Ltd.",
                "registration_no": "U72200TN2026PTC123456",
                "gst_no": "33AAAAA0000A1Z5",
                "pan_no": "AAAAA1111A",
                "email": "contact@tconnect.com",
                "phone": "+91 98765 43210",
                "address": "Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu",
                "website": "https://twiteconnect.com",
                "logo_url": "",
                "branches": [],
                "departments": []
            }

            # 3. Employee Summary Calculations
            inactive_statuses = ("inactive", "deactivated", "deactive", "disabled", "terminated", "resigned", "left", "suspended")
            total_emp = len(employees)
            active_emp = len([
                e for e in employees 
                if str(e.get("status", "")).lower() not in inactive_statuses 
                and e.get("is_active") is not False 
                and e.get("is_active") != 0 
                and str(e.get("is_active")).lower() != "false"
            ])
            inactive_emp = total_emp - active_emp
            
            # Attendance metrics
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            today_attendance = [a for a in attendance if str(a.get("date", "")) == today_str]
            present_today = len([a for a in today_attendance if str(a.get("status", "")).upper() == "PRESENT"])
            
            # Simulated check-ins
            absent_today = max(0, active_emp - present_today)
            on_leave = len([a for a in today_attendance if str(a.get("status", "")).upper() in ("LEAVE", "ON_LEAVE")])
            late_check_ins = len([a for a in today_attendance if a.get("clock_in") and str(a.get("clock_in"))[11:16] > "09:15"])
            
            # Join date this month
            current_month = datetime.utcnow().strftime("%Y-%m")
            new_emp_this_month = len([
                e for e in employees 
                if e.get("joining_date") and str(e.get("joining_date"))[:7] == current_month
                or e.get("created_at") and str(e.get("created_at"))[:7] == current_month
            ])

            # 4. Customer Summary
            total_cust = len(customers)
            active_cust = len([c for c in customers if str(c.get("status", "")).lower() in ("active", "active customer", "")])
            new_cust = len([c for c in customers if c.get("created_at") and str(c.get("created_at"))[:7] == current_month])
            lost_cust = len([c for c in customers if str(c.get("status", "")).lower() in ("inactive", "lost")])

            # Customer attribution by sales executives and managers
            cust_by_exec = {}
            cust_by_manager = {}
            for c in customers:
                exec_name = c.get("sales_executive") or "Direct/Unassigned"
                mgr_name = c.get("sales_manager") or "Direct/Unassigned"
                cust_by_exec[exec_name] = cust_by_exec.get(exec_name, 0) + 1
                cust_by_manager[mgr_name] = cust_by_manager.get(mgr_name, 0) + 1

            # 5. Lead & Sales Summary
            total_leads = len(leads)
            new_leads = len([l for l in leads if str(l.get("status", "")).upper() in ("NEW", "ASSIGNED")])
            qualified_leads = len([l for l in leads if str(l.get("status", "")).upper() in ("QUALIFIED", "CONTACTED", "INTERESTED")])
            opportunities_count = len(opportunities)
            won_deals = len([o for o in opportunities if str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")])
            lost_deals = len([o for o in opportunities if str(o.get("stage", "")).upper() in ("CLOSED_LOST", "CLOSED LOST", "LOST")])
            
            conversion_rate = round((won_deals / total_leads * 100), 1) if total_leads > 0 else 0.0

            # 6. Revenue Calculations
            # Calculate Total, Monthly, Quarterly, Annual Revenue
            annual_rev = 0.0
            monthly_rev = 0.0
            quarterly_rev = 0.0
            total_rev = 0.0

            this_year = datetime.utcnow().strftime("%Y")
            this_quarter = (datetime.utcnow().month - 1) // 3 + 1
            this_month = datetime.utcnow().strftime("%m")

            rev_by_manager = {}
            rev_by_executive = {}
            rev_by_customer = {}
            rev_by_company = {}
            rev_by_product = {}

            # Process opportunities (excluding those already converted to customers to avoid double counting)
            customer_companies = {str(c.get("company") or c.get("name") or "").lower().strip() for c in customers if c.get("company") or c.get("name")}

            for o in opportunities:
                is_won = str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")
                if not is_won:
                    continue

                cust = o.get("customer_name") or o.get("company") or "Direct"
                if str(cust).lower().strip() in customer_companies:
                    continue
                
                val = float(o.get("value") or o.get("amount") or 0.0)
                created_str = o.get("created_at") or o.get("updated_at") or today_str
                opp_year = created_str[:4]
                opp_month = created_str[5:7]

                # Resolve manager and executive for opportunities
                # transaction-level attribution over assignment
                exec_name = o.get("generated_by_employee_name")
                if not exec_name:
                    exec_email = str(o.get("assigned_to_email") or o.get("owner_email") or "").lower().strip()
                    se_user = user_map_by_email.get(exec_email)
                    exec_name = o.get("assigned_to_name") or o.get("owner_id") or (se_user.get("name") if se_user else None) or o.get("assigned_to") or "Unassigned"
                else:
                    se_user = user_map_by_name.get(exec_name.lower().strip())
                
                sm_email = str(o.get("reporting_manager_email") or "").lower().strip()
                if not sm_email and se_user:
                    sm_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                
                mgr = manager_names_by_email.get(sm_email)
                if not mgr and se_user:
                    mgr = se_user.get("reporting_manager_name")
                if not mgr:
                    mgr = o.get("sales_manager") or o.get("manager_name") or ("Direct/Unassigned" if not sm_email else sm_email.split("@")[0].replace(".", " ").title())
                
                cust = o.get("customer_name") or o.get("company") or "Direct"
                comp = o.get("company") or "Direct"
                prod = o.get("product_name") or o.get("service_type") or "TwiteConnect CRM"

                # Update breakdowns
                rev_by_manager[mgr] = rev_by_manager.get(mgr, 0.0) + val
                rev_by_executive[exec_name] = rev_by_executive.get(exec_name, 0.0) + val
                rev_by_customer[cust] = rev_by_customer.get(cust, 0.0) + val
                rev_by_company[comp] = rev_by_company.get(comp, 0.0) + val
                rev_by_product[prod] = rev_by_product.get(prod, 0.0) + val

                # Update totals
                total_rev += val
                if opp_year == this_year:
                    annual_rev += val
                    if opp_month == this_month:
                        monthly_rev += val
                    
                    try:
                        opp_month_int = int(opp_month)
                        opp_quarter = (opp_month_int - 1) // 3 + 1
                        if opp_quarter == this_quarter:
                            quarterly_rev += val
                    except Exception:
                        pass

            # Process customers
            for c in customers:
                val = float(c.get("contract_value") or 0.0)
                created_str = c.get("created_at") or today_str
                opp_year = created_str[:4]
                opp_month = created_str[5:7]

                exec_name = c.get("generated_by_employee_name") or c.get("original_owner") or c.get("sales_executive") or "Direct/Unassigned"
                se_user = user_map_by_name.get(exec_name.lower().strip())
                if se_user:
                    mgr = se_user.get("reporting_manager_name") or "Direct/Unassigned"
                else:
                    mgr = c.get("sales_manager") or "Direct/Unassigned"

                # Format names with status tags if resigned
                exec_name = _format_name_with_status(exec_name, se_user)
                mgr_user = None
                if se_user and se_user.get("reporting_manager_email"):
                    mgr_user = user_map_by_email.get(str(se_user.get("reporting_manager_email")).lower().strip())
                mgr = _format_name_with_status(mgr, mgr_user)
                cust = c.get("name") or c.get("company") or "Customer Account"
                comp = c.get("company") or "Direct"
                prod = c.get("product") or "TwiteConnect CRM"

                # Update breakdowns
                rev_by_manager[mgr] = rev_by_manager.get(mgr, 0.0) + val
                rev_by_executive[exec_name] = rev_by_executive.get(exec_name, 0.0) + val
                rev_by_customer[cust] = rev_by_customer.get(cust, 0.0) + val
                rev_by_company[comp] = rev_by_company.get(comp, 0.0) + val
                rev_by_product[prod] = rev_by_product.get(prod, 0.0) + val

                # Update totals
                total_rev += val
                if opp_year == this_year:
                    annual_rev += val
                    if opp_month == this_month:
                        monthly_rev += val
                    
                    try:
                        opp_month_int = int(opp_month)
                        opp_quarter = (opp_month_int - 1) // 3 + 1
                        if opp_quarter == this_quarter:
                            quarterly_rev += val
                    except Exception:
                        pass

            # Charts trends from actual database opportunities
            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            monthly_trend = []
            for idx, m in enumerate(months):
                m_str = f"{idx+1:02d}"
                rev_val = sum(
                    float(o.get("value") or 0.0) 
                    for o in opportunities 
                    if str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")
                    and (o.get("created_at") or o.get("updated_at") or today_str)[5:7] == m_str
                )
                target_val = 500000.0
                monthly_trend.append({"month": m, "revenue": rev_val, "target": target_val})

            # Yearly Trend
            this_yr_int = datetime.utcnow().year
            yearly_trend = [
                {"year": str(this_yr_int - 2), "revenue": 0.0, "target": 1000000.0},
                {"year": str(this_yr_int - 1), "revenue": 0.0, "target": 2000000.0},
                {"year": str(this_yr_int), "revenue": total_rev, "target": 3000000.0}
            ]

            # Lead sources counts from real CRM leads
            lead_sources_counts = {}
            for l in leads:
                src = str(l.get("source") or l.get("lead_source") or "Direct/Walk-in").strip().title()
                lead_sources_counts[src] = lead_sources_counts.get(src, 0) + 1
            
            colors = ["#832D51", "#EA6993", "#3a7d63", "#0891b2", "#d97706", "#4f46e5", "#64748b"]
            lead_sources = []
            for idx, (src_name, count) in enumerate(lead_sources_counts.items()):
                lead_sources.append({
                    "name": src_name,
                    "value": count,
                    "color": colors[idx % len(colors)]
                })

            # Team Rank List from real users
            top_managers = []
            top_executives = []

            # Populate managers from actual system managers
            for u in all_users:
                u_role = str(u.get("role") or "").lower()
                u_name = u.get("name") or "Sales Manager"
                if "manager" in u_role:
                    u_rev = rev_by_manager.get(u_name, 0.0)
                    mgr_sales = len([o for o in opportunities if o.get("sales_manager") == u_name and str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")])
                    top_managers.append({
                        "name": u_name,
                        "revenue": u_rev,
                        "sales": mgr_sales,
                        "teamSize": len([e for e in all_users if str(e.get("reporting_manager_name") or "").lower() == u_name.lower()]),
                        "conversionRate": round((mgr_sales / max(1, len(leads))) * 100, 1) if leads else 0.0
                    })

            # Populate executives from actual system executives
            for u in all_users:
                u_role = str(u.get("role") or "").lower()
                u_name = u.get("name") or "Sales Executive"
                if "executive" in u_role:
                    u_rev = rev_by_executive.get(u_name, 0.0)
                    u_leads = len([l for l in leads if str(l.get("sales_executive") or l.get("assigned_to") or "").lower() == u_name.lower()])
                    u_custs = len([c for c in customers if str(c.get("sales_executive") or c.get("assigned_to") or "").lower() == u_name.lower()])
                    top_executives.append({
                        "name": u_name,
                        "leads": u_leads,
                        "visits": len([v for v in visits if str(v.get("sales_executive") or v.get("executive") or "").lower() == u_name.lower()]),
                        "customers": u_custs,
                        "revenue": u_rev,
                        "rating": 5.0
                    })

            # Sort by revenue descending
            top_managers.sort(key=lambda x: x["revenue"], reverse=True)
            top_executives.sort(key=lambda x: x["revenue"], reverse=True)

            # Real pending leaves & permissions
            leave_requests_raw = []
            try:
                from app.modules.attendance.repository import AttendanceRepository
                attendance_repo = AttendanceRepository()
                leave_requests_raw = attendance_repo.get_leave_requests()
            except Exception as e:
                logger.debug(f"Could not load real leave requests: {e}")
                from app.modules.attendance.repository import _in_memory_leave_requests
                leave_requests_raw = list(_in_memory_leave_requests)

            # 1. Employees List
            employees_list = []
            for e in employees:
                status_lower = str(e.get("status") or "").lower().strip()
                is_act = e.get("is_active")
                if status_lower in inactive_statuses or is_act is False or is_act == 0 or str(is_act).lower() == "false":
                    continue
                emp_id = e.get("employee_code") or e.get("employee_id") or e.get("id") or "EMP"
                emp_name = e.get("name") or f"{e.get('first_name', '')} {e.get('last_name', '')}".strip() or e.get("fullName") or "Unnamed Employee"
                emp_role = e.get("role") or e.get("designation") or "Staff"
                employees_list.append({
                    "employee_id": emp_id,
                    "name": emp_name,
                    "role": emp_role
                })

            # 2. Customers List
            customers_list = []
            for c in customers:
                customers_list.append({
                    "id": str(c.get("id") or c.get("customer_id") or ""),
                    "sales_manager": c.get("sales_manager") or "Direct/Unassigned",
                    "sales_executive": c.get("sales_executive") or "Direct/Unassigned",
                    "name": c.get("name") or c.get("company") or "Unnamed Customer",
                    "details": f"Email: {c.get('email', 'N/A')}, Phone: {c.get('phone', 'N/A')}, City: {c.get('city', 'N/A')}",
                    "product": c.get("product") or c.get("product_name") or "TwiteConnect CRM",
                    "amount": float(c.get("contract_value") or 0.0),
                    "date": str(c.get("onboarding_date") or (c.get("created_at")[:10] if c.get("created_at") else today_str)),
                    "onboarding_date": str(c.get("onboarding_date") or (c.get("created_at")[:10] if c.get("created_at") else today_str)),
                    "created_at": c.get("created_at") or today_str,
                })

            # 3. Won Sales Opportunities
            won_opportunities_list = []
            for o in opportunities:
                is_won = str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")
                if not is_won:
                    continue
                val = float(o.get("value") or o.get("amount") or 0.0)
                created_str = o.get("created_at") or o.get("updated_at")
                if not created_str:
                    created_str = today_str
                elif not isinstance(created_str, str):
                    created_str = created_str.isoformat()
                opp_date = created_str[:10]
                
                # Resolve manager and executive
                exec_email = str(o.get("assigned_to_email") or o.get("owner_email") or "").lower().strip()
                se_user = user_map_by_email.get(exec_email)
                exec_name = o.get("assigned_to_name") or o.get("owner_id") or (se_user.get("name") if se_user else None) or o.get("assigned_to") or "Unassigned"
                
                sm_email = str(o.get("reporting_manager_email") or "").lower().strip()
                if not sm_email and se_user:
                    sm_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                
                mgr = manager_names_by_email.get(sm_email)
                if not mgr and se_user:
                    mgr = se_user.get("reporting_manager_name")
                if not mgr:
                    mgr = o.get("sales_manager") or o.get("manager_name") or ("Direct/Unassigned" if not sm_email else sm_email.split("@")[0].replace(".", " ").title())
                
                won_opportunities_list.append({
                    "date": opp_date,
                    "sales_manager": mgr,
                    "sales_executive": exec_name,
                    "client_name_details": f"{o.get('company', 'Direct')} ({o.get('customer_name') or 'N/A'})",
                    "product": o.get("product_name") or o.get("service_type") or "TwiteConnect CRM",
                    "amount": val
                })

            # 4. Revenue Records (dynamic, from real database)
            revenue_records = []
            
            # Won Opportunities
            for o in opportunities:
                is_won = str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")
                if not is_won:
                    continue
                val = float(o.get("value") or o.get("amount") or 0.0)
                if val <= 0:
                    continue
                
                created_str = o.get("created_at") or o.get("updated_at")
                if not created_str:
                    created_str = today_str
                elif not isinstance(created_str, str):
                    created_str = created_str.isoformat()
                opp_date = created_str[:10]
                
                exec_email = str(o.get("assigned_to_email") or o.get("owner_email") or "").lower().strip()
                se_user = user_map_by_email.get(exec_email)
                exec_name = o.get("assigned_to_name") or o.get("owner_id") or (se_user.get("name") if se_user else None) or o.get("assigned_to") or "Unassigned"
                
                # Format with status tags
                exec_name = _format_name_with_status(exec_name, se_user)
                
                # Resolve custom incentive percentage
                inc_pct = 5.0
                if se_user and se_user.get("incentive_percentage") is not None:
                    inc_pct = float(se_user["incentive_percentage"])
                elif se_user and se_user.get("incentive_percentage_rate") is not None:
                    inc_pct = float(se_user["incentive_percentage_rate"])
                incentive_val = round(val * (inc_pct / 100.0))

                sm_email = str(o.get("reporting_manager_email") or "").lower().strip()
                if not sm_email and se_user:
                    sm_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                
                mgr = manager_names_by_email.get(sm_email)
                if not mgr and se_user:
                    mgr = se_user.get("reporting_manager_name")
                if not mgr:
                    mgr = o.get("sales_manager") or o.get("manager_name") or ("Direct/Unassigned" if not sm_email else sm_email.split("@")[0].replace(".", " ").title())
                
                # Format with status tags
                mgr_user = user_map_by_email.get(sm_email) if sm_email else None
                mgr = _format_name_with_status(mgr, mgr_user)
                
                revenue_records.append({
                    "id": str(o.get("id") or o.get("opportunity_id") or o.get("lead_id") or ""),
                    "date": opp_date,
                    "sales_manager": mgr,
                    "sales_executive": exec_name,
                    "amount": val,
                    "incentive": incentive_val
                })
                
            # Add Customer contract values to match the application's definition
            for c in customers:
                val = float(c.get("contract_value") or 0.0)
                if val <= 0:
                    continue
                created_str = c.get("created_at") or c.get("onboarding_date")
                if not created_str:
                    created_str = today_str
                elif not isinstance(created_str, str):
                    created_str = created_str.isoformat()
                cust_date = created_str[:10]
                
                exec_name = c.get("original_owner") or c.get("sales_executive") or "Direct/Unassigned"
                
                # Resolve original executive user
                se_user = user_map_by_name.get(exec_name.lower().strip())
                if not se_user:
                    exec_email = str(c.get("assigned_to_email") or c.get("sales_executive_email") or "").lower().strip()
                    se_user = user_map_by_email.get(exec_email)
                
                # Format with status tags
                exec_name = _format_name_with_status(exec_name, se_user)
                
                # Resolve manager from original executive user
                mgr_user = None
                if se_user:
                    mgr_name = se_user.get("reporting_manager_name") or "Direct/Unassigned"
                    mgr_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                    if mgr_email:
                        mgr_user = user_map_by_email.get(mgr_email)
                else:
                    mgr_name = c.get("sales_manager") or "Direct/Unassigned"
                
                # Format with status tags
                mgr_name = _format_name_with_status(mgr_name, mgr_user)
                
                # Resolve custom incentive percentage
                inc_pct = 5.0
                if se_user and se_user.get("incentive_percentage") is not None:
                    inc_pct = float(se_user["incentive_percentage"])
                incentive_val = round(val * (inc_pct / 100.0))

                revenue_records.append({
                    "id": str(c.get("id") or c.get("customer_id") or ""),
                    "date": cust_date,
                    "sales_manager": mgr_name,
                    "sales_executive": exec_name,
                    "amount": val,
                    "incentive": incentive_val
                })

            # Ensure every executive and manager from Admin portal is present in the ledger
            covered_execs = {str(r.get("sales_executive") or "").lower().strip() for r in revenue_records}
            for u in all_users:
                u_name = str(u.get("name") or u.get("full_name") or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()).strip()
                if not u_name:
                    continue
                u_key = u_name.lower().strip()
                u_role = str(u.get("role") or "").lower()
                if "ceo" in u_role or "super admin" in u_role:
                    continue

                if u_key not in covered_execs:
                    covered_execs.add(u_key)
                    sm_name = u.get("reporting_manager_name")
                    if not sm_name:
                        sm_email = str(u.get("reporting_manager_email") or "").lower().strip()
                        sm_name = manager_names_map.get(sm_email)
                    if not sm_name and "manager" in u_role:
                        sm_name = u_name
                    if not sm_name:
                        sm_name = "Sales Manager"

                    revenue_records.append({
                        "id": f"mock-empty-{u_key.replace(' ', '')}",
                        "date": today_str,
                        "sales_manager": sm_name,
                        "sales_executive": u_name,
                        "amount": 0.0
                    })

            # 5. Pending Approvals
            pending_approvals_list = []
            for lr in leave_requests_raw:
                if str(lr.get("status", "")).lower() != "pending":
                    continue
                
                # Check if it requires CEO approval
                req_emp_id = lr.get("employee_id")
                req_email = str(lr.get("executive_email") or lr.get("email") or "").lower().strip()
                
                # Resolve requester from hrms employees
                req_emp = None
                if req_emp_id:
                    req_emp = next((u for u in all_users if str(u.get("employee_id") or u.get("id") or u.get("employee_code") or "").lower().strip() == str(req_emp_id).lower().strip()), None)
                if not req_emp and req_email:
                    req_emp = next((u for u in all_users if str(u.get("email") or "").lower().strip() == req_email), None)
                    
                role_str = lr.get("role")
                mgr_name = None
                if req_emp:
                    role_str = role_str or req_emp.get("role") or req_emp.get("designation")
                    mgr_name = req_emp.get("reporting_manager") or req_emp.get("reporting_manager_name")
                
                if not role_str:
                    role_str = "Sales Executive"
                
                role_lower = str(role_str).lower()
                mgr_lower = str(mgr_name or "").lower()
                
                # CEO approves manager and admin requests ONLY
                is_ceo_approval = False
                if "manager" in role_lower or "admin" in role_lower:
                    is_ceo_approval = True
                        
                if not is_ceo_approval:
                    continue
                    
                from_dt = lr.get("from_date")
                to_dt = lr.get("to_date")
                
                # Format to dd/mm/yyyy
                def format_date_str(date_val):
                    if not date_val:
                        return ""
                    if "-" in date_val:
                        try:
                            # YYYY-MM-DD
                            parts = date_val.split("-")
                            if len(parts) == 3:
                                return f"{parts[2]}/{parts[1]}/{parts[0]}"
                        except Exception:
                            pass
                    return str(date_val)
                    
                formatted_from = format_date_str(from_dt)
                formatted_to = format_date_str(to_dt)
                date_str = f"{formatted_from} to {formatted_to}" if formatted_from != formatted_to else formatted_from
                
                pending_approvals_list.append({
                    "id": lr.get("id") or lr.get("leave_id") or lr.get("leave_request_id"),
                    "employee_name": lr.get("employee_name") or lr.get("executive_name") or "Staff",
                    "employee_id": lr.get("employee_code") or lr.get("employee_id") or "EMP-N/A",
                    "role": role_str,
                    "request_type": lr.get("leave_type") or "Full Day Leave",
                    "date": date_str,
                    "duration": lr.get("duration") or "1 Day",
                    "reason": lr.get("reason") or "N/A",
                    "status": "Pending"
                })

            default_annual_target = 35000000.0
            target_sum = default_annual_target
            active_targets = [t for t in sales_targets if str(t.get("status") or "").lower() == "active"]
            if active_targets:
                target_sum = float(sum(float(t.get("target_amount") or 0.0) for t in active_targets))

            return {
                "metrics": {
                    "totalRevenue": total_rev,
                    "total_revenue": total_rev,
                    "monthlyRevenue": monthly_rev,
                    "monthly_revenue": monthly_rev,
                    "annualTarget": target_sum,
                    "targetAchieved": total_rev,
                    "totalCustomers": total_cust,
                    "newCustomers": new_cust,
                    "activeLeads": total_leads,
                    "wonDeals": won_deals,
                    "lostDeals": lost_deals,
                    "pipelineValue": sum(float(o.get("value") or 0.0) for o in opportunities if str(o.get("stage", "")).upper() not in ("CLOSED_WON", "CLOSED WON", "WON", "CLOSED_LOST", "CLOSED LOST", "LOST")),
                    "conversionRate": conversion_rate,
                    "totalEmployees": total_emp,
                    "activeEmployees": active_emp,
                },
                "revenueTrends": monthly_trend,
                "managerPerformance": top_managers,
                "executivePerformance": top_executives,
                "salesFunnelData": [
                    {"stage": "Total Ingested Leads", "count": total_leads, "value": f"₹{total_leads * 50000:,}", "percentage": "100%", "color": "#832D51"},
                    {"stage": "Qualified Prospects", "count": qualified_leads, "value": f"₹{qualified_leads * 40000:,}", "percentage": f"{round((qualified_leads / max(1, total_leads)) * 100, 1)}%", "color": "#6a2240"},
                    {"stage": "Active Opportunities", "count": opportunities_count, "value": f"₹{int(sum(float(o.get('value') or 0.0) for o in opportunities)):,}", "percentage": f"{round((opportunities_count / max(1, total_leads)) * 100, 1)}%", "color": "#EA6993"},
                    {"stage": "Won Closed Deals", "count": won_deals, "value": f"₹{int(total_rev):,}", "percentage": f"{conversion_rate}%", "color": "#3a7d63"},
                ],
                "employeeSummary": {
                    "totalEmployees": total_emp,
                    "activeEmployees": active_emp,
                    "inactiveEmployees": inactive_emp,
                    "presentToday": present_today,
                    "absentToday": absent_today,
                    "onLeave": on_leave,
                    "lateCheckIns": late_check_ins,
                    "newEmployeesThisMonth": new_emp_this_month,
                    "employeesList": employees_list,
                },
                "customerSummary": {
                    "totalCustomers": total_cust,
                    "activeCustomers": active_cust,
                    "newCustomers": new_cust,
                    "lostCustomers": lost_cust,
                    "customersBySalesManager": cust_by_manager,
                    "customersBySalesExecutive": cust_by_exec,
                    "customersList": customers_list,
                    "wonOpportunitiesList": won_opportunities_list,
                },
                "leadSummary": {
                    "totalLeads": total_leads,
                    "newLeads": new_leads,
                    "qualifiedLeads": qualified_leads,
                    "opportunities": opportunities_count,
                    "wonDeals": won_deals,
                    "lostDeals": lost_deals,
                    "conversionRate": conversion_rate,
                },
                "revenueSummary": {
                    "totalRevenue": total_rev,
                    "monthlyRevenue": monthly_rev,
                    "quarterlyRevenue": quarterly_rev,
                    "annualRevenue": annual_rev,
                    "breakdown": {
                        "manager": rev_by_manager,
                        "executive": rev_by_executive,
                        "customer": rev_by_customer,
                        "company": rev_by_company,
                        "product": rev_by_product
                    },
                    "monthlyRevenueTrend": monthly_trend,
                    "yearlyRevenueTrend": yearly_trend,
                    "revenueRecords": revenue_records,
                },
                "teamPerformance": {
                    "topSalesManagers": top_managers,
                    "topSalesExecutives": top_executives,
                },
                "companyDetails": org_settings,
                "leaveRequests": leave_requests_raw,
                "leads": leads,
                "customers": customers,
                "leadSources": lead_sources,
                "pendingApprovals": pending_approvals_list
            }
        except Exception as e:
            logger.error(f"Error calculating CEO dashboard stats: {e}")
            return {}

    def get_sales_dashboard_kpis(self, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """Full KPI data for the Sales Executive Dashboard filtered by authenticated user."""
        today_str = date.today().isoformat()

        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()
        user_name = str((user_payload or {}).get("name") or "").strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")
        allowed = get_allowed_user_identifiers(user_payload)

        # ── Lead counts ──────────────────────────────────────────────────────
        total_leads = 0
        converted_leads = 0
        try:
            r = self._safe_fetch("leads", limit=300)
            if allowed is not None:
                r = [l for l in r if is_record_accessible(l, allowed)]
            if r:
                total_leads = len(r)
                converted_leads = len([l for l in r if str(l.get("status", "")).lower() in ("converted", "converted to customer")])
        except Exception:
            pass

        # ── Customer counts ───────────────────────────────────────────────────
        all_customers = self._safe_fetch("customers", limit=300)
        if allowed is not None:
            all_customers = [c for c in all_customers if is_record_accessible(c, allowed)]
        total_customers = len(all_customers)

        # ── Visit counts ──────────────────────────────────────────────────────
        all_visits = self._safe_fetch("visits", schema="field_management", limit=300)
        if allowed is not None:
            all_visits = [v for v in all_visits if is_record_accessible(v, allowed)]
        total_visits = len(all_visits)
        today_visits_done = len([
            v for v in all_visits
            if v.get("visit_date", "") == today_str
            or v.get("scheduled_date", "") == today_str
            or v.get("date", "") == today_str
        ])

        # ── Follow-up counts ──────────────────────────────────────────────────
        followups = self._safe_fetch("followups", limit=300)
        if not followups:
            followups = self._safe_fetch("follow_ups", limit=300)
        if allowed is not None:
            followups = [f for f in followups if is_record_accessible(f, allowed)]
        pending_followups = len([f for f in followups if str(f.get("status", "")).lower() in ("pending", "none")])

        # ── Attendance ────────────────────────────────────────────────────────
        attendance_status = "Absent"
        check_in_time = None
        att_logs = self._safe_fetch("attendance_logs", limit=50)
        if not att_logs:
            att_logs = self._safe_fetch("attendance", limit=50)
        if allowed is not None:
            att_logs = [a for a in att_logs if is_record_accessible(a, allowed)]
        for log in att_logs:
            if log.get("date", "") == today_str or str(log.get("created_at", "")).startswith(today_str):
                attendance_status = "Present"
                check_in_time = log.get("clock_in_time") or log.get("check_in") or "09:00 AM"
                break

        # ── Expenses ──────────────────────────────────────────────────────────
        expenses = self._safe_fetch("expenses", limit=300)
        if not expenses:
            expenses = self._safe_fetch("expense_claims", limit=300)
        if allowed is not None:
            expenses = [e for e in expenses if is_record_accessible(e, allowed)]
        expenses_pending = sum(
            float(e.get("amount", 0) or 0) for e in expenses
            if str(e.get("status", "")).lower() in ("pending", "submitted")
        )

        # ── Revenue / Pipeline ────────────────────────────────────────────────
        from app.modules.pipeline.repository import PipelineRepository
        opportunities = PipelineRepository().get_all_opportunities(user_payload)
        revenue_this_month = sum(
            float(o.get("value", 0) or 0) for o in opportunities
            if str(o.get("stage", "")).upper() in ("CLOSED_WON", "CLOSED WON", "WON")
        )
        pipeline_value = sum(float(o.get("value", 0) or 0) for o in opportunities)

        revenue_target = max(pipeline_value * 1.5, 460000.0) if pipeline_value > 0 else 0.0
        revenue_pct = min(round((revenue_this_month / revenue_target) * 100, 1), 100) if revenue_target > 0 else 0.0

        # ── Lead conversion ───────────────────────────────────────────────────
        lead_conversion_pct = round((converted_leads / total_leads) * 100, 1) if total_leads > 0 else 0.0

        # ── Visits target ────────────────────────────────────────────────────
        visits_target = 8
        visits_done = today_visits_done
        visits_pct = min(round((visits_done / visits_target) * 100, 1), 100)

        # ── Target achievement ────────────────────────────────────────────────
        target_pct = round((revenue_pct * 0.5 + visits_pct * 0.3 + lead_conversion_pct * 0.2), 1)

        # ── Notifications count ───────────────────────────────────────────────
        notif_count = self._safe_count("notifications")

        # ── Recent activities ─────────────────────────────────────────────────
        recent_activities = []
        audit_logs = self._safe_fetch("audit_logs", limit=8)
        if not audit_logs:
            audit_logs = self._safe_fetch("activity_logs", limit=8)
        for log in audit_logs[:6]:
            recent_activities.append({
                "time": str(log.get("created_at", ""))[:16].replace("T", " "),
                "description": log.get("action") or log.get("description") or "Activity logged",
                "type": log.get("resource_type", "info"),
            })

        # Fallback sample activities
        if not recent_activities:
            recent_activities = [
                {"time": "09:10 AM", "description": "Checked in at Apex Tech Park", "type": "attendance"},
                {"time": "09:35 AM", "description": "New Lead Added – GHI Solutions", "type": "lead"},
                {"time": "11:15 AM", "description": "Visit Completed – ABC Hospital", "type": "visit"},
                {"time": "01:20 PM", "description": "Follow Up Created – XYZ Builders", "type": "followup"},
                {"time": "03:15 PM", "description": "Expense Submitted – ₹850", "type": "expense"},
            ]

        # ── Today's schedule (from visits) ────────────────────────────────────
        today_schedule = []
        for v in all_visits[:4]:
            if v.get("visit_date", "") == today_str or v.get("scheduled_date", "") == today_str:
                today_schedule.append({
                    "time": v.get("visit_time") or v.get("scheduled_time") or "10:00 AM",
                    "customer": v.get("customer_name") or v.get("client_name") or "Client",
                    "type": v.get("visit_type") or v.get("purpose") or "Visit",
                    "status": v.get("status") or "Upcoming",
                })
        if not today_schedule:
            today_schedule = [
                {"time": "09:30 AM", "customer": "ABC Hospital", "type": "Demo", "status": "Completed"},
                {"time": "11:00 AM", "customer": "XYZ Builders", "type": "Follow Up", "status": "Upcoming"},
                {"time": "02:00 PM", "customer": "DEF Industries", "type": "Negotiation", "status": "Upcoming"},
                {"time": "04:30 PM", "customer": "Client Meeting", "type": "Proposal Discussion", "status": "Upcoming"},
            ]

        # ── Leaderboard ───────────────────────────────────────────────────────
        leaderboard = [
            {"rank": 1, "name": "Ashwini E", "revenue": 285000, "is_current": True},
            {"rank": 2, "name": "Ravi Kumar", "revenue": 262000, "is_current": False},
            {"rank": 3, "name": "Karthik S", "revenue": 218000, "is_current": False},
        ]

        return {
            # Top KPIs
            "assigned_leads": total_leads if total_leads > 0 else 42,
            "converted_customers": total_customers if total_customers > 0 else 18,
            "revenue_this_month": revenue_this_month,
            "pending_followups": pending_followups if pending_followups > 0 else 7,
            "leads_growth_pct": 12.0,
            "customers_growth_pct": 8.0,
            "revenue_growth_pct": 15.0,
            "followups_growth_pct": 5.0,
            # Status row
            "today_visits": visits_done,
            "today_visits_target": visits_target,
            "attendance_status": attendance_status,
            "check_in_time": check_in_time or "09:10 AM",
            "target_achievement_pct": target_pct if target_pct > 0 else 62.0,
            "expenses_pending_amount": expenses_pending if expenses_pending > 0 else 3250.0,
            # Circular charts
            "revenue_target": revenue_target,
            "revenue_achievement_pct": revenue_pct,
            "visits_target": visits_target,
            "visits_done": visits_done,
            "visits_pct": visits_pct,
            "lead_conversion_pct": lead_conversion_pct,
            "total_leads_for_conversion": total_leads if total_leads > 0 else 42,
            "converted_leads": converted_leads if converted_leads > 0 else 18,
            # Lists
            "recent_activities": recent_activities,
            "today_schedule": today_schedule,
            "leaderboard": leaderboard,
            "notifications_count": notif_count if notif_count > 0 else 6,
        }

    def _standardize_eod_report(self, r: Dict[str, Any], attendance_logs: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not r:
            return {}
        row = dict(r)
        
        rep_id = row.get("id")
        emp_code = row.get("employee_id") or "EMP000012"
        exec_name = row.get("employee_name") or "Sales Executive"
        
        # Parse emails from challenges_faced if encoded
        challenges = row.get("challenges_faced") or ""
        extracted_email = ""
        extracted_mgr_email = ""
        if " | Email: " in challenges:
            try:
                extracted_email = challenges.split(" | Email: ")[1].split(" | ")[0].strip()
            except Exception:
                pass
        if " | Manager: " in challenges:
            try:
                extracted_mgr_email = challenges.split(" | Manager: ")[1].split(" | ")[0].strip()
            except Exception:
                pass

        # Resolve emails by employee_code/id lookup from UserRepository
        lookup_email = ""
        lookup_mgr_email = ""
        lookup_mgr_name = ""
        if emp_code:
            try:
                from app.modules.users.repository import UserRepository
                all_u = UserRepository().get_all_users()
                for u in all_u:
                    e_code = str(u.get("employee_code") or u.get("employee_id") or "").strip()
                    if e_code == str(emp_code).strip():
                        lookup_email = str(u.get("email") or "").lower().strip()
                        lookup_mgr_email = str(u.get("reporting_manager_email") or "").lower().strip()
                        lookup_mgr_name = str(u.get("reporting_manager_name") or "").strip()
                        break
            except Exception:
                pass

        exec_email = str(
            row.get("employee_email")
            or row.get("executiveEmail")
            or row.get("executive_email")
            or extracted_email
            or lookup_email
            or ""
        ).lower().strip()

        mgr_email = str(
            row.get("manager_email")
            or row.get("reporting_manager_email")
            or extracted_mgr_email
            or lookup_mgr_email
            or ""
        ).lower().strip()

        mgr_name = str(
            row.get("manager_name")
            or row.get("reporting_manager_name")
            or lookup_mgr_name
            or ""
        ).strip()
        report_date = row.get("report_date")
        if isinstance(report_date, date):
            report_date = report_date.isoformat()
        else:
            report_date = str(report_date or datetime.utcnow().strftime("%Y-%m-%d"))
        
        challenges = row.get("challenges_faced") or ""
        highlights_val = challenges
        blockers_val = row.get("blockers") or "None"
        if " | Blockers: " in challenges:
            try:
                blockers_val = challenges.split(" | Blockers: ")[1].split(" | ")[0].strip()
            except Exception:
                blockers_val = "None"
        elif " | " in challenges:
            parts = challenges.split(" | ")
            if len(parts) > 1 and not any(parts[1].strip().startswith(p) for p in ("Executive:", "Email:", "EMP:", "Manager:")):
                blockers_val = parts[1].strip()
            else:
                blockers_val = row.get("blockers") or "None"

        if " | " in challenges:
            highlights_val = challenges.split(" | ")[0].strip()
                
        is_ack = bool(row.get("acknowledged", False))
        ack_by = row.get("acknowledged_by") or ""
        
        # In-memory fallback lookup for older / in-memory records
        in_mem_fallback = {}
        for r_mem in _in_memory_eod_reports:
            if str(r_mem.get("id")) == str(rep_id) or str(r_mem.get("report_id")) == str(rep_id):
                in_mem_fallback = r_mem
                break

        db_leads = row.get("leads_generated")
        if db_leads is None:
            db_leads = in_mem_fallback.get("leads_generated") or in_mem_fallback.get("leadsGenerated") or 0
            
        db_interested = row.get("clients_interested")
        if db_interested is None:
            db_interested = in_mem_fallback.get("clients_interested") or in_mem_fallback.get("clientsInterested") or 0
            
        db_followups = row.get("followups_scheduled")
        if db_followups is None:
            db_followups = in_mem_fallback.get("followups_scheduled") or in_mem_fallback.get("followupsScheduled") or 0

        # Match attendance record
        login_time = None
        login_location = None
        logout_time = None
        logout_location = None
        matched_log = None

        if attendance_logs:
            for log in attendance_logs:
                log_date = log.get("attendance_date") or log.get("date")
                if isinstance(log_date, date):
                    log_date = log_date.isoformat()
                else:
                    log_date = str(log_date or "")
                
                if log_date.split("T")[0] == report_date.split("T")[0]:
                    log_emp = str(log.get("employee_id") or log.get("employee_code") or "").strip().lower()
                    log_name = str(log.get("employee_name") or log.get("name") or "").strip().lower()
                    log_email = str(log.get("email") or "").strip().lower()

                    target_emp = str(emp_code or "").strip().lower()
                    target_name = str(exec_name or "").strip().lower()
                    target_email = str(exec_email or "").strip().lower()

                    if (target_emp and log_emp and target_emp == log_emp) or \
                       (target_email and log_email and target_email == log_email) or \
                       (target_name and log_name and (target_name in log_name or log_name in target_name)):
                        matched_log = log
                        break

        if not matched_log and (emp_code or exec_email):
            try:
                q = self.supabase.schema("hrms").table("attendance").select("*").eq("date", report_date.split("T")[0])
                if emp_code:
                    res_att = q.eq("employee_id", emp_code).execute()
                    if res_att.data:
                        matched_log = res_att.data[0]
                if not matched_log and exec_email:
                    res_att = q.eq("email", exec_email).execute()
                    if res_att.data:
                        matched_log = res_att.data[0]
            except Exception:
                pass

        if matched_log:
            login_time = matched_log.get("check_in_time") or matched_log.get("punch_in_time") or matched_log.get("clockIn")
            if login_time == "—": 
                login_time = None

            # Try database check-in address first
            stored_in_addr = matched_log.get("check_in_address") or matched_log.get("work_location") or matched_log.get("location_name")
            if stored_in_addr and stored_in_addr != "Adyar IT Corridor, Chennai" and stored_in_addr != "—" and stored_in_addr.strip() != "":
                login_location = stored_in_addr
            else:
                c_in_lat = matched_log.get("check_in_latitude") or matched_log.get("latitude")
                c_in_lng = matched_log.get("check_in_longitude") or matched_log.get("longitude")
                if c_in_lat is not None and c_in_lng is not None:
                    login_location = self._reverse_geocode_coords(c_in_lat, c_in_lng)

            logout_time = matched_log.get("check_out_time") or matched_log.get("punch_out_time") or matched_log.get("clockIn")
            if logout_time == "—": 
                logout_time = None

            # Try database check-out address first
            stored_out_addr = matched_log.get("check_out_address")
            if stored_out_addr and stored_out_addr != "Adyar IT Corridor, Chennai" and stored_out_addr != "—" and stored_out_addr.strip() != "":
                logout_location = stored_out_addr
            else:
                c_out_lat = matched_log.get("check_out_latitude")
                c_out_lng = matched_log.get("check_out_longitude")
                if c_out_lat is not None and c_out_lng is not None:
                    logout_location = self._reverse_geocode_coords(c_out_lat, c_out_lng)

        if not login_time or login_time == "—": login_time = "N/A"
        if not login_location or login_location == "—": login_location = "N/A"
        if not logout_time or logout_time == "—": logout_time = "N/A"
        if not logout_location or logout_location == "—": logout_location = "N/A"

        std_report = {
            "id": rep_id,
            "report_id": rep_id,
            "date": report_date,
            "submittedAt": report_date,
            "executive": exec_name,
            "executive_name": exec_name,
            "executiveEmail": exec_email,
            "executive_email": exec_email,
            "employee_code": emp_code,
            "employee_id": emp_code,
            "reporting_manager_email": mgr_email,
            "manager_email": mgr_email,
            "reporting_manager_name": mgr_name,
            "callsMade": int(row.get("leads_contacted") or 0),
            "calls_made": int(row.get("leads_contacted") or 0),
            "visitsCompleted": int(row.get("visits_count") or 0),
            "visits_completed": int(row.get("visits_count") or 0),
            "leadsGenerated": int(db_leads),
            "leads_generated": int(db_leads),
            "clientsInterested": int(db_interested),
            "clients_interested": int(db_interested),
            "followupsScheduled": int(db_followups),
            "followups_scheduled": int(db_followups),
            "dealsClosed": int(row.get("deals_won") or 0),
            "deals_closed": int(row.get("deals_won") or 0),
            "highlights": highlights_val,
            "blockers": blockers_val,
            "nextDayPlan": row.get("next_day_plan") or "Follow up with prospects",
            "status": "Acknowledged" if is_ack else "Submitted",
            "managerAck": is_ack,
            "managerComment": ack_by,
            "created_at": row.get("created_at"),
            "loginTime": login_time,
            "loginLocation": login_location,
            "logoutTime": logout_time,
            "logoutLocation": logout_location
        }
        return std_report


    def create_eod_report(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        report_id = data.get("id") or f"eod_{uuid.uuid4()}"
        now_iso = datetime.utcnow().isoformat()
        today_str = date.today().isoformat()

        exec_name = str(data.get("executive") or data.get("executive_name") or (user_payload or {}).get("name") or "Sales Executive")
        exec_email = str(data.get("executiveEmail") or data.get("executive_email") or (user_payload or {}).get("email") or "executive@tconnect.com").lower().strip()
        emp_code = str(data.get("employee_code") or data.get("employee_id") or (user_payload or {}).get("employee_code") or "EMP000012").strip()

        # Resolve user's reporting manager email and ID
        # Strategy: try UserRepository first (merged auth+db view), then hrms.employees directly
        mgr_email = ""
        mgr_id = ""
        mgr_name = ""
        if exec_email or emp_code:
            # Attempt 1: UserRepository (most accurate — resolves UUID → name/email)
            try:
                from app.modules.users.repository import UserRepository
                all_u = UserRepository().get_all_users()
                for u in all_u:
                    e_mail = str(u.get("email") or "").lower().strip()
                    e_code = str(u.get("employee_code") or u.get("employee_id") or "").strip()
                    if (exec_email and e_mail == exec_email) or (emp_code and e_code == emp_code):
                        mgr_email = str(u.get("reporting_manager_email") or "").lower().strip()
                        mgr_id = str(u.get("reporting_manager_id") or "").strip()
                        mgr_name = str(u.get("reporting_manager_name") or "").strip()
                        break
            except Exception:
                pass

            # Attempt 2: Query hrms.employees directly for the executive's record
            if not mgr_email:
                try:
                    hrms_q = None
                    if exec_email:
                        hrms_q = self.supabase.schema("hrms").table("employees").select(
                            "reporting_manager,reporting_manager_id,reporting_manager_name,reporting_manager_email"
                        ).eq("email", exec_email).execute()
                    elif emp_code:
                        hrms_q = self.supabase.schema("hrms").table("employees").select(
                            "reporting_manager,reporting_manager_id,reporting_manager_name,reporting_manager_email"
                        ).eq("employee_code", emp_code).execute()
                    if hrms_q and hrms_q.data and len(hrms_q.data) > 0:
                        row = hrms_q.data[0]
                        mgr_uuid = row.get("reporting_manager") or row.get("reporting_manager_id")
                        mgr_email = str(row.get("reporting_manager_email") or "").lower().strip()
                        mgr_name = str(row.get("reporting_manager_name") or "").strip()
                        mgr_id = str(mgr_uuid or "").strip()
                        # If the name/email are still missing, resolve manager UUID via auth
                        if mgr_uuid and (not mgr_email or not mgr_name):
                            try:
                                admin_client = get_supabase_admin_client() or self.supabase
                                auth_admin = getattr(admin_client, "auth", None)
                                if auth_admin and hasattr(auth_admin, "admin"):
                                    mgr_auth = auth_admin.admin.get_user_by_id(str(mgr_uuid))
                                    if mgr_auth and hasattr(mgr_auth, "user") and mgr_auth.user:
                                        meta = getattr(mgr_auth.user, "user_metadata", {}) or {}
                                        if not mgr_name:
                                            mgr_name = (
                                                meta.get("full_name")
                                                or f"{meta.get('first_name', '')} {meta.get('last_name', '')}".strip()
                                                or mgr_auth.user.email.split("@")[0].replace(".", " ").title()
                                            )
                                        if not mgr_email:
                                            mgr_email = str(mgr_auth.user.email or "").lower().strip()
                            except Exception:
                                pass
                except Exception as hrms_err:
                    logger.debug(f"hrms.employees manager resolve notice: {hrms_err}")

        calls = int(data.get("callsMade") or data.get("calls_made") or 0)
        visits = int(data.get("visitsCompleted") or data.get("visits_completed") or 0)
        leads = int(data.get("leadsGenerated") or data.get("leads_generated") or 0)
        interested = int(data.get("clientsInterested") or data.get("clients_interested") or 0)
        followups = int(data.get("followupsScheduled") or data.get("followups_scheduled") or 0)
        deals = int(data.get("dealsClosed") or data.get("deals_closed") or 0)

        high_str = str(data.get("highlights") or "Completed daily client meetings.").replace(" | ", " - ")
        block_str = str(data.get("blockers") or "None").replace(" | ", " - ")
        full_high = f"{high_str} | Blockers: {block_str} | Executive: {exec_name} | Email: {exec_email} | EMP: {emp_code} | Manager: {mgr_email}"

        report_obj = {
            "id": report_id,
            "report_id": report_id,
            "date": data.get("date") or today_str,
            "submittedAt": data.get("submittedAt") or now_iso[:10],
            "executive": exec_name,
            "executive_name": exec_name,
            "executiveEmail": exec_email,
            "executive_email": exec_email,
            "employee_code": emp_code,
            "employee_id": emp_code,
            "reporting_manager_email": mgr_email,
            "callsMade": calls,
            "calls_made": calls,
            "visitsCompleted": visits,
            "visits_completed": visits,
            "leadsGenerated": leads,
            "leads_generated": leads,
            "clientsInterested": interested,
            "clients_interested": interested,
            "followupsScheduled": followups,
            "followups_scheduled": followups,
            "dealsClosed": deals,
            "deals_closed": deals,
            "highlights": full_high,
            "blockers": data.get("blockers") or "None",
            "nextDayPlan": data.get("nextDayPlan") or data.get("next_day_plan") or "Follow up with prospects",
            "status": "Submitted",
            "managerAck": False,
            "managerComment": "",
            "reporting_manager_name": mgr_name,
            "created_at": now_iso
        }

        db_payload = {
            "id": report_id,
            "employee_id": emp_code,
            "employee_name": exec_name,
            "manager_name": mgr_name or mgr_email,
            "report_date": report_obj["date"],
            "visits_count": visits,
            "leads_contacted": calls,
            "deals_won": deals,
            "collections_amount": float(data.get("collections_amount") or 0.0),
            "challenges_faced": full_high,
            "next_day_plan": report_obj["nextDayPlan"],
            "acknowledged": False,
            "acknowledged_by": None,
            "created_at": now_iso,
            "leads_generated": leads,
            "clients_interested": interested,
            "followups_scheduled": followups
        }

        # Try inserting to system.reports_eod in Supabase
        try:
            res = self.supabase.schema("system").table("reports_eod").insert(db_payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"EOD Report saved in system.reports_eod: {res.data[0]}")
                report_obj = self._standardize_eod_report(res.data[0])
        except Exception as e:
            logger.warning(f"Failed to insert into system.reports_eod: {e}")
            try:
                res = self.supabase.table("reports_eod").insert(db_payload).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"EOD Report saved in public.reports_eod: {res.data[0]}")
                    report_obj = self._standardize_eod_report(res.data[0])
            except Exception as e2:
                logger.warning(f"Failed to insert into public.reports_eod: {e2}")

        _in_memory_eod_reports.insert(0, report_obj)

        return report_obj

    def get_eod_reports(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)

        # Determine the logged-in user's email for reporting-manager scoping
        caller_email = str(
            (user_payload or {}).get("email")
            or (user_payload or {}).get("sub")
            or ""
        ).lower().strip()
        caller_role = str((user_payload or {}).get("role") or "").strip().lower()
        is_manager_role = any(r in caller_role for r in ("manager", "admin", "ceo", "hr"))

        # Fetch all attendance logs once
        attendance_logs = []
        try:
            from app.modules.attendance.repository import AttendanceRepository
            attendance_logs = AttendanceRepository().get_all_logs(user_payload)
        except Exception as e:
            logger.debug(f"Failed to fetch attendance logs for EOD reports: {e}")

        db_reports = []
        try:
            res = self.supabase.schema("system").table("reports_eod").select("*").order("created_at", desc=True).execute()
            if res.data is not None:
                db_reports = [self._standardize_eod_report(r, attendance_logs) for r in res.data]
        except Exception:
            try:
                res = self.supabase.table("reports_eod").select("*").order("created_at", desc=True).execute()
                if res.data is not None:
                    db_reports = [self._standardize_eod_report(r, attendance_logs) for r in res.data]
            except Exception as e:
                logger.debug(f"reports_eod fetch failed: {e}")

        all_r = list(db_reports) if db_reports else [self._standardize_eod_report(r, attendance_logs) for r in _in_memory_eod_reports]

        if allowed is not None:
            def _is_accessible(r: Dict[str, Any]) -> bool:
                # Standard executive/admin scoping
                if is_record_accessible(r, allowed):
                    return True
                # Reporting manager access: the logged-in manager can see all EOD
                # reports where they are the assigned reporting_manager_email
                if is_manager_role and caller_email:
                    rme = str(
                        r.get("reporting_manager_email")
                        or r.get("manager_email")
                        or ""
                    ).lower().strip()
                    if rme and rme == caller_email:
                        return True
                return False

            all_r = [r for r in all_r if _is_accessible(r)]

        return all_r

    def acknowledge_eod_report(self, report_id: str, comment: str = "", user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        ack_by_user = str((user_payload or {}).get("email") or "manager@tconnect.com")
        updates = {
            "acknowledged": True,
            "acknowledged_by": comment or f"Acknowledged by {ack_by_user}"
        }

        try:
            res = self.supabase.schema("system").table("reports_eod").update(updates).eq("id", report_id).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"EOD report {report_id} acknowledged in system.reports_eod")
                return self._standardize_eod_report(res.data[0])
        except Exception:
            try:
                res = self.supabase.table("reports_eod").update(updates).eq("id", report_id).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"EOD report {report_id} acknowledged in public.reports_eod")
                    return self._standardize_eod_report(res.data[0])
            except Exception as e:
                logger.warning(f"reports_eod acknowledge update failed: {e}")

        for r in _in_memory_eod_reports:
            if str(r.get("id")) == str(report_id) or str(r.get("report_id")) == str(report_id):
                r["managerAck"] = True
                r["status"] = "Acknowledged"
                r["managerComment"] = comment or "Acknowledged by Sales Manager"
                return r
        return {}

    def get_ceo_sales_overview(self, from_date: str = None, to_date: str = None, manager_id: str = None, executive_id: str = None) -> Dict[str, Any]:
        """
        Calculates organization-wide CEO Sales Overview KPIs and tables.
        Applies date range filters first, resolves manager/executive hierarchies,
        compiles performance matrices, and executes structural reconciliation checks.
        """
        from datetime import datetime, date, timedelta

        # 1. Parse Date Boundaries (Default to "This Month")
        today = datetime.utcnow().date()
        start_date = None
        end_date = None

        if from_date:
            try:
                start_date = datetime.strptime(from_date, "%Y-%m-%d").date()
            except Exception:
                pass
        if to_date:
            try:
                end_date = datetime.strptime(to_date, "%Y-%m-%d").date()
            except Exception:
                pass

        if not start_date or not end_date:
            start_date = date(today.year, today.month, 1)
            end_date = today

        # 2. Fetch all raw datasets from respective repositories
        from app.modules.users.repository import UserRepository
        from app.modules.customer.repository import CustomerRepository
        from app.modules.pipeline.repository import PipelineRepository

        all_users = UserRepository().get_all_users()
        all_customers = CustomerRepository().get_all_customers()
        all_opportunities = PipelineRepository().get_all_opportunities()

        # Fetch active targets from Supabase sales.sales_target
        sales_targets = []
        try:
            res_tgt = self.supabase.schema("sales").table("sales_target").select("*").execute()
            if res_tgt.data is not None:
                sales_targets = res_tgt.data
        except Exception as e:
            logger.debug(f"sales.sales_target fetch notice: {e}")
            try:
                res_tgt = self.supabase.table("sales_target").select("*").execute()
                if res_tgt.data is not None:
                    sales_targets = res_tgt.data
            except Exception as e2:
                logger.warning(f"sales_target fallback fetch failed: {e2}")

        # 3. Create User Maps
        user_map_by_email = {}
        user_map_by_name = {}
        user_map_by_id = {}
        
        for u in all_users:
            u_email = str(u.get("email") or "").lower().strip()
            if u_email:
                user_map_by_email[u_email] = u
            u_name = str(u.get("name") or u.get("full_name") or "").lower().strip()
            if u_name:
                user_map_by_name[u_name] = u
            u_id = str(u.get("id") or u.get("auth_user_id") or "")
            if u_id:
                user_map_by_id[u_id] = u

        # Map manager names/emails
        manager_names_by_email = {}
        for u in all_users:
            u_role = str(u.get("role") or "").lower()
            if "manager" in u_role or "admin" in u_role:
                manager_names_by_email[str(u.get("email") or "").lower().strip()] = u.get("name")

        # 4. Standard Database Stage Constants
        WON_STAGES = ["WON", "CLOSED_WON", "CLOSED WON"]
        LOST_STAGES = ["LOST", "CLOSED_LOST", "CLOSED LOST"]

        # 5. Opportunity Date Classification & Filtering
        filtered_opportunities = []
        for o in all_opportunities:
            stage_str = str(o.get("stage") or "").upper().strip()
            is_won = stage_str in WON_STAGES
            is_lost = stage_str in LOST_STAGES
            
            # Revenue Date Rule: use updated_at for Won, created_at for others
            if is_won:
                date_str = o.get("updated_at") or o.get("created_at") or ""
            else:
                date_str = o.get("created_at") or ""
                
            if not date_str:
                continue
                
            try:
                opp_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
            except Exception:
                try:
                    opp_date = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
                except Exception:
                    continue
                    
            if not (start_date <= opp_date <= end_date):
                continue

            # Resolve Manager and Executive Assignments
            exec_email = str(o.get("assigned_to_email") or o.get("owner_email") or "").lower().strip()
            se_user = user_map_by_email.get(exec_email)
            exec_name = o.get("rep") or o.get("assigned_to") or (se_user.get("name") if se_user else None) or "Direct/Unassigned"
            exec_id = str(se_user.get("id") or se_user.get("auth_user_id") or "") if se_user else ""
            
            sm_email = str(o.get("reporting_manager_email") or "").lower().strip()
            if not sm_email and se_user:
                sm_email = str(se_user.get("reporting_manager_email") or "").lower().strip()
                
            sm_name = manager_names_by_email.get(sm_email)
            if not sm_name and se_user:
                sm_name = se_user.get("reporting_manager_name")
            if not sm_name:
                sm_name = o.get("sales_manager") or "Direct/Unassigned"
                
            sm_id = ""
            if sm_email:
                sm_user = user_map_by_email.get(sm_email)
                if sm_user:
                    sm_id = str(sm_user.get("id") or sm_user.get("auth_user_id") or "")

            # Store resolved names in the opportunity record
            tl_name_opp = str(o.get("team_lead_name") or o.get("team_lead") or "").strip()
            if not tl_name_opp and se_user:
                tl_id_of_exec = str(se_user.get("reporting_team_lead_id") or se_user.get("team_lead_id") or "").strip()
                tl_user = user_map_by_id.get(tl_id_of_exec) if tl_id_of_exec else None
                tl_name_opp = (tl_user.get("name") if tl_user else (se_user.get("reporting_team_lead_name") or se_user.get("team_lead_name") or se_user.get("team_lead"))) or ""
                if not tl_name_opp:
                    mgr_name_str = str(se_user.get("reporting_manager_name") or se_user.get("reporting_manager") or "").strip()
                    if mgr_name_str:
                        m_user = user_map_by_name.get(mgr_name_str.lower())
                        if m_user:
                            m_role = str(m_user.get("role") or m_user.get("designation") or "").lower()
                            if "lead" in m_role or "tl" in m_role:
                                tl_name_opp = m_user.get("name") or mgr_name_str

            o["_resolved_team_lead_name"] = tl_name_opp if tl_name_opp and tl_name_opp.lower() not in ("unassigned", "direct/unassigned") else ""
            o["_resolved_executive_name"] = exec_name
            o["_resolved_executive_id"] = exec_id
            o["_resolved_manager_name"] = sm_name
            o["_resolved_manager_id"] = sm_id
            o["_resolved_amount"] = float(o.get("value") or o.get("amount") or 0.0)
            o["_resolved_date"] = opp_date.strftime("%d/%m/%Y")
            o["_resolved_date_obj"] = opp_date

            # Filter by manager_id / executive_id if specified
            if manager_id and sm_id != manager_id:
                continue
            if executive_id and exec_id != executive_id:
                continue

            filtered_opportunities.append(o)

        # 6. Customer Date Classification & Filtering
        filtered_customers = []
        for c in all_customers:
            created_str = c.get("created_at") or ""
            if created_str:
                try:
                    c_date = datetime.fromisoformat(created_str.replace("Z", "+00:00")).date()
                except Exception:
                    try:
                        c_date = datetime.strptime(created_str[:10], "%Y-%m-%d").date()
                    except Exception:
                        c_date = today
            else:
                c_date = today

            if not (start_date <= c_date <= end_date):
                continue

            # Resolve Manager and Executive for customer
            exec_name = c.get("sales_executive_name") or c.get("sales_executive") or "Direct/Unassigned"
            exec_id = c.get("sales_executive_id") or ""
            
            se_user = user_map_by_name.get(exec_name.lower().strip())
            if se_user:
                exec_id = exec_id or str(se_user.get("id") or se_user.get("auth_user_id") or "")
                
            sm_name = c.get("sales_manager_name") or c.get("sales_manager") or "Direct/Unassigned"
            sm_id = c.get("sales_manager_id") or ""
            
            if se_user:
                sm_name = sm_name if sm_name != "Direct/Unassigned" else (se_user.get("reporting_manager_name") or "Direct/Unassigned")
                
            sm_user = user_map_by_name.get(sm_name.lower().strip())
            if sm_user:
                sm_id = sm_id or str(sm_user.get("id") or sm_user.get("auth_user_id") or "")

            # Filter by manager_id / executive_id if specified
            if manager_id and sm_id != manager_id:
                continue
            if executive_id and exec_id != executive_id:
                continue

            tl_name_cust = str(c.get("team_lead_name") or c.get("team_lead") or "").strip()
            if not tl_name_cust and se_user:
                tl_id_of_exec = str(se_user.get("reporting_team_lead_id") or se_user.get("team_lead_id") or "").strip()
                tl_user = user_map_by_id.get(tl_id_of_exec) if tl_id_of_exec else None
                tl_name_cust = (tl_user.get("name") if tl_user else (se_user.get("reporting_team_lead_name") or se_user.get("team_lead_name") or se_user.get("team_lead"))) or ""
                if not tl_name_cust:
                    mgr_name_str = str(se_user.get("reporting_manager_name") or se_user.get("reporting_manager") or "").strip()
                    if mgr_name_str:
                        m_user = user_map_by_name.get(mgr_name_str.lower())
                        if m_user:
                            m_role = str(m_user.get("role") or m_user.get("designation") or "").lower()
                            if "lead" in m_role or "tl" in m_role:
                                tl_name_cust = m_user.get("name") or mgr_name_str

            c["_resolved_team_lead_name"] = tl_name_cust if tl_name_cust and tl_name_cust.lower() not in ("unassigned", "direct/unassigned") else ""
            c["_resolved_executive_name"] = exec_name
            c["_resolved_executive_id"] = exec_id
            c["_resolved_manager_name"] = sm_name
            c["_resolved_manager_id"] = sm_id
            c["_resolved_amount"] = float(c.get("amount") or c.get("contract_value") or c.get("revenue") or 0.0)
            c["_resolved_date_obj"] = c_date

            filtered_customers.append(c)

        # 7. Aggregate KPI Metrics
        won_deals = [o for o in filtered_opportunities if str(o.get("stage") or "").upper().strip() in WON_STAGES]
        lost_deals = [o for o in filtered_opportunities if str(o.get("stage") or "").upper().strip() in LOST_STAGES]
        open_deals = [o for o in filtered_opportunities if str(o.get("stage") or "").upper().strip() not in (WON_STAGES + LOST_STAGES)]

        total_revenue = sum(o["_resolved_amount"] for o in won_deals) + sum(c["_resolved_amount"] for c in filtered_customers)
        total_pipeline = sum(o["_resolved_amount"] for o in open_deals)
        total_lost_val = sum(o["_resolved_amount"] for o in lost_deals)

        # Deduplicate customer count dynamically
        unique_customer_ids = set()
        for o in filtered_opportunities:
            cid = o.get("customer_id") or o.get("lead_id")
            if cid:
                unique_customer_ids.add(str(cid))
        for c in filtered_customers:
            cid = c.get("customer_id") or c.get("id")
            if cid:
                unique_customer_ids.add(str(cid))
        total_customers = len(unique_customer_ids)

        # 8. Detailed Ledger Lists
        revenue_details = []
        for o in won_deals:
            # Resolve custom incentive percentage
            exec_email = str(o.get("assigned_to_email") or o.get("owner_email") or "").lower().strip()
            se_user = user_map_by_email.get(exec_email)
            if not se_user:
                exec_name_clean = str(o["_resolved_executive_name"] or "").lower().strip()
                se_user = user_map_by_name.get(exec_name_clean)
            
            inc_pct = 5.0
            if se_user and se_user.get("incentive_percentage") is not None:
                inc_pct = float(se_user["incentive_percentage"])
            elif se_user and se_user.get("incentive_percentage_rate") is not None:
                inc_pct = float(se_user["incentive_percentage_rate"])
            
            incentive_val = round(o["_resolved_amount"] * (inc_pct / 100.0))

            revenue_details.append({
                "id": str(o.get("id") or o.get("opportunity_id") or o.get("lead_id") or ""),
                "date": o["_resolved_date_obj"].isoformat() if hasattr(o.get("_resolved_date_obj"), "isoformat") else str(o["_resolved_date"]),
                "sales_manager": o["_resolved_manager_name"],
                "team_lead": o.get("_resolved_team_lead_name") or "",
                "team_lead_name": o.get("_resolved_team_lead_name") or "",
                "sales_executive": o["_resolved_executive_name"],
                "customer": o.get("company") or o.get("title") or "Corporate Account",
                "amount": o["_resolved_amount"],
                "incentive": incentive_val
            })

        for c in filtered_customers:
            exec_name = c["_resolved_executive_name"]
            se_user = None
            if exec_name:
                se_user = user_map_by_name.get(exec_name.lower().strip())
            
            inc_pct = 5.0
            if se_user and se_user.get("incentive_percentage") is not None:
                inc_pct = float(se_user["incentive_percentage"])
            
            incentive_val = round(c["_resolved_amount"] * (inc_pct / 100.0))

            revenue_details.append({
                "id": str(c.get("id") or c.get("customer_id") or ""),
                "date": c["_resolved_date_obj"].isoformat() if hasattr(c.get("_resolved_date_obj"), "isoformat") else today_str,
                "sales_manager": c["_resolved_manager_name"],
                "team_lead": c.get("_resolved_team_lead_name") or "",
                "team_lead_name": c.get("_resolved_team_lead_name") or "",
                "sales_executive": c["_resolved_executive_name"],
                "customer": c.get("customer_name") or c.get("company") or "Corporate Account",
                "amount": c["_resolved_amount"],
                "incentive": incentive_val
            })

        customers_details = []
        for c in filtered_customers:
            exec_name = c["_resolved_executive_name"]
            se_user = None
            if exec_name:
                se_user = user_map_by_name.get(exec_name.lower().strip())
            
            inc_pct = 5.0
            if se_user and se_user.get("incentive_percentage") is not None:
                inc_pct = float(se_user["incentive_percentage"])
            
            incentive_val = round(c["_resolved_amount"] * (inc_pct / 100.0))

            customers_details.append({
                "sales_manager": c["_resolved_manager_name"],
                "team_lead": c.get("_resolved_team_lead_name") or "",
                "team_lead_name": c.get("_resolved_team_lead_name") or "",
                "sales_executive": c["_resolved_executive_name"],
                "customer_name": c.get("customer_name") or c.get("name") or "Unnamed Customer",
                "company": c.get("company") or c.get("company_name") or "Enterprise",
                "product": c.get("product") or "TwiteConnect CRM",
                "amount": c["_resolved_amount"],
                "status": c.get("status") or "Active Customer",
                "incentive": incentive_val,
                "date": c["_resolved_date_obj"].isoformat() if hasattr(c.get("_resolved_date_obj"), "isoformat") else today_str
            })

        # 9. Manager and Executive Performance Aggregations
        manager_perf_map = {}
        exec_perf_map = {}

        # Pre-populate map entries based on active assignments
        for o in filtered_opportunities:
            mgr = o["_resolved_manager_name"]
            exec_n = o["_resolved_executive_name"]
            amount = o["_resolved_amount"]
            stage_str = str(o.get("stage") or "").upper().strip()
            
            # Manager map
            if mgr not in manager_perf_map:
                manager_perf_map[mgr] = {"manager": mgr, "executives": set(), "customers": set(), "won_deals": 0, "won_revenue": 0.0, "pipeline": 0.0}
            manager_perf_map[mgr]["executives"].add(exec_n)
            cid = o.get("customer_id") or o.get("lead_id")
            if cid:
                manager_perf_map[mgr]["customers"].add(str(cid))
                
            if stage_str in WON_STAGES:
                manager_perf_map[mgr]["won_deals"] += 1
                manager_perf_map[mgr]["won_revenue"] += amount
            elif stage_str not in LOST_STAGES:
                manager_perf_map[mgr]["pipeline"] += amount

            # Executive map
            if exec_n not in exec_perf_map:
                exec_perf_map[exec_n] = {"executive": exec_n, "manager": mgr, "customers": set(), "won_deals": 0, "won_revenue": 0.0, "pipeline": 0.0}
            if cid:
                exec_perf_map[exec_n]["customers"].add(str(cid))
                
            if stage_str in WON_STAGES:
                exec_perf_map[exec_n]["won_deals"] += 1
                exec_perf_map[exec_n]["won_revenue"] += amount
            elif stage_str not in LOST_STAGES:
                exec_perf_map[exec_n]["pipeline"] += amount
        # Include details from filtered customers list
        for c in filtered_customers:
            mgr = c["_resolved_manager_name"]
            exec_n = c["_resolved_executive_name"]
            cid = c.get("customer_id") or c.get("id")
            amount = c["_resolved_amount"]
            
            if mgr not in manager_perf_map:
                manager_perf_map[mgr] = {"manager": mgr, "executives": set(), "customers": set(), "won_deals": 0, "won_revenue": 0.0, "pipeline": 0.0}
            if cid:
                manager_perf_map[mgr]["customers"].add(str(cid))
            manager_perf_map[mgr]["executives"].add(exec_n)
            manager_perf_map[mgr]["won_revenue"] += amount
            manager_perf_map[mgr]["won_deals"] += 1

            if exec_n not in exec_perf_map:
                exec_perf_map[exec_n] = {"executive": exec_n, "manager": mgr, "customers": set(), "won_deals": 0, "won_revenue": 0.0, "pipeline": 0.0}
            if cid:
                exec_perf_map[exec_n]["customers"].add(str(cid))
            exec_perf_map[exec_n]["won_revenue"] += amount
            exec_perf_map[exec_n]["won_deals"] += 1

        manager_performance = []
        for key, val in manager_perf_map.items():
            manager_performance.append({
                "sales_manager": val["manager"],
                "executives": len(val["executives"]),
                "customers": len(val["customers"]),
                "won_deals": val["won_deals"],
                "won_revenue": val["won_revenue"],
                "pipeline": val["pipeline"]
            })

        executive_performance = []
        for key, val in exec_perf_map.items():
            executive_performance.append({
                "sales_executive": val["executive"],
                "sales_manager": val["manager"],
                "customers": len(val["customers"]),
                "won_deals": val["won_deals"],
                "won_revenue": val["won_revenue"],
                "pipeline": val["pipeline"]
            })
            
        # Sort performance tables descending by won revenue
        executive_performance.sort(key=lambda x: x["won_revenue"], reverse=True)
        manager_performance.sort(key=lambda x: x["won_revenue"], reverse=True)

        # 10. Revenue Trend Calculations (Mon-Sun for small ranges, Week 1-4 for month)
        date_range_days = (end_date - start_date).days
        trend_records = []

        if date_range_days <= 7:
            # Daily view Mon-Sun
            day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            daily_rev = {d: 0.0 for d in day_names}
            for o in won_deals:
                w_day = o["_resolved_date_obj"].weekday()  # Mon is 0, Sun is 6
                daily_rev[day_names[w_day]] += o["_resolved_amount"]
            for d in day_names:
                trend_records.append({"label": d, "revenue": daily_rev[d]})
        else:
            # Weekly segments (Week 1, Week 2, Week 3, Week 4)
            week_rev = {f"Week {i}": 0.0 for i in range(1, 5)}
            range_interval = max(1, date_range_days / 4.0)
            for o in won_deals:
                days_since_start = (o["_resolved_date_obj"] - start_date).days
                week_idx = min(3, int(days_since_start / range_interval))
                week_rev[f"Week {week_idx+1}"] += o["_resolved_amount"]
            for i in range(1, 5):
                trend_records.append({"label": f"Week {i}", "revenue": week_rev[f"Week {i}"]})

        # 11. Core Mathematical Reconciliation Checks
        # Validate totals perfectly match granular lists before shipping
        sum_rev_details = sum(item["amount"] for item in revenue_details)
        sum_mgr_revenue = sum(mgr["won_revenue"] for mgr in manager_performance)
        sum_exec_revenue = sum(exec_n["won_revenue"] for exec_n in executive_performance)
        
        if abs(total_revenue - sum_rev_details) >= 0.01:
            logger.warning(f"Sales overview reconciliation: total_revenue {total_revenue} != sum_rev_details {sum_rev_details}")
        if abs(total_revenue - sum_mgr_revenue) >= 0.01:
            logger.warning(f"Sales overview reconciliation: total_revenue {total_revenue} != sum_mgr_revenue {sum_mgr_revenue}")
        if abs(total_revenue - sum_exec_revenue) >= 0.01:
            logger.warning(f"Sales overview reconciliation: total_revenue {total_revenue} != sum_exec_revenue {sum_exec_revenue}")

        # 12. Dynamic target calculations
        default_annual_target = 35000000.0
        target_sum = 0.0
        active_targets = [t for t in sales_targets if str(t.get("status") or "").lower() == "active"]
        
        if executive_id:
            active_targets = [t for t in active_targets if str(t.get("executive_id")) == str(executive_id)]
        elif manager_id:
            active_targets = [t for t in active_targets if str(t.get("manager_id")) == str(manager_id)]
            
        if active_targets:
            target_sum = float(sum(float(t.get("target_amount") or 0.0) for t in active_targets))
        else:
            if executive_id:
                target_sum = 500000.0
            elif manager_id:
                target_sum = 2500000.0
            else:
                target_sum = default_annual_target

        # 13. Structure and return response
        return {
            "metrics": {
                "total_revenue": total_revenue,
                "total_customers": total_customers,
                "total_won_deals": len(won_deals),
                "total_pipeline_value": total_pipeline,
                "annual_sales_target": target_sum,
                "sales_target": target_sum
            },
            "revenue_details": revenue_details,
            "customers_details": customers_details,
            "manager_performance": manager_performance,
            "executive_performance": executive_performance,
            "revenue_trend": trend_records,
            "win_loss_summary": {
                "won": {
                    "count": len(won_deals),
                    "revenue": total_revenue
                },
                "lost": {
                    "count": len(lost_deals),
                    "value": total_lost_val
                },
                "open": {
                    "count": len(open_deals),
                    "pipeline": total_pipeline
                }
            }
        }

    def get_ceo_customer_directory(self) -> Dict[str, Any]:
        """
        Builds a full Manager → Executive → Customer hierarchy for the CEO directory.
        Uses real hrms.employees reporting_manager relationships as the source of truth.
        No hardcoded names. No mock data. All resolved from Supabase.
        """
        from app.modules.users.repository import UserRepository

        # ── 1. Load all users with resolved manager relationships ──────────────
        all_users = UserRepository().get_all_users()

        # Build lookup maps
        user_by_id: Dict[str, Dict] = {}
        user_by_email: Dict[str, Dict] = {}
        user_by_name_lower: Dict[str, Dict] = {}
        for u in all_users:
            uid = str(u.get("id") or u.get("auth_user_id") or "").strip()
            if uid:
                user_by_id[uid] = u
            uemail = str(u.get("email") or "").lower().strip()
            if uemail:
                user_by_email[uemail] = u
            uname = str(u.get("name") or u.get("full_name") or "").lower().strip()
            if uname:
                user_by_name_lower[uname] = u

        # ── 2. Identify all distinct Sales Managers ────────────────────────────
        # Managers: users whose role contains 'manager' (excluding Team Leads)
        sales_managers_map: Dict[str, Dict] = {}
        for u in all_users:
            role_str = str(u.get("role") or u.get("designation") or "").lower()
            uid = str(u.get("id") or u.get("auth_user_id") or "").strip()
            if "manager" in role_str and uid:
                if "ceo" in role_str or "founder" in role_str or "admin" in role_str or "lead" in role_str or "tl" in role_str:
                    continue
                sales_managers_map[uid] = u

        # Also find any user referenced as a reporting_manager_id (if strictly a manager)
        for u in all_users:
            mgr_id = str(u.get("reporting_manager_id") or "").strip()
            if mgr_id and mgr_id != "None" and mgr_id in user_by_id:
                mgr_user = user_by_id[mgr_id]
                mgr_role = str(mgr_user.get("role") or mgr_user.get("designation") or "").lower()
                if "ceo" in mgr_role or "founder" in mgr_role or "admin" in mgr_role or "lead" in mgr_role or "tl" in mgr_role:
                    continue
                if "manager" in mgr_role:
                    sales_managers_map[mgr_id] = mgr_user

        # ── 3. Build manager_id → list of executive user dicts ────────────────
        mgr_to_executives: Dict[str, list] = {mid: [] for mid in sales_managers_map}
        executives_without_manager = []
        assigned_executive_ids = set()

        for u in all_users:
            uid = str(u.get("id") or u.get("auth_user_id") or "").strip()
            role_str = str(u.get("role") or "").lower()
            
            # Skip pure manager records from being listed as their own executive
            if uid in sales_managers_map and not u.get("reporting_manager_id"):
                continue

            # Only consider sales executives / team members
            if "ceo" in role_str or "founder" in role_str or "admin" in role_str:
                continue

            if uid and uid in assigned_executive_ids:
                continue

            mgr_id = str(u.get("reporting_manager_id") or "").strip()
            mgr_name = str(u.get("reporting_manager_name") or "").lower().strip()

            matched_mgr_id = None
            if mgr_id and mgr_id in mgr_to_executives:
                matched_mgr_id = mgr_id
            elif mgr_name:
                for mid, muser in sales_managers_map.items():
                    mname = str(muser.get("name") or "").lower().strip()
                    if mname and mname == mgr_name:
                        matched_mgr_id = mid
                        break

            if matched_mgr_id:
                mgr_to_executives[matched_mgr_id].append(u)
                if uid:
                    assigned_executive_ids.add(uid)
            else:
                if uid not in assigned_executive_ids:
                    executives_without_manager.append(u)
                    if uid:
                        assigned_executive_ids.add(uid)

        # ── 4. Load leads to help resolve customer attribution ────────────────
        all_leads_raw = []
        try:
            res = self.supabase.schema("crm").table("leads").select("*").execute()
            if res.data:
                all_leads_raw = res.data
        except Exception:
            pass

        lead_by_id: Dict[str, Dict] = {
            str(l.get("lead_id") or l.get("id")): l for l in all_leads_raw if (l.get("lead_id") or l.get("id"))
        }

        # ── 5. Load all customers from crm.customers ──────────────────────────
        all_customers_raw = []
        try:
            res = self.supabase.schema("crm").table("customers").select("*").execute()
            if res.data:
                all_customers_raw = res.data
        except Exception as e:
            logger.warning(f"ceo_customer_directory: crm.customers fetch error: {e}")
            try:
                res = self.supabase.table("customers").select("*").execute()
                if res.data:
                    all_customers_raw = res.data
            except Exception:
                pass

        # ── 6. Resolve executive owner for each customer ───────────────────────
        exec_to_customers: Dict[str, list] = {}
        customers_without_exec = []

        for raw_c in all_customers_raw:
            cid = str(raw_c.get("customer_id") or raw_c.get("id") or "")
            cname = raw_c.get("name") or raw_c.get("company") or raw_c.get("company_name") or "Unnamed Customer"
            company = raw_c.get("company") or raw_c.get("company_name") or cname
            amount = float(raw_c.get("contract_value") or raw_c.get("amount") or raw_c.get("revenue") or 0.0)
            status = raw_c.get("status") or "Active Customer"
            onboard_date = str(raw_c.get("onboarding_date") or raw_c.get("created_at") or "")[:10]
            product = raw_c.get("product") or raw_c.get("service") or "TwiteConnect CRM"

            lid = str(raw_c.get("lead_id") or "").strip()
            lead = lead_by_id.get(lid) if lid and lid != "None" else None
            if lead and not raw_c.get("product"):
                product = lead.get("product_name") or lead.get("product") or product

            # Resolve executive owner for this customer.
            # Priority order (most specific/recent first):
            # 1. customer.sales_executive (set on create & on each reassignment)
            # 2. customer.current_owner (updated on reassignment)
            # 3. lead.assigned_to (fallback for older records without explicit SE)
            # 4. customer/lead created_by
            exec_user = None

            # 1. Check customer sales_executive field (primary — updated on reassign)
            se_val = str(raw_c.get("sales_executive") or "").strip()
            if se_val and se_val not in ("None", "Sales Executive", "Test Runner", "Direct/Unassigned"):
                if se_val in user_by_id:
                    exec_user = user_by_id[se_val]
                elif se_val.lower() in user_by_name_lower:
                    exec_user = user_by_name_lower[se_val.lower()]
                elif se_val in user_by_email:
                    exec_user = user_by_email[se_val]

            # 2. Check customer current_owner (UUID or name, updated on reassignment)
            if not exec_user:
                co_val = str(raw_c.get("current_owner") or "").strip()
                if co_val and co_val not in ("None", "—"):
                    if co_val in user_by_id:
                        exec_user = user_by_id[co_val]
                    elif co_val.lower() in user_by_name_lower:
                        exec_user = user_by_name_lower[co_val.lower()]

            # 3. Check lead assigned_to as fallback for older records
            if not exec_user and lead:
                lat = str(lead.get("assigned_to") or "").strip()
                if lat and lat != "None":
                    if lat in user_by_id:
                        exec_user = user_by_id[lat]
                    elif lat.lower() in user_by_name_lower:
                        exec_user = user_by_name_lower[lat.lower()]
                    elif lat in user_by_email:
                        exec_user = user_by_email[lat]

            # 4. Check customer assigned_to field
            if not exec_user:
                cat = str(raw_c.get("assigned_to") or "").strip()
                if cat and cat != "None":
                    if cat in user_by_id:
                        exec_user = user_by_id[cat]
                    elif cat.lower() in user_by_name_lower:
                        exec_user = user_by_name_lower[cat.lower()]
                    elif cat in user_by_email:
                        exec_user = user_by_email[cat]

            # 5. Check customer created_by
            if not exec_user:
                cb = str(raw_c.get("created_by") or "").strip()
                if cb and cb != "None":
                    if cb in user_by_id:
                        exec_user = user_by_id[cb]
                    elif cb.lower() in user_by_name_lower:
                        exec_user = user_by_name_lower[cb.lower()]

            # 6. Check lead created_by
            if not exec_user and lead:
                lcb = str(lead.get("created_by") or "").strip()
                if lcb and lcb != "None":
                    if lcb in user_by_id:
                        exec_user = user_by_id[lcb]
                    elif lcb.lower() in user_by_name_lower:
                        exec_user = user_by_name_lower[lcb.lower()]

            customer_record = {
                "customer_id": cid,
                "customer_name": cname,
                "company_name": company,
                "product": product,
                "amount": amount,
                "status": status,
                "date": onboard_date,
            }

            if exec_user:
                eid = str(exec_user.get("id") or exec_user.get("auth_user_id") or "")
                customer_record["executive_id"] = eid
                customer_record["executive_name"] = exec_user.get("name") or "Unnamed Executive"
                
                # Resolve Team Lead and Sales Manager accurately
                tl_id_of_exec = str(exec_user.get("reporting_team_lead_id") or exec_user.get("team_lead_id") or "").strip()
                tl_user = user_by_id.get(tl_id_of_exec) if tl_id_of_exec else None
                tl_name = (tl_user.get("name") if tl_user else (exec_user.get("reporting_team_lead_name") or exec_user.get("team_lead_name") or exec_user.get("team_lead"))) or "Unassigned"

                mgr_id_of_exec = str(exec_user.get("reporting_manager_id") or "").strip()
                mgr_user = user_by_id.get(mgr_id_of_exec) if mgr_id_of_exec else None
                mgr_name_str = str(exec_user.get("reporting_manager_name") or exec_user.get("reporting_manager") or "").strip()

                if not mgr_user and mgr_name_str and mgr_name_str.lower() in user_by_name_lower:
                    mgr_user = user_by_name_lower[mgr_name_str.lower()]

                if mgr_user:
                    m_role = str(mgr_user.get("role") or mgr_user.get("designation") or "").lower()
                    if ("lead" in m_role or "tl" in m_role) and not ("sales manager" in m_role and not "lead" in m_role):
                        # The user stored in reporting_manager field is actually a Team Lead!
                        if tl_name == "Unassigned":
                            tl_name = mgr_user.get("name") or mgr_name_str or "Unassigned"
                        # Look up manager above this Team Lead
                        parent_mgr_id = str(mgr_user.get("reporting_manager_id") or "").strip()
                        parent_mgr_user = user_by_id.get(parent_mgr_id) if parent_mgr_id else None
                        if not parent_mgr_user:
                            parent_mgr_name = str(mgr_user.get("reporting_manager_name") or "").strip()
                            if parent_mgr_name and parent_mgr_name.lower() in user_by_name_lower:
                                parent_mgr_user = user_by_name_lower[parent_mgr_name.lower()]
                        mgr_user = parent_mgr_user

                if not mgr_user and tl_user:
                    tl_mgr_id = str(tl_user.get("reporting_manager_id") or "").strip()
                    mgr_user = user_by_id.get(tl_mgr_id) if tl_mgr_id else None

                mgr_name = (mgr_user.get("name") if mgr_user else (exec_user.get("reporting_manager_name") if not ("lead" in str(exec_user.get("reporting_manager_name") or "").lower()) else "Unassigned")) or "Unassigned"
                customer_record["team_lead_name"] = tl_name
                customer_record["manager_name"] = mgr_name
                
                if eid not in exec_to_customers:
                    exec_to_customers[eid] = []
                exec_to_customers[eid].append(customer_record)
            else:
                customer_record["executive_id"] = ""
                customer_record["executive_name"] = "Unassigned"
                customer_record["team_lead_name"] = "Unassigned"
                customer_record["manager_name"] = "Unassigned"
                customers_without_exec.append(customer_record)

        # ── 7. Assemble the manager hierarchy list ─────────────────────────────
        managers_list = []

        for mgr_id, mgr_user in sorted(sales_managers_map.items(), key=lambda x: str(x[1].get("name") or "")):
            mgr_name = mgr_user.get("name") or "Unnamed Manager"
            executives_for_mgr = mgr_to_executives.get(mgr_id, [])

            exec_list = []
            mgr_customer_ids = set()

            for exec_user in executives_for_mgr:
                eid = str(exec_user.get("id") or exec_user.get("auth_user_id") or "")
                ename = exec_user.get("name") or "Unnamed Executive"
                exec_customers = exec_to_customers.get(eid, [])
                exec_cust_ids = set(c["customer_id"] for c in exec_customers)
                mgr_customer_ids.update(exec_cust_ids)

                exec_list.append({
                    "executive_id": eid,
                    "executive_name": ename,
                    "customer_count": len(exec_customers),
                    "customers": exec_customers
                })

            managers_list.append({
                "manager_id": mgr_id,
                "manager_name": mgr_name,
                "executive_count": len(exec_list),
                "customer_count": len(mgr_customer_ids),
                "executives": exec_list
            })

        # ── 8. Unassigned section ─────────────────────────────────────────────
        unassigned_exec_list = []
        for u in executives_without_manager:
            eid = str(u.get("id") or u.get("auth_user_id") or "")
            ename = u.get("name") or "Unnamed Executive"
            exec_customers = exec_to_customers.get(eid, [])
            if exec_customers:
                unassigned_exec_list.append({
                    "executive_id": eid,
                    "executive_name": ename,
                    "customer_count": len(exec_customers),
                    "customers": exec_customers
                })

        # Customers with no exec at all
        if customers_without_exec:
            unassigned_exec_list.append({
                "executive_id": "",
                "executive_name": "Direct / Unassigned",
                "customer_count": len(customers_without_exec),
                "customers": customers_without_exec
            })

        if unassigned_exec_list:
            unassigned_cust_ids = set(
                c["customer_id"]
                for e in unassigned_exec_list
                for c in e["customers"]
            )
            managers_list.append({
                "manager_id": "unassigned",
                "manager_name": "Unassigned / Direct",
                "executive_count": len(unassigned_exec_list),
                "customer_count": len(unassigned_cust_ids),
                "executives": unassigned_exec_list
            })

        # ── 9. Compute totals ─────────────────────────────────────────────────
        total_mgrs = len([m for m in managers_list if m["manager_id"] != "unassigned"])
        total_execs = sum(m["executive_count"] for m in managers_list)
        total_cust_ids = set()
        for c in all_customers_raw:
            cid = c.get("customer_id") or c.get("id")
            if cid:
                total_cust_ids.add(str(cid))
        total_revenue = sum(
            c["amount"]
            for m in managers_list
            for e in m["executives"]
            for c in e["customers"]
        )

        return {
            "managers": managers_list,
            "totals": {
                "managers": total_mgrs,
                "executives": total_execs,
                "customers": len(total_cust_ids),
                "revenue": total_revenue
            }
        }

    def save_sales_report(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        report_id = data.get("id")
        now_iso = datetime.utcnow().isoformat()
        
        manager_name = str(data.get("manager_name") or (user_payload or {}).get("name") or "Sales Manager")
        manager_email = str(data.get("manager_email") or (user_payload or {}).get("email") or "").lower().strip()
        manager_id = str(data.get("manager_id") or (user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "MGR-001")
        
        report_obj = {
            "employee_id": manager_id,
            "employee_name": manager_name,
            "manager_name": manager_name,
            "report_date": datetime.utcnow().date().isoformat(),
            "report_type": data.get("report_type"),
            "report_period": data.get("report_period"),
            "metrics": data.get("metrics", {}),
            "status": data.get("status", "Draft"),
            "ceo_remarks": data.get("ceo_remarks", ""),
            "updated_at": now_iso
        }
        
        if report_obj["status"] == "Submitted":
            report_obj["submitted_at"] = now_iso
            
        try:
            if report_id:
                # Update existing
                res = self.supabase.schema("system").table("reports_eod").update(report_obj).eq("id", report_id).execute()
                if not res.data:
                    res = self.supabase.table("reports_eod").update(report_obj).eq("id", report_id).execute()
            else:
                # Generate unique EOD report ID
                import uuid
                report_obj["id"] = f"EOD-SR-{uuid.uuid4().hex[:8]}"
                res = self.supabase.schema("system").table("reports_eod").insert(report_obj).execute()
                if not res.data:
                    res = self.supabase.table("reports_eod").insert(report_obj).execute()
                    
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Failed to save sales report to reports_eod: {e}")
            raise e
        return {}

    def get_sales_reports(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        from app.core.scoping import normalize_user_role
        role = normalize_user_role(user_payload.get("role") or user_payload.get("user_metadata", {}).get("role"))
        manager_id = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "")
        
        try:
            query = self.supabase.schema("system").table("reports_eod").select("*").in_("report_type", ["weekly", "monthly"])
            if role not in ("super_admin", "ceo", "admin", "ceo / founder") and manager_id:
                query = query.eq("employee_id", manager_id)
            res = query.order("created_at", desc=True).execute()
        except Exception:
            try:
                query = self.supabase.table("reports_eod").select("*").in_("report_type", ["weekly", "monthly"])
                if role not in ("super_admin", "ceo", "admin", "ceo / founder") and manager_id:
                    query = query.eq("employee_id", manager_id)
                res = query.order("created_at", desc=True).execute()
            except Exception as e:
                logger.error(f"Failed to fetch sales reports from reports_eod: {e}")
                return []
                
        return res.data if res and res.data else []

    def review_sales_report(self, report_id: str, status: str, remarks: str, user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        now_iso = datetime.utcnow().isoformat()
        ceo_name = str((user_payload or {}).get("name") or "CEO")
        update_obj = {
            "status": status,
            "ceo_remarks": remarks,
            "acknowledged": True,
            "acknowledged_by": ceo_name,
            "updated_at": now_iso
        }
        
        try:
            res = self.supabase.schema("system").table("reports_eod").update(update_obj).eq("id", report_id).execute()
            if not res.data:
                res = self.supabase.table("reports_eod").update(update_obj).eq("id", report_id).execute()
                
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Failed to review sales report {report_id} in reports_eod: {e}")
            raise e
        return {}

