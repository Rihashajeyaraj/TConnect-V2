from typing import Optional
from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    currency: Optional[str] = None
    time_zone: Optional[str] = None
    allow_self_signup: Optional[bool] = None
    rate_limit_per_min: Optional[int] = None


class SettingsResponse(BaseModel):
    company_name: str
    currency: str
    time_zone: str
    allow_self_signup: bool
    rate_limit_per_min: int
