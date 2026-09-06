import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  MapPin, Radio, Users, Activity, Clock, RefreshCw,
  Search, Shield, Map as MapIcon, Eye, Compass, Navigation,
  AlertCircle, ChevronRight, ChevronLeft, Phone, Mail, Award, CheckCircle2, X,
  Route, Milestone, Minimize2, Maximize2, ArrowLeft, MessageSquare, Send, MessageCircle
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { spatialAPI, authAPI, settingsAPI, crmAPI, customerAPI, visitAPI, auditAPI, notificationAPI } from '../../services/api.js'
import { loadGoogleMaps, purgeGoogleMapsBillingModal } from '../../utils/loadGoogleMaps.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { formatDate } from '../../utils/dateUtils.js'
import { filterUserItems } from '../../utils/userScope.js'
import MAP_CONFIG from '../../config/mapConfig.js'
import { detectRouteClients, shouldNotify } from '../../utils/routeProximityUtils.js'

const DEFAULT_CENTER = MAP_CONFIG.DEFAULT_VIEWPORT_CENTER





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

function distanceToPolyline(lat, lng, polylinePts) {
  if (!polylinePts || polylinePts.length === 0) return Infinity
  let minDistance = Infinity
  for (let i = 0; i < polylinePts.length; i++) {
    const pt = polylinePts[i]
    const pLat = Array.isArray(pt) ? pt[0] : pt.lat
    const pLng = Array.isArray(pt) ? pt[1] : pt.lng
    const dist = haversineDistance(lat, lng, pLat, pLng)
    if (dist < minDistance) minDistance = dist
  }
  return minDistance
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

// ── Stale & Offline thresholds ───────────────────────────────────────────────
const STALE_MS   = 1 * 60 * 1000   // > 1 min → Stale
const OFFLINE_MS = 5 * 60 * 1000   // > 5 mins → Offline
const GONE_MS    = 10 * 60 * 1000  // > 10 mins → Gone / No Signal


function getTrackingBadge(status, lastUpdatedMs, isOnline = true) {
  if (status === 'ended' || status === 'stopped') return { label: 'Session Ended', color: '#64748b', dot: '⬛' }
  if (!isOnline) return { label: 'Offline', color: '#dc2626', dot: '🔴' }
  if (!lastUpdatedMs) return { label: 'No Signal', color: '#64748b', dot: '⬛' }

  const age = Date.now() - lastUpdatedMs
  if (age > OFFLINE_MS) return { label: 'Offline (>5m)', color: '#dc2626', dot: '🔴' }
  if (age > STALE_MS) {
    const minsAgo = Math.floor(age / 60000)
    return { label: `Stale (${minsAgo}m ago)`, color: '#f97316', dot: '🟠' }
  }

  return { label: 'Live GPS', color: '#10b981', dot: '🟢' }
}

// ─── Custom HTML Map Marker for Google Maps Overlay ───────────────────────────
let HTMLMapMarker = null

function initializeHTMLMapMarker() {
  if (HTMLMapMarker) return HTMLMapMarker
  if (!window.google || !window.google.maps || !window.google.maps.OverlayView) return null
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

      div.addEventListener('mousedown', (e) => {
        e.stopPropagation()
      })
      div.addEventListener('contextmenu', (e) => {
        e.stopPropagation()
      })

      this.div = div
      const panes = this.getPanes()
      panes?.overlayImage?.appendChild(div)
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
  return HTMLMapMarker
}

function createMapMarker(latlng, map, html, onClick, anchor = 'center') {
  initializeHTMLMapMarker()
  if (!HTMLMapMarker) {
    console.warn('[SmartMap] OverlayView not ready for HTMLMapMarker')
    return null
  }
  return new HTMLMapMarker(latlng, map, html, onClick, anchor)
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
  const [selectedTeamLeadIndex, setSelectedTeamLeadIndex] = useState(0)
  const [activeTeamFilter,      setActiveTeamFilter]      = useState('all') // 'all' (paginated team lead) | 'all_combined' | specific key

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
  const notifiedEventsRef = useRef(new Map())

  // Executive replies & inquiry modal state
  const [executiveReplies, setExecutiveReplies] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tc_executive_replies') || '{}')
    } catch { return {} }
  })
  const [inquiryModalEx, setInquiryModalEx] = useState(null)
  const [customInquiryText, setCustomInquiryText] = useState('')

  // Poll for incoming replies from Sales Executives
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const res = await notificationAPI.getNotifications()
        const notifs = Array.isArray(res) ? res : (res?.data || [])
        const replies = notifs.filter(n => {
          const cat = String(n.category || n.type || '').toUpperCase()
          return cat.includes('REPLY') || String(n.title || '').includes('Reply')
        })
        
        setExecutiveReplies(prev => {
          const next = { ...prev }
          let updated = false
          replies.forEach(r => {
            const senderName = r.sender_name || r.title?.replace('💬 Reply from ', '') || 'Executive'
            const empId = String(r.employee_id || r.sender_id || r.user_id || senderName || 'unknown').toLowerCase().trim()
            const existing = next[empId] || []
            if (!existing.some(e => e.id === r.id || e.timestamp === r.created_at)) {
              updated = true
              next[empId] = [{
                id: r.id || Date.now(),
                message: r.message || r.title,
                sender_name: senderName,
                sender_email: r.sender_email || r.recipient_email || '',
                timestamp: r.created_at || new Date().toISOString(),
                read: false
              }, ...existing]

              showToast(`💬 Reply from ${senderName}: "${r.message || r.title}"`, 'info')
            }
          })
          if (updated) localStorage.setItem('tc_executive_replies', JSON.stringify(next))
          return updated ? next : prev
        })
      } catch (e) { console.warn('Fetch replies err:', e) }
    }

    fetchReplies()
    const interval = setInterval(fetchReplies, 15000)
    return () => clearInterval(interval)
  }, [showToast])

  const getUserReplies = (ex) => {
    if (!ex) return []
    const exName = resolveRealName(ex).toLowerCase().trim()
    const exEmail = String(ex.email || ex.employee_email || '').toLowerCase().trim()
    const exEmpId = String(ex.employee_id || ex.employee_code || ex.id || '').toLowerCase().trim()

    const allReplies = Object.entries(executiveReplies).flatMap(([key, list]) => {
      const matchKey = (exEmpId && key === exEmpId) || (exEmail && key === exEmail) || (exName && key.includes(exName))
      if (matchKey) return list
      return list.filter(r => {
        const sName = String(r.sender_name || '').toLowerCase().trim()
        const sEmail = String(r.sender_email || '').toLowerCase().trim()
        return (sName && exName && sName.includes(exName)) || (sEmail && exEmail && sEmail === exEmail)
      })
    })

    const seen = new Set()
    const unique = allReplies.filter(r => {
      const id = r.id || r.timestamp
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    return unique.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
  }


  const markRepliesAsRead = (ex) => {
    if (!ex) return
    const exName = resolveRealName(ex).toLowerCase().trim()
    const exEmpId = String(ex.employee_id || ex.employee_code || ex.id || '').toLowerCase().trim()
    setExecutiveReplies(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        if (k === exEmpId || (exName && k.includes(exName))) {
          next[k] = next[k].map(r => ({ ...r, read: true }))
        } else {
          next[k] = next[k].map(r => {
            const sName = String(r.sender_name || '').toLowerCase().trim()
            if (sName && exName && sName.includes(exName)) return { ...r, read: true }
            return r
          })
        }
      })
      localStorage.setItem('tc_executive_replies', JSON.stringify(next))
      return next
    })
  }

  const handleSendInquiry = async (ex, questionText) => {
    const q = questionText || customInquiryText || 'Why are you stopped at this location?'
    const targetEmail = (ex.email || ex.employee_email || ex.user_email || '').toLowerCase().trim()
    const empCode = (ex.employee_id || ex.employee_code || ex.id || '').trim()
    try {
      await notificationAPI.sendNotification({
        title: '⚡ Quick Status Inquiry',
        message: q,
        category: 'LOCATION_INQUIRY',
        type: 'LOCATION_INQUIRY',
        recipient_role: 'executive',
        recipient_email: targetEmail,
        employee_id: empCode,
        sender_name: currentUser?.name || 'Sales Manager'
      })
      showToast(`Inquiry sent to ${resolveRealName(ex)}`, 'success')
      setCustomInquiryText('')
      window.dispatchEvent(new Event('tc_notifications_updated'))
    } catch (err) {
      showToast('Failed to send inquiry', 'error')
    }
  }

  const sendManagerNotification = useCallback((title, message, category = 'TRACKING') => {
    const payload = {
      title,
      message,
      category,
      type: category,
      recipient_role: 'manager',
      recipient_email: currentUser?.email || '',
      created_at: new Date().toISOString()
    }
    notificationAPI.sendNotification(payload).catch((e) => console.warn('Manager notif notice:', e))
    auditAPI.logEvent({
      action: `MANAGER_NOTIF_${category}`,
      entity_type: 'NOTIFICATION',
      details: { title, message, recipient_role: 'manager' }
    }).catch(() => null)
  }, [currentUser])

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
  const teamMarkersMapRef = useRef(new globalThis.Map())
  const infoWindowRef   = useRef(null)

  // Tracking-layer refs (one set per selected executive)
  const trackRouteRef   = useRef(null)  // Polyline breadcrumb route
  const trailPointsRef  = useRef([])    // In-memory array of all breadcrumb points for trail
  const startMarkerRef  = useRef(null)  // green start pin
  const liveMarkerRef   = useRef(null)  // animated live position
  const endMarkerRef    = useRef(null)  // grey end pin
  const destMarkerRef   = useRef(null)  // client destination pin
  const destRouteRef    = useRef(null)  // Polyline route to destination
  const offRoutePolylineRef = useRef(null) // Purple dashed polyline for route deviation
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
      destMarkerRef.current = createMapMarker(
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

  // ─── 1. Load Google Maps CDN with Instant Cache ────────────────────────────
  useEffect(() => {
    // If already loaded (e.g. hot reload), skip network round-trip entirely
    if (window.google?.maps) {
      initializeHTMLMapMarker()
      setMapLoaded(true)
      return
    }

    const cachedKey = localStorage.getItem('tc_gmaps_key')
    if (cachedKey) {
      setGoogleMapsApiKey(cachedKey)
      loadGoogleMaps(cachedKey)
        .then(maps => {
          if (!maps) return
          initializeHTMLMapMarker()
          setMapLoaded(true)
        })
        .catch(err => console.warn('Cached Google Maps load notice:', err))
    }

    settingsAPI.getConfig()
      .then(res => {
        const key = res?.data?.google_maps_api_key
        if (!key) return
        localStorage.setItem('tc_gmaps_key', key)
        setGoogleMapsApiKey(key)
        return loadGoogleMaps(key)
      })
      .then(maps => {
        if (!maps) return
        initializeHTMLMapMarker()
        setMapLoaded(true)
      })
      .catch(err => console.error('Failed to load Google Maps:', err))
  }, [])

  // Auto-purge Google Maps billing error modal overlay popups
  useEffect(() => {
    purgeGoogleMapsBillingModal()
    const timer = setInterval(() => {
      purgeGoogleMapsBillingModal()
    }, 3000)
    return () => clearInterval(timer)
  }, [])


  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => {
      if (!document.hidden) {
        fetchData(true)
      }
    }, 10000) // Optimized 10-second auto-refresh polling
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

  // ─── Supabase Realtime for entire team locations ───
  useEffect(() => {
    if (!supabase) return
    
    const channel = supabase
      .channel('team_locations_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'hrms',
        table: 'employee_locations'
      }, (payload) => {
        const updatedLoc = payload.new
        if (!updatedLoc) return
        
        setExecutives(prev => {
          return prev.map(ex => {
            if (ex.employee_id === updatedLoc.employee_id) {
              return {
                ...ex,
                latitude: updatedLoc.latitude,
                longitude: updatedLoc.longitude,
                accuracy: updatedLoc.accuracy,
                is_online: updatedLoc.is_online,
                last_seen_at: updatedLoc.last_seen_at
              }
            }
            return ex
          })
        })
      })
      .subscribe()
      
    return () => {
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          console.warn("Error removing team locations realtime channel:", e)
        }
      }
    }
  }, [supabase])

  // ─── 3. Google Maps init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || googleMapRef.current) return
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
      zoom: 13,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM || 9
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })

    googleMapRef.current = map

    return () => {
      _clearTrackingLayer()
      teamMarkersMapRef.current.forEach(m => m.setMap(null))
      teamMarkersMapRef.current.clear()
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
    if (trackStatus === 'loading') return 'Loading...';
    if (!latestExecPos) return 'No GPS Data';
    if (!destClient) return 'No Destination';

    const distM = haversineDistance(latestExecPos.lat, latestExecPos.lng, Number(destClient.latitude), Number(destClient.longitude)) * 1000;
    
    if (distM <= 50) {
      if (destClient && selectedExecutiveRef.current) {
        const arrivedKey = `arrived_${selectedExecutiveRef.current.employee_id || 'ex'}_${destClient.id}`
        if (!notifiedEventsRef.current.has(arrivedKey)) {
          notifiedEventsRef.current.set(arrivedKey, true)
          sendManagerNotification(
            '🎯 Executive Reached Client',
            `${resolveRealName(selectedExecutiveRef.current)} has reached client destination "${destClient.company_name || destClient.title}".`,
            'VISIT'
          )
        }
      }
      return 'Arrived';
    }
    
    if (distM <= 450) {
      return 'Near Location';
    }

    // Check if executive is still at start location (hasn't moved yet)
    const startLat = trackSessionRef.current?.start_latitude != null ? Number(trackSessionRef.current.start_latitude) : (crumbsRef.current[0] ? Number(crumbsRef.current[0].latitude) : null);
    const startLng = trackSessionRef.current?.start_longitude != null ? Number(trackSessionRef.current.start_longitude) : (crumbsRef.current[0] ? Number(crumbsRef.current[0].longitude) : null);
    
    if (startLat != null && startLng != null) {
      const distFromStartM = haversineDistance(latestExecPos.lat, latestExecPos.lng, startLat, startLng) * 1000;
      if (distFromStartM < 25 && (crumbsRef.current.length <= 1 || trackBreadcrumbs.length <= 1)) {
        return 'At Start Location';
      }
    }

    // Check if Idle (no movement >= 10m for > 1 minute)
    const timeSinceLastMove = Date.now() - lastMovedTimeRef.current;
    if (timeSinceLastMove > 1 * 60 * 1000) {
      return 'Idle';
    }

    return 'Travelling';
  };

  const getHeartbeatStatus = () => {
    if (trackStatus === 'ended' || trackStatus === 'stopped') {
      return { label: 'Stopped', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500' };
    }
    if (selectedExecutive && !selectedExecutive.is_online) {
      return { label: 'Offline (Logged Out)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-500' };
    }
    if (!lastPingMs) return { label: 'No Signal', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500' };
    
    const age = Date.now() - lastPingMs;
    if (age <= 60000) {
      return { label: 'Live Connection', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500 animate-pulse' };
    }
    if (selectedExecutive) {
      const staleKey = `stale_${selectedExecutive.employee_id}_${Math.floor(lastPingMs / 60000)}`
      if (!notifiedEventsRef.current.has(staleKey)) {
        notifiedEventsRef.current.set(staleKey, true)
        sendManagerNotification(
          '🟠 Executive GPS Stale',
          `${resolveRealName(selectedExecutive)}'s GPS signal has not updated for over 1 minute.`,
          'TRACKING'
        )
      }
    }
    return { label: 'GPS Stale (>1 min)', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' };
  };

  // ─── 5. Team / Client markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return
    
    const bounds = []
    const currentOnlineIds = new Set()

    if (viewMode === 'team' || viewMode === 'both') {
      executives.forEach(ex => {
        if (!ex.latitude || !ex.longitude) return
        
        // ONLY render markers on map if the executive is currently Logged In / ONLINE!
        if (!ex.is_online) return
        
        // Hide selected executive's static team marker to prevent duplication with tracking layer
        if (selectedExecutive && selectedExecutive.employee_id === ex.employee_id) return

        const empId = ex.employee_id
        currentOnlineIds.add(empId)

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
        bounds.push([ex.latitude, ex.longitude])

        const infoWindowHtml = `
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
                <span style="font-weight:700;color:#475569;">${!ex.check_in_mode ? '○ Not Checked In' : (ex.check_in_mode === 'Client Visit' ? '🏍️ Travelling to Client' : '🏢 In Office')}</span>
                ${ex.check_in_address ? `
                  <span style="font-weight:700;color:#64748b;">Location:</span>
                  <span style="font-weight:600;color:#475569;">${ex.check_in_address.replace('CLIENT_VISIT_DESTINATION:::', '')}</span>
                ` : ''}
              `}

              <span style="font-weight:700;color:#64748b;">Last Seen:</span>
              <span style="font-weight:700;color:#0f172a;">${formatLastSeen(ex.last_seen_at)}</span>
            </div>
          </div>
        `

        let existingMarker = teamMarkersMapRef.current.get(empId)
        if (existingMarker) {
          existingMarker.setLatLng(latlng)
          if (existingMarker.div) {
            existingMarker.div.innerHTML = html
          }
          existingMarker.onClick = () => showInfoWindow(latlng, infoWindowHtml)
        } else {
          const marker = createMapMarker(
            latlng,
            googleMapRef.current,
            html,
            () => showInfoWindow(latlng, infoWindowHtml),
            'center'
          )
          if (marker) teamMarkersMapRef.current.set(empId, marker)
        }
      })
    }

    teamMarkersMapRef.current.forEach((marker, empId) => {
      if (!currentOnlineIds.has(empId)) {
        marker.setMap(null)
        teamMarkersMapRef.current.delete(empId)
      }
    })

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
    trailPointsRef.current = []
    if (startMarkerRef.current) { startMarkerRef.current.setMap(null); startMarkerRef.current = null }
    if (liveMarkerRef.current)  { liveMarkerRef.current.setMap(null);  liveMarkerRef.current  = null }
    if (endMarkerRef.current)   { endMarkerRef.current.setMap(null);   endMarkerRef.current   = null }
    if (destMarkerRef.current)  { destMarkerRef.current.setMap(null);  destMarkerRef.current  = null }
    if (destRouteRef.current)   { destRouteRef.current.setMap(null);   destRouteRef.current   = null }
    if (offRoutePolylineRef.current) { offRoutePolylineRef.current.setMap(null); offRoutePolylineRef.current = null }
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

      const marker = createMapMarker(
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
    const isLive = Boolean(executive?.is_online || session?.status === 'active')
    const statusBadge = isLive 
      ? '<span style="font-size:9px;font-weight:800;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:12px;">● LIVE</span>'
      : '<span style="font-size:9px;font-weight:800;background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:12px;">○ OFFLINE</span>'

    const clientName = clientDest?.title || clientDest?.company_name || session?.client_name || executive?.client_name || null
    const companyName = clientDest?.company_name || clientDest?.company || session?.company_name || executive?.company_name || null
    const clientPhone = clientDest?.phone || session?.client_phone || executive?.client_phone || null
    const clientAddress = clientDest?.address || session?.client_address || executive?.client_address || null

    return `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:240px;">
        <div style="font-weight:900;font-size:13px;color:#7c3aed;margin-bottom:8px;border-bottom:1.5px solid #e2e8f0;padding-bottom:5px;display:flex;align-items:center;justify-content:space-between;">
          <span>👤 ${executiveName}</span>
          ${statusBadge}
        </div>
        
        <div style="display:grid;grid-template-columns:auto 1fr;gap:5px 10px;font-size:11px;color:#334155;">
          ${clientName ? `
            <span style="font-weight:700;color:#64748b;">Client Name:</span>
            <span style="font-weight:800;color:#2563eb;">${clientName}</span>
            <span style="font-weight:700;color:#64748b;">Company:</span>
            <span style="font-weight:800;color:#0f172a;">${companyName || clientName}</span>
            ${clientPhone ? `
              <span style="font-weight:700;color:#64748b;">Phone:</span>
              <span style="font-weight:800;color:#0f172a;font-family:monospace;">${clientPhone}</span>
            ` : ''}
            ${clientAddress ? `
              <span style="font-weight:700;color:#64748b;">Address:</span>
              <span style="font-weight:600;color:#475569;line-height:1.3;">${clientAddress}</span>
            ` : ''}
          ` : `
            <span style="font-weight:700;color:#64748b;">Status:</span>
            <span style="font-weight:800;color:#475569;">${!executive?.check_in_mode ? '○ Not Checked In' : (executive?.check_in_mode === 'Office' ? '🏢 In Office' : (isLive ? 'Online (Idle)' : '○ Offline / Not Logged In'))}</span>
            <span style="font-weight:700;color:#64748b;">Client:</span>
            <span style="font-weight:600;color:#64748b;">No active client visit</span>
          `}
        </div>
      </div>
    `
  }

  const _buildLiveIcon = (color = '#8b5cf6', heading = 0, name = '') => {
    const displayName = name ? name.split(' ')[0] : 'Executive'
    return `
      <div class="live-scooty-container" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; user-select: none;">
        
        <!-- Top Floating Executive Name Pill -->
        <div style="background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(6px); border: 1.5px solid ${color}; border-radius: 20px; padding: 2px 8px; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.4); margin-bottom: 2px; display: flex; align-items: center; gap: 4px; z-index: 10;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: liveBlink 1.2s infinite ease-in-out;"></span>
          <span>${displayName}</span>
        </div>

        <!-- Animated Motorcycle & Radar Ring Wrapper -->
        <div class="live-vehicle-wrapper" style="transform: rotate(${heading}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); width: 64px; height: 50px; display: flex; align-items: center; justify-content: center; position: relative;">
          
          <!-- Outer Radar Pulse Halo -->
          <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: ${color}28; border: 1.5px solid ${color}66; animation: scootyRadarPulse 2s infinite cubic-bezier(0.2, 0.8, 0.2, 1); z-index: -1;"></div>
          
          <!-- Forward Direction Arrow Pointer -->
          <div style="position: absolute; top: -6px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid ${color}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); z-index: 5;"></div>

          <!-- Direct 3D Motorcycle Rider PNG Asset from Login Form -->
          <img src="/motorcycle_rider.png" alt="Motorcycle Rider" style="width: 58px; height: 44px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));" />
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

    // Extend traveled trail polyline dynamically
    try {
      const newPt = { lat, lng }
      const pts = trailPointsRef.current
      const lastPt = pts.length > 0 ? pts[pts.length - 1] : null
      if (!lastPt || haversineDistance(lastPt.lat, lastPt.lng, lat, lng) > 0.001) {
        pts.push(newPt)
      }

      if (pts.length >= 1 && googleMapRef.current && window.google) {
        const lineSymbol = {
          path: 'M 0,-2 0,2',
          strokeOpacity: 1,
          scale: 2,
          strokeColor: '#9333ea',
          strokeWeight: 3
        }
        const gPath = pts.map(p => ({ lat: p.lat, lng: p.lng }))
        if (trackRouteRef.current) {
          trackRouteRef.current.setPath(gPath)
        } else if (gPath.length >= 2) {
          trackRouteRef.current = new window.google.maps.Polyline({
            path: gPath,
            strokeColor: '#2563eb',
            strokeOpacity: 0.85,
            strokeWeight: 5,
            geodesic: true,
            map: googleMapRef.current,
            zIndex: 15
          })
        }

        // Always render purple dashed line for executive traveled trail
        if (gPath.length >= 2) {
          const purpleSymbol = {
            path: 'M 0,-2 0,2',
            strokeOpacity: 1,
            scale: 2.5,
            strokeColor: '#9333ea', // Purple dashed line for traveled trail
            strokeWeight: 4
          }
          if (offRoutePolylineRef.current) {
            offRoutePolylineRef.current.setPath(gPath)
            if (!offRoutePolylineRef.current.getMap()) {
              offRoutePolylineRef.current.setMap(googleMapRef.current)
            }
          } else {
            offRoutePolylineRef.current = new window.google.maps.Polyline({
              path: gPath,
              geodesic: true,
              strokeOpacity: 0,
              icons: [{
                icon: purpleSymbol,
                offset: '0%',
                repeat: '14px',
              }],
              map: googleMapRef.current,
              zIndex: 20
            })
          }
        }
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
        liveMarkerRef.current = createMapMarker(
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
        if (dist >= 0.01 || timeElapsed >= 3000) {
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

      // Re-validate map after async call — it may have been unmounted
      if (!googleMapRef.current) {
        console.warn('[SmartMap] Map was destroyed while loading history, aborting.')
        return
      }
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
            destMarkerRef.current = createMapMarker(
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
          liveMarkerRef.current = createMapMarker(
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
          liveMarkerRef.current = createMapMarker(
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
          liveMarkerRef.current = createMapMarker(
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
          liveMarkerRef.current = createMapMarker(
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

        trailPointsRef.current = pathCoords

        if (pathCoords.length > 1) {
          trackRouteRef.current = new window.google.maps.Polyline({
            path: pathCoords,
            strokeColor: '#2563eb',
            strokeOpacity: 0.85,
            strokeWeight: 5,
            geodesic: true,
            map: map,
            zIndex: 15
          })

          const purpleSymbol = {
            path: 'M 0,-2 0,2',
            strokeOpacity: 1,
            scale: 2.5,
            strokeColor: '#9333ea', // Purple dashed line for traveled trail
            strokeWeight: 4
          }
          offRoutePolylineRef.current = new window.google.maps.Polyline({
            path: pathCoords,
            geodesic: true,
            strokeOpacity: 0,
            icons: [{
              icon: purpleSymbol,
              offset: '0%',
              repeat: '14px',
            }],
            map: map,
            zIndex: 20
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
        if (!map || !googleMapRef.current) {
          console.warn('[SmartMap] Map not ready for fitBounds, skipping.')
        } else {
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

    // ── Instant Sub-Second Local Broadcast & Storage Listener ──
    let bc;
    try {
      bc = new BroadcastChannel('tc_live_gps_stream')
      bc.onmessage = (event) => {
        const loc = event.data
        if (loc && loc.latitude && loc.longitude) {
          _applyNewCrumb(loc)
          fetchData(true)
        }
      }
    } catch (e) {}

    const handleInstantLocationUpdate = (e) => {
      if (e.type === 'storage' && e.key !== 'tc_executive_live_location') return
      try {
        const raw = e.type === 'storage' ? e.newValue : e.detail
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (parsed && parsed.latitude && parsed.longitude) {
          _applyNewCrumb(parsed)
          fetchData(true)
        }
      } catch (err) {}
    }

    window.addEventListener('storage', handleInstantLocationUpdate)
    window.addEventListener('tc_location_update', handleInstantLocationUpdate)

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
    }, 5000) // Optimized 5-second fallback polling for live tracking
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
      // Trigger resize so map tiles load after dashboard overlay unmounts
      window.google?.maps?.event?.trigger(googleMapRef.current, 'resize')
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
  // Group executives by Team Lead
  const teamGroups = useMemo(() => {
    if (!executives || executives.length === 0) return []

    const groupsMap = new Map()

    // 1. Identify all Team Leads in the payload
    executives.forEach(ex => {
      const roleLower = (ex.role || ex.designation || '').toLowerCase()
      const isTL = roleLower.includes('team lead') || roleLower.includes('tl') || roleLower.includes('lead')
      if (isTL) {
        const name = resolveRealName(ex)
        const key = (ex.email || ex.employee_id || name).toLowerCase().trim()
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            title: `${name}'s Team`,
            leadName: name,
            leadEmail: ex.email || '',
            leadRole: ex.role || 'Team Lead',
            executives: []
          })
        }
      }
    })

    // 2. Classify members under their Team Leads
    executives.forEach(ex => {
      const roleLower = (ex.role || ex.designation || '').toLowerCase()
      const isTL = roleLower.includes('team lead') || roleLower.includes('tl') || roleLower.includes('lead')

      if (isTL) {
        const name = resolveRealName(ex)
        const key = (ex.email || ex.employee_id || name).toLowerCase().trim()
        if (groupsMap.has(key)) {
          const group = groupsMap.get(key)
          if (!group.executives.some(e => (e.employee_id || e.id) === (ex.employee_id || ex.id))) {
            group.executives.push(ex)
          }
        }
        return
      }

      const repName = (ex.reporting_manager_name || ex.reporting_manager || '').trim()
      const repEmail = (ex.reporting_manager_email || '').toLowerCase().trim()

      let matchedKey = null
      for (const [key, group] of groupsMap.entries()) {
        if ((repEmail && group.leadEmail && repEmail === group.leadEmail.toLowerCase()) ||
            (repName && group.leadName && repName.toLowerCase().includes(group.leadName.toLowerCase())) ||
            (repName && group.leadName && group.leadName.toLowerCase().includes(repName.toLowerCase()))) {
          matchedKey = key
          break
        }
      }

      if (matchedKey && groupsMap.has(matchedKey)) {
        groupsMap.get(matchedKey).executives.push(ex)
      } else if (repName && !['not assigned', 'none', 'n/a', ''].includes(repName.toLowerCase())) {
        const cleanKey = repName.toLowerCase().trim()
        if (!['jeeva', 'manager', 'admin', 'ceo', 'super admin'].some(ignored => cleanKey.includes(ignored))) {
          if (!groupsMap.has(cleanKey)) {
            groupsMap.set(cleanKey, {
              key: cleanKey,
              title: repName.endsWith("'s Team") ? repName : `${repName}'s Team`,
              leadName: repName,
              leadEmail: repEmail,
              leadRole: 'Team Lead',
              executives: []
            })
          }
          groupsMap.get(cleanKey).executives.push(ex)
        }
      }
    })

    return Array.from(groupsMap.values()).filter(g => g.executives.length > 0)
  }, [executives])

  // Current active team group when paginated or tabbed
  const currentTeamGroup = useMemo(() => {
    if (teamGroups.length === 0) return null
    if (activeTeamFilter === 'all_combined') return null
    const validIdx = Math.min(Math.max(0, selectedTeamLeadIndex), teamGroups.length - 1)
    if (activeTeamFilter === 'all' || !activeTeamFilter) {
      return teamGroups[validIdx] || teamGroups[0]
    }
    return teamGroups.find(g => g.key === activeTeamFilter) || teamGroups[validIdx] || teamGroups[0]
  }, [teamGroups, selectedTeamLeadIndex, activeTeamFilter])

  // Filter executives based on searchQuery AND active Team Lead filter
  const filteredExecutives = useMemo(() => {
    let list = executives
    if (activeTeamFilter !== 'all_combined' && currentTeamGroup) {
      list = currentTeamGroup.executives || []
    }
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(e => {
      const name = resolveRealName(e).toLowerCase()
      const email = (e.email || '').toLowerCase()
      const role = (e.role || e.designation || '').toLowerCase()
      const code = (e.employee_code || e.employee_id || '').toLowerCase()
      return name.includes(q) || email.includes(q) || role.includes(q) || code.includes(q)
    })
  }, [executives, currentTeamGroup, activeTeamFilter, searchQuery])

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-900 font-sans">

      {/* Map container — always in DOM, pre-initialized */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* ── Card Grid Dashboard (covers map when no executive selected) ── */}
      {!selectedExecutive && (
        <div className="absolute inset-0 z-30 bg-[#f1f5f9] overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900">Smart Radar Map</h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Click a card to track live location</p>
              </div>
              <button onClick={() => { setExecutives([]); fetchData() }} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:border-blue-300 transition">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Total',
                  value: executives.length,
                  bg: 'bg-gradient-to-br from-[#0b3c5d] to-[#1a5a8a]',
                  border: 'border-[#0b3c5d]/40',
                  numColor: 'text-white',
                  labelColor: 'text-blue-200',
                  icon: <Users className="w-5 h-5 mx-auto text-blue-200" />,
                },
                {
                  label: 'Online',
                  value: executives.filter(e => e.is_online).length,
                  bg: 'bg-gradient-to-br from-emerald-700 to-emerald-500',
                  border: 'border-emerald-600/40',
                  numColor: 'text-white',
                  labelColor: 'text-emerald-100',
                  icon: (
                    <span className="relative flex h-3 w-3 mx-auto">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                    </span>
                  ),
                },
                {
                  label: 'Offline',
                  value: executives.filter(e => !e.is_online).length,
                  bg: 'bg-gradient-to-br from-slate-600 to-slate-500',
                  border: 'border-slate-500/40',
                  numColor: 'text-white',
                  labelColor: 'text-slate-200',
                  icon: (
                    <span className="relative flex h-3 w-3 mx-auto">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-350"></span>
                    </span>
                  ),
                },
              ].map(s => (
                <div key={s.label} className={`mgr-card rounded-2xl border ${s.bg} ${s.border} p-4 text-center shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex flex-col justify-between items-center min-h-[110px]`}>
                  <div className="h-6 flex items-center justify-center">{s.icon}</div>
                  <div className={`text-3xl font-black ${s.numColor} my-1`}>{s.value}</div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${s.labelColor}`}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Team Lead Selector & Pagination Control */}
            {teamGroups.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          {activeTeamFilter === 'all_combined' ? 'All Assigned Teams' : (currentTeamGroup?.title || 'Team Lead View')}
                        </h3>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                          {filteredExecutives.length} Executives
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {activeTeamFilter === 'all_combined'
                          ? 'Displaying combined list across all team leads'
                          : `Reporting to Team Lead: ${currentTeamGroup?.leadName || 'Team Lead'}`}
                      </p>
                    </div>
                  </div>

                  {/* Pagination Controls (shown when there are multiple Team Leads) */}
                  {teamGroups.length > 1 && (
                    <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl p-1">
                      <button
                        onClick={() => {
                          const nextIdx = (selectedTeamLeadIndex - 1 + teamGroups.length) % teamGroups.length
                          setSelectedTeamLeadIndex(nextIdx)
                          setActiveTeamFilter(teamGroups[nextIdx].key)
                        }}
                        className="p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-xs transition flex items-center gap-1 text-xs font-black"
                        title="Previous Team Lead"
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev Team
                      </button>

                      <div className="text-xs font-black text-slate-800 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs min-w-[110px] text-center select-none">
                        {activeTeamFilter === 'all_combined' ? 'All Teams' : `Team ${selectedTeamLeadIndex + 1} of ${teamGroups.length}`}
                      </div>

                      <button
                        onClick={() => {
                          const nextIdx = (selectedTeamLeadIndex + 1) % teamGroups.length
                          setSelectedTeamLeadIndex(nextIdx)
                          setActiveTeamFilter(teamGroups[nextIdx].key)
                        }}
                        className="p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-xs transition flex items-center gap-1 text-xs font-black"
                        title="Next Team Lead"
                      >
                        Next Team <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Team Lead Tabs (shown when there are multiple Team Leads) */}
                {teamGroups.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
                    <button
                      onClick={() => setActiveTeamFilter('all_combined')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                        activeTeamFilter === 'all_combined'
                          ? 'bg-[#0b3c5d] text-white border-[#0b3c5d] shadow-sm scale-102'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>🌐 All Teams Combined</span>
                      <span className="opacity-80 text-[10px] font-bold">({executives.length})</span>
                    </button>

                    {teamGroups.map((group, idx) => {
                      const isActive = activeTeamFilter !== 'all_combined' && (activeTeamFilter === group.key || selectedTeamLeadIndex === idx)
                      return (
                        <button
                          key={group.key}
                          onClick={() => {
                            setSelectedTeamLeadIndex(idx)
                            setActiveTeamFilter(group.key)
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>👑 {group.title}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {group.executives.length}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search team member..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Executive Cards */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredExecutives.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-semibold">No executives found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExecutives.map(ex => {
                  const name = resolveRealName(ex)
                  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                  const isCV = ex.check_in_mode === 'Client Visit'
                  const statusColor = !ex.is_online ? '#94a3b8' : isCV ? '#8b5cf6' : '#10b981'
                  const statusLabel = !ex.is_online ? 'Offline' : isCV ? 'Client Visit' : 'Field Active'
                  const userReplies = getUserReplies(ex)
                  const unreadCount = userReplies.filter(r => !r.read).length
                  const hasReply = userReplies.length > 0

                  // Card background based on status
                  const cardBg = !ex.is_online
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    : isCV
                    ? 'bg-violet-50 border-violet-200 hover:bg-violet-100 hover:border-violet-400'
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'

                  return (
                    <button
                      key={ex.employee_id || ex.id}
                      onClick={() => handleSelectExecutive(ex)}
                      className={`mgr-card text-left rounded-2xl p-4 shadow-2xs hover:shadow-md active:scale-[0.98] transition-all duration-150 group border relative ${cardBg}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: statusColor }}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 text-sm truncate pr-6">{name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{ex.designation || ex.role || 'Sales Executive'}</div>
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: statusColor + '15', color: statusColor, borderColor: statusColor + '40' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                            {statusLabel}
                          </div>
                        </div>

                        {/* WhatsApp-style Corner Chat Icon + Unread Counter Badge */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            setInquiryModalEx(ex)
                            markRepliesAsRead(ex)
                          }}
                          className={`relative p-2.5 rounded-2xl transition active:scale-95 flex items-center justify-center cursor-pointer group/chat shrink-0 ${
                            unreadCount > 0
                              ? 'bg-red-500 text-white border border-red-600 shadow-md animate-pulse'
                              : hasReply
                              ? 'bg-emerald-500 text-white border border-emerald-600 shadow-sm'
                              : 'bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200'
                          }`}
                          title="Ask Inquiry / View Executive Replies"
                        >
                          <MessageSquare size={16} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 bg-red-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                              {unreadCount}
                            </span>
                          )}
                          {unreadCount === 0 && hasReply && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                          )}
                        </div>
                      </div>

                      {hasReply && (
                        <div className={`mt-2.5 text-[10px] rounded-xl p-2 border font-extrabold flex items-center gap-1.5 truncate ${
                          unreadCount > 0
                            ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          <MessageCircle size={12} className={unreadCount > 0 ? 'text-red-500 shrink-0 animate-bounce' : 'text-emerald-600 shrink-0'} />
                          <span className="truncate">Reply: "{userReplies[0].message}"</span>
                        </div>
                      )}

                      {ex.is_online && (
                        <div className="mt-3 pt-3 border-t border-white/60 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                          <span>In: {ex.check_in_time || '—'}</span>
                          <span className="text-emerald-700 font-black group-hover:underline">Track live ➔</span>
                        </div>
                      )}
                      {!ex.is_online && (
                        <div className="mt-3 pt-3 border-t border-white/60 text-[10px] text-slate-400 font-semibold italic">
                          Last seen: {ex.last_seen_at ? formatLastSeen(ex.last_seen_at) : 'Never'}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Map Tracking Overlay (when executive is selected) ── */}
      {selectedExecutive && (
        <>
          {isTrackingMinimized ? (
            <div className="absolute top-5 left-5 z-20 w-80 bg-white/95 border border-slate-200 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-800 pointer-events-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-black truncate text-slate-900">{resolveRealName(selectedExecutive)}</div>
                  <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
                    {destClient && destRouteMeta ? `${destRouteMeta.etaMins} mins remaining (${destRouteMeta.distanceKm.toFixed(1)} km)` : 'Live GPS Active'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setIsTrackingMinimized(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button onClick={() => { _clearTrackingLayer(); setSelectedExecutive(null); setIsTrackingMinimized(false) }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-4 left-4 right-4 top-auto lg:bottom-auto lg:top-5 lg:left-5 lg:right-auto lg:w-84 z-20 bg-white/98 border border-slate-200 rounded-2xl p-5 shadow-2xl text-slate-800 pointer-events-auto flex flex-col gap-4 max-h-[55vh] lg:max-h-[calc(100vh-7rem)] overflow-y-auto animate-in slide-in-from-bottom lg:slide-in-from-top duration-200 font-sans">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button onClick={() => { _clearTrackingLayer(); setSelectedExecutive(null); setIsTrackingMinimized(false) }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex-shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="font-black text-slate-900 text-sm">{resolveRealName(selectedExecutive)}</div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{selectedExecutive.designation || selectedExecutive.role || 'Sales Executive'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setIsTrackingMinimized(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { _clearTrackingLayer(); setSelectedExecutive(null); setIsTrackingMinimized(false) }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Heartbeat & Signal */}
              <div className="flex items-center gap-2">
                {(() => {
                  const hb = getHeartbeatStatus()
                  return (
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${hb.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hb.dot}`} />
                      {hb.label}
                    </div>
                  )
                })()}
                {lastPingMs && (
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Last ping {Math.round((Date.now() - lastPingMs) / 1000)}s ago
                  </span>
                )}
              </div>

              {/* Proximity Status */}
              {(() => {
                const badge = getTrackingBadge(trackStatus === 'ended' ? 'ended' : trackStatus, lastPingMs, selectedExecutive?.is_online)
                const prox = getProximityStatus()
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Track Status</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        prox === 'Arrived' ? 'bg-emerald-100 text-emerald-700' :
                        prox === 'Near Location' ? 'bg-blue-100 text-blue-700' :
                        prox === 'At Start Location' ? 'bg-amber-100 text-amber-800' :
                        prox === 'Idle' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                        prox === 'Travelling' ? 'bg-violet-100 text-violet-700' :
                        'bg-slate-100 text-slate-400'
                      }`}>{prox}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: badge.color }}>
                      <span>{badge.dot}</span> {badge.label}
                    </div>
                  </div>
                )
              })()}

              {/* Client Destination */}
              {destClient && (() => {
                const clientContactInfo = candidatesRef.current?.find(c => String(c.id) === String(destClient.id)) || destClient;
                return (
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-1.5">
                    <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Client Visit</div>
                    <div className="font-black text-slate-900 text-sm">{destClient.company_name || destClient.title}</div>
                    {destClient.address && <div className="text-[11px] text-slate-500 font-semibold">{destClient.address}</div>}
                    {destRouteMeta && (
                      <div className="flex gap-3 mt-1.5 text-[11px] font-bold">
                        <span className="text-violet-700">🕒 {destRouteMeta.etaMins} min</span>
                        <span className="text-slate-500">📍 {destRouteMeta.distanceKm.toFixed(1)} km</span>
                      </div>
                    )}
                    {clientContactInfo?.contact_person && (
                      <div className="text-[11px] text-slate-600 font-semibold">👤 {clientContactInfo.contact_person}</div>
                    )}
                    {clientContactInfo?.phone && (
                      <a href={`tel:${clientContactInfo.phone}`} className="text-[11px] text-blue-600 font-bold">📞 {clientContactInfo.phone}</a>
                    )}
                  </div>
                )
              })()}

              {/* Breadcrumb count */}
              {trackBreadcrumbs.length > 0 && (
                <div className="text-[10px] text-slate-400 font-semibold">
                  {trackBreadcrumbs.length} location points recorded today
                </div>
              )}
            </div>
          )}

          {trackStatus !== 'idle' && trackStatus !== 'loading' && (
            <div className="absolute bottom-5 right-5 z-20 bg-slate-900/90 border border-white/10 rounded-xl p-3 text-[10px] font-bold space-y-1.5 backdrop-blur-md text-white">
              <div className="flex items-center gap-2"><div className="w-6 h-1.5 bg-blue-500 rounded flex-shrink-0" /> Driving Route</div>
              <div className="flex items-center gap-2"><div className="w-6 h-0.5 border-t-2 border-dashed border-purple-400 flex-shrink-0" /> Traveled Route</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white font-extrabold border border-white"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span> Client destination</div>
            </div>
          )}
        </>
      )}
      {/* ── Manager Quick Inquiry & Replies Modal ── */}
      {inquiryModalEx && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                  💬
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{resolveRealName(inquiryModalEx)}</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Executive Inquiry & Replies</p>
                </div>
              </div>
              <button onClick={() => setInquiryModalEx(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Executive replies chat history */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Executive Responses Chat History</span>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {getUserReplies(inquiryModalEx).length} Messages
                </span>
              </div>
              {(() => {
                const replies = getUserReplies(inquiryModalEx)
                if (replies.length === 0) {
                  return <p className="text-xs text-slate-400 italic py-2">No response messages received yet.</p>
                }
                return replies.map((r, i) => (
                  <div key={r.id || i} className="bg-slate-50 rounded-2xl p-3 border border-slate-200/90 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                        💬 {r.sender_name || resolveRealName(inquiryModalEx)}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">"{r.message}"</p>
                  </div>
                ))
              })()}
            </div>

            {/* Send Quick Question Chips */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Send Quick Inquiry</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '🚦 In Traffic?', q: 'Why are you stopped? Are you in traffic?' },
                  { label: '🤝 Client Meeting?', q: 'Are you currently in a client meeting?' },
                  { label: '⛽ Bike / Fuel Stop?', q: 'Are you stopped for fuel or vehicle issue?' },
                  { label: '☕ Tea / Break?', q: 'Taking a lunch / tea break?' },
                ].map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleSendInquiry(inquiryModalEx, chip.q)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-left text-xs font-bold text-slate-700 transition active:scale-95 cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Box */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInquiryText}
                onChange={e => setCustomInquiryText(e.target.value)}
                placeholder="Type custom question..."
                className="flex-1 px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                onClick={() => handleSendInquiry(inquiryModalEx)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition flex items-center gap-1 cursor-pointer"
              >
                <Send size={12} /> Send
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

