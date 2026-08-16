import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.modules.users.repository import UserRepository

def main():
    repo = UserRepository()
    users = repo.get_all_users()
    print(f"Total Users returned by get_all_users: {len(users)}")
    
    # Check for duplicates by email or id
    emails = {}
    ids = {}
    names = {}
    for idx, u in enumerate(users):
        email = u.get("email", "").lower().strip()
        uid = u.get("id")
        name = u.get("name")
        role = u.get("role")
        code = u.get("employee_code")
        mgr_name = u.get("reporting_manager_name")
        mgr_id = u.get("reporting_manager_id")
        
        print(f"{idx+1}. Name: {name} | Email: {email} | ID: {uid} | Code: {code} | Role: {role} | Mgr: {mgr_name} ({mgr_id})")
        
        emails[email] = emails.get(email, 0) + 1
        ids[uid] = ids.get(uid, 0) + 1
        names[name] = names.get(name, 0) + 1
        
    print("\n--- Duplicated Emails ---")
    for email, count in emails.items():
        if count > 1:
            print(f"  {email}: {count} times")
            
    print("\n--- Duplicated IDs ---")
    for uid, count in ids.items():
        if count > 1:
            print(f"  {uid}: {count} times")

    print("\n--- Duplicated Names ---")
    for name, count in names.items():
        if count > 1:
            print(f"  {name}: {count} times")

if __name__ == "__main__":
    main()
