import time
import sys
import os

sys.path.insert(0, r"c:\Users\RIHASHA\OneDrive\Desktop\tconnect\TConnect\backend")

from app.modules.customer.repository import CustomerRepository
from app.modules.crm.repository import CRMRepository
from app.modules.users.repository import UserRepository
from app.modules.spatial.routes import get_manager_team_locations

print("=== STARTING BENCHMARK ===")

t0 = time.time()
leads = CRMRepository().get_all_leads()
t1 = time.time()
print(f"CRM get_all_leads 1st call: {t1-t0:.3f}s (returned {len(leads)} leads)")

t2 = time.time()
leads2 = CRMRepository().get_all_leads()
t3 = time.time()
print(f"CRM get_all_leads 2nd call (cached): {t3-t2:.3f}s")

t4 = time.time()
custs = CustomerRepository().get_all_customers()
t5 = time.time()
print(f"Customer get_all_customers 1st call: {t5-t4:.3f}s (returned {len(custs)} custs)")

t6 = time.time()
custs2 = CustomerRepository().get_all_customers()
t7 = time.time()
print(f"Customer get_all_customers 2nd call (cached): {t7-t6:.3f}s")

t8 = time.time()
users = UserRepository().get_all_users()
t9 = time.time()
print(f"UserRepository 1st call: {t9-t8:.3f}s (returned {len(users)} users)")

t10 = time.time()
users2 = UserRepository().get_all_users()
t11 = time.time()
print(f"UserRepository 2nd call (cached): {t11-t10:.3f}s")

mgr_user = {"email": "jeeva@twiteconnect.com", "role": "Sales Manager", "name": "Jeeva Kumar"}
t12 = time.time()
locs = get_manager_team_locations(current_user=mgr_user)
t13 = time.time()
subords = locs.get("subordinates", [])
print(f"get_manager_team_locations 1st call: {t13-t12:.3f}s (returned {len(subords)} subordinates)")

t14 = time.time()
locs2 = get_manager_team_locations(current_user=mgr_user)
t15 = time.time()
print(f"get_manager_team_locations 2nd call (cached): {t15-t14:.3f}s")

print("=== BENCHMARK COMPLETE ===")
