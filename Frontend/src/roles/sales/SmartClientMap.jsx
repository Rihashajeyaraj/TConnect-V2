import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  MapPin, Navigation, Compass, Search, Phone, Calendar,
  CheckCircle2, Clock, User, Building2, X, Plus,
  Navigation2, Bell, Sparkles, PhoneCall, Check, Map,
  ChevronRight, AlertCircle, Loader2, Route, Target,
  ArrowLeft, List, Radio, Activity, AlertTriangle
} from 'lucide-react'
import { crmAPI, customerAPI, visitAPI, spatialAPI, authAPI, settingsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { filterUserItems } from '../../utils/userScope.js'

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartClientMap() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // Refs
  const mapContainerRef  = useRef(null)
  const leafletMapRef    = useRef(null)
  const markersGroupRef  = useRef(null)
  const polylinesGroupRef = useRef(null)
  const execMarkerRef    = useRef(null)
  const dismissedAlerts  = useRef(new Set())    // session-scoped dedupe
  const lastRoutePos     = useRef(null)         // last OSRM fetch position
  const routeFetchTimer  = useRef(null)         // debounce timer id

  // ── GPS & Map ────────────────────────────────────────────────────────────
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

  // ── Route ─────────────────────────────────────────────────────────────────
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
  const [showRouteAlerts, setShowRouteAlerts] = useState(true) // toggle visibility
  const [routeAlertRadius, setRouteAlertRadius] = useState(2.0) // fallback default

  // Load config dynamically on mount
  useEffect(() => {
    settingsAPI.getConfig()
      .then(res => {
        const radius = res?.data?.client_route_alert_radius_km
        if (radius != null && !isNaN(radius)) {
          setRouteAlertRadius(Number(radius))
        }
        const threshold = res?.data?.gps_accuracy_threshold
        if (threshold != null && !isNaN(threshold)) {
          setGpsAccuracyThreshold(Number(threshold))
        }
      })
      .catch(err => {
        console.warn('Failed to load map configuration:', err)
      })
  }, [])


  // ─── 1. Load Leaflet ────────────────────────────────────────────────────
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

        // Backend telemetry
        spatialAPI.updateLocation({
          email:         currentUser?.email || 'executive@tconnect.com',
          name:          currentUser?.name  || 'Sales Executive',
          employee_code: currentUser?.employee_code || 'EMP000012',
          latitude, longitude,
          timestamp: new Date().toISOString()
        }).catch(() => null)
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
  const startNavigation = useCallback(() => {
    if (!selectedStop?.has_exact_coords) return
    setNavMode(true)
    setNavDestination({ lat: selectedStop.latitude, lng: selectedStop.longitude })
    lastRoutePos.current = { lat: executivePos.lat, lng: executivePos.lng }
    showToast(`Navigation started to ${selectedStop.title}`, 'success')
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([executivePos.lat, executivePos.lng], 15)
    }
  }, [selectedStop, executivePos, showToast])

  const stopNavigation = useCallback(() => {
    setNavMode(false)
    setNavDestination(null)
    setOffRoute(false)
    setNearDestination(false)
    showToast('Navigation stopped.', 'info')
  }, [showToast])

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

  // ─── 10. On-route client detection ─────────────────────────────────────
  useEffect(() => {
    if (routePath.length < 2) {
      setOnRouteClients([])
      return
    }

    const destId = selectedStop?.id
    const found  = []

    for (const entity of allCandidates) {
      if (!entity.has_exact_coords)     continue
      if (entity.id === destId)         continue
      if (dismissedAlerts.current.has(entity.id)) continue

      const dist = distanceToPolyline(entity.latitude, entity.longitude, routePath)
      if (dist > routeAlertRadius) continue

      // Classify alert type
      let alertType = 'unvisited'
      if (completedVisitIds.has(entity.id) ||
          completedVisitIds.has(entity.originalItem?.lead_id) ||
          completedVisitIds.has(entity.originalItem?.customer_id)) {
        alertType = 'previous'
      } else if (scheduledVisitClientIds.has(entity.id) ||
                 scheduledVisitClientIds.has(entity.originalItem?.lead_id) ||
                 scheduledVisitClientIds.has(entity.originalItem?.customer_id) ||
                 entity.category === 'Visit') {
        alertType = 'scheduled'
      }

      found.push({ ...entity, alertType, distToRouteKm: dist.toFixed(1) })
    }

    // Sort: closest to route first
    found.sort((a, b) => parseFloat(a.distToRouteKm) - parseFloat(b.distToRouteKm))
    setOnRouteClients(found)
  }, [routePath, allCandidates, selectedStop, completedVisitIds, scheduledVisitClientIds, routeAlertRadius])


  // ─── 11. View client from route alert ──────────────────────────────────
  const handleViewRouteClient = useCallback((client) => {
    setSelectedEntity(client)
    if (leafletMapRef.current && client.latitude && client.longitude) {
      leafletMapRef.current.flyTo([client.latitude, client.longitude], 15)
    }
  }, [])

  const handleSelectAsDestination = useCallback((client) => {
    handleSelectStop(client)
    setSelectedEntity(client)
  }, [handleSelectStop])

  const handleDismissAlert = useCallback((clientId) => {
    dismissedAlerts.current.add(clientId)
    setOnRouteClients(prev => prev.filter(c => c.id !== clientId))
  }, [])

  // ─── 12. Initialize Leaflet map ─────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || leafletMapRef.current) return
    const L   = window.L
    const map = L.map(mapContainerRef.current, {
      center: [executivePos.lat, executivePos.lng],
      zoom: 14,
      zoomControl: false,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    markersGroupRef.current   = L.layerGroup().addTo(map)
    polylinesGroupRef.current = L.layerGroup().addTo(map)
    leafletMapRef.current     = map
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null }
    }
  }, [mapLoaded])

  // ─── 13. Update exec marker smoothly ────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return
    const L = window.L
    if (!execMarkerRef.current) {
      const icon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
          <div class="relative w-8 h-8 rounded-full bg-cyan-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">👤</div>
        </div>`,
        className: 'exec-location-pin', iconSize: [32,32], iconAnchor: [16,16],
      })
      execMarkerRef.current = L.marker([executivePos.lat, executivePos.lng], { icon, zIndexOffset: 1000 })
        .bindPopup('<p class="text-xs font-black text-slate-800">📍 Your Current Location</p>')
        .addTo(markersGroupRef.current)
    } else {
      execMarkerRef.current.setLatLng([executivePos.lat, executivePos.lng])
    }
    // In nav mode: keep map centred on executive
    if (navMode && leafletMapRef.current) {
      leafletMapRef.current.panTo([executivePos.lat, executivePos.lng])
    }
  }, [executivePos, navMode])

  // ─── 14. Redraw destination + on-route markers + polyline ───────────────
  useEffect(() => {
    if (!leafletMapRef.current || !window.L || !markersGroupRef.current || !polylinesGroupRef.current) return
    const L = window.L
    // Clear destination + route markers + accuracy circles (not exec marker)
    const group = markersGroupRef.current
    group.eachLayer(layer => {
      if (layer !== execMarkerRef.current) group.removeLayer(layer)
    })
    polylinesGroupRef.current.clearLayers()

    // GPS Accuracy Circle around current position
    if (gpsAccuracy && gpsStatus === 'active') {
      L.circle([executivePos.lat, executivePos.lng], {
        radius: gpsAccuracy,
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(group)
    }

    // Destination marker
    if (selectedStop?.has_exact_coords) {
      const destIcon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:#2563eb;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,.4)"></div>`,
        className: '', iconSize: [36,36], iconAnchor: [18,36],
      })
      L.marker([selectedStop.latitude, selectedStop.longitude], { icon: destIcon })
        .addTo(group)
        .bindPopup(`<div style="font-size:12px;font-weight:700">${selectedStop.title}<br/><span style="color:#64748b;font-size:10px">${selectedStop.address}</span></div>`)
        .on('click', () => setSelectedEntity(selectedStop))
    }

    // On-route client markers
    onRouteClients.forEach(client => {
      const color = client.alertType === 'previous' ? '#7c3aed' : client.alertType === 'scheduled' ? '#d97706' : '#059669'
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,.3)">
          ${client.alertType === 'previous' ? '📌' : client.alertType === 'scheduled' ? '📅' : '⭐'}
        </div>`,
        className: '', iconSize: [28,28], iconAnchor: [14,14],
      })
      L.marker([client.latitude, client.longitude], { icon })
        .addTo(group)
        .bindPopup(`<div style="font-size:11px;font-weight:700">${client.title}<br/><span style="color:#64748b;font-size:10px">${client.distToRouteKm} km from route</span></div>`)
        .on('click', () => handleViewRouteClient(client))
    })

    // Route polyline
    if (routePath.length > 1) {
      L.polyline(routePath, { color: '#2563eb', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' })
        .addTo(polylinesGroupRef.current)
      // Dashed off-route overlay if applicable
      if (offRoute) {
        L.polyline(routePath, { color: '#ef4444', weight: 3, opacity: 0.6, dashArray: '8 6' })
          .addTo(polylinesGroupRef.current)
      }
    }
  }, [selectedStop, onRouteClients, routePath, offRoute, handleViewRouteClient, executivePos, gpsAccuracy, gpsStatus])

  // ─── Render ──────────────────────────────────────────────────────────────
  const visibleAlerts = onRouteClients.filter(c => !dismissedAlerts.current.has(c.id))

  return (
    <div className="relative w-full h-[88vh] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-50 font-sans">

      {/* ══ MAP CANVAS ══ */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* ══ GPS DENIED / UNAVAILABLE BANNER ══ */}
      {gpsStatus === 'denied' && (
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-rose-600 text-white text-xs font-extrabold px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <AlertCircle size={14} className="flex-shrink-0" />
          Location permission is required to use Smart Map. Please enable GPS access in your browser settings.
        </div>
      )}
      {gpsStatus === 'unavailable' && (
        <div className="absolute top-0 left-0 right-0 z-[1100] bg-amber-500 text-white text-xs font-extrabold px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <AlertCircle size={14} className="flex-shrink-0" />
          GPS is unavailable on this device. Location features are disabled.
        </div>
      )}

      {/* ══ TOP CONTROL BAR ══ */}
      <div className={`absolute left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-[1000] ${gpsStatus !== 'active' && gpsStatus !== 'loading' ? 'top-12' : 'top-4'}`}>
        {/* A. Low GPS Accuracy Alert Banner */}
        {gpsStatus === 'active' && gpsAccuracy && gpsAccuracyThreshold && gpsAccuracy > gpsAccuracyThreshold && (
          <div className="bg-rose-600 text-white text-[11px] font-black p-2.5 rounded-xl shadow-lg mb-2 flex items-center gap-1.5 border border-rose-500 animate-pulse">
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span>GPS location accuracy is low. Move outdoors/open the location services and try again.</span>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-3 space-y-2">

          {/* Search row */}
          <div className="flex items-center gap-2">
            {/* GPS indicator */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              gpsStatus === 'active'   ? 'bg-cyan-100' :
              gpsStatus === 'loading'  ? 'bg-slate-100' :
              'bg-rose-100'
            }`}>
              {gpsStatus === 'loading'
                ? <Loader2 size={14} className="text-slate-400 animate-spin" />
                : gpsStatus === 'active'
                ? <Radio size={14} className="text-cyan-600" />
                : <AlertCircle size={14} className="text-rose-500" />
              }
            </div>

            {/* Search input */}
            <div className="relative flex-1">
              <Search size={13} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearchQuery('')}
                placeholder="Search lead, customer, company…"
                className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition flex-shrink-0 cursor-pointer"
              title="Browse all leads & customers"
            >
              <List size={15} />
            </button>
          </div>

          {/* GPS Accuracy display */}
          {gpsStatus === 'active' && gpsAccuracy && (
            <div className="flex items-center gap-1 text-[10px] text-cyan-600 font-bold px-1 select-none">
              <Compass size={11} className="animate-spin-slow" />
              <span>GPS Accuracy: {Math.round(gpsAccuracy)} m</span>
              {gpsAccuracy <= gpsAccuracyThreshold ? (
                <span className="text-[9px] text-emerald-500 bg-emerald-50 px-1 py-0.5 rounded ml-auto">Precise</span>
              ) : (
                <span className="text-[9px] text-rose-500 bg-rose-50 px-1 py-0.5 rounded ml-auto flex items-center gap-0.5">⚠️ Poor</span>
              )}
            </div>
          )}

          {/* Search suggestions dropdown */}
          {searchSuggestions.length > 0 && searchQuery && (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50">
              {searchSuggestions.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelectStop(item)}
                  className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between gap-2 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${categoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 truncate">{item.title}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{item.address}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.has_exact_coords
                      ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">📍 {item.distanceKm} km</span>
                      : <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">No coords</span>
                    }
                    <ChevronRight size={13} className="text-slate-300" />
                  </div>
                </div>
              ))}
              {dataLoading && (
                <div className="p-2.5 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </div>
              )}
            </div>
          )}
          {searchQuery && !dataLoading && searchSuggestions.length === 0 && (
            <p className="text-[11px] text-slate-400 font-bold px-1 pb-1">No results found for "{searchQuery}"</p>
          )}
        </div>
      </div>

      {/* ══ ROUTE INFORMATION PANEL ══ */}
      {selectedStop && (
        <div className="absolute z-[1000] left-4 right-4 md:left-6 md:right-auto md:w-[420px]"
          style={{ top: gpsStatus !== 'active' && gpsStatus !== 'loading' ? '11rem' : '9rem' }}>
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-3.5 space-y-2.5 animate-slideDown">

            {/* Destination header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Destination</p>
                <h3 className="text-sm font-black text-white truncate mt-0.5">{selectedStop.title}</h3>
                {selectedStop.contact_person && (
                  <p className="text-[11px] text-slate-400 font-semibold">{selectedStop.contact_person}</p>
                )}
                <p className="text-[10px] text-slate-500 font-semibold truncate">{selectedStop.address}</p>
                {selectedStop.has_exact_coords && (
                  <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                    {selectedStop.latitude?.toFixed(5)}, {selectedStop.longitude?.toFixed(5)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedStop(null); setRoutePath([]); setRouteDetails(null)
                  setRouteStatus('idle'); setNavMode(false); setOnRouteClients([])
                  setSelectedEntity(null)
                }}
                className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Route metrics loading/fallback messages only (no distance/duration/ETA display) */}
            {routeStatus === 'loading' && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                <Loader2 size={13} className="animate-spin text-blue-400" />
                Calculating road route…
              </div>
            )}

            {routeStatus === 'fallback' && (
              <div className="bg-slate-800 rounded-xl px-4 py-3 border border-rose-500/30">
                <p className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Road route unavailable
                </p>
              </div>
            )}
            {routeStatus === 'failed' && (
              <p className="text-xs text-rose-400 font-bold">Route calculation failed. Check connection.</p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (leafletMapRef.current && selectedStop.has_exact_coords) {
                    leafletMapRef.current.flyTo([selectedStop.latitude, selectedStop.longitude], 15)
                  }
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Map size={13} /> View Route
              </button>
              {navMode ? (
                <button
                  onClick={stopNavigation}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <X size={13} /> Stop Nav
                </button>
              ) : (
                <button
                  onClick={startNavigation}
                  disabled={!selectedStop.has_exact_coords || routeStatus === 'loading' || routeStatus === 'fallback'}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Navigation size={13} /> Navigate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ NAVIGATION MODE OVERLAY ══ */}
      {navMode && (
        <div className="absolute top-4 right-4 z-[1000] space-y-2 max-w-[200px]">
          <div className="bg-blue-600 text-white rounded-2xl shadow-xl px-3 py-2.5 flex items-center gap-2">
            <Activity size={14} className="animate-pulse" />
            <span className="text-xs font-black">Navigation Active</span>
          </div>
          {offRoute && (
            <div className="bg-rose-600 text-white rounded-2xl shadow-xl px-3 py-2.5 flex items-center gap-2 animate-pulse">
              <AlertTriangle size={14} />
              <div>
                <p className="text-[10px] font-black leading-tight">You're off your</p>
                <p className="text-[10px] font-black leading-tight">planned route.</p>
                <p className="text-[9px] text-rose-200 font-bold mt-0.5">Recalculating…</p>
              </div>
            </div>
          )}
          {nearDestination && !offRoute && (
            <div className="bg-emerald-600 text-white rounded-2xl shadow-xl px-3 py-2.5 flex items-center gap-2">
              <Target size={14} />
              <div>
                <p className="text-[10px] font-black leading-tight">You are near your</p>
                <p className="text-[10px] font-black leading-tight">destination.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ON-ROUTE CLIENTS PANEL ══ */}
      {visibleAlerts.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] w-[90%] max-w-sm space-y-2">
          {/* Toggle header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-blue-600 animate-bounce" />
              <span className="text-xs font-black text-slate-900">
                {visibleAlerts.length === 1
                  ? '1 client on your route'
                  : `${visibleAlerts.length} clients on your route`}
              </span>
            </div>
            <button
              onClick={() => setShowRouteAlerts(v => !v)}
              className="text-[10px] font-black text-slate-400 hover:text-slate-700 transition"
            >
              {showRouteAlerts ? 'Hide' : 'Show'}
            </button>
          </div>

          {showRouteAlerts && visibleAlerts.map((client, idx) => {
            const { label, color, border } = alertTypeLabel(client.alertType)
            return (
              <div
                key={client.id}
                className={`bg-gradient-to-r ${color} text-white p-3 rounded-2xl shadow-2xl flex items-start justify-between gap-2 border ${border} animate-fadeIn`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={13} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wide opacity-75">{label}</p>
                    <p className="text-xs font-black leading-tight truncate">{client.title}</p>
                    {/* No distance or duration display */}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleViewRouteClient(client)}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 font-black text-[10px] rounded-lg transition cursor-pointer text-center"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDismissAlert(client.id)}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 font-bold text-[9px] rounded-lg transition cursor-pointer text-center opacity-70"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══ SELECTED ENTITY DETAIL CARD ══ */}
      {selectedEntity && !showAddModal && (
        <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-[1000]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3 animate-slideUp">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded uppercase ${categoryColor(selectedEntity.category)}`}>
                  {selectedEntity.category}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1 leading-tight">{selectedEntity.title}</h3>
                {selectedEntity.contact_person && (
                  <p className="text-[11px] text-slate-400 font-semibold">{selectedEntity.contact_person}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {!selectedEntity.has_exact_coords ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                  <span className="text-rose-700 font-extrabold">Exact location unavailable</span>
                </div>
                <button
                  onClick={() => showToast('Open Leads or Customers to set coordinates via the location picker.', 'info')}
                  className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-extrabold hover:bg-rose-700 transition cursor-pointer"
                >
                  How to fix
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-2.5 space-y-1 text-xs text-slate-600 font-semibold">
                <p className="truncate">📍 {selectedEntity.address}</p>
                <p className="font-mono text-[10px] text-slate-400">
                  {selectedEntity.latitude?.toFixed(6)}, {selectedEntity.longitude?.toFixed(6)}
                </p>
                {selectedEntity.phone && <p>📞 {selectedEntity.phone}</p>}
                {selectedEntity.distanceKm && <p>📏 {selectedEntity.distanceKm} km away (straight-line)</p>}
                {selectedEntity.last_visited && <p>⏰ Last visited: {selectedEntity.last_visited}</p>}
                {selectedEntity.next_followup && <p>📅 Scheduled: {selectedEntity.next_followup}</p>}
              </div>
            )}

            <div className="flex gap-2">
              {selectedEntity.has_exact_coords && selectedEntity.id !== selectedStop?.id && (
                <button
                  onClick={() => handleSelectAsDestination(selectedEntity)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Route size={13} /> Set as Destination
                </button>
              )}
              {selectedEntity.phone && (
                <a
                  href={`tel:${selectedEntity.phone}`}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={13} /> Call
                </a>
              )}
              {selectedEntity.has_exact_coords && (
                <a
                  href={getDirectionsUrl(selectedEntity, executivePos.lat, executivePos.lng)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Navigation size={13} /> Google Nav
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ BROWSE MODAL ══ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" /> Select Destination
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Choose a Lead or Customer to route to
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl flex-shrink-0">
              {[
                { key: 'leads', label: 'Leads', count: allLeads.length },
                { key: 'customers', label: 'Customers', count: allCustomers.length },
                { key: 'visits', label: 'Visits', count: allVisits.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition cursor-pointer text-center ${
                    activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-[9px] font-black text-slate-400">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 p-0.5 min-h-0">
              {dataLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400 font-bold">
                  <Loader2 size={16} className="animate-spin text-blue-500" /> Loading records…
                </div>
              ) : (
                <>
                  {activeTab === 'leads' && (allLeads.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-10 font-bold">No leads assigned to you.</p>
                    : allLeads.map(l => (
                        <DestItem key={l.id} item={l} onSelect={() => handleSelectStop(l)} isSelected={selectedStop?.id === l.id} />
                      ))
                  )}
                  {activeTab === 'customers' && (allCustomers.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-10 font-bold">No customers assigned to you.</p>
                    : allCustomers.map(c => (
                        <DestItem key={c.id} item={c} onSelect={() => handleSelectStop(c)} isSelected={selectedStop?.id === c.id} />
                      ))
                  )}
                  {activeTab === 'visits' && (allVisits.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-10 font-bold">No visits scheduled.</p>
                    : allVisits.map(v => (
                        <DestItem key={v.id} item={v} onSelect={() => handleSelectStop(v)} isSelected={selectedStop?.id === v.id} />
                      ))
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ GPS LOADING OVERLAY (initial) ══ */}
      {gpsStatus === 'loading' && !mapLoaded && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="text-center space-y-3">
            <Loader2 size={32} className="text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-black text-slate-700">Loading Smart Map…</p>
            <p className="text-xs text-slate-400 font-semibold">Acquiring GPS position</p>
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
