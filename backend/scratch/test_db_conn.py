import pg8000.dbapi

def test_conn():
    host = "db.cljifufjjwrdgethvfvl.supabase.co"
    user = "postgres"
    database = "postgres"
    port = 5432
    
    passwords = [
        "TConnect2026#",
        "TwiteConnect2026#",
        "TConnect2026",
        "TwiteConnect2026",
        "Admin2026#",
        "SalesPassword2026#",
        "twiteconnect-super-secret-key-change-in-production"
    ]
    
    for pwd in passwords:
        try:
            print(f"Trying password: {pwd}...")
            conn = pg8000.dbapi.connect(
                host=host,
                user=user,
                password=pwd,
                database=database,
                port=port,
                timeout=5
            )
            print(f"SUCCESS! Connected with password: {pwd}")
            conn.close()
            return
        except Exception as e:
            print(f"Failed: {e}")

if __name__ == "__main__":
    test_conn()
