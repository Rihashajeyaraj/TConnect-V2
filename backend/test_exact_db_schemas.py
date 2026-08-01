import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.database.supabase import get_supabase_admin_client
from app.database.connection import get_schema_helper
from app.core.constants import SchemaEnum

admin_client = get_supabase_admin_client()
helper = get_schema_helper()

print("--- TESTING EXACT DB SCHEMAS AND TABLES ---")

# 1. Test hrms.employees
print("\n1. Testing schema 'hrms', table 'employees':")
try:
    res = helper.table(SchemaEnum.HRMS, "employees").select("*").limit(1).execute()
    print("SUCCESS hrms.employees select:", res.data)
except Exception as e:
    print("FAILED hrms.employees select:", e)

# 2. Test organization.company_profile
print("\n2. Testing schema 'organization', table 'company_profile':")
try:
    res = helper.table(SchemaEnum.ORGANIZATION, "company_profile").select("*").limit(1).execute()
    print("SUCCESS organization.company_profile select:", res.data)
except Exception as e:
    print("FAILED organization.company_profile select:", e)

# 3. Test crm.leads
print("\n3. Testing schema 'crm', table 'leads':")
try:
    res = helper.table(SchemaEnum.CRM, "leads").select("*").limit(1).execute()
    print("SUCCESS crm.leads select:", res.data)
except Exception as e:
    print("FAILED crm.leads select:", e)

# 4. Test customer.customers
print("\n4. Testing schema 'customer', table 'customers':")
try:
    res = helper.table(SchemaEnum.CUSTOMER, "customers").select("*").limit(1).execute()
    print("SUCCESS customer.customers select:", res.data)
except Exception as e:
    print("FAILED customer.customers select:", e)
