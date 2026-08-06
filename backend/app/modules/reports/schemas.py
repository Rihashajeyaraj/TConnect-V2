from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_leads: int
    total_customers: int
    total_visits: int
    pipeline_value: float
    pending_expenses: float


class ActivityItem(BaseModel):
    time: str
    description: str
    type: str = "info"


class ScheduleItem(BaseModel):
    time: str
    customer: str
    type: str
    status: str = "Upcoming"


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    revenue: float
    avatar: Optional[str] = None


class SalesDashboardKPI(BaseModel):
    # Top KPI row
    assigned_leads: int = 0
    converted_customers: int = 0
    revenue_this_month: float = 0.0
    pending_followups: int = 0
    leads_growth_pct: float = 12.0
    customers_growth_pct: float = 8.0
    revenue_growth_pct: float = 15.0
    followups_growth_pct: float = 5.0

    # Second row status cards
    today_visits: int = 0
    today_visits_target: int = 8
    attendance_status: str = "Present"
    check_in_time: Optional[str] = None
    target_achievement_pct: float = 0.0
    expenses_pending_amount: float = 0.0

    # Circular charts – Sales Target Overview
    revenue_target: float = 460000.0
    visits_target: int = 8
    visits_done: int = 0
    lead_conversion_pct: float = 0.0
    total_leads_for_conversion: int = 0
    converted_leads: int = 0

    # Lists
    recent_activities: List[Dict[str, Any]] = []
    today_schedule: List[Dict[str, Any]] = []
    leaderboard: List[Dict[str, Any]] = []
    notifications_count: int = 0
