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
        self._setup_rls_policies()

    def _setup_rls_policies(self):
        sql = """
        -- For organization.branches
        ALTER TABLE organization.branches ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow select for authenticated users" ON organization.branches;
        CREATE POLICY "Allow select for authenticated users" ON organization.branches
          FOR SELECT TO authenticated USING (true);
        DROP POLICY IF EXISTS "Allow write for admins" ON organization.branches;
        CREATE POLICY "Allow write for admins" ON organization.branches
          FOR ALL TO authenticated
          USING (auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO'))
          WITH CHECK (auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO'));

        -- For organization.products
        ALTER TABLE organization.products ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow select for authenticated users" ON organization.products;
        CREATE POLICY "Allow select for authenticated users" ON organization.products
          FOR SELECT TO authenticated USING (true);
        DROP POLICY IF EXISTS "Allow write for admins" ON organization.products;
        CREATE POLICY "Allow write for admins" ON organization.products
          FOR ALL TO authenticated
          USING (auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO'))
          WITH CHECK (auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO'));

        -- For organization.product_branches
        ALTER TABLE organization.product_branches ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow select for authenticated users" ON organization.product_branches;
        CREATE POLICY "Allow select for authenticated users" ON organization.product_branches
          FOR SELECT TO authenticated USING (true);
        DROP POLICY IF EXISTS "Allow write for admins" ON organization.product_branches;
        CREATE POLICY "Allow write for admins" ON organization.product_branches
          FOR ALL TO authenticated
          USING (auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO'))
          WITH CHECK (auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO'));

        -- Update products_type_check constraint
        ALTER TABLE organization.products DROP CONSTRAINT IF EXISTS products_type_check;
        ALTER TABLE organization.products DROP CONSTRAINT IF EXISTS product_type_check;
        ALTER TABLE organization.products ADD CONSTRAINT products_type_check CHECK (product_type IN ('Product', 'Service', 'Subscription'));
        """
        try:
            self.client.rpc("exec_sql", {"sql_query": sql}).execute()
            logger.info("Successfully configured RLS policies and product type constraints for organization tables.")
        except Exception as e:
            logger.warning(f"Could not configure RLS policies or product type constraints: {e}")

    def _get_company_id(self) -> str:
        for tbl_name in ["company_profile", "organization_settings"]:
            try:
                res = self.client.schema("organization").table(tbl_name).select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    c_id = res.data[0].get("company_id") or res.data[0].get("id")
                    if c_id:
                        return c_id
            except Exception:
                pass
        return "TC-001"

    def _is_valid_uuid(self, val: str) -> bool:
        try:
            uuid.UUID(str(val))
            return True
        except ValueError:
            return False

    def _get_table_columns(self, table_name: str) -> List[str]:
        try:
            sql = f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'organization' AND table_name = '{table_name}';
            """
            res = self.client.rpc("exec_sql", {"sql_query": sql}).execute()
            if res.data:
                return [row["column_name"] for row in res.data]
        except Exception as e:
            logger.debug(f"Failed to fetch columns for {table_name} via RPC: {e}")
        
        # Fallback to standard columns based on table_name
        if table_name == "products":
            return ["id", "company_id", "product_code", "product_name", "product_type", "category", "description", "base_price", "tax_percentage", "launch_date", "status"]
        elif table_name == "branches":
            return ["id", "company_id", "branch_code", "branch_name", "branch_type", "location", "status"]
        return []

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

    # ─────────────────────────────────────────────────────────────
    # Branches CRUD Methods
    # ─────────────────────────────────────────────────────────────
    def create_branch(self, data: Dict[str, Any]) -> Dict[str, Any]:
        company_id = self._get_company_id()
        b_id = data.get("id")
        if not b_id or not self._is_valid_uuid(b_id):
            b_id = str(uuid.uuid4())

        branch_name = data.get("name") or data.get("branch_name")
        branch_type = data.get("type") or data.get("branch_type") or "Regional Office"
        address = data.get("location") or data.get("address") or ""

        db_item = {
            "id": b_id,
            "company_id": company_id,
            "branch_code": data.get("branch_code") or b_id[:8].upper(),
            "branch_name": branch_name,
            "branch_type": branch_type,
            "address": address,
            "city": data.get("city") or "",
            "state": data.get("state") or "",
            "country": data.get("country") or "India",
            "postal_code": data.get("postal_code") or "",
            "phone": data.get("phone") or "",
            "email": data.get("email") or "",
            "opening_date": data.get("opening_date") or None,
            "status": data.get("status") or "Active",
        }

        res = self.client.schema("organization").table("branches").insert(db_item).execute()
        if not res.data:
            raise ValueError("Insert failed: No data returned from Supabase branches")
        return res.data[0]

    def update_branch(self, branch_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        company_id = self._get_company_id()
        
        branch_name = data.get("name") or data.get("branch_name")
        branch_type = data.get("type") or data.get("branch_type")
        address = data.get("location") or data.get("address")

        db_item = {
            "company_id": company_id,
            "branch_name": branch_name,
            "branch_type": branch_type,
            "address": address,
            "city": data.get("city"),
            "state": data.get("state"),
            "country": data.get("country"),
            "postal_code": data.get("postal_code"),
            "phone": data.get("phone"),
            "email": data.get("email"),
            "opening_date": data.get("opening_date"),
            "status": data.get("status"),
        }
        db_item = {k: v for k, v in db_item.items() if v is not None}

        res = self.client.schema("organization").table("branches").update(db_item).eq("id", branch_id).execute()
        if not res.data:
            raise ValueError(f"Update failed: Branch {branch_id} not found or update error")
        return res.data[0]

    def delete_branch(self, branch_id: str) -> None:
        # First, remove mapping assignments in product_branches
        try:
            self.client.schema("organization").table("product_branches").delete().eq("branch_id", branch_id).execute()
        except Exception as e:
            logger.warning(f"Failed to clear product branches mapping for branch {branch_id}: {e}")

        # Then, delete branch row
        res = self.client.schema("organization").table("branches").delete().eq("id", branch_id).execute()
        if not res.data:
            logger.warning(f"Delete notice: Branch {branch_id} not found or already deleted")

    # ─────────────────────────────────────────────────────────────
    # Products CRUD Methods
    # ─────────────────────────────────────────────────────────────
    def create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        company_id = self._get_company_id()
        p_id = data.get("id")
        if not p_id or not self._is_valid_uuid(p_id):
            p_id = str(uuid.uuid4())

        product_name = data.get("name") or data.get("product_name")
        price_val = data.get("price") or data.get("base_price") or "0"
        
        try:
            cleaned_price = float(str(price_val).replace("₹", "").replace(",", "").split("/")[0].strip())
        except ValueError:
            cleaned_price = 0.0

        db_item = {
            "id": p_id,
            "company_id": company_id,
            "product_code": data.get("product_code") or p_id[:8].upper(),
            "product_name": product_name,
            "product_type": data.get("product_type") or "Product",
            "category": data.get("category") or "Subscription",
            "description": data.get("description") or "Product description",
            "base_price": cleaned_price,
            "tax_percentage": float(data.get("tax_percentage") or 18.0),
            "launch_date": data.get("launch_date") or "2026-08-20",
            "status": data.get("status") or "Active"
        }

        # 1. Insert product row
        res = self.client.schema("organization").table("products").insert(db_item).execute()
        if not res.data:
            raise ValueError("Insert failed: No product data returned from Supabase products")
        inserted_product = res.data[0]

        # 2. Insert branch mappings
        branches = data.get("branches") or []
        for br_id in branches:
            if br_id:
                db_pb = {
                    "id": str(uuid.uuid4()),
                    "product_id": p_id,
                    "branch_id": str(br_id)
                }
                try:
                    self.client.schema("organization").table("product_branches").insert(db_pb).execute()
                except Exception as e:
                    logger.error(f"Failed to link product {p_id} to branch {br_id}: {e}")
                    raise ValueError(f"Failed to assign product to branch '{br_id}': {e}")

        # Map back to UI format
        mapped = {
            "id": inserted_product.get("id"),
            "name": inserted_product.get("product_name"),
            "price": str(inserted_product.get("base_price")),
            "status": inserted_product.get("status"),
            "branches": branches
        }
        return mapped

    def update_product(self, product_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        company_id = self._get_company_id()
        
        product_name = data.get("name") or data.get("product_name")
        price_val = data.get("price") or data.get("base_price")

        db_item = {
            "company_id": company_id,
            "product_name": product_name,
            "product_type": data.get("product_type"),
            "category": data.get("category"),
            "description": data.get("description"),
            "status": data.get("status")
        }
        if price_val is not None:
            try:
                db_item["base_price"] = float(str(price_val).replace("₹", "").replace(",", "").split("/")[0].strip())
            except ValueError:
                db_item["base_price"] = 0.0
        if data.get("tax_percentage") is not None:
            db_item["tax_percentage"] = float(data.get("tax_percentage"))
        if data.get("launch_date") is not None:
            db_item["launch_date"] = data.get("launch_date")

        db_item = {k: v for k, v in db_item.items() if v is not None}

        # 1. Update product row
        res = self.client.schema("organization").table("products").update(db_item).eq("id", product_id).execute()
        if not res.data:
            raise ValueError(f"Update failed: Product {product_id} not found or update error")
        updated_product = res.data[0]

        # 2. Sync branch mappings
        if "branches" in data:
            # Delete old mappings
            self.client.schema("organization").table("product_branches").delete().eq("product_id", product_id).execute()
            
            # Insert new mappings
            branches = data["branches"]
            for br_id in branches:
                if br_id:
                    db_pb = {
                        "id": str(uuid.uuid4()),
                        "product_id": product_id,
                        "branch_id": str(br_id)
                    }
                    self.client.schema("organization").table("product_branches").insert(db_pb).execute()
        else:
            # Retrieve existing branch mappings
            res_pb = self.client.schema("organization").table("product_branches").select("branch_id").eq("product_id", product_id).execute()
            branches = [row["branch_id"] for row in (res_pb.data or [])]

        mapped = {
            "id": updated_product.get("id"),
            "name": updated_product.get("product_name"),
            "price": str(updated_product.get("base_price")),
            "status": updated_product.get("status"),
            "branches": branches
        }
        return mapped

    def delete_product(self, product_id: str) -> None:
        # First, remove mapping assignments in product_branches
        try:
            self.client.schema("organization").table("product_branches").delete().eq("product_id", product_id).execute()
        except Exception as e:
            logger.warning(f"Failed to clear product branches mapping for product {product_id}: {e}")

        # Then, delete product row
        res = self.client.schema("organization").table("products").delete().eq("product_id", product_id).execute()
        if not res.data:
            logger.warning(f"Delete notice: Product {product_id} not found or already deleted")

    # ─────────────────────────────────────────────────────────────
    # System Getters / Setters
    # ─────────────────────────────────────────────────────────────
    def get_products(self) -> List[Dict[str, Any]]:
        products_list = []
        try:
            res = self.client.schema("organization").table("products").select("*").execute()
            if res.data is not None:
                for row in res.data:
                    products_list.append({
                        "id": row.get("id"),
                        "name": row.get("product_name"),
                        "price": str(row.get("base_price") or "0"),
                        "product_type": row.get("product_type") or "Product",
                        "status": row.get("status") or "Active"
                    })
        except Exception as e:
            logger.warning(f"Failed to fetch products: {e}")

        # Fetch product_branches assignments
        product_branches_list = []
        try:
            res_pb = self.client.schema("organization").table("product_branches").select("*").execute()
            if res_pb.data:
                product_branches_list = res_pb.data
        except Exception as e:
            logger.debug(f"Failed to fetch product_branches mappings: {e}")

        for p in products_list:
            p_id = p.get("id")
            p["branches"] = [pb.get("branch_id") for pb in product_branches_list if pb.get("product_id") == p_id]

        return products_list

    def get_settings(self) -> Dict[str, Any]:
        merged = _in_memory_settings.copy()
        
        # 1. Try organization.company_profile / organization_settings in Supabase
        company_id = None
        for schema_tbl in ["company_profile", "organization_settings"]:
            try:
                res = self.client.schema("organization").table(schema_tbl).select("*").limit(1).execute()
                if res.data and len(res.data) > 0:
                    profile_data = res.data[0].copy()
                    # Remove JSONB branches/products to avoid stale mappings
                    profile_data.pop("branches", None)
                    profile_data.pop("products", None)
                    merged.update(profile_data)
                    company_id = res.data[0].get("company_id") or res.data[0].get("id")
                    break
            except Exception as e:
                logger.debug(f"organization.{schema_tbl} lookup fallback: {e}")

        if not company_id:
            company_id = "TC-001"

        # 2. Fetch master data from normalized tables
        for field, tbl in [
            ("designations", "designations"),
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

        # Fetch branches from organization.branches where company_id = company_id
        try:
            res_br = self.client.schema("organization").table("branches").select("*").eq("company_id", company_id).execute()
            if res_br.data:
                mapped_branches = []
                for b in res_br.data:
                    mapped_branches.append({
                        "id": b.get("id"),
                        "name": b.get("branch_name"),
                        "type": b.get("branch_type") or "Regional Office",
                        "location": b.get("address") or "",
                        "status": b.get("status") or "Active"
                    })
                merged["branches"] = mapped_branches
            else:
                merged["branches"] = []
        except Exception as e:
            logger.debug(f"Failed to fetch branches from organization.branches: {e}")
            merged["branches"] = []

        # Fetch products and their assignments
        merged["products"] = self.get_products()

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
        
        # Remove branches and products to prevent multiplexing
        clean_updates.pop("branches", None)
        clean_updates.pop("products", None)
        
        _in_memory_settings.update(clean_updates)

        # Get company_id first
        company_id = self._get_company_id()
        
        # Build organization_settings payload
        full_db_payload = {
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
            "departments": _in_memory_settings.get("departments"),
        }
        full_db_payload = {k: v for k, v in full_db_payload.items() if v is not None}

        # Save to organization.organization_settings / company_profile in Supabase
        for tbl_name in ["organization_settings", "company_profile"]:
            try:
                table_ref = self.client.schema("organization").table(tbl_name)
                existing = table_ref.select("*").limit(1).execute()
                
                if existing.data and len(existing.data) > 0:
                    rec_id = existing.data[0].get("id") or existing.data[0].get("company_id")
                    id_col = "id" if "id" in existing.data[0] else "company_id"
                    
                    # Clean payload to only include columns that exist in the target table
                    cols_res = self.client.rpc("exec_sql", {"sql_query": f"SELECT column_name FROM information_schema.columns WHERE table_schema = 'organization' AND table_name = '{tbl_name}';"}).execute()
                    if cols_res.data:
                        tbl_cols = [c["column_name"] for c in cols_res.data]
                        payload_cleaned = {k: v for k, v in full_db_payload.items() if k in tbl_cols}
                    else:
                        payload_cleaned = full_db_payload
                    
                    res = table_ref.update(payload_cleaned).eq(id_col, rec_id).execute()
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
