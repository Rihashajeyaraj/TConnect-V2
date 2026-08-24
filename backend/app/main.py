from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.api.api_router import api_router
from app.exceptions.base import AppException
from app.middleware.exception_handler import (
    app_exception_handler,
    validation_exception_handler,
    global_exception_handler,
)
from app.database.supabase import check_db_health

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    try:
        from app.database.supabase import get_supabase_admin_client
        client = get_supabase_admin_client()
        if client:
            sql = """
            -- Add ownership tracking columns to crm.leads
            ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS original_owner TEXT;
            ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS current_owner TEXT;
            ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS previous_owner TEXT;
            ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS reassigned_by TEXT;
            ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ;
            ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;

            -- Add ownership tracking columns to crm.customers
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS original_owner TEXT;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS current_owner TEXT;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS previous_owner TEXT;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS reassigned_by TEXT;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS generated_by_employee_id TEXT;
            ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS generated_by_employee_name TEXT;

            -- Add ownership tracking columns to crm.opportunities
            ALTER TABLE crm.opportunities ADD COLUMN IF NOT EXISTS generated_by_employee_id TEXT;
            ALTER TABLE crm.opportunities ADD COLUMN IF NOT EXISTS generated_by_employee_name TEXT;

            -- Add missing columns to system.reports_eod
            ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0;
            ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS clients_interested INTEGER DEFAULT 0;
            ALTER TABLE system.reports_eod ADD COLUMN IF NOT EXISTS followups_scheduled INTEGER DEFAULT 0;
            """
            client.rpc("exec_sql", {"sql_query": sql}).execute()
            print("[OK] Database startup columns checked/added.")

            # Run tracking events migration
            import os
            migration_path = os.path.join("backend", "migrations", "create_tracking_events.sql")
            if os.path.exists(migration_path):
                with open(migration_path, "r", encoding="utf-8") as f:
                    migration_sql = f.read()
                client.rpc("exec_sql", {"sql_query": migration_sql}).execute()
                print("[OK] Real-time tracking events migration executed successfully.")
    except Exception as e:
        print(f"[ERROR] Database startup migration failed: {e}")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")


@app.get("/docs", include_in_schema=False)
def docs_redirect():
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")


@app.get("/redoc", include_in_schema=False)
def redoc_redirect():
    return RedirectResponse(url=f"{settings.API_V1_STR}/redoc")


@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    db_status = check_db_health()
    return {
        "status": "healthy" if db_status.get("status") == "connected" else "degraded",
        "backend": "online",
        "database": db_status,
    }
