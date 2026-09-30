from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_opportunities: List[Dict[str, Any]] = [
    {"id": "1", "opportunity_id": "1", "company": "ABC Pvt Ltd", "title": "Enterprise Suite - ABC Pvt Ltd", "rep": "John Doe", "value": 45000, "stage": "Lead", "probability": 30, "age": 5},
    {"id": "2", "opportunity_id": "2", "company": "Tech Solutions", "title": "Cloud Migration - Tech Solutions", "rep": "Mary Jane", "value": 85000, "stage": "Qualified", "probability": 50, "age": 12},
    {"id": "3", "opportunity_id": "3", "company": "Global Corp", "title": "CRM Deployment - Global Corp", "rep": "Robert Smith", "value": 250000, "stage": "Negotiation", "probability": 80, "age": 24},
    {"id": "4", "opportunity_id": "4", "company": "Prime Systems", "title": "Annual Maintenance - Prime Systems", "rep": "David Brown", "value": 65000, "stage": "Proposal", "probability": 60, "age": 10},
    {"id": "5", "opportunity_id": "5", "company": "Next Gen Tech", "title": "Platform Upgrade - Next Gen Tech", "rep": "Mary Jane", "value": 120000, "stage": "Negotiation", "probability": 75, "age": 18},
    {"id": "6", "opportunity_id": "6", "company": "Vertex Systems", "title": "Integration - Vertex Systems", "rep": "David Brown", "value": 95000, "stage": "Won", "probability": 100, "age": 30},
    {"id": "7", "opportunity_id": "7", "company": "InnoTech Pvt Ltd", "title": "Analytics Pilot - InnoTech", "rep": "Robert Smith", "value": 50000, "stage": "Proposal", "probability": 40, "age": 8},
    {"id": "8", "opportunity_id": "8", "company": "Delta Softwares", "title": "Support Plan - Delta Softwares", "rep": "John Doe", "value": 35000, "stage": "Lost", "probability": 0, "age": 15},
]


class PipelineRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def _standardize_opp(self, o: Dict[str, Any]) -> Dict[str, Any]:
        row = dict(o)
        row["id"] = str(row.get("id") or row.get("opportunity_id") or "")
        row["opportunity_id"] = str(row.get("opportunity_id") or row.get("id") or "")
        row["company"] = row.get("company") or row.get("customer_name") or row.get("company_name") or "Prospect Client"
        row["customer_name"] = row["company"]
        row["title"] = row.get("title") or f"Deal - {row['company']}"
        row["stage"] = row.get("stage") or "Lead"
        
        # Parse numeric value
        val_raw = row.get("value") or row.get("expected_revenue") or 0
        if isinstance(val_raw, str):
            cleaned = val_raw.replace("₹", "").replace(",", "").strip()
            try:
                row["value"] = float(cleaned)
            except ValueError:
                row["value"] = 0.0
        else:
            row["value"] = float(val_raw or 0)
        row["expected_revenue"] = row["value"]

        row["probability"] = int(row.get("probability") or (100 if row["stage"] == "Won" else 0 if row["stage"] == "Lost" else 30))
        row["rep"] = row.get("rep") or row.get("assigned_to") or row.get("executive") or "Sales Executive"
        row["assigned_to"] = row["rep"]
        return row

    def get_all_opportunities(self, user_payload: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        opportunities = []
        try:
            res = self.supabase.schema("crm").table("opportunities").select("*").order("created_at", desc=True).execute()
            if res.data is not None and len(res.data) > 0:
                opportunities = [self._standardize_opp(o) for o in res.data]
        except Exception:
            pass

        if not opportunities:
            try:
                res = self.supabase.table("opportunities").select("*").order("created_at", desc=True).execute()
                if res.data is not None and len(res.data) > 0:
                    opportunities = [self._standardize_opp(o) for o in res.data]
            except Exception as e:
                logger.warning(f"Supabase opportunities fetch notice: {e}")

        if not opportunities:
            opportunities = [self._standardize_opp(o) for o in _in_memory_opportunities]

        from app.core.scoping import get_allowed_user_identifiers, is_record_accessible
        allowed = get_allowed_user_identifiers(user_payload)
        if allowed is not None:
            opportunities = [o for o in opportunities if is_record_accessible(o, allowed)]

        return opportunities

    def create_opportunity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        opp_id = str(data.get("id") or data.get("opportunity_id") or f"opp_{uuid.uuid4().hex[:8]}")
        comp = str(data.get("company") or data.get("customer_name") or data.get("company_name") or "New Prospect")
        title = str(data.get("title") or f"Opportunity - {comp}")
        stage = str(data.get("stage") or "Lead")
        rep = str(data.get("rep") or data.get("assigned_to") or data.get("executive") or "Sales Executive")

        val_raw = data.get("value") or data.get("expected_revenue") or 45000
        if isinstance(val_raw, str):
            try:
                val_num = float(val_raw.replace("₹", "").replace(",", "").strip())
            except ValueError:
                val_num = 0.0
        else:
            val_num = float(val_raw or 0.0)

        prob = int(data.get("probability") or (100 if stage == "Won" else 0 if stage == "Lost" else 30))
        now_iso = datetime.utcnow().isoformat()
        
        se_id = None
        se_name = rep
        try:
            from app.modules.users.repository import UserRepository
            all_users = UserRepository().get_all_users()
            user_map_by_name = {str(u.get("name") or u.get("full_name") or "").lower().strip(): u for u in all_users}
            user_map_by_email = {str(u.get("email") or "").lower().strip(): u for u in all_users}
            
            se_user = user_map_by_name.get(rep.lower().strip()) or user_map_by_email.get(rep.lower().strip())
            if se_user:
                se_name = se_user.get("name") or se_name
                se_id = se_user.get("user_id") or se_user.get("id") or se_user.get("employee_id")
        except Exception:
            pass

        payload = {
            "id": opp_id,
            "opportunity_id": opp_id,
            "title": title,
            "company": comp,
            "lead_id": str(data.get("lead_id")) if data.get("lead_id") else None,
            "customer_id": str(data.get("customer_id")) if data.get("customer_id") else None,
            "value": val_num,
            "stage": stage,
            "probability": prob,
            "rep": rep,
            "assigned_to": rep,
            "generated_by_employee_name": se_name,
            "generated_by_employee_id": se_id,
            "notes": str(data.get("notes") or data.get("remarks") or ""),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        out_opp = None
        # 1. Primary: crm.opportunities
        try:
            res = self.supabase.schema("crm").table("opportunities").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[OPP INSERT SUCCESS] Opportunity saved in crm.opportunities: {res.data[0]}")
                out_opp = self._standardize_opp(res.data[0])
        except Exception as e:
            logger.debug(f"crm.opportunities insert notice: {e}")

        # 2. Fallback: public.opportunities
        if not out_opp:
            try:
                res = self.supabase.table("opportunities").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    logger.info(f"[OPP INSERT SUCCESS] Opportunity saved in public.opportunities: {res.data[0]}")
                    out_opp = self._standardize_opp(res.data[0])
            except Exception as e:
                logger.warning(f"public.opportunities insert notice: {e}")

        if not out_opp:
            out_opp = self._standardize_opp(payload)

        _in_memory_opportunities.insert(0, out_opp)
        self._emit_opp_notif(out_opp, "OPPORTUNITY_CREATED")
        return out_opp

    def _emit_opp_notif(self, opp_data: Dict[str, Any], event_type: str = "OPPORTUNITY_CREATED"):
        try:
            from app.modules.notification.repository import NotificationRepository
            from app.modules.notification.helpers import build_notification_url
            opp_id = str(opp_data.get("id") or opp_data.get("opportunity_id") or "")
            comp = str(opp_data.get("company") or opp_data.get("company_name") or "Prospect")
            title_str = str(opp_data.get("title") or f"Opportunity - {comp}")
            rep_str = str(opp_data.get("rep") or opp_data.get("assigned_to") or "")
            stage_str = str(opp_data.get("stage") or "Lead")
            val_num = opp_data.get("value") or 0.0

            if event_type == "OPPORTUNITY_CREATED":
                notif_title = "New Opportunity Created"
                msg = f"Opportunity '{title_str}' (Value: ₹{val_num:,.0f}) created for {comp}."
            else:
                notif_title = "Pipeline Stage Updated"
                msg = f"Opportunity '{title_str}' moved to '{stage_str}' stage."

            raw_rep_id = str(opp_data.get("generated_by_employee_id") or opp_data.get("assigned_to_id") or opp_data.get("user_id") or "").strip()
            recip_id = raw_rep_id if ("-" in raw_rep_id or (raw_rep_id.isalnum() and " " not in raw_rep_id)) else ""
            recip_email = str(opp_data.get("assigned_to_email") or opp_data.get("email") or "").strip()

            if not recip_email and recip_id:
                try:
                    emp_res = self.supabase.schema("hrms").table("employees").select("email").or_(f"employee_id.eq.{recip_id},user_id.eq.{recip_id}").limit(1).execute()
                    if emp_res.data:
                        recip_email = emp_res.data[0].get("email") or ""
                except Exception:
                    pass

            notif_url = build_notification_url(event_type, opp_id, role="sales")
            NotificationRepository().create_notification({
                "recipient_id": recip_id,
                "recipient_email": recip_email,
                "recipient_role": "sales",
                "title": notif_title,
                "message": msg,
                "type": event_type,
                "url": notif_url,
            })
        except Exception as n_err:
            logger.warning(f"Opportunity notification emission failed: {n_err}")

    def update_opportunity_stage(self, opp_id: str, stage: str, probability: Optional[int] = None, notes: Optional[str] = None) -> Dict[str, Any]:
        now_iso = datetime.utcnow().isoformat()
        updates = {
            "stage": stage,
            "updated_at": now_iso,
        }
        if probability is not None:
            updates["probability"] = probability
        elif stage == "Won":
            updates["probability"] = 100
        elif stage == "Lost":
            updates["probability"] = 0
        if notes is not None:
            updates["notes"] = notes

        out_opp = None
        try:
            res = self.supabase.schema("crm").table("opportunities").update(updates).or_(f"id.eq.{opp_id},opportunity_id.eq.{opp_id}").execute()
            if res.data and len(res.data) > 0:
                out_opp = self._standardize_opp(res.data[0])
        except Exception:
            try:
                res = self.supabase.table("opportunities").update(updates).or_(f"id.eq.{opp_id},opportunity_id.eq.{opp_id}").execute()
                if res.data and len(res.data) > 0:
                    out_opp = self._standardize_opp(res.data[0])
            except Exception as e:
                logger.warning(f"Supabase opportunity update failed: {e}")

        if not out_opp:
            for o in _in_memory_opportunities:
                if str(o.get("id")) == str(opp_id) or str(o.get("opportunity_id")) == str(opp_id):
                    o.update(updates)
                    out_opp = self._standardize_opp(o)
                    break

        if not out_opp:
            updates["id"] = opp_id
            out_opp = self._standardize_opp(updates)

        self._emit_opp_notif(out_opp, "PIPELINE_STAGE_CHANGED")
        return out_opp

    def get_opportunity_by_id(self, opp_id: str) -> Optional[Dict[str, Any]]:
        opps = self.get_all_opportunities()
        for o in opps:
            if str(o.get("opportunity_id")) == str(opp_id) or str(o.get("id")) == str(opp_id):
                return o
        return None

