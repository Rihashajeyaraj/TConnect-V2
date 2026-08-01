import urllib.request
import json
from app.core.config import settings

url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/"
headers = {
    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        spec = json.loads(resp.read().decode())
        definitions = spec.get("definitions", {})
        print("--- EXISTING SUPABASE TABLES ---")
        for table in sorted(definitions.keys()):
            print(f"- {table}")
except Exception as e:
    print("Error fetching schema:", e)
