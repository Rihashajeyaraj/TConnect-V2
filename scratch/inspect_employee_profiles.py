import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("c:/Users/RIHASHA/OneDrive/Desktop/tconnect/TConnect/backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

supabase = create_client(url, key)

res = supabase.schema("hrms").table("employees").select("*").execute()
rows = res.data or []
print(f"Total employees in hrms.employees: {len(rows)}")
if rows:
    print("Columns available:", list(rows[0].keys()))
    for emp in rows:
        print(f"\n--- Employee: {emp.get('name')} ({emp.get('email')}) ---")
        for k, v in emp.items():
            if v is not None and v != "":
                print(f"  {k}: {v}")
