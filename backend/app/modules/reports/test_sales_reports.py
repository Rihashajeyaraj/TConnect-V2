import os
import sys
import unittest
from datetime import datetime

# Insert parent directory into sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from app.modules.reports.repository import ReportsRepository

class TestSalesReports(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = ReportsRepository()
        cls.test_manager_payload = {
            "name": "Test Manager",
            "email": "manager_test@tconnect.com",
            "employee_code": "MGR-TEST",
            "role": "Sales Manager"
        }
        cls.test_ceo_payload = {
            "name": "Test CEO",
            "email": "ceo@tconnect.com",
            "role": "CEO"
        }
        cls.created_report_id = None

    def test_01_save_draft(self):
        report_data = {
            "report_type": "weekly",
            "report_period": "2026-W35",
            "metrics": {
                "target": 500000,
                "actualRevenue": 150000,
                "achievementPct": 30
            },
            "status": "Draft"
        }
        
        saved = self.repo.save_sales_report(report_data, self.test_manager_payload)
        self.assertIsNotNone(saved.get("id"))
        self.assertEqual(saved.get("status"), "Draft")
        self.assertEqual(saved.get("manager_email"), "manager_test@tconnect.com")
        
        self.__class__.created_report_id = saved["id"]

    def test_02_submit_report(self):
        self.assertIsNotNone(self.created_report_id)
        
        report_data = {
            "id": self.created_report_id,
            "report_type": "weekly",
            "report_period": "2026-W35",
            "metrics": {
                "target": 500000,
                "actualRevenue": 150000,
                "achievementPct": 30
            },
            "status": "Submitted"
        }
        
        submitted = self.repo.save_sales_report(report_data, self.test_manager_payload)
        self.assertEqual(submitted.get("status"), "Submitted")
        self.assertIsNotNone(submitted.get("submitted_at"))

    def test_03_get_reports_scoping(self):
        # Sales manager gets their own
        mgr_reports = self.repo.get_sales_reports(self.test_manager_payload)
        self.assertTrue(len(mgr_reports) > 0)
        self.assertTrue(all(r["manager_email"] == "manager_test@tconnect.com" for r in mgr_reports))
        
        # CEO gets all
        ceo_reports = self.repo.get_sales_reports(self.test_ceo_payload)
        self.assertTrue(len(ceo_reports) > 0)

    def test_04_review_report(self):
        self.assertIsNotNone(self.created_report_id)
        
        reviewed = self.repo.review_sales_report(
            self.created_report_id,
            "Reviewed",
            "Excellent job on starting the draft. Push further next period.",
            self.test_ceo_payload
        )
        self.assertEqual(reviewed.get("status"), "Reviewed")
        self.assertEqual(reviewed.get("ceo_remarks"), "Excellent job on starting the draft. Push further next period.")

        # Cleanup test record
        try:
            self.repo.supabase.schema("crm").table("sales_reports").delete().eq("id", self.created_report_id).execute()
        except Exception:
            try:
                self.repo.supabase.table("sales_reports").delete().eq("id", self.created_report_id).execute()
            except Exception:
                pass

if __name__ == "__main__":
    unittest.main()
