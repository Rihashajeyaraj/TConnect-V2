import os
import sys
import httpx

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings

def main():
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    print(f"Fetching OpenAPI spec from {url}...")
    try:
        res = httpx.get(url, headers=headers)
        if res.status_code == 200:
            spec = res.json()
            paths = spec.get("paths", {})
            print("Exposed RPC paths:")
            for path in paths:
                if "/rpc/" in path:
                    print(f"  {path}")
        else:
            print(f"Failed to fetch: {res.status_code} {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
