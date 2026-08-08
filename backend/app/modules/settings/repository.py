from typing import Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_settings: Dict[str, Any] = {
    "company_name": "TwiteConnect Technologies Pvt. Ltd.",
    "legal_name": "TwiteConnect Software Solutions & Services",
    "tax_id_gstin": "33AAAAA0000A1Z5",
    "email": "contact@tconnect.com",
    "phone": "+91 98765 43210",
    "website": "https://twiteconnect.com",
    "address": "Plot 45, OMR IT Expressway, Perungudi, Chennai - 600096, Tamil Nadu",
    "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80",
    "currency": "INR (₹)",
    "time_zone": "Asia/Kolkata (IST)",
    "allow_self_signup": False,
    "rate_limit_per_min": 60,
    "branches": [
        {"id": 1, "name": "Chennai Head Office", "type": "Head Office", "location": "OMR Expressway, Chennai", "status": "Active", "staffCount": 14},
        {"id": 2, "name": "Bangalore Regional Office", "type": "Regional Office", "location": "Indiranagar, Bangalore", "status": "Active", "staffCount": 8},
        {"id": 3, "name": "Hyderabad Branch", "type": "Regional Office", "location": "HITEC City, Hyderabad", "status": "Active", "staffCount": 6},
        {"id": 4, "name": "Mumbai Commercial Office", "type": "Regional Office", "location": "BKC, Mumbai", "status": "Active", "staffCount": 4}
    ],
    "departments": [
        {"id": 1, "name": "Sales & Business Development", "lead": "Rajesh Kumar", "staffCount": 12, "budget": "₹15,00,000"},
        {"id": 2, "name": "Marketing & Growth", "lead": "Priya Sharma", "staffCount": 5, "budget": "₹8,00,000"},
        {"id": 3, "name": "Customer Support & Success", "lead": "Karthik Raja", "staffCount": 6, "budget": "₹6,00,000"},
        {"id": 4, "name": "Finance & Accounts", "lead": "Suresh V", "staffCount": 3, "budget": "₹5,00,000"}
    ]
}


class SettingsRepository:
    def __init__(self):
        self.client = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_settings(self) -> Dict[str, Any]:
        # 1. Try organization.organization_settings / organization.company_profile in Supabase
        for schema_tbl in ["organization_settings", "company_profile"]:
            try:
                res = self.client.schema("organization").table(schema_tbl).select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    merged = _in_memory_settings.copy()
                    merged.update(res.data[0])
                    return merged
            except Exception as e:
                logger.debug(f"organization.{schema_tbl} lookup fallback: {e}")

        return _in_memory_settings

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        _in_memory_settings.update({k: v for k, v in updates.items() if v is not None})
        
        # Build comprehensive database payload for organization.organization_settings
        full_db_payload = {
            "id": "TC-001",
            "company_name": _in_memory_settings.get("company_name"),
            "company_code": _in_memory_settings.get("company_code", "TC-001"),
            "email": _in_memory_settings.get("email"),
            "phone": _in_memory_settings.get("phone"),
            "website": _in_memory_settings.get("website"),
            "address": _in_memory_settings.get("address"),
            "legal_name": _in_memory_settings.get("legal_name"),
            "tax_id_gstin": _in_memory_settings.get("tax_id_gstin"),
            "pan_no": _in_memory_settings.get("pan_no"),
            "registration_no": _in_memory_settings.get("registration_no"),
            "time_zone": _in_memory_settings.get("time_zone"),
            "logo_url": _in_memory_settings.get("logo_url"),
            "currency": _in_memory_settings.get("currency"),
            "branches": _in_memory_settings.get("branches"),
            "departments": _in_memory_settings.get("departments"),
        }
        full_db_payload = {k: v for k, v in full_db_payload.items() if v is not None}

        # Save to organization.organization_settings in Supabase
        for tbl_name in ["organization_settings", "company_profile"]:
            try:
                table_ref = self.client.schema("organization").table(tbl_name)
                existing = table_ref.select("*").limit(1).execute()
                
                if existing.data and len(existing.data) > 0:
                    rec_id = existing.data[0].get("id") or existing.data[0].get("company_id")
                    id_col = "id" if "id" in existing.data[0] else "company_id"
                    res = table_ref.update(full_db_payload).eq(id_col, rec_id).execute()
                else:
                    res = table_ref.insert(full_db_payload).execute()

                logger.info(f"Saved company details to organization.{tbl_name} in Supabase!")
                if res.data and len(res.data) > 0:
                    _in_memory_settings.update(res.data[0])
                break
            except Exception as e:
                logger.warning(f"organization.{tbl_name} save notice: {e}")

        return _in_memory_settings

