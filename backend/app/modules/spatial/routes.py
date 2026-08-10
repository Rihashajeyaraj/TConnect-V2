import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, Depends, HTTPException, Body
from app.modules.crm.repository import CRMRepository
from app.modules.customer.repository import CustomerRepository
from app.modules.visit.repository import VisitRepository
from app.core.logger import logger

router = APIRouter(prefix="/spatial", tags=["Smart Spatial Map & Geofencing"])

crm_repo = CRMRepository()
customer_repo = CustomerRepository()
visit_repo = VisitRepository()

# Store live executive positions in memory telemetry cache
_live_executive_telemetry: Dict[str, Dict[str, Any]] = {}


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in meters using Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


# Standard sample coordinates around major tech/business hubs for demo entries missing coordinates
DEFAULT_LAT_LNG_PRESETS = [
    {"lat": 13.0827, "lng": 80.2707, "city": "Chennai Central"},
    {"lat": 13.0067, "lng": 80.2570, "city": "Adyar IT Hub"},
    {"lat": 12.9716, "lng": 77.5946, "city": "Bangalore Business Park"},
    {"lat": 13.0418, "lng": 80.2341, "city": "T. Nagar Commercial Hub"},
    {"lat": 12.9815, "lng": 80.2180, "city": "Guindy Industrial Estate"},
]


LANDMARK_COORDS = {
    "vijaya mall": (13.0515, 80.2100),
    "forum mall": (13.0515, 80.2100),
    "vadapalani": (13.0515, 80.2100),
    "adyar": (13.0067, 80.2570),
    "guindy": (12.9815, 80.2180),
    "t. nagar": (13.0418, 80.2341),
    "t nagar": (13.0418, 80.2341),
    "omr": (12.9716, 80.2450),
    "velachery": (12.9815, 80.2180),
    "tidal park": (12.9890, 80.2470),
    "chennai central": (13.0827, 80.2707),
    "bangalore": (12.9716, 77.5946),
}


def extract_lat_lng(item: dict, default_lat: float, default_lng: float, idx: int) -> tuple[float, float, bool]:
    """Robustly extract latitude and longitude from dict fields or Google Maps URL strings."""
    import re
    # 1. Direct numeric lat / lng
    for lat_k in ["latitude", "lat"]:
        for lng_k in ["longitude", "lng"]:
            if item.get(lat_k) is not None and item.get(lng_k) is not None:
                try:
                    val_lat = float(item[lat_k])
                    val_lng = float(item[lng_k])
                    if val_lat != 0 and val_lng != 0:
                        return val_lat, val_lng, True
                except (ValueError, TypeError):
                    pass

    # 2. Extract from URL params or string
    for loc_k in ["map_location", "coordinates", "location", "address", "landmark", "city"]:
        val_str = str(item.get(loc_k) or "").strip()
        if not val_str:
            continue

        at_match = re.search(r"@(-?\d+\.\d+),\s*(-?\d+\.\d+)", val_str)
        if at_match:
            try:
                return float(at_match.group(1)), float(at_match.group(2)), True
            except (ValueError, TypeError):
                pass

        q_match = re.search(r"(?:q|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)", val_str)
        if q_match:
            try:
                return float(q_match.group(1)), float(q_match.group(2)), True
            except (ValueError, TypeError):
                pass

        match = re.search(r"^[^?#]*?(-?\d+\.\d{3,})\s*,\s*(-?\d+\.\d{3,})", val_str)
        if match:
            try:
                return float(match.group(1)), float(match.group(2)), True
            except (ValueError, TypeError):
                pass

        val_lower = val_str.lower()
        for l_key, l_coords in LANDMARK_COORDS.items():
            if l_key in val_lower:
                return l_coords[0], l_coords[1], True

    return default_lat, default_lng, False


@router.get("/nearby")
def get_nearby_entities(
    lat: float = Query(..., description="Current Executive Latitude"),
    lng: float = Query(..., description="Current Executive Longitude"),
    radius: float = Query(2000.0, description="Search radius in meters"),
    entity_type: Optional[str] = Query("all", description="all | lead | customer | opportunity | visit"),
):
    """
    Retrieve nearby Leads, Customers, Opportunities, and Visits within configurable radius.
    Includes distance in meters & kilometers, priority, status, and coordinate attributes.
    """
    results: List[Dict[str, Any]] = []

    try:
        # 1. Fetch Leads & Opportunities
        leads_raw = crm_repo.get_leads()
        for idx, lead in enumerate(leads_raw):
            item_lat, item_lng, has_exact = extract_lat_lng(lead, lat, lng, idx)
            dist_m = haversine_distance_meters(lat, lng, item_lat, item_lng)

            # Categorize Lead vs Opportunity
            status_lower = str(lead.get("status") or "").lower()
            is_opp = "proposal" in status_lower or "demo" in status_lower or "negotiation" in status_lower
            category = "Opportunity" if is_opp else "Lead"

            if entity_type != "all" and entity_type.lower() not in category.lower():
                continue

            priority = str(lead.get("priority") or lead.get("category") or "High").capitalize()
            is_high_priority = priority == "Hot" or priority == "High"

            marker_type = "opportunity" if is_opp else ("high_priority" if is_high_priority else "lead")
            marker_color = "#f97316" if is_opp else ("#ef4444" if is_high_priority else "#3b82f6")

            results.append({
                "id": str(lead.get("id") or f"lead_{idx}"),
                "title": lead.get("company") or lead.get("company_name") or lead.get("title") or lead.get("name") or f"Lead #{idx+1}",
                "company_name": lead.get("person") or lead.get("contact_person") or lead.get("company_name") or lead.get("company") or "Client Enterprise",
                "phone": lead.get("phone") or lead.get("mobile") or "+91 98765 00000",
                "email": lead.get("email") or "",
                "address": lead.get("address") or lead.get("location") or lead.get("landmark") or "Captured Location",
                "landmark": lead.get("map_location") or lead.get("landmark") or f"{item_lat:.4f}, {item_lng:.4f}",
                "category": category,
                "marker_type": marker_type,
                "marker_color": marker_color,
                "latitude": item_lat,
                "longitude": item_lng,
                "has_exact_coords": has_exact,
                "distance_meters": round(dist_m, 1),
                "distance_km": round(dist_m / 1000.0, 2),
                "status": lead.get("status") or "New Lead",
                "priority": priority,
                "assigned_to": lead.get("assigned_to") or lead.get("assignedTo") or "Sales Executive",
                "value": lead.get("value") or lead.get("budget") or lead.get("deal_value") or 25000,
                "last_visited": lead.get("last_visited") or "Recently",
                "next_followup": lead.get("next_followup") or "Scheduled Today",
            })

        # 2. Fetch Customers
        cust_raw = customer_repo.get_customers()
        for idx, cust in enumerate(cust_raw):
            item_lat, item_lng, has_exact = extract_lat_lng(cust, lat, lng, idx + 10)
            dist_m = haversine_distance_meters(lat, lng, item_lat, item_lng)

            if entity_type != "all" and "customer" not in entity_type.lower():
                continue

            results.append({
                "id": str(cust.get("id") or f"cust_{idx}"),
                "title": cust.get("company_name") or cust.get("name") or f"Customer #{idx+1}",
                "company_name": cust.get("contact_person") or cust.get("company_name") or cust.get("name") or "Corporate Account",
                "phone": cust.get("phone") or "+91 98765 11111",
                "email": cust.get("email") or "",
                "address": cust.get("address") or "Anna Salai, Chennai",
                "landmark": cust.get("landmark") or "Opposite Tech Park",
                "category": "Customer",
                "marker_type": "customer",
                "marker_color": "#10b981",  # Green
                "latitude": item_lat,
                "longitude": item_lng,
                "has_exact_coords": has_exact,
                "distance_meters": round(dist_m, 1),
                "distance_km": round(dist_m / 1000.0, 2),
                "status": cust.get("status") or "Active Account",
                "priority": "High",
                "assigned_to": cust.get("account_manager") or "Sales Executive",
                "value": cust.get("annual_revenue") or 150000,
                "last_visited": cust.get("last_visited") or "5 days ago",
                "next_followup": "Tomorrow at 11:00 AM",
            })

        # 3. Fetch Visits History
        visits_raw = visit_repo.get_visits()
        for idx, vis in enumerate(visits_raw):
            item_lat, item_lng, has_exact = extract_lat_lng(vis, lat, lng, idx + 20)
            dist_m = haversine_distance_meters(lat, lng, item_lat, item_lng)

            if entity_type != "all" and "visit" not in entity_type.lower():
                continue
                continue

            results.append({
                "id": str(vis.get("id") or f"visit_{idx}"),
                "title": vis.get("client_name") or vis.get("customer") or f"Visit Location #{idx+1}",
                "company_name": vis.get("client_name") or "Field Visit Site",
                "phone": "+91 98765 22222",
                "email": "",
                "address": vis.get("location") or vis.get("address") or "Guindy Industrial Hub, Chennai",
                "landmark": "Near Main Gate",
                "category": "Previous Visit",
                "marker_type": "visit",
                "marker_color": "#8b5cf6",  # Purple
                "latitude": item_lat,
                "longitude": item_lng,
                "distance_meters": round(dist_m, 1),
                "distance_km": round(dist_m / 1000.0, 2),
                "status": vis.get("status") or "Completed Visit",
                "priority": "Normal",
                "assigned_to": vis.get("visitor_name") or "Sales Executive",
                "value": 0,
                "last_visited": vis.get("date") or "Yesterday",
                "next_followup": vis.get("purpose") or "Follow-up Call Scheduled",
            })

    except Exception as e:
        logger.error(f"Error fetching spatial nearby entities: {e}")

    # Sort results by distance ascending
    results.sort(key=lambda x: x["distance_meters"])

    # Filter within radius if specified
    filtered_results = [r for r in results if r["distance_meters"] <= radius]

    return {
        "success": True,
        "executive_lat": lat,
        "executive_lng": lng,
        "search_radius_meters": radius,
        "total_count": len(filtered_results),
        "entities": filtered_results,
    }


@router.post("/route-optimize")
def optimize_route(payload: Dict[str, Any] = Body(...)):
    """
    Smart Route Optimization:
    Given current executive GPS and a list of target client locations, computes the shortest,
    most efficient sequence of visits using the Nearest Neighbor TSP algorithm with distance & ETA.
    """
    exec_lat = float(payload.get("latitude") or payload.get("lat") or 13.0067)
    exec_lng = float(payload.get("longitude") or payload.get("lng") or 80.2570)
    waypoints: List[Dict[str, Any]] = payload.get("waypoints") or []

    if not waypoints:
        return {"success": True, "optimized_route": [], "total_distance_km": 0, "total_time_mins": 0}

    unvisited = list(waypoints)
    route_sequence = []
    current_lat = exec_lat
    current_lng = exec_lng
    total_dist_m = 0.0

    while unvisited:
        # Find nearest unvisited waypoint
        nearest = None
        min_dist = float("inf")
        nearest_idx = -1

        for idx, wp in enumerate(unvisited):
            w_lat = float(wp.get("latitude") or wp.get("lat") or 0.0)
            w_lng = float(wp.get("longitude") or wp.get("lng") or 0.0)
            dist = haversine_distance_meters(current_lat, current_lng, w_lat, w_lng)
            if dist < min_dist:
                min_dist = dist
                nearest = wp
                nearest_idx = idx

        if nearest and nearest_idx >= 0:
            current_lat = float(nearest.get("latitude") or nearest.get("lat") or 0.0)
            current_lng = float(nearest.get("longitude") or nearest.get("lng") or 0.0)
            total_dist_m += min_dist

            nearest_copy = dict(nearest)
            nearest_copy["leg_distance_meters"] = round(min_dist, 1)
            nearest_copy["leg_distance_km"] = round(min_dist / 1000.0, 2)
            # Estimate driving/riding speed at ~25 km/h in city traffic
            nearest_copy["leg_estimated_mins"] = max(1, math.ceil((min_dist / 1000.0) / 25.0 * 60.0))

            route_sequence.append(nearest_copy)
            unvisited.pop(nearest_idx)

    total_km = round(total_dist_m / 1000.0, 2)
    total_mins = max(len(route_sequence) * 5, math.ceil((total_km / 25.0) * 60.0))

    return {
        "success": True,
        "start_lat": exec_lat,
        "start_lng": exec_lng,
        "stops_count": len(route_sequence),
        "total_distance_km": total_km,
        "total_estimated_time_mins": total_mins,
        "optimized_route": route_sequence,
    }


@router.post("/geofence-check")
def check_geofence(payload: Dict[str, Any] = Body(...)):
    """
    Geofence Detection Engine:
    Evaluates Executive current GPS position against all client perimeters (default 300 meters threshold).
    Triggers 'Arrived near client' and 'Opportunity Nearby' alerts.
    """
    exec_lat = float(payload.get("latitude") or payload.get("lat") or 13.0067)
    exec_lng = float(payload.get("longitude") or payload.get("lng") or 80.2570)
    threshold_m = float(payload.get("geofence_threshold_meters") or 450.0)

    all_data = get_nearby_entities(lat=exec_lat, lng=exec_lng, radius=threshold_m)
    entities = all_data.get("entities") or []

    alerts = []
    for item in entities:
        dist = item["distance_meters"]
        if dist <= threshold_m:
            alert_type = "geofence_arrival" if dist <= 150.0 else "nearby_opportunity"
            alerts.append({
                "type": alert_type,
                "client_id": item["id"],
                "title": f"📍 Nearby {item['category']}: {item['title']}",
                "message": f"{item['company_name']} is only {int(dist)}m away from your current location.",
                "distance_meters": dist,
                "category": item["category"],
                "company_name": item["company_name"],
                "address": item["address"],
                "phone": item["phone"],
                "priority": item["priority"],
            })

    return {
        "success": True,
        "inside_geofence_count": len(alerts),
        "alerts": alerts,
    }


@router.post("/update-location")
def update_executive_location(payload: Dict[str, Any] = Body(...)):
    """
    Live Telemetry Update:
    Stores real-time continuous executive GPS location in telemetry cache & persists to Supabase.
    """
    email = (payload.get("email") or payload.get("user_email") or "executive@tconnect.com").lower()
    lat = float(payload.get("latitude") or payload.get("lat") or 13.0067)
    lng = float(payload.get("longitude") or payload.get("lng") or 80.2570)
    emp_code = payload.get("employee_code") or "EMP000012"
    emp_name = payload.get("name") or payload.get("executive_name") or "Sales Executive"

    entry = {
        "email": email,
        "name": emp_name,
        "employee_code": emp_code,
        "latitude": lat,
        "longitude": lng,
        "speed_kmh": payload.get("speed") or 0.0,
        "heading": payload.get("heading") or 0.0,
        "timestamp": payload.get("timestamp") or "",
    }
    _live_executive_telemetry[email] = entry

    # Best-effort persist to Supabase
    try:
        from app.database.supabase import get_supabase_admin_client, get_supabase_client
        sp_client = get_supabase_admin_client() or get_supabase_client()
        # Update today's attendance record with latest coordinates if active
        import datetime
        today_str = datetime.date.today().isoformat()
        try:
            sp_client.schema("hrms").table("attendance").update({
                "latitude": lat,
                "longitude": lng,
                "check_out_latitude": lat,
                "check_out_longitude": lng,
            }).eq("employee_id", emp_code).eq("attendance_date", today_str).execute()
        except Exception:
            try:
                sp_client.table("attendance").update({
                    "latitude": lat,
                    "longitude": lng,
                }).eq("employee_id", emp_code).execute()
            except Exception:
                pass
    except Exception as e:
        logger.debug(f"Telemetry persistence notice: {e}")

    return {"success": True, "location": entry}

