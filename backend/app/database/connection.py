from supabase import Client
from app.database.supabase import get_supabase_client, get_supabase_admin_client
from app.core.constants import SchemaEnum


class SchemaTableHelper:
    """
    Helper to access PostgreSQL multi-schemas in Supabase cleanly:
    e.g. helper.table(SchemaEnum.CRM, "leads")
    """
    def __init__(self, client: Client = None):
        self.client = client or get_supabase_admin_client() or get_supabase_client()

    def table(self, schema_name: SchemaEnum, table_name: str):
        return self.client.schema(schema_name.value).table(table_name)


def get_schema_helper() -> SchemaTableHelper:
    return SchemaTableHelper()

