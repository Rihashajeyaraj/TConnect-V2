import os
import sys
import csv
import glob

# Increase CSV max field size limit for large base64/JSON columns
csv.field_size_limit(2147483647)

NEW_URL = "https://kzmeyssfgfybfrjczutg.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bWV5c3NmZ2Z5YmZyamN6dXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU3MjM0OCwiZXhwIjoyMTA1MTQ4MzQ4fQ.QWTrXhg09UifqdKtuwg_mzZdOFjHbS2gX2vCJqm-Wq4"

PRIMARY_SCHEMA_MAP = {
    "expenses": ["finance", "public"],
    "claims": ["finance", "public"],
    "employees": ["hrms", "public"],
    "attendance": ["hrms", "public"],
    "leave_requests": ["hrms", "public"],
    "enrollments": ["hrms", "public"],
    "salaries": ["hrms", "public"],
    "branches": ["hrms", "organization", "public"],
    "organization_settings": ["organization", "public"],
    "company_profile": ["organization", "public"],
    "leads": ["crm", "public"],
    "customers": ["crm", "public"],
    "opportunities": ["crm", "public"],
    "contacts": ["crm", "public"],
    "follow_ups": ["crm", "public"],
    "visits": ["field_management", "public"],
    "tracking_sessions": ["field_management", "public"],
    "tracking_locations": ["field_management", "public"],
    "tracking_events": ["field_management", "public"],
    "employee_locations": ["field_management", "public"],
    "notifications": ["system", "public"],
    "reports_eod": ["system", "public"],
    "todos": ["system", "public"],
    "audit_logs": ["system", "public"],
    "auto_save_drafts": ["system", "public"],
    "push_subscriptions": ["system", "public"],
    "roles": ["system", "public"],
    "role_permissions": ["system", "public"],
}

ALL_SCHEMAS = ["finance", "hrms", "crm", "field_management", "organization", "system", "sales", "public"]

PRIORITY_ORDER = [
    "expenses", "visits", "notifications", "organization_settings", "roles", 
    "role_permissions", "reports_eod", "todos", "employees", "leads", 
    "customers", "contacts", "opportunities", "attendance", "salaries", 
    "leave_requests", "enrollments", "auto_save_drafts", "push_subscriptions", 
    "branches", "employee_locations", "tracking_sessions", "tracking_events", 
    "tracking_locations", "audit_logs"
]

def clean_val(v):
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        if s == "":
            return None
        if s.lower() == "true":
            return True
        if s.lower() == "false":
            return False
        if s == "null" or s == "NULL":
            return None
        return s
    return v

def import_csvs():
    print("--- Priority CSV Auto-Importer for New Supabase Project ---", flush=True)
    from supabase import create_client
    client = create_client(NEW_URL, NEW_KEY)
    
    csv_dir = os.path.join(os.path.dirname(__file__), "csv_exports")
    if not os.path.exists(csv_dir):
        os.makedirs(csv_dir)
        print(f"[INFO] Created folder: {csv_dir}", flush=True)
        return

    csv_files = glob.glob(os.path.join(csv_dir, "*.csv"))
    if not csv_files:
        print(f"[INFO] No .csv files found in '{csv_dir}'.", flush=True)
        return

    def get_priority(filepath):
        raw_name = os.path.splitext(os.path.basename(filepath))[0].lower()
        table_name = raw_name.split("(")[0].replace("_rows", "").replace("_data", "").strip()
        if table_name in PRIORITY_ORDER:
            return PRIORITY_ORDER.index(table_name)
        return 999

    csv_files.sort(key=get_priority)

    for file_path in csv_files:
        raw_name = os.path.splitext(os.path.basename(file_path))[0].lower()
        table_name = raw_name.split("(")[0].replace("_rows", "").replace("_data", "").strip()
        print(f"\n[IMPORTING] Reading '{os.path.basename(file_path)}' into target table '{table_name}'...", flush=True)
        
        try:
            with open(file_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                rows = [row for row in reader]

            if not rows:
                print(f"   [INFO] '{file_path}' is empty. Skipping.", flush=True)
                continue

            cleaned_rows = []
            for r in rows:
                cleaned = {}
                for k, v in r.items():
                    if k is None:
                        continue
                    clean_k = k.strip()
                    cleaned[clean_k] = clean_val(v)
                
                # Trim oversized base64 receipt_url strings (>300KB) to prevent Postgres statement timeout
                if table_name == "expenses" and cleaned.get("receipt_url"):
                    val = str(cleaned.get("receipt_url"))
                    if len(val) > 300000:
                        cleaned["receipt_url"] = None

                cleaned_rows.append(cleaned)

            total_rows = len(cleaned_rows)
            print(f"   Uploading {total_rows} record(s) to New DB table '{table_name}'...", flush=True)

            schemas_to_try = list(PRIMARY_SCHEMA_MAP.get(table_name, ALL_SCHEMAS))
            for s in ALL_SCHEMAS:
                if s not in schemas_to_try:
                    schemas_to_try.append(s)

            batch_size = 25

            for schema in schemas_to_try:
                try:
                    imported_count = 0
                    for i in range(0, total_rows, batch_size):
                        chunk = cleaned_rows[i:i+batch_size]
                        if schema != "public":
                            res = client.schema(schema).table(table_name).upsert(chunk).execute()
                        else:
                            res = client.table(table_name).upsert(chunk).execute()
                        imported_count += len(res.data or chunk)

                    print(f"   [SUCCESS] Imported {imported_count} record(s) into [{schema}.{table_name}]!", flush=True)
                    break
                except Exception as e:
                    err_msg = str(e)
                    if "404" in err_msg or "PGRST205" in err_msg or "Relation" in err_msg or "does not exist" in err_msg:
                        continue
                    print(f"   [NOTICE] Schema [{schema}.{table_name}]: {err_msg[:120]}", flush=True)

        except Exception as err:
            print(f"   [ERROR] Failed to import '{file_path}': {err}", flush=True)

    print("\n--- CSV Import Completed! ---", flush=True)

if __name__ == "__main__":
    import_csvs()
