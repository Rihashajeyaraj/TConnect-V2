import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum

helper = get_schema_helper()

schema_checks = [
    (SchemaEnum.EXPENSE, "expenses"),
    (SchemaEnum.VISIT, "field_visits"),
    (SchemaEnum.ATTENDANCE, "attendance_logs"),
    (SchemaEnum.NOTIFICATION, "notifications"),
    (SchemaEnum.SETTINGS, "business_settings"),
    (SchemaEnum.PIPELINE, "opportunities"),
    (SchemaEnum.AUDIT, "audit_logs"),
]

print("--- SCHEMA-QUALIFIED TABLES DISCOVERY ---")
for schema, tbl in schema_checks:
    try:
        res = helper.table(schema, tbl).select("*").limit(1).execute()
        print(f"Schema '{schema.value}.{tbl}': EXISTS ({len(res.data) if res.data is not None else 0} rows)")
    except Exception as e:
        print(f"Schema '{schema.value}.{tbl}': MISSING ({str(e)[:60]})")
