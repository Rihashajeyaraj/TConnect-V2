import os
import sys
from supabase import create_client

# Old DB (Read-Only Source)
OLD_URL = "https://cljifufjjwrdgethvfvl.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsamlmdWZqandyZGdldGh2ZnZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI0NjU4NywiZXhwIjoyMTAwODIyNTg3fQ.T0i6ObPVpaSBQm3RyyzkFIHude4BndrpQ3eThtMfmWY"

# New DB (Destination)
NEW_URL = "https://kzmeyssfgfybfrjczutg.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bWV5c3NmZ2Z5YmZyamN6dXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU3MjM0OCwiZXhwIjoyMTA1MTQ4MzQ4fQ.QWTrXhg09UifqdKtuwg_mzZdOFjHbS2gX2vCJqm-Wq4"

def migrate():
    print("--- Initializing Migration from Old Supabase DB to New Supabase DB ---")
    old_client = create_client(OLD_URL, OLD_KEY)
    new_client = create_client(NEW_URL, NEW_KEY)

    # Tables to migrate: (schema_name, table_name)
    tables = [
        ("hrms", "employees"),
        ("public", "employees"),
        ("crm", "leads"),
        ("public", "leads"),
        ("crm", "contacts"),
        ("public", "contacts"),
        ("crm", "opportunities"),
        ("public", "opportunities"),
        ("crm", "follow_ups"),
        ("public", "follow_ups"),
        ("public", "visits"),
        ("public", "expenses"),
        ("public", "notifications"),
        ("public", "salaries"),
        ("public", "leave_requests"),
        ("public", "auto_save_drafts"),
        ("public", "push_subscriptions"),
        ("public", "sales_activities"),
        ("public", "sales_reports"),
        ("public", "tracking_events"),
    ]

    total_migrated = 0

    for schema, table in tables:
        try:
            # 1. Fetch data from Old DB (Read-Only)
            print(f"[FETCH] Fetching records from [{schema}.{table}] on Old DB...")
            if schema != "public":
                res = old_client.schema(schema).table(table).select("*").execute()
            else:
                res = old_client.table(table).select("*").execute()

            rows = res.data or []
            if not rows:
                print(f"   [INFO] [{schema}.{table}] is empty or unavailable on Old DB. Skipping.")
                continue

            print(f"   Found {len(rows)} record(s) in [{schema}.{table}]. Migrating to New DB...")

            # 2. Insert/Upsert into New DB
            if schema != "public":
                insert_res = new_client.schema(schema).table(table).upsert(rows).execute()
            else:
                insert_res = new_client.table(table).upsert(rows).execute()

            inserted_count = len(insert_res.data or [])
            total_migrated += inserted_count
            print(f"   [SUCCESS] Successfully migrated {inserted_count} record(s) to New DB [{schema}.{table}]!")

        except Exception as e:
            print(f"   [NOTICE] [{schema}.{table}]: {e}")

    print(f"\n--- Migration finished! Total records transferred to New DB: {total_migrated} ---")


if __name__ == "__main__":
    migrate()
