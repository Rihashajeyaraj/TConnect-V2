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
    "branches": [],
    "departments": [],
    "designations": [],
    "products": [],
    "lead_sources": [],
    "customer_categories": []
}


class SettingsRepository:
    def __init__(self):
        self.client = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_settings(self) -> Dict[str, Any]:
        merged = _in_memory_settings.copy()
        
        # 1. Try organization.organization_settings in Supabase
        for schema_tbl in ["organization_settings", "company_profile"]:
            try:
                res = self.client.schema("organization").table(schema_tbl).select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    merged.update(res.data[0])
                    break
            except Exception as e:
                logger.debug(f"organization.{schema_tbl} lookup fallback: {e}")

        # 2. Fetch master data from normalized tables
        for field, tbl in [
            ("designations", "designations"),
            ("products", "products"),
            ("lead_sources", "lead_sources"),
            ("customer_categories", "customer_categories")
        ]:
            try:
                res = self.client.schema("organization").table(tbl).select("*").execute()
                if res.data:
                    merged[field] = res.data
                else:
                    merged[field] = []
            except Exception as err:
                logger.debug(f"Failed to fetch {field} from organization.{tbl}: {err}")
                merged[field] = []

        return merged

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        # Filter None values
        clean_updates = {k: v for k, v in updates.items() if v is not None}
        _in_memory_settings.update(clean_updates)
        
        # Build organization_settings payload
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
                break
            except Exception as e:
                logger.warning(f"organization.{tbl_name} save notice: {e}")

        # Save updates to other master data tables
        if "designations" in clean_updates:
            for item in clean_updates["designations"]:
                db_item = {
                    "id": item.get("id") or f"DESG-{uuid.uuid4().hex[:8].upper()}",
                    "name": item.get("name"),
                    "status": item.get("status") or "Active"
                }
                try:
                    self.client.schema("organization").table("designations").upsert(db_item).execute()
                except Exception as e:
                    logger.warning(f"Failed to upsert designation: {e}")

        if "products" in clean_updates:
            for item in clean_updates["products"]:
                db_item = {
                    "id": item.get("id") or f"PROD-{uuid.uuid4().hex[:8].upper()}",
                    "name": item.get("name"),
                    "price": item.get("price"),
                    "status": item.get("status") or "Active"
                }
                try:
                    self.client.schema("organization").table("products").upsert(db_item).execute()
                except Exception as e:
                    logger.warning(f"Failed to upsert product: {e}")

        if "lead_sources" in clean_updates:
            for item in clean_updates["lead_sources"]:
                db_item = {
                    "id": item.get("id") or f"SRC-{uuid.uuid4().hex[:8].upper()}",
                    "name": item.get("name"),
                    "status": item.get("status") or "Active"
                }
                try:
                    self.client.schema("organization").table("lead_sources").upsert(db_item).execute()
                except Exception as e:
                    logger.warning(f"Failed to upsert lead_source: {e}")

        if "customer_categories" in clean_updates:
            for item in clean_updates["customer_categories"]:
                db_item = {
                    "id": item.get("id") or f"CAT-{uuid.uuid4().hex[:8].upper()}",
                    "name": item.get("name"),
                    "status": item.get("status") or "Active"
                }
                try:
                    self.client.schema("organization").table("customer_categories").upsert(db_item).execute()
                except Exception as e:
                    logger.warning(f"Failed to upsert customer_category: {e}")

        return self.get_settings()


