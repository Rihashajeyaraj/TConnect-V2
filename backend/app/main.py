import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
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

# Mount static files directory
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "snapshots"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

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
        "http://localhost:8000",
        "http://localhost:8001",
        "https://connect.twite.ai",
        "http://connect.twite.ai",
        "http://76.13.242.108",
        "https://76.13.242.108",
        "https://twite.ai",
        "http://twite.ai",
    ],
    allow_origin_regex=r"^https?://.*$",
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


from app.modules.spatial.history_worker import history_worker

@app.on_event("startup")
async def on_startup():
    print("[INFO] Bypassing database startup checks/migrations for rapid startup.")
    try:
        history_worker.start()
    except Exception as e:
        print(f"[WARNING] Failed to start Phase 3 history worker: {e}")

@app.on_event("shutdown")
async def on_shutdown():
    try:
        await history_worker.stop()
    except Exception as e:
        print(f"[WARNING] Error stopping Phase 3 history worker: {e}")


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
