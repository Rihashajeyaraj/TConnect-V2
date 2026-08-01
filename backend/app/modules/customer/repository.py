from typing import List, Optional, Dict, Any
import uuid
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum
from app.core.logger import logger

_in_memory_customers: List[Dict[str, Any]] = []


class CustomerRepository:
    def __init__(self):
        self.supabase = get_supabase_admin_client() or get_supabase_client()
        self.helper = get_schema_helper()

    def get_all_customers(self) -> List[Dict[str, Any]]:
        try:
            res = self.helper.table(SchemaEnum.CUSTOMER, "accounts").select("*").execute()
            if res.data is not None:
                return res.data
        except Exception:
            try:
                res = self.supabase.table("customers").select("*").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Using memory fallback for Customer accounts: {e}")
        return _in_memory_customers

    def create_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = data.get("id") or str(uuid.uuid4())
        data["customer_id"] = data.get("customer_id") or data["id"]
        try:
            res = self.helper.table(SchemaEnum.CUSTOMER, "accounts").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception:
            try:
                res = self.supabase.table("customers").insert(data).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Stored customer in memory fallback: {e}")

        _in_memory_customers.append(data)
        return data

    def get_customer_by_id(self, cust_id: str) -> Optional[Dict[str, Any]]:
        customers = self.get_all_customers()
        for cust in customers:
            if str(cust.get("id")) == str(cust_id):
                return cust
        return None

    def update_customer(self, cust_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        for payload in [updates, {k: v for k, v in updates.items() if v is not None}]:
            try:
                res = self.helper.table(SchemaEnum.CUSTOMER, "accounts").update(payload).eq("id", cust_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                try:
                    res = self.supabase.table("customers").update(payload).eq("id", cust_id).execute()
                    if res.data and len(res.data) > 0:
                        return res.data[0]
                except Exception as e:
                    logger.warning(f"Customer update attempt failed: {e}")

        for cust in _in_memory_customers:
            if str(cust.get("id")) == str(cust_id):
                cust.update(updates)
                return cust
        return updates

