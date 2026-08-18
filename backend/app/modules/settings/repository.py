from typing import Dict, Any, List
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

    def _run_schema_migration(self):
        import os
        try:
            sql_file = os.path.join(os.path.dirname(__file__), "migration_master_data.sql")
            if os.path.exists(sql_file):
                with open(sql_file, "r") as f:
                    sql = f.read()
                self.client.rpc("exec_sql", {"sql_query": sql}).execute()
                logger.info("Successfully ran auto schema migration for master data!")
        except Exception as e:
            logger.warning(f"Auto master data schema migration failed: {e}")

    def get_products(self) -> List[Dict[str, Any]]:
        try:
            res = self.client.schema("organization").table("products").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.warning(f"Failed to fetch products: {e}")
            if "relation" in str(e).lower() or "does not exist" in str(e).lower() or "could not find" in str(e).lower():
                logger.info("Table organization.products does not exist. Running migration...")
                self._run_schema_migration()
                try:
                    res = self.client.schema("organization").table("products").select("*").execute()
                    if res.data:
                        return res.data
                except Exception as retry_e:
                    logger.warning(f"Retry fetching products failed: {retry_e}")
        return []

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

        # 3. Dynamic User Counts calculation
        user_counts = {}
        try:
            emp_res = self.client.schema("hrms").table("employees").select("role").execute()
            if emp_res.data:
                for emp in emp_res.data:
                    r_raw = str(emp.get("role") or "").lower().strip()
                    r_id = "sales_executive"
                    if "manager" in r_raw:
                        r_id = "sales_manager"
                    elif "admin" in r_raw:
                        r_id = "admin"
                    elif "ceo" in r_raw or "founder" in r_raw:
                        r_id = "ceo"
                    elif "super" in r_raw:
                        r_id = "super_admin"
                    user_counts[r_id] = user_counts.get(r_id, 0) + 1
        except Exception as e:
            logger.debug(f"Could not calculate user counts dynamically: {e}")

        # 4. Fetch dynamic roles and permission matrix
        try:
            roles_res = self.client.schema("organization").table("roles").select("*").execute()
            rp_res = self.client.schema("organization").table("role_permissions").select("*, permissions:permission_id(*)").execute()
            
            if roles_res.data:
                db_roles = []
                for r in roles_res.data:
                    r_id = r.get("id")
                    role_perms = [item for item in (rp_res.data or []) if item.get("role_id") == r_id]
                    
                    structured_permissions = []
                    legacy_permissions = {}
                    
                    for rp in role_perms:
                        perm = rp.get("permissions") or {}
                        if not perm:
                            continue
                        
                        module = perm.get("module")
                        action = perm.get("action")
                        perm_key = perm.get("permission_key")
                        scope = rp.get("access_scope") or "All"
                        
                        structured_permissions.append({
                            "permission_key": perm_key,
                            "module": module,
                            "action": action,
                            "description": perm.get("description"),
                            "enabled": True,
                            "access_scope": scope
                        })
                        
                        # Legacy permission matrix mapping
                        legacy_mod = ""
                        m_low = module.lower()
                        if "crm" in m_low or "customer" in m_low:
                            legacy_mod = "crm"
                        elif "hrms" in m_low or "attendance" in m_low or "leave" in m_low:
                            legacy_mod = "hrms"
                        elif "pipeline" in m_low:
                            legacy_mod = "pipeline"
                        elif "finance" in m_low or "expense" in m_low:
                            legacy_mod = "finance"
                        elif "setting" in m_low or "company" in m_low or "user" in m_low:
                            legacy_mod = "settings"
                        elif "audit" in m_low:
                            legacy_mod = "audit"
                            
                        if legacy_mod:
                            if legacy_mod not in legacy_permissions:
                                legacy_permissions[legacy_mod] = []
                            
                            legacy_act = ""
                            act_lower = action.lower()
                            if "view" in act_lower or "read" in act_lower:
                                legacy_act = "read"
                            elif "create" in act_lower or "edit" in act_lower or "write" in act_lower:
                                legacy_act = "write"
                            elif "delete" in act_lower:
                                legacy_act = "delete"
                            else:
                                legacy_act = "admin"
                                
                            if legacy_act and legacy_act not in legacy_permissions[legacy_mod]:
                                legacy_permissions[legacy_mod].append(legacy_act)
                    
                    for m in ["crm", "hrms", "pipeline", "finance", "settings", "audit"]:
                        if m not in legacy_permissions:
                            legacy_permissions[m] = []
                            
                    db_roles.append({
                        "id": r_id,
                        "name": r.get("name"),
                        "description": r.get("description"),
                        "isSystem": r.get("is_system_role", False),
                        "is_active": r.get("is_active", True),
                        "userCount": user_counts.get(r_id, 0),
                        "permissions": legacy_permissions,
                        "structured_permissions": structured_permissions
                    })
                
                merged["role_permissions"] = db_roles
            else:
                raise ValueError("No roles found")
        except Exception as err:
            logger.debug(f"Falling back to default fallback RBAC matrix: {err}")
            # Fallback to local default matrix
            fallback_roles = [
                {
                    "id": "admin",
                    "name": "Admin",
                    "description": "Unrestricted access to all company settings and user management profiles.",
                    "isSystem": True,
                    "is_active": True,
                    "userCount": user_counts.get("admin", 2),
                    "permissions": {
                        "crm": ["read", "write", "delete", "admin"],
                        "hrms": ["read", "write", "delete", "admin"],
                        "pipeline": ["read", "write", "delete", "admin"],
                        "finance": ["read", "write", "delete", "admin"],
                        "settings": ["read", "write", "delete", "admin"],
                        "audit": ["read", "write", "delete", "admin"]
                    }
                },
                {
                    "id": "sales_manager",
                    "name": "Sales Manager",
                    "description": "Manage sales team leads, assign opportunities, approve claims, and track performance targets.",
                    "isSystem": True,
                    "is_active": True,
                    "userCount": user_counts.get("sales_manager", 4),
                    "permissions": {
                        "crm": ["read", "write", "delete"],
                        "hrms": ["read"],
                        "pipeline": ["read", "write", "admin"],
                        "finance": ["read", "write"],
                        "settings": [],
                        "audit": []
                    }
                },
                {
                    "id": "sales_executive",
                    "name": "Sales Executive",
                    "description": "Submit expense requests, check in daily, and manage assigned leads.",
                    "isSystem": True,
                    "is_active": True,
                    "userCount": user_counts.get("sales_executive", 8),
                    "permissions": {
                        "crm": ["read", "write"],
                        "hrms": ["read"],
                        "pipeline": ["read", "write"],
                        "finance": ["write"],
                        "settings": [],
                        "audit": []
                    }
                }
            ]
            merged["role_permissions"] = fallback_roles

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
            try:
                self.client.schema("organization").table("products").select("*").limit(1).execute()
            except Exception as e:
                if "relation" in str(e).lower() or "does not exist" in str(e).lower() or "could not find" in str(e).lower():
                    logger.info("Table organization.products does not exist on save. Running migration...")
                    self._run_schema_migration()

            received_ids = [item.get("id") for item in clean_updates["products"] if item.get("id")]
            if received_ids:
                try:
                    self.client.schema("organization").table("products").delete().not_in("id", received_ids).execute()
                except Exception as e:
                    logger.warning(f"Failed to delete stale products: {e}")
            else:
                try:
                    self.client.schema("organization").table("products").delete().neq("id", "").execute()
                except Exception as e:
                    logger.warning(f"Failed to clear products table: {e}")

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

        # Save updates to roles and role_permissions tables in Supabase
        if "role_permissions" in clean_updates:
            for role_data in clean_updates["role_permissions"]:
                role_id = role_data.get("id")
                if not role_id:
                    continue
                
                db_role = {
                    "id": role_id,
                    "name": role_data.get("name"),
                    "description": role_data.get("description"),
                    "is_system_role": role_data.get("isSystem", False),
                    "is_active": role_data.get("is_active", True)
                }
                
                try:
                    # 1. Upsert role profile
                    self.client.schema("organization").table("roles").upsert(db_role).execute()
                    
                    # 2. Clear old links and insert new active role permissions
                    if "structured_permissions" in role_data:
                        # Clear old mappings
                        self.client.schema("organization").table("role_permissions").delete().eq("role_id", role_id).execute()
                        
                        # Populate new mappings
                        for sp in role_data["structured_permissions"]:
                            # Skip if disabled (disabled is represented as enabled = False)
                            if sp.get("enabled") is False:
                                continue
                            
                            perm_key = sp.get("permission_key")
                            # Resolve permission_id matching perm_key
                            perm_res = self.client.schema("organization").table("permissions").select("id").eq("permission_key", perm_key).execute()
                            if perm_res.data:
                                perm_id = perm_res.data[0]["id"]
                                db_rp = {
                                    "role_id": role_id,
                                    "permission_id": perm_id,
                                    "access_scope": sp.get("access_scope", "All")
                                }
                                self.client.schema("organization").table("role_permissions").insert(db_rp).execute()
                except Exception as e:
                    logger.warning(f"Failed to save role_permissions for role '{role_id}': {e}")

        return self.get_settings()


