import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin, Radio, Users, Activity, Clock, RefreshCw,
  Search, Shield, Map, Eye, Compass, Navigation,
  AlertCircle, ChevronRight, Phone, Mail, Award, CheckCircle2, X,
  Route, Milestone
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { spatialAPI, authAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { formatDate } from '../../utils/dateUtils.js'

const DEFAULT_CENTER = { lat: 13.0067, lng: 80.2570 }

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function decodePolyline(encoded) {
  if (!encoded) return []
  let index = 0, len = encoded.length
  let lat = 0, lng = 0
  const path = []
  while (index < len) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat
    shift = 0; result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng
    path.push([lat * 1e-5, lng * 1e-5])
  }
  return path
}

// Supabase client — anon key only (never service_role in frontend)
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
let supabase = window.__supabase_client || null
try {
  if (SUPA_URL && SUPA_ANON && !supabase) {
    supabase = createClient(SUPA_URL, SUPA_ANON)
    window.__supabase_client = supabase
  }
} catch { /* Realtime unavailable; fall back to polling */ }

// ── Stale thresholds ───────────────────────────────────────────────────────────
const STALE_MS  = 5  * 60 * 1000  // 5 min → stale
const GONE_MS   = 10 * 60 * 1000  // 10 min → offline

function getTrackingBadge(status, lastUpdatedMs) {
  if (status === 'ended') return { label: 'Stopped', color: '#475569', dot: '⬛' }
  if (!lastUpdatedMs)     return { label: 'No Data', color: '#475569', dot: '⬛' }
  const age = Date.now() - lastUpdatedMs
  if (age > GONE_MS)  return { label: 'Offline',  color: '#dc2626', dot: '🔴' }
  if (age > STALE_MS) return { label: 'Stale',    color: '#f97316', dot: '🟠' }
  return                       { label: 'Live',    color: '#10b981', dot: '🟢' }
}

export default function ManagerSmartMap() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // State
  const [mapLoaded,        setMapLoaded]        = useState(false)
  const [loading,          setLoading]           = useState(true)
  const [panelOpen,        setPanelOpen]         = useState(window.innerWidth >= 1024)
  const [lastUpdated,      setLastUpdated]       = useState(null)
  const [autoRefresh,      setAutoRefresh]       = useState(true)
  const [viewMode,         setViewMode]          = useState('both')
  const [searchQuery,      setSearchQuery]       = useState('')
  const [executives,       setExecutives]        = useState([])
  const [selectedExecutive,setSelectedExecutive] = useState(null)
  const [stats,            setStats]             = useState({ total: 0, online: 0, offline: 0 })

  // Live-tracking panel state
  const [trackSession,     setTrackSession]      = useState(null)
  const [trackBreadcrumbs, setTrackBreadcrumbs]  = useState([])
  const [trackStatus,      setTrackStatus]       = useState('idle') // idle|loading|live|stale|ended
  const [lastPingMs,       setLastPingMs]        = useState(null)
  const [realtimeOk,       setRealtimeOk]        = useState(false)

  // Client destination details state
  const [destClient,       setDestClient]        = useState(null)
  const [destRouteMeta,    setDestRouteMeta]     = useState(null)

  // ─── 2. Fetch team locations ──────────────────────────────────────────────
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const res = await spatialAPI.getTeamLocations()
      const payload = res?.data || res
      if (payload?.executives) {
        setExecutives(payload.executives)
        setStats({ total: payload.team_count || 0, online: payload.online_count || 0, offline: payload.offline_count || 0 })
      }
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Smart Map fetch error:', err)
      showToast('Could not retrieve team live locations', 'error')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [showToast])

  // Map & Leaflet Refs
  const mapContainerRef = useRef(null)
  const leafletMapRef   = useRef(null)
  const teamGroupRef    = useRef(null)
  const clientGroupRef  = useRef(null)

  // Tracking-layer refs (one set per selected executive)
  const trackRouteRef   = useRef(null)  // L.Polyline breadcrumb route
  const startMarkerRef  = useRef(null)  // green start pin
  const liveMarkerRef   = useRef(null)  // animated live position
  const endMarkerRef    = useRef(null)  // grey end pin
  const destMarkerRef   = useRef(null)  // client destination pin
  const destRouteRef    = useRef(null)  // L.Polyline route to destination
  const destClientRef   = useRef(null)  // ref to avoid stale closures for selected client
  const selectedExecutiveRef = useRef(null)
  const trackSessionRef = useRef(null)
  const realtimeChRef   = useRef(null)  // supabase channel
  const animFrameRef    = useRef(null)  // requestAnimationFrame id
  const pollTimerRef    = useRef(null)  // fallback polling timer
  const initialFitBoundsDoneRef = useRef(false)
  const crumbsRef       = useRef([])
  const lastRouteRecalcPosRef = useRef(null)
  const lastRouteRecalcTimeRef = useRef(0)

  const _handleSessionEnded = useCallback((sess) => {
    if (!leafletMapRef.current || !window.L) return
    if (liveMarkerRef.current) {
      liveMarkerRef.current.remove()
      liveMarkerRef.current = null
    }
    fetchData(true)
  }, [fetchData])

  const _drawRouteToDestination = async (originLat, originLng, clientDest) => {
    if (!leafletMapRef.current || !window.L || !clientDest?.latitude || !clientDest?.longitude) return;
    
    // Draw destination client marker (📍) if not exists
    if (!destMarkerRef.current) {
      destMarkerRef.current = window.L.marker([clientDest.latitude, clientDest.longitude], { icon: _buildDestIcon() })
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;padding:4px;color:#1e293b;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:900;color:#ef4444;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;margin-bottom:4px;">
              <span>📍 Client Destination</span>
            </div>
            <div style="font-weight:800;font-size:13px;color:#0f172a;">${clientDest.title}</div>
            ${clientDest.company_name && clientDest.company_name !== clientDest.title ? `<div style="font-weight:700;color:#64748b;font-size:11px;margin-top:1px;">${clientDest.company_name}</div>` : ''}
            <div style="color:#475569;font-size:10px;margin-top:4px;line-height:1.4;">${clientDest.address}</div>
          </div>
        `)
        .addTo(leafletMapRef.current);
    }

    let routePts = [];
    let distanceKm = 0;
    let etaMins = 0;
    let staticEtaMins = 0;
    let routeFetched = false;

    // 1. Try backend routes API
    try {
      const res = await spatialAPI.getRoute(
        { latitude: originLat, longitude: originLng },
        { latitude: clientDest.latitude, longitude: clientDest.longitude }
      );
      const data = res?.data || res;
      console.log("[SmartMap] Route API response status/body:", data);

      if (data && data.success) {
        distanceKm = Number(data.distance_km || 0);
        etaMins = Number(data.eta_minutes || 0);
        staticEtaMins = Number(data.static_eta_minutes || data.eta_minutes || 0);

        if (data.polyline && typeof data.polyline === 'string') {
          routePts = decodePolyline(data.polyline);
        } else if (data.polyline && Array.isArray(data.polyline)) {
          routePts = data.polyline;
        } else if (data.geometry) {
          if (typeof data.geometry === 'string') {
            routePts = decodePolyline(data.geometry);
          } else if (Array.isArray(data.geometry)) {
            routePts = data.geometry.map(pt => [Number(pt[1]), Number(pt[0])]);
          } else if (data.geometry.coordinates && Array.isArray(data.geometry.coordinates)) {
            routePts = data.geometry.coordinates.map(pt => [Number(pt[1]), Number(pt[0])]);
          }
        }
        
        if (routePts.length > 0) {
          routeFetched = true;
          console.log("[SmartMap] Decoded backend route coordinates length:", routePts.length);
        }
      } else {
        console.warn("[SmartMap] Backend route API returned success = false:", data?.message);
      }
    } catch (err) {
      console.error("[SmartMap] Backend route API failed:", err);
    }

    // 2. Client-side OSRM Fallback (if backend routing failed)
    if (!routeFetched) {
      console.log("[SmartMap] Backend routing failed. Trying direct client-side OSRM fallback...");
      const coordStr = `${originLng},${originLat};${clientDest.longitude},${clientDest.latitude}`;
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full`;
      
      try {
        const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(10000) });
        const resData = await response.json();
        console.log("[SmartMap] OSRM direct client fallback response:", resData);

        if (resData.code === 'Ok' && resData.routes?.length > 0) {
          const route = resData.routes[0];
          distanceKm = Number((route.distance / 1000.0).toFixed(2));
          etaMins = Math.ceil(route.duration / 60.0);
          staticEtaMins = etaMins;

          const geom = route.geometry;
          if (geom) {
            if (typeof geom === 'string') {
              routePts = decodePolyline(geom);
            } else if (geom.coordinates && Array.isArray(geom.coordinates)) {
              routePts = geom.coordinates.map(pt => [Number(pt[1]), Number(pt[0])]);
            } else if (Array.isArray(geom)) {
              routePts = geom.map(pt => [Number(pt[1]), Number(pt[0])]);
            }
          }

          if (routePts.length > 0) {
            routeFetched = true;
            console.log("[SmartMap] Decoded OSRM fallback route coordinates length:", routePts.length);
          }
        } else {
          console.error("[SmartMap] OSRM fallback response code was not 'Ok':", resData.code);
        }
      } catch (osrmErr) {
        console.error("[SmartMap] OSRM direct client-side fallback query failed:", osrmErr);
      }
    }

    // 3. Render route polyline on Leaflet map
    if (routeFetched && routePts.length > 1) {
      // Force endpoints mapping
      routePts[0] = [Number(originLat), Number(originLng)];
      routePts[routePts.length - 1] = [Number(clientDest.latitude), Number(clientDest.longitude)];

      if (destRouteRef.current) {
        destRouteRef.current.setLatLngs(routePts);
      } else {
        destRouteRef.current = window.L.polyline(routePts, {
          color: '#2563eb', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round'
        }).addTo(leafletMapRef.current);
      }

      setDestRouteMeta({
        distanceKm: distanceKm,
        etaMins: etaMins,
        staticEtaMins: staticEtaMins
      });
      lastRouteRecalcPosRef.current = { lat: originLat, lng: originLng };
      lastRouteRecalcTimeRef.current = Date.now();
    } else {
      console.warn("[SmartMap] Road route unavailable. Clearing route layer from map.");
      if (destRouteRef.current) {
        destRouteRef.current.remove();
        destRouteRef.current = null;
      }
      setDestRouteMeta(null);
    }
  };

  // ─── 1. Load Leaflet CDN ──────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const js = document.createElement('script')
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    js.onload = () => setMapLoaded(true)
    document.body.appendChild(js)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => fetchData(true), 10000)
    return () => clearInterval(t)
  }, [autoRefresh, fetchData])

  // ─── 3. Leaflet map init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || leafletMapRef.current) return
    const map = window.L.map(mapContainerRef.current, { zoomControl: false })
      .setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 20
    }).addTo(map)
    window.L.control.zoom({ position: 'bottomright' }).addTo(map)
    teamGroupRef.current   = window.L.featureGroup().addTo(map)
    clientGroupRef.current = window.L.featureGroup().addTo(map)
    leafletMapRef.current  = map
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null }
    }
  }, [mapLoaded])

  // ─── 4. Helper: format time ───────────────────────────────────────────────
  const formatLastSeen = (isoStr) => {
    if (!isoStr) return 'Never'
    try {
      const diff = Math.floor((Date.now() - new Date(isoStr)) / 60000)
      if (diff < 1)  return 'Just now'
      if (diff < 60) return `${diff}m ago`
      const h = Math.floor(diff / 60)
      return h < 24 ? `${h}h ago` : formatDate(isoStr)
    } catch { return 'Unknown' }
  }

  const formatDuration = (startIso) => {
    if (!startIso) return '—'
    const secs = Math.floor((Date.now() - new Date(startIso)) / 1000)
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // ─── 5. Team / Client markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return
    if (teamGroupRef.current)   teamGroupRef.current.clearLayers()
    if (clientGroupRef.current) clientGroupRef.current.clearLayers()

    const bounds = []

    if (viewMode === 'team' || viewMode === 'both') {
      executives.forEach(ex => {
        if (!ex.latitude || !ex.longitude) return
        
        // Hide selected executive's static team marker to prevent duplication with tracking layer
        if (selectedExecutive && selectedExecutive.employee_id === ex.employee_id) return

        const isCV = ex.check_in_mode === 'Client Visit'
        const initials = ex.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        const sc = isCV ? '#8b5cf6' : (ex.is_online ? '#10b981' : '#64748b')
        const glow = isCV ? 'rgba(139,92,246,0.5)' : (ex.is_online ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.2)')

        const icon = window.L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#0f172a;border:3px solid ${sc};box-shadow:0 0 12px ${glow};color:#f8fafc;font-family:ui-sans-serif,system-ui;font-weight:800;font-size:13px;position:relative;">
            ${initials}
            <span style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;background:${sc};border:2px solid #0f172a;border-radius:50%;"></span>
          </div>`,
          iconSize: [42, 42], iconAnchor: [21, 21]
        })

        window.L.marker([ex.latitude, ex.longitude], { icon })
          .bindPopup(`<div style="font-family:sans-serif;font-size:12px"><strong>${ex.employee_name}</strong><br/>${ex.is_online ? '● Online' : '○ Offline'}<br/>Last: ${formatLastSeen(ex.last_seen_at)}</div>`)
          .addTo(teamGroupRef.current)

        bounds.push([ex.latitude, ex.longitude])
      })
    }


    if (bounds.length > 0 && !initialFitBoundsDoneRef.current && !selectedExecutive) {
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      initialFitBoundsDoneRef.current = true
    }
  }, [viewMode, executives, selectedExecutive])

  // ─── 6. Live tracking: load history + subscribe Realtime ─────────────────
  const _clearTrackingLayer = useCallback(() => {
    if (trackRouteRef.current)  { trackRouteRef.current.remove();  trackRouteRef.current  = null }
    if (startMarkerRef.current) { startMarkerRef.current.remove(); startMarkerRef.current = null }
    if (liveMarkerRef.current)  { liveMarkerRef.current.remove();  liveMarkerRef.current  = null }
    if (endMarkerRef.current)   { endMarkerRef.current.remove();   endMarkerRef.current   = null }
    if (destMarkerRef.current)  { destMarkerRef.current.remove();  destMarkerRef.current  = null }
    if (destRouteRef.current)   { destRouteRef.current.remove();   destRouteRef.current   = null }
    if (animFrameRef.current)   { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (pollTimerRef.current)   { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    if (realtimeChRef.current)  { try { realtimeChRef.current.unsubscribe() } catch {} realtimeChRef.current = null }
    setDestClient(null)
    setDestRouteMeta(null)
    crumbsRef.current = []
    selectedExecutiveRef.current = null
    trackSessionRef.current = null
  }, [])

  // Calculate bearing/heading between two coordinates
  const getBearing = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0
    if (lat1 === lat2 && lon1 === lon2) return 0
    const dLng = (lon2 - lon1) * Math.PI / 180
    const lat1Rad = lat1 * Math.PI / 180
    const lat2Rad = lat2 * Math.PI / 180
    const y = Math.sin(dLng) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
    const brng = Math.atan2(y, x) * 180 / Math.PI
    return (brng + 360) % 360
  }

  // Smooth marker animation between two lat/lng points with direction rotation
  const _animateMarker = (marker, toLat, toLng) => {
    if (!marker) return
    const from = marker.getLatLng()
    const prevLat = from.lat
    const prevLng = from.lng
    const heading = getBearing(prevLat, prevLng, toLat, toLng)
    
    const dur = 1000
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p // ease-in-out
      const currLat = prevLat + (toLat - prevLat) * ease
      const currLng = prevLng + (toLng - prevLng) * ease
      marker.setLatLng([currLat, currLng])
      
      // Rotate wrapper if found
      const el = marker.getElement()
      if (el) {
        const wrapper = el.querySelector('.live-vehicle-wrapper')
        if (wrapper) wrapper.style.transform = `rotate(${heading}deg)`
      }
      
      if (p < 1) animFrameRef.current = requestAnimationFrame(step)
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(step)
  }

  const _buildLivePopupContent = (executive, session, clientDest) => {
    const executiveName = executive?.employee_name || "Sales Executive"
    const clientId = clientDest?.id || session?.client_id || executive?.client_id || '—'
    const clientName = clientDest?.title || session?.client_name || executive?.client_name || '—'
    const companyName = clientDest?.company_name || clientDest?.company || session?.company_name || executive?.company_name || '—'
    const clientPhone = session?.client_phone || executive?.client_phone || '—'

    return `
      <div style="font-family:sans-serif;font-size:12px;padding:6px;color:#1e293b;min-width:200px;">
        <div style="font-weight:900;font-size:13px;color:#7c3aed;margin-bottom:8px;border-bottom:1.5px solid #f1f5f9;padding-bottom:5px;display:flex;align-items:center;gap:6px;">
          <span>👤</span> <span>${executiveName}</span>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;color:#475569;">
          <span style="font-weight:700;color:#64748b;">Client ID:</span>
          <span style="font-weight:800;color:#0f172a;">${clientId}</span>
          
          <span style="font-weight:700;color:#64748b;">Client Name:</span>
          <span style="font-weight:800;color:#0f172a;">${clientName}</span>

          <span style="font-weight:700;color:#64748b;">Company Name:</span>
          <span style="font-weight:800;color:#0f172a;">${companyName}</span>
          
          <span style="font-weight:700;color:#64748b;">Phone:</span>
          <span style="font-weight:800;color:#0f172a;font-family:monospace;">${clientPhone}</span>
        </div>
      </div>
    `
  }

  const _buildLiveIcon = (color = '#8b5cf6', heading = 0) => window.L.divIcon({
    className: 'live-vehicle-marker-container',
    html: `
      <div class="live-vehicle-wrapper" style="transform: rotate(${heading}deg); transition: transform 0.3s ease; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; position: relative;">
        <!-- Pulse glow -->
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${color}22; border: 2px solid ${color}44; animation: vehiclePulse 2s infinite ease-in-out; z-index: -1;"></div>
        
        <!-- Scooter/Bike Icon -->
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #0f172a; border: 2.5px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
            <circle cx="5.5" cy="17.5" r="2.5"/>
            <circle cx="18.5" cy="17.5" r="2.5"/>
            <path d="M5.5 17.5H12l3-7h4"/>
            <path d="M12 10.5h4.5"/>
            <circle cx="12" cy="7" r="1"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes vehiclePulse {
          0% { transform: scale(0.9); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 0.4; }
          100% { transform: scale(0.9); opacity: 0.9; }
        }
      </style>
    `,
    iconSize: [44, 44], iconAnchor: [22, 22]
  })

  const _buildStartIcon = () => window.L.divIcon({
    className: '',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #10b981; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(16,185,129,0.4); color: #fff; font-family: sans-serif; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">
        START
      </div>
    `,
    iconSize: [34, 34], iconAnchor: [17, 17]
  })

  const _buildEndIcon = () => window.L.divIcon({
    className: '',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #475569; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(71,85,105,0.4); color: #fff; font-family: sans-serif; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">
        END
      </div>
    `,
    iconSize: [34, 34], iconAnchor: [17, 17]
  })

  const _buildDestIcon = () => window.L.divIcon({
    className: '',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #ef4444; border: 2.5px solid #fff; box-shadow: 0 4px 12px rgba(239,68,68,0.5); color: #fff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    `,
    iconSize: [34, 34], iconAnchor: [17, 17]
  })

  const _applyNewCrumb = useCallback((crumb) => {
    if (!leafletMapRef.current || !window.L || !crumb) return
    const lat = Number(crumb.latitude)
    const lng = Number(crumb.longitude)
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

    const now = Date.now()
    setLastPingMs(now)
    setTrackStatus('live')

    // Extend polyline (if any)
    try {
      if (trackRouteRef.current) {
        const lls = trackRouteRef.current.getLatLngs()
        lls.push([lat, lng])
        trackRouteRef.current.setLatLngs(lls)
      }
    } catch (polylineErr) {
      console.warn("Failed to extend polyline:", polylineErr)
    }

    // Animate live marker
    try {
      if (liveMarkerRef.current) {
        _animateMarker(liveMarkerRef.current, lat, lng)
        liveMarkerRef.current.setPopupContent(_buildLivePopupContent(selectedExecutiveRef.current, trackSessionRef.current, destClientRef.current))
      } else {
        let initialHeading = 0
        if (crumbsRef.current.length > 1) {
          const lastIndex = crumbsRef.current.length - 1
          const prev = crumbsRef.current[lastIndex - 1]
          initialHeading = getBearing(Number(prev.latitude), Number(prev.longitude), lat, lng)
        }
        liveMarkerRef.current = window.L.marker([lat, lng], { icon: _buildLiveIcon('#8b5cf6', initialHeading), zIndexOffset: 1000 })
          .bindPopup(`<div style="font-family:sans-serif;font-size:12px"><strong>Live Position</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`)
          .addTo(leafletMapRef.current)
      }
    } catch (markerErr) {
      console.warn("Failed to animate or render live marker:", markerErr)
    }

    // Dynamic Route to Client Update (throttled to 50 meters or 30 seconds interval)
    if (destClientRef.current) {
      let shouldRecalc = false
      if (!lastRouteRecalcPosRef.current) {
        shouldRecalc = true
      } else {
        const dist = haversineDistance(lat, lng, lastRouteRecalcPosRef.current.lat, lastRouteRecalcPosRef.current.lng)
        const timeElapsed = now - lastRouteRecalcTimeRef.current
        if (dist >= 0.05 || timeElapsed >= 30000) {
          shouldRecalc = true
        }
      }
      if (shouldRecalc) {
        try {
          _drawRouteToDestination(lat, lng, destClientRef.current)
        } catch (routeErr) {
          console.warn("Failed to update route to destination on new crumb:", routeErr)
        }
      }
    }
  }, [])

  const _loadTrackingHistory = useCallback(async (executive) => {
    if (!leafletMapRef.current || !window.L) return
    selectedExecutiveRef.current = executive
    setTrackStatus('loading')
    console.log("[SmartMap] Loading tracking history for executive:", executive?.employee_name, executive?.employee_id)
    try {
      const res = await spatialAPI.getLocationHistory(executive.employee_id)
      console.log("[SmartMap] History response:", res)
      const data = res?.data || res
      const session = data?.session
      trackSessionRef.current = session
      const crumbs  = data?.breadcrumbs || []
      const status  = data?.tracking_status || 'active'

      setTrackSession(session)
      crumbsRef.current = crumbs
      setTrackBreadcrumbs(crumbs)
      setTrackStatus(status)

      const map = leafletMapRef.current

      // Parse Client Destination (prefer DB columns, fallback to executive coordinates, fallback to encoded check_in_address)
      let clientDest = null
      if (session && session.client_latitude != null && session.client_longitude != null) {
        clientDest = {
          id: session.client_id || 'db_dest',
          title: session.client_name || 'Active Client Visit',
          company_name: session.company_name || session.client_name || 'Active Client Visit',
          address: session.client_address || '—',
          latitude: Number(session.client_latitude),
          longitude: Number(session.client_longitude),
          category: 'Client'
        }
      } else if (executive.client_latitude != null && executive.client_longitude != null) {
        clientDest = {
          id: executive.client_id || 'ex_dest',
          title: executive.client_name || 'Active Client Visit',
          company_name: executive.company_name || executive.client_name || 'Active Client Visit',
          address: executive.client_address || '—',
          latitude: Number(executive.client_latitude),
          longitude: Number(executive.client_longitude),
          category: 'Client'
        }
      } else if (executive.check_in_address && executive.check_in_address.startsWith("CLIENT_VISIT_DESTINATION:::")) {
        try {
          const parsed = JSON.parse(executive.check_in_address.replace("CLIENT_VISIT_DESTINATION:::", ""))
          if (parsed && parsed.latitude != null && parsed.longitude != null) {
            clientDest = {
              id: parsed.id || 'parsed_dest',
              title: parsed.title || parsed.client_name || 'Active Client Visit',
              company_name: parsed.company_name || parsed.client_name || 'Active Client Visit',
              address: parsed.address || '—',
              latitude: Number(parsed.latitude),
              longitude: Number(parsed.longitude),
              category: 'Client'
            }
          }
        } catch (e) {
          console.warn("Failed to parse check_in_address for destination:", e)
        }
      }

      if (clientDest) {
        setDestClient(clientDest)
        destClientRef.current = clientDest
      }

      // Live / end marker coordinates calculation
      let latestLat = null
      let latestLng = null

      if (session) {
        latestLat = session.start_latitude != null ? Number(session.start_latitude) : null
        latestLng = session.start_longitude != null ? Number(session.start_longitude) : null
      } else {
        latestLat = executive.latitude != null ? Number(executive.latitude) : null
        latestLng = executive.longitude != null ? Number(executive.longitude) : null
      }

      // Isolated Leaflet rendering block
      try {
        if (session && status === 'ended' && session.end_latitude != null && session.end_longitude != null) {
          latestLat = Number(session.end_latitude)
          latestLng = Number(session.end_longitude)
          const badgeColor = '#64748b'
          liveMarkerRef.current = window.L.marker(
            [latestLat, latestLng], { icon: _buildLiveIcon(badgeColor, 0), zIndexOffset: 1000 }
          ).bindPopup(_buildLivePopupContent(executive, session, clientDest)).addTo(map)
        } else if (crumbs.length > 0) {
          const last = crumbs[crumbs.length - 1]
          latestLat = Number(last.latitude)
          latestLng = Number(last.longitude)
          
          let initialHeading = 0
          if (crumbs.length > 1) {
            const secondLast = crumbs[crumbs.length - 2]
            initialHeading = getBearing(Number(secondLast.latitude), Number(secondLast.longitude), latestLat, latestLng)
          }
          
          const age = Date.now() - new Date(last.recorded_at).getTime()
          const badgeColor = age > GONE_MS ? '#dc2626' : age > STALE_MS ? '#f97316' : '#10b981'
          liveMarkerRef.current = window.L.marker(
            [latestLat, latestLng], { icon: _buildLiveIcon(badgeColor, initialHeading), zIndexOffset: 1000 }
          ).bindPopup(_buildLivePopupContent(executive, session, clientDest)).addTo(map)
          setLastPingMs(new Date(last.recorded_at).getTime())
        } else if (session && session.start_latitude != null && session.start_longitude != null) {
          latestLat = Number(session.start_latitude)
          latestLng = Number(session.start_longitude)
          const badgeColor = '#10b981'
          liveMarkerRef.current = window.L.marker(
            [latestLat, latestLng], { icon: _buildLiveIcon(badgeColor, 0), zIndexOffset: 1000 }
          ).bindPopup(_buildLivePopupContent(executive, session, clientDest)).addTo(map)
          setLastPingMs(new Date(session.start_time).getTime())
        } else if (executive.latitude != null && executive.longitude != null) {
          latestLat = Number(executive.latitude)
          latestLng = Number(executive.longitude)
          const badgeColor = '#10b981'
          liveMarkerRef.current = window.L.marker(
            [latestLat, latestLng], { icon: _buildLiveIcon(badgeColor, 0), zIndexOffset: 1000 }
          ).bindPopup(_buildLivePopupContent(executive, session, clientDest)).addTo(map)
          setLastPingMs(Date.now())
        }
      } catch (leafletErr) {
        console.error("[SmartMap] Error rendering live/end markers:", leafletErr)
      }

      // Draw route to destination (if client visit active, draw regardless of ended/active status)
      if (clientDest && latestLat != null && latestLng != null && !isNaN(latestLat) && !isNaN(latestLng)) {
        try {
          _drawRouteToDestination(latestLat, latestLng, clientDest)
        } catch (routeErr) {
          console.error("[SmartMap] Error drawing route to destination:", routeErr)
        }
      }

      // Fit bounds to route + destination
      try {
        const allPts = []
        crumbs.forEach(c => {
          const la = Number(c.latitude)
          const ln = Number(c.longitude)
          if (!isNaN(la) && !isNaN(ln) && la !== 0 && ln !== 0) allPts.push([la, ln])
        })
        if (session && session.start_latitude != null && session.start_longitude != null) {
          const la = Number(session.start_latitude)
          const ln = Number(session.start_longitude)
          if (!isNaN(la) && !isNaN(ln) && la !== 0 && ln !== 0) allPts.push([la, ln])
        }
        if (latestLat != null && latestLng != null && !isNaN(latestLat) && !isNaN(latestLng) && latestLat !== 0 && latestLng !== 0) {
          allPts.push([latestLat, latestLng])
        }
        if (clientDest && clientDest.latitude != null && clientDest.longitude != null) {
          const la = Number(clientDest.latitude)
          const ln = Number(clientDest.longitude)
          if (!isNaN(la) && !isNaN(ln) && la !== 0 && ln !== 0) allPts.push([la, ln])
        }

        const validPts = allPts.filter(pt => pt && !isNaN(pt[0]) && !isNaN(pt[1]) && pt[0] !== 0 && pt[1] !== 0)
        if (validPts.length > 0) {
          map.fitBounds(validPts, { padding: [60, 60], maxZoom: 17 })
        }
      } catch (boundsErr) {
        console.error("[SmartMap] Error fitting map bounds:", boundsErr)
      }

      // Subscribe Realtime (or fall back to polling)
      if (session) {
        _subscribeRealtime(executive.employee_id, session.id)
      }

    } catch (err) {
      console.error('Tracking history error:', err)
      setTrackStatus('idle')
    }
  }, [_applyNewCrumb])

  const _subscribeRealtime = useCallback((employeeId, sessionId) => {
    // Clean up previous channel first
    if (realtimeChRef.current) { try { realtimeChRef.current.unsubscribe() } catch {} }
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }

    if (supabase) {
      const channel = supabase
        .channel(`tracking_${employeeId}_${sessionId || 'live'}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'hrms',
          table: 'tracking_locations',
          filter: sessionId ? `tracking_session_id=eq.${sessionId}` : `employee_id=eq.${employeeId}`
        }, (payload) => {
          const crumb = payload.new
          if (!crumb) return
          
          const exists = crumbsRef.current.some(c => c.id === crumb.id)
          if (!exists) {
            crumbsRef.current = [...crumbsRef.current, crumb]
            setTrackBreadcrumbs(crumbsRef.current)
            _applyNewCrumb(crumb)
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'hrms',
          table: 'tracking_sessions',
          filter: sessionId ? `id=eq.${sessionId}` : `employee_id=eq.${employeeId}`
        }, (payload) => {
          const sess = payload.new
          if (!sess) return
          setTrackSession(sess)
          setTrackStatus(sess.status || 'ended')
          if (sess.status === 'ended') {
            _handleSessionEnded(sess)
          }
        })
        .subscribe((s) => {
          setRealtimeOk(s === 'SUBSCRIBED')
        })

      realtimeChRef.current = channel
    }

    // Always start polling timer as secure backend API fallback (does not blindly call setSession on Supabase)
    pollTimerRef.current = setInterval(async () => {
      try {
        const r = await spatialAPI.getLocationHistory(employeeId, sessionId)
        const d = r?.data || r
        const newCrumbs = d?.breadcrumbs || []
        const currentCount = crumbsRef.current.length
        
        // Sequentially apply new crumbs
        if (newCrumbs.length > currentCount) {
          for (let i = currentCount; i < newCrumbs.length; i++) {
            _applyNewCrumb(newCrumbs[i])
          }
          crumbsRef.current = newCrumbs
          setTrackBreadcrumbs(newCrumbs)
        }
        
        const status = d?.tracking_status || 'active'
        const sess = d?.session
        
        setTrackStatus(status)
        setTrackSession(sess)
        
        if (status === 'ended' && sess) {
          _handleSessionEnded(sess)
        }
      } catch (err) {
        console.warn("Polling error:", err)
      }
    }, 10000)
  }, [_applyNewCrumb, _handleSessionEnded, fetchData])

  // Stale detection timer: re-evaluate badge every 30s
  useEffect(() => {
    const t = setInterval(() => {
      if (!selectedExecutive) return
      if (trackStatus === 'ended') return
      const badge = getTrackingBadge(trackStatus, lastPingMs)
      if (badge.label === 'Stale' && trackStatus !== 'stale') setTrackStatus('stale')
      if (badge.label === 'Offline' && trackStatus !== 'offline') setTrackStatus('offline')
    }, 30000)
    return () => clearInterval(t)
  }, [selectedExecutive, trackStatus, lastPingMs])

  // Clean up on unmount
  useEffect(() => () => _clearTrackingLayer(), [_clearTrackingLayer])

  // ─── 7. Executive selection ───────────────────────────────────────────────
  const handleSelectExecutive = (ex) => {
    // Always clean up previous tracking layer before loading new one
    _clearTrackingLayer()
    selectedExecutiveRef.current = ex
    setTrackSession(null)
    setTrackBreadcrumbs([])
    setLastPingMs(null)
    setRealtimeOk(false)

    setSelectedExecutive(ex)
    
    // Only zoom/fly to executive location if there is NO active client visit destination
    const isClientVisit = ex.check_in_mode === 'Client Visit' || ex.client_latitude != null
    if (!isClientVisit && ex.latitude && ex.longitude && leafletMapRef.current) {
      leafletMapRef.current.flyTo([ex.latitude, ex.longitude], 16)
    } else if (!ex.latitude || !ex.longitude) {
      showToast(`${ex.employee_name} has no available location logs yet.`, 'warning')
    }
    // Load tracking history & subscribe Realtime
    if (mapLoaded) _loadTrackingHistory(ex)
  }

  // Re-load tracking layer if map loads after executive is already selected
  useEffect(() => {
    if (mapLoaded && selectedExecutive && !trackSession && trackStatus === 'idle') {
      _loadTrackingHistory(selectedExecutive)
    }
  }, [mapLoaded])

  const filteredExecutives = executives.filter(ex =>
    ex.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusInfo = (ex) => {
    if (!ex.is_online) {
      if (ex.check_in_time && ex.check_out_time) {
        return { label: 'STOPPED', color: '#64748b', bg: 'rgba(100,116,139,0.15)', dot: '⚫' }
      }
      return { label: 'OFFLINE', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', dot: '⚫' }
    }
    
    if (ex.last_seen_at) {
      const age = Date.now() - new Date(ex.last_seen_at).getTime()
      if (age > STALE_MS) {
        return { label: 'STALE', color: '#f97316', bg: 'rgba(249,115,22,0.15)', dot: '🟠' }
      }
    }
    return { label: 'LIVE', color: '#10b981', bg: 'rgba(16,185,129,0.15)', dot: '🟢' }
  }

  const badge = getTrackingBadge(trackStatus === 'ended' ? 'ended' : trackStatus, lastPingMs)

  // ─── 8. Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-950 text-white font-sans">
      {panelOpen && (
        <div onClick={() => setPanelOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-20 lg:hidden transition-opacity" />
      )}

      {/* ─── Sidebar Panel ─────────────────────────────────────────────── */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-[20rem] sm:w-[24rem] lg:w-[24rem] h-full flex flex-col border-r border-white/10 bg-slate-900/98 backdrop-blur-md shrink-0 transition-transform duration-200 ${
        panelOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
      }`}>

        {/* Header & Search */}
        <div className="p-5 border-b border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100">Live Team Radar</h1>
                <p className="text-[10px] font-bold text-slate-400">TwiteConnect Smart Map</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={fetchData} disabled={loading}
                className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 active:scale-95 transition disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setPanelOpen(false)} className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 lg:hidden">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search executive..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-xs font-bold text-slate-100 bg-slate-950/70 border border-white/10 rounded-xl outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 placeholder:text-slate-500" />
          </div>
        </div>

        {/* Live tracking info panel in sidebar (visible when executive selected) */}
        {selectedExecutive && trackStatus !== 'idle' && (
          <div className="mx-4 mt-4 p-4 rounded-xl border border-white/10 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Tracking</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ background: badge.color + '22', color: badge.color }}>
                  {badge.dot} {badge.label}
                </span>
                <button onClick={() => {
                  _clearTrackingLayer()
                  setSelectedExecutive(null)
                  initialFitBoundsDoneRef.current = false
                }} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition active:scale-95">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {trackStatus === 'loading' ? (
              <div className="text-[10px] text-slate-400 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading route...</div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-violet-600/10 text-violet-400 font-extrabold text-[11px] flex items-center justify-center">
                    {selectedExecutive.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-200">{selectedExecutive.employee_name}</div>
                    <div className="text-[9px] font-bold text-slate-500">{selectedExecutive.role}</div>
                  </div>
                </div>

                {destClient ? (
                  <div className="bg-slate-900/40 rounded-xl p-2.5 border border-white/5 space-y-1.5">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">🏍️ Moving to Client</div>
                    <div className="text-xs font-black text-slate-200 truncate">📍 {destClient.title}</div>
                    <div className="text-[10px] text-slate-500 font-semibold truncate">{destClient.address}</div>
                    <div className="text-[9px] text-slate-400 font-mono mt-1">
                      Coordinates: {destClient.latitude.toFixed(5)}, {destClient.longitude.toFixed(5)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/20 rounded-xl p-2.5 border border-dashed border-white/5 text-[10px] font-bold text-slate-500">
                    🏢 Checked in at Office / No Active Client Destination
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-slate-900/60 rounded-lg p-2">
                    <div className="text-slate-500 font-bold">Last Update</div>
                    <div className="text-slate-200 font-black mt-0.5">
                      {lastPingMs ? formatLastSeen(new Date(lastPingMs).toISOString()) : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2">
                    <div className="text-slate-500 font-bold">Duration</div>
                    <div className="text-slate-200 font-black mt-0.5">
                      {trackSession?.start_time ? formatDuration(trackSession.start_time) : '—'}
                    </div>
                  </div>
                </div>

                {!realtimeOk && supabase && (
                  <div className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Connecting to Supabase Realtime...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Executive List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">Team List</h2>
          {filteredExecutives.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-500">No Sales Executives found.</div>
          ) : (
            filteredExecutives.map(ex => {
              const hasLoc   = ex.latitude != null
              const isSelected = selectedExecutive?.employee_id === ex.employee_id
              const statusInfo = getStatusInfo(ex)
              const initials = ex.employee_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
              
              return (
                <div key={ex.employee_id} onClick={() => handleSelectExecutive(ex)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition active:scale-[0.99] flex flex-col gap-2.5 ${
                    isSelected ? 'bg-violet-600/15 border-violet-500/40' : 'bg-slate-950/45 border-white/5 hover:border-white/10'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 font-extrabold text-[11px] text-slate-300 flex items-center justify-center">
                        {initials}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-200">{ex.employee_name}</div>
                        <div className="text-[10px] font-bold text-slate-500">{ex.role}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                      <span>{statusInfo.dot}</span> {statusInfo.label}
                    </span>
                  </div>

                  {ex.is_online ? (
                    <div className="text-[10px] space-y-1 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                      {ex.check_in_mode === 'Client Visit' ? (
                        <>
                          <div className="font-bold text-slate-300 flex items-center gap-1">
                            <span>🏍️</span> Moving to Client
                          </div>
                          {ex.client_name && (
                            <div className="text-slate-400 font-semibold truncate">
                              📍 {ex.client_name}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="font-bold text-slate-300 flex items-center gap-1">
                          <span>🏢</span> Checked in at Office
                        </div>
                      )}
                      <div className="text-[9px] text-slate-500 font-bold">
                        🕐 Updated {formatLastSeen(ex.last_seen_at)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-900/20 p-2 rounded-lg border border-dashed border-white/5">
                      {ex.check_out_time ? (
                        <div>⚫ Clocked out at {ex.check_out_time}</div>
                      ) : (
                        <div>⚫ Last seen: {formatLastSeen(ex.last_seen_at)}</div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 border-t border-white/5 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{ex.check_in_time ? `Clock in: ${ex.check_in_time}` : 'Not clocked in'}</span>
                    </div>
                    {hasLoc ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Compass className="w-3 h-3" />
                        <span>{ex.accuracy ? `${ex.accuracy.toFixed(0)}m acc` : 'GPS Connected'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-500">
                        <AlertCircle className="w-3 h-3" /><span>No GPS</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/20 text-[11px] font-bold text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="auto-refresh" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20 bg-slate-900 text-violet-600 focus:ring-0 w-3.5 h-3.5" />
            <label htmlFor="auto-refresh" className="cursor-pointer select-none">Auto Update (10s)</label>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Last sync:</span>
            <span className="font-mono text-slate-300">{lastUpdated || 'Never'}</span>
          </div>
        </div>
      </div>

      {/* ─── Main Map Area ──────────────────────────────────────────────── */}
      <div className="flex-1 h-full relative">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Compact Zomato/Swiggy-style Floating Live Tracking Card */}
        {selectedExecutive && trackStatus !== 'idle' && trackStatus !== 'loading' && destClient && (
          <div className="absolute top-5 left-5 z-20 w-80 bg-slate-900/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white pointer-events-auto flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> LIVE TRACKING
              </span>
              <button onClick={() => {
                _clearTrackingLayer()
                setSelectedExecutive(null)
                initialFitBoundsDoneRef.current = false
              }} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <h3 className="text-sm font-black text-slate-100">{selectedExecutive.employee_name}</h3>
              <p className="text-[10px] font-bold text-slate-400">{selectedExecutive.role}</p>
            </div>
            
            <div className="border-t border-white/5 pt-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Moving to Client</div>
                  <div className="text-xs font-black text-slate-200 truncate">{destClient.title}</div>
                  <div className="text-[10px] text-slate-400 font-semibold truncate">{destClient.address}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1">
                    Coordinates: {destClient.latitude.toFixed(5)}, {destClient.longitude.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>

            {trackStatus === 'ended' ? (
              <div className="text-center py-2.5 text-[10px] text-slate-400 font-extrabold border-t border-white/5 bg-slate-950/20 rounded-xl">
                ⚫ Trip completed / Session ended
              </div>
            ) : destRouteMeta ? (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Remaining Distance</div>
                  <div className="text-sm font-black text-violet-400 mt-0.5">{destRouteMeta.distanceKm.toFixed(1)} km</div>
                </div>
                <div className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Est. Time of Arrival</div>
                  <div className="text-sm font-black text-violet-400 mt-0.5">{destRouteMeta.etaMins} mins</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-[10px] text-rose-500 font-black border-t border-white/5">
                ⚠️ Route unavailable (Road network path not resolved)
              </div>
            )}
            
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 font-bold">
              <span>Last updated: {lastPingMs ? formatLastSeen(new Date(lastPingMs).toISOString()) : 'Just now'}</span>
              <span>{trackSession?.total_distance ? `${(trackSession.total_distance / 1000).toFixed(2)} km total` : ''}</span>
            </div>
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="absolute top-5 left-5 right-5 flex flex-wrap gap-4 items-center justify-end z-10 pointer-events-none">
          <div className="bg-slate-900/90 border border-white/10 rounded-xl shadow-xl backdrop-blur-md p-2 px-4 flex items-center gap-5 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500">Total</span>
              <span className="text-sm font-black text-slate-100">{stats.total}</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase text-slate-500">Online</span>
              <span className="text-sm font-black text-emerald-400">{stats.online}</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-[10px] font-black uppercase text-slate-500">Offline</span>
              <span className="text-sm font-black text-slate-400">{stats.offline}</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
              <span className="text-xs font-black text-slate-200">Updating live locations...</span>
            </div>
          </div>
        )}

        {!panelOpen && (
          <button type="button" onClick={() => setPanelOpen(true)}
            className="absolute bottom-5 left-5 z-20 h-10 px-4 rounded-xl bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white flex items-center gap-2 pointer-events-auto backdrop-blur-md shadow-xl transition active:scale-95 lg:hidden animate-in fade-in duration-200">
            <Users size={16} className="text-violet-400" />
            <span className="text-xs font-black">Show Team</span>
          </button>
        )}

        {selectedExecutive && trackStatus !== 'idle' && trackStatus !== 'loading' && (
          <div className="absolute bottom-5 right-5 z-20 bg-slate-900/90 border border-white/10 rounded-xl p-3 text-[10px] font-bold space-y-1.5 backdrop-blur-md">
            <div className="flex items-center gap-2"><div className="w-6 h-1.5 bg-blue-500 rounded flex-shrink-0 border-t border-dashed border-white" style={{ borderStyle: 'dashed' }} /> Driving Route</div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white font-extrabold border border-white"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span> Client destination</div>
          </div>
        )}
      </div>
    </div>
  )
}
