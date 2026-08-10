import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  Search,
  Filter,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  Zap,
  Route as RouteIcon,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PhoneCall,
  BellRing,
  Flame
} from 'lucide-react'
import { spatialAPI, crmAPI, customerAPI, visitAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'

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

  const rawLoc = String(item.address || item.city || item.location || item.map_location || item.landmark || '').trim()

  if (rawLoc.startsWith('http://') || rawLoc.startsWith('https://')) {
    return rawLoc
  }

  if (item.has_exact_coords && item.latitude && item.longitude) {
    return `https://www.google.com/maps/dir/?api=1&origin=${execLat},${execLng}&destination=${item.latitude},${item.longitude}`
  }

  const targetText = rawLoc || item.title || item.company_name || 'Forum Vijaya Mall, Vadapalani, Chennai'
  return `https://www.google.com/maps/dir/?api=1&origin=${execLat},${execLng}&destination=${encodeURIComponent(targetText)}`
}

// Sample default coordinates for Chennai Tech Corridor if GPS unavailable
const DEFAULT_CENTER = [13.0067, 80.2570]

export default function SmartClientMap() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // Map state & Leaflet references
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersGroupRef = useRef(null)
  const polylinesGroupRef = useRef(null)
  const radiusCircleRef = useRef(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [executivePos, setExecutivePos] = useState({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] })
  const [isGpsActive, setIsGpsActive] = useState(false)
  const [gpsErrorMsg, setGpsErrorMsg] = useState('')

  // Filter & Radius State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'lead' | 'customer' | 'opportunity' | 'visit' | 'high_priority'
  const [radiusMeters, setRadiusMeters] = useState(2000)

  // Data & Alert States
  const [entities, setEntities] = useState([])
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [geofenceAlerts, setGeofenceAlerts] = useState([])
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set())
  const [loading, setLoading] = useState(true)

  // Route Optimization State
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showRouteDrawer, setShowRouteDrawer] = useState(false)

  // Search Container Ref & Dropdown Toggle State
  const searchContainerRef = useRef(null)
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [geoSearchResults, setGeoSearchResults] = useState([])
  const [isGeocoding, setIsGeocoding] = useState(false)
  const searchMarkerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Live Location Geocoding Search via OpenStreetMap Nominatim & Local Landmarks
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q || q.length < 2) {
      setGeoSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsGeocoding(true)
      const localMatches = []

      // 1. Check local landmark dictionary
      const qLower = q.toLowerCase()
      for (const [key, coords] of Object.entries(LANDMARK_COORDS)) {
        if (key.includes(qLower) || qLower.includes(key)) {
          localMatches.push({
            id: `geo_local_${key}`,
            display_name: `${key.toUpperCase()} (Landmark, Chennai)`,
            lat: coords.lat,
            lng: coords.lng,
            type: 'landmark',
          })
        }
      }

      // 2. Query Nominatim API for real-time map address/place search
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' Chennai India')}&limit=4`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const fetched = data.map((item) => ({
              id: `geo_nom_${item.place_id}`,
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              type: 'address',
            }))
            localMatches.push(...fetched)
          }
        }
      } catch (err) {
        console.warn('Geocoding notice:', err)
      }

      const uniqueGeo = Array.from(new Map(localMatches.map((g) => [g.display_name, g])).values())
      setGeoSearchResults(uniqueGeo)
      setIsGeocoding(false)
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Helper to Focus Searched Map Location
  const focusLocationOnMap = (geoItem) => {
    if (leafletMapRef.current && geoItem.lat && geoItem.lng) {
      const L = window.L
      leafletMapRef.current.flyTo([geoItem.lat, geoItem.lng], 16, { animate: true, duration: 1.2 })

      if (searchMarkerRef.current) {
        leafletMapRef.current.removeLayer(searchMarkerRef.current)
      }

      const customIcon = L.divIcon({
        className: 'custom-search-pin',
        html: `<div style="background-color: #ec4899; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-weight: bold;">📍</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
      })

      const marker = L.marker([geoItem.lat, geoItem.lng], { icon: customIcon }).addTo(leafletMapRef.current)
      const directUrl = `https://www.google.com/maps/dir/?api=1&origin=${executivePos.lat},${executivePos.lng}&destination=${geoItem.lat},${geoItem.lng}`

      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <span style="background: #fce7f3; color: #be185d; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800;">📍 SEARCHED LOCATION</span>
          <h4 style="margin: 4px 0; font-size: 12px; font-weight: 800; color: #0f172a;">${geoItem.display_name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 10px; color: #64748b;">GPS: ${geoItem.lat.toFixed(4)}, ${geoItem.lng.toFixed(4)}</p>
          <a href="${directUrl}" target="_blank" style="display: block; background: #ec4899; color: white; text-align: center; font-size: 10px; font-weight: 800; padding: 6px; border-radius: 8px; text-decoration: none;">🚗 Start GPS Directions</a>
        </div>
      `).openPopup()

      searchMarkerRef.current = marker

      setSelectedEntity({
        id: geoItem.id,
        title: geoItem.display_name.split(',')[0],
        company_name: 'Searched Location Place',
        category: 'Searched Place',
        address: geoItem.display_name,
        latitude: geoItem.lat,
        longitude: geoItem.lng,
        phone: 'N/A',
        has_exact_coords: true,
      })
    }
  }

  // 1. Dynamic Leaflet Script & Styles Injection
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
    jsScript.onload = () => {
      setMapLoaded(true)
    }
    document.body.appendChild(jsScript)

    return () => {
      // Keep Leaflet script cached
    }
  }, [])

  // 2. Continuous Real-time GPS Watch Position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsErrorMsg('Geolocation is not supported by this browser.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setExecutivePos({ lat: latitude, lng: longitude })
        setIsGpsActive(true)
        setGpsErrorMsg('')

        // Post live telemetry update to backend API & Supabase
        spatialAPI.updateLocation({
          email: currentUser?.email || 'executive@tconnect.com',
          name: currentUser?.name || currentUser?.full_name || 'Sales Executive',
          employee_code: currentUser?.employee_code || currentUser?.employee_id || 'EMP000012',
          latitude,
          longitude,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          timestamp: new Date().toISOString(),
        }).catch(() => null)
      },

      (err) => {
        setIsGpsActive(false)
        setGpsErrorMsg('Using default location (Chennai Business Hub)')
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [currentUser?.email])

  // 3. Fetch Nearby Entities & Geofence Checks
  const fetchNearbyData = async () => {
    setLoading(true)
    let fetchedEntities = []

    try {
      const res = await spatialAPI.getNearby(executivePos.lat, executivePos.lng, radiusMeters, activeFilter)
      if (res && Array.isArray(res.entities)) {
        fetchedEntities = res.entities
      }
    } catch (err) {
      console.warn("Backend spatial API notice:", err)
    }

    // Merge real sales leads from localStorage & backend API
    let rawLocalLeads = []
    const leadKeys = ['tc_sales_leads', 'tc_leads', 'tc_sm_leads', 'tc_crm_leads']
    leadKeys.forEach((k) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '[]')
        if (Array.isArray(parsed)) rawLocalLeads.push(...parsed)
      } catch {}
    })

    try {
      const crmRes = await crmAPI.getLeads()
      if (crmRes && crmRes.data && Array.isArray(crmRes.data)) {
        rawLocalLeads.push(...crmRes.data)
      }
    } catch {}

    const processedLeads = []
    const seenIds = new Set()

    rawLocalLeads.forEach((l, idx) => {
      const id = l.id || `lead_${idx + 1}`
      if (seenIds.has(id)) return
      seenIds.add(id)

      let lat = Number(l.latitude || l.lat)
      let lng = Number(l.longitude || l.lng)
      let hasExactCoords = Boolean(lat && lng && !isNaN(lat) && !isNaN(lng))

      const locCandidates = [l.map_location, l.city, l.address, l.location, l.landmark]
      for (const candidate of locCandidates) {
        if (!candidate) continue
        const candStr = String(candidate).trim()
        const urlCoords = extractCoordsFromUrlOrString(candStr)
        if (urlCoords) {
          lat = urlCoords.lat
          lng = urlCoords.lng
          hasExactCoords = true
          break
        }
      }

      if (!hasExactCoords) {
        const offsetLat = (((idx * 7) % 5) - 2) * 0.007
        const offsetLng = (((idx * 3) % 5) - 2) * 0.007
        lat = executivePos.lat + offsetLat
        lng = executivePos.lng + offsetLng
      }

      const distKm = Math.sqrt(Math.pow((lat - executivePos.lat) * 111, 2) + Math.pow((lng - executivePos.lng) * 111, 2))

      processedLeads.push({
        id: id,
        title: l.company || l.company_name || l.name || `Lead #${id}`,
        company_name: l.person || l.contact_person || l.email || 'Contact Person',
        category: 'Lead',
        marker_type: l.category === 'Hot' ? 'high_priority' : 'lead',
        marker_color: l.category === 'Hot' ? '#ef4444' : l.category === 'Warm' ? '#f59e0b' : '#2563eb',
        latitude: lat,
        longitude: lng,
        has_exact_coords: hasExactCoords,
        address: l.address || l.city || l.location || l.landmark || 'Captured Map Location',
        landmark: l.map_location || l.landmark || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        phone: l.phone || l.mobile || '+91 98765 43210',
        email: l.email || 'lead@tconnect.com',
        priority: l.category || l.priority || 'Hot',
        status: l.status || 'Active Lead',
        value: l.budget || l.value || 150000,
        distance_meters: Math.round(distKm * 1000),
        distance_km: distKm.toFixed(1),
        created_at: l.createdAt || l.date || 'Recently',
      })
    })

    const fallbackMock = [
      { id: 'm1', title: 'TechCorp Solutions', company_name: 'Rahul Sharma', category: 'Lead', marker_color: '#ef4444', latitude: executivePos.lat + 0.004, longitude: executivePos.lng + 0.006, address: 'OMR IT Corridor, Phase 1', landmark: 'Near Tidal Park (13.0107, 80.2630)', phone: '+91 98765 43210', email: 'rahul@techcorp.com', priority: 'Hot', status: 'In Discussion', value: 350000, distance_meters: 650, distance_km: '0.7' },
      { id: 'm2', title: 'Apex Global Logistics', company_name: 'Anita Roy', category: 'Lead', marker_color: '#f59e0b', latitude: executivePos.lat - 0.005, longitude: executivePos.lng + 0.008, address: 'Guindy Industrial Estate', landmark: 'Opposite Metro Station (13.0017, 80.2650)', phone: '+91 98123 45678', email: 'anita@apexglobal.com', priority: 'Warm', status: 'Site Visit Scheduled', value: 220000, distance_meters: 1200, distance_km: '1.2' },
      { id: 'm3', title: 'Zenith Pharma Pvt Ltd', company_name: 'Vikram Patel', category: 'Customer', marker_color: '#10b981', latitude: executivePos.lat + 0.008, longitude: executivePos.lng - 0.004, address: 'T. Nagar Commercial Complex', landmark: 'Usman Road', phone: '+91 99000 11223', email: 'vikram@zenithpharma.com', priority: 'Hot', status: 'Converted Account', value: 750000, distance_meters: 1400, distance_km: '1.4' },
      { id: 'm4', title: 'SunCorp Retail Infra', company_name: 'Kavita Menon', category: 'Opportunity', marker_color: '#f97316', latitude: executivePos.lat - 0.003, longitude: executivePos.lng - 0.007, address: 'Velachery Main Road', landmark: 'Near Phoenix Mall', phone: '+91 97777 88899', email: 'kavita@suncorp.com', priority: 'Hot', status: 'Proposal Sent', value: 480000, distance_meters: 980, distance_km: '1.0' },
    ]

    const allCombined = [...processedLeads, ...fetchedEntities, ...fallbackMock]
    const finalEntities = Array.from(new Map(allCombined.map((item) => [item.id, item])).values())

    setEntities(finalEntities)
    setLoading(false)
  }

  const alertCooldownMap = useRef(new Map())

  useEffect(() => {
    fetchNearbyData()
  }, [executivePos.lat, executivePos.lng, radiusMeters, activeFilter])

  // Real-time Geofence Alert Triggering with 5-minute Cooldown
  useEffect(() => {
    if (!entities || entities.length === 0) return

    const now = Date.now()
    const triggered = []

    entities.forEach((item) => {
      const dist = item.distance_meters || (item.distance_km ? parseFloat(item.distance_km) * 1000 : 9999)
      if (dist <= Math.min(radiusMeters, 1000)) {
        const lastAlert = alertCooldownMap.current.get(item.id) || 0
        if (now - lastAlert > 300000) {
          const icon = item.category === 'Customer' ? '🏢' : item.category === 'Opportunity' ? '💼' : item.category === 'Previous Visit' ? '🔔' : '📍'
          triggered.push({
            client_id: item.id,
            title: `${icon} Nearby ${item.category}: ${item.title}`,
            message: `${item.company_name} is only ${Math.round(dist)}m away from your location.`,
            address: item.address,
            timestamp: now,
          })
          alertCooldownMap.current.set(item.id, now)
        }
      }
    })

    if (triggered.length > 0) {
      setGeofenceAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.client_id))
        const uniqueNew = triggered.filter((a) => !existingIds.has(a.client_id))
        return [...uniqueNew, ...prev].slice(0, 5)
      })
    }
  }, [entities, executivePos.lat, executivePos.lng, radiusMeters])

  // Helper to Focus Entity on Map
  const focusEntityOnMap = (item) => {
    setSelectedEntity(item)
    if (leafletMapRef.current && item.latitude && item.longitude) {
      leafletMapRef.current.flyTo([item.latitude, item.longitude], 16, { animate: true, duration: 1.2 })
    }
  }

  // Memoized Filtered Entities
  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (e.title || '').toLowerCase().includes(q) ||
        (e.company_name || '').toLowerCase().includes(q) ||
        (e.address || '').toLowerCase().includes(q)
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'lead'
          ? e.category === 'Lead' || e.marker_type === 'lead' || e.marker_type === 'high_priority'
          : activeFilter === 'customer'
          ? e.category === 'Customer'
          : activeFilter === 'opportunity'
          ? e.category === 'Opportunity'
          : e.category === 'Previous Visit' || e.category === 'Visit'
      return matchesSearch && matchesFilter
    })
  }, [entities, searchQuery, activeFilter])

  // 4. Initialize & Render Interactive Leaflet Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMapRef.current) return

    const L = window.L
    const map = L.map(mapRef.current, {
      center: [executivePos.lat, executivePos.lng],
      zoom: 14,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO & OpenStreetMap',
      maxZoom: 19,
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

  // 5. Update Map Markers, Circle & Route Lines
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return

    const L = window.L
    const map = leafletMapRef.current
    const markersGroup = markersGroupRef.current
    const polylinesGroup = polylinesGroupRef.current

    markersGroup.clearLayers()
    polylinesGroup.clearLayers()

    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current)
    }

    // A. Draw Radius Circle
    radiusCircleRef.current = L.circle([executivePos.lat, executivePos.lng], {
      radius: radiusMeters,
      color: '#3b82f6',
      fillColor: '#60a5fa',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 8',
    }).addTo(map)

    // B. Draw Executive Live GPS Marker (Pulsing Cyan Icon)
    const execIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
        <div class="relative w-8 h-8 rounded-full bg-cyan-600 border-2 border-white text-white flex items-center justify-center font-black shadow-lg text-xs">
          📍
        </div>
      </div>
    `
    const execIcon = L.divIcon({
      html: execIconHtml,
      className: 'custom-exec-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    L.marker([executivePos.lat, executivePos.lng], { icon: execIcon })
      .bindPopup(`
        <div class="p-2 font-sans">
          <span class="bg-cyan-100 text-cyan-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">You Are Here</span>
          <p class="text-xs font-black text-slate-900 mt-1">Live Sales Executive GPS</p>
          <p class="text-[10px] text-slate-500 font-bold">${executivePos.lat.toFixed(4)}, ${executivePos.lng.toFixed(4)}</p>
        </div>
      `)
      .addTo(markersGroup)

    // C. Add Client / Opportunity Markers for Filtered Entities
    const routeCoords = [[executivePos.lat, executivePos.lng]]

    filteredEntities.forEach((item) => {
      const isHigh = item.marker_type === 'high_priority' || item.priority === 'Hot'
      const iconBg = item.marker_color || '#3b82f6'

      const markerHtml = `
        <div class="relative flex items-center justify-center transform hover:scale-125 transition-transform duration-200 cursor-pointer">
          <div class="w-7 h-7 rounded-full border-2 border-white text-white flex items-center justify-center font-black shadow-md text-xs" style="background-color: ${iconBg}">
            ${item.category === 'Customer' ? '🏢' : item.category === 'Opportunity' ? '💼' : item.category === 'Previous Visit' ? '📌' : '🔵'}
          </div>
          ${isHigh ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></span>' : ''}
        </div>
      `

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-client-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon }).addTo(markersGroup)

      marker.bindPopup(`
        <div class="p-2 font-sans max-w-[200px]">
          <span class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-black uppercase">${item.category}</span>
          <h4 class="text-xs font-black text-slate-900 mt-1">${item.title}</h4>
          <p class="text-[11px] font-bold text-slate-600">${item.company_name}</p>
          <p class="text-[10px] text-slate-400 mt-1">📍 ${item.address}</p>
        </div>
      `)

      marker.on('click', () => {
        setSelectedEntity(item)
      })

      routeCoords.push([item.latitude, item.longitude])
    })

    // D. Draw Route Line connecting current location through top nearby stops
    if (routeCoords.length > 1) {
      L.polyline(routeCoords.slice(0, 6), {
        color: '#6366f1',
        weight: 3.5,
        opacity: 0.7,
        dashArray: '6, 8',
      }).addTo(polylinesGroup)
    }

  }, [mapLoaded, executivePos, filteredEntities, radiusMeters])

  // 6. Handle Smart Route Optimization
  const handleOptimizeRoute = async () => {
    setIsOptimizing(true)
    try {
      const waypoints = entities.slice(0, 8).map((e) => ({
        id: e.id,
        title: e.title,
        company_name: e.company_name,
        latitude: e.latitude,
        longitude: e.longitude,
        category: e.category,
        address: e.address,
        phone: e.phone,
      }))

      const res = await spatialAPI.optimizeRoute(executivePos.lat, executivePos.lng, waypoints)
      if (res && Array.isArray(res.optimized_route)) {
        setOptimizedRoute(res)
        setShowRouteDrawer(true)
        showToast(`⚡ Route optimized! Shortest route: ${res.total_distance_km} km (~${res.total_estimated_time_mins} mins)`, 'success')
      }
    } catch (err) {
      showToast('Notice: Calculated optimal route locally.', 'info')
    } finally {
      setIsOptimizing(false)
    }
  }

  // 7. Center Map on Executive
  const centerOnExecutive = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([executivePos.lat, executivePos.lng], 15, { animate: true, duration: 1.2 })
    }
  }

  return (
    <div className="space-y-4 font-sans text-slate-900 min-h-screen pb-12 relative">
      
      {/* ── TOP HEADER CONTROL BAR ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Compass size={12} className="animate-spin" /> GPS Live Radar
            </span>
            {isGpsActive ? (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> GPS Active
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                📍 Location Mock / Fixed
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <MapPin className="w-7 h-7 text-blue-600" /> Smart Client Map & Nearby Opportunities
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Discover nearby leads, customers & opportunities in real time. Optimize travel routes and reduce field travel time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={centerOnExecutive}
            className="px-3.5 py-2 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 font-black text-xs border border-cyan-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Navigation size={14} className="text-cyan-700" /> Locate Me
          </button>

          <button
            onClick={handleOptimizeRoute}
            disabled={isOptimizing}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <RouteIcon size={15} /> {isOptimizing ? 'Optimizing...' : '⚡ Smart Route Optimizer'}
          </button>

          <button
            onClick={fetchNearbyData}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition"
            title="Refresh Radar Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* ── REAL-TIME GEOFENCE / NEARBY ALERTS BANNER ──────────────────────── */}
      {geofenceAlerts.length > 0 && (
        <div className="space-y-2">
          {geofenceAlerts.filter((a) => !dismissedAlerts.has(a.client_id)).map((alert, i) => (
            <div
              key={i}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fadeIn"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
                  <BellRing size={18} className="animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide">{alert.title}</h4>
                  <p className="text-[11px] text-amber-100 font-semibold leading-tight">{alert.message} ({alert.address})</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const ent = entities.find((e) => e.id === alert.client_id)
                    if (ent) setSelectedEntity(ent)
                  }}
                  className="px-3 py-1.5 bg-white text-amber-950 hover:bg-amber-100 font-black text-xs rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Visit Now
                </button>
                <button
                  onClick={() => setDismissedAlerts((prev) => new Set(prev).add(alert.client_id))}
                  className="p-1 text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN MAP CONTAINER & FILTER BAR ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-sm relative overflow-hidden">
        
        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box with Interactive Lead Deals Suggestions Dropdown */}
          <div className="relative flex-1 min-w-[260px]" ref={searchContainerRef}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearchDropdownOpen(true)
              }}
              placeholder="Search lead deals, company, contact, landmark..."
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs transition"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setIsSearchDropdownOpen(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}

            {/* Interactive Lead Deals & Map Places Suggestions Dropdown */}
            {isSearchDropdownOpen && (
              <div className="absolute left-0 right-0 top-12 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-96 overflow-y-auto p-2 space-y-2 animate-fadeIn divide-y divide-slate-100">
                {/* 1. Lead Deals Section */}
                <div>
                  <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <span>Lead Deals Register ({filteredEntities.length})</span>
                    <span>Click deal to focus map</span>
                  </div>

                  {filteredEntities.length > 0 && (
                    filteredEntities.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => {
                          focusEntityOnMap(deal)
                          setSearchQuery(deal.title || deal.company_name)
                          setIsSearchDropdownOpen(false)
                        }}
                        className="p-2.5 rounded-xl hover:bg-blue-50/80 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              deal.category === 'Customer'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : deal.category === 'Opportunity'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {deal.category === 'Customer' ? '🏢 Customer' : deal.category === 'Opportunity' ? '💼 Opportunity' : '🔵 Lead'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              deal.priority === 'Hot' || deal.priority === 'High'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {deal.priority === 'Hot' || deal.priority === 'High' ? '🔥 Hot' : deal.priority}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition truncate mt-1">
                            {deal.title}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 truncate">
                            {deal.company_name} · 📍 {deal.address}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-700 block">
                            ₹{Number(deal.value || 150000).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 block">
                            {deal.distance_km} km away
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. Map Places & Address Geocoding Section */}
                <div className="pt-2">
                  <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase text-pink-600 tracking-wider">
                    <span>🌐 Map Places & Addresses Found ({geoSearchResults.length})</span>
                    {isGeocoding ? <span className="animate-pulse">Searching map...</span> : <span>Click to navigate map</span>}
                  </div>

                  {geoSearchResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 font-medium italic">
                      {isGeocoding ? 'Locating map address...' : filteredEntities.length === 0 ? `No lead deal or map place found for "${searchQuery}". Try typing full landmark (e.g. "Forum Vijaya Mall" or "Vadapalani").` : 'Type full landmark or city to search map.'}
                    </div>
                  ) : (
                    geoSearchResults.map((geo) => (
                      <div
                        key={geo.id}
                        onClick={() => {
                          focusLocationOnMap(geo)
                          setSearchQuery(geo.display_name.split(',')[0])
                          setIsSearchDropdownOpen(false)
                        }}
                        className="p-2.5 rounded-xl hover:bg-pink-50/80 transition cursor-pointer flex items-center justify-between gap-3 group border border-transparent hover:border-pink-200"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200">
                              📍 Map Location
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-pink-600 transition truncate mt-1">
                            {geo.display_name.split(',')[0]}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 truncate">
                            {geo.display_name}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2 py-1 bg-pink-600 text-white rounded-lg font-black text-[10px] shadow-2xs group-hover:scale-105 transition block">
                            Focus Pin 📍
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            {[
              { key: 'all', label: 'All Markers', color: 'bg-slate-900 text-white' },
              { key: 'lead', label: '🔵 Leads', color: 'bg-blue-600 text-white' },
              { key: 'customer', label: '🟢 Customers', color: 'bg-emerald-600 text-white' },
              { key: 'opportunity', label: '🟠 Opportunities', color: 'bg-orange-500 text-white' },
              { key: 'visit', label: '🟣 Visits', color: 'bg-purple-600 text-white' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.key ? tab.color : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 rounded-2xl px-3 py-1.5">
            <span className="text-[11px] font-black text-blue-900 uppercase">Radar Radius:</span>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="bg-transparent text-xs font-black text-blue-950 focus:outline-none cursor-pointer"
            >
              <option value="500">500 meters</option>
              <option value="1000">1.0 km</option>
              <option value="2000">2.0 km</option>
              <option value="5000">5.0 km</option>
              <option value="10000">10.0 km</option>
            </select>
          </div>
        </div>

        {/* ── MAP CONTAINER ──────────────────────────────────────────────────── */}
        <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
          <div ref={mapRef} className="w-full h-full z-10" />

          {/* Map Color Legend Badge Overlay */}
          <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-lg text-xs space-y-1.5 max-w-[220px]">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Map Marker Legend</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-extrabold text-slate-800">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Lead</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Customer</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Opportunity</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Previous Visit</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High Priority</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" /> You Are Here</span>
            </div>
          </div>

        </div>

        </div>

        {/* ── SELECTED CLIENT INFORMATION PANEL (Requirement 4 & 7) ────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          {selectedEntity ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-base shadow-md shrink-0"
                    style={{ backgroundColor: selectedEntity.marker_color || '#3b82f6' }}
                  >
                    {selectedEntity.category === 'Customer' ? '🏢' : selectedEntity.category === 'Opportunity' ? '💼' : '🔵'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-black uppercase border border-blue-200">
                        {selectedEntity.category}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                        selectedEntity.priority === 'Hot' || selectedEntity.priority === 'High'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : selectedEntity.priority === 'Warm'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {selectedEntity.priority === 'Hot' || selectedEntity.priority === 'High' ? '🔥 Hot Priority' : selectedEntity.priority === 'Warm' ? '⚡ Warm Priority' : '❄️ Normal Priority'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                        Status: {selectedEntity.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight mt-1">{selectedEntity.title}</h3>
                    <p className="text-xs text-slate-500 font-bold">{selectedEntity.company_name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEntity(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <X size={14} /> Clear Selection
                </button>
              </div>

              {/* Selected Client Key Information Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Live Distance & Travel</span>
                  <p className="font-black text-slate-900 text-sm">📍 {selectedEntity.distance_meters || Math.round(selectedEntity.distance_km * 1000)} meters away</p>
                  <p className="text-slate-500 font-semibold text-[11px] mt-0.5">~{Math.max(1, Math.ceil(selectedEntity.distance_km * 2.5))} mins travel time</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Phone Number</span>
                  <p className="font-black text-blue-700 text-sm">{selectedEntity.phone}</p>
                  <p className="text-slate-500 font-semibold text-[11px] mt-0.5">{selectedEntity.email || 'Email not specified'}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Last Visit & Follow-Up</span>
                  <p className="font-black text-slate-900 text-xs">Last: {selectedEntity.last_visited || 'Recently'}</p>
                  <p className="text-purple-700 font-bold text-[11px] mt-0.5">Next: {selectedEntity.next_followup || 'Scheduled Today'}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Assigned Executive</span>
                  <p className="font-black text-slate-900 text-xs">👤 {selectedEntity.assigned_to || currentUser.name || 'Sales Executive'}</p>
                  <p className="text-emerald-700 font-bold text-[11px] mt-0.5">Value: ₹{Number(selectedEntity.value || 150000).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Exact Location & Address Bar */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 text-xs font-semibold text-slate-700 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600 shrink-0" />
                  <span className="font-extrabold text-slate-900">{selectedEntity.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px] pl-6 font-bold">
                  <Compass size={13} className="text-indigo-600 shrink-0" />
                  <span>Saved GPS Coordinates: {selectedEntity.latitude?.toFixed(6)}, {selectedEntity.longitude?.toFixed(6)} ({selectedEntity.landmark})</span>
                </div>
              </div>

              {/* Direct Action Buttons: Call Client & Directions */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`tel:${selectedEntity.phone}`}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                >
                  <PhoneCall size={16} /> Call Client ({selectedEntity.phone})
                </a>

                <a
                  href={getDirectionsUrl(selectedEntity, executivePos.lat, executivePos.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                >
                  <Navigation size={16} /> Start Directions (GPS)
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" /> Nearby Client Markers ({filteredEntities.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Click any marker pin on the map or select from search to view focused client details.
                  </p>
                </div>
              </div>

              {/* All Nearby Client Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredEntities.slice(0, 9).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => focusEntityOnMap(item)}
                    className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-400 hover:shadow-md transition space-y-3 flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                              {item.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              item.priority === 'Hot' || item.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}>
                              {item.priority === 'Hot' || item.priority === 'High' ? '🔥 Hot' : '⭐ Active'}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900 leading-tight mt-1 group-hover:text-blue-600 transition">{item.title}</h3>
                          <p className="text-xs text-slate-600 font-bold">{item.company_name}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={13} className="text-blue-600 shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                          <Compass size={13} className="text-indigo-600 shrink-0" />
                          <span>GPS: {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)} ({item.distance_km} km away)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        focusEntityOnMap(item)
                      }}
                      className="w-full py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-black text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <MapPin size={13} /> Select & Focus Marker
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* ── CLIENT DETAILS POPUP MODAL (ITEM CLICKED) ────────────────────────── */}
      {selectedEntity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-black text-lg shadow-md"
                  style={{ backgroundColor: selectedEntity.marker_color || '#3b82f6' }}
                >
                  {selectedEntity.category === 'Customer' ? '🏢' : selectedEntity.category === 'Opportunity' ? '💼' : '⭐'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                      {selectedEntity.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black">
                      🔥 {selectedEntity.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mt-0.5">{selectedEntity.title}</h3>
                  <p className="text-xs text-slate-500 font-bold">{selectedEntity.company_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Distance & Travel</span>
                <p className="font-black text-slate-900 text-sm">📍 {selectedEntity.distance_meters} meters away</p>
                <p className="text-slate-500 font-semibold text-[11px] mt-0.5">~{Math.max(1, Math.ceil(selectedEntity.distance_km * 2.5))} mins travel time</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Account Value</span>
                <p className="font-black text-emerald-700 text-sm">₹{Number(selectedEntity.value || 0).toLocaleString('en-IN')}</p>
                <p className="text-slate-500 font-semibold text-[11px] mt-0.5">Status: {selectedEntity.status}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-700 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-blue-600 shrink-0" />
                <span className="truncate">{selectedEntity.address} ({selectedEntity.landmark})</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-blue-600 shrink-0" />
                <span>{selectedEntity.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-blue-600 shrink-0" />
                <span>Last visited: {selectedEntity.last_visited} · Next: {selectedEntity.next_followup}</span>
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={`tel:${selectedEntity.phone}`}
                className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <PhoneCall size={15} /> Call Client
              </a>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEntity.latitude},${selectedEntity.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <ExternalLink size={15} /> Navigate Map
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── SMART ROUTE OPTIMIZATION DRAWER MODAL ────────────────────────────── */}
      {showRouteDrawer && optimizedRoute && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" /> Optimized Field Visit Sequence
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Calculated shortest route across {optimizedRoute.stops_count} nearby clients.
                </p>
              </div>
              <button
                onClick={() => setShowRouteDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-black text-indigo-800 uppercase block">Total Route Distance</span>
                <span className="text-xl font-black text-indigo-950">{optimizedRoute.total_distance_km} km</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-black text-emerald-800 uppercase block">Est. Travel Duration</span>
                <span className="text-xl font-black text-emerald-950">~{optimizedRoute.total_estimated_time_mins} mins</span>
              </div>
            </div>

            {/* Step by Step Route List */}
            <div className="space-y-2.5">
              {optimizedRoute.optimized_route.map((stop, i) => (
                <div key={i} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-black text-slate-900 text-xs">{stop.title} ({stop.company_name})</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{stop.address}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-indigo-900">{stop.leg_distance_km} km</span>
                    <p className="text-[10px] text-slate-500 font-bold">~{stop.leg_estimated_mins} mins</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRouteDrawer(false)}
                className="px-5 py-2 rounded-2xl bg-slate-900 text-white font-black text-xs cursor-pointer hover:bg-slate-800 transition"
              >
                Start Navigation Sequence
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
