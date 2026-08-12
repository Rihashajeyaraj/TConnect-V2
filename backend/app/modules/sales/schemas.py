from typing import Optional
from pydantic import BaseModel, Extra
from datetime import date, datetime


class SalesTargetCreate(BaseModel):
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    executive_id: Optional[str] = None
    executive_code: Optional[str] = None
    executive_name: Optional[str] = None
    executive_email: Optional[str] = None
    target_amount: float
    achieved_amount: Optional[float] = 0.0
    period: Optional[str] = "Monthly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Active"

    class Config:
        extra = Extra.allow


class SalesTargetUpdate(BaseModel):
    target_amount: Optional[float] = None
    achieved_amount: Optional[float] = None
    period: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

    class Config:
        extra = Extra.allow


class SalesTargetResponse(BaseModel):
    id: Optional[str] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    executive_id: Optional[str] = None
    executive_code: Optional[str] = None
    executive_name: Optional[str] = None
    executive_email: Optional[str] = None
    target_amount: float
    achieved_amount: Optional[float] = 0.0
    period: Optional[str] = "Monthly"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Active"
    created_at: Optional[str] = None


class ExecutiveRevenueItem(BaseModel):
    employee_id: str
    employee_code: Optional[str] = None
    name: str
    email: Optional[str] = None
    revenue: float
    incentive: float
    deals_count: Optional[int] = 0


class RevenuePeriod(BaseModel):
    mode: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class TeamRevenueBreakdownResponse(BaseModel):
    manager_id: str
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    period: RevenuePeriod
    executives: list
    total_revenue: float
    total_incentive: float
    incentive_rate_pct: float = 5.0

