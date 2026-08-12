import sys
import os

sys.path.insert(0, os.path.abspath("."))
from app.modules.spatial.routes import compute_route
from fastapi import HTTPException

def test_spatial_route_missing_coords():
    """Verify endpoint rejects missing origin or destination coordinates."""
    try:
        compute_route({})
        assert False, "Should have raised HTTPException for missing coordinates"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "Missing origin or destination coordinates" in exc.detail

def test_spatial_route_unconfigured_key():
    """Verify endpoint returns fallback/unconfigured response if GOOGLE_MAPS_API_KEY is empty."""
    from app.core.config import settings
    # Temporarily force empty key for testing
    old_key = settings.GOOGLE_MAPS_API_KEY
    settings.GOOGLE_MAPS_API_KEY = ""
    
    try:
        payload = {
            "origin": {"latitude": 13.0067, "longitude": 80.2570},
            "destination": {"latitude": 13.0418, "longitude": 80.2341}
        }
        data = compute_route(payload)
        assert data["success"] is False
        assert "Google Maps API Key not configured" in data["message"]
        assert data["traffic_aware"] is False
        assert data["provider"] == "google"
    finally:
        settings.GOOGLE_MAPS_API_KEY = old_key

if __name__ == "__main__":
    print("==========================================")
    print("RUNNING SPATIAL ROUTE SERVICE TESTS")
    print("==========================================")
    
    try:
        test_spatial_route_missing_coords()
        print(" [OK] test_spatial_route_missing_coords passed")
        test_spatial_route_unconfigured_key()
        print(" [OK] test_spatial_route_unconfigured_key passed")
        print("\nALL SPATIAL ROUTE SERVICE TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f" [FAIL] Test assertions failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f" [FAIL] Unexpected error: {e}")
        sys.exit(1)
    print("==========================================")
