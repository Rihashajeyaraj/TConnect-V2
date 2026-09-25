import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  MapPin, Navigation, Compass, Search, Phone, Calendar,
  CheckCircle2, Clock, User, Building2, X, Plus,
  Navigation2, Bell, Sparkles, PhoneCall, Check, Map as MapIcon,
  ChevronRight, AlertCircle, Loader2, Route, Target,
  ArrowLeft, List, Radio, Activity, AlertTriangle, MessageSquare, Send, MessageCircle, RefreshCw, Zap
} from 'lucide-react'
import { crmAPI, customerAPI, visitAPI, spatialAPI, authAPI, settingsAPI, auditAPI, notificationAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { loadGoogleMaps } from '../../utils/loadGoogleMaps.js'
import { filterUserItems } from '../../utils/userScope.js'
import { detectRouteClients, shouldNotify } from '../../utils/routeProximityUtils.js'

// Supabase client initialization for live tracking broadcast
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
let supabaseClient = window.__supabase_client || null
try {
  if (SUPA_URL && SUPA_ANON && !supabaseClient) {
    supabaseClient = createClient(SUPA_URL, SUPA_ANON)
    window.__supabase_client = supabaseClient
  }
} catch (e) {}

import MAP_CONFIG from '../../config/mapConfig.js'
import { snapToRoadGeometry } from '../../utils/roadSnapping.js'
import { enqueueOfflineCrumb, flushOfflineQueue } from '../../utils/offlineQueue.js'
import liveTrackingBike from '../../assets/live-tracking-bike.png'

// ─── Configuration (Centralized Technical Thresholds & Fallback Viewport) ─────
const ROUTE_REFETCH_DISTANCE_KM = MAP_CONFIG.ROUTE_REFETCH_DISTANCE_KM
const OFF_ROUTE_THRESHOLD_KM    = MAP_CONFIG.OFF_ROUTE_THRESHOLD_KM
const ARRIVAL_RADIUS_KM         = MAP_CONFIG.ARRIVAL_RADIUS_KM
const DEFAULT_CENTER            = MAP_CONFIG.DEFAULT_VIEWPORT_CENTER


// ─── Helpers ──────────────────────────────────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Minimum Haversine distance from a point to any segment of a polyline */
function distanceToPolyline(lat, lng, polyline) {
  let minD = Infinity
  for (const pt of polyline) {
    const d = haversineDistance(lat, lng, pt[0], pt[1])
    if (d < minD) minD = d
  }
  return minD
}

/** Decode Google's Encoded Polyline algorithm */
export function decodePolyline(encoded) {
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

/** Extract coordinates from URL/string/landmark dict (unchanged) */
const LANDMARK_COORDS = {
  'vijaya mall': { lat: 13.0515, lng: 80.2100 }, 'forum mall': { lat: 13.0515, lng: 80.2100 },
  'vadapalani':  { lat: 13.0515, lng: 80.2100 }, 'adyar':      { lat: 13.0067, lng: 80.2570 },
  'guindy':      { lat: 12.9815, lng: 80.2180 }, 't. nagar':   { lat: 13.0418, lng: 80.2341 },
  't nagar':     { lat: 13.0418, lng: 80.2341 }, 'omr':        { lat: 12.9716, lng: 80.2450 },
  'velachery':   { lat: 12.9815, lng: 80.2180 }, 'tidal park': { lat: 12.9890, lng: 80.2470 },
  'chennai central': { lat: 13.0827, lng: 80.2707 }, 'bangalore': { lat: 12.9716, lng: 77.5946 },
}

export function extractCoordsFromUrlOrString(str) {
  if (!str) return null
  const s = String(str).trim()
  const atMatch = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  const qMatch = s.match(/(?:q|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  const plainMatch = s.match(/^[^?#]*?(-?\d+\.\d{3,})\s*,\s*(-?\d+\.\d{3,})/)
  if (plainMatch) return { lat: parseFloat(plainMatch[1]), lng: parseFloat(plainMatch[2]) }
  const sLower = s.toLowerCase()
  for (const [k, coords] of Object.entries(LANDMARK_COORDS)) {
    if (sLower.includes(k)) return coords
  }
  return null
}

export function getDirectionsUrl(item, execLat, execLng) {
  if (!item) return '#'
  if (item.latitude && item.longitude) {
    return `https://www.google.com/maps/dir/?api=1&origin=${execLat},${execLng}&destination=${item.latitude},${item.longitude}`
  }
  const rawLoc = String(item.address || item.location || item.title || 'Chennai').trim()
  return `https://www.google.com/maps/dir/?api=1&origin=${execLat},${execLng}&destination=${encodeURIComponent(rawLoc)}`
}

// ─── Status badge colours ─────────────────────────────────────────────────────
function categoryColor(cat) {
  if (cat === 'Lead')     return 'bg-rose-50 text-rose-700 border-rose-200'
  if (cat === 'Customer') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

function alertTypeLabel(alertType) {
  if (alertType === 'previous')  return { label: 'Previous Client', color: 'from-purple-600 to-indigo-600', border: 'border-purple-500/25' }
  if (alertType === 'scheduled') return { label: 'Scheduled Visit', color: 'from-amber-500 to-orange-600', border: 'border-amber-500/25' }
  return { label: 'Client on Route', color: 'from-emerald-600 to-teal-600', border: 'border-emerald-500/25' }
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

    setPosition(latlng) {
      this.latlng = latlng
      this.draw()
    }

    getPosition() {
      return this.latlng
    }

    animateTo(newLatLng, duration = 800, targetHeading = null) {
      if (!this.latlng || !newLatLng) {
        this.setLatLng(newLatLng)
        return
      }

      const startLat = typeof this.latlng.lat === 'function' ? this.latlng.lat() : this.latlng.lat
      const startLng = typeof this.latlng.lng === 'function' ? this.latlng.lng() : this.latlng.lng
      const endLat = typeof newLatLng.lat === 'function' ? newLatLng.lat() : newLatLng.lat
      const endLng = typeof newLatLng.lng === 'function' ? newLatLng.lng() : newLatLng.lng

      if (Math.abs(startLat - endLat) < 0.000005 && Math.abs(startLng - endLng) < 0.000005) return

      let heading = targetHeading
      if (heading === null || heading === undefined) {
        const dLng = (endLng - startLng) * Math.PI / 180
        const y = Math.sin(dLng) * Math.cos(endLat * Math.PI / 180)
        const x = Math.cos(startLat * Math.PI / 180) * Math.sin(endLat * Math.PI / 180) -
                  Math.sin(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) * Math.cos(dLng)
        heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
      }

      if (this.div) {
        const riderImg = this.div.querySelector('img')
        if (riderImg) {
          riderImg.style.transition = 'transform 0.4s ease'
          riderImg.style.transform = `rotate(${heading}deg)`
        }
      }

      if (this.animId) cancelAnimationFrame(this.animId)

      const startTime = performance.now()
      const animateStep = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const ease = progress * (2 - progress)

        const curLat = startLat + (endLat - startLat) * ease
        const curLng = startLng + (endLng - startLng) * ease

        this.latlng = new window.google.maps.LatLng(curLat, curLng)
        this.draw()

        if (progress < 1) {
          this.animId = requestAnimationFrame(animateStep)
        } else {
          this.animId = null
        }
      }

      this.animId = requestAnimationFrame(animateStep)
    }
  }
  return HTMLMapMarker
}

function createMapMarker(latlng, map, html, onClick, anchor = 'center') {
  initializeHTMLMapMarker()
  if (!HTMLMapMarker) {
    console.warn('[SmartClientMap] OverlayView not ready for HTMLMapMarker')
    return null
  }
  return new HTMLMapMarker(latlng, map, html, onClick, anchor)
}

export function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not defined'))
  if (window.L && typeof window.L.map === 'function') {
    return Promise.resolve(window.L)
  }
  return new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(window.L)
    script.onerror = (err) => reject(err)
    document.head.appendChild(script)
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartClientMap({ isManagerView = false }) {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()
  const userRoleLower = String(currentUser?.role || currentUser?.designation || '').toLowerCase()
  const isManager = isManagerView || userRoleLower.includes('manager') || userRoleLower.includes('ceo') || userRoleLower.includes('admin')

  // Refs
  const mapContainerRef  = useRef(null)
  const googleMapRef     = useRef(null)
  const leafletMapRef    = useRef(null)
  const execMarkerRef    = useRef(null)
  const activeMarkersRef = useRef([])
  const activePolylinesRef = useRef([])
  const accuracyCircleRef = useRef(null)
  const infoWindowRef    = useRef(null)
  const dismissedAlerts  = useRef(new Set())    // session-scoped dismissed ids
  const notifiedClientsMap = useRef(new globalThis.Map())  // Map<id,{lat,lng}> for hysteresis deduplication
  const execPosRef        = useRef(DEFAULT_CENTER) // latest GPS pos, no re-render dep
  const allCandidatesRef  = useRef([])             // latest candidates, no re-render dep
  const lastRoutePos     = useRef(null)         // last OSRM fetch position
  const routeFetchTimer  = useRef(null)         // debounce timer id
  const trailPolylineRef = useRef(null)         // Traveled breadcrumb polyline
  const trailOuterPolylineRef = useRef(null)    // Dark casing road polyline for high contrast
  const snappedPathRef   = useRef([])           // Road-matched snapped path coordinates
  const matchBatchTimerRef = useRef(null)       // Debounce timer for OSRM road matching
  const startMarkerRef   = useRef(null)         // Green START point marker
  const trailPointsRef   = useRef([])           // Breadcrumb points array
  const lastTelemetryUpdate = useRef(0)         // throttled updates tracking
  const lastBroadcastTime   = useRef(0)         // throttled 1s broadcast tracking
  const lastUiRenderTime = useRef(0)            // P2 throttled React UI renders tracking
  const lastStableMarkerPosRef = useRef(null)   // Stationary marker anchor filter
  const hasCenteredOnGpsRef = useRef(false)     // initial GPS pan tracking

  // ── GPS & Map ────────────────────────────────────────────────────────────
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
  const [mapLoaded,    setMapLoaded]    = useState(false)

  const _triggerBatchRoadMatching = useCallback((pts) => {
    if (!pts || pts.length < 2) return;
    if (matchBatchTimerRef.current) clearTimeout(matchBatchTimerRef.current);

    matchBatchTimerRef.current = setTimeout(async () => {
      try {
        const res = await spatialAPI.matchRoute(pts);
        if (res?.success && Array.isArray(res.polyline) && res.polyline.length >= 2) {
          snappedPathRef.current = res.polyline.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }));
          if (trailPolylineRef.current && googleMapRef.current) {
            trailPolylineRef.current.setPath(snappedPathRef.current);
          }
        }
      } catch (err) {
        console.warn("[SmartClientMap] Batch road matching failed, staying on filtered GPS fallback:", err);
      }
    }, 1500);
  }, []);
  const [gpsStatus,    setGpsStatus]    = useState('loading') // 'loading'|'active'|'denied'|'unavailable'
  const [executivePos, setExecutivePos] = useState(DEFAULT_CENTER)
  const [gpsAccuracy, setGpsAccuracy]   = useState(null)
  const [gpsAccuracyThreshold, setGpsAccuracyThreshold] = useState(100.0)
  const [isRefreshingMap, setIsRefreshingMap] = useState(false)

  const handleRefreshMap = useCallback(async () => {
    setIsRefreshingMap(true)
    showToast('Refreshing live location & client radar data…', 'info')
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lng = pos.coords.longitude
            const newPos = { lat, lng }
            setExecutivePos(newPos)
            if (pos.coords.accuracy) setGpsAccuracy(pos.coords.accuracy)
            setGpsStatus('active')
            if (googleMapRef.current) {
              googleMapRef.current.panTo(newPos)
            }
          },
          () => null,
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      }

      const [leadsRes, custRes, visitsRes] = await Promise.allSettled([
        crmAPI.getLeads(),
        customerAPI.getCustomers(),
        visitAPI.getVisits()
      ])

      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) {
        setRawLeads(filterUserItems(leadsRes.value, currentUser))
      }
      if (custRes.status === 'fulfilled' && Array.isArray(custRes.value)) {
        setRawCustomers(filterUserItems(custRes.value, currentUser))
      }
      if (visitsRes.status === 'fulfilled' && Array.isArray(visitsRes.value)) {
        setRawVisits(filterUserItems(visitsRes.value, currentUser))
      }

      showToast('Map & Live Radar data refreshed!', 'success')
    } catch (err) {
      showToast('Refreshed map coordinates.', 'success')
    } finally {
      setTimeout(() => setIsRefreshingMap(false), 500)
    }
  }, [currentUser, showToast])

  // ── Data ─────────────────────────────────────────────────────────────────
  const [rawLeads,     setRawLeads]     = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sm_leads");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  })
  const [rawCustomers, setRawCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_customer_accounts");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  })
  const [rawVisits,    setRawVisits]    = useState(() => {
    try {
      const saved = localStorage.getItem("tc_sales_visits");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  })
  const [dataLoading,  setDataLoading]  = useState(() => {
    return !(localStorage.getItem("tc_sm_leads") || localStorage.getItem("tc_customer_accounts"));
  })
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(5)
  const [showOnlyNearby, setShowOnlyNearby] = useState(true)

  // ── Unplanned / Quick Visit Modal State ─────────────────────────────────────
  const [showUnplannedModal, setShowUnplannedModal] = useState(false)
  const [unplannedForm, setUnplannedForm] = useState({
    client_name: '',
    contact_person: '',
    phone: '',
    location: '',
    purpose: 'Unplanned Client Meeting & Site Visit',
    notes: '',
    latitude: null,
    longitude: null,
    useCurrentGps: true
  })
  const activeNavVisitIdRef = useRef(null)

  // ── Executive Mobile Inquiry Response State ────────────────────────────────
  const [activeInquiry, setActiveInquiry] = useState(null)
  const activeInquiryRef = useRef(null)
  const [showInquiryDrawer, setShowInquiryDrawer] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isReplying, setIsReplying] = useState(false)


  // In-memory set for instantly dismissed inquiry IDs/keys
  const dismissedInquiryIdsRef = useRef(new Set())

  // Composite fingerprint for an inquiry to avoid ID mismatch or repeat popups
  const getInquiryKey = (n) => {
    if (!n) return ''
    const id = n.id || n.notification_id
    if (id) return String(id).toLowerCase().trim()
    const msg = n.message || n.description || n.title || ''
    return String(msg).toLowerCase().trim()
  }

  // Helper for persistent handled inquiry keys across page reloads
  const getHandledInquiryKeys = () => {
    try {
      const raw = localStorage.getItem('tc_handled_inquiry_keys')
      if (!raw) return new Set()
      const arr = JSON.parse(raw)
      return new Set(arr.map(x => String(x).toLowerCase().trim()).filter(Boolean))
    } catch {
      return new Set()
    }
  }

  const addHandledInquiryKey = (inquiry) => {
    if (!inquiry) return
    try {
      const keys = getHandledInquiryKeys()
      const key = getInquiryKey(inquiry)
      if (key) keys.add(key)
      if (inquiry.id) keys.add(String(inquiry.id).toLowerCase().trim())
      if (inquiry.notification_id) keys.add(String(inquiry.notification_id).toLowerCase().trim())
      if (inquiry.message) keys.add(String(inquiry.message).toLowerCase().trim())
      if (inquiry.title) keys.add(String(inquiry.title).toLowerCase().trim())
      
      // Also record in memory for instant filtering
      keys.forEach(k => dismissedInquiryIdsRef.current.add(k))

      localStorage.setItem('tc_handled_inquiry_keys', JSON.stringify(Array.from(keys).slice(-300)))
    } catch (e) { console.warn('Save handled inquiry key err:', e) }
  }

  const isCheckingInquiriesRef = useRef(false)

  // Poll for Manager Location Inquiries
  useEffect(() => {
    const checkInquiries = async () => {
      if (isCheckingInquiriesRef.current) return
      isCheckingInquiriesRef.current = true
      try {
        const res = await notificationAPI.getNotifications({ silentError: true, timeout: 5000 }).catch(() => null)
        const notifs = Array.isArray(res) ? res : (res?.data || [])
        const handledKeys = getHandledInquiryKeys()

        const inquiries = notifs.filter(n => {
          const cat = String(n.category || n.type || '').toUpperCase()
          const title = String(n.title || '')
          // Exclude replies! A reply sent by executive or received from another party is NOT an inquiry prompt.
          if (cat.includes('REPLY') || title.includes('Reply')) return false
          if (!cat.includes('INQUIRY') && !title.includes('Inquiry')) return false
          if (n.read || n.is_read) return false
          
          // Exclude notifications sent by the executive themselves or meant for manager
          const senderEmail = String(n.sender_email || n.email || '').toLowerCase().trim()
          const myEmail = String(currentUser?.email || getStoredUser()?.email || '').toLowerCase().trim()
          if (myEmail && senderEmail === myEmail) return false

          const senderRole = String(n.sender_role || '').toLowerCase()
          if (senderRole.includes('executive')) return false
          if (n.recipient_role && String(n.recipient_role).toLowerCase() === 'manager') return false

          const key = getInquiryKey(n)
          const rawId = String(n.id || n.notification_id || '').toLowerCase().trim()
          const rawMsg = String(n.message || n.description || '').toLowerCase().trim()

          // Check both in-memory dismissals and localStorage
          if (dismissedInquiryIdsRef.current.has(key) || 
              (rawId && dismissedInquiryIdsRef.current.has(rawId)) || 
              (rawMsg && dismissedInquiryIdsRef.current.has(rawMsg)) ||
              handledKeys.has(key) || 
              (rawId && handledKeys.has(rawId)) || 
              (rawMsg && handledKeys.has(rawMsg))) {
            return false
          }
          return true
        })

        if (inquiries.length > 0) {
          const nextInquiry = inquiries[0]
          const nextKey = getInquiryKey(nextInquiry)
          if (activeInquiryRef.current && getInquiryKey(activeInquiryRef.current) === nextKey) return
          
          // Only pop up if not recently dismissed
          if (!dismissedInquiryIdsRef.current.has(nextKey)) {
            activeInquiryRef.current = nextInquiry
            setActiveInquiry(nextInquiry)
            try {
              const rName = nextInquiry.sender_name || 'Reporting Manager'
              showToast(`💬 New Inquiry from ${rName}`, 'info')
            } catch (_) {}
          }
        } else if (activeInquiryRef.current) {
          activeInquiryRef.current = null
          setActiveInquiry(null)
        }
      } catch (e) {
        // Silent catch for background inquiry polling
      } finally {
        isCheckingInquiriesRef.current = false
      }
    }

    checkInquiries()
    const interval = setInterval(checkInquiries, 15000)
    const handleNotifEvent = () => checkInquiries()
    window.addEventListener('tc_notifications_updated', handleNotifEvent)
    window.addEventListener('tc_inquiry_received', handleNotifEvent)

    return () => {
      clearInterval(interval)
      window.removeEventListener('tc_notifications_updated', handleNotifEvent)
      window.removeEventListener('tc_inquiry_received', handleNotifEvent)
    }
  }, [currentUser?.email, showToast])

  // ── Auto-Open Executive Inquiry Drawer from URL query param (e.g. /sales/map?inquiry_id=xxx) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const targetInquiryId = params.get('inquiry_id')
    if (!targetInquiryId) return

    const locateAndOpenInquiry = async () => {
      try {
        const res = await notificationAPI.getNotifications({ silentError: true })
        const notifs = Array.isArray(res) ? res : (res?.data || [])
        const match = notifs.find(n => {
          const rawId = String(n.id || n.notification_id || '').toLowerCase().trim()
          return rawId === targetInquiryId.toLowerCase().trim()
        })
        if (match) {
          activeInquiryRef.current = match
          setActiveInquiry(match)
          setShowInquiryDrawer(true)
        }
      } catch (err) {
        console.warn('Failed to auto-open executive inquiry deep link:', err)
      }
    }

    locateAndOpenInquiry()
  }, [])

  const resolveSenderBadge = (inquiry) => {
    if (!inquiry) return { role: 'Reporting Manager', icon: '👑', badgeText: 'text-amber-800 bg-amber-100 border-amber-300', title: 'Message from Reporting Manager', border: 'border-2 border-amber-400' }
    const rawRole = String(inquiry.sender_role || inquiry.role || inquiry.category || '').toLowerCase()
    const rawSender = String(inquiry.sender_name || inquiry.title || '').toLowerCase()
    const senderName = inquiry.sender_name || 'Authority'

    if (rawRole.includes('ceo') || rawSender.includes('ceo')) {
      return {
        role: 'CEO',
        icon: '🏛️',
        badgeText: 'text-purple-900 bg-purple-100 border-purple-300',
        title: `🏛️ Direct Message from CEO (${senderName})`,
        border: 'border-2 border-purple-500 shadow-purple-500/20'
      }
    }
    if (rawRole.includes('lead') || rawRole.includes('tl') || rawSender.includes('team lead')) {
      return {
        role: 'Team Lead',
        icon: '⭐',
        badgeText: 'text-[#543D30] bg-[#F3ECE2] border-[#D4BCA8]',
        title: `⭐ Message from Team Lead (${senderName})`,
        border: 'border-2 border-[#8B5E3C] shadow-[#8B5E3C]/20'
      }
    }
    return {
      role: 'Reporting Manager',
      icon: '👑',
      badgeText: 'text-blue-900 bg-blue-100 border-blue-300',
      title: `👑 Message from Reporting Manager (${senderName})`,
      border: 'border-2 border-blue-500 shadow-blue-500/20'
    }
  }

  const handleDismissInquiry = (inquiry) => {
    const targetInquiry = inquiry || activeInquiry || activeInquiryRef.current
    activeInquiryRef.current = null
    setActiveInquiry(null)
    setShowInquiryDrawer(false)
    setReplyText('')

    try {
      if (targetInquiry) {
        addHandledInquiryKey(targetInquiry)
        const notifId = String(targetInquiry.id || targetInquiry.notification_id || '')
        if (notifId) notificationAPI.markRead(notifId).catch(() => null)
      }
      window.dispatchEvent(new Event('tc_notifications_updated'))
    } catch (e) {
      console.warn('Dismiss inquiry notice:', e)
    }
  }


  const handleSendReplyToManager = async (chipText) => {
    const textToSend = chipText || replyText
    if (!textToSend) return
    setIsReplying(true)

    const currentInquiry = activeInquiry
    if (currentInquiry) {
      addHandledInquiryKey(currentInquiry)
      const notifId = String(currentInquiry.id || currentInquiry.notification_id || '')
      if (notifId) notificationAPI.markRead(notifId).catch(() => null)
    }
    activeInquiryRef.current = null
    setActiveInquiry(null)

    const myName = currentUser?.name || currentUser?.full_name || getStoredUser()?.name || 'Sales Executive'
    const myEmail = currentUser?.email || getStoredUser()?.email || ''
    const myCode = currentUser?.employee_code || currentUser?.employee_id || getStoredUser()?.employee_code || 'EMP000012'

    // Target the specific manager who sent the inquiry
    const targetEmail = currentInquiry?.sender_email || currentInquiry?.email || ''
    const targetId = currentInquiry?.sender_id || currentInquiry?.employee_id || ''
    const targetName = currentInquiry?.sender_name || 'Reporting Manager'

    try {
      await notificationAPI.sendNotification({
        title: `💬 Location Inquiry Reply from ${myName} to ${targetName}`,
        message: textToSend,
        category: 'LOCATION_INQUIRY_REPLY',
        type: 'LOCATION_INQUIRY_REPLY',
        recipient_role: 'manager',
        recipient_email: targetEmail,
        recipient_id: targetId,
        employee_id: myCode,
        sender_name: myName,
        sender_email: myEmail
      })
      showToast(`Reply sent to ${targetName}!`, 'success')
      setReplyText('')
      setShowInquiryDrawer(false)
      window.dispatchEvent(new Event('tc_notifications_updated'))
    } catch (err) {
      showToast('Failed to send reply', 'error')
    } finally {
      setIsReplying(false)
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('')
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [activeTab,     setActiveTab]     = useState('leads')
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [searchExpanded, setSearchExpanded] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Route ─────────────────────────────────────────────────────────────────
  // Load config dynamically on mount with instant localStorage cache
  useEffect(() => {
    if (window.google?.maps?.Map && typeof window.google.maps.Map === 'function') {
      initializeHTMLMapMarker()
      setMapLoaded(true)
      return
    }

    const cachedKey = localStorage.getItem('tc_gmaps_key')
    if (cachedKey) {
      setGoogleMapsApiKey(cachedKey)
      loadGoogleMaps(cachedKey)
        .then(maps => {
          if (maps && window.google?.maps?.Map) {
            initializeHTMLMapMarker()
          }
          setMapLoaded(true)
        })
        .catch(err => {
          console.warn('Cached Google Maps load notice, loading Leaflet fallback:', err)
          loadLeaflet().then(() => setMapLoaded(true)).catch(() => setMapLoaded(true))
        })
    }

    settingsAPI.getConfig()
      .then(res => {
        const threshold = res?.data?.gps_accuracy_threshold
        if (threshold != null && !isNaN(threshold)) {
          setGpsAccuracyThreshold(Number(threshold))
        }
        const key = res?.data?.google_maps_api_key
        if (!key && !cachedKey) {
          return loadLeaflet()
        }
        if (key) {
          localStorage.setItem('tc_gmaps_key', key)
          setGoogleMapsApiKey(key)
          return loadGoogleMaps(key)
        }
      })
      .then(maps => {
        if (maps && window.google?.maps?.Map) {
          initializeHTMLMapMarker()
        }
        setMapLoaded(true)
      })
      .catch(err => {
        console.error('Failed to load Google Maps SDK, initializing Leaflet fallback:', err)
        loadLeaflet().then(() => setMapLoaded(true)).catch(() => setMapLoaded(true))
      })
  }, [])
  const [selectedStop,  setSelectedStop]  = useState(null)     // current destination
  const [routePath,     setRoutePath]     = useState([])       // [[lat,lng],…]
  const [routeDetails,  setRouteDetails]  = useState(null)     // {distanceKm, durationMins}
  const [routeStatus,   setRouteStatus]   = useState('idle')   // 'idle'|'loading'|'found'|'failed'|'fallback'

  // ── Navigation mode ───────────────────────────────────────────────────────
  const [navMode,        setNavMode]        = useState(false)
  const [navDestination, setNavDestination] = useState(null)   // fixed {lat,lng}
  const [offRoute,       setOffRoute]       = useState(false)
  const [nearDestination, setNearDestination] = useState(false)

  // ── On-route alerts ───────────────────────────────────────────────────────
  const [onRouteClients, setOnRouteClients] = useState([])     // [{...entity, alertType, distToRoute}]
  const [showRouteAlerts, setShowRouteAlerts] = useState(true) // desktop toggle
  const [showAlertSheet,  setShowAlertSheet]  = useState(false) // mobile bottom drawer

  // ─── 2. GPS watchPosition ───────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      return
    }
    setGpsStatus('loading')

    // Fast initial position fix (low accuracy, instant return ~50ms)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords
        const newPos = { lat: latitude, lng: longitude }
        execPosRef.current = newPos
        if (execMarkerRef.current) {
          if (typeof execMarkerRef.current.animateTo === 'function') {
            execMarkerRef.current.animateTo(newPos, 800, heading)
          } else if (typeof execMarkerRef.current.setPosition === 'function') {
            execMarkerRef.current.setPosition(newPos)
          } else if (typeof execMarkerRef.current.setLatLng === 'function') {
            execMarkerRef.current.setLatLng(newPos)
          }
        }
        setExecutivePos({ lat: latitude, lng: longitude })
        setGpsAccuracy(accuracy || null)
        setGpsStatus('active')
      },
      () => {},
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    )

    // Safety fallback: if GPS takes more than 1.5s, set active with DEFAULT_CENTER so map renders immediately
    const safetyTimer = setTimeout(() => {
      setGpsStatus(prev => (prev === 'loading' ? 'active' : prev))
    }, 1500)

    // Initialize Supabase Realtime channels for location streaming
    const broadcastChannels = []
    const empId = currentUser?.employee_id || currentUser?.id
    const empCode = currentUser?.employee_code || 'EMP000012'

    if (supabaseClient) {
      const channelNames = new Set()
      if (empId) {
        channelNames.add(`tracking_${empId}`)
        channelNames.add(`tracking_${empId}_live`)
      }
      if (empCode && empCode !== empId) {
        channelNames.add(`tracking_${empCode}`)
        channelNames.add(`tracking_${empCode}_live`)
      }

      channelNames.forEach(chName => {
        try {
          const ch = supabaseClient.channel(chName)
          ch.subscribe()
          broadcastChannels.push(ch)
        } catch (e) {}
      })
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords
        const newPos = { lat: latitude, lng: longitude }

        // Stationary Marker Jitter Filter: do not dance/jump the marker when sitting/standing stationary or when accuracy is poor
        const distFromLastMarker = lastStableMarkerPosRef.current ? haversineDistance(lastStableMarkerPosRef.current.lat, lastStableMarkerPosRef.current.lng, latitude, longitude) * 1000 : 999
        const speedKmh = speed != null ? speed * 3.6 : null
        const isMarkerJitter = (accuracy > 60 && distFromLastMarker < 40) || (distFromLastMarker < 12 && (speedKmh == null || speedKmh < 2.0))

        if (!isMarkerJitter || !lastStableMarkerPosRef.current) {
          lastStableMarkerPosRef.current = newPos
          execPosRef.current = newPos
          if (execMarkerRef.current) {
            if (typeof execMarkerRef.current.animateTo === 'function') {
              execMarkerRef.current.animateTo(newPos, 800, heading)
            } else if (typeof execMarkerRef.current.setPosition === 'function') {
              execMarkerRef.current.setPosition(newPos)
            } else if (typeof execMarkerRef.current.setLatLng === 'function') {
              execMarkerRef.current.setLatLng(newPos)
            }
          }
        }

        // P2 Optimization: Throttle React UI state updates to ~1.5s to prevent render cascades
        const renderNow = Date.now()
        if (renderNow - lastUiRenderTime.current > 1500) {
          lastUiRenderTime.current = renderNow
          setExecutivePos(newPos)
          setGpsAccuracy(accuracy || null)
          setGpsStatus('active')
        }

        const now = Date.now()
        const payload = {
          employee_id:   empId,
          employee_code: empCode,
          email:         currentUser?.email || 'executive@tconnect.com',
          name:          currentUser?.name  || currentUser?.full_name || 'Sales Executive',
          latitude, longitude,
          accuracy: accuracy || 0.0,
          speed: speed || null,
          heading: heading || null,
          recorded_at: new Date().toISOString()
        }

        // 1. Sub-second Live Broadcast Stream (every ~1s)
        if (now - (lastBroadcastTime.current || 0) > 1000) {
          lastBroadcastTime.current = now

          if (broadcastChannels.length > 0) {
            broadcastChannels.forEach(ch => {
              try {
                if (ch && (ch.state === 'joined' || ch.state === 'subscribed')) {
                  ch.send({
                    type: 'broadcast',
                    event: 'location',
                    payload: { ...payload, broadcast_sent_at: Date.now() }
                  })
                }
              } catch (e) {}
            })
          }

          try {
            const bc = new BroadcastChannel('tc_live_gps_stream')
            bc.postMessage(payload)
            bc.close()
            localStorage.setItem('tc_executive_live_location', JSON.stringify(payload))
          } catch (e) {}
        }

        // 2. Throttled Database Persistence & Offline Queueing (every ~5s)
        if (now - (lastTelemetryUpdate.current || 0) > 5000) {
          lastTelemetryUpdate.current = now

          if (navigator.onLine) {
            spatialAPI.updateLocation({
              employee_id:   payload.employee_id,
              employee_code: payload.employee_code,
              email:         payload.email,
              name:          payload.name,
              latitude, longitude,
              accuracy_meters: accuracy || 0.0,
              speed: payload.speed,
              heading: payload.heading,
              timestamp: payload.recorded_at
            }).catch(() => {
              enqueueOfflineCrumb(payload)
            })

            spatialAPI.pushLocation({
              employee_id: payload.employee_id,
              employee_code: payload.employee_code,
              latitude, longitude,
              accuracy: accuracy || 10,
              speed: payload.speed,
              heading: payload.heading,
              recorded_at: payload.recorded_at
            }).catch(() => {
              enqueueOfflineCrumb(payload)
            })
          } else {
            enqueueOfflineCrumb(payload)
          }
        }
      },
      (err) => {
        if (err.code === 1) setGpsStatus('denied')
        else setGpsStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
    const handleOnlineFlush = () => {
      flushOfflineQueue(async (crumbs) => {
        for (const c of crumbs) {
          try {
            await spatialAPI.pushLocation({
              employee_id: c.employee_id || empId,
              employee_code: c.employee_code || empCode,
              latitude: c.latitude,
              longitude: c.longitude,
              accuracy: c.accuracy || 10,
              speed: c.speed,
              heading: c.heading,
              recorded_at: c.recorded_at || c.timestamp || new Date().toISOString()
            })
          } catch (_) {}
        }
      })
    }
    window.addEventListener('online', handleOnlineFlush)
    if (navigator.onLine) handleOnlineFlush()

    return () => {
      clearTimeout(safetyTimer)
      window.removeEventListener('online', handleOnlineFlush)
      navigator.geolocation.clearWatch(watchId)
      broadcastChannels.forEach(ch => {
        try { ch.unsubscribe() } catch (e) {}
      })
    }
  }, [currentUser?.email, currentUser?.employee_id, currentUser?.employee_code])

  // ─── 3. Fetch scoped DB records ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!rawLeads.length && !rawCustomers.length) {
      setDataLoading(true)
    }
    try {
      let user = currentUser
      if (!user?.email) user = getStoredUser()
      if (!user?.email) {
        try {
          const p = await authAPI.me()
          const d = p?.data || p
          if (d?.email) {
            user = {
              id: d.id || d.user_id || 'usr_default',
              user_id: d.user_id || d.id || 'usr_default',
              employee_id: d.employee_id || d.employee_code || 'EMP000012',
              employee_code: d.employee_code || d.employee_id || 'EMP000012',
              email: d.email.toLowerCase().trim(),
              name: d.name || d.full_name || 'Sales Executive',
              full_name: d.full_name || d.name || 'Sales Executive',
              role: d.role || 'Sales Executive',
            }
            localStorage.setItem('user', JSON.stringify(user))
          }
        } catch { /* silent */ }
      }

      const [leadsRes, custsRes, visitsRes] = await Promise.allSettled([
        crmAPI.getLeads(),
        customerAPI.getCustomers(),
        visitAPI.getVisits(),
      ])

      const safeFilter = (res, storageKey) => {
        let raw = []
        if (res.status === 'fulfilled') {
          const val = res.value
          raw = Array.isArray(val) ? val : (val?.data || val?.leads || val?.customers || val?.visits || val || [])
        }
        const localSaved = JSON.parse(localStorage.getItem(storageKey) || "[]")
        const merged = [...raw]
        localSaved.forEach(l => {
          if (l && !merged.some(m => m.id === l.id || (m.company === l.company && m.name === l.name))) {
            merged.push(l)
          }
        })
        return filterUserItems(merged, user)
      }

      setRawLeads(safeFilter(leadsRes, "tc_sm_leads"))
      setRawCustomers(safeFilter(custsRes, "tc_customer_accounts"))
      setRawVisits(safeFilter(visitsRes, "tc_sales_visits"))
    } catch (e) {
      console.warn('SmartMap data load error:', e)
    } finally {
      setDataLoading(false)
    }
  }, [currentUser?.email])

  useEffect(() => { loadData() }, [loadData])

  // ─── 4. Normalize entities ──────────────────────────────────────────────
  const normalizeList = useCallback((list, category) =>
    list.map((item, idx) => {
      let lat = item.latitude != null ? Number(item.latitude) : null
      let lng = item.longitude != null ? Number(item.longitude) : null
      let hasExactCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0

      // Fallback: try to parse from string fields (URL or landmark)
      if (!hasExactCoords) {
        for (const cand of [item.map_location, item.location, item.address, item.city, item.landmark]) {
          if (!cand) continue
          const c = extractCoordsFromUrlOrString(cand)
          if (c) { lat = c.lat; lng = c.lng; hasExactCoords = true; break }
        }
      }

      if (!hasExactCoords) { lat = null; lng = null }

      const distKm = (hasExactCoords && executivePos)
        ? haversineDistance(lat, lng, executivePos.lat, executivePos.lng)
        : null

      return {
        id:             item.id || item.visit_id || item.lead_id || item.customer_id || `${category}_${idx}`,
        title:          item.company || item.company_name || item.name || item.client_name || `Client #${idx + 1}`,
        contact_person: item.person || item.contact_person || item.name || item.employee_name || '',
        category,
        latitude:  lat,
        longitude: lng,
        has_exact_coords: hasExactCoords,
        address:   item.address || item.location || item.city || '—',
        phone:     item.phone || item.mobile || '',
        email:     item.email || '',
        status:    item.status || 'Active',
        priority:  item.category || item.priority || 'Normal',
        distanceKm: distKm != null ? distKm.toFixed(1) : null,
        last_visited:   item.last_visited || item.date || item.visit_date || null,
        next_followup:  item.next_followup || item.visit_time || null,
        originalItem: item,
      }
    })
  , [executivePos])

  const allLeads     = useMemo(() => normalizeList(rawLeads,     'Lead'),     [rawLeads,     normalizeList])
  const allCustomers = useMemo(() => normalizeList(rawCustomers, 'Customer'), [rawCustomers, normalizeList])
  const allVisits    = useMemo(() => normalizeList(rawVisits,    'Visit'),    [rawVisits,    normalizeList])

  const completedVisitIds = useMemo(() =>
    new Set(allVisits.filter(v => ['COMPLETED','CHECKED_OUT','visited','completed'].includes(v.status)).map(v => v.id))
  , [allVisits])

  const scheduledVisitClientIds = useMemo(() => {
    const scheduled = new Set()
    allVisits.filter(v => !completedVisitIds.has(v.id)).forEach(v => {
      if (v.originalItem?.lead_id)     scheduled.add(v.originalItem.lead_id)
      if (v.originalItem?.customer_id) scheduled.add(v.originalItem.customer_id)
    })
    return scheduled
  }, [allVisits, completedVisitIds])

  const allCandidates = useMemo(() =>
    [...allLeads, ...allCustomers]
  , [allLeads, allCustomers])

  const nearbyLeads = useMemo(() => {
    if (!showOnlyNearby) return allLeads
    return allLeads.filter(l => l.distanceKm != null && parseFloat(l.distanceKm) <= nearbyRadiusKm)
  }, [allLeads, showOnlyNearby, nearbyRadiusKm])

  const nearbyCustomers = useMemo(() => {
    if (!showOnlyNearby) return allCustomers
    return allCustomers.filter(c => c.distanceKm != null && parseFloat(c.distanceKm) <= nearbyRadiusKm)
  }, [allCustomers, showOnlyNearby, nearbyRadiusKm])

  const nearbyVisits = useMemo(() => {
    if (!showOnlyNearby) return allVisits
    return allVisits.filter(v => v.distanceKm != null && parseFloat(v.distanceKm) <= nearbyRadiusKm)
  }, [allVisits, showOnlyNearby, nearbyRadiusKm])

  const nearbyCandidates = useMemo(() => {
    if (!showOnlyNearby) return allCandidates
    return allCandidates.filter(c => c.distanceKm != null && parseFloat(c.distanceKm) <= nearbyRadiusKm)
  }, [allCandidates, showOnlyNearby, nearbyRadiusKm])

  // Helper to check route corridor clients immediately when a route is computed
  const checkAndNotifyRouteClients = useCallback((routePath, pos, destId) => {
    if (!routePath || routePath.length < 2) return
    const found = detectRouteClients({
      candidates: allCandidatesRef.current,
      routePath,
      execPos: pos,
      destId,
      completedVisitIds,
      scheduledVisitIds: scheduledVisitClientIds,
      dismissedIds: dismissedAlerts.current,
    })
    setOnRouteClients(found)
    if (found.length > 0) {
      showToast(`📍 ${found.length} nearby client/lead(s) detected along your driving route!`, 'success')
    }
  }, [completedVisitIds, scheduledVisitClientIds, showToast])

  // ─── 5. Search suggestions ──────────────────────────────────────────────
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q || q.length < 1) return []
    return allCandidates.filter(e =>
      (e.title          || '').toLowerCase().includes(q) ||
      (e.contact_person || '').toLowerCase().includes(q) ||
      (e.address        || '').toLowerCase().includes(q) ||
      (e.phone          || '').includes(q)
    ).slice(0, 8)
  }, [searchQuery, allCandidates])

  // ─── 6. Route fetch with Traffic (Google Maps API called via Backend) & OSRM Fallback ───
  const fetchRoute = useCallback(async (dest, fromPos) => {
    if (!dest?.latitude || !dest?.longitude) return
    const pos = fromPos || executivePos

    // INSTANT 0ms UI Feedback: Set immediate preliminary distance & ETA estimate so "Calculating..." never hangs
    const distDirectKm = haversineDistance(pos.lat, pos.lng, Number(dest.latitude), Number(dest.longitude))
    const preliminaryMins = Math.max(1, Math.ceil((distDirectKm / 22.0) * 60))
    const preliminaryPath = [[pos.lat, pos.lng], [Number(dest.latitude), Number(dest.longitude)]]

    setRoutePath(preliminaryPath)
    setRouteDetails(prev => ({
      distanceKm: (distDirectKm * 1.25).toFixed(1), // ~1.25 road curvature factor
      durationMins: preliminaryMins,
      staticDurationMins: null,
      trafficAware: false,
      provider: 'estimating...',
      ...(prev || {})
    }))
    setRouteStatus('found')

    // 1. Try Google Maps traffic-aware routing via Backend (with 4s timeout)
    try {
      const res = await spatialAPI.getRoute(
        { latitude: pos.lat, longitude: pos.lng },
        { latitude: dest.latitude, longitude: dest.longitude }
      ).catch(() => null)

      if (res && res.success && (res.polyline || res.distance_km)) {
        let path = preliminaryPath
        if (res.polyline) {
          path = decodePolyline(res.polyline)
          if (path.length > 0) {
            path[path.length - 1] = [Number(dest.latitude), Number(dest.longitude)]
          }
        }
        setRoutePath(path)
        setRouteDetails({
          distanceKm: res.distance_km,
          durationMins: res.eta_minutes,
          staticDurationMins: res.static_eta_minutes || res.eta_minutes,
          trafficAware: res.traffic_aware,
          provider: res.provider || 'google',
        })
        setRouteStatus('found')
        lastRoutePos.current = { lat: pos.lat, lng: pos.lng }
        checkAndNotifyRouteClients(path, pos, dest.id)
        return path
      }
    } catch (e) {
      console.warn('Backend route service notice:', e)
    }

    // 2. Fallback to OSRM (non-traffic road routing, 3s timeout)
    const coordStr = `${pos.lng},${pos.lat};${dest.longitude},${dest.latitude}`
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`

    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const route = data.routes[0]
          const path  = route.geometry.coordinates.map(c => [c[1], c[0]])
          if (path.length > 0) {
            path[path.length - 1] = [Number(dest.latitude), Number(dest.longitude)]
          }
          setRoutePath(path)
          setRouteDetails({
            distanceKm:   (route.distance / 1000).toFixed(1),
            durationMins: Math.ceil(route.duration / 60),
            staticDurationMins: null,
            trafficAware: false,
            provider: 'osrm',
          })
          setRouteStatus('found')
          lastRoutePos.current = { lat: pos.lat, lng: pos.lng }
          checkAndNotifyRouteClients(path, pos, dest.id)
          return path
        }
      }
    } catch (e) {
      console.warn('OSRM road route fallback notice:', e)
    }

    // 3. Fallback to Straight-line route
    setRouteStatus('found')
    lastRoutePos.current = { lat: pos.lat, lng: pos.lng }
    checkAndNotifyRouteClients(preliminaryPath, pos, dest.id)
    return preliminaryPath
  }, [executivePos, checkAndNotifyRouteClients])

  // ── Auto-Restore Active Navigation Route & Historical Traveled Path on Mount ────────────
  useEffect(() => {
    const restoreSession = async () => {
      // 1. Flush any offline/pocket pings to server
      try {
        await flushOfflineQueue()
      } catch (_) {}

      // 2. Load active tracking session & breadcrumbs from server
      try {
        const histRes = await spatialAPI.getLocationHistory('self')
        const histData = histRes?.data || histRes
        if (histData && histData.breadcrumbs && histData.breadcrumbs.length > 0) {
          const rawPts = histData.breadcrumbs.map(b => ({
            lat: Number(b.latitude),
            lng: Number(b.longitude),
            accuracy: Number(b.accuracy || 10)
          })).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0)

          const filteredPts = []
          if (rawPts.length > 0) {
            filteredPts.push(rawPts[0])
            let lastAnchor = rawPts[0]
            for (let i = 1; i < rawPts.length; i++) {
              const curr = rawPts[i]
              if (curr.accuracy > 60) continue
              const distM = haversineDistance(lastAnchor.lat, lastAnchor.lng, curr.lat, curr.lng) * 1000
              if (distM >= 15 && distM <= 800) {
                filteredPts.push(curr)
                lastAnchor = curr
              }
            }
          }

          if (filteredPts.length > 0) {
            trailPointsRef.current = filteredPts
            _triggerBatchRoadMatching(filteredPts)
          }
        }
      } catch (err) {
        console.warn('[SmartClientMap] Breadcrumb history restore notice:', err)
      }

      // 3. Restore active navigation state
      try {
        const savedNavStr = localStorage.getItem('tc_active_nav_session')
        if (savedNavStr) {
          const savedNav = JSON.parse(savedNavStr)
          if (savedNav && savedNav.navMode === true && savedNav.selectedStop && savedNav.selectedStop.has_exact_coords) {
            console.log('[SmartClientMap] Restoring active navigation to:', savedNav.selectedStop.title)
            setSelectedStop(savedNav.selectedStop)
            fetchRoute(savedNav.selectedStop)
            setNavMode(true)
            setNavDestination(savedNav.navDestination || { lat: savedNav.selectedStop.latitude, lng: savedNav.selectedStop.longitude })
          }
        }
      } catch (e) {
        console.warn('[SmartClientMap] Nav session restore err:', e)
      }
    }

    restoreSession()
  }, [fetchRoute])

  // ─── 7. Select destination ──────────────────────────────────────────────
  const handleSelectStop = useCallback((entity) => {
    setSearchQuery('')
    setShowAddModal(false)
    setSelectedEntity(entity)
    setNavMode(false)
    setOffRoute(false)
    setNearDestination(false)
    setOnRouteClients([])

    if (!entity.has_exact_coords) {
      setSelectedStop(null)
      setRoutePath([])
      setRouteDetails(null)
      setRouteStatus('idle')
      showToast('Cannot route: exact location unavailable for this client.', 'error')
      return
    }

    setSelectedStop(entity)
    fetchRoute(entity)
  }, [fetchRoute, showToast])

  // ─── Unplanned Visit Save Handler ───────────────────────────────────────
  const handleSaveUnplannedVisit = useCallback(async (startNavImmediately = false) => {
    if (!unplannedForm.client_name.trim() || !unplannedForm.location.trim()) {
      showToast('Please enter Client Name and Location!', 'error')
      return
    }

    const lat = unplannedForm.latitude || executivePos.lat
    const lng = unplannedForm.longitude || executivePos.lng
    const visitId = `VISIT-UNP-${Date.now()}`
    const nowIso = new Date().toISOString()
    const todayDate = nowIso.slice(0, 10)
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newVisit = {
      id: visitId,
      visit_id: visitId,
      lead_id: `LD-UNP-${String(Date.now()).slice(-6)}`,
      lead_number: `LD-UNP-${String(Date.now()).slice(-6)}`,
      customer_name: unplannedForm.client_name.trim(),
      client_name: unplannedForm.client_name.trim(),
      company_name: unplannedForm.client_name.trim(),
      company: unplannedForm.client_name.trim(),
      contact_person: unplannedForm.contact_person.trim() || 'Point of Contact',
      phone: unplannedForm.phone.trim() || 'N/A',
      location: unplannedForm.location.trim(),
      address: unplannedForm.location.trim(),
      purpose: unplannedForm.purpose || 'Unplanned Client Meeting',
      visit_type: 'UNPLANNED',
      status: startNavImmediately ? 'IN_PROGRESS' : 'SCHEDULED',
      visit_status: startNavImmediately ? 'IN_PROGRESS' : 'SCHEDULED',
      check_in_time: startNavImmediately ? nowIso : null,
      latitude: lat,
      longitude: lng,
      visit_date: todayDate,
      visit_time: timeStr,
      scheduledDate: todayDate,
      scheduledTime: timeStr,
      created_at: nowIso,
      employee_name: currentUser.name || currentUser.full_name || 'Sales Executive',
      employee_code: currentUser.employee_code || currentUser.employee_id || '',
      assigned_to_email: currentUser.email || '',
      assigned_to: currentUser.name || currentUser.full_name || 'Sales Executive',
      executive: currentUser.name || currentUser.full_name || 'Sales Executive',
      notes: unplannedForm.notes.trim() ? `${unplannedForm.notes.trim()} | Unplanned Visit` : 'Unplanned Client Visit'
    }

    setRawVisits(prev => [newVisit, ...prev])
    try {
      const localSales = JSON.parse(localStorage.getItem('tc_sales_visits') || '[]')
      localStorage.setItem('tc_sales_visits', JSON.stringify([newVisit, ...localSales]))
      const localSm = JSON.parse(localStorage.getItem('tc_sm_visits') || '[]')
      localStorage.setItem('tc_sm_visits', JSON.stringify([newVisit, ...localSm]))
    } catch (e) {}

    try {
      await visitAPI.createVisit(newVisit)
    } catch (err) {
      console.warn('Backend visit create note:', err)
    }

    window.dispatchEvent(new CustomEvent('tc:visit-created', { detail: newVisit }))
    showToast(`Unplanned visit for "${newVisit.client_name}" logged!`, 'success')
    setShowUnplannedModal(false)

    setUnplannedForm({
      client_name: '',
      contact_person: '',
      phone: '',
      location: '',
      purpose: 'Unplanned Client Meeting & Site Visit',
      notes: '',
      latitude: null,
      longitude: null,
      useCurrentGps: true
    })

    if (startNavImmediately) {
      const stopEntity = {
        id: visitId,
        title: newVisit.client_name,
        address: newVisit.location,
        phone: newVisit.phone,
        latitude: lat,
        longitude: lng,
        has_exact_coords: true,
        isUnplanned: true,
        visitType: 'UNPLANNED',
        visitRecord: newVisit
      }
      handleSelectStop(stopEntity)
      setTimeout(() => {
        startNavigation()
      }, 300)
    }
  }, [unplannedForm, executivePos, currentUser, handleSelectStop, showToast])

  // ─── 8. Start Navigation Mode ───────────────────────────────────────────
  const startNavigation = useCallback(async () => {
    if (!selectedStop?.has_exact_coords) return
    setNavMode(true)
    setNavDestination({ lat: selectedStop.latitude, lng: selectedStop.longitude })
    
    // Persist active navigation session in localStorage
    try {
      localStorage.setItem('tc_active_nav_session', JSON.stringify({
        selectedStop: selectedStop,
        navMode: true,
        navDestination: { lat: selectedStop.latitude, lng: selectedStop.longitude },
        timestamp: Date.now()
      }))
    } catch (e) { console.warn('Save active nav err:', e) }

    lastRoutePos.current = { lat: executivePos.lat, lng: executivePos.lng }
    trailPointsRef.current = [{ lat: executivePos.lat, lng: executivePos.lng }]
    if (trailPolylineRef.current) {
      trailPolylineRef.current.setMap(null)
      trailPolylineRef.current = null
    }
    showToast(`Navigation started to ${selectedStop.title}`, 'success')
    if (googleMapRef.current) {
      googleMapRef.current.panTo({ lat: executivePos.lat, lng: executivePos.lng })
      googleMapRef.current.setZoom(15)
    }

    // ── AUTO-LOG VISIT RECORD IF NOT ALREADY LOGGED ──
    const nowIso = new Date().toISOString()
    const todayDate = nowIso.slice(0, 10)
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const isUnplanned = selectedStop.isUnplanned || selectedStop.visitType === 'UNPLANNED'
    const isLead = selectedStop.isLead || selectedStop.category === 'lead' || (selectedStop.id && String(selectedStop.id).startsWith('LD'))
    const visitTypeStr = isUnplanned ? 'UNPLANNED' : (isLead ? 'NEARBY_LEAD' : 'MAP_NAVIGATION')
    
    const navVisitId = selectedStop.visitRecord?.id || selectedStop.id || `VISIT-NAV-${Date.now()}`
    activeNavVisitIdRef.current = navVisitId

    const autoVisitPayload = selectedStop.visitRecord || {
      id: navVisitId,
      visit_id: navVisitId,
      lead_id: selectedStop.lead_id || `LD-${String(Date.now()).slice(-6)}`,
      lead_number: selectedStop.lead_id || `LD-${String(Date.now()).slice(-6)}`,
      customer_name: selectedStop.title || 'Client Account',
      client_name: selectedStop.title || 'Client Account',
      company_name: selectedStop.title || 'Client Account',
      company: selectedStop.title || 'Client Account',
      contact_person: selectedStop.contactPerson || selectedStop.person || 'Point of Contact',
      phone: selectedStop.phone || selectedStop.mobile || 'N/A',
      location: selectedStop.address || selectedStop.location || 'Client Location',
      address: selectedStop.address || selectedStop.location || 'Client Location',
      purpose: isUnplanned ? (selectedStop.purpose || 'Unplanned Client Visit') : (isLead ? 'Nearby Lead Visit & Survey' : 'Map Navigation Visit'),
      visit_type: visitTypeStr,
      status: 'IN_PROGRESS',
      visit_status: 'IN_PROGRESS',
      check_in_time: nowIso,
      checkInTime: `${todayDate} at ${timeStr}`,
      latitude: selectedStop.latitude,
      longitude: selectedStop.longitude,
      visit_date: todayDate,
      visit_time: timeStr,
      scheduledDate: todayDate,
      scheduledTime: timeStr,
      created_at: nowIso,
      employee_name: currentUser.name || currentUser.full_name || 'Sales Executive',
      employee_code: currentUser.employee_code || currentUser.employee_id || '',
      assigned_to_email: currentUser.email || '',
      assigned_to: currentUser.name || currentUser.full_name || 'Sales Executive',
      executive: currentUser.name || currentUser.full_name || 'Sales Executive',
      notes: `Navigation Started to ${selectedStop.title} | Type: ${visitTypeStr}`
    }

    setRawVisits(prev => {
      const exists = prev.some(v => v.id === navVisitId || v.visit_id === navVisitId)
      return exists ? prev : [autoVisitPayload, ...prev]
    })

    try {
      const saveToStore = (key) => {
        const arr = JSON.parse(localStorage.getItem(key) || '[]')
        if (!arr.some(v => v.id === navVisitId || v.visit_id === navVisitId)) {
          localStorage.setItem(key, JSON.stringify([autoVisitPayload, ...arr]))
        }
      }
      saveToStore('tc_sales_visits')
      saveToStore('tc_sm_visits')
    } catch (e) {}

    visitAPI.createVisit(autoVisitPayload).catch(err => console.warn('Auto visit save note:', err))
    window.dispatchEvent(new CustomEvent('tc:visit-created', { detail: autoVisitPayload }))

    try {
      const clientData = {
        client_id: selectedStop.id,
        client_name: selectedStop.title,
        company_name: selectedStop.title,
        client_address: selectedStop.address,
        client_phone: selectedStop.phone,
        client_latitude: selectedStop.latitude,
        client_longitude: selectedStop.longitude,
      }
      const res = await spatialAPI.startSession(executivePos.lat, executivePos.lng, clientData)
      const data = res?.data || res
      const sessId = data?.session?.id || data?.id
      if (sessId) {
        localStorage.setItem('tc_tracking_session', sessId)
        window.dispatchEvent(new CustomEvent('tc:start-tracking', {
          detail: { lat: executivePos.lat, lng: executivePos.lng, clientData, sessionId: sessId }
        }))
      }
    } catch (err) {
      console.warn('Notice: Background session initiation:', err)
      window.dispatchEvent(new CustomEvent('tc:start-tracking', {
        detail: { lat: executivePos.lat, lng: executivePos.lng, clientData: selectedStop, sessionId: null }
      }))
    }
  }, [selectedStop, executivePos, currentUser, showToast])

  const stopNavigation = useCallback(async () => {
    setNavMode(false)
    setNavDestination(null)
    setSelectedStop(null)
    setRoutePath([])
    setRouteDetails(null)
    setOffRoute(false)
    setNearDestination(false)
    if (trailPolylineRef.current) {
      trailPolylineRef.current.setMap(null)
      trailPolylineRef.current = null
    }
    trailPointsRef.current = []

    // Complete active visit record if tracking session was active
    if (activeNavVisitIdRef.current) {
      const activeId = activeNavVisitIdRef.current
      const nowIso = new Date().toISOString()
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
      setRawVisits(prev => prev.map(v => {
        if (v.id === activeId || v.visit_id === activeId) {
          return { ...v, status: 'COMPLETED', visit_status: 'COMPLETED', check_out_time: nowIso, checkOutTime: timeStr }
        }
        return v
      }))

      try {
        const updateStore = (key) => {
          const arr = JSON.parse(localStorage.getItem(key) || '[]')
          const updated = arr.map(v => {
            if (v.id === activeId || v.visit_id === activeId) {
              return { ...v, status: 'COMPLETED', visit_status: 'COMPLETED', check_out_time: nowIso, checkOutTime: timeStr }
            }
            return v
          })
          localStorage.setItem(key, JSON.stringify(updated))
        }
        updateStore('tc_sales_visits')
        updateStore('tc_sm_visits')
      } catch (e) {}

      visitAPI.completeVisit(activeId, { status: 'COMPLETED', visit_status: 'COMPLETED', check_out_time: nowIso }).catch(() => {})
      activeNavVisitIdRef.current = null
    }

    // Clear persistent navigation session on explicit Stop Nav click
    localStorage.removeItem('tc_active_nav_session')

    showToast('Navigation stopped & visit logged.', 'info')

    const sessId = localStorage.getItem('tc_tracking_session')
    if (sessId) {
      try {
        await spatialAPI.endSession({ session_id: sessId, latitude: executivePos.lat, longitude: executivePos.lng })
      } catch (err) {
        console.warn('Notice: Session end notice:', err)
      }
      localStorage.removeItem('tc_tracking_session')
    }
    window.dispatchEvent(new CustomEvent('tc:stop-tracking'))
  }, [executivePos, showToast])

  // ─── 9. GPS update handler (navigation mode logic + debounce) ───────────
  useEffect(() => {
    if (!navMode || !navDestination) return

    // Near-destination check
    const distToDest = haversineDistance(executivePos.lat, executivePos.lng, navDestination.lat, navDestination.lng)
    setNearDestination(distToDest < ARRIVAL_RADIUS_KM)

    // Off-route check
    if (routePath.length > 2) {
      const distToRoute = distanceToPolyline(executivePos.lat, executivePos.lng, routePath)
      setOffRoute(distToRoute > OFF_ROUTE_THRESHOLD_KM)
    }

    // Dynamic traveled trail points are accumulated and filtered with GPS accuracy guards in Effect 16


    // Debounced OSRM re-fetch
    const moved = lastRoutePos.current
      ? haversineDistance(executivePos.lat, executivePos.lng, lastRoutePos.current.lat, lastRoutePos.current.lng)
      : ROUTE_REFETCH_DISTANCE_KM + 1

    if (moved >= ROUTE_REFETCH_DISTANCE_KM) {
      if (routeFetchTimer.current) clearTimeout(routeFetchTimer.current)
      routeFetchTimer.current = setTimeout(() => {
        const dest = { latitude: navDestination.lat, longitude: navDestination.lng }
        fetchRoute(dest, executivePos)
      }, 2000) // 2s debounce
    }
  }, [executivePos, navMode, navDestination, routePath, fetchRoute])

  // Keep refs in sync with latest reactive values (no extra renders)
  useEffect(() => { execPosRef.current = executivePos }, [executivePos])
  useEffect(() => { allCandidatesRef.current = allCandidates }, [allCandidates])

  // ─── 10. On-route client detection (route-corridor, ahead-only, hysteresis) ───
  useEffect(() => {
    if (routePath.length < 2) {
      setOnRouteClients([])
      return
    }

    const execPos    = executivePos || execPosRef.current
    const candidates = allCandidatesRef.current

    const found = detectRouteClients({
      candidates,
      routePath,
      execPos,
      destId:            selectedStop?.id,
      completedVisitIds,
      scheduledVisitIds: scheduledVisitClientIds,
      dismissedIds:      dismissedAlerts.current,
    })

    setOnRouteClients(found)

    // Notify with hysteresis while travelling
    found.forEach(client => {
      if (!shouldNotify(client.id, execPos, notifiedClientsMap.current)) return

      const typeLabel =
        client.alertType === 'previous'  ? '🔄 Previous Visited Client Nearby' :
        client.alertType === 'scheduled' ? '📅 Scheduled Visit Nearby' : '📍 Nearby Client / Lead'

      // Display real-time toast notification while travelling
      showToast(`${typeLabel}: ${client.title} (${client.distToRouteM}m on route)`, 'info')

      auditAPI.logEvent({
        action: 'NEARBY_CLIENT_DETECTED',
        entity_type: client.category,
        entity_id: String(client.id),
        details: {
          client_name:     client.title,
          alert_type:      client.alertType,
          dist_to_route_m: client.distToRouteM,
          destination:     selectedStop?.title || '',
          exec_email:      currentUser?.email  || '',
          exec_name:       currentUser?.name   || '',
          timestamp:       new Date().toISOString(),
        }
      }).catch(() => null)
    })
  }, [routePath, executivePos, selectedStop, completedVisitIds, scheduledVisitClientIds, showToast])


  // ─── 11. View client from route alert ──────────────────────────────────
  const handleViewRouteClient = useCallback((client) => {
    setSelectedEntity(client)
    if (googleMapRef.current && client.latitude && client.longitude) {
      googleMapRef.current.panTo({ lat: client.latitude, lng: client.longitude })
      googleMapRef.current.setZoom(15)
    }
  }, [])

  const handleSelectAsDestination = useCallback(async (client) => {
    handleSelectStop(client)
    setSelectedEntity(null)

    // Notify backend about dynamic en-route diversion ("Set as route")
    try {
      const sessId = localStorage.getItem('tc_tracking_session')
      await spatialAPI.updateSessionDestination({
        session_id: sessId,
        client_id: client.id,
        client_name: client.title,
        client_latitude: client.latitude,
        client_longitude: client.longitude,
        is_enroute_diversion: true
      })
      showToast(`Set as route: Dynamic visit to ${client.title}`, 'info')
    } catch (err) {
      console.warn('Set as route notice:', err)
    }
  }, [handleSelectStop, showToast])

  const handleDismissAlert = useCallback((clientId) => {
    dismissedAlerts.current.add(clientId)
    setOnRouteClients(prev => prev.filter(c => c.id !== clientId))
  }, [])

  // ─── 12. Initialize Map (Google Maps with Leaflet OpenStreetMap Fallback) ───
  useEffect(() => {
    if (!mapLoaded) return

    const initMap = () => {
      if (!mapContainerRef.current || googleMapRef.current || leafletMapRef.current) return

      if (window.google?.maps?.Map && typeof window.google.maps.Map === 'function') {
        try {
          if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = ''
          }
          const centerLat = executivePos?.lat || 13.0827
          const centerLng = executivePos?.lng || 80.2707

          const map = new window.google.maps.Map(mapContainerRef.current, {
            center: { lat: centerLat, lng: centerLng },
            zoom: 14,
            mapId: 'DEMO_MAP_ID',
            zoomControl: true,
            zoomControlOptions: {
              position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM || 9
            },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          })

          googleMapRef.current = map

          setTimeout(() => {
            if (googleMapRef.current && window.google?.maps?.event) {
              window.google.maps.event.trigger(googleMapRef.current, 'resize')
            }
          }, 200)
          return
        } catch (err) {
          console.warn('[SmartClientMap] Error initializing Google Map:', err)
        }
      }

      // Fallback: Leaflet OpenStreetMap / CartoDB Voyager Map
      if (window.L && typeof window.L.map === 'function') {
        try {
          if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = ''
          }
          const centerLat = executivePos?.lat || 13.0827
          const centerLng = executivePos?.lng || 80.2707

          const lmap = window.L.map(mapContainerRef.current, {
            center: [centerLat, centerLng],
            zoom: 14,
            zoomControl: false
          })

          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(lmap)

          leafletMapRef.current = lmap
          setTimeout(() => lmap.invalidateSize(), 200)
        } catch (err) {
          console.warn('[SmartClientMap] Leaflet Map init notice:', err)
        }
      }
    }

    initMap()
    const timer = setTimeout(initMap, 300)

    return () => {
      clearTimeout(timer)
      if (execMarkerRef.current) {
        try {
          if (execMarkerRef.current.setMap) execMarkerRef.current.setMap(null)
          if (execMarkerRef.current.remove) execMarkerRef.current.remove()
        } catch {}
        execMarkerRef.current = null
      }
      if (accuracyCircleRef.current) {
        try { accuracyCircleRef.current.setMap(null) } catch {}
        accuracyCircleRef.current = null
      }
      if (startMarkerRef.current) {
        try { startMarkerRef.current.setMap(null) } catch {}
        startMarkerRef.current = null
      }
      if (trailOuterPolylineRef.current) {
        try { trailOuterPolylineRef.current.setMap(null) } catch {}
        trailOuterPolylineRef.current = null
      }
      if (trailPolylineRef.current) {
        try { trailPolylineRef.current.setMap(null) } catch {}
        trailPolylineRef.current = null
      }
      activeMarkersRef.current.forEach(m => { try { m.setMap ? m.setMap(null) : m.remove() } catch {} })
      activeMarkersRef.current = []
      activePolylinesRef.current.forEach(p => { try { p.setMap ? p.setMap(null) : p.remove() } catch {} })
      activePolylinesRef.current = []
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove() } catch {}
        leafletMapRef.current = null
      }
      googleMapRef.current = null
    }
  }, [mapLoaded])

  const showInfoWindow = (latlng, htmlContent) => {
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow()
    }
    infoWindowRef.current.setContent(htmlContent)
    infoWindowRef.current.setPosition(latlng)
    infoWindowRef.current.open(googleMapRef.current)
  }

  // ─── 13. Update exec marker smoothly ────────────────────────────────────
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return
    const latlng = new window.google.maps.LatLng(executivePos.lat, executivePos.lng)
    if (!execMarkerRef.current) {
      const userName = currentUser?.name ? currentUser.name.split(' ')[0] : 'You'
      const html = `
        <div class="live-scooty-container" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; user-select: none;">
          <div style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid #10b981; border-radius: 20px; padding: 2px 10px; color: #ffffff; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 5px; z-index: 10;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
            <span>${userName}</span>
          </div>
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #10b981; margin-top: -1px; z-index: 9;"></div>
          <div style="width: 58px; height: 46px; display: flex; align-items: center; justify-content: center; position: relative; margin-top: 2px;">
            <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(234, 179, 8, 0.25); border: 1.5px solid rgba(234, 179, 8, 0.7); z-index: -1;"></div>
            <img src="${liveTrackingBike}" alt="Live Tracking Rider" style="width: 56px; height: 56px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); border-radius: 50%;" />
          </div>
        </div>
      `
      
      execMarkerRef.current = createMapMarker(
        latlng,
        googleMapRef.current,
        html,
        () => {
          showInfoWindow(latlng, '<p class="text-xs font-black text-slate-800">📍 Your Location</p>')
        },
        'center'
      )
    } else {
      execMarkerRef.current.setLatLng(latlng)
    }

    if (navMode && googleMapRef.current) {
      googleMapRef.current.panTo(latlng)
    } else if (!hasCenteredOnGpsRef.current && gpsStatus === 'active' && googleMapRef.current) {
      googleMapRef.current.panTo(latlng)
      hasCenteredOnGpsRef.current = true
    }
  }, [executivePos, navMode, mapLoaded, gpsStatus])

  // ─── 14. Redraw destination + on-route markers + polyline ───────────────
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return

    activeMarkersRef.current.forEach(m => m.setMap(null))
    activeMarkersRef.current = []

    activePolylinesRef.current.forEach(p => p.setMap(null))
    activePolylinesRef.current = []

    const map = googleMapRef.current

    if (selectedStop?.has_exact_coords) {
      const destLatLng = new window.google.maps.LatLng(selectedStop.latitude, selectedStop.longitude)
      const destHtml = `<div style="width:36px;height:36px;background:#2563eb;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,.4)"></div>`
      
      const destMarker = createMapMarker(
        destLatLng,
        map,
        destHtml,
        () => {
          setSelectedEntity(selectedStop)
          showInfoWindow(destLatLng, `<div style="font-size:12px;font-weight:700">${selectedStop.title}<br/><span style="color:#64748b;font-size:10px">${selectedStop.address}</span></div>`)
        },
        'bottom'
      )
      activeMarkersRef.current.push(destMarker)
    }

    onRouteClients.forEach(client => {
      const color = client.alertType === 'previous' ? '#7c3aed' : client.alertType === 'scheduled' ? '#d97706' : '#059669'
      const clientHtml = `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,.3)">
        ${client.alertType === 'previous' ? '📌' : client.alertType === 'scheduled' ? '📅' : '⭐'}
      </div>`
      const clientLatLng = new window.google.maps.LatLng(client.latitude, client.longitude)
      
      const clientMarker = createMapMarker(
        clientLatLng,
        map,
        clientHtml,
        () => {
          handleViewRouteClient(client)
          showInfoWindow(clientLatLng, `<div style="font-size:11px;font-weight:700">${client.title}<br/><span style="color:#64748b;font-size:10px">${client.distToRouteM}m from route</span></div>`)
        },
        'center'
      )
      if (clientMarker) activeMarkersRef.current.push(clientMarker)
    })

    // Render nearby candidate markers (leads & clients <= nearbyRadiusKm) on map canvas as color-coded pins
    nearbyCandidates.forEach(cand => {
      if (!cand.has_exact_coords) return
      if (selectedStop && String(cand.id) === String(selectedStop.id)) return
      if (onRouteClients.some(c => String(c.id) === String(cand.id))) return

      const isCust = cand.category === 'Customer'
      const bgColor = isCust ? '#059669' : '#e11d48'
      const icon = isCust ? '🏢' : '👤'

      const candHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; user-select: none;">
          <div style="background: ${bgColor}; border: 2px solid #ffffff; border-radius: 16px; padding: 2px 7px; color: #ffffff; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 4px;">
            <span>${icon}</span>
            <span>${cand.title.length > 14 ? cand.title.substring(0, 14) + '…' : cand.title}</span>
          </div>
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${bgColor}; margin-top: -1px;"></div>
        </div>
      `
      const candLatLng = new window.google.maps.LatLng(cand.latitude, cand.longitude)
      const candMarker = createMapMarker(
        candLatLng,
        map,
        candHtml,
        () => {
          setSelectedEntity(cand)
          showInfoWindow(candLatLng, `
            <div style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 2px;">
              <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; background: ${isCust ? '#ecfdf5' : '#fff1f2'}; color: ${isCust ? '#047857' : '#be123c'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isCust ? '#a7f3d0' : '#fecdd3'};">${cand.category}</span>
              <h4 style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 4px; margin-bottom: 2px;">${cand.title}</h4>
              <p style="font-size: 10px; color: #64748b; margin: 0;">📍 ${cand.address}</p>
              ${cand.distanceKm ? `<p style="font-size: 10px; font-weight: 700; color: #2563eb; margin-top: 2px;">${cand.distanceKm} km away</p>` : ''}
            </div>
          `)
        },
        'bottom'
      )
      if (candMarker) activeMarkersRef.current.push(candMarker)
    })

    // Render primary bold BLUE driving route polyline to destination
    if (routePath && routePath.length > 1) {
      const pathCoords = routePath.map(pt => ({ lat: pt[0], lng: pt[1] }))
      
      const mainPolyline = new window.google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#2563eb', // Primary bold BLUE line for active driving route navigation
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: map,
        zIndex: 15
      })
      activePolylinesRef.current.push(mainPolyline)
    }
  }, [selectedStop, onRouteClients, nearbyCandidates, routePath, offRoute, handleViewRouteClient, mapLoaded])

  // ─── 15. Dynamic location accuracy circle update ───────────────────────────
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return
    const map = googleMapRef.current

    if (gpsAccuracy && gpsStatus === 'active' && executivePos?.lat != null && executivePos?.lng != null) {
      const center = { lat: executivePos.lat, lng: executivePos.lng }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter(center)
        accuracyCircleRef.current.setRadius(gpsAccuracy)
      } else {
        accuracyCircleRef.current = new window.google.maps.Circle({
          strokeColor: '#06b6d4',
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: '#06b6d4',
          fillOpacity: 0.12,
          map: map,
          center: center,
          radius: gpsAccuracy,
        })
      }
    } else {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null)
        accuracyCircleRef.current = null
      }
    }
  }, [executivePos, gpsAccuracy, gpsStatus, mapLoaded])

  // ─── 16. Traveled Trail Polyline (Solid RED line on road - Track real trip travel during active navigation) ───
  useEffect(() => {
    if (!googleMapRef.current || !window.google || !mapLoaded) return

    // Do NOT draw traveled path if user is not actively navigating / tracking a client visit
    if (!navMode || gpsStatus === 'denied' || !executivePos?.lat || !executivePos?.lng) {
      if (trailOuterPolylineRef.current) {
        try { trailOuterPolylineRef.current.setMap(null) } catch {}
        trailOuterPolylineRef.current = null
      }
      if (trailPolylineRef.current) {
        try { trailPolylineRef.current.setMap(null) } catch {}
        trailPolylineRef.current = null
      }
      if (startMarkerRef.current) {
        try { startMarkerRef.current.setMap ? startMarkerRef.current.setMap(null) : startMarkerRef.current.remove?.() } catch {}
        startMarkerRef.current = null
      }
      return
    }

    // Ignore default fallback center (DEFAULT_CENTER) completely
    const isDefaultCenter =
      Math.abs(executivePos.lat - DEFAULT_CENTER.lat) < 0.0001 &&
      Math.abs(executivePos.lng - DEFAULT_CENTER.lng) < 0.0001

    if (isDefaultCenter) return

    const pts = trailPointsRef.current
    if (pts.length > 0) {
      const filtered = pts.filter(p => !(
        Math.abs(p.lat - DEFAULT_CENTER.lat) < 0.0001 &&
        Math.abs(p.lng - DEFAULT_CENTER.lng) < 0.0001
      ))
      if (filtered.length !== pts.length) {
        trailPointsRef.current = filtered
      }
    }

    const validPts = trailPointsRef.current
    const lastPt = validPts.length > 0 ? validPts[validPts.length - 1] : null

    let distFromLastM = 0
    if (lastPt) {
      distFromLastM = haversineDistance(lastPt.lat, lastPt.lng, executivePos.lat, executivePos.lng) * 1000
    }

    // Filter position jumps & GPS drift noise (accuracy <= 60m gate & 15m displacement anchoring)
    const minRequiredDistM = 15
    const isGpsReliable = gpsAccuracy != null ? gpsAccuracy <= 60 : true

    const isReasonableMove = (validPts.length === 0 && isGpsReliable) || (
      isGpsReliable && distFromLastM >= minRequiredDistM && distFromLastM < 600
    )
    if (isReasonableMove) {
      validPts.push({ lat: executivePos.lat, lng: executivePos.lng })
      _triggerBatchRoadMatching(validPts)
    }

    // Render green START marker pin at initial trip starting location
    if (validPts.length > 0 && !startMarkerRef.current && googleMapRef.current && window.google) {
      const startLatLng = new window.google.maps.LatLng(validPts[0].lat, validPts[0].lng)
      const buildStartHtml = () => `
        <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(16,185,129,0.45); color: #ffffff; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8px; font-weight: 900; letter-spacing: 0.5px;">
          START
        </div>
      `
      startMarkerRef.current = createMapMarker(
        startLatLng,
        googleMapRef.current,
        buildStartHtml(),
        () => {
          showInfoWindow(startLatLng, '<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:4px;color:#1e293b;"><strong>🟢 Start Point</strong><br/>Your trip starting location</div>')
        },
        'center'
      )
    }

    // Draw traveled polyline (Road-aligned OSRM matching with clean fallback)
    if (validPts.length > 1) {
      if (!googleMapRef.current || !window.google) return
      const gPath = validPts.map(p => ({ lat: p.lat, lng: p.lng }))
      const displayPath = (snappedPathRef.current && snappedPathRef.current.length >= 2) ? snappedPathRef.current : gPath

      if (trailOuterPolylineRef.current) {
        try { trailOuterPolylineRef.current.setMap(null); } catch {}
        trailOuterPolylineRef.current = null;
      }

      if (!trailPolylineRef.current) {
        trailPolylineRef.current = new window.google.maps.Polyline({
          path: displayPath,
          geodesic: true,
          strokeColor: '#dc2626', // Solid Vibrant Red
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map: googleMapRef.current,
          zIndex: 35
        })
      } else {
        trailPolylineRef.current.setPath(displayPath)
        if (!trailPolylineRef.current.getMap()) {
          trailPolylineRef.current.setMap(googleMapRef.current)
        }
      }
    } else {
      if (trailOuterPolylineRef.current) {
        try { trailOuterPolylineRef.current.setMap(null) } catch {}
        trailOuterPolylineRef.current = null
      }
      if (trailPolylineRef.current) {
        try { trailPolylineRef.current.setMap(null) } catch {}
        trailPolylineRef.current = null
      }
    }
  }, [executivePos, gpsStatus, mapLoaded, navMode])

  // ─── 17. Midnight Auto-Reset Timer (Clears daily session trails at 12:00 AM) ───
  useEffect(() => {
    let currentDay = new Date().getDate()
    const midnightCheckTimer = setInterval(() => {
      const nowDay = new Date().getDate()
      if (nowDay !== currentDay) {
        currentDay = nowDay
        trailPointsRef.current = []
        if (trailOuterPolylineRef.current) {
          try { trailOuterPolylineRef.current.setMap(null) } catch {}
          trailOuterPolylineRef.current = null
        }
        if (trailPolylineRef.current) {
          try { trailPolylineRef.current.setMap(null) } catch {}
          trailPolylineRef.current = null
        }
        if (startMarkerRef.current) {
          try { startMarkerRef.current.setMap ? startMarkerRef.current.setMap(null) : startMarkerRef.current.remove?.() } catch {}
          startMarkerRef.current = null
        }
      }
    }, 30000)
    return () => clearInterval(midnightCheckTimer)
  }, [])

  // Pre-load active personal navigation session on mount ONLY if navigation was explicitly started
  useEffect(() => {
    if (!mapLoaded) return

    const activeNavStr = localStorage.getItem('tc_active_nav_session')
    if (!activeNavStr) {
      setNavMode(false)
      trailPointsRef.current = []
      if (trailOuterPolylineRef.current) {
        try { trailOuterPolylineRef.current.setMap(null) } catch {}
        trailOuterPolylineRef.current = null
      }
      if (trailPolylineRef.current) {
        try { trailPolylineRef.current.setMap(null) } catch {}
        trailPolylineRef.current = null
      }
      if (startMarkerRef.current) {
        try { startMarkerRef.current.setMap ? startMarkerRef.current.setMap(null) : startMarkerRef.current.remove?.() } catch {}
        startMarkerRef.current = null
      }
      return
    }

    try {
      const activeNav = JSON.parse(activeNavStr)
      if (activeNav && activeNav.navMode && activeNav.selectedStop) {
        setSelectedStop(activeNav.selectedStop)
        setNavMode(true)
        if (activeNav.navDestination) {
          setNavDestination(activeNav.navDestination)
        }
      } else {
        setNavMode(false)
        trailPointsRef.current = []
      }
    } catch (e) {
      localStorage.removeItem('tc_active_nav_session')
      setNavMode(false)
      trailPointsRef.current = []
    }
  }, [mapLoaded])

  // ─── Render ──────────────────────────────────────────────────────────────────
  const visibleAlerts = onRouteClients.filter(c => !dismissedAlerts.current.has(c.id))

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-4.5rem)] rounded-none md:rounded-3xl overflow-hidden border-0 md:border border-slate-200 shadow-xl bg-slate-50 font-sans">

      {/* ══ MAP CANVAS ══ */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

      {/* ══ GPS DENIED / UNAVAILABLE FLOATING TOAST ══ */}
      {gpsStatus === 'denied' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] max-w-sm bg-rose-600/95 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20">
          <AlertCircle size={14} className="flex-shrink-0" />
          Location permission required. Enable GPS in browser settings.
        </div>
      )}
      {gpsStatus === 'unavailable' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] max-w-sm bg-amber-500/95 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20">
          <AlertCircle size={14} className="flex-shrink-0" />
          GPS unavailable on this device.
        </div>
      )}

      {/* ══ TOP SEARCH BAR ══ */}
      {isMobile && !searchExpanded ? (
        <div className="absolute top-2.5 left-2.5 z-[1000] flex gap-2">
          {/* Collapsed Round Search Button */}
          <button
            onClick={() => setSearchExpanded(true)}
            className="w-9 h-9 bg-white border border-slate-200 shadow-xl rounded-full flex items-center justify-center text-slate-600 active:scale-95 transition cursor-pointer"
            title="Search Leads/Customers"
          >
            <Search size={16} />
          </button>
          
          {/* Collapsed Round List Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xl rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer"
            title="Select Destination"
          >
            <List size={16} />
          </button>

          {/* Collapsed Round Manager Message Button */}
          {!isManager && activeInquiry && (
            <button
              onClick={() => setActiveInquiry(activeInquiry)}
              className="relative w-9 h-9 bg-amber-500 hover:bg-amber-600 text-white shadow-xl rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer animate-bounce"
              title="Manager Inquiry"
            >
              <MessageSquare size={16} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white" />
            </button>
          )}
        </div>
      ) : (
        <div className="absolute left-2 right-2 sm:left-4 sm:right-4 md:left-6 md:right-auto md:w-[380px] z-[1000] top-2 sm:top-3">
          {/* Low accuracy banner */}
          {gpsStatus === 'active' && gpsAccuracy && gpsAccuracyThreshold && gpsAccuracy > gpsAccuracyThreshold && (
            <div className="hidden md:flex bg-rose-600/95 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg mb-1.5 items-center gap-1.5 animate-pulse">
              <AlertTriangle size={11} className="flex-shrink-0" />
              GPS accuracy low — move outdoors.
            </div>
          )}

          <div className="bg-white/96 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden">
            {/* Main search row */}
            <div className="flex items-center gap-2 px-2.5 py-2">
              {isMobile && (
                <button
                  onClick={() => { setSearchExpanded(false); setSearchQuery('') }}
                  className="p-1 hover:bg-slate-100 rounded-xl text-slate-500 shrink-0"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                gpsStatus === 'active' ? 'bg-cyan-50' : gpsStatus === 'loading' ? 'bg-slate-50' : 'bg-rose-50'
              }`}>
                {gpsStatus === 'loading'
                  ? <Loader2 size={13} className="text-slate-400 animate-spin" />
                  : gpsStatus === 'active'
                  ? <Radio size={13} className="text-cyan-500" />
                  : <AlertCircle size={13} className="text-rose-500" />}
              </div>
              <div className="relative flex-1">
                <Search size={12} className="text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setSearchQuery('')}
                  placeholder="Search lead or customer…"
                  className="w-full h-8 bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition placeholder:text-slate-300"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={11} />
                  </button>
                )}
              </div>
              
              {/* Refresh & List buttons */}
              {!isMobile && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUnplannedModal(true)}
                    className="h-8 px-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center gap-1 shadow-md active:scale-95 transition flex-shrink-0 text-xs font-black cursor-pointer whitespace-nowrap"
                    title="Log Quick / Unplanned Client Visit"
                  >
                    <Zap size={13} />
                    <span>Quick Visit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshMap}
                    disabled={isRefreshingMap}
                    className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center border border-slate-200 active:scale-95 transition flex-shrink-0 cursor-pointer"
                    title="Refresh Map & GPS Coordinates"
                  >
                    <RefreshCw size={13} className={isRefreshingMap ? "animate-spin text-blue-600" : ""} />
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition flex-shrink-0 cursor-pointer"
                    title="Select Destination"
                  >
                    <List size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* GPS accuracy sub-row */}
            {gpsStatus === 'active' && gpsAccuracy && (
              <div className="px-3 pb-1.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold border-t border-slate-50">
                <Compass size={9} />
                <span>GPS {Math.round(gpsAccuracy)}m</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-black ${
                  gpsAccuracy <= gpsAccuracyThreshold ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'
                }`}>
                  {gpsAccuracy <= gpsAccuracyThreshold ? 'Precise' : '⚠️ Poor'}
                </span>
                {navMode && <span className="ml-1 text-blue-500 font-black flex items-center gap-1"><Activity size={9} className="animate-pulse" />Nav</span>}
              </div>
            )}

            {/* Suggestions */}
            {searchSuggestions.length > 0 && searchQuery && (
              <div className="border-t border-slate-100 max-h-52 overflow-y-auto divide-y divide-slate-50">
                {searchSuggestions.map(item => (
                  <div key={item.id} onClick={() => { handleSelectStop(item); if (isMobile) setSearchExpanded(false); }}
                    className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-black border px-1 py-0.5 rounded uppercase flex-shrink-0 ${categoryColor(item.category)}`}>{item.category}</span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.address}</p>
                    </div>
                    {item.has_exact_coords
                      ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">{item.distanceKm}km</span>
                      : <span className="text-[9px] font-black text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded flex-shrink-0">No loc</span>}
                  </div>
                ))}
              </div>
            )}
            {searchQuery && !dataLoading && searchSuggestions.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-slate-400 font-semibold border-t border-slate-50">No results for "{searchQuery}"</p>
            )}
          </div>
        </div>
      )}

      {/* ══ DESKTOP: ROUTE PANEL (top-left below search) ══ */}
      {!isMobile && selectedStop && (
        <div className="hidden md:block absolute z-[1000] left-6 w-[400px]"
          style={{ top: gpsStatus !== 'active' && gpsStatus !== 'loading' ? '10.5rem' : '8.5rem' }}>
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3.5 space-y-3 animate-slideDown">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Destination</p>
                <h3 className="text-sm font-black text-white truncate">{selectedStop.title}</h3>
                {selectedStop.contact_person && <p className="text-[11px] text-slate-400">{selectedStop.contact_person}</p>}
                <p className="text-[10px] text-slate-500 truncate">{selectedStop.address}</p>
              </div>
              <button onClick={() => { setSelectedStop(null); setRoutePath([]); setRouteDetails(null); setRouteStatus('idle'); setNavMode(false); setOnRouteClients([]); setSelectedEntity(null) }}
                className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition flex-shrink-0">
                <X size={14} />
              </button>
            </div>
            {routeStatus === 'loading' && <div className="flex items-center gap-2 text-xs text-slate-400 font-bold"><Loader2 size={12} className="animate-spin text-blue-400" /> Calculating…</div>}
            {routeStatus === 'fallback' && <div className="bg-slate-800 rounded-xl px-3 py-2 border border-rose-500/30"><p className="text-xs font-black text-rose-400 flex items-center gap-1.5"><AlertTriangle size={12} /> Route unavailable</p></div>}
            {routeStatus === 'failed' && <p className="text-xs text-rose-400 font-bold">Route failed. Check connection.</p>}
            <div className="flex gap-2">
              <button onClick={() => { if (googleMapRef.current && selectedStop.has_exact_coords) { googleMapRef.current.panTo({ lat: selectedStop.latitude, lng: selectedStop.longitude }); googleMapRef.current.setZoom(15) } }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95">
                <MapIcon size={12} /> View
              </button>
              {navMode
                ? <button onClick={stopNavigation} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"><X size={12} /> Stop Nav</button>
                : <button onClick={startNavigation} disabled={!selectedStop.has_exact_coords || routeStatus === 'loading' || routeStatus === 'fallback'}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95">
                    <Navigation size={12} /> Navigate
                  </button>}
            </div>
          </div>
        </div>
      )}

      {/* ══ DESKTOP & MOBILE TOP-RIGHT CONTROLS (REFRESH + NAV STATUS) ══ */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        <button
          onClick={handleRefreshMap}
          disabled={isRefreshingMap}
          className="bg-white/95 hover:bg-white text-slate-800 border border-slate-200/90 rounded-2xl shadow-xl px-3 py-2 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md"
          title="Refresh Map & GPS Coordinates"
        >
          <RefreshCw size={13} className={`text-blue-600 ${isRefreshingMap ? 'animate-spin' : ''}`} />
          <span>{isRefreshingMap ? 'Refreshing…' : 'Refresh Map'}</span>
        </button>

        {!isMobile && navMode && (
          <div className="bg-blue-600 text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2">
            <Activity size={13} className="animate-pulse" />
            <span className="text-xs font-black">Navigation Active</span>
          </div>
        )}


        {!isMobile && offRoute && (
          <div className="bg-rose-600 text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 animate-pulse">
            <AlertTriangle size={13} />
            <div><p className="text-[10px] font-black">Off route.</p><p className="text-[9px] text-rose-200">Recalculating…</p></div>
          </div>
        )}
        {!isMobile && nearDestination && !offRoute && (
          <div className="bg-emerald-600 text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2">
            <Target size={13} />
            <p className="text-[10px] font-black">Near destination!</p>
          </div>
        )}
      </div>


      {/* ══ MOBILE: CENTERED TOP BANNERS (nav/off-route) ══ */}
      {isMobile && navMode && offRoute && (
        <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-[1050] bg-rose-600 text-white rounded-xl shadow-xl px-3 py-1.5 flex items-center gap-1.5 animate-pulse whitespace-nowrap">
          <AlertTriangle size={12} /><span className="text-xs font-black">Off route — Recalculating</span>
        </div>
      )}
      {isMobile && navMode && nearDestination && !offRoute && (
        <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-[1050] bg-emerald-600 text-white rounded-xl shadow-xl px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap">
          <Target size={12} /><span className="text-xs font-black">Near destination!</span>
        </div>
      )}

      {/* ══ DESKTOP: ALERT PANEL (bottom-right) ══ */}
      {!isMobile && visibleAlerts.length > 0 && (
        <div className="hidden md:block absolute bottom-4 right-4 z-[1000] w-80 space-y-1.5">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-blue-600 animate-bounce" />
              <span className="text-xs font-black text-slate-900">{visibleAlerts.length} client{visibleAlerts.length > 1 ? 's' : ''} on route</span>
            </div>
            <button onClick={() => setShowRouteAlerts(v => !v)} className="text-[10px] font-black text-slate-400 hover:text-slate-700">
              {showRouteAlerts ? 'Hide' : 'Show'}
            </button>
          </div>
          {showRouteAlerts && (
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {visibleAlerts.map(client => {
                const { label, color, border } = alertTypeLabel(client.alertType)
                return (
                  <div key={client.id} className={`bg-gradient-to-r ${color} text-white px-3 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 border ${border}`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Bell size={11} className="text-white flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase opacity-75">{label}</p>
                        <p className="text-[11px] font-black truncate">{client.title}</p>
                        <p className="text-[9px] opacity-70">{client.distToRouteM}m from route</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleViewRouteClient(client)} className="px-2 py-1 bg-white/20 hover:bg-white/30 font-black text-[10px] rounded-lg">View</button>
                      <button onClick={() => handleDismissAlert(client.id)} className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[10px] rounded-lg opacity-70">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MOBILE: ALERT BADGE FAB (floating action button) ══
           Shows a pulsing badge with count. Tap to open bottom drawer. */}
      {isMobile && visibleAlerts.length > 0 && (
        <button
          onClick={() => setShowAlertSheet(true)}
          className="md:hidden absolute right-3 z-[1000] bg-blue-600 text-white rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2 active:scale-95 transition"
          style={{ bottom: selectedStop ? '70px' : '12px' }}
        >
          <Bell size={15} className="animate-bounce" />
          <div className="text-left">
            <p className="text-[10px] font-black leading-none">{visibleAlerts.length} on route</p>
            <p className="text-[9px] opacity-75 mt-0.5">Tap to view</p>
          </div>
          <span className="bg-white text-blue-600 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{visibleAlerts.length}</span>
        </button>
      )}

      {/* ══ MOBILE: ALERT BOTTOM SHEET ══ */}
      {isMobile && showAlertSheet && visibleAlerts.length > 0 && (
        <div className="md:hidden fixed inset-0 z-[2000] flex flex-col justify-end">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowAlertSheet(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-blue-600" />
                <span className="text-sm font-black text-slate-900">{visibleAlerts.length} Client{visibleAlerts.length > 1 ? 's' : ''} on Your Route</span>
              </div>
              <button onClick={() => setShowAlertSheet(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X size={16} />
              </button>
            </div>
            {/* Alert list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2.5">
              {visibleAlerts.map(client => {
                const { label, color, border } = alertTypeLabel(client.alertType)
                return (
                  <div key={client.id} className={`bg-gradient-to-r ${color} text-white rounded-2xl p-4 shadow-lg border ${border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-black uppercase opacity-75 tracking-wider">{label}</p>
                        <p className="text-sm font-black leading-tight">{client.title}</p>
                      </div>
                      <span className="bg-white/20 text-white text-[10px] font-black px-2 py-1 rounded-lg">{client.distToRouteM}m</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { handleViewRouteClient(client); setShowAlertSheet(false) }}
                        className="flex-1 py-2 bg-white/20 hover:bg-white/30 font-black text-xs rounded-xl flex items-center justify-center gap-1.5">
                        <MapPin size={12} /> View on Map
                      </button>
                      <button onClick={() => { handleDismissAlert(client.id); if (visibleAlerts.length <= 1) setShowAlertSheet(false) }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 font-bold text-xs rounded-xl">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBILE: DESTINATION SLIM BAR (positioned above bottom nav bar) ══ */}
      {isMobile && selectedStop && (
        <div className="md:hidden absolute bottom-16 left-0 right-0 z-[1025] bg-slate-900/97 backdrop-blur-xl border-t border-slate-700/60 shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Destination</p>
              <p className="text-xs font-black text-white truncate">{selectedStop.title}</p>
              {routeStatus === 'loading' && <p className="text-[9px] text-blue-400 font-semibold animate-pulse">Calculating route…</p>}
              {routeStatus === 'fallback' && <p className="text-[9px] text-rose-400 font-semibold">Route unavailable</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {navMode
                ? <button onClick={stopNavigation} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-black rounded-xl flex items-center gap-1"><X size={11} /> Stop</button>
                : <button onClick={startNavigation} disabled={!selectedStop.has_exact_coords || routeStatus === 'loading' || routeStatus === 'fallback'}
                    className="px-4 py-1.5 bg-blue-600 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center gap-1">
                    <Navigation size={11} /> Go
                  </button>}
              <button
                onClick={() => { setSelectedStop(null); setRoutePath([]); setRouteDetails(null); setRouteStatus('idle'); setNavMode(false); setOnRouteClients([]); setSelectedEntity(null) }}
                className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center text-slate-300">
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ENTITY DETAIL CARD ══ */}
      {/* Desktop: bottom-left floating card; Mobile: bottom sheet above destination bar / bottom nav bar */}
      {selectedEntity && !showAddModal && (
        <div className={`absolute z-[1025] left-0 right-0 md:left-6 md:right-auto md:w-[400px] ${
          selectedStop ? 'bottom-[130px] md:bottom-[70px]' : 'bottom-16 md:bottom-4'
        }`}>
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center pt-2 bg-white rounded-t-3xl border-t border-slate-100">
            <div className="w-8 h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="bg-white md:rounded-2xl md:border md:shadow-2xl border-slate-200 px-4 pt-3 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded uppercase ${categoryColor(selectedEntity.category)}`}>{selectedEntity.category}</span>
                <h3 className="text-sm font-black text-slate-900 mt-1 leading-tight">{selectedEntity.title}</h3>
                {selectedEntity.contact_person && <p className="text-[11px] text-slate-400">{selectedEntity.contact_person}</p>}
              </div>
              <button onClick={() => setSelectedEntity(null)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl"><X size={15} /></button>
            </div>

            {!selectedEntity.has_exact_coords ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><AlertCircle size={13} className="text-rose-500" /><span className="text-rose-700 font-bold">No location set</span></div>
                <button onClick={() => showToast('Set coordinates in Leads or Customers.', 'info')} className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold">How?</button>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 text-xs text-slate-600 space-y-1">
                <p className="truncate">📍 {selectedEntity.address}</p>
                {selectedEntity.phone && <p>📞 {selectedEntity.phone}</p>}
                {selectedEntity.distanceKm && <p className="text-slate-400">{selectedEntity.distanceKm} km away</p>}
              </div>
            )}

            <div className="flex gap-2">
              {selectedEntity.has_exact_coords && selectedEntity.id !== selectedStop?.id && (
                <button onClick={() => handleSelectAsDestination(selectedEntity)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95">
                  <Route size={12} /> Set Route
                </button>
              )}
              {selectedEntity.phone && (
                <a href={`tel:${selectedEntity.phone}`}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95">
                  <PhoneCall size={12} /> Call
                </a>
              )}
              {selectedEntity.has_exact_coords && (
                <a href={getDirectionsUrl(selectedEntity, executivePos.lat, executivePos.lng)} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95">
                  <Navigation size={12} /> Nav
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ BROWSE MODAL (bottom sheet on mobile, centered on desktop) ══ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[9999]">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg flex flex-col max-h-[88vh] md:max-h-[85vh] shadow-2xl overflow-hidden">
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Select Destination</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOnlyNearby(prev => !prev)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition border cursor-pointer ${
                    showOnlyNearby
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {showOnlyNearby ? `📍 Nearby (<= ${nearbyRadiusKm}km)` : '🌐 All Clients'}
                </button>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl"><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 flex-shrink-0">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { key: 'leads', label: 'Leads', count: nearbyLeads.length },
                  { key: 'customers', label: 'Customers', count: nearbyCustomers.length },
                  { key: 'visits', label: 'Visits', count: nearbyVisits.length },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                      activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}>
                    {tab.label} <span className="text-[9px] text-slate-400">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
              {dataLoading
                ? <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400"><Loader2 size={16} className="animate-spin text-blue-500" /> Loading…</div>
                : (
                  <>
                    {activeTab === 'leads' && (nearbyLeads.length === 0
                      ? (
                        <div className="text-center py-10 space-y-2">
                          <p className="text-xs text-slate-400 font-semibold">No leads assigned{showOnlyNearby ? ` within ${nearbyRadiusKm} km` : ''}.</p>
                          {showOnlyNearby && (
                            <button onClick={() => setShowOnlyNearby(false)} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-black">
                              Show All Leads
                            </button>
                          )}
                        </div>
                      )
                      : nearbyLeads.map(l => <DestItem key={l.id} item={l} onSelect={() => handleSelectStop(l)} isSelected={selectedStop?.id === l.id} />))}
                    {activeTab === 'customers' && (nearbyCustomers.length === 0
                      ? (
                        <div className="text-center py-10 space-y-2">
                          <p className="text-xs text-slate-400 font-semibold">No customers assigned{showOnlyNearby ? ` within ${nearbyRadiusKm} km` : ''}.</p>
                          {showOnlyNearby && (
                            <button onClick={() => setShowOnlyNearby(false)} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-black">
                              Show All Customers
                            </button>
                          )}
                        </div>
                      )
                      : nearbyCustomers.map(c => <DestItem key={c.id} item={c} onSelect={() => handleSelectStop(c)} isSelected={selectedStop?.id === c.id} />))}
                    {activeTab === 'visits' && (nearbyVisits.length === 0
                      ? (
                        <div className="text-center py-10 space-y-2">
                          <p className="text-xs text-slate-400 font-semibold">No visits scheduled{showOnlyNearby ? ` within ${nearbyRadiusKm} km` : ''}.</p>
                          {showOnlyNearby && (
                            <button onClick={() => setShowOnlyNearby(false)} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-black">
                              Show All Visits
                            </button>
                          )}
                        </div>
                      )
                      : nearbyVisits.map(v => <DestItem key={v.id} item={v} onSelect={() => handleSelectStop(v)} isSelected={selectedStop?.id === v.id} />))}
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ══ GPS LOADING OVERLAY ══ */}
      {gpsStatus === 'loading' && !mapLoaded && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="text-center space-y-3">
            <Loader2 size={32} className="text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-black text-slate-700">Loading Smart Map…</p>
            <p className="text-xs text-slate-400">Acquiring GPS position</p>
          </div>
        </div>
      )}

      {/* ══ SINGLE PERSISTENT FLOATING MESSAGE MANAGER BUTTON (TOP RIGHT) ══ */}
      {!isManager && !showInquiryDrawer && (
        <button
          type="button"
          onClick={() => setShowInquiryDrawer(true)}
          className={`absolute top-3.5 right-3.5 z-[1000] text-white backdrop-blur-md border shadow-2xl px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 active:scale-95 transition cursor-pointer group ${
            activeInquiry
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-300 animate-bounce ring-2 ring-amber-400'
              : 'bg-slate-900/95 hover:bg-slate-900 border-slate-700'
          }`}
          title="Open Manager Inquiry & Status Update Window"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:rotate-12 transition">
            💬
          </div>
          <span>{activeInquiry ? '⚡ Manager Inquiry (1)' : 'Message Manager'}</span>
          {activeInquiry && <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />}
        </button>
      )}

      {/* ══ DOCKED CORNER FLOATING MANAGER INQUIRY CARD ON EXECUTIVE MAP ══ */}
      {(activeInquiry || showInquiryDrawer) && (() => {
        const senderInfo = resolveSenderBadge(activeInquiry)
        return (
          <div className="absolute top-14 right-3 left-3 md:left-auto md:w-[380px] z-[9999] animate-in slide-in-from-top-4 duration-300">
            <div className={`bg-white/98 backdrop-blur-xl rounded-2xl p-4 shadow-2xl space-y-3 ${senderInfo.border}`}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md animate-bounce">
                    {senderInfo.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-tight">
                      {activeInquiry ? senderInfo.title : 'Status Reply to Management'}
                    </h3>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
                      <span className={`w-1.5 h-1.5 rounded-full ${senderInfo.badgeText}`} />
                      {senderInfo.role} Message
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDismissInquiry(activeInquiry);
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-xs"
                  title="Close"
                >
                  <X size={18} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Question Box */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <p className="text-xs font-black text-slate-900">
                  "{activeInquiry?.message || 'Please send your current location status update.'}"
                </p>
                <div className="mt-1 flex items-center justify-between text-[9px] font-extrabold text-slate-500">
                  <span>Sender: <strong className="text-slate-800">{activeInquiry?.sender_name || 'Reporting Manager'}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full border ${senderInfo.badgeText}`}>{senderInfo.role}</span>
                </div>
              </div>

            {/* 1-Tap Quick Action Chips */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Quick Response (1-Tap)</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '🚦 In Heavy Traffic', reply: 'In heavy traffic. Moving slowly.' },
                  { label: '🤝 Meeting Client', reply: 'Currently inside client office meeting.' },
                  { label: '⛽ Bike / Fuel Issue', reply: 'Stopped for fuel / bike maintenance.' },
                  { label: '☕ Short Break', reply: 'Taking a 5-min tea / lunch break.' },
                  { label: '📍 Reaching Soon', reply: 'On the way. Reaching client in 5 mins.' },
                  { label: '🌧️ Heavy Rain', reply: 'Stopped due to heavy rain.' },
                ].map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSendReplyToManager(chip.reply)
                      setShowInquiryDrawer(false)
                    }}
                    disabled={isReplying}
                    className="py-2 px-2 rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 text-left text-[11px] font-black text-slate-800 transition active:scale-95 flex items-center justify-between cursor-pointer group"
                  >
                    <span className="truncate">{chip.label}</span>
                    <span className="text-[10px] group-hover:translate-x-0.5 transition">➔</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reply Box */}
            <div className="flex gap-1.5 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Custom reason..."
                className="flex-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendReplyToManager()
                  setShowInquiryDrawer(false)
                }}
                disabled={isReplying || !replyText.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition cursor-pointer"
              >
                {isReplying ? '...' : 'Send'}
              </button>
            </div>

            {/* Direct Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDismissInquiry(activeInquiry);
              }}
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition text-center cursor-pointer active:scale-95"
            >
              Close Window
            </button>


          </div>
        </div>
        )
      })()}

      {/* ══ QUICK / UNPLANNED CLIENT VISIT MODAL ══ */}
      {showUnplannedModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Log Quick / Unplanned Visit</h3>
                  <p className="text-[10px] text-slate-300">Record sudden client visits or field drop-ins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnplannedModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveUnplannedVisit(false); }} className="p-6 space-y-4">
              {/* Client / Company Name */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Client / Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Tech Solutions"
                    value={unplannedForm.client_name}
                    onChange={(e) => setUnplannedForm(prev => ({ ...prev, client_name: e.target.value }))}
                    className="w-full h-10 pl-9 pr-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition text-slate-900"
                  />
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Contact Person</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={unplannedForm.contact_person}
                      onChange={(e) => setUnplannedForm(prev => ({ ...prev, contact_person: e.target.value }))}
                      className="w-full h-10 pl-9 pr-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={unplannedForm.phone}
                      onChange={(e) => setUnplannedForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full h-10 pl-9 pr-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Location / Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Location / Address <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (executivePos.lat && executivePos.lng) {
                        setUnplannedForm(prev => ({
                          ...prev,
                          location: `Current GPS (${executivePos.lat.toFixed(4)}, ${executivePos.lng.toFixed(4)})`,
                          latitude: executivePos.lat,
                          longitude: executivePos.lng,
                          useCurrentGps: true
                        }))
                        showToast('Filled with current GPS location!', 'success')
                      } else {
                        showToast('GPS position unavailable', 'warning')
                      }
                    }}
                    className="text-[10px] font-black text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Target size={11} /> Use My Current GPS
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Guindy Tech Park, Phase 2, Chennai"
                    value={unplannedForm.location}
                    onChange={(e) => setUnplannedForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full h-10 pl-9 pr-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition text-slate-900"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Purpose of Visit</label>
                <select
                  value={unplannedForm.purpose}
                  onChange={(e) => setUnplannedForm(prev => ({ ...prev, purpose: e.target.value }))}
                  className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition text-slate-900"
                >
                  <option value="Unplanned Client Meeting & Site Visit">⚡ Unplanned Client Meeting & Site Visit</option>
                  <option value="Urgent Product Demo / Survey">🚀 Urgent Product Demo / Survey</option>
                  <option value="Nearby Lead Drop-in">📍 Nearby Lead Drop-in</option>
                  <option value="Client Support / Service Escalation">🛠️ Client Support / Service Escalation</option>
                  <option value="Cold Call / Prospecting">💼 Cold Call / Prospecting</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Discussion Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Add visit details or discussion topics…"
                  value={unplannedForm.notes}
                  onChange={(e) => setUnplannedForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition resize-none text-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl transition active:scale-95 cursor-pointer"
                >
                  Log Visit Only
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveUnplannedVisit(true)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
                >
                  <Navigation size={13} /> Log & Start Nav 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Destination list item sub-component ─────────────────────────────────────
function DestItem({ item, onSelect, isSelected }) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl p-3 flex items-center justify-between gap-2 transition cursor-pointer border ${
        isSelected
          ? 'bg-blue-50 border-blue-300'
          : 'bg-slate-50 hover:bg-blue-50/50 border-slate-100 hover:border-blue-200'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${categoryColor(item.category)}`}>
            {item.category}
          </span>
          <h4 className="text-xs font-black text-slate-900 truncate">{item.title}</h4>
          {isSelected && <CheckCircle2 size={12} className="text-blue-600 flex-shrink-0" />}
        </div>
        {item.contact_person && (
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{item.contact_person}</p>
        )}
        <p className="text-[10px] text-slate-400 font-semibold truncate">{item.address}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {item.has_exact_coords
          ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              📍 {item.distanceKm ? `${item.distanceKm} km` : 'Located'}
            </span>
          : <span className="text-[9px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <AlertCircle size={9} /> No coords
            </span>
        }
        <ChevronRight size={13} className="text-slate-300" />
      </div>
    </div>
  )
}
