from supabase import create_client, Client
from app.core.config import settings
from app.core.logger import logger


class SupabaseManager:
    _instance: Client = None
    _admin_instance: Client = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            url = settings.SUPABASE_URL
            key = settings.SUPABASE_KEY

            if not url or not key or "your-supabase-project" in url:
                logger.warning("SUPABASE_URL or SUPABASE_KEY is missing or invalid in environment.")
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be properly set in .env")

            try:
                clean_url = url.rstrip("/").removesuffix("/rest/v1")
                cls._instance = create_client(clean_url, key)
                logger.info("Supabase client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise e
        return cls._instance

    @classmethod
    def get_admin_client(cls) -> Client:
        if cls._admin_instance is None:
            url = settings.SUPABASE_URL
            service_key = settings.SUPABASE_SERVICE_ROLE_KEY

            if not url or not service_key or "your-service-role-key" in service_key:
                return None

            try:
                clean_url = url.rstrip("/").removesuffix("/rest/v1")
                cls._admin_instance = create_client(clean_url, service_key)
                logger.info("Supabase Admin client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase Admin client: {e}")
                return None
        return cls._admin_instance


def get_supabase_client() -> Client:
    return SupabaseManager.get_client()


def get_supabase_admin_client() -> Client:
    return SupabaseManager.get_admin_client()


def check_db_health() -> dict:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    
    if not url or not key or "your-supabase-project" in url:
        return {
            "status": "disconnected",
            "message": "Placeholder or missing SUPABASE_URL / SUPABASE_KEY in backend/.env"
        }
    try:
        client = get_supabase_client()
        client.table("_health_check_dummy").select("*").limit(1).execute()
        return {"status": "connected", "message": "Successfully connected to Supabase"}
    except Exception as e:
        err_str = str(e)
        if "PGRST" in err_str or "404" in err_str or "relation" in err_str.lower() or "table" in err_str.lower() or "not found" in err_str.lower():
            return {"status": "connected", "message": "Successfully connected to Supabase database server"}
        return {"status": "error", "message": err_str}
