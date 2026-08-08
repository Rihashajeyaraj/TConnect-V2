from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger


class ExpenseRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_expenses(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        user_id = str((user_payload or {}).get("sub") or (user_payload or {}).get("user_id") or "")
        user_email = str((user_payload or {}).get("email") or "").lower().strip()
        user_role = str((user_payload or {}).get("role") or "").strip()
        user_emp_code = str((user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        is_executive = user_role not in ("Admin", "Super Admin", "System Admin", "Sales Manager", "Manager", "CEO")

        claims = []
        # Primary: try finance.expenses
        try:
            res = self.supabase.schema("finance").table("expenses").select("*").execute()
            if res.data is not None:
                claims = res.data
                logger.info(f"Fetched {len(claims)} expenses from finance.expenses")
        except Exception as e:
            logger.debug(f"finance.expenses fetch notice: {e}")

        # Fallback: try public.expenses
        if not claims:
            try:
                res = self.supabase.table("expenses").select("*").execute()
                if res.data is not None:
                    claims = res.data
                    logger.info(f"Fetched {len(claims)} expenses from public.expenses")
            except Exception as e:
                logger.warning(f"public.expenses fetch failed: {e}")

        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            claims = [e for e in claims if is_record_accessible(e, allowed)]

        return claims

    def create_expense(self, data: Dict[str, Any], user_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        expense_id = data.get("id") or data.get("expense_id") or str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()

        raw_user_id = data.get("user_id") or data.get("employee_id")
        user_id_uuid = str(raw_user_id) if (raw_user_id and len(str(raw_user_id)) == 36 and "-" in str(raw_user_id)) else None

        user_email = str(data.get("assigned_to_email") or (user_payload or {}).get("email") or data.get("email") or "").lower().strip()
        user_emp_code = str(data.get("employee_code") or (user_payload or {}).get("employee_code") or (user_payload or {}).get("employee_id") or "").strip()

        # Resolve user's reporting manager email and ID
        mgr_email = str(data.get("reporting_manager_email") or "").lower().strip()
        mgr_id = str(data.get("reporting_manager_id") or "").strip()
        if not mgr_email and (user_email or user_emp_code):
            try:
                from app.modules.users.repository import UserRepository
                all_u = UserRepository().get_all_users()
                for u in all_u:
                    e_mail = str(u.get("email") or "").lower().strip()
                    e_code = str(u.get("employee_code") or u.get("employee_id") or "").strip()
                    if (user_email and e_mail == user_email) or (user_emp_code and e_code == user_emp_code):
                        mgr_email = str(u.get("reporting_manager_email") or "").lower().strip()
                        mgr_id = str(u.get("reporting_manager_id") or "").strip()
                        break
            except Exception:
                pass

        emp_name = str(data.get("employee_name") or data.get("executiveName") or data.get("assigned_to") or (user_payload or {}).get("name") or "Sales Executive")
        emp_phone = str(data.get("employee_phone") or data.get("phone") or data.get("mobile") or "")
        desc_str = str(data.get("description") or data.get("remarks") or "Expense Claim")
        full_desc = f"{desc_str} | Employee: {emp_name} | Email: {user_email} | EMP: {user_emp_code} | Manager: {mgr_email}"

        payload = {
            "id": expense_id,
            "expense_id": expense_id,
            "user_id": user_id_uuid,
            "category": str(data.get("category") or data.get("type") or "General"),
            "amount": float(data.get("amount") or data.get("rawAmount") or 0),
            "currency": str(data.get("currency") or "INR"),
            "description": full_desc,
            "receipt_url": data.get("receipt_url") or data.get("receiptUrl") or None,
            "status": str(data.get("status") or "PENDING"),
            "created_at": now_iso,
        }

        # Dispatch real-time backend notification to assigned Sales Manager
        try:
            from app.modules.notification.repository import NotificationRepository
            amt_val = float(data.get("amount") or data.get("rawAmount") or 0)
            formatted_amt = f"₹{amt_val:,.2f}" if amt_val > 0 else "Expense Claim"
            
            NotificationRepository().create_notification({
                "recipient_id": mgr_id,
                "recipient_email": mgr_email,
                "recipient_role": "Sales Manager",
                "title": f"🧾 New Expense Claim Request: {formatted_amt} by {emp_name}",
                "message": f"Sales Executive {emp_name} ({user_email}) submitted a {payload['category']} expense request for {formatted_amt}. Requires your review and approval.",
                "type": "EXPENSE"
            })
        except Exception as notif_err:
            logger.warning(f"Failed dispatching expense notification to manager: {notif_err}")

        logger.info(f"[EXPENSE INSERT REQUEST] Inserting into finance.expenses with payload: {payload}")

        # 1. Primary: finance.expenses
        try:
            res = self.supabase.schema("finance").table("expenses").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[EXPENSE INSERT SUCCESS] Expense created in finance.expenses: {res.data[0]}")
                out_exp = res.data[0]
                out_exp["employee_name"] = emp_name
                out_exp["employee_phone"] = emp_phone
                out_exp["assigned_to_email"] = user_email
                out_exp["reporting_manager_email"] = mgr_email
                return out_exp
        except Exception as e:
            logger.debug(f"finance.expenses insert notice: {e}")

        # 2. Fallback: public.expenses
        try:
            res = self.supabase.table("expenses").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[EXPENSE INSERT SUCCESS] Expense created in public.expenses: {res.data[0]}")
                out_exp = res.data[0]
                out_exp["employee_name"] = emp_name
                out_exp["employee_phone"] = emp_phone
                out_exp["assigned_to_email"] = user_email
                out_exp["reporting_manager_email"] = mgr_email
                return out_exp
        except Exception as e:
            logger.error(f"Error creating expense in public.expenses: {e}")

        # 3. In-memory fallback
        logger.warning(f"Expense {expense_id} saved in-memory only (Supabase unavailable)")
        return payload

    def get_expense_by_id(self, exp_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = self.supabase.schema("finance").table("expenses").select("*").eq("id", exp_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("expenses").select("*").eq("id", exp_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        expenses = self.get_all_expenses()
        for e in expenses:
            if str(e.get("id")) == str(exp_id) or str(e.get("expense_id")) == str(exp_id):
                return e
        return None

    def update_expense_status(self, exp_id: str, status: str, manager_remarks: str = "", manager_payload: Dict[str, Any] = None) -> Dict[str, Any]:
        manager_name = str((manager_payload or {}).get("name") or (manager_payload or {}).get("full_name") or "Sales Manager")
        now_iso = datetime.utcnow().isoformat()

        payload = {
            "status": status.upper(),
            "manager_remarks": manager_remarks,
            "approved_by": manager_name if "APPROV" in status.upper() else None,
            "rejected_by": manager_name if "REJECT" in status.upper() else None,
            "returned_by": manager_name if "RETURN" in status.upper() else None,
            "updated_at": now_iso,
        }

        try:
            res = self.supabase.schema("finance").table("expenses").update(payload).eq("id", exp_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("expenses").update(payload).eq("id", exp_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"expenses update failed: {e}")
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"expense.claims update failed: {e}")

        exp = self.get_expense_by_id(exp_id) or {"id": exp_id}
        exp.update(payload)
        return exp

    def get_manager_expenses(self, user_payload: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
        params = params or {}
        all_claims = self.get_all_expenses(user_payload=user_payload)

        se_filter = str(params.get("sales_executive_id") or params.get("executive") or "").lower().strip()
        status_filter = str(params.get("status") or "").lower().strip()
        category_filter = str(params.get("category") or params.get("type") or "").lower().strip()
        search_filter = str(params.get("search") or "").lower().strip()

        filtered = []
        for e in all_claims:
            if not e:
                continue

            if se_filter and se_filter != "all":
                e_se_email = str(e.get("assigned_to_email") or e.get("executive_email") or e.get("email") or "").lower().strip()
                e_se_name = str(e.get("employee_name") or e.get("assigned_to") or e.get("executive") or "").lower().strip()
                e_se_code = str(e.get("employee_id") or e.get("employee_code") or "").lower().strip()

                se_clean = se_filter.split('@')[0] if '@' in se_filter else se_filter
                se_clean = se_clean.replace('-', '').replace('_', '')

                matches_se = (
                    e_se_email == se_filter
                    or e_se_name == se_filter
                    or e_se_code == se_filter
                    or (len(se_clean) >= 2 and (se_clean in e_se_email or se_clean in e_se_name or se_clean in e_se_code))
                )
                if not matches_se:
                    continue

            if status_filter and status_filter != "all":
                st = str(e.get("status") or "").lower().strip()
                if status_filter not in st:
                    continue

            if category_filter and category_filter != "all":
                cat = str(e.get("category") or "").lower().strip()
                if category_filter not in cat:
                    continue

            if search_filter:
                desc = str(e.get("description") or e.get("remarks") or "").lower()
                c_name = str(e.get("customer_name") or "").lower()
                e_id = str(e.get("expense_id") or e.get("id") or "").lower()
                se_n = str(e.get("employee_name") or e.get("assigned_to") or "").lower()

                if not (search_filter in desc or search_filter in c_name or search_filter in e_id or search_filter in se_n):
                    continue

            filtered.append(e)

        def parse_amt(v):
            if isinstance(v, (int, float)):
                return float(v)
            cleaned = str(v or "0").replace("₹", "").replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return 0.0

        pending_items = [x for x in all_claims if "pend" in str(x.get("status") or "").lower()]
        approved_items = [x for x in all_claims if "approv" in str(x.get("status") or "").lower()]
        rejected_items = [x for x in all_claims if "reject" in str(x.get("status") or "").lower()]

        page = int(params.get("page") or 1)
        limit = int(params.get("limit") or 50)
        start = (page - 1) * limit
        end = start + limit
        paginated = filtered[start:end]

        return {
            "summary": {
                "pending_approval": len(pending_items),
                "approved_today": len(approved_items),
                "rejected_today": len(rejected_items),
                "total_claims": len(all_claims),
                "today_claim_amount": f"₹{sum(parse_amt(x.get('amount')) for x in all_claims):,.2f}",
                "approved_amount": f"₹{sum(parse_amt(x.get('amount')) for x in approved_items):,.2f}",
                "rejected_amount": f"₹{sum(parse_amt(x.get('amount')) for x in rejected_items):,.2f}",
                "pending_amount": f"₹{sum(parse_amt(x.get('amount')) for x in pending_items):,.2f}",
            },
            "expenses": paginated,
            "total": len(filtered),
            "page": page,
            "limit": limit,
        }
