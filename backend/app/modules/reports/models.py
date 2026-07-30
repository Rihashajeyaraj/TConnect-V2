from typing import Optional, Dict, Any
from pydantic import BaseModel


class DashboardKPIModel(BaseModel):
    total_leads: int = 0
    total_customers: int = 0
    total_visits: int = 0
    pipeline_value: float = 0.0
    pending_expenses: float = 0.0
