from typing import Optional, Dict, Any
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_leads: int
    total_customers: int
    total_visits: int
    pipeline_value: float
    pending_expenses: float
