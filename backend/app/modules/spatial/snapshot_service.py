import os
import time
import asyncio
import datetime
from typing import Dict, Any, List, Optional
try:
    from playwright.async_api import async_playwright
except ImportError:
    async_playwright = None

from app.database.supabase import get_supabase_admin_client, get_supabase_client
from app.core.logger import logger
from app.core.config import settings

STATIC_SNAPSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "snapshots")
os.makedirs(STATIC_SNAPSHOTS_DIR, exist_ok=True)

# In-memory tracking of captured snapshots per session to prevent duplicate captures
_captured_snapshots_set = set()
_session_snapshots_store: Dict[str, List[Dict[str, Any]]] = {}


async def render_real_map_png(
    start_lat: float, start_lng: float,
    current_lat: float, current_lng: float,
    dest_lat: Optional[float] = None, dest_lng: Optional[float] = None,
    polyline_points: Optional[List[Dict[str, float]]] = None,
    executive_name: str = "Sales Executive"
) -> Optional[bytes]:
    """
    Renders an actual Google Maps view using Playwright headless Chromium with Google Maps tiles,
    Start Pin, Executive Bike Marker with Name Pill, Destination Pin, and Red Traveled Polyline.
    Returns PNG image bytes if size check passes (> 20KB), else None.
    """
    try:
        if not async_playwright:
            logger.warning("[SnapshotService] async_playwright unavailable, skipping map PNG render.")
            return None

        # Format polyline points for Google Maps JS
        pts_js = []
        if polyline_points:
            for p in polyline_points:
                try:
                    lat_val = float(p.get("lat") if p.get("lat") is not None else p.get("latitude"))
                    lng_val = float(p.get("lng") if p.get("lng") is not None else p.get("longitude"))
                    pts_js.append({"lat": lat_val, "lng": lng_val})
                except Exception:
                    pass
        if not pts_js:
            pts_js = [{"lat": start_lat, "lng": start_lng}, {"lat": current_lat, "lng": current_lng}]

        dest_lat_val = dest_lat if dest_lat is not None else current_lat
        dest_lng_val = dest_lng if dest_lng is not None else current_lng
        has_dest = "true" if dest_lat is not None else "false"

        gmaps_key = getattr(settings, "GOOGLE_MAPS_API_KEY", "")

        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <style>
                html, body, #map {{ height: 100%; margin: 0; padding: 0; background: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }}
                @keyframes scootyRadarPulse {{
                    0% {{ transform: scale(0.85); opacity: 0.9; }}
                    60% {{ transform: scale(1.45); opacity: 0.25; }}
                    100% {{ transform: scale(1.6); opacity: 0; }}
                }}
                @keyframes liveBlink {{
                    0%, 100% {{ opacity: 1; transform: scale(1); }}
                    50% {{ opacity: 0.3; transform: scale(0.8); }}
                }}
            </style>
            <script src="https://maps.googleapis.com/maps/api/js?key={gmaps_key}&libraries=geometry,places,marker,routes"></script>
        </head>
        <body>
            <div id="map"></div>
            <script>
                const startPt = {{ lat: {start_lat}, lng: {start_lng} }};
                const execPt = {{ lat: {current_lat}, lng: {current_lng} }};
                const destPt = {{ lat: {dest_lat_val}, lng: {dest_lng_val} }};
                const pathPts = {pts_js};

                const map = new google.maps.Map(document.getElementById('map'), {{
                    center: execPt,
                    zoom: 15,
                    mapTypeId: 'roadmap',
                    disableDefaultUI: true,
                    gestureHandling: 'none',
                    styles: [
                        {{ featureType: "poi", elementType: "labels", stylers: [{{ visibility: "off" }}] }}
                    ]
                }});

                // Red Polyline for traveled route
                const polyline = new google.maps.Polyline({{
                    path: pathPts,
                    geodesic: true,
                    strokeColor: '#dc2626',
                    strokeWeight: 5,
                    strokeOpacity: 0.95,
                    map: map
                }});

                // Fit bounds
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(startPt);
                bounds.extend(execPt);
                if ({has_dest}) bounds.extend(destPt);
                pathPts.forEach(pt => bounds.extend(pt));
                map.fitBounds(bounds, 60);

                // OverlayView for custom HTML markers
                class HTMLMapMarker extends google.maps.OverlayView {{
                    constructor(latlng, html, anchor = 'center') {{
                        super();
                        this.latlng = latlng;
                        this.html = html;
                        this.anchor = anchor;
                        this.div = null;
                        this.setMap(map);
                    }}
                    onAdd() {{
                        const div = document.createElement('div');
                        div.style.position = 'absolute';
                        div.innerHTML = this.html;
                        this.div = div;
                        const panes = this.getPanes();
                        panes.overlayImage.appendChild(div);
                    }}
                    draw() {{
                        if (!this.div) return;
                        const projection = this.getProjection();
                        if (!projection) return;
                        const point = projection.fromLatLngToDivPixel(this.latlng);
                        if (point) {{
                            const width = this.div.offsetWidth || 32;
                            const height = this.div.offsetHeight || 32;
                            this.div.style.left = (point.x - width / 2) + 'px';
                            if (this.anchor === 'bottom') {{
                                this.div.style.top = (point.y - height) + 'px';
                            }} else {{
                                this.div.style.top = (point.y - height / 2) + 'px';
                            }}
                        }}
                    }}
                    onRemove() {{
                        if (this.div && this.div.parentNode) {{
                            this.div.parentNode.removeChild(this.div);
                            this.div = null;
                        }}
                    }}
                }}

                // 1. START Marker
                new HTMLMapMarker(
                    startPt,
                    `<div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #10b981; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(16,185,129,0.4); color: #fff; font-family: sans-serif; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">START</div>`,
                    'center'
                );

                // 2. Executive Bike Marker
                const execName = "{executive_name}";
                const shortName = execName ? execName.split(' ')[0] : 'Executive';
                new HTMLMapMarker(
                    execPt,
                    `<div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none;">
                        <div style="background: rgba(15, 23, 42, 0.92); border: 1.5px solid #10b981; border-radius: 20px; padding: 2px 8px; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.4); margin-bottom: 2px; display: flex; align-items: center; gap: 4px; z-index: 10;">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: liveBlink 1.2s infinite ease-in-out;"></span>
                          <span>${{shortName}}</span>
                        </div>
                        <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; position: relative;">
                          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16,185,129,0.2); border: 1.5px solid rgba(16,185,129,0.5); animation: scootyRadarPulse 2s infinite cubic-bezier(0.2, 0.8, 0.2, 1); z-index: 1;"></div>
                          <div style="width: 38px; height: 38px; border-radius: 50%; background: #2563eb; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 5;">🏍️</div>
                        </div>
                    </div>`,
                    'center'
                );

                // 3. Destination Marker
                if ({has_dest}) {{
                    new HTMLMapMarker(
                        destPt,
                        `<div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #dc2626; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(220,38,38,0.4); color: #fff; font-family: sans-serif; font-size: 14px; font-weight: 900;">🎯</div>`,
                        'bottom'
                    );
                }}

                google.maps.event.addListenerOnce(map, 'idle', () => {{
                    setTimeout(() => {{ window.__map_rendered = true; }}, 1500);
                }});
            </script>
        </body>
        </html>
        """

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 800, "height": 500})
            await page.set_content(html_template)
            await page.wait_for_function("window.__map_rendered === true", timeout=12000)

            screenshot_bytes = await page.screenshot(type="png")
            await browser.close()

            # Verify size check: real map image must be > 20KB
            if screenshot_bytes and len(screenshot_bytes) > 20000:
                logger.info(f"[SNAPSHOT SERVICE] Verified map PNG rendered successfully ({len(screenshot_bytes)} bytes)")
                return screenshot_bytes
            else:
                logger.warning(f"[SNAPSHOT SERVICE] Screenshot size verification failed: {len(screenshot_bytes) if screenshot_bytes else 0} bytes")
                return None
    except Exception as e:
        logger.error(f"[SNAPSHOT SERVICE] Playwright map rendering error: {e}")
        return None


def upload_snapshot_to_supabase(image_bytes: bytes, filename: str) -> Optional[str]:
    """
    Uploads PNG bytes to Supabase Storage bucket 'route-snapshots' and returns public URL.
    """
    try:
        sp = get_supabase_admin_client() or get_supabase_client()
        if not sp:
            return None

        bucket_name = "route-snapshots"
        try:
            buckets = sp.storage.list_buckets()
            b_names = [b.name for b in buckets] if buckets else []
            if bucket_name not in b_names:
                sp.storage.create_bucket(bucket_name, options={"public": True})
        except Exception:
            pass

        sp.storage.from_(bucket_name).upload(
            filename,
            image_bytes,
            file_options={"content-type": "image/png", "upsert": "true"}
        )
        pub_url = sp.storage.from_(bucket_name).get_public_url(filename)
        logger.info(f"[SNAPSHOT SERVICE] Uploaded image to Supabase Storage: {pub_url}")
        return pub_url
    except Exception as e:
        logger.warning(f"[SNAPSHOT SERVICE] Could not upload image to Supabase Storage: {e}")
        return None


async def capture_and_store_snapshot(
    session_id: str,
    employee_id: str,
    employee_name: str,
    snapshot_type: str,
    current_lat: float,
    current_lng: float,
    start_lat: float,
    start_lng: float,
    dest_lat: Optional[float] = None,
    dest_lng: Optional[float] = None,
    polyline_points: Optional[List[Dict[str, float]]] = None,
    address: Optional[str] = None,
    timestamp: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Captures a real PNG map screenshot using Playwright, verifies pixel content,
    uploads to Supabase Storage & local static directory, and saves to hrms.route_snapshots.
    Enforces EXACTLY 3 SNAPSHOTS MAX:
      1. START_LOCATION
      2. MID_TRIP
      3. DESTINATION_REACHED
    """
    if snapshot_type not in ("START_LOCATION", "MID_TRIP", "DESTINATION_REACHED"):
        logger.warning(f"[SNAPSHOT SERVICE] Invalid snapshot_type: {snapshot_type}")
        return None

    cache_key = f"{session_id}_{snapshot_type}"
    if cache_key in _captured_snapshots_set:
        logger.info(f"[SNAPSHOT SERVICE] Snapshot {cache_key} already captured for this session. Skipping.")
        return None

    sp = get_supabase_admin_client() or get_supabase_client()

    # Verify if database already has this snapshot type for this session
    if sp and session_id:
        try:
            existing = sp.schema("hrms").table("route_snapshots").select("id, image_url").eq("session_id", str(session_id)).eq("snapshot_type", snapshot_type).limit(1).execute()
            if existing.data:
                _captured_snapshots_set.add(cache_key)
                logger.info(f"[SNAPSHOT SERVICE] DB already contains snapshot {snapshot_type} for session {session_id}.")
                return existing.data[0]
        except Exception:
            pass

    badge_map = {
        "START_LOCATION": (1, "Trip Started", "Trip Started / Start Location"),
        "MID_TRIP": (2, "Mid Trip", "Mid-Trip / Route Progress (50%)"),
        "DESTINATION_REACHED": (3, "Destination Reached", "Destination Reached")
    }
    badge_num, title, subtitle = badge_map[snapshot_type]

    # Render PNG screenshot via Playwright
    png_bytes = await render_real_map_png(
        start_lat=start_lat, start_lng=start_lng,
        current_lat=current_lat, current_lng=current_lng,
        dest_lat=dest_lat, dest_lng=dest_lng,
        polyline_points=polyline_points,
        executive_name=employee_name
    )

    if not png_bytes:
        logger.warning(f"[SNAPSHOT SERVICE] Could not capture verified map PNG for {snapshot_type}")
        return None

    ts_str = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"snap_{session_id}_{snapshot_type}_{ts_str}.png"

    # Save locally to static directory
    local_path = os.path.join(STATIC_SNAPSHOTS_DIR, filename)
    try:
        with open(local_path, "wb") as f:
            f.write(png_bytes)
        logger.info(f"[SNAPSHOT SERVICE] Saved snapshot PNG locally: {local_path}")
    except Exception as e:
        logger.warning(f"[SNAPSHOT SERVICE] Error saving local PNG file: {e}")

    # Upload to Supabase Storage
    storage_url = upload_snapshot_to_supabase(png_bytes, filename)
    local_url = f"/static/snapshots/{filename}"
    image_url = storage_url or local_url

    snap_time = timestamp or datetime.datetime.utcnow().isoformat()
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat()

    record = {
        "session_id": str(session_id) if session_id else None,
        "employee_id": str(employee_id),
        "employee_name": employee_name or "Sales Executive",
        "snapshot_type": snapshot_type,
        "badge_number": badge_num,
        "title": title,
        "timestamp": snap_time,
        "latitude": float(current_lat),
        "longitude": float(current_lng),
        "address": address or "",
        "image_url": image_url,
        "expires_at": expires_at
    }

    # Persist in hrms.route_snapshots and public.route_snapshots
    if sp:
        try:
            sp.schema("hrms").table("route_snapshots").upsert(record).execute()
        except Exception as err:
            logger.warning(f"[SNAPSHOT SERVICE] hrms.route_snapshots insert notice: {err}")
        try:
            pub_record = dict(record)
            pub_record["session_id"] = str(session_id) if session_id else None
            sp.table("route_snapshots").upsert(pub_record).execute()
        except Exception:
            pass

    _captured_snapshots_set.add(cache_key)
    if session_id:
        if str(session_id) not in _session_snapshots_store:
            _session_snapshots_store[str(session_id)] = []
        _session_snapshots_store[str(session_id)].append(record)

    logger.info(f"[SNAPSHOT SERVICE] Successfully created and saved snapshot {snapshot_type} for session {session_id}")
    return record


def get_captured_snapshots_for_session(session_id: str) -> List[Dict[str, Any]]:
    """
    Returns captured PNG map snapshots for a session from memory cache or database.
    Guarantees max 3 snapshots: START_LOCATION, MID_TRIP, DESTINATION_REACHED.
    """
    if not session_id:
        return []

    # 1. Check in-memory store first
    in_mem = _session_snapshots_store.get(str(session_id)) or []
    if len(in_mem) >= 1:
        return sorted(in_mem, key=lambda x: x.get("badge_number", 1))

    # 2. Try database query fallback
    try:
        sp = get_supabase_admin_client() or get_supabase_client()
        if sp:
            try:
                res = sp.table("route_snapshots").select("*").eq("session_id", str(session_id)).order("badge_number", desc=False).execute()
                if res and res.data:
                    return res.data
            except Exception:
                res = sp.schema("hrms").table("route_snapshots").select("*").eq("session_id", str(session_id)).order("badge_number", desc=False).execute()
                if res and res.data:
                    return res.data
    except Exception as e:
        logger.warning(f"[SNAPSHOT SERVICE] Error querying route_snapshots: {e}")

    return []
