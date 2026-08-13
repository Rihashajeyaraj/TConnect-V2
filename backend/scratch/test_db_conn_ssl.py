import pg8000.dbapi
import ssl

def test_conn():
    host = "db.cljifufjjwrdgethvfvl.supabase.co"
    user = "postgres"
    database = "postgres"
    
    passwords = [
        "TConnect2026#",
        "TwiteConnect2026#",
        "TConnect2026",
        "TwiteConnect2026",
        "Admin2026#",
        "SalesPassword2026#"
    ]
    
    ssl_context = ssl.create_default_context()
    # Disable certificate verification for simplicity if needed, but default is fine
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    for port in [6543, 5432]:
        print(f"=== Trying Port {port} ===")
        for pwd in passwords:
            try:
                print(f"Trying password: {pwd} on port {port}...")
                conn = pg8000.dbapi.connect(
                    host=host,
                    user=user,
                    password=pwd,
                    database=database,
                    port=port,
                    ssl_context=ssl_context,
                    timeout=5
                )
                print(f"SUCCESS! Connected with password: {pwd}")
                conn.close()
                return
            except Exception as e:
                print(f"Failed: {e}")

if __name__ == "__main__":
    test_conn()
