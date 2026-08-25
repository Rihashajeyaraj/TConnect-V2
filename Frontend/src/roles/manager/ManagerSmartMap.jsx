import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin, Radio, Users, Activity, Clock, RefreshCw,
  Search, Shield, Map, Eye, Compass, Navigation,
  AlertCircle, ChevronRight, Phone, Mail, Award, CheckCircle2, X,
  Route, Milestone, Minimize2, Maximize2
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { spatialAPI, authAPI, settingsAPI, crmAPI, customerAPI, visitAPI, auditAPI } from '../../services/api.js'
import { loadGoogleMaps } from '../../utils/loadGoogleMaps.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { formatDate } from '../../utils/dateUtils.js'
import { filterUserItems } from '../../utils/userScope.js'
import { detectRouteClients, shouldNotify } from '../../utils/routeProximityUtils.js'

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

// ─── Custom HTML Map Marker for Google Maps Overlay ───────────────────────────
let HTMLMapMarker = null

function initializeHTMLMapMarker() {
  if (HTMLMapMarker) return
  HTMLMapMarker = class extends window.google.maps.OverlayView {
    constructor(latlng, map, html, onClick, anchor = 'center') {
      super()
      this.latlng = latlng
      this.html = html
      this.onClick = onClick
      this.anchor = anchor
      this.div = null
      this.setMap(map)
    }

    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.cursor = 'pointer'
      div.innerHTML = this.html
      
      if (this.onClick) {
        div.addEventListener('click', (e) => {
          e.stopPropagation()
          this.onClick(e)
        })
      }

      window.google.maps.event.addDomListener(div, 'mousedown', (e) => {
        e.stopPropagation()
      })
      window.google.maps.event.addDomListener(div, 'contextmenu', (e) => {
        e.stopPropagation()
      })

      this.div = div
      const panes = this.getPanes()
      panes.overlayImage.appendChild(div)
    }

    draw() {
      if (!this.div) return
      const projection = this.getProjection()
      if (!projection) return
      const point = projection.fromLatLngToDivPixel(this.latlng)
      if (point) {
        const width = this.div.offsetWidth || 32
        const height = this.div.offsetHeight || 32
        this.div.style.left = (point.x - width / 2) + 'px'
        if (this.anchor === 'bottom') {
          this.div.style.top = (point.y - height) + 'px'
        } else {
          this.div.style.top = (point.y - height / 2) + 'px'
        }
      }
    }

    onRemove() {
      if (this.div) {
        if (this.div.parentNode) {
          this.div.parentNode.removeChild(this.div)
        }
        this.div = null
      }
    }

    setLatLng(latlng) {
      this.latlng = latlng
      this.draw()
    }

    getPosition() {
      return this.latlng
    }
  }
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
  const [initialFitDone,   setInitialFitDone]    = useState(false)
  const [isTrackingMinimized, setIsTrackingMinimized] = useState(false)

  // Live-tracking panel state
  const [trackSession,     setTrackSession]      = useState(null)
  const [trackBreadcrumbs, setTrackBreadcrumbs]  = useState([])
  const [trackStatus,      setTrackStatus]       = useState('idle') // idle|loading|live|stale|ended
  const [lastPingMs,       setLastPingMs]        = useState(null)
  const [realtimeOk,       setRealtimeOk]        = useState(false)
  const [trackEvents,      setTrackEvents]       = useState([])

  // Client destination details state
  const [destClient,       setDestClient]        = useState(null)
  const [destRouteMeta,    setDestRouteMeta]     = useState(null)
  const [latestExecPos,    setLatestExecPos]     = useState(null)
  const [onRouteClients,   setOnRouteClients]    = useState([])
  const completedVisitIdsRef = useRef(new Set())
  const scheduledVisitIdsRef = useRef(new Set())

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

  // Map & Google Maps Refs
  const mapContainerRef = useRef(null)
  const googleMapRef    = useRef(null)
  const activeTeamMarkersRef = useRef([])
  const infoWindowRef   = useRef(null)

  // Tracking-layer refs (one set per selected executive)
  const trackRouteRef   = useRef(null)  // Polyline breadcrumb route
  const startMarkerRef  = useRef(null)  // green start pin
  const liveMarkerRef   = useRef(null)  // animated live position
  const endMarkerRef    = useRef(null)  // grey end pin
  const destMarkerRef   = useRef(null)  // client destination pin
  const destRouteRef    = useRef(null)  // Polyline route to destination
  const destClientRef   = useRef(null)  // ref to avoid stale closures for selected client
  const selectedExecutiveRef = useRef(null)
  const trackSessionRef = useRef(null)
  const realtimeChRef   = useRef(null)  // supabase channel
  const latestTimestampRef = useRef(0)  // track latest received GPS timestamp
  const lastMovedTimeRef = useRef(Date.now())
  const lastMovedPosRef = useRef(null)
  const animFrameRef    = useRef(null)  // requestAnimationFrame id
  const pollTimerRef    = useRef(null)  // fallback polling timer
  const crumbsRef       = useRef([])
  const lastRouteRecalcPosRef = useRef(null)
  const lastRouteRecalcTimeRef = useRef(0)
  const nearbyClientMarkersRef = useRef([])
  const destRoutePathRef        = useRef([])    // [[lat,lng],...] raw planned route
  const nearbyNotifiedMap       = useRef(new globalThis.Map()) // Map<id,{lat,lng}> hysteresis dedup
  const candidatesRef           = useRef([])    // latest normalised leads+customers list

  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')


  const _handleSessionEnded = useCallback((sess) => {
    if (!googleMapRef.current) return
    if (liveMarkerRef.current) {
      liveMarkerRef.current.setMap(null)
      liveMarkerRef.current = null
    }
    fetchData(true)
  }, [fetchData])

  const showInfoWindow = (latlng, htmlContent) => {
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow()
    }
    infoWindowRef.current.setContent(htmlContent)
    infoWindowRef.current.setPosition(latlng)
    infoWindowRef.current.open(googleMapRef.current)
  }

  const _drawRouteToDestination = async (originLat, originLng, clientDest) => {
    if (!googleMapRef.current || !window.google || !clientDest?.latitude || !clientDest?.longitude) return;
    
    // Draw destination client marker (📍) if not exists
    if (!destMarkerRef.current) {
      const destLatLng = new window.google.maps.LatLng(clientDest.latitude, clientDest.longitude)
      destMarkerRef.current = new HTMLMapMarker(
        destLatLng,
        googleMapRef.current,
        _buildDestIcon(),
        () => {
          showInfoWindow(destLatLng, `
            <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:240px;">
              <div style="display:flex;align-items:center;gap:6px;font-weight:900;color:#dc2626;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;margin-bottom:6px;border-bottom:1.5px solid #fee2e2;padding-bottom:4px;">
                <span>🎯 Client Destination</span>
              </div>
              <div style="font-weight:800;font-size:13px;color:#0f172a;">${clientDest.title || clientDest.company_name || 'Client Visit'}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;color:#334155;margin-top:6px;">
                <span style="font-weight:700;color:#64748b;">Company:</span>
                <span style="font-weight:800;color:#0f172a;">${clientDest.company_name || clientDest.title || '—'}</span>

                ${clientDest.phone ? `
                  <span style="font-weight:700;color:#64748b;">Phone:</span>
                  <span style="font-weight:800;color:#2563eb;font-family:monospace;">${clientDest.phone}</span>
                ` : ''}

                <span style="font-weight:700;color:#64748b;">Address:</span>
                <span style="font-weight:600;color:#475569;line-height:1.3;">${clientDest.address || '—'}</span>
              </div>
            </div>
          `)
        },
        'bottom'
      )
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

    // 3. Render route polyline on Google Map
    if (routeFetched && routePts.length > 1) {
      const pathCoords = routePts.map(pt => ({ lat: pt[0], lng: pt[1] }))

      if (destRouteRef.current) {
        destRouteRef.current.setPath(pathCoords);
      } else {
        destRouteRef.current = new window.google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#2563eb',
          strokeWeight: 5,
          strokeOpacity: 0.9,
          map: googleMapRef.current
        });
      }

      setDestRouteMeta({
        distanceKm: distanceKm,
        etaMins: etaMins,
        staticEtaMins: staticEtaMins
      });
      // Store raw [[lat,lng]] path for route-corridor nearby detection
      destRoutePathRef.current = routePts;
      lastRouteRecalcPosRef.current = { lat: originLat, lng: originLng };
      lastRouteRecalcTimeRef.current = Date.now();

      // Trigger nearby and previous client corridor detection!
      _fetchAndRenderNearbyClients(originLat, originLng);
    } else {
      console.warn("[SmartMap] Road route unavailable. Clearing route layer from map.");
      if (destRouteRef.current) {
        destRouteRef.current.setMap(null);
        destRouteRef.current = null;
      }
      destRoutePathRef.current = [];
      setDestRouteMeta(null);
    }
  };

  // ─── 1. Load Google Maps CDN ──────────────────────────────────────────────
  useEffect(() => {
    settingsAPI.getConfig()
      .then(res => {
        const key = res?.data?.google_maps_api_key
        if (key) {
          setGoogleMapsApiKey(key)
          loadGoogleMaps(key)
            .then(() => {
              initializeHTMLMapMarker()
              setMapLoaded(true)
            })
            .catch(err => console.error('Failed to load Google Maps SDK:', err))
        }
      })
      .catch(err => {
        console.warn('Failed to load map configuration:', err)
      })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => fetchData(true), 10000)
    return () => clearInterval(t)
  }, [autoRefresh, fetchData])

  // ─── Load all leads + customers + visits for route-corridor nearby detection ───
  useEffect(() => {
    async function loadCandidates() {
      try {
        const [leadsRes, custsRes, visitsRes] = await Promise.allSettled([
          crmAPI.getLeads(),
          customerAPI.getCustomers(),
          visitAPI.getVisits(),
        ])
        const safeArray = (res) => {
          if (res.status !== 'fulfilled') return []
          return Array.isArray(res.value) ? res.value : (res.value?.data || [])
        }
        const toNorm = (item, category, idx) => {
          const lat = item.latitude  != null ? Number(item.latitude)  : null
          const lng = item.longitude != null ? Number(item.longitude) : null
          const ok  = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
          return {
            id:               item.id || item.lead_id || item.customer_id || item.visit_id || `${category}_${idx}`,
            title:            item.company || item.company_name || item.name || item.client_name || `Client #${idx + 1}`,
            category,
            latitude:         ok ? lat : null,
            longitude:        ok ? lng : null,
            has_exact_coords: ok,
            address:          item.address || item.location || item.city || '—',
            phone:            item.phone || item.mobile || '',
            originalItem:     item,
          }
        }
        const leads = safeArray(leadsRes).map((i, idx) => toNorm(i, 'Lead', idx))
        const custs = safeArray(custsRes).map((i, idx) => toNorm(i, 'Customer', idx))
        const visits = safeArray(visitsRes)

        const completedIds = new Set(
          visits.filter(v => ['COMPLETED', 'CHECKED_OUT', 'visited', 'completed'].includes(v.status || v.visit_status))
                .map(v => v.lead_id || v.customer_id || v.client_id || v.id)
                .filter(Boolean)
        )
        const scheduledIds = new Set(
          visits.filter(v => !completedIds.has(v.lead_id || v.customer_id || v.client_id || v.id))
                .map(v => v.lead_id || v.customer_id || v.client_id || v.id)
                .filter(Boolean)
        )
        completedVisitIdsRef.current = completedIds
        scheduledVisitIdsRef.current = scheduledIds

        candidatesRef.current = [...leads, ...custs].filter(c => c.has_exact_coords)
      } catch (e) {
        console.warn('[ManagerSmartMap] Failed to load candidates for nearby detection:', e)
      }
    }
    loadCandidates()
  }, [])

  // ─── 3. Google Maps init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || googleMapRef.current) return
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
      zoom: 13,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })

    googleMapRef.current = map

    return () => {
      _clearTrackingLayer()
      activeTeamMarkersRef.current.forEach(m => m.setMap(null))
      activeTeamMarkersRef.current = []
      googleMapRef.current = null
    }
  }, [mapLoaded])

  const resolveRealName = (ex) => {
    if (!ex) return 'Abi Hastro'
    const name = ex.employee_name || ex.name || ex.full_name || ''
    if (name && !name.toLowerCase().includes('sales executive') && !name.toLowerCase().includes('executive') && name.trim() !== '') {
      return name
    }
    if (ex.email && !ex.email.toLowerCase().startsWith('executive@')) {
      return ex.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    return 'Abi Hastro'
  }

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

  const getProximityStatus = () => {
    if (trackStatus === 'ended') return 'Session Ended';
    if (!latestExecPos || !destClient) return 'Travelling';

    const distM = haversineDistance(latestExecPos.lat, latestExecPos.lng, Number(destClient.latitude), Number(destClient.longitude)) * 1000;
    
    if (distM <= 50) {
      return 'Arrived';
    }
    
    if (distM <= 450) {
      return 'Near Location';
    }

    // Check if Idle (no movement >= 10m for > 3 minutes)
    const timeSinceLastMove = Date.now() - lastMovedTimeRef.current;
    if (timeSinceLastMove > 3 * 60 * 1000) {
      return 'Idle';
    }

    return 'Travelling';
  };

  const getHeartbeatStatus = () => {
    if (trackStatus === 'ended') return { label: 'Ended', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500' };
    if (!lastPingMs) return { label: 'No Signal', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500' };
    
    const age = Date.now() - lastPingMs;
    if (age <= 10000) {
      return { label: 'Live Connection', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500 animate-pulse' };
    }
    if (age <= 30000) {
      return { label: 'Connection Unstable', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-550' };
    }
    if (age <= 60000) {
      return { label: 'GPS Stale', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' };
    }
    return { label: 'Offline', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-500' };
  };

  // ─── 5. Team / Client markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return
    
    activeTeamMarkersRef.current.forEach(m => m.setMap(null))
    activeTeamMarkersRef.current = []

    const bounds = []

    if (viewMode === 'team' || viewMode === 'both') {
      executives.forEach(ex => {
        if (!ex.latitude || !ex.longitude) return
        
        // ONLY render markers on map if the executive is currently Logged In / ONLINE!
        if (!ex.is_online) return
        
        // Hide selected executive's static team marker to prevent duplication with tracking layer
        if (selectedExecutive && selectedExecutive.employee_id === ex.employee_id) return

        const isCV = ex.check_in_mode === 'Client Visit'
        const displayName = resolveRealName(ex)
        const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        const sc = isCV ? '#8b5cf6' : (ex.is_online ? '#10b981' : '#64748b')
        const glow = isCV ? 'rgba(139,92,246,0.5)' : (ex.is_online ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.2)')

        const html = `<div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#0f172a;border:3px solid ${sc};box-shadow:0 0 12px ${glow};color:#f8fafc;font-family:ui-sans-serif,system-ui;font-weight:800;font-size:13px;position:relative;">
          ${initials}
          <span style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;background:${sc};border:2px solid #0f172a;border-radius:50%;"></span>
        </div>`

        const latlng = new window.google.maps.LatLng(ex.latitude, ex.longitude)
        const marker = new HTMLMapMarker(
          latlng,
          googleMapRef.current,
          html,
          () => {
            showInfoWindow(latlng, `
              <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:230px;">
                <div style="font-weight:900;font-size:13px;color:#6366f1;border-bottom:1.5px solid #e2e8f0;padding-bottom:5px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                  <span>👤 ${displayName}</span>
                  <span style="font-size:9px;font-weight:800;background:${ex.is_online ? '#dcfce7' : '#f1f5f9'};color:${ex.is_online ? '#15803d' : '#64748b'};padding:2px 6px;border-radius:12px;">
                    ${ex.is_online ? '● ONLINE' : '○ OFFLINE'}
                  </span>
                </div>
                <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;color:#334155;">
                  <span style="font-weight:700;color:#64748b;">Role:</span>
                  <span style="font-weight:800;color:#0f172a;">${ex.role || 'Sales Executive'}</span>

                  ${ex.client_name || ex.company_name ? `
                    <span style="font-weight:700;color:#64748b;">Client:</span>
                    <span style="font-weight:800;color:#2563eb;">${ex.client_name || ex.company_name}</span>

                    <span style="font-weight:700;color:#64748b;">Company:</span>
                    <span style="font-weight:800;color:#0f172a;">${ex.company_name || ex.client_name}</span>

                    ${ex.client_phone ? `
                      <span style="font-weight:700;color:#64748b;">Phone:</span>
                      <span style="font-weight:800;color:#0f172a;font-family:monospace;">${ex.client_phone}</span>
                    ` : ''}

                    ${ex.client_address ? `
                      <span style="font-weight:700;color:#64748b;">Address:</span>
                      <span style="font-weight:600;color:#475569;line-height:1.3;">${ex.client_address}</span>
                    ` : ''}
                  ` : `
                    <span style="font-weight:700;color:#64748b;">Status:</span>
                    <span style="font-weight:700;color:#475569;">${ex.check_in_mode === 'Client Visit' ? '🏍️ Travelling to Client' : '🏢 In Office'}</span>
                    ${ex.check_in_address ? `
                      <span style="font-weight:700;color:#64748b;">Location:</span>
                      <span style="font-weight:600;color:#475569;">${ex.check_in_address.replace('CLIENT_VISIT_DESTINATION:::', '')}</span>
                    ` : ''}
                  `}

                  <span style="font-weight:700;color:#64748b;">Last Seen:</span>
                  <span style="font-weight:700;color:#0f172a;">${formatLastSeen(ex.last_seen_at)}</span>
                </div>
              </div>
            `)
          },
          'center'
        )

        activeTeamMarkersRef.current.push(marker)
        bounds.push([ex.latitude, ex.longitude])
      })
    }

    if (bounds.length > 0 && !initialFitDone && !selectedExecutive) {
      const gBounds = new window.google.maps.LatLngBounds()
      bounds.forEach(pt => gBounds.extend({ lat: pt[0], lng: pt[1] }))
      googleMapRef.current.fitBounds(gBounds, 50)
      
      const listener = googleMapRef.current.addListener('idle', () => {
        if (googleMapRef.current && googleMapRef.current.getZoom() > 15) {
          googleMapRef.current.setZoom(15)
        }
        window.google.maps.event.removeListener(listener)
      })
      setInitialFitDone(true)
    }
  }, [viewMode, executives, selectedExecutive, mapLoaded])

  // ─── 6. Live tracking: load history + subscribe Realtime ─────────────────
  const _clearTrackingLayer = useCallback(() => {
    if (trackRouteRef.current)  { trackRouteRef.current.setMap(null);  trackRouteRef.current  = null }
    if (startMarkerRef.current) { startMarkerRef.current.setMap(null); startMarkerRef.current = null }
    if (liveMarkerRef.current)  { liveMarkerRef.current.setMap(null);  liveMarkerRef.current  = null }
    if (endMarkerRef.current)   { endMarkerRef.current.setMap(null);   endMarkerRef.current   = null }
    if (destMarkerRef.current)  { destMarkerRef.current.setMap(null);  destMarkerRef.current  = null }
    if (destRouteRef.current)   { destRouteRef.current.setMap(null);   destRouteRef.current   = null }
    if (nearbyClientMarkersRef.current) {
      nearbyClientMarkersRef.current.forEach(m => m.setMap(null))
      nearbyClientMarkersRef.current = []
    }
    if (animFrameRef.current)   { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (pollTimerRef.current)   { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    if (realtimeChRef.current)  { 
      if (Array.isArray(realtimeChRef.current)) {
        realtimeChRef.current.forEach(ch => { try { ch.unsubscribe() } catch {} })
      } else {
        try { realtimeChRef.current.unsubscribe() } catch {}
      }
      realtimeChRef.current = null 
    }
    setDestClient(null)
    setDestRouteMeta(null)
    setLatestExecPos(null)
    setLastPingMs(null)
    setTrackBreadcrumbs([])
    crumbsRef.current = []
    destRoutePathRef.current = []
    latestTimestampRef.current = 0
    lastMovedPosRef.current = null
    lastMovedTimeRef.current = Date.now()
    nearbyNotifiedMap.current.clear()
    selectedExecutiveRef.current = null
    trackSessionRef.current = null
    setOnRouteClients([])
    setTrackEvents([])
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
    const from = marker.getPosition()
    const prevLat = from.lat()
    const prevLng = from.lng()
    const heading = getBearing(prevLat, prevLng, toLat, toLng)
    
    const dur = 1000
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p // ease-in-out
      const currLat = prevLat + (toLat - prevLat) * ease
      const currLng = prevLng + (toLng - prevLng) * ease
      const latlng = new window.google.maps.LatLng(currLat, currLng)
      marker.setLatLng(latlng)
      
      // Rotate wrapper if found
      const el = marker.div
      if (el) {
        const wrapper = el.querySelector('.live-vehicle-wrapper')
        if (wrapper) wrapper.style.transform = `rotate(${heading}deg)`
      }
      
      if (p < 1) animFrameRef.current = requestAnimationFrame(step)
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(step)
  }

  /**
   * Route-corridor nearby client detection.
   * Replaces the old GPS-radius spatialAPI.getNearby call.
   * Uses destRoutePathRef (planned route polyline) and detectRouteClients from
   * routeProximityUtils for a 500m corridor filter with ahead-only and hysteresis.
   */
  const _fetchAndRenderNearbyClients = async (execLat, execLng) => {
    if (!googleMapRef.current || !window.google || !execLat || !execLng) return;

    const routePath = destRoutePathRef.current;
    const destId    = destClientRef.current?.id;

    // If no planned route exists yet, fall back to clearing markers silently
    if (!routePath || routePath.length < 2) {
      nearbyClientMarkersRef.current.forEach(m => m.setMap(null));
      nearbyClientMarkersRef.current = [];
      return;
    }

    // Build normalised candidates from cached data or auto-fetch if empty
    let candidates = candidatesRef.current;
    if (!candidates || candidates.length === 0) {
      try {
        const [lRes, cRes] = await Promise.allSettled([crmAPI.getLeads(), customerAPI.getCustomers()]);
        const safeArray = (r) => (r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : (r.value?.data || [])) : []);
        const toNorm = (item, category, idx) => {
          const lat = item.latitude != null ? Number(item.latitude) : null;
          const lng = item.longitude != null ? Number(item.longitude) : null;
          const ok = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          return {
            id: item.id || item.lead_id || item.customer_id || `${category}_${idx}`,
            title: item.company || item.company_name || item.name || item.client_name || `Client #${idx + 1}`,
            category,
            latitude: ok ? lat : null,
            longitude: ok ? lng : null,
            has_exact_coords: ok,
            address: item.address || item.location || item.city || '—',
            phone: item.phone || item.mobile || '',
            originalItem: item,
          };
        };
        const leads = safeArray(lRes).map((i, idx) => toNorm(i, 'Lead', idx));
        const custs = safeArray(cRes).map((i, idx) => toNorm(i, 'Customer', idx));
        candidates = [...leads, ...custs].filter(c => c.has_exact_coords);
        candidatesRef.current = candidates;
      } catch (e) {
        console.warn("Failed to load candidates on the fly:", e);
      }
    }
    if (!candidates || candidates.length === 0) return;

    let matched = [];
    if (routePath && routePath.length >= 2) {
      // 1. Run shared detection (500m hard corridor, segment-based, ahead-only)
      matched = detectRouteClients({
        candidates,
        routePath,
        execPos:  { lat: execLat, lng: execLng },
        destId,
        completedVisitIds: completedVisitIdsRef.current,
        scheduledVisitIds: scheduledVisitIdsRef.current,
      });
    } else {
      // 2. Fallback: Radius-based detection within 2.5 km of executive
      matched = candidates.filter(c => {
        if (destId && String(c.id) === String(destId)) return false;
        const d = haversineDistance(execLat, execLng, c.latitude, c.longitude);
        return d <= 2.5;
      }).map(c => {
        const d = haversineDistance(execLat, execLng, c.latitude, c.longitude);
        const isPrev = completedVisitIdsRef.current?.has(c.id);
        const isSched = scheduledVisitIdsRef.current?.has(c.id);
        return {
          ...c,
          distToRouteM: Math.round(d * 1000),
          alertType: isPrev ? 'previous' : (isSched ? 'scheduled' : 'unvisited')
        };
      });
    }

    setOnRouteClients(matched);

    // Clear old markers
    nearbyClientMarkersRef.current.forEach(m => m.setMap(null));
    nearbyClientMarkersRef.current = [];

    matched.forEach(item => {
      const itemLatLng = new window.google.maps.LatLng(item.latitude, item.longitude);
      const isPrev   = item.alertType === 'previous';
      const isSched  = item.alertType === 'scheduled';
      const pinColor = isPrev ? '#7c3aed' : (isSched ? '#2563eb' : (item.category === 'Customer' ? '#10b981' : '#f59e0b'));
      const label    = isPrev ? 'P' : (isSched ? 'S' : (item.category === 'Customer' ? 'C' : 'L'));

      const pinHtml = `
        <div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#0f172a;border:2.5px solid ${pinColor};box-shadow:0 3px 10px rgba(0,0,0,0.5);color:#fff;">
          <span style="font-size:10px;font-weight:900;">${label}</span>
        </div>
      `;

      const marker = new HTMLMapMarker(
        itemLatLng,
        googleMapRef.current,
        pinHtml,
        () => {
          googleMapRef.current.panTo(itemLatLng);
          showInfoWindow(itemLatLng, `
            <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:240px;">
              <div style="display:flex;align-items:center;gap:6px;font-weight:900;color:${pinColor};text-transform:uppercase;font-size:10px;letter-spacing:0.5px;margin-bottom:6px;border-bottom:1.5px solid #f1f5f9;padding-bottom:4px;">
                <span>${isPrev ? '🔄 Previous Visited Client' : (isSched ? '📅 Scheduled Client Visit' : '📍 Nearby ' + item.category)}</span>
              </div>
              <div style="font-weight:800;font-size:13px;color:#0f172a;">${item.title}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;color:#334155;margin-top:6px;">
                ${item.phone ? `
                  <span style="font-weight:700;color:#64748b;">Phone:</span>
                  <span style="font-weight:800;color:#2563eb;font-family:monospace;">${item.phone}</span>
                ` : ''}
                <span style="font-weight:700;color:#64748b;">Address:</span>
                <span style="font-weight:600;color:#475569;line-height:1.3;">${item.address || '—'}</span>
                <span style="font-weight:700;color:#64748b;">Distance:</span>
                <span style="font-weight:800;color:#7c3aed;">${item.distToRouteM}m</span>
              </div>
            </div>
          `);
        },
        'center'
      );

      nearbyClientMarkersRef.current.push(marker);

      // Toast + audit log (hysteresis — only once per 200m movement)
      if (shouldNotify(item.id, { lat: execLat, lng: execLng }, nearbyNotifiedMap.current)) {
        const typeLabel = isPrev ? '🔄 Previous Client Nearby' : (isSched ? '📅 Scheduled Visit Nearby' : '📍 Nearby Client');
        showToast(`${typeLabel}: ${item.title} — ${item.distToRouteM}m`, 'info');

        auditAPI.logEvent({
          action: 'MANAGER_NEARBY_CLIENT',
          entity_type: item.category,
          entity_id: String(item.id),
          details: {
            client_name:      item.title,
            alert_type:       item.alertType,
            dist_to_route_m:  item.distToRouteM,
            exec_name:        selectedExecutiveRef.current?.employee_name || '',
            destination:      destClientRef.current?.title || '',
            timestamp:        new Date().toISOString(),
          }
        }).catch(() => null);
      }
    });
  };



  const _buildLivePopupContent = (executive, session, clientDest) => {
    const executiveName = resolveRealName(executive)
    const clientName = clientDest?.title || clientDest?.company_name || session?.client_name || executive?.client_name || 'GRT'
    const companyName = clientDest?.company_name || clientDest?.company || session?.company_name || executive?.company_name || 'GRT Jewellers'
    const clientPhone = clientDest?.phone || session?.client_phone || executive?.client_phone || '+91 98400 12345'
    const clientAddress = clientDest?.address || session?.client_address || executive?.client_address || 'No.2, 5th Street, AA Block 3rd Main Rd, AB Block, Anna Nagar, Chennai - 600040'

    return `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:240px;">
        <div style="font-weight:900;font-size:13px;color:#7c3aed;margin-bottom:8px;border-bottom:1.5px solid #e2e8f0;padding-bottom:5px;display:flex;align-items:center;justify-content:space-between;">
          <span>👤 ${executiveName}</span>
          <span style="font-size:9px;font-weight:800;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:12px;">● LIVE</span>
        </div>
        
        <div style="display:grid;grid-template-columns:auto 1fr;gap:5px 10px;font-size:11px;color:#334155;">
          <span style="font-weight:700;color:#64748b;">Client Name:</span>
          <span style="font-weight:800;color:#2563eb;">${clientName}</span>

          <span style="font-weight:700;color:#64748b;">Company:</span>
          <span style="font-weight:800;color:#0f172a;">${companyName}</span>
          
          <span style="font-weight:700;color:#64748b;">Phone:</span>
          <span style="font-weight:800;color:#0f172a;font-family:monospace;">${clientPhone}</span>

          <span style="font-weight:700;color:#64748b;">Address:</span>
          <span style="font-weight:600;color:#475569;line-height:1.3;">${clientAddress}</span>
        </div>
      </div>
    `
  }

  const _buildLiveIcon = (color = '#8b5cf6', heading = 0, name = '') => {
    const displayName = name ? name.split(' ')[0] : 'Executive'
    return `
      <div class="live-scooty-container" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; user-select: none;">
        
        <!-- Top Floating Executive Name Pill -->
        <div style="background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(6px); border: 1.5px solid ${color}; border-radius: 20px; padding: 2px 7px; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.4); margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: liveBlink 1.2s infinite ease-in-out;"></span>
          <span>${displayName}</span>
        </div>

        <!-- Animated Scooty & Radar Ring Wrapper -->
        <div class="live-vehicle-wrapper" style="transform: rotate(${heading}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; position: relative;">
          
          <!-- Outer Radar Pulse Halo (Zomato/Swiggy style) -->
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${color}28; border: 1.5px solid ${color}66; animation: scootyRadarPulse 2s infinite cubic-bezier(0.2, 0.8, 0.2, 1); z-index: -1;"></div>
          
          <!-- Forward Direction Arrow Pointer -->
          <div style="position: absolute; top: -5px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid ${color}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></div>

          <!-- Main Scooty Badge Circle -->
          <div style="width: 38px; height: 38px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #1e293b, #090d16); border: 2.5px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.2);">
            
            <!-- Detailed Scooty Graphic (Delivery / Live Tracker style) -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
              <!-- Rear Wheel -->
              <circle cx="6" cy="18" r="2.5" fill="#0f172a" stroke="#f1f5f9" stroke-width="1.2"/>
              <circle cx="6" cy="18" r="1" fill="${color}"/>
              
              <!-- Front Wheel -->
              <circle cx="18" cy="18" r="2.5" fill="#0f172a" stroke="#f1f5f9" stroke-width="1.2"/>
              <circle cx="18" cy="18" r="1" fill="${color}"/>

              <!-- Scooty Base Frame & Footboard -->
              <path d="M8 18 H15 L16.5 13 H10 L8 18 Z" fill="${color}"/>
              
              <!-- Rear Delivery Box / Bag (Zomato/Swiggy style) -->
              <rect x="4.5" y="10.5" width="4.5" height="4.5" rx="1" fill="#f59e0b" stroke="#0f172a" stroke-width="0.8"/>
              <path d="M5.5 12.5 H8" stroke="#ffffff" stroke-width="0.8"/>

              <!-- Front Steering Column & Handlebar -->
              <path d="M14 14 L17 7.5 H15.5 M17 7.5 H18.5" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              
              <!-- Headlight Beam -->
              <circle cx="17.5" cy="8" r="1" fill="#fef08a"/>
              <path d="M19 7 L23 5 L23 10 Z" fill="#fef08a" opacity="0.45"/>

              <!-- Rider Helmet -->
              <circle cx="11.5" cy="7.5" r="2.8" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
              <path d="M12.5 7.5 Q13.5 8 13.8 9.5" stroke="#0f172a" stroke-width="0.8"/>
            </svg>

          </div>
        </div>
      </div>
      <style>
        @keyframes scootyRadarPulse {
          0% { transform: scale(0.85); opacity: 0.9; }
          60% { transform: scale(1.45); opacity: 0.25; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes liveBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      </style>
    `
  }

  const _buildStartIcon = () => `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #10b981; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(16,185,129,0.4); color: #fff; font-family: sans-serif; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">
        START
      </div>
  `

  const _buildEndIcon = () => `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #475569; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(71,85,105,0.4); color: #fff; font-family: sans-serif; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">
        END
      </div>
  `

  const _buildDestIcon = () => `
      <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #ef4444; border: 2.5px solid #fff; box-shadow: 0 4px 12px rgba(239,68,68,0.5); color: #fff;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
  `

  const _applyNewCrumb = useCallback((crumb) => {
    if (!googleMapRef.current || !window.google || !crumb) return
    const lat = Number(crumb.latitude)
    const lng = Number(crumb.longitude)
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

    const crumbTime = new Date(crumb.recorded_at || crumb.timestamp || Date.now()).getTime()
    if (crumbTime && crumbTime <= latestTimestampRef.current) {
      console.log("[SmartMap] Ignored older/stale coordinate update:", crumb.recorded_at || crumb.timestamp)
      return
    }
    if (crumbTime) {
      latestTimestampRef.current = crumbTime
    }

    const now = Date.now()
    setLastPingMs(now)
    setTrackStatus('live')
    setLatestExecPos({ lat, lng })

    if (!lastMovedPosRef.current) {
      lastMovedPosRef.current = { lat, lng }
      lastMovedTimeRef.current = now
    } else {
      const distMoved = haversineDistance(lat, lng, lastMovedPosRef.current.lat, lastMovedPosRef.current.lng) * 1000
      if (distMoved >= 10) {
        lastMovedPosRef.current = { lat, lng }
        lastMovedTimeRef.current = now
      }
    }

    // Extend traveled trail polyline (or initialize if first moving coordinates)
    try {
      const newPt = new window.google.maps.LatLng(lat, lng)
      if (trackRouteRef.current) {
        const path = trackRouteRef.current.getPath()
        path.push(newPt)
      } else if (googleMapRef.current && window.google) {
        const lineSymbol = {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillOpacity: 1,
          scale: 4,
          strokeColor: '#a855f7',
          fillColor: '#a855f7'
        }
        const initialPath = []
        if (startMarkerRef.current) {
          initialPath.push(startMarkerRef.current.getPosition())
        }
        initialPath.push(newPt)
        trackRouteRef.current = new window.google.maps.Polyline({
          path: initialPath,
          strokeOpacity: 0,
          icons: [{
            icon: lineSymbol,
            offset: '0%',
            repeat: '10px'
          }],
          map: googleMapRef.current,
          zIndex: 10
        })
      }
    } catch (polylineErr) {
      console.warn("Failed to extend traveled trail polyline:", polylineErr)
    }

    // Animate live marker
    try {
      const latlng = new window.google.maps.LatLng(lat, lng)
      if (liveMarkerRef.current) {
        _animateMarker(liveMarkerRef.current, lat, lng)
      } else {
        let initialHeading = 0
        if (crumbsRef.current.length > 1) {
          const lastIndex = crumbsRef.current.length - 1
          const prev = crumbsRef.current[lastIndex - 1]
          initialHeading = getBearing(Number(prev.latitude), Number(prev.longitude), lat, lng)
        }
        liveMarkerRef.current = new HTMLMapMarker(
          latlng,
          googleMapRef.current,
          _buildLiveIcon('#8b5cf6', initialHeading, selectedExecutiveRef.current?.employee_name),
          () => {
            showInfoWindow(latlng, _buildLivePopupContent(selectedExecutiveRef.current, trackSessionRef.current, destClientRef.current))
          },
          'center'
        )
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
    _fetchAndRenderNearbyClients(lat, lng)
  }, [])

  const _loadTrackingHistory = useCallback(async (executive) => {
    if (!googleMapRef.current || !window.google) return
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

      const map = googleMapRef.current

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

      if (clientDest && (executive.is_online || status === 'active')) {
        setDestClient(clientDest)
        destClientRef.current = clientDest
        
        if (clientDest.latitude != null && clientDest.longitude != null && !isNaN(clientDest.latitude) && !isNaN(clientDest.longitude)) {
          const destLatLng = new window.google.maps.LatLng(Number(clientDest.latitude), Number(clientDest.longitude))
          if (destMarkerRef.current) {
            destMarkerRef.current.setLatLng(destLatLng)
          } else {
            destMarkerRef.current = new HTMLMapMarker(
              destLatLng,
              map,
              _buildDestIcon(),
              () => {
                showInfoWindow(destLatLng, `
                  <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:240px;">
                    <div style="display:flex;align-items:center;gap:6px;font-weight:900;color:#dc2626;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;margin-bottom:6px;border-bottom:1.5px solid #fee2e2;padding-bottom:4px;">
                      <span>🎯 Client Destination</span>
                    </div>
                    <div style="font-weight:800;font-size:13px;color:#0f172a;">${clientDest.title || clientDest.company_name || 'Client Visit'}</div>
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;color:#334155;margin-top:6px;">
                      <span style="font-weight:700;color:#64748b;">Company:</span>
                      <span style="font-weight:800;color:#0f172a;">${clientDest.company_name || clientDest.title || '—'}</span>

                      ${clientDest.phone ? `
                        <span style="font-weight:700;color:#64748b;">Phone:</span>
                        <span style="font-weight:800;color:#2563eb;font-family:monospace;">${clientDest.phone}</span>
                      ` : ''}

                      <span style="font-weight:700;color:#64748b;">Address:</span>
                      <span style="font-weight:600;color:#475569;line-height:1.3;">${clientDest.address || '—'}</span>
                    </div>
                  </div>
                `)
              },
              'center'
            )
          }
        }
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

      // Isolated Google Maps rendering block
      try {
        if (session && status === 'ended' && session.end_latitude != null && session.end_longitude != null) {
          latestLat = Number(session.end_latitude)
          latestLng = Number(session.end_longitude)
          const badgeColor = '#64748b'
          const latlng = new window.google.maps.LatLng(latestLat, latestLng)
          liveMarkerRef.current = new HTMLMapMarker(
            latlng,
            map,
            _buildLiveIcon(badgeColor, 0, executive?.employee_name),
            () => {
              showInfoWindow(latlng, _buildLivePopupContent(executive, session, clientDest))
            },
            'center'
          )
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
          const latlng = new window.google.maps.LatLng(latestLat, latestLng)
          liveMarkerRef.current = new HTMLMapMarker(
            latlng,
            map,
            _buildLiveIcon(badgeColor, initialHeading, executive?.employee_name),
            () => {
              showInfoWindow(latlng, _buildLivePopupContent(executive, session, clientDest))
            },
            'center'
          )
          setLastPingMs(new Date(last.recorded_at).getTime())
        } else if (session && session.start_latitude != null && session.start_longitude != null) {
          latestLat = Number(session.start_latitude)
          latestLng = Number(session.start_longitude)
          const badgeColor = '#10b981'
          const latlng = new window.google.maps.LatLng(latestLat, latestLng)
          liveMarkerRef.current = new HTMLMapMarker(
            latlng,
            map,
            _buildLiveIcon(badgeColor, 0, executive?.employee_name),
            () => {
              showInfoWindow(latlng, _buildLivePopupContent(executive, session, clientDest))
            },
            'center'
          )
          setLastPingMs(new Date(session.start_time).getTime())
        } else if (executive.latitude != null && executive.longitude != null) {
          latestLat = Number(executive.latitude)
          latestLng = Number(executive.longitude)
          const badgeColor = '#10b981'
          const latlng = new window.google.maps.LatLng(latestLat, latestLng)
          liveMarkerRef.current = new HTMLMapMarker(
            latlng,
            map,
            _buildLiveIcon(badgeColor, 0, executive?.employee_name),
            () => {
              showInfoWindow(latlng, _buildLivePopupContent(executive, session, clientDest))
            },
            'center'
          )
          setLastPingMs(Date.now())
        }
      } catch (gErr) {
        console.error("[SmartMap] Error rendering live/end markers:", gErr)
      }

      // If executive is offline and has no active tracking session, do not render tracking layers
      if (!executive.is_online && status !== 'active') {
        return
      }

      // ─── Draw traveled trail as dotted polyline + start/end markers ───
      try {
        const pathCoords = crumbs.map(c => ({ lat: Number(c.latitude), lng: Number(c.longitude) })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng) && pt.lat !== 0 && pt.lng !== 0)
        
        let startLat = session?.start_latitude != null ? Number(session.start_latitude) : (crumbs.length > 0 ? Number(crumbs[0].latitude) : null)
        let startLng = session?.start_longitude != null ? Number(session.start_longitude) : (crumbs.length > 0 ? Number(crumbs[0].longitude) : null)

        if (startLat != null && startLng != null && !isNaN(startLat) && !isNaN(startLng)) {
          if (pathCoords.length === 0 || haversineDistance(startLat, startLng, pathCoords[0].lat, pathCoords[0].lng) > 0.005) {
            pathCoords.unshift({ lat: startLat, lng: startLng })
          }
          const startLatLng = new window.google.maps.LatLng(startLat, startLng)
          startMarkerRef.current = new HTMLMapMarker(
            startLatLng,
            map,
            _buildStartIcon(),
            () => {
              showInfoWindow(startLatLng, `<div style="font-family:sans-serif;font-size:12px;padding:4px;color:#1e293b;"><strong>🟢 Start Point</strong><br/>Time: ${session?.start_time ? new Date(session.start_time).toLocaleTimeString() : '—'}</div>`)
            },
            'center'
          )
        }

        if (status === 'ended' && session?.end_latitude != null && session?.end_longitude != null) {
          const endLat = Number(session.end_latitude)
          const endLng = Number(session.end_longitude)
          const endLatLng = new window.google.maps.LatLng(endLat, endLng)
          endMarkerRef.current = new HTMLMapMarker(
            endLatLng,
            map,
            _buildEndIcon(),
            () => {
              showInfoWindow(endLatLng, `<div style="font-family:sans-serif;font-size:12px;padding:4px;color:#1e293b;"><strong>⬛ End Point</strong><br/>Time: ${session?.end_time ? new Date(session.end_time).toLocaleTimeString() : '—'}</div>`)
            },
            'center'
          )
        }

        if (pathCoords.length > 1) {
          const lineSymbol = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillOpacity: 1,
            scale: 4,
            strokeColor: '#a855f7',
            fillColor: '#a855f7'
          }
          trackRouteRef.current = new window.google.maps.Polyline({
            path: pathCoords,
            strokeOpacity: 0,
            icons: [{
              icon: lineSymbol,
              offset: '0%',
              repeat: '10px'
            }],
            map: map,
            zIndex: 10
          })
        }
      } catch (trailErr) {
        console.error("[SmartMap] Error rendering traveled trail or start/end markers:", trailErr)
      }

      // ─── Fetch nearby client markers ───
      if (latestLat != null && latestLng != null && !isNaN(latestLat) && !isNaN(latestLng)) {
        setLatestExecPos({ lat: latestLat, lng: latestLng })
        _fetchAndRenderNearbyClients(latestLat, latestLng)
        if (crumbs.length > 0) {
          latestTimestampRef.current = new Date(crumbs[crumbs.length - 1].recorded_at).getTime()
        } else if (session && session.start_time) {
          latestTimestampRef.current = new Date(session.start_time).getTime()
        }
      }

      // ─── Fetch historical tracking events ───
      if (session && supabase) {
        try {
          const { data: evs, error: evsErr } = await supabase
            .schema('hrms')
            .table('tracking_events')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
          if (!evsErr && evs) {
            setTrackEvents(evs)
          }
        } catch (evsErr) {
          console.warn("Failed to load tracking events history:", evsErr)
        }
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
          const gBounds = new window.google.maps.LatLngBounds()
          validPts.forEach(pt => gBounds.extend({ lat: pt[0], lng: pt[1] }))
          map.fitBounds(gBounds, 60)
          
          const listener = map.addListener('idle', () => {
            if (map.getZoom() > 17) {
              map.setZoom(17)
            }
            window.google.maps.event.removeListener(listener)
          })
        }
      } catch (boundsErr) {
        console.error("[SmartMap] Error fitting map bounds:", boundsErr)
      }

      // Subscribe Realtime (ALWAYS, whether session is null or active)
      _subscribeRealtime(executive.employee_id, session?.id, executive.employee_code)

    } catch (err) {
      console.error('Tracking history error:', err)
      setTrackStatus('idle')
    }
  }, [_applyNewCrumb])

  const _subscribeRealtime = useCallback((employeeId, sessionId, employeeCode = null) => {
    // Clean up previous channels first
    if (realtimeChRef.current) {
      if (Array.isArray(realtimeChRef.current)) {
        realtimeChRef.current.forEach(ch => { try { ch.unsubscribe() } catch {} })
      } else {
        try { realtimeChRef.current.unsubscribe() } catch {}
      }
      realtimeChRef.current = null
    }
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }

    if (supabase) {
      const chNames = new Set()
      if (employeeId) {
        chNames.add(`tracking_${employeeId}`)
        chNames.add(`tracking_${employeeId}_live`)
        if (sessionId) chNames.add(`tracking_${employeeId}_${sessionId}`)
      }
      if (employeeCode && employeeCode !== employeeId) {
        chNames.add(`tracking_${employeeCode}`)
        chNames.add(`tracking_${employeeCode}_live`)
        if (sessionId) chNames.add(`tracking_${employeeCode}_${sessionId}`)
      }

      const channels = []
      chNames.forEach(name => {
        const channel = supabase
          .channel(name)
          .on('broadcast', { event: 'location' }, (payload) => {
            const crumb = payload?.payload
            if (!crumb) return
            
            if (crumb.broadcast_sent_at) {
              const latVal = Date.now() - crumb.broadcast_sent_at
              console.log(`[SmartMap] Realtime Broadcast Latency (${name}): ${latVal}ms`)
            }
            
            const crumbId = crumb.id || `bc_${Date.now()}_${Math.random()}`
            const exists = crumbsRef.current.some(c => c.id === crumbId)
            if (!exists) {
              crumbsRef.current = [...crumbsRef.current, { ...crumb, id: crumbId }]
              setTrackBreadcrumbs(crumbsRef.current)
            }
            _applyNewCrumb(crumb)
          })
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
            event: 'INSERT',
            schema: 'hrms',
            table: 'tracking_events',
            filter: sessionId ? `session_id=eq.${sessionId}` : `employee_id=eq.${employeeId}`
          }, (payload) => {
            const newEvent = payload.new
            if (!newEvent) return
            setTrackEvents(prev => {
              const exists = prev.some(e => e.id === newEvent.id)
              if (exists) return prev
              return [newEvent, ...prev]
            })
            showToast(newEvent.title || `New tracking event: ${newEvent.event_type}`, "info")
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
            if (s === 'SUBSCRIBED') setRealtimeOk(true)
          })

        channels.push(channel)
      })

      realtimeChRef.current = channels
    }

    // Always start polling timer as secure backend API fallback
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

        // Fallback: poll tracking events
        if (supabase && sess) {
          const { data: evs, error: evsErr } = await supabase
            .schema('hrms')
            .table('tracking_events')
            .select('*')
            .eq('session_id', sess.id)
            .order('created_at', { ascending: false })
          if (!evsErr && evs) {
            setTrackEvents(evs)
          }
        }
      } catch (err) {
        console.warn("Polling error:", err)
      }
    }, 2500)
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
    setIsTrackingMinimized(false)
    
    // Only zoom/fly to executive location if there is NO active client visit destination
    const isClientVisit = ex.check_in_mode === 'Client Visit' || ex.client_latitude != null
    if (!isClientVisit && ex.latitude && ex.longitude && googleMapRef.current) {
      googleMapRef.current.panTo({ lat: ex.latitude, lng: ex.longitude })
      googleMapRef.current.setZoom(16)
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
    resolveRealName(ex).toLowerCase().includes(searchQuery.toLowerCase())
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
  const proxStatus = getProximityStatus()
  const hb = getHeartbeatStatus()

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

        {/* Live tracking info panel in sidebar (visible only when active executive selected) */}
        {selectedExecutive && selectedExecutive.is_online && trackStatus !== 'idle' && (
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
                  setInitialFitDone(false)
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
                    {resolveRealName(selectedExecutive).split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-200">{resolveRealName(selectedExecutive)}</div>
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

                {/* Route Corridor Nearby / Previous Client Alerts */}
                {onRouteClients.length > 0 && (
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span>🔔</span> Clients on Route ({onRouteClients.length})
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold">500m corridor</span>
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 font-sans">
                      {onRouteClients.map(client => {
                        const isPrev = client.alertType === 'previous';
                        const isSched = client.alertType === 'scheduled';
                        return (
                          <div key={client.id}
                            onClick={() => {
                              if (googleMapRef.current && client.latitude && client.longitude) {
                                googleMapRef.current.panTo({ lat: client.latitude, lng: client.longitude });
                                googleMapRef.current.setZoom(16);
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 cursor-pointer transition flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  isPrev ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                  isSched ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {isPrev ? '🔄 Previous Client' : (isSched ? '📅 Scheduled' : '📍 Nearby ' + client.category)}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-slate-400">{client.distToRouteM}m</span>
                              </div>
                              <div className="text-xs font-black text-slate-200 truncate mt-1">{client.title}</div>
                              {client.address && <div className="text-[9px] text-slate-500 truncate">{client.address}</div>}
                            </div>
                            <span className="text-[10px] text-violet-400 font-extrabold shrink-0">View ➔</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live Activity Feed */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Activity Feed</span>
                    <span className="text-[9px] text-slate-500 font-semibold">{trackEvents.length} events</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 font-sans">
                    {trackEvents.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic py-1">No activities logged yet.</div>
                    ) : (
                      trackEvents.map(evt => {
                        let icon = 'ℹ️'
                        let color = 'text-slate-400'
                        if (evt.event_type === 'CLIENT_REACHED' || evt.event_type === 'VISIT_COMPLETED') {
                          icon = '🟢'
                          color = 'text-emerald-400'
                        } else if (evt.event_type === 'CLIENT_LEFT') {
                          icon = '🔵'
                          color = 'text-blue-400'
                        } else if (evt.event_type === 'ROUTE_DEVIATION') {
                          icon = '⚠️'
                          color = 'text-amber-500'
                        } else if (evt.event_type.startsWith('STATIONARY')) {
                          icon = '🟠'
                          color = 'text-orange-400'
                        } else if (evt.event_type === 'VISIT_STARTED') {
                          icon = '🚩'
                          color = 'text-violet-400'
                        }

                        const timeStr = new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        
                        return (
                          <div key={evt.id} className="flex gap-2 text-[10px] bg-slate-900/40 p-2 rounded-lg border border-white/5 items-start">
                            <span className="shrink-0">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className={`font-black truncate ${color}`}>{evt.title || evt.event_type.replace(/_/g, ' ')}</div>
                              {evt.message && <div className="text-slate-400 text-[9px] font-medium leading-snug mt-0.5">{evt.message}</div>}
                              <div className="text-slate-500 text-[8px] font-bold mt-1">{timeStr}</div>
                            </div>
                          </div>
                        )
                      })
                    )}
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
              const exDisplayName = resolveRealName(ex)
              const initials = exDisplayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
              
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
                        <div className="text-xs font-black text-slate-200">{exDisplayName}</div>
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

        {/* Compact Zomato/Swiggy-style Floating Live Tracking Card (Only shown when active online) */}
        {selectedExecutive && selectedExecutive.is_online && trackStatus !== 'idle' && trackStatus !== 'loading' && destClient && (
          isTrackingMinimized ? (
            /* Minimized state: slim pill at the top of the map */
            <div className="absolute top-4 left-4 right-4 lg:right-auto lg:w-85 z-20 bg-slate-950/96 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md text-white pointer-events-auto flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{resolveRealName(selectedExecutive)}</div>
                  <div className="text-[9px] text-slate-400 font-bold">
                    {destRouteMeta ? `${destRouteMeta.etaMins} mins remaining (${destRouteMeta.distanceKm.toFixed(1)} km)` : 'Live tracking'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => setIsTrackingMinimized(false)}
                  title="Expand live tracking info"
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition active:scale-95">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => {
                  _clearTrackingLayer()
                  setSelectedExecutive(null)
                  setInitialFitDone(false)
                  setIsTrackingMinimized(false)
                }} className="p-1.5 rounded-lg hover:bg-white/5 text-rose-400 hover:text-rose-300 transition active:scale-95">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Full layout: floating card on desktop, bottom sheet style card on mobile */
            <div className="absolute bottom-2 left-2 right-2 top-auto lg:bottom-auto lg:top-5 lg:left-5 lg:right-auto lg:w-80 z-20 bg-slate-950/96 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white pointer-events-auto flex flex-col gap-3 max-h-[45vh] lg:max-h-none overflow-y-auto lg:overflow-visible animate-in slide-in-from-bottom lg:slide-in-from-top duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> TRACKING SESSION
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Heartbeat Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 ${hb.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hb.dot}`} />
                    {hb.label}
                  </span>
                  <button onClick={() => setIsTrackingMinimized(true)}
                    title="Minimize tracking info"
                    className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition active:scale-95">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => {
                    _clearTrackingLayer()
                    setSelectedExecutive(null)
                    setInitialFitDone(false)
                    setIsTrackingMinimized(false)
                  }} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition active:scale-95">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-black text-slate-100">{resolveRealName(selectedExecutive)}</h3>
                <p className="text-[10px] font-bold text-slate-400">{selectedExecutive.role}</p>
              </div>
              
              <div className="border-t border-white/5 pt-3 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Status: <span className={`font-black uppercase ${
                        proxStatus === 'Arrived' ? 'text-green-400' :
                        proxStatus === 'Near Location' ? 'text-amber-400' :
                        proxStatus === 'Idle' ? 'text-orange-400 animate-pulse' : 'text-blue-400'
                      }`}>{proxStatus}</span>
                    </div>
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
              
              {/* Route Path Legend (Traveled shortcut/trail vs Planned Route) */}
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-t border-white/5 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-purple-400 bg-purple-500/30"></span>
                  <span className="text-purple-300">Dotted: Actual Path / Shortcut</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 bg-blue-500 rounded-full"></span>
                  <span className="text-blue-300">Solid: Planned Route</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-bold">
                <span>Last updated: {lastPingMs ? formatLastSeen(new Date(lastPingMs).toISOString()) : 'Just now'}</span>
                <span>{trackSession?.total_distance ? `${(trackSession.total_distance / 1000).toFixed(2)} km total` : ''}</span>
              </div>
            </div>
          )
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
