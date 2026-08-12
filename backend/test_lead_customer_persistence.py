import sys
import os
import uuid

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("."))

def run_tests():
    print("==================================================")
    print("TESTING LEAD & CUSTOMER PERSISTENCE IN SUPABASE")
    print("==================================================\n")

    from app.modules.crm.service import CRMService
    from app.modules.crm.schemas import LeadCreate
    from app.modules.customer.service import CustomerService
    from app.modules.customer.schemas import CustomerCreate
    from app.database.supabase import get_supabase_admin_client, get_supabase_client

    supabase = get_supabase_admin_client() or get_supabase_client()
    crm_service = CRMService()
    cust_service = CustomerService()

    unique_suffix = uuid.uuid4().hex[:6].upper()

    # ── 1. TEST LEAD CREATION & PERSISTENCE ────────────────────────────────────
    print("--- 1. Testing Lead Creation & Supabase Persistence ---")
    lead_payload = LeadCreate(
        company_name=f"Acme Enterprise {unique_suffix}",
        company=f"Acme Enterprise {unique_suffix}",
        contact_person="Ramesh Kumar",
        person="Ramesh Kumar",
        mobile="+91 98765 11111",
        phone="+91 98765 11111",
        email=f"ramesh_{unique_suffix.lower()}@acme.com",
        city="Chennai",
        category="Hot",
        priority="High",
        value="₹5,00,000",
        source="Field Research (SE)",
        notes="High priority enterprise deal for field sales automation",
        assigned_to="Sales Executive",
        assigned_to_email="executive@tconnect.com",
        employee_code="EMP-101"
    )

    created_lead = crm_service.create_lead(lead_payload)
    lead_id = created_lead.get("lead_id") or created_lead.get("id")
    print(f"[PASS] Lead Created via Service: ID={lead_id}, Company='{created_lead.get('company_name')}'")

    # Verify directly in Supabase table "leads"
    res_lead = supabase.table("leads").select("*").eq("lead_id", lead_id).execute()
    assert res_lead.data and len(res_lead.data) > 0, "Lead was NOT found in Supabase 'leads' table!"
    db_lead = res_lead.data[0]
    assert db_lead["company_name"] == f"Acme Enterprise {unique_suffix}", "Company name mismatch in Supabase!"
    assert db_lead["contact_person"] == "Ramesh Kumar", "Contact person mismatch in Supabase!"
    assert db_lead["mobile"] == "+91 98765 11111", "Mobile number mismatch in Supabase!"
    assert db_lead["city"] == "Chennai", "City mismatch in Supabase!"
    print("[PASS] Verified Lead row directly in Supabase 'leads' table!")

    # ── 2. TEST CUSTOMER CREATION & PERSISTENCE ────────────────────────────────
    print("\n--- 2. Testing Customer Creation & Supabase Persistence ---")
    import random
    rand_phone = f"+91 98765 {random.randint(10000, 99999)}"
    cust_payload = CustomerCreate(
        name=f"GlobalTech Corp {unique_suffix}",
        company_name=f"GlobalTech Corp {unique_suffix}",
        contact_person="Suresh Raina",
        person="Suresh Raina",
        email=f"suresh_{unique_suffix.lower()}@globaltech.com",
        phone=rand_phone,
        city="Bengaluru",
        address="Bengaluru Tech Park",
        lead_id=lead_id,
        notes="Premium Enterprise Account",
        assigned_to="Sales Executive",
        assigned_to_email="executive@tconnect.com",
        employee_code="EMP-101"
    )

    created_cust_res = cust_service.create_customer(cust_payload)
    created_cust = created_cust_res.get("customer") if "customer" in created_cust_res else created_cust_res
    cust_id = created_cust.get("customer_id") or created_cust.get("id")
    print(f"[PASS] Customer Created via Service: ID={cust_id}, Company='{created_cust.get('name')}'")

    # Verify directly in Supabase table "customers"
    res_cust = supabase.schema("crm").table("customers").select("*").eq("customer_id", cust_id).execute()
    assert res_cust.data and len(res_cust.data) > 0, "Customer was NOT found in Supabase 'customers' table!"
    db_cust = res_cust.data[0]
    assert db_cust["customer_id"] == cust_id, "Customer ID mismatch in Supabase!"
    assert db_cust["lead_id"] == lead_id, "Linked Lead ID mismatch in Supabase!"
    print("[PASS] Verified Customer row directly in Supabase 'customers' table!")

    # ── 3. TEST READ OPERATIONS ───────────────────────────────────────────────
    print("\n--- 3. Testing Read Operations ---")
    all_leads = crm_service.list_leads()
    found_lead = any(l.get("lead_id") == lead_id or l.get("id") == lead_id for l in all_leads)
    assert found_lead, "Created lead not returned in list_leads()"

    all_custs = cust_service.list_customers()
    found_cust = any(c.get("customer_id") == cust_id or c.get("id") == cust_id for c in all_custs)
    assert found_cust, "Created customer not returned in list_customers()"
    print("[PASS] Verified Read / Listing Operations for Leads and Customers!")

    print("\n==================================================")
    print("ALL LEAD & CUSTOMER SUPABASE PERSISTENCE TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
