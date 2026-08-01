import sys
import os
sys.path.insert(0, os.path.abspath("."))
import urllib.request
import json
from app.core.config import settings

url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/"
headers = {
    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    "Accept-Profile": "hrms"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        spec = json.loads(resp.read().decode())
        defs = spec.get("definitions", {})
        print("--- HRMS SCHEMA DEFINITIONS ---")
        for table, details in defs.items():
            print(f"\nTable: {table}")
            props = details.get("properties", {})
            for col, info in props.items():
                print(f"  - {col} ({info.get('type')})")
except Exception as e:
    print("Error:", e)
