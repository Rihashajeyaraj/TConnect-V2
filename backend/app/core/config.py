from typing import List
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_dir = Path(__file__).resolve().parent.parent.parent
_env_path = _backend_dir / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "TwiteConnect Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Supabase Setup
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Biometrics
    BIOMETRIC_SERVICE_URL: str = "http://76.13.242.108:8012"

    # Smart Map & Technical GPS Configuration
    CLIENT_ROUTE_ALERT_RADIUS_KM: float = 2.0
    GOOGLE_MAPS_API_KEY: str = ""
    GPS_ACCURACY_THRESHOLD: float = 100.0
    DEFAULT_MAP_LATITUDE: float = 13.0067
    DEFAULT_MAP_LONGITUDE: float = 80.2570
    DEFAULT_MAP_ZOOM: int = 12
    ROUTE_REFETCH_DISTANCE_KM: float = 0.05
    OFF_ROUTE_THRESHOLD_KM: float = 0.15
    ARRIVAL_RADIUS_KM: float = 0.05



    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_EMAIL: str = "mailto:admin@twiteconnect.com"

    # Security
    SECRET_KEY: str = "twiteconnect-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:8080",
    ]

    model_config = SettingsConfigDict(
        env_file=(_env_path, ".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()


