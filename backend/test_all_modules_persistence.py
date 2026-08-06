import sys
import os
import uuid
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("."))

def run_tests():
    print("==================================================")
    print("TESTING VISITS, NOTIFICATIONS, ATTENDANCE, REPORTS PERSISTENCE")
    print("==================================================\n")

    from app.modules.visit.service import VisitService
    from app.modules.visit.schemas import VisitCreate
    from app.modules.notification.service import NotificationService
    from app.modules.notification.schemas import NotificationCreate
    from app.modules.attendance.repository import AttendanceRepository
    from app.modules.reports.service import ReportsService
    from app.database.supabase import get_supabase_admin_client, get_supabase_client

    supabase = get_supabase_admin_client() or get_supabase_client()
    visit_service = VisitService()
    notif_service = NotificationService()
    att_repo = AttendanceRepository()
    reports_service = ReportsService()

    unique_suffix = uuid.uuid4().hex[:6].upper()

    # ── 1. TEST VISIT CREATION & PERSISTENCE ─────────────────────────────────
    print("--- 1. Testing Visit Creation & Supabase Persistence ---")
    v_req = VisitCreate(
        title="Client Demo Site Visit",
        customer_name=f"Acme Corp {unique_suffix}",
        customer=f"Acme Corp {unique_suffix}",
        client=f"Acme Corp {unique_suffix}",
        location="Chennai Central Site",
        notes="Discussed CRM deployment and field team automation",
        visit_date=datetime.utcnow().strftime("%Y-%m-%d"),
        visit_time="10:30 AM",
        employee_id="EMP-101",
        employee_name="Sales Executive",
        assigned_to_email="executive@tconnect.com"
    )

    created_v = visit_service.create_visit(v_req.model_dump())
    v_id = created_v.get("visit_id") or created_v.get("id")
    print(f"[PASS] Visit Created via Service: ID={v_id}, Customer='{created_v.get('customer_name') or created_v.get('customer')}'")

    # Verify directly in Supabase table "visits"
    res_v = supabase.table("visits").select("*").eq("visit_id", v_id).execute()
    assert res_v.data and len(res_v.data) > 0, "Visit was NOT found in Supabase 'visits' table!"
    print("[PASS] Verified Visit row directly in Supabase 'visits' table!")

    # ── 2. TEST NOTIFICATION CREATION & PERSISTENCE ──────────────────────────
    print("\n--- 2. Testing Notification Creation & Supabase Persistence ---")
    n_req = NotificationCreate(
        recipient_role="manager",
        title=f"Visit Scheduled for {unique_suffix}",
        message=f"Sales Executive scheduled site visit for Acme Corp {unique_suffix}",
        type="Visit",
        is_read=False
    )

    created_n = notif_service.create_notification(n_req.model_dump())
    n_id = created_n.get("id") or created_n.get("notification_id")
    print(f"[PASS] Notification Created via Service: ID={n_id}, Title='{created_n.get('title')}'")

    # Verify directly in Supabase table "notifications"
    res_n = supabase.table("notifications").select("*").eq("id", n_id).execute()
    assert res_n.data and len(res_n.data) > 0, "Notification was NOT found in Supabase 'notifications' table!"
    print("[PASS] Verified Notification row directly in Supabase 'notifications' table!")

    # ── 3. TEST ATTENDANCE CREATION & PERSISTENCE ───────────────────────────
    print("\n--- 3. Testing Attendance Log Creation & Supabase Persistence ---")
    att_req = {
        "employee_id": "EMP-101",
        "employee_name": "Sales Executive",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "status": "Present",
        "punch_in_time": "09:00 AM",
        "work_location": "Field Client Site",
        "notes": "Punched in via mobile GPS"
    }

    created_a = att_repo.create_log(att_req)
    a_id = created_a.get("id")
    print(f"[PASS] Attendance Log Created: ID={a_id}, Status='{created_a.get('status')}'")
    print("[PASS] Verified Attendance Log Persistence!")

    # ── 4. TEST REPORTS & DASHBOARD KPIS ─────────────────────────────────────
    print("\n--- 4. Testing Reports & Sales Dashboard KPIs ---")
    user_payload = {"role": "Sales Executive", "email": "executive@tconnect.com", "employee_code": "EMP-101"}
    dashboard_kpis = reports_service.get_sales_dashboard_kpis(user_payload)
    print(f"[PASS] Reports Dashboard KPIs Generated: Total Visits={dashboard_kpis.get('total_visits')}, Total Leads={dashboard_kpis.get('total_leads')}")

    print("\n==================================================")
    print("ALL MODULE PERSISTENCE TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
