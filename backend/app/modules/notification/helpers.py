"""
TwiteConnect — Notification Helper & Deep-Link URL Builder
==========================================================
Centralized helper functions for creating notifications and constructing
authoritative deep-link URLs matching TwiteConnect frontend React routes.
"""

from typing import Dict, Any, Optional

def build_notification_url(category: str, reference_id: Optional[str] = None, role: str = "sales") -> str:
    """
    Map notification categories and business entity IDs to clean React Router paths.

    Existing React Routes (from App.jsx):
    - Leads: /sales/leads, /manager/leads, /team-lead/leads
    - Tasks/Followups: /sales/todo, /manager/followups
    - Visits: /sales/visits, /manager/visits, /team-lead/visits
    - Opportunities: /sales/opportunities, /manager/opportunities
    - Expenses: /sales/expenses, /manager/expenses, /team-lead/expenses
    - Notifications: /sales/notifications, /manager/notifications
    """
    clean_category = str(category or "").upper().strip()
    role_str = str(role or "sales").lower().strip()

    if "manager" in role_str:
        role_prefix = "/manager"
    elif "lead" in role_str or "tl" in role_str:
        role_prefix = "/team-lead"
    else:
        role_prefix = "/sales"

    ref_str = str(reference_id).strip() if reference_id else ""

    if "LEAD" in clean_category:
        base = f"{role_prefix}/leads"
        return f"{base}?id={ref_str}" if ref_str else base

    if "TASK" in clean_category or "TODO" in clean_category or "FOLLOWUP" in clean_category:
        base = f"{role_prefix}/todo" if role_prefix == "/sales" else f"{role_prefix}/followups"
        return f"{base}?id={ref_str}" if ref_str else base

    if "VISIT" in clean_category:
        base = f"{role_prefix}/visits"
        return f"{base}?id={ref_str}" if ref_str else base

    if "OPPORTUNITY" in clean_category or "PIPELINE" in clean_category:
        base = f"{role_prefix}/opportunities" if role_prefix != "/team-lead" else f"{role_prefix}/leads"
        return f"{base}?id={ref_str}" if ref_str else base

    if "LOCATION_INQUIRY_REPLY" in clean_category or "INQUIRY_REPLY" in clean_category:
        base = "/manager/map"
        return f"{base}?inquiry_id={ref_str}" if ref_str else base

    if "LOCATION_INQUIRY" in clean_category or "INQUIRY" in clean_category or "CHAT" in clean_category:
        base = f"{role_prefix}/map"
        return f"{base}?inquiry_id={ref_str}" if ref_str else base

    if "EXPENSE" in clean_category:
        base = f"{role_prefix}/expenses"
        return f"{base}?id={ref_str}" if ref_str else base

    return f"{role_prefix}/notifications"
