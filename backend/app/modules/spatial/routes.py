import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, Depends, HTTPException, Body
from app.modules.crm.repository import CRMRepository
from app.modules.customer.repository import CustomerRepository
from app.modules.visit.repository import VisitRepository
from app.core.logger import logger
from app.core.dependencies import get_current_user_payload


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
async def update_executive_location(
    payload: Dict[str, Any] = Body(...),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Live Telemetry Update:
    Resolves the authenticated user to their HRMS employee record, updates memory telemetry, 
    and persists their latest live GPS location in Supabase hrms.employee_locations.
    """
    import datetime
    from app.database.supabase import get_supabase_admin_client, get_supabase_client
    
    auth_uid = user_payload.get("sub")
    lat = float(payload.get("latitude") or payload.get("lat") or 13.0067)
    lng = float(payload.get("longitude") or payload.get("lng") or 80.2570)
    accuracy = float(payload.get("accuracy") or payload.get("accuracy_meters") or 0.0)
    
    sp_client = get_supabase_admin_client() or get_supabase_client()
    
    # 1. Map auth_uid to hrms.employees.employee_id
    employee_id = auth_uid
    employee_name = payload.get("name") or "Sales Executive"
    employee_code = payload.get("employee_code") or "EMP000012"
    
    try:
        emp_res = sp_client.schema("hrms").table("employees").select("employee_id, name, employee_code").or_(f"user_id.eq.{auth_uid},auth_user_id.eq.{auth_uid},employee_id.eq.{auth_uid}").limit(1).execute()
        if emp_res.data:
            employee_id = emp_res.data[0]["employee_id"]
            employee_name = emp_res.data[0]["name"] or employee_name
            employee_code = emp_res.data[0]["employee_code"] or employee_code
    except Exception as e:
        logger.warning(f"Error mapping authenticated user to employee record: {e}")
        
    # 2. Update memory telemetry cache for backward compatibility
    email = str(user_payload.get("email") or payload.get("email") or "executive@tconnect.com").lower()
    entry = {
        "email": email,
        "name": employee_name,
        "employee_code": employee_code,
        "latitude": lat,
        "longitude": lng,
        "accuracy": accuracy,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "is_online": True
    }
    _live_executive_telemetry[email] = entry
    
    # 3. Persist latest location to Supabase hrms.employee_locations
    try:
        location_data = {
            "employee_id": employee_id,
            "latitude": lat,
            "longitude": lng,
            "accuracy": accuracy,
            "is_online": True,
            "last_seen_at": datetime.datetime.utcnow().isoformat(),
            "updated_at": datetime.datetime.utcnow().isoformat()
        }
        sp_client.schema("hrms").table("employee_locations").upsert(location_data).execute()
    except Exception as e:
        logger.warning(f"Error persisting live location: {e}")
        
    # 4. Update today's attendance record coordinates (attendance tracking remains separate)
    try:
        today_str = datetime.date.today().isoformat()
        sp_client.schema("hrms").table("attendance").update({
            "latitude": lat,
            "longitude": lng,
            "check_out_latitude": lat,
            "check_out_longitude": lng,
        }).or_(f"employee_id.eq.{employee_id},employee_id.eq.{employee_code}").eq("attendance_date", today_str).execute()
    except Exception as att_err:
        logger.debug(f"Attendance location update notice: {att_err}")
        
    return {"success": True, "location": entry}


@router.get("/manager/team-locations")
async def get_manager_team_locations(
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieve authenticated Sales Manager's assigned executives and their latest live location details.
    Determines the manager from token/JWT and returns ONLY assigned executives.
    """
    from app.database.supabase import get_supabase_admin_client, get_supabase_client
    from app.core.scoping import normalize_user_role
    from datetime import datetime, timezone
    
    auth_uid = user_payload.get("sub")
    role = user_payload.get("role") or "Sales Executive"
    norm_role = normalize_user_role(role)
    
    if norm_role not in ("sales_manager", "ceo", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Access denied. Managers only.")
        
    sp_client = get_supabase_admin_client() or get_supabase_client()
    
    # 1. Map auth_uid to hrms.employees manager record
    mgr_emp_id = auth_uid
    mgr_email = user_payload.get("email")
    mgr_name = user_payload.get("user_metadata", {}).get("full_name") or ""
    
    try:
        mgr_res = sp_client.schema("hrms").table("employees").select("employee_id, email, name").or_(f"user_id.eq.{auth_uid},auth_user_id.eq.{auth_uid},employee_id.eq.{auth_uid}").limit(1).execute()
        if mgr_res.data:
            mgr_emp_id = mgr_res.data[0]["employee_id"]
            mgr_email = mgr_res.data[0]["email"] or mgr_email
            mgr_name = mgr_res.data[0]["name"] or mgr_name
    except Exception as e:
        logger.warning(f"Error mapping manager user to employee record: {e}")
        
    # 2. Query assigned executives from hrms.employees table
    or_cond = f"reporting_manager.eq.{mgr_emp_id},reporting_manager_id.eq.{mgr_emp_id}"
    if mgr_email:
        or_cond += f",reporting_manager_email.eq.{mgr_email.strip().lower()}"
    if mgr_name:
        or_cond += f",reporting_manager_name.eq.{mgr_name.strip()}"
        
    try:
        subordinates_res = sp_client.schema("hrms").table("employees").select("employee_id, name, designation, role, email").or_(or_cond).execute()
        subordinates = subordinates_res.data or []
    except Exception as e:
        logger.error(f"Error querying assigned executives: {e}")
        subordinates = []
        
    if not subordinates:
        return {
            "success": True,
            "manager_id": mgr_emp_id,
            "team_count": 0,
            "online_count": 0,
            "offline_count": 0,
            "executives": []
        }
        
    exec_ids = [str(u.get("employee_id")) for u in subordinates]
    
    # 3. Query their live locations from hrms.employee_locations
    try:
        loc_res = sp_client.schema("hrms").table("employee_locations").select("*").in_("employee_id", exec_ids).execute()
        locations_map = {loc["employee_id"]: loc for loc in loc_res.data} if loc_res.data else {}
    except Exception as e:
        logger.warning(f"Error fetching live locations: {e}")
        locations_map = {}
        
    # 4. Normalize and calculate online/offline status
    normalized_list = []
    online_count = 0
    offline_count = 0
    
    for exec_user in subordinates:
        e_id = exec_user.get("employee_id")
        loc = locations_map.get(e_id)
        
        latitude = loc.get("latitude") if loc else None
        longitude = loc.get("longitude") if loc else None
        accuracy = loc.get("accuracy") if loc else None
        last_seen_at = loc.get("last_seen_at") if loc else None
        
        # Determine status: dynamic based on last_seen_at (within 5 minutes)
        is_online = False
        if loc:
            db_is_online = loc.get("is_online", True)
            if db_is_online and last_seen_at:
                try:
                    seen_dt = datetime.fromisoformat(last_seen_at.replace("Z", "+00:00"))
                    now_dt = datetime.now(timezone.utc)
                    diff = (now_dt - seen_dt).total_seconds()
                    if diff < 300:  # 5 minutes threshold
                        is_online = True
                except Exception:
                    is_online = db_is_online
            else:
                is_online = db_is_online
                
        if is_online:
            online_count += 1
        else:
            offline_count += 1
            
        normalized_list.append({
            "employee_id": e_id,
            "employee_name": exec_user.get("name") or "Sales Executive",
            "role": exec_user.get("designation") or exec_user.get("role") or "Sales Executive",
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "is_online": is_online,
            "last_seen_at": last_seen_at
        })
        
    return {
        "success": True,
        "manager_id": mgr_emp_id,
        "team_count": len(subordinates),
        "online_count": online_count,
        "offline_count": offline_count,
        "executives": normalized_list
    }



@router.post("/route")
def compute_route(payload: Dict[str, Any] = Body(...)):
    """
    Computes a route from origin to destination.
    Tries Google Maps Routes API (traffic-aware) first if key is configured,
    and falls back to non-traffic response.
    """
    from app.core.config import settings as app_settings
    import requests

    origin = payload.get("origin") or {}
    dest = payload.get("destination") or {}

    orig_lat = origin.get("latitude") or origin.get("lat")
    orig_lng = origin.get("longitude") or origin.get("lng")
    dest_lat = dest.get("latitude") or dest.get("lat")
    dest_lng = dest.get("longitude") or dest.get("lng")

    if orig_lat is None or orig_lng is None or dest_lat is None or dest_lng is None:
        raise HTTPException(status_code=400, detail="Missing origin or destination coordinates")

    api_key = app_settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        return {
            "success": False,
            "message": "Google Maps API Key not configured. Traffic routing unavailable.",
            "traffic_aware": False,
            "provider": "google"
        }

    # Prepare Google Routes API request
    url = "https://routes.googleapis.com/v1/computeRoutes"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline"
    }

    body = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": float(orig_lat),
                    "longitude": float(orig_lng)
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": float(dest_lat),
                    "longitude": float(dest_lng)
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE_OPTIMAL"
    }

    try:
        r = requests.post(url, headers=headers, json=body, timeout=8)
        if r.status_code != 200:
            logger.warning(f"Google Routes API status {r.status_code}: {r.text}")
            return {
                "success": False,
                "message": f"Google Routes API returned status {r.status_code}",
                "traffic_aware": False,
                "provider": "google"
            }

        res_data = r.json()
        routes = res_data.get("routes")
        if not routes:
            return {
                "success": False,
                "message": "No routes returned from Google Maps.",
                "traffic_aware": False,
                "provider": "google"
            }

        route = routes[0]
        dist_meters = route.get("distanceMeters") or 0
        dur_str = route.get("duration") or "0s"
        static_dur_str = route.get("staticDuration") or dur_str

        def parse_duration_seconds(d_str: str) -> float:
            return float(d_str.rstrip("s"))

        duration_sec = parse_duration_seconds(dur_str)
        static_duration_sec = parse_duration_seconds(static_dur_str)

        return {
            "success": True,
            "distance_km": round(dist_meters / 1000.0, 2),
            "eta_minutes": max(1, math.ceil(duration_sec / 60.0)),
            "static_eta_minutes": max(1, math.ceil(static_duration_sec / 60.0)),
            "traffic_aware": True,
            "polyline": route.get("polyline", {}).get("encodedPolyline") or "",
            "provider": "google"
        }

    except Exception as e:
        logger.error(f"Google Routes API exception: {e}")
        return {
            "success": False,
            "message": f"Google Routes API exception: {str(e)}",
            "traffic_aware": False,
            "provider": "google"
        }


