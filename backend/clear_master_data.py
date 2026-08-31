import sys
sys.path.append("c:/Users/RIHASHA/OneDrive/Desktop/tconnect/TConnect/backend")
from app.database.supabase import get_supabase_admin_client

client = get_supabase_admin_client()

print("Clearing branches...")
try:
    res = client.schema("organization").table("branches").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared branches:", len(res.data) if res.data else 0)
except Exception as e:
    print("Error branches:", e)

print("Clearing products...")
try:
    res = client.schema("organization").table("products").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared products:", len(res.data) if res.data else 0)
except Exception as e:
    print("Error products:", e)

for tbl in ["designations", "lead_sources", "customer_categories"]:
    print(f"Clearing {tbl}...")
    try:
        res = client.schema("organization").table(tbl).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared {tbl}:", len(res.data) if res.data else 0)
    except Exception as e:
        print(f"Error {tbl}:", e)

for schema_tbl in ["company_profile", "organization_settings"]:
    print(f"Resetting {schema_tbl}...")
    try:
        res = client.schema("organization").table(schema_tbl).update({
            "departments": []
        }).neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Reset {schema_tbl}:", len(res.data) if res.data else 0)
    except Exception as e:
        print(f"Error {schema_tbl}:", e)

print("Master data cleared!")
