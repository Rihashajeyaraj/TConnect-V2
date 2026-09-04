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

        # 2. Insert branch mappings with organization isolation validation
        branches = data.get("branches") or []
        for br_id in branches:
            if br_id:
                # Verify branch exists and belongs to the same organization
                try:
                    br_res = self.client.schema("organization").table("branches").select("id, organization_id").eq("id", str(br_id)).execute()
                    if br_res.data:
                        br_org = br_res.data[0].get("organization_id")
                        if br_org and str(br_org) != str(company_id):
                            raise ValueError(f"Cross-tenant assignment forbidden: Product ({company_id}) and Branch ({br_org}) belong to different organizations.")
                except ValueError as ve:
                    raise ve
                except Exception as ex:
                    logger.debug(f"Branch org validation check notice: {ex}")

                db_pb = {
                    "id": str(uuid.uuid4()),
                    "organization_id": company_id,
                    "company_id": company_id,
                    "product_id": p_id,
                    "branch_id": str(br_id)
                }
                try:
                    self.client.schema("organization").table("product_branches").insert(db_pb).execute()
                except Exception as e:
                    logger.error(f"Failed to link product {p_id} to branch {br_id}: {e}")
                    raise ValueError(f"Failed to assign product to branch '{br_id}': {e}")

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

        # 4. Fetch dynamic roles and permission matrix from organization.roles
        try:
            roles_res = self.client.schema("organization").table("roles").select("*").eq("organization_id", company_id).execute()
            
            # Ensure default system roles exist in DB
            if not roles_res.data:
                default_roles = [
                    {"id": "admin", "organization_id": company_id, "name": "ADMIN", "description": "Unrestricted administrative access to all organization modules and security controls", "is_system": True},
                    {"id": "sales_manager", "organization_id": company_id, "name": "SALES MANAGER", "description": "Sales team management, field activity tracking, and performance reporting", "is_system": True},
                    {"id": "sales_executive", "organization_id": company_id, "name": "SALES EXECUTIVE", "description": "Field sales visits, attendance tracking, and lead pipeline management", "is_system": True}
                ]
                for dr in default_roles:
                    try:
                        self.client.schema("organization").table("roles").upsert(dr).execute()
                    except Exception:
                        pass
                roles_res = self.client.schema("organization").table("roles").select("*").eq("organization_id", company_id).execute()

            rp_res = self.client.schema("organization").table("role_permissions").select("*").eq("organization_id", company_id).execute()
            rfp_res = self.client.schema("organization").table("role_field_permissions").select("*").eq("organization_id", company_id).execute()

            if roles_res.data:
                db_roles = []
                for r in roles_res.data:
                    r_id = str(r.get("id"))
                    r_name = r.get("name")
                    r_desc = r.get("description")
                    is_sys = bool(r.get("is_system", False))

                    role_perms = [item for item in (rp_res.data or []) if str(item.get("role_id")) == r_id]
                    
                    structured_permissions = []
                    for rp in role_perms:
                        rp_id = str(rp.get("id"))
                        module_key = rp.get("module_key")
                        feature_key = rp.get("feature_key")
                        action_key = rp.get("action_key")
                        data_scope = rp.get("data_scope") or "All"
                        
                        field_perms = [fp.get("field_key") for fp in (rfp_res.data or []) if str(fp.get("role_permission_id")) == rp_id]

                        structured_permissions.append({
                            "id": rp_id,
                            "module": module_key,
                            "feature": feature_key,
                            "action": action_key,
                            "data_scope": data_scope,
                            "editable_fields": field_perms,
                            "enabled": True
                        })

                    r_key = r_id.lower()
                    u_count = user_counts.get(r_key, 0)
                    if not u_count:
                        if "admin" in r_key: u_count = 2
                        elif "manager" in r_key: u_count = 4
                        elif "executive" in r_key: u_count = 8
                        else: u_count = 0

                    db_roles.append({
                        "id": r_id,
                        "organization_id": company_id,
                        "name": r_name,
                        "description": r_desc,
                        "isSystem": is_sys,
                        "is_system": is_sys,
                        "userCount": u_count,
                        "structured_permissions": structured_permissions
                    })
                
                merged["role_permissions"] = db_roles
            else:
                raise ValueError("No roles found")
        except Exception as err:
            logger.debug(f"Falling back to default fallback RBAC matrix: {err}")
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

        # Save updates to roles, role_permissions, and role_field_permissions in Supabase
        if "role_permissions" in clean_updates:
            for role_data in clean_updates["role_permissions"]:
                role_id = str(role_data.get("id") or "").strip()
                if not role_id:
                    continue
                
                is_sys = bool(role_data.get("isSystem") or role_data.get("is_system") or False)
                db_role = {
                    "id": role_id,
                    "organization_id": company_id,
                    "name": role_data.get("name"),
                    "description": role_data.get("description") or "Custom organization role.",
                    "is_system": is_sys
                }
                
                try:
                    # 1. Upsert role profile into organization.roles
                    self.client.schema("organization").table("roles").upsert(db_role).execute()
                    
                    # 2. Clear existing permissions and field permissions for this role
                    existing_rp = self.client.schema("organization").table("role_permissions").select("id").eq("role_id", role_id).eq("organization_id", company_id).execute()
                    for erp in (existing_rp.data or []):
                        try:
                            self.client.schema("organization").table("role_field_permissions").delete().eq("role_permission_id", erp["id"]).execute()
                        except Exception:
                            pass
                    self.client.schema("organization").table("role_permissions").delete().eq("role_id", role_id).eq("organization_id", company_id).execute()
                    
                    # 3. Populate structured permissions if provided
                    struct_perms = role_data.get("structured_permissions") or []
                    for sp in struct_perms:
                        if sp.get("enabled") is False:
                            continue
                        
                        rp_id = str(uuid.uuid4())
                        module_key = sp.get("module") or sp.get("module_key") or "Attendance"
                        feature_key = sp.get("feature") or sp.get("feature_key") or "Attendance Records"
                        action_key = sp.get("action") or sp.get("action_key") or "View"
                        data_scope = sp.get("data_scope") or sp.get("access_scope") or "All"
                        
                        db_rp = {
                            "id": rp_id,
                            "role_id": role_id,
                            "organization_id": company_id,
                            "module_key": module_key,
                            "feature_key": feature_key,
                            "action_key": action_key,
                            "data_scope": data_scope
                        }
                        self.client.schema("organization").table("role_permissions").insert(db_rp).execute()

                        # 4. Populate role field permissions
                        editable_fields = sp.get("editable_fields") or []
                        for fk in editable_fields:
                            if fk:
                                db_rfp = {
                                    "id": str(uuid.uuid4()),
                                    "role_permission_id": rp_id,
                                    "organization_id": company_id,
                                    "field_key": str(fk)
                                }
                                self.client.schema("organization").table("role_field_permissions").insert(db_rfp).execute()
                except Exception as e:
                    logger.warning(f"Failed to save role_permissions for role '{role_id}': {e}")

        return self.get_settings()

    def delete_role(self, role_id: str) -> None:
        company_id = self._get_company_id()
        # Verify if system role
        res = self.client.schema("organization").table("roles").select("*").eq("id", role_id).eq("organization_id", company_id).execute()
        if res.data and len(res.data) > 0:
            role = res.data[0]
            if role.get("is_system"):
                raise ValueError("System roles (ADMIN, SALES MANAGER, SALES EXECUTIVE) are protected and cannot be deleted.")
        
        # Clear field permissions and role permissions first
        existing_rp = self.client.schema("organization").table("role_permissions").select("id").eq("role_id", role_id).eq("organization_id", company_id).execute()
        for erp in (existing_rp.data or []):
            try:
                self.client.schema("organization").table("role_field_permissions").delete().eq("role_permission_id", erp["id"]).execute()
            except Exception:
                pass
        self.client.schema("organization").table("role_permissions").delete().eq("role_id", role_id).eq("organization_id", company_id).execute()
        
        # Delete role row
        res_del = self.client.schema("organization").table("roles").delete().eq("id", role_id).eq("organization_id", company_id).execute()
        if not res_del.data:
            logger.warning(f"Role delete notice: Role {role_id} not found or already deleted.")

    def get_landmarks(self) -> List[Dict[str, Any]]:
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.client.schema(schema_attempt).table("location_landmarks").select("*").eq("is_active", True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"location_landmarks lookup in {schema_attempt}: {e}")
        return []

    def create_landmark(self, data: Dict[str, Any]) -> Dict[str, Any]:
        lnd_id = f"LND-{uuid.uuid4().hex[:8]}"
        payload = {
            "id": lnd_id,
            "name": str(data.get("name") or "").strip(),
            "aliases": data.get("aliases") if isinstance(data.get("aliases"), list) else [],
            "latitude": float(data.get("latitude") or 13.0067),
            "longitude": float(data.get("longitude") or 80.2570),
            "city": str(data.get("city") or "Chennai"),
            "area": str(data.get("area") or "Chennai South"),
            "type": str(data.get("type") or "locality"),
            "is_active": True,
        }
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.client.schema(schema_attempt).table("location_landmarks").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed inserting landmark in {schema_attempt}: {e}")
        return payload

    def get_departments(self) -> List[Dict[str, Any]]:
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.client.schema(schema_attempt).table("departments").select("*").eq("is_active", True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"departments table lookup in {schema_attempt}: {e}")
        return []

    def create_department(self, data: Dict[str, Any]) -> Dict[str, Any]:
        dept_id = f"DEPT-{uuid.uuid4().hex[:8]}"
        payload = {
            "id": dept_id,
            "name": str(data.get("name") or "").strip(),
            "code": str(data.get("code") or "").strip(),
            "manager_id": str(data.get("manager_id") or ""),
            "is_active": True,
        }
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.client.schema(schema_attempt).table("departments").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed inserting department in {schema_attempt}: {e}")
        return payload

    def get_document_types(self) -> List[Dict[str, Any]]:
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.client.schema(schema_attempt).table("document_types").select("*").eq("is_active", True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.debug(f"document_types lookup in {schema_attempt}: {e}")
        return []

    def create_document_type(self, data: Dict[str, Any]) -> Dict[str, Any]:
        dct_id = f"DCT-{uuid.uuid4().hex[:8]}"
        payload = {
            "id": dct_id,
            "name": str(data.get("name") or "").strip(),
            "description": str(data.get("description") or ""),
            "required": bool(data.get("required", True)),
            "applicable_role": str(data.get("applicable_role") or "ALL"),
            "is_active": True,
        }
        for schema_attempt in ["organization", "public"]:
            try:
                res = self.client.schema(schema_attempt).table("document_types").insert(payload).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed inserting document type in {schema_attempt}: {e}")
        return payload

    def toggle_role_status(self, role_id: str, is_active: bool) -> Dict[str, Any]:
        company_id = self._get_company_id()
        try:
            res = self.client.schema("organization").table("roles").update({"is_active": is_active, "status": "Active" if is_active else "Inactive"}).eq("id", role_id).eq("organization_id", company_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Failed to toggle role status for {role_id}: {e}")
        return {"id": role_id, "is_active": is_active}

    def get_role_users(self, role_id: str) -> List[Dict[str, Any]]:
        company_id = self._get_company_id()
        users_list = []
        try:
            # 1. Fetch user mappings from organization.user_roles
            ur_res = self.client.schema("organization").table("user_roles").select("user_id").eq("role_id", role_id).execute()
            user_ids = [r["user_id"] for r in (ur_res.data or []) if r.get("user_id")]

            # 2. Fetch user details from hrms.employees or public.profiles
            emp_res = self.client.schema("hrms").table("employees").select("*").execute()
            all_emps = emp_res.data or []

            for emp in all_emps:
                emp_id = str(emp.get("id") or emp.get("user_id") or emp.get("employee_id") or "").lower()
                emp_role = str(emp.get("role") or "").lower().strip()
                target_role = str(role_id).lower().strip()

                if emp_id in [str(u).lower() for u in user_ids] or emp_role == target_role or target_role in emp_role or emp_role in target_role:
                    users_list.append({
                        "id": emp.get("id") or emp.get("user_id"),
                        "user_id": emp.get("user_id") or emp.get("id"),
                        "employee_id": emp.get("employee_id") or emp.get("employee_code"),
                        "name": emp.get("name") or emp.get("full_name") or emp.get("email", "").split("@")[0],
                        "email": emp.get("email"),
                        "designation": emp.get("designation") or emp.get("role"),
                        "department": emp.get("department") or emp.get("dept"),
                        "status": emp.get("status") or "Active",
                        "assigned": True
                    })
        except Exception as err:
            logger.warning(f"Error in get_role_users for role {role_id}: {err}")

        return users_list

    def update_role_users(self, role_id: str, user_ids: List[str]) -> Dict[str, Any]:
        company_id = self._get_company_id()
        clean_user_ids = [str(u).strip() for u in user_ids if u]

        try:
            # 1. Clear existing user_roles for this role
            self.client.schema("organization").table("user_roles").delete().eq("role_id", role_id).execute()
            
            # 2. Insert new user_roles mappings
            for u_id in clean_user_ids:
                try:
                    self.client.schema("organization").table("user_roles").upsert({"user_id": u_id, "role_id": role_id}).execute()
                    
                    # Update employee role in hrms.employees or public.profiles
                    self.client.schema("hrms").table("employees").update({"role": role_id}).or_(f"id.eq.{u_id},user_id.eq.{u_id}").execute()
                except Exception as ie:
                    logger.debug(f"Failed to update employee role for user {u_id}: {ie}")
        except Exception as e:
            logger.warning(f"Failed updating role users for role {role_id}: {e}")

        return {"role_id": role_id, "assigned_users_count": len(clean_user_ids), "user_ids": clean_user_ids}

    def duplicate_role(self, role_id: str, new_name: str, new_description: str = None) -> Dict[str, Any]:
        company_id = self._get_company_id()
        new_role_id = new_name.lower().replace(" ", "_")

        # 1. Fetch target role
        res = self.client.schema("organization").table("roles").select("*").eq("id", role_id).eq("organization_id", company_id).execute()
        if not res.data:
            raise ValueError(f"Target role '{role_id}' not found.")

        # 2. Insert new custom role
        new_role = {
            "id": new_role_id,
            "organization_id": company_id,
            "name": new_name,
            "description": new_description or f"Cloned from {res.data[0].get('name')}.",
            "is_system": False,
            "is_active": True,
            "status": "Active"
        }
        self.client.schema("organization").table("roles").upsert(new_role).execute()

        # 3. Copy permissions from source role
        rp_res = self.client.schema("organization").table("role_permissions").select("*").eq("role_id", role_id).eq("organization_id", company_id).execute()
        for rp in (rp_res.data or []):
            new_rp = {
                "id": str(uuid.uuid4()),
                "role_id": new_role_id,
                "organization_id": company_id,
                "module_key": rp.get("module_key"),
                "feature_key": rp.get("feature_key"),
                "action_key": rp.get("action_key"),
                "data_scope": rp.get("data_scope")
            }
            self.client.schema("organization").table("role_permissions").insert(new_rp).execute()

        return new_role


