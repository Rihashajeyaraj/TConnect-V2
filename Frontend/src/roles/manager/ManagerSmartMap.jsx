import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin, Radio, Users, Activity, Clock, RefreshCw,
  Search, Shield, Map, Eye, Compass, Navigation,
  AlertCircle, ChevronRight, Phone, Mail, Award, CheckCircle2, X
} from 'lucide-react'
import { spatialAPI, authAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { formatDate } from '../../utils/dateUtils.js'

const DEFAULT_CENTER = { lat: 13.0067, lng: 80.2570 } // Adyar, Chennai

export default function ManagerSmartMap() {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // Map & Leaflet Refs
  const mapContainerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const teamGroupRef = useRef(null)
  const clientGroupRef = useRef(null)

  // State Variables
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(window.innerWidth >= 1024)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Scoping & Mode States
  const [viewMode, setViewMode] = useState('both') // 'team' | 'clients' | 'both'
  const [searchQuery, setSearchQuery] = useState('')

  // Team Data
  const [executives, setExecutives] = useState([])
  const [selectedExecutive, setSelectedExecutive] = useState(null)
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 })

  // Client Data (Leads, Customers, Visits)
  const [clients, setClients] = useState([])

  // ─── 1. Load Leaflet CDN ────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
      return
    }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const js = document.createElement('script')
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    js.onload = () => setMapLoaded(true)
    document.body.appendChild(js)
  }, [])

  // ─── 2. Fetch Locations API ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch live team locations from FastAPI
      const res = await spatialAPI.getTeamLocations()
      const payload = res?.data || res
      if (payload && payload.executives) {
        setExecutives(payload.executives)
        setStats({
          total: payload.team_count || 0,
          online: payload.online_count || 0,
          offline: payload.offline_count || 0
        })
      }
      setLastUpdated(new Date().toLocaleTimeString())

      // 2. Fetch nearby client locations
      // Center client query on first active/online executive or DEFAULT_CENTER
      const firstActive = payload?.executives?.find(ex => ex.latitude && ex.is_online)
      const queryLat = firstActive ? firstActive.latitude : DEFAULT_CENTER.lat
      const queryLng = firstActive ? firstActive.longitude : DEFAULT_CENTER.lng

      const clientRes = await spatialAPI.getNearby(queryLat, queryLng, 5000, 'all')
      const clientPayload = clientRes?.data || clientRes
      if (clientPayload && clientPayload.entities) {
        setClients(clientPayload.entities)
      }
    } catch (err) {
      console.error("Error fetching manager Smart Map data:", err)
      showToast("Could not retrieve team live locations", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // ─── 3. Mount and Auto-Refresh ──────────────────────────────────────────
  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchData()
    }, 10000) // sensibe 10s throttling
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  // ─── 4. Leaflet Map Initialization ─────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || leafletMapRef.current) return

    // Initialize Leaflet map
    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13)

    // Standard high-quality light/white map tiles
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map)

    window.L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Group Layers
    teamGroupRef.current = window.L.featureGroup().addTo(map)
    clientGroupRef.current = window.L.featureGroup().addTo(map)
    leafletMapRef.current = map

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [mapLoaded])

  // Helper to format last seen date
  const formatLastSeen = (isoStr) => {
    if (!isoStr) return 'Never seen'
    try {
      const diffMs = new Date() - new Date(isoStr)
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return formatDate(isoStr)
    } catch {
      return 'Unknown'
    }
  }

  // ─── 5. Update Map Markers (Toggles Team, Clients, Both) ────────────────
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return

    // Clear previous markers
    if (teamGroupRef.current) teamGroupRef.current.clearLayers()
    if (clientGroupRef.current) clientGroupRef.current.clearLayers()

    const bounds = []

    // ── Team Mode ──────────────────────────────────────────────────────────
    if (viewMode === 'team' || viewMode === 'both') {
      executives.forEach(ex => {
        if (!ex.latitude || !ex.longitude) return

        const isClientVisit = ex.check_in_mode === "Client Visit"
        const initials = ex.employee_name
          .split(' ')
          .map(n => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()

        const statusColor = isClientVisit ? '#8b5cf6' : (ex.is_online ? '#10b981' : '#64748b')
        const borderGlow = isClientVisit ? 'rgba(139, 92, 246, 0.5)' : (ex.is_online ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.2)')

        // Custom DivIcon for premium styling
        const icon = window.L.divIcon({
          className: 'custom-div-icon',
          html: isClientVisit 
            ? `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: #0f172a;
                border: 3px solid #8b5cf6;
                box-shadow: 0 0 14px ${borderGlow};
                color: #f8fafc;
                position: relative;
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span style="
                  position: absolute;
                  bottom: -2px;
                  right: -2px;
                  width: 12px;
                  height: 12px;
                  background: #8b5cf6;
                  border: 2px solid #0f172a;
                  border-radius: 50%;
                "></span>
              </div>
            `
            : `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: #0f172a;
                border: 3px solid ${statusColor};
                box-shadow: 0 0 12px ${borderGlow};
                color: #f8fafc;
                font-family: ui-sans-serif, system-ui;
                font-weight: 800;
                font-size: 13px;
                position: relative;
              ">
                ${initials}
                <span style="
                  position: absolute;
                  bottom: -2px;
                  right: -2px;
                  width: 12px;
                  height: 12px;
                  background: ${statusColor};
                  border: 2px solid #0f172a;
                  border-radius: 50%;
                "></span>
              </div>
            `,
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        })

        const marker = window.L.marker([ex.latitude, ex.longitude], { icon })
          .bindPopup(`
            <div class="p-2" style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
              <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">${ex.employee_name}</div>
              <div style="font-weight: bold; color: ${isClientVisit ? '#8b5cf6' : (ex.is_online ? '#10b981' : '#64748b')}; margin-bottom: 6px;">
                ${isClientVisit ? '💼 Client Visit Mode' : (ex.is_online ? '● Online' : '○ Offline')}
              </div>
              <div style="margin-bottom: 2px; color: #64748b;"><strong>Role:</strong> ${ex.role}</div>
              <div style="margin-bottom: 2px; color: #64748b;"><strong>Last Seen:</strong> ${formatLastSeen(ex.last_seen_at)}</div>
              ${ex.check_in_address ? `<div style="margin-bottom: 2px; color: #64748b; font-size: 11px;"><strong>Check-in Location:</strong> ${ex.check_in_address}</div>` : ''}
              <div style="color: #64748b;"><strong>GPS Accuracy:</strong> ${ex.accuracy ? `${ex.accuracy.toFixed(1)}m` : 'N/A'}</div>
            </div>
          `)
          .addTo(teamGroupRef.current)

        if (isClientVisit) {
          marker.bindTooltip(`
            <div style="padding: 5px 9px; font-family: sans-serif; font-weight: bold; font-size: 11px; border-radius: 8px; box-shadow: 0 3px 8px rgba(0,0,0,0.18); background: #ffffff; border: 1px solid #e2e8f0; text-align: left;">
              <span style="color: #8b5cf6; display: block; font-size: 12px;">💼 ${ex.employee_name}</span>
              <span style="color: #475569; font-weight: normal; font-size: 9px; display: block; margin-top: 3px; max-w: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                📍 ${ex.check_in_address || 'Site Visit'}
              </span>
            </div>
          `, {
            permanent: true,
            direction: 'top',
            offset: [0, -18],
            className: 'client-visit-tooltip'
          })
        }

        bounds.push([ex.latitude, ex.longitude])
      })
    }

    // ── Client Mode ────────────────────────────────────────────────────────
    if (viewMode === 'clients' || viewMode === 'both') {
      clients.forEach(client => {
        if (!client.latitude || !client.longitude) return

        const category = client.category || 'Client'
        let color = '#3b82f6' // default Blue
        if (category === 'Lead') color = '#ef4444' // Red
        if (category === 'Customer') color = '#10b981' // Green
        if (category === 'Previous Visit') color = '#8b5cf6' // Purple

        const icon = window.L.divIcon({
          className: 'client-div-icon',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: ${color};
              border: 2px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              color: #ffffff;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })

        const marker = window.L.marker([client.latitude, client.longitude], { icon })
          .bindPopup(`
            <div class="p-2" style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
              <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px;">${client.title}</div>
              <div style="font-weight: bold; color: ${color}; margin-bottom: 6px;">${category}</div>
              <div style="margin-bottom: 2px; color: #64748b;"><strong>Company:</strong> ${client.company_name}</div>
              <div style="margin-bottom: 2px; color: #64748b;"><strong>Address:</strong> ${client.address}</div>
              <div style="color: #64748b;"><strong>Phone:</strong> ${client.phone}</div>
            </div>
          `)
          .addTo(clientGroupRef.current)

        bounds.push([client.latitude, client.longitude])
      })
    }

    // Zoom fit to bounds on load or reload
    if (bounds.length > 0) {
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [viewMode, executives, clients])

  // Center Map on Selected Executive
  const handleSelectExecutive = (ex) => {
    setSelectedExecutive(ex)
    if (ex.latitude && ex.longitude && leafletMapRef.current) {
      leafletMapRef.current.flyTo([ex.latitude, ex.longitude], 16)
    } else {
      showToast(`${ex.employee_name} has no available location logs yet.`, 'warning')
    }
  }

  // Filter executives by search query
  const filteredExecutives = executives.filter(ex =>
    ex.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-950 text-white font-sans">
      {panelOpen && (
        <div onClick={() => setPanelOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-20 lg:hidden transition-opacity" />
      )}
      {/* ─── Sidebar Panel ────────────────────────────────────────────────── */}
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
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 active:scale-95 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search executive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-xs font-bold text-slate-100 bg-slate-950/70 border border-white/10 rounded-xl outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Dynamic Executive List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">Team List</h2>
          {filteredExecutives.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-500">
              No Sales Executives found.
            </div>
          ) : (
            filteredExecutives.map(ex => {
              const hasLoc = ex.latitude != null
              const isSelected = selectedExecutive?.employee_id === ex.employee_id
              return (
                <div
                  key={ex.employee_id}
                  onClick={() => handleSelectExecutive(ex)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition active:scale-[0.99] flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-violet-600/15 border-violet-500/40'
                      : 'bg-slate-950/45 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 font-extrabold text-[11px] text-slate-300 flex items-center justify-center">
                        {ex.employee_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-200">{ex.employee_name}</div>
                        <div className="text-[10px] font-bold text-slate-500">{ex.role}</div>
                      </div>
                    </div>

                    {/* Online / Offline dynamic dot */}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${ex.is_online ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                      <span className="text-[10px] font-black text-slate-400">
                        {ex.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 border-t border-white/5 pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatLastSeen(ex.last_seen_at)}</span>
                    </div>
                    {hasLoc ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Compass className="w-3 h-3" />
                        <span>{ex.accuracy ? `${ex.accuracy.toFixed(0)}m accuracy` : 'GPS Connected'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>No GPS Log</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Auto Refresh Toggle footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/20 text-[11px] font-bold text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20 bg-slate-900 text-violet-600 focus:ring-0 w-3.5 h-3.5"
            />
            <label htmlFor="auto-refresh" className="cursor-pointer select-none">Auto Update (10s)</label>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Last sync:</span>
            <span className="font-mono text-slate-300">{lastUpdated || 'Never'}</span>
          </div>
        </div>
      </div>

      {/* ─── Main Map Area ────────────────────────────────────────────────── */}
      <div className="flex-1 h-full relative">
        
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top Floating Controls */}
        <div className="absolute top-5 left-5 right-5 flex flex-wrap gap-4 items-center justify-between z-10 pointer-events-none">
          
          {/* Mode Switch Widget */}
          <div className="flex bg-slate-900/90 border border-white/10 p-1 rounded-xl shadow-xl backdrop-blur-md pointer-events-auto">
            {[
              { id: 'team', label: 'Team', icon: Users },
              { id: 'clients', label: 'Clients', icon: MapPin },
              { id: 'both', label: 'Both', icon: Eye }
            ].map(mode => {
              const IconComponent = mode.icon
              const isActive = viewMode === mode.id
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`h-9 px-4 rounded-lg flex items-center gap-2 text-xs font-black transition active:scale-95 ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                </button>
              )
            })}
          </div>

          {/* Dynamic Counters Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-xl shadow-xl backdrop-blur-md p-2 px-4 flex items-center gap-5 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500">Total Team</span>
              <span className="text-sm font-black text-slate-100">{stats.total}</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-black uppercase text-slate-500">Online</span>
              <span className="text-sm font-black text-emerald-400">{stats.online}</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="text-[10px] font-black uppercase text-slate-500">Offline</span>
              <span className="text-sm font-black text-slate-400">{stats.offline}</span>
            </div>
          </div>
        </div>

        {/* Stale location warning overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
              <span className="text-xs font-black text-slate-200">Updating live locations...</span>
            </div>
          </div>
        )}
        {/* Toggle Panel Button for mobile */}
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute bottom-5 left-5 z-20 h-10 px-4 rounded-xl bg-slate-900/95 border border-white/15 text-slate-200 hover:text-white flex items-center gap-2 pointer-events-auto backdrop-blur-md shadow-xl transition active:scale-95 lg:hidden animate-in fade-in duration-200"
          >
            <Users size={16} className="text-violet-400" />
            <span className="text-xs font-black">Show Team</span>
          </button>
        )}
      </div>
    </div>
  )
}
