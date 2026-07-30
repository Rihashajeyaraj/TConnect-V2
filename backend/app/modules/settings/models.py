from typing import Optional
from pydantic import BaseModel


class SystemSettingsModel(BaseModel):
    company_name: str = "TwiteConnect Inc."
    currency: str = "INR"
    time_zone: str = "Asia/Kolkata"
    allow_self_signup: bool = False
    rate_limit_per_min: int = 60
