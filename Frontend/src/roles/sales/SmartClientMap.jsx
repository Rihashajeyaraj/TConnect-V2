import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  MapPin, Navigation, Compass, Search, Phone, Calendar,
  CheckCircle2, Clock, User, Building2, X, Plus,
  Navigation2, Bell, Sparkles, PhoneCall, Check, Map as MapIcon,
  ChevronRight, AlertCircle, Loader2, Route, Target,
  ArrowLeft, List, Radio, Activity, AlertTriangle
} from 'lucide-react'
import { crmAPI, customerAPI, visitAPI, spatialAPI, authAPI, settingsAPI, auditAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { loadGoogleMaps } from '../../utils/loadGoogleMaps.js'
import { filterUserItems } from '../../utils/userScope.js'
import { detectRouteClients, shouldNotify } from '../../utils/routeProximityUtils.js'

// ─── Configuration ────────────────────────────────────────────────────────────
// Minimum GPS movement (km) before re-fetching OSRM route (debounce)
const ROUTE_REFETCH_DISTANCE_KM    = 0.05  // 50m
// Distance from route polyline (km) that triggers "off-route" warning
const OFF_ROUTE_THRESHOLD_KM       = 0.15  // 150m
// Distance from destination (km) that triggers "near destination" warning
const ARRIVAL_RADIUS_KM            = 0.05  // 50m

const DEFAULT_CENTER = { lat: 13.0067, lng: 80.2570 } // Adyar, Chennai

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
  if (HTMLMapMarker) return
  if (!window.google || !window.google.maps || !window.google.maps.OverlayView) {
    return
  }
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartClientMap() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // Refs
  const mapContainerRef  = useRef(null)
  const googleMapRef     = useRef(null)
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
  const trailPointsRef   = useRef([])           // Breadcrumb points array
  const lastTelemetryUpdate = useRef(0)         // throttled updates tracking
  const hasCenteredOnGpsRef = useRef(false)     // initial GPS pan tracking

  // ── GPS & Map ────────────────────────────────────────────────────────────
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
  const [mapLoaded,    setMapLoaded]    = useState(false)
  const [gpsStatus,    setGpsStatus]    = useState('loading') // 'loading'|'active'|'denied'|'unavailable'
  const [executivePos, setExecutivePos] = useState(DEFAULT_CENTER)
  const [gpsAccuracy, setGpsAccuracy]   = useState(null)
  const [gpsAccuracyThreshold, setGpsAccuracyThreshold] = useState(100.0)

  // ── Data ─────────────────────────────────────────────────────────────────
  const [rawLeads,     setRawLeads]     = useState([])
  const [rawCustomers, setRawCustomers] = useState([])
  const [rawVisits,    setRawVisits]    = useState([])
  const [dataLoading,  setDataLoading]  = useState(true)

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
  // Load config dynamically on mount
  useEffect(() => {
    if (window.google?.maps) {
      initializeHTMLMapMarker()
      setMapLoaded(true)
      return
    }

    settingsAPI.getConfig()
      .then(res => {
        const threshold = res?.data?.gps_accuracy_threshold
        if (threshold != null && !isNaN(threshold)) {
          setGpsAccuracyThreshold(Number(threshold))
        }
        const key = res?.data?.google_maps_api_key
        if (!key) return
        setGoogleMapsApiKey(key)
        return loadGoogleMaps(key)
      })
      .then(maps => {
        if (!maps) return
        initializeHTMLMapMarker()
        setMapLoaded(true)
      })
      .catch(err => console.error('Failed to load Google Maps SDK:', err))
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
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const newPos = { lat: latitude, lng: longitude }
        setExecutivePos(newPos)
        setGpsAccuracy(accuracy || null)
        setGpsStatus('active')

        // Throttled backend telemetry - max once per 10 seconds to avoid overloading Supabase
        const now = Date.now()
        if (now - lastTelemetryUpdate.current > 10000) {
          lastTelemetryUpdate.current = now
          spatialAPI.updateLocation({
            email:         currentUser?.email || 'executive@tconnect.com',
            name:          currentUser?.name  || 'Sales Executive',
            employee_code: currentUser?.employee_code || 'EMP000012',
            latitude, longitude,
            accuracy_meters: accuracy || 0.0,
            timestamp: new Date().toISOString()
          }).catch(() => null)
        }
      },
      (err) => {
        if (err.code === 1) setGpsStatus('denied')
        else setGpsStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [currentUser?.email])

  // ─── 3. Fetch scoped DB records ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setDataLoading(true)
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

      const safeFilter = (res, key) => {
        if (res.status !== 'fulfilled') return []
        const raw = Array.isArray(res.value) ? res.value : (res.value?.data || res.value || [])
        return filterUserItems(raw, user)
      }

      setRawLeads(safeFilter(leadsRes))
      setRawCustomers(safeFilter(custsRes))
      setRawVisits(safeFilter(visitsRes))
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
    setRouteStatus('loading')

    // 1. Try Google Maps traffic-aware routing via Backend first
    try {
      const res = await spatialAPI.getRoute(
        { latitude: pos.lat, longitude: pos.lng },
        { latitude: dest.latitude, longitude: dest.longitude }
      )

      if (res && res.success && res.polyline) {
        const path = decodePolyline(res.polyline)
        // Force the last point of the route to match the destination coordinates exactly
        if (path.length > 0) {
          path[path.length - 1] = [dest.latitude, dest.longitude]
        }
        setRoutePath(path)
        setRouteDetails({
          distanceKm: res.distance_km,
          durationMins: res.eta_minutes,
          staticDurationMins: res.static_eta_minutes,
          trafficAware: res.traffic_aware,
          provider: res.provider || 'google',
        })
        setRouteStatus('found')
        lastRoutePos.current = { lat: pos.lat, lng: pos.lng }
        return path
      }
    } catch (e) {
      console.warn('Google route service unavailable, falling back to OSRM:', e)
    }

    // 2. Fallback to OSRM (non-traffic road routing)
    const coordStr = `${pos.lng},${pos.lat};${dest.longitude},${dest.latitude}`
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`

    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      if (data.code === 'Ok' && data.routes?.length > 0) {
        const route = data.routes[0]
        const path  = route.geometry.coordinates.map(c => [c[1], c[0]])
        // Force endpoint coordinate alignment
        if (path.length > 0) {
          path[path.length - 1] = [dest.latitude, dest.longitude]
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
        return path
      }
    } catch (e) {
      console.warn('OSRM road route fallback failed:', e)
    }

    // 3. Fallback to Straight-line route (navigation disabled on fallback)
    const path = [[pos.lat, pos.lng], [dest.latitude, dest.longitude]]
    const dist = haversineDistance(pos.lat, pos.lng, dest.latitude, dest.longitude)
    setRoutePath(path)
    setRouteDetails({
      distanceKm: dist.toFixed(1),
      durationMins: Math.ceil(dist * 3),
      staticDurationMins: null,
      trafficAware: false,
      provider: 'straight-line',
    })
    setRouteStatus('fallback')
    lastRoutePos.current = { lat: pos.lat, lng: pos.lng }
    return path
  }, [executivePos])

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

  // ─── 8. Start Navigation Mode ───────────────────────────────────────────
  const startNavigation = useCallback(async () => {
    if (!selectedStop?.has_exact_coords) return
    setNavMode(true)
    setNavDestination({ lat: selectedStop.latitude, lng: selectedStop.longitude })
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
  }, [selectedStop, executivePos, showToast])

  const stopNavigation = useCallback(async () => {
    setNavMode(false)
    setNavDestination(null)
    setOffRoute(false)
    setNearDestination(false)
    if (trailPolylineRef.current) {
      trailPolylineRef.current.setMap(null)
      trailPolylineRef.current = null
    }
    trailPointsRef.current = []
    showToast('Navigation stopped.', 'info')

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

    // Dynamic traveled trail polyline (purple dotted line)
    try {
      const lat = executivePos.lat
      const lng = executivePos.lng
      const pts = trailPointsRef.current
      const last = pts.length > 0 ? pts[pts.length - 1] : null
      if (!last || haversineDistance(last.lat, last.lng, lat, lng) > 0.015) {
        pts.push({ lat, lng })
      }

      if (pts.length >= 2 && googleMapRef.current && window.google) {
        const gPath = pts.map(p => ({ lat: p.lat, lng: p.lng }))
        if (trailPolylineRef.current) {
          trailPolylineRef.current.setPath(gPath)
        } else {
          const lineSymbol = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillOpacity: 1,
            scale: 4,
            strokeColor: '#9333ea', // Vibrant Purple Dotted Line
            fillColor: '#a855f7',
            strokeWeight: 1.5
          }
          trailPolylineRef.current = new window.google.maps.Polyline({
            path: gPath,
            strokeOpacity: 0,
            icons: [{
              icon: lineSymbol,
              offset: '0%',
              repeat: '12px'
            }],
            map: googleMapRef.current,
            zIndex: 20
          })
        }
      }
    } catch (trailErr) {
      console.warn('Failed to update traveled trail on Sales map:', trailErr)
    }

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
  // Deliberately omits executivePos + allCandidates from deps — those are read
  // via refs so this effect only fires when the ROUTE or DESTINATION changes,
  // not on every GPS tick (which caused the infinite re-render loop).
  useEffect(() => {
    if (routePath.length < 2) {
      setOnRouteClients([])
      return
    }

    const execPos    = execPosRef.current
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

    // Notify with hysteresis
    found.forEach(client => {
      if (!shouldNotify(client.id, execPos, notifiedClientsMap.current)) return

      const typeLabel =
        client.alertType === 'previous'  ? '🔄 Previous Client Nearby' :
        client.alertType === 'scheduled' ? '📅 Scheduled Visit Nearby' : '📍 Nearby Client'

      // Event is tracked and aggregated in the combined FAB drawer.
      // Individual toast notifications are disabled to prevent map crowding.

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, selectedStop, completedVisitIds, scheduledVisitClientIds])


  // ─── 11. View client from route alert ──────────────────────────────────
  const handleViewRouteClient = useCallback((client) => {
    setSelectedEntity(client)
    if (googleMapRef.current && client.latitude && client.longitude) {
      googleMapRef.current.panTo({ lat: client.latitude, lng: client.longitude })
      googleMapRef.current.setZoom(15)
    }
  }, [])

  const handleSelectAsDestination = useCallback((client) => {
    handleSelectStop(client)
    setSelectedEntity(null)
  }, [handleSelectStop])

  const handleDismissAlert = useCallback((clientId) => {
    dismissedAlerts.current.add(clientId)
    setOnRouteClients(prev => prev.filter(c => c.id !== clientId))
  }, [])

  // ─── 12. Initialize Google Map ─────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || googleMapRef.current) return

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: executivePos.lat, lng: executivePos.lng },
      zoom: 14,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    googleMapRef.current = map

    return () => {
      if (execMarkerRef.current) {
        execMarkerRef.current.setMap(null)
        execMarkerRef.current = null
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null)
        accuracyCircleRef.current = null
      }
      activeMarkersRef.current.forEach(m => m.setMap(null))
      activeMarkersRef.current = []
      activePolylinesRef.current.forEach(p => p.setMap(null))
      activePolylinesRef.current = []
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
    initializeHTMLMapMarker()
    if (!HTMLMapMarker) return
    const latlng = new window.google.maps.LatLng(executivePos.lat, executivePos.lng)
    
    if (!execMarkerRef.current) {
      const html = `<div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
        <div class="relative w-8 h-8 rounded-full bg-cyan-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">👤</div>
      </div>`
      
      execMarkerRef.current = new HTMLMapMarker(
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
    initializeHTMLMapMarker()
    if (!HTMLMapMarker) return

    activeMarkersRef.current.forEach(m => m.setMap(null))
    activeMarkersRef.current = []

    activePolylinesRef.current.forEach(p => p.setMap(null))
    activePolylinesRef.current = []

    const map = googleMapRef.current

    if (selectedStop?.has_exact_coords) {
      const destLatLng = new window.google.maps.LatLng(selectedStop.latitude, selectedStop.longitude)
      const destHtml = `<div style="width:36px;height:36px;background:#2563eb;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,.4)"></div>`
      
      const destMarker = new HTMLMapMarker(
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
      
      const clientMarker = new HTMLMapMarker(
        clientLatLng,
        map,
        clientHtml,
        () => {
          handleViewRouteClient(client)
          showInfoWindow(clientLatLng, `<div style="font-size:11px;font-weight:700">${client.title}<br/><span style="color:#64748b;font-size:10px">${client.distToRouteM}m from route</span></div>`)
        },
        'center'
      )
      activeMarkersRef.current.push(clientMarker)
    })

    if (routePath.length > 1) {
      const pathCoords = routePath.map(pt => ({ lat: pt[0], lng: pt[1] }))
      
      const mainPolyline = new window.google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: map,
      })
      activePolylinesRef.current.push(mainPolyline)

      if (offRoute) {
        const offRoutePolyline = new window.google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#ef4444',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 3,
            },
            offset: '0',
            repeat: '20px',
          }],
          map: map,
        })
        activePolylinesRef.current.push(offRoutePolyline)
      }
    }
  }, [selectedStop, onRouteClients, routePath, offRoute, handleViewRouteClient, mapLoaded])

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

  // ─── Render ──────────────────────────────────────────────────────────────────
  const visibleAlerts = onRouteClients.filter(c => !dismissedAlerts.current.has(c.id))

  return (
    <div className="relative w-full h-[calc(100vh-120px)] md:h-[88vh] rounded-none md:rounded-3xl overflow-hidden border-0 md:border border-slate-200 shadow-xl bg-slate-50 font-sans">

      {/* ══ MAP CANVAS ══ */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* ══ GPS DENIED / UNAVAILABLE BANNER ══ */}
      {gpsStatus === 'denied' && (
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-rose-600 text-white text-xs font-extrabold px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <AlertCircle size={14} className="flex-shrink-0" />
          Location permission required. Enable GPS in browser settings.
        </div>
      )}
      {gpsStatus === 'unavailable' && (
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-amber-500 text-white text-xs font-extrabold px-4 py-2.5 flex items-center gap-2 shadow-lg">
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
        </div>
      ) : (
        <div className={`absolute left-2 right-2 sm:left-4 sm:right-4 md:left-6 md:right-auto md:w-[400px] z-[1000] ${
          gpsStatus !== 'active' && gpsStatus !== 'loading' ? 'top-11' : 'top-2 sm:top-3'
        }`}>
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
              
              {/* Only show list button here if not on mobile (on mobile it's in the collapsed buttons) */}
              {!isMobile && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition flex-shrink-0 cursor-pointer"
                >
                  <List size={14} />
                </button>
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

      {/* ══ DESKTOP: NAV STATUS (top-right) ══ */}
      {!isMobile && navMode && (
        <div className="hidden md:block absolute top-4 right-4 z-[1000] space-y-2">
          <div className="bg-blue-600 text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2">
            <Activity size={13} className="animate-pulse" />
            <span className="text-xs font-black">Navigation Active</span>
          </div>
          {offRoute && (
            <div className="bg-rose-600 text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 animate-pulse">
              <AlertTriangle size={13} />
              <div><p className="text-[10px] font-black">Off route.</p><p className="text-[9px] text-rose-200">Recalculating…</p></div>
            </div>
          )}
          {nearDestination && !offRoute && (
            <div className="bg-emerald-600 text-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2">
              <Target size={13} />
              <p className="text-[10px] font-black">Near destination!</p>
            </div>
          )}
        </div>
      )}

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

      {/* ══ MOBILE: DESTINATION SLIM BAR (bottom) ══ */}
      {isMobile && selectedStop && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-[1010] bg-slate-900/97 backdrop-blur-xl border-t border-slate-700/60">
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
      {/* Desktop: bottom-left floating card; Mobile: bottom sheet above destination bar */}
      {selectedEntity && !showAddModal && (
        <div className={`absolute z-[1015] left-0 right-0 md:left-6 md:right-auto md:w-[400px] md:bottom-4 ${
          selectedStop ? 'bottom-[70px]' : 'bottom-0'
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
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl"><X size={16} /></button>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 flex-shrink-0">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { key: 'leads', label: 'Leads', count: allLeads.length },
                  { key: 'customers', label: 'Customers', count: allCustomers.length },
                  { key: 'visits', label: 'Visits', count: allVisits.length },
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
                    {activeTab === 'leads' && (allLeads.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-10">No leads assigned.</p>
                      : allLeads.map(l => <DestItem key={l.id} item={l} onSelect={() => handleSelectStop(l)} isSelected={selectedStop?.id === l.id} />))}
                    {activeTab === 'customers' && (allCustomers.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-10">No customers assigned.</p>
                      : allCustomers.map(c => <DestItem key={c.id} item={c} onSelect={() => handleSelectStop(c)} isSelected={selectedStop?.id === c.id} />))}
                    {activeTab === 'visits' && (allVisits.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-10">No visits scheduled.</p>
                      : allVisits.map(v => <DestItem key={v.id} item={v} onSelect={() => handleSelectStop(v)} isSelected={selectedStop?.id === v.id} />))}
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
