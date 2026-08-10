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
            "notes": str(data.get("notes") or data.get("remarks") or ""),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        # 1. Primary: crm.opportunities
        try:
            res = self.supabase.schema("crm").table("opportunities").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[OPP INSERT SUCCESS] Opportunity saved in crm.opportunities: {res.data[0]}")
                out_opp = self._standardize_opp(res.data[0])
                _in_memory_opportunities.insert(0, out_opp)
                return out_opp
        except Exception as e:
            logger.debug(f"crm.opportunities insert notice: {e}")

        # 2. Fallback: public.opportunities
        try:
            res = self.supabase.table("opportunities").insert(payload).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"[OPP INSERT SUCCESS] Opportunity saved in public.opportunities: {res.data[0]}")
                out_opp = self._standardize_opp(res.data[0])
                _in_memory_opportunities.insert(0, out_opp)
                return out_opp
        except Exception as e:
            logger.warning(f"public.opportunities insert notice: {e}")

        out_opp = self._standardize_opp(payload)
        _in_memory_opportunities.insert(0, out_opp)
        return out_opp

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

        try:
            res = self.supabase.schema("crm").table("opportunities").update(updates).or_(f"id.eq.{opp_id},opportunity_id.eq.{opp_id}").execute()
            if res.data and len(res.data) > 0:
                return self._standardize_opp(res.data[0])
        except Exception:
            try:
                res = self.supabase.table("opportunities").update(updates).or_(f"id.eq.{opp_id},opportunity_id.eq.{opp_id}").execute()
                if res.data and len(res.data) > 0:
                    return self._standardize_opp(res.data[0])
            except Exception as e:
                logger.warning(f"Supabase opportunity update failed: {e}")

        for o in _in_memory_opportunities:
            if str(o.get("id")) == str(opp_id) or str(o.get("opportunity_id")) == str(opp_id):
                o.update(updates)
                return self._standardize_opp(o)

        updates["id"] = opp_id
        return self._standardize_opp(updates)

    def get_opportunity_by_id(self, opp_id: str) -> Optional[Dict[str, Any]]:
        opps = self.get_all_opportunities()
        for o in opps:
            if str(o.get("opportunity_id")) == str(opp_id) or str(o.get("id")) == str(opp_id):
                return o
        return None

