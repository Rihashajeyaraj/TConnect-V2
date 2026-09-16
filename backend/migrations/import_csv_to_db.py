import os
import sys
import csv
import glob
from supabase import create_client

# Increase CSV max field size limit for large base64/JSON columns
csv.field_size_limit(2147483647)

NEW_URL = "https://kzmeyssfgfybfrjczutg.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bWV5c3NmZ2Z5YmZyamN6dXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU3MjM0OCwiZXhwIjoyMTA1MTQ4MzQ4fQ.QWTrXhg09UifqdKtuwg_mzZdOFjHbS2gX2vCJqm-Wq4"

def import_csvs():
    print("--- CSV Auto-Importer for New Supabase Project ---")
    client = create_client(NEW_URL, NEW_KEY)
    
    csv_dir = os.path.join(os.path.dirname(__file__), "csv_exports")
    if not os.path.exists(csv_dir):
        os.makedirs(csv_dir)
        print(f"[INFO] Created folder: {csv_dir}")
        print("Place your exported CSV files from old Supabase into this folder and re-run this script!")
        return

    csv_files = glob.glob(os.path.join(csv_dir, "*.csv"))
    if not csv_files:
        print(f"[INFO] No .csv files found in '{csv_dir}'.")
        print("Please place your exported CSV files (e.g. employees.csv, leads.csv) inside backend/migrations/csv_exports/")
        return

    for file_path in csv_files:
        raw_name = os.path.splitext(os.path.basename(file_path))[0].lower()
        # Clean Supabase export suffix e.g. "contacts_rows (1)" -> "contacts"
        table_name = raw_name.split("(")[0].replace("_rows", "").replace("_data", "").strip()
        print(f"\n[IMPORTING] Reading '{os.path.basename(file_path)}' into target table '{table_name}'...")
        
        try:
            with open(file_path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                rows = [row for row in reader]

            if not rows:
                print(f"   [INFO] '{file_path}' is empty. Skipping.")
                continue

            # Clean empty strings to None for UUID / date fields
            cleaned_rows = []
            for r in rows:
                cleaned = {}
                for k, v in r.items():
                    if k is None:
                        continue
                    clean_k = k.strip()
                    clean_v = v.strip() if isinstance(v, str) else v
                    cleaned[clean_k] = None if clean_v == "" else clean_v
                cleaned_rows.append(cleaned)

            # Chunk uploading (batch of 50 rows per request)
            batch_size = 50
            total_rows = len(cleaned_rows)
            print(f"   Uploading {total_rows} record(s) to New DB table '{table_name}'...")

            # Target all potential application schemas dynamically
            target_schemas = ["hrms", "crm", "organization", "sales", "system", "public"]

            # Upsert into both schema and public tables
            for schema in target_schemas:
                try:
                    imported_count = 0
                    for i in range(0, total_rows, batch_size):
                        chunk = cleaned_rows[i:i+batch_size]
                        if schema != "public":
                            res = client.schema(schema).table(table_name).upsert(chunk).execute()
                        else:
                            res = client.table(table_name).upsert(chunk).execute()
                        imported_count += len(res.data or chunk)

                    print(f"   [SUCCESS] Imported {imported_count} record(s) into [{schema}.{table_name}]!")
                except Exception as e:
                    print(f"   [NOTICE] Schema [{schema}.{table_name}]: {e}")

        except Exception as err:
            print(f"   [ERROR] Failed to import '{file_path}': {err}")

    print("\n--- CSV Import Completed! ---")

if __name__ == "__main__":
    import_csvs()
