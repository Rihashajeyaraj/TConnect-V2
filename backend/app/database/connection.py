from supabase import Client
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.constants import SchemaEnum


class SchemaTableHelper:
    """
    Helper to access PostgreSQL multi-schemas in Supabase cleanly:
    e.g. helper.table("hrms", "employees") or helper.table(SchemaEnum.CRM, "leads")
    """
    def __init__(self, client: Client = None):
        self.client = client or get_supabase_admin_client() or get_supabase_client()

    def _resolve_schema(self, schema_name) -> str:
        if isinstance(schema_name, SchemaEnum):
            return schema_name.value
        return str(schema_name).strip()

    def table(self, schema_name, table_name: str):
        schema_str = self._resolve_schema(schema_name)
        return self.client.schema(schema_str).table(table_name)

    def from_(self, schema_name, table_name: str):
        schema_str = self._resolve_schema(schema_name)
        return self.client.schema(schema_str).from_(table_name)


def get_schema_helper() -> SchemaTableHelper:
    return SchemaTableHelper()

