import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum

helper = get_schema_helper()

print("--- TESTING INSERT PAYLOAD VARIATIONS ON HRMS.EMPLOYEES ---")

variations = [
    {"first_name": "Test", "email": "test1@tconnect.com"},
    {"name": "Test", "email": "test2@tconnect.com"},
    {"employee_code": "EMP001", "first_name": "Test", "email": "test3@tconnect.com", "mobile": "9999999999"},
    {"email": "test4@tconnect.com"},
]

for i, p in enumerate(variations):
    try:
        res = helper.table(SchemaEnum.HRMS, "employees").insert(p).execute()
        print(f"✅ Variation {i+1} SUCCESS:", res.data)
        break
    except Exception as e:
        print(f"❌ Variation {i+1} FAILED:", e)
