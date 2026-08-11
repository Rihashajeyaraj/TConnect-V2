import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  MapPin,
  Navigation,
  Compass,
  Search,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Building2,
  X,
  Plus,
  Navigation2,
  Bell,
  Sparkles,
  PhoneCall,
  Check,
  Map,
  ChevronRight
} from 'lucide-react'
import { crmAPI, customerAPI, visitAPI, spatialAPI, authAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { filterUserItems } from '../../utils/userScope.js'

const DEFAULT_CENTER = { lat: 13.0067, lng: 80.2570 } // Adyar, Chennai

// Landmark coords dictionary for coordinate resolution
const LANDMARK_COORDS = {
  "vijaya mall": { lat: 13.0515, lng: 80.2100 },
  "forum mall": { lat: 13.0515, lng: 80.2100 },
  "vadapalani": { lat: 13.0515, lng: 80.2100 },
  "adyar": { lat: 13.0067, lng: 80.2570 },
  "guindy": { lat: 12.9815, lng: 80.2180 },
  "t. nagar": { lat: 13.0418, lng: 80.2341 },
  "t nagar": { lat: 13.0418, lng: 80.2341 },
  "omr": { lat: 12.9716, lng: 80.2450 },
  "velachery": { lat: 12.9815, lng: 80.2180 },
  "tidal park": { lat: 12.9890, lng: 80.2470 },
  "chennai central": { lat: 13.0827, lng: 80.2707 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
}

// Coordinate parsing helper
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

// Get standard Google directions URL
export function getDirectionsUrl(item, execLat, execLng) {
  if (!item) return '#'
  const rawLoc = String(item.address || item.location || '').trim()
  if (rawLoc.startsWith('http://') || rawLoc.startsWith('https://')) {
    return rawLoc
  }
  if (item.latitude && item.longitude) {
    return `https://www.google.com/maps/dir/?api=1&origin=${execLat},${execLng}&destination=${item.latitude},${item.longitude}`
  }
  const targetText = rawLoc || item.title || 'Vadapalani, Chennai'
  return `https://www.google.com/maps/dir/?api=1&origin=${execLat},${execLng}&destination=${encodeURIComponent(targetText)}`
}

// Distance computation helper (Haversine formula in km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function SmartClientMap() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // References
  const mapContainerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersGroupRef = useRef(null)
  const polylinesGroupRef = useRef(null)

  // Positions & Map Setup
  const [mapLoaded, setMapLoaded] = useState(false)
  const [executivePos, setExecutivePos] = useState({ lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng })
  const [isGpsActive, setIsGpsActive] = useState(false)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState('visits') // 'visits' | 'leads' | 'customers'

  // Data collections
  const [rawLeads, setRawLeads] = useState([])
  const [rawCustomers, setRawCustomers] = useState([])
  const [rawVisits, setRawVisits] = useState([])
  const [loading, setLoading] = useState(true)

  // Selection & Route States
  const [selectedStops, setSelectedStops] = useState([]) // Stops selected along current route
  const [routePath, setRoutePath] = useState([]) // road coords [lat, lng]
  const [routeDetails, setRouteDetails] = useState(null) // { distanceKm, durationMins }
  const [selectedEntity, setSelectedEntity] = useState(null) // Entity displayed on detail card

  // Alert/Proximity States
  const [enRoutePrevClient, setEnRoutePrevClient] = useState(null)
  const [nearbyClient, setNearbyClient] = useState(null)
  const [showPrevAlert, setShowPrevAlert] = useState(false)
  const [showNearbyAlert, setShowNearbyAlert] = useState(false)

  // 1. Initialize Leaflet Assets
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
      return
    }
    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(cssLink)

    const jsScript = document.createElement('script')
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    jsScript.onload = () => setMapLoaded(true)
    document.body.appendChild(jsScript)
  }, [])

  // 2. Fetch GPS Location
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsGpsActive(false)
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setExecutivePos({ lat: latitude, lng: longitude })
        setIsGpsActive(true)

        // Telemetry update to backend
        spatialAPI.updateLocation({
          email: currentUser?.email || 'executive@tconnect.com',
          name: currentUser?.name || 'Sales Executive',
          employee_code: currentUser?.employee_code || 'EMP000012',
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        }).catch(() => null)
      },
      () => {
        setIsGpsActive(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [currentUser?.email])

  // 3. Fetch Scoped Database Records
  const loadDatabaseData = async () => {
    setLoading(true)
    try {
      let activeUser = currentUser
      if (!activeUser || !activeUser.email) {
        activeUser = getStoredUser()
      }

      // If still empty, fetch online profile details dynamically
      if (!activeUser || !activeUser.email) {
        try {
          const profile = await authAPI.me()
          const pData = profile?.data || profile
          if (pData && pData.email) {
            activeUser = {
              id: pData.id || pData.user_id || pData.sub || 'usr_default',
              user_id: pData.user_id || pData.id || pData.sub || 'usr_default',
              employee_id: pData.employee_id || pData.employee_code || 'EMP000012',
              employee_code: pData.employee_code || pData.employee_id || 'EMP000012',
              email: pData.email.toLowerCase().trim(),
              name: pData.name || pData.full_name || 'Sales Executive',
              full_name: pData.full_name || pData.name || 'Sales Executive',
              role: pData.role || 'Sales Executive',
            }
            localStorage.setItem('user', JSON.stringify(activeUser))
          }
        } catch (e) {
          console.warn("SmartMap: Failed dynamic profile resolution:", e)
        }
      }

      const [leadsRes, custsRes, visitsRes] = await Promise.allSettled([
        crmAPI.getLeads(),
        customerAPI.getCustomers(),
        visitAPI.getVisits()
      ])

      let leadsList = []
      let custsList = []
      let visitsList = []

      if (leadsRes.status === 'fulfilled' && leadsRes.value?.data) {
        leadsList = filterUserItems(leadsRes.value.data, activeUser)
      }
      if (custsRes.status === 'fulfilled' && custsRes.value?.data) {
        custsList = filterUserItems(custsRes.value.data, activeUser)
      }
      if (visitsRes.status === 'fulfilled') {
        const list = Array.isArray(visitsRes.value) ? visitsRes.value : (visitsRes.value?.data || [])
        visitsList = filterUserItems(list, activeUser)
      }

      setRawLeads(leadsList)
      setRawCustomers(custsList)
      setRawVisits(visitsList)
    } catch (err) {
      console.warn("Failed fetching records:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatabaseData()
  }, [currentUser?.email])

  // 4. Normalize Entities
  const normalizeData = (list, category) => {
    return list.map((item, idx) => {
      let lat = Number(item.latitude || item.lat)
      let lng = Number(item.longitude || item.lng)
      let hasExactCoords = Boolean(lat && lng && !isNaN(lat) && !isNaN(lng))

      const candidates = [item.map_location, item.location, item.address, item.city, item.landmark]
      for (const cand of candidates) {
        if (!cand) continue
        const coords = extractCoordsFromUrlOrString(cand)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
          hasExactCoords = true
          break
        }
      }

      // Default positioning offsets so they reside near executive
      if (!hasExactCoords) {
        const offsetLat = (((idx * 7) % 5) - 2) * 0.003
        const offsetLng = (((idx * 3) % 5) - 2) * 0.003
        lat = executivePos.lat + offsetLat
        lng = executivePos.lng + offsetLng
      }

      const dist = haversineDistance(lat, lng, executivePos.lat, executivePos.lng)
      const title = item.company || item.company_name || item.name || item.client_name || `Client #${idx + 1}`

      return {
        id: item.id || item.visit_id || `${category.toLowerCase()}_${idx}`,
        title,
        contact_person: item.person || item.contact_person || item.name || item.employee_name || 'Contact Person',
        category, // 'Lead' | 'Customer' | 'Visit'
        latitude: lat,
        longitude: lng,
        has_exact_coords: hasExactCoords,
        address: item.address || item.location || 'Chennai Site',
        phone: item.phone || item.mobile || '+91 98765 43210',
        email: item.email || '',
        status: item.status || 'Active',
        priority: item.category || item.priority || 'Normal',
        distanceKm: dist.toFixed(1),
        last_visited: item.last_visited || item.date || item.visit_date || null,
        next_followup: item.next_followup || item.visit_time || null,
        originalItem: item
      }
    })
  }

  const allLeads = useMemo(() => normalizeData(rawLeads, 'Lead'), [rawLeads, executivePos])
  const allCustomers = useMemo(() => normalizeData(rawCustomers, 'Customer'), [rawCustomers, executivePos])
  const allVisits = useMemo(() => normalizeData(rawVisits, 'Visit'), [rawVisits, executivePos])

  // Completed Visits list for "Previous Clients" check
  const completedVisits = useMemo(() => {
    return allVisits.filter(v => v.status === 'COMPLETED' || v.status === 'CHECKED_OUT' || v.status === 'visited')
  }, [allVisits])

  // Aggregate List of all active destinations (excluding completed visits)
  const activeDestinations = useMemo(() => {
    const activeVisits = allVisits.filter(v => v.status !== 'COMPLETED' && v.status !== 'CHECKED_OUT' && v.status !== 'visited')
    return [...activeVisits, ...allLeads, ...allCustomers]
  }, [allLeads, allCustomers, allVisits])

  // 5. Search filtering suggestions dropdown list
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []
    return activeDestinations.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.contact_person || '').toLowerCase().includes(q) ||
      (e.address || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q)
    ).slice(0, 5)
  }, [searchQuery, activeDestinations])

  // 6. Draw Actual Road-Following route via OSRM API
  const fetchRouteDetails = async (stops) => {
    if (!stops || stops.length === 0) {
      setRoutePath([])
      setRouteDetails(null)
      return
    }

    const points = [[executivePos.lng, executivePos.lat]]
    stops.forEach(s => points.push([s.longitude, s.latitude]))

    const coordinatesStr = points.map(p => `${p[0]},${p[1]}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesStr}?overview=full&geometries=geojson`

    try {
      const response = await fetch(url)
      const data = await response.json()
      if (data.code === 'Ok' && data.routes?.length > 0) {
        const route = data.routes[0]
        const roadCoords = route.geometry.coordinates.map(c => [c[1], c[0]])
        setRoutePath(roadCoords)
        setRouteDetails({
          distanceKm: (route.distance / 1000).toFixed(1),
          durationMins: Math.ceil(route.duration / 60)
        })
        return
      }
    } catch (err) {
      console.warn("OSRM routing notice:", err)
    }

    // Straight polyline fallback
    const fallbackPath = [[executivePos.lat, executivePos.lng], ...stops.map(s => [s.latitude, s.longitude])]
    setRoutePath(fallbackPath)
    let dist = 0
    for (let i = 0; i < fallbackPath.length - 1; i++) {
      dist += haversineDistance(fallbackPath[i][0], fallbackPath[i][1], fallbackPath[i+1][0], fallbackPath[i+1][1])
    }
    setRouteDetails({
      distanceKm: dist.toFixed(1),
      durationMins: Math.ceil(dist * 2.5) // roughly 25km/h in city traffic
    })
  }

  // Handle Stop Addition / Path trigger
  const handleSelectStop = (entity) => {
    setSelectedStops([entity])
    setSelectedEntity(entity)
    setSearchQuery('')
    fetchRouteDetails([entity])
  }

  // 7. Check Alerts & Proximity Conditions
  useEffect(() => {
    if (routePath.length === 0) {
      setEnRoutePrevClient(null)
      setShowPrevAlert(false)
      setNearbyClient(null)
      setShowNearbyAlert(false)
      return
    }

    // A. Check for Previous Client on the Way (Distance to polyline path < 1.0 km)
    let prevFound = null
    for (const client of completedVisits) {
      let minD = Infinity
      for (const pt of routePath) {
        const d = haversineDistance(client.latitude, client.longitude, pt[0], pt[1])
        if (d < minD) minD = d
      }
      if (minD < 1.0) {
        prevFound = client
        break
      }
    }
    setEnRoutePrevClient(prevFound)
    setShowPrevAlert(!!prevFound)

    // B. Check for Nearby Client (Distance to agent pos or path < 2.0 km)
    let nearbyFound = null
    const excludedIds = new Set(selectedStops.map(s => s.id))
    if (prevFound) excludedIds.add(prevFound.id)

    for (const client of activeDestinations) {
      if (excludedIds.has(client.id)) continue
      let dStart = haversineDistance(client.latitude, client.longitude, executivePos.lat, executivePos.lng)
      let minD = dStart

      for (const pt of routePath) {
        const d = haversineDistance(client.latitude, client.longitude, pt[0], pt[1])
        if (d < minD) minD = d
      }

      if (minD < 2.0) {
        nearbyFound = client
        break
      }
    }
    setNearbyClient(nearbyFound)
    setShowNearbyAlert(!!nearbyFound)
  }, [routePath, completedVisits, activeDestinations, selectedStops, executivePos])

  // Alert Click Action Helpers
  const handleViewPreviousClient = () => {
    if (enRoutePrevClient) {
      setSelectedEntity(enRoutePrevClient)
      // Inject previous client into route
      const newStops = [enRoutePrevClient, ...selectedStops.filter(s => s.id !== enRoutePrevClient.id)]
      setSelectedStops(newStops)
      fetchRouteDetails(newStops)
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo([enRoutePrevClient.latitude, enRoutePrevClient.longitude], 15)
      }
    }
  }

  const handleViewNearbyClient = () => {
    if (nearbyClient) {
      setSelectedEntity(nearbyClient)
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo([nearbyClient.latitude, nearbyClient.longitude], 15)
      }
    }
  }

  // 8. Bind map initialization
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || leafletMapRef.current) return
    const L = window.L
    const map = L.map(mapContainerRef.current, {
      center: [executivePos.lat, executivePos.lng],
      zoom: 14,
      zoomControl: false
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO & OpenStreetMap',
      maxZoom: 19
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    markersGroupRef.current = L.layerGroup().addTo(map)
    polylinesGroupRef.current = L.layerGroup().addTo(map)
    leafletMapRef.current = map

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [mapLoaded])

  // 9. Render Map markers & Polyline updates
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return
    const L = window.L
    const markersGroup = markersGroupRef.current
    const polylinesGroup = polylinesGroupRef.current

    markersGroup.clearLayers()
    polylinesGroup.clearLayers()

    // Pulse icon for agent
    const execIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
          <div class="relative w-8 h-8 rounded-full bg-cyan-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">
            👤
          </div>
        </div>
      `,
      className: 'exec-location-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    L.marker([executivePos.lat, executivePos.lng], { icon: execIcon })
      .bindPopup(`<p class="text-xs font-black text-slate-800">Your Current Location</p>`)
      .addTo(markersGroup)

    // Render Markers for selected stops
    selectedStops.forEach(stop => {
      const stopIcon = L.divIcon({
        html: `
          <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">
            📍
          </div>
        `,
        className: 'stop-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
      L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
        .addTo(markersGroup)
        .on('click', () => setSelectedEntity(stop))
    })

    // Render Previous client marker if en-route
    if (enRoutePrevClient) {
      const prevIcon = L.divIcon({
        html: `
          <div class="w-8 h-8 rounded-full bg-purple-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">
            📌
          </div>
        `,
        className: 'prev-client-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
      L.marker([enRoutePrevClient.latitude, enRoutePrevClient.longitude], { icon: prevIcon })
        .addTo(markersGroup)
        .on('click', () => setSelectedEntity(enRoutePrevClient))
    }

    // Render Nearby client marker if alert triggered
    if (nearbyClient) {
      const nearbyIcon = L.divIcon({
        html: `
          <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">
            ⭐
          </div>
        `,
        className: 'nearby-client-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
      L.marker([nearbyClient.latitude, nearbyClient.longitude], { icon: nearbyIcon })
        .addTo(markersGroup)
        .on('click', () => setSelectedEntity(nearbyClient))
    }

    // Draw route path
    if (routePath.length > 0) {
      L.polyline(routePath, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.85
      }).addTo(polylinesGroup)
    }
  }, [executivePos, selectedStops, enRoutePrevClient, nearbyClient, routePath])

  return (
    <div className="relative w-full h-[85vh] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-50 font-sans">
      
      {/* ── MAP CANVAS ── */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* ── TOP CONTROL PANEL (SEARCH BAR & "+" BUTTON) ── */}
      <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-[1000] bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, company..."
            className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
          />

          {/* Suggestions Dropdown */}
          {searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto p-1.5 space-y-1 z-50">
              {searchSuggestions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectStop(item)}
                  className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.address}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Toggle Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition shrink-0 cursor-pointer"
          title="Add Stop / Select Leads"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* ── ROUTE DETAILS FLOATING CARD (Requirement 4) ── */}
      {routeDetails && (
        <div className="absolute top-20 left-4 right-4 md:left-6 md:right-auto md:w-96 z-[1000] bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between text-xs animate-slideDown">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Directions Path</span>
            <p className="font-extrabold text-slate-100 mt-0.5">To: {selectedStops[0]?.title || 'Selected Destination'}</p>
          </div>
          <div className="flex gap-4 text-right shrink-0">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Distance</span>
              <span className="font-black text-blue-400">{routeDetails.distanceKm} km</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Duration</span>
              <span className="font-black text-emerald-400">~{routeDetails.durationMins} mins</span>
            </div>
          </div>
        </div>
      )}

      {/* ── DYNAMIC EN-ROUTE ALERTS OVERLAY (Requirement 5 & 6) ── */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2 max-w-sm w-[90%] md:w-auto">
        
        {/* A. Previous Client Alert */}
        {showPrevAlert && enRoutePrevClient && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-purple-500/25 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-white animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black">Hey! You have a previous client on the way.</h4>
                <p className="text-[10px] text-purple-100 font-semibold truncate leading-tight mt-0.5">{enRoutePrevClient.title}</p>
              </div>
            </div>
            <button
              onClick={handleViewPreviousClient}
              className="px-3 py-1.5 bg-white text-purple-950 hover:bg-purple-50 font-black text-[10px] rounded-lg shrink-0 transition shadow-sm cursor-pointer"
            >
              View
            </button>
          </div>
        )}

        {/* B. Nearby Client Alert */}
        {showNearbyAlert && nearbyClient && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-emerald-500/25 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black">Hey! You have a nearby client.</h4>
                <p className="text-[10px] text-emerald-100 font-semibold truncate leading-tight mt-0.5">{nearbyClient.title}</p>
              </div>
            </div>
            <button
              onClick={handleViewNearbyClient}
              className="px-3 py-1.5 bg-white text-emerald-950 hover:bg-emerald-50 font-black text-[10px] rounded-lg shrink-0 transition shadow-sm cursor-pointer"
            >
              View
            </button>
          </div>
        )}
      </div>

      {/* ── CLIENT DETAILS PANEL OVERLAY (Requirement 8) ── */}
      {selectedEntity && (
        <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-[1000] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 space-y-3.5 animate-slideUp">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase`}>
                {selectedEntity.category}
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-tight mt-1">{selectedEntity.title}</h3>
              <p className="text-[11px] font-bold text-slate-400">{selectedEntity.contact_person}</p>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="truncate">📍 {selectedEntity.address}</p>
            <p>📞 Phone: {selectedEntity.phone}</p>
            {selectedEntity.last_visited && <p>⏰ Last Visited: {selectedEntity.last_visited}</p>}
            {selectedEntity.next_followup && <p>📅 Scheduled: {selectedEntity.next_followup}</p>}
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${selectedEntity.phone}`}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <PhoneCall size={14} /> Call Client
            </a>
            <a
              href={getDirectionsUrl(selectedEntity, executivePos.lat, executivePos.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Navigation size={14} /> Navigate
            </a>
          </div>
        </div>
      )}

      {/* ── ADD STOPS / SELECT LEADS MODAL (Requirement 3) ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 flex flex-col max-h-[80vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" /> Select Targets & Plan Route
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Select a destination to display route paths</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scoped Segment Tabs */}
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'visits', label: 'Scheduled Visits' },
                { key: 'leads', label: 'Active Leads' },
                { key: 'customers', label: 'Customers' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition cursor-pointer text-center ${
                    activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Scoped Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-0.5">
              {loading ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Loading records...</p>
              ) : (
                <>
                  {activeTab === 'visits' && (
                    allVisits.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6 font-bold">No visits scheduled today.</p>
                    ) : (
                      allVisits.map(v => (
                        <div
                          key={v.id}
                          onClick={() => handleSelectStop(v) || setShowAddModal(false)}
                          className="bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-xl p-3 flex justify-between items-center transition cursor-pointer"
                        >
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{v.title}</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">📍 Address: {v.address}</p>
                            <p className="text-[9px] text-blue-700 font-bold mt-0.5">📅 Visit: {v.next_followup || 'Today 10:00 AM'}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      ))
                    )
                  )}

                  {activeTab === 'leads' && (
                    allLeads.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6 font-bold">No active leads assigned.</p>
                    ) : (
                      allLeads.map(l => (
                        <div
                          key={l.id}
                          onClick={() => handleSelectStop(l) || setShowAddModal(false)}
                          className="bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-xl p-3 flex justify-between items-center transition cursor-pointer"
                        >
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{l.title}</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">📍 Location: {l.address}</p>
                            <p className="text-[9px] text-rose-700 font-bold mt-0.5">🔥 Priority: {l.priority}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      ))
                    )
                  )}

                  {activeTab === 'customers' && (
                    allCustomers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6 font-bold">No active customers found.</p>
                    ) : (
                      allCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectStop(c) || setShowAddModal(false)}
                          className="bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-xl p-3 flex justify-between items-center transition cursor-pointer"
                        >
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{c.title}</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">📍 Address: {c.address}</p>
                            <p className="text-[9px] text-emerald-700 font-bold mt-0.5">🏢 Account Status: {c.status}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      ))
                    )
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
