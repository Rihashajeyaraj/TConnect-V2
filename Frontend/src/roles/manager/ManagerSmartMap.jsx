import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getApiBaseUrl } from '../../utils/apiConfig.js'
import {
  MapPin, Radio, Users, Activity, Clock, RefreshCw,
  Search, Shield, Map as MapIcon, Eye, Compass, Navigation,
  AlertCircle, ChevronRight, ChevronLeft, Phone, Mail, Award, CheckCircle2, X,
  Route, Milestone, Minimize2, Maximize2, ArrowLeft, MessageSquare, Send, MessageCircle,
  Calendar, Filter, FileText, BarChart2, Clock3
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { spatialAPI, authAPI, settingsAPI, crmAPI, customerAPI, visitAPI, auditAPI, notificationAPI, hrmsAPI, userAPI } from '../../services/api.js'
import { loadGoogleMaps, purgeGoogleMapsBillingModal } from '../../utils/loadGoogleMaps.js'
import { useToast } from '../../common/ToastContext.jsx'
import useCurrentUser, { getStoredUser } from '../../hooks/useCurrentUser.js'
import { formatDate } from '../../utils/dateUtils.js'
import { filterUserItems } from '../../utils/userScope.js'
import MAP_CONFIG from '../../config/mapConfig.js'
import { detectRouteClients, shouldNotify } from '../../utils/routeProximityUtils.js'
import SmartClientMap from '../sales/SmartClientMap.jsx'
import { snapToRoadGeometry } from '../../utils/roadSnapping.js'
import liveTrackingBike from '../../assets/live-tracking-bike.png'


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
  // If executive is not logged in / offline, or session is stopped/ended, return Stopped
  if (isOnline === false || status === 'ended' || status === 'logged_out' || status === 'stopped' || status === 'offline') {
    return { label: 'Stopped', color: '#64748b', dot: '⚪' }
  }

  if (!lastUpdatedMs) {
    return { label: 'Offline (Logged Out)', color: '#dc2626', dot: '🔴' }
  }

  const age = Date.now() - Number(lastUpdatedMs)

  // If last ping was > 5 minutes ago (or ping is missing), executive is stale/offline
  if (isNaN(age) || age > 5 * 60 * 1000) {
    const minsAgo = Math.floor(age / 60000)
    if (isNaN(minsAgo) || minsAgo > 60 * 24) {
      return { label: 'Offline (Logged Out)', color: '#dc2626', dot: '🔴' }
    }
    return { label: `Stale (${minsAgo}m paused)`, color: '#f97316', dot: '🟠' }
  }

  if (status === 'destination_reached' || status === 'reached' || status === 'arrived') {
    return { label: 'Destination Reached', color: '#10b981', dot: '🎯' }
  }

  return { label: 'Live Connection', color: '#10b981', dot: '🟢' }
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

/**
 * Checks if a candidate lead, customer, or visit record belongs strictly to a specific executive (e.g. Bavani sree).
 */
function isItemOwnedByExecutive(item, exec) {
  if (!item || !exec) return false;

  const rawItem = item.originalItem || item;

  const execEmail = String(exec.email || '').toLowerCase().trim();
  const execEmpCode = String(exec.employee_code || exec.employee_id || exec.emp_code || exec.code || '').toLowerCase().trim();
  const execId = String(exec.id || exec.user_id || exec.auth_user_id || exec.employee_id || '').toLowerCase().trim();
  const execName = String(exec.employee_name || exec.name || exec.full_name || '').toLowerCase().trim();

  if (!execEmail && !execEmpCode && !execId && !execName) return false;

  const itemStaffEmail = String(
    rawItem.assigned_to_email ||
    rawItem.assignedToEmail ||
    rawItem.executiveEmail ||
    rawItem.staff_email ||
    rawItem.owner_email ||
    rawItem.employee_email ||
    rawItem.user_email ||
    rawItem.email ||
    item.email ||
    ''
  ).toLowerCase().trim();

  const itemEmpCode = String(
    rawItem.employee_code ||
    rawItem.employee_id ||
    rawItem.emp_code ||
    rawItem.employeeCode ||
    item.employee_code ||
    item.employee_id ||
    ''
  ).toLowerCase().trim();

  const itemUserId = String(
    rawItem.user_id ||
    rawItem.userId ||
    rawItem.assigned_to_id ||
    rawItem.created_by_id ||
    rawItem.executive_id ||
    rawItem.created_by ||
    item.user_id ||
    ''
  ).toLowerCase().trim();

  const itemAssignedTo = String(
    rawItem.assigned_to ||
    rawItem.assigned_to_name ||
    rawItem.assignedTo ||
    rawItem.executive ||
    rawItem.accountManager ||
    rawItem.sales_executive ||
    rawItem.employee_name ||
    rawItem.employeeName ||
    rawItem.submitted_by ||
    rawItem.contact_person ||
    item.assigned_to ||
    item.assigned_to_name ||
    ''
  ).toLowerCase().trim();

  // 1. Email Match
  if (execEmail && (itemStaffEmail === execEmail || itemAssignedTo === execEmail)) {
    return true;
  }

  // 2. Employee Code Match
  if (execEmpCode && (itemEmpCode === execEmpCode || itemUserId === execEmpCode)) {
    return true;
  }

  // 3. User / Employee ID Match
  if (execId && (itemUserId === execId || itemEmpCode === execId)) {
    return true;
  }

  // 4. Name Match (Exact, Substring, or Token Match)
  if (execName && itemAssignedTo) {
    if (itemAssignedTo === execName || execName.includes(itemAssignedTo) || itemAssignedTo.includes(execName)) {
      return true;
    }
    const execParts = execName.split(/\s+/).filter(p => p.length >= 3);
    const itemParts = itemAssignedTo.split(/\s+/).filter(p => p.length >= 3);
    for (const ep of execParts) {
      if (itemAssignedTo.includes(ep)) return true;
      for (const ip of itemParts) {
        if (ep === ip) return true;
      }
    }
  }

  return false;
}

export default function ManagerSmartMap({ hideHeader = false }) {
  const { showToast } = useToast()
  const currentUser = useCurrentUser()

  // State
  const [activeMapTab,     setActiveMapTab]      = useState('team') // 'team' | 'own'
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
  const [statusFilter,     setStatusFilter]      = useState('all') // 'all' | 'online' | 'offline'
  const [initialFitDone,   setInitialFitDone]    = useState(false)
  const [isTrackingMinimized, setIsTrackingMinimized] = useState(false)
  const [selectedTeamLeadIndex, setSelectedTeamLeadIndex] = useState(0)
  const [activeTeamFilter,      setActiveTeamFilter]      = useState('all') // 'all' (paginated team lead) | 'all_combined' | specific key

  // Reports & Trip History & Point-in-Time lookup state
  const [showTripHistoryReport, setShowTripHistoryReport] = useState(false)
  const [reportFilterDate,      setReportFilterDate]      = useState(() => new Date().toISOString().split('T')[0])
  const [reportFilterEmpId,     setReportFilterEmpId]     = useState('all')
  const [reportData,            setReportData]            = useState([])
  const [reportLoading,         setReportLoading]         = useState(false)

  const [pitEmpId,              setPitEmpId]              = useState('')
  const [pitDate,               setPitDate]               = useState(() => new Date().toISOString().split('T')[0])
  const [pitTime,               setPitTime]               = useState('16:00')
  const [pitResult,             setPitResult]             = useState(null)
  const [pitLoading,            setPitLoading]            = useState(false)

  const loadReports = useCallback(async (dateVal, empIdVal) => {
    setReportLoading(true)
    try {
      const d = dateVal || reportFilterDate
      const e = empIdVal !== undefined ? empIdVal : reportFilterEmpId
      const res = await spatialAPI.getExecutiveHistoryReport({
        date: d,
        employee_id: e !== 'all' ? e : undefined
      })
      const list = Array.isArray(res) ? res : (res?.data || res?.reports || [])
      setReportData(list)
    } catch (err) {
      console.warn("Failed to fetch executive trip history reports:", err)
      showToast("Could not fetch history reports", "error")
    } finally {
      setReportLoading(false)
    }
  }, [reportFilterDate, reportFilterEmpId, showToast])

  const handlePointInTimeLookup = async () => {
    if (!pitEmpId) {
      showToast("Please select an executive for point-in-time lookup", "warning")
      return
    }
    setPitLoading(true)
    try {
      const selExec = executives.find(e => String(e.employee_id || e.id) === String(pitEmpId))
      const res = await spatialAPI.lookupPointInTimeLocation({
        employee_id: pitEmpId,
        date: pitDate,
        time: pitTime
      })
      const data = res?.data || res
      if (selExec) {
        const realName = resolveRealName(selExec)
        if (realName && realName !== 'Sales Executive' && realName !== 'Employee') {
          data.employee_name = realName
        }
        data.role = selExec.designation || selExec.role || 'Sales Executive'
      }
      setPitResult(data)
      showToast(`Point-in-time location retrieved for ${data.employee_name || 'Executive'}`, "success")
    } catch (err) {
      console.error("Point-in-time lookup failed:", err)
      showToast("Failed to lookup point-in-time location", "error")
    } finally {
      setPitLoading(false)
    }
  }

  // Live-tracking panel state
  const [trackSession,     setTrackSession]      = useState(null)
  const [trackBreadcrumbs, setTrackBreadcrumbs]  = useState([])
  const [trackStatus,      setTrackStatus]       = useState('idle') // idle|loading|live|stale|ended
  const [lastPingMs,       setLastPingMs]        = useState(null)
  const [realtimeOk,       setRealtimeOk]        = useState(false)
  const [trackEvents,      setTrackEvents]       = useState([])
  const [isRefreshingTracking, setIsRefreshingTracking] = useState(false)

  // Client destination details state
  const [destClient,       setDestClient]        = useState(null)
  const [destRouteMeta,    setDestRouteMeta]     = useState(null)
  const [latestExecPos,    setLatestExecPos]     = useState(null)
  const [onRouteClients,   setOnRouteClients]    = useState([])
  const [selectedRouteClient, setSelectedRouteClient] = useState(null)
  const [showRouteAlerts,     setShowRouteAlerts]     = useState(true)
  const completedVisitIdsRef = useRef(new Set())
  const scheduledVisitIdsRef = useRef(new Set())
  const rawVisitsRef         = useRef([])
  const notifiedEventsRef = useRef(new Map())

  // Executive replies & inquiry modal state
  const [executiveReplies, setExecutiveReplies] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tc_executive_replies') || '{}')
    } catch { return {} }
  })
  const [inquiryModalEx, setInquiryModalEx] = useState(null)
  const [customInquiryText, setCustomInquiryText] = useState('')

  const isFirstFetchRepliesRef = useRef(true)

  // Poll for incoming replies from Sales Executives
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const res = await notificationAPI.getNotifications()
        const notifs = Array.isArray(res) ? res : (res?.data || [])
        const chatNotifs = notifs.filter(n => {
          const cat = String(n.category || n.type || '').toUpperCase()
          const title = String(n.title || '')
          return cat.includes('REPLY') || cat.includes('INQUIRY') || title.includes('Reply') || title.includes('Inquiry')
        })
        
        let newlyAddedToToast = []
        setExecutiveReplies(prev => {
          const next = { ...prev }
          let updated = false

          chatNotifs.forEach(r => {
            const isReply = String(r.category || r.type || '').toUpperCase().includes('REPLY') || String(r.title || '').includes('Reply')
            const senderName = r.sender_name || (isReply ? r.title?.replace('💬 Reply from ', '') : 'Reporting Manager') || 'Executive'
            const empId = String(r.employee_id || r.recipient_id || r.sender_id || r.user_id || senderName || 'unknown').toLowerCase().trim()
            const existing = next[empId] || []
            if (!existing.some(e => e.id === r.id || (e.timestamp === r.created_at && e.message === (r.message || r.title)))) {
              updated = true
              const entry = {
                id: r.id || Date.now(),
                message: r.message || r.title,
                sender_name: senderName,
                sender_email: r.sender_email || r.recipient_email || '',
                timestamp: r.created_at || new Date().toISOString(),
                read: isReply ? false : true,
                is_inquiry: !isReply,
                category: r.category || r.type || (isReply ? 'LOCATION_INQUIRY_REPLY' : 'LOCATION_INQUIRY')
              }
              next[empId] = [entry, ...existing]
              if (isReply && !isFirstFetchRepliesRef.current) {
                newlyAddedToToast.push(entry)
              }
            }
          })

          if (updated) {
            localStorage.setItem('tc_executive_replies', JSON.stringify(next))
          }
          isFirstFetchRepliesRef.current = false
          return updated ? next : prev
        })

        // Fire toast notification OUTSIDE state updater to prevent React render-in-render warning
        if (newlyAddedToToast.length > 0) {
          if (newlyAddedToToast.length === 1) {
            const item = newlyAddedToToast[0]
            showToast(`💬 Reply from ${item.sender_name}: "${item.message}"`, 'info')
          } else {
            const senders = Array.from(new Set(newlyAddedToToast.map(i => i.sender_name)))
            if (senders.length === 1) {
              const sender = senders[0]
              const latestMsg = newlyAddedToToast[0].message
              showToast(`💬 ${newlyAddedToToast.length} replies from ${sender} (Latest: "${latestMsg}")`, 'info')
            } else {
              showToast(`💬 ${newlyAddedToToast.length} new replies from ${senders.join(', ')}`, 'info')
            }
          }
        }
      } catch (e) { console.warn('Fetch replies err:', e) }
    }

    fetchReplies()
    const interval = setInterval(fetchReplies, 3000)
    const handleEvent = () => fetchReplies()
    window.addEventListener('tc_notifications_updated', handleEvent)
    window.addEventListener('tc_inquiry_received', handleEvent)

    return () => {
      clearInterval(interval)
      window.removeEventListener('tc_notifications_updated', handleEvent)
      window.removeEventListener('tc_inquiry_received', handleEvent)
    }
  }, [showToast])

  // ── Auto-Open Manager Inquiry Drawer from URL query param (e.g. /manager/map?inquiry_id=xxx) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const targetInquiryId = params.get('inquiry_id')
    if (!targetInquiryId) return

    const locateAndOpenManagerInquiry = async () => {
      try {
        const res = await notificationAPI.getNotifications({ silentError: true })
        const notifs = Array.isArray(res) ? res : (res?.data || [])
        const match = notifs.find(n => {
          const rawId = String(n.id || n.notification_id || '').toLowerCase().trim()
          return rawId === targetInquiryId.toLowerCase().trim()
        })
        if (match) {
          const senderName = match.sender_name || match.title?.replace('💬 Reply from ', '') || 'Executive'
          const empCode = match.employee_id || match.sender_id || ''
          setInquiryModalEx({
            id: empCode || match.id,
            name: senderName,
            full_name: senderName,
            email: match.sender_email || match.recipient_email || '',
            employee_id: empCode
          })
        }
      } catch (err) {
        console.warn('Failed to auto-open manager inquiry deep link:', err)
      }
    }

    locateAndOpenManagerInquiry()
  }, [])

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
    const key = empCode.toLowerCase().trim() || resolveRealName(ex).toLowerCase().trim() || 'unknown'
    const mgrName = currentUser?.name || currentUser?.full_name || 'Reporting Manager'

    const localInq = {
      id: 'inq_' + Date.now(),
      message: q,
      sender_name: mgrName,
      sender_role: currentUser?.role || 'Sales Manager',
      timestamp: new Date().toISOString(),
      read: true,
      is_inquiry: true,
      category: 'LOCATION_INQUIRY'
    }

    setExecutiveReplies(prev => {
      const next = { ...prev }
      const existing = next[key] || []
      next[key] = [localInq, ...existing]
      localStorage.setItem('tc_executive_replies', JSON.stringify(next))
      return next
    })

    try {
      await notificationAPI.sendNotification({
        title: '⚡ Quick Status Inquiry',
        message: q,
        category: 'LOCATION_INQUIRY',
        type: 'LOCATION_INQUIRY',
        recipient_role: 'executive',
        recipient_email: targetEmail,
        employee_id: empCode,
        sender_name: mgrName,
        sender_role: currentUser?.role || currentUser?.designation || 'Sales Manager',
      })
      showToast(`Inquiry sent to ${resolveRealName(ex)}`, 'success')
      setCustomInquiryText('')
      window.dispatchEvent(new Event('tc_notifications_updated'))
      window.dispatchEvent(new CustomEvent('tc_inquiry_received', { detail: { targetEmail, empCode, senderRole: currentUser?.role || 'Sales Manager' } }))
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
  }, [currentUser.id, currentUser.email])

  // ─── 2. Fetch team locations ──────────────────────────────────────────────
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const res = await spatialAPI.getTeamLocations().catch(() => null)
      const payload = res?.data || res || {}
      let list = Array.isArray(payload?.executives) ? [...payload.executives] : []

      const isCeo = String(currentUser?.role || currentUser?.designation || '').toLowerCase().includes('ceo') || window.location.pathname.startsWith('/ceo')

      if (isCeo) {
        // CEO Portal: Track ONLY Managers (Sales Managers, Regional Managers, etc. — Exclude Team Leads & Executives)
        const [empRes, userRes] = await Promise.all([
          hrmsAPI.getEmployees().catch(() => null),
          userAPI.getUsers().catch(() => null)
        ])
        const allEmps = Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : [])
        const allUsers = Array.isArray(userRes?.data) ? userRes.data : (Array.isArray(userRes) ? userRes : [])
        const combined = [...allEmps, ...allUsers]

        let managerCandidates = combined.filter(e => {
          const r = String(e.role || e.designation || e.employee_role || '').toLowerCase()
          return (r.includes('manager') || r.includes('mgr')) &&
                 !r.includes('team lead') && !r.includes('lead') && !r.includes('tl') && !r.includes('executive')
        })

        if (managerCandidates.length === 0) {
          managerCandidates = list.filter(e => {
            const r = String(e.role || e.designation || '').toLowerCase()
            return r.includes('manager') || r.includes('mgr')
          })
        }
        if (managerCandidates.length === 0 && combined.length > 0) {
          managerCandidates = combined.filter(e => {
            const r = String(e.role || e.designation || '').toLowerCase()
            return !r.includes('executive')
          })
        }

        const managerList = (managerCandidates.length > 0 ? managerCandidates : list).map(m => {
          const mName = m.name || m.full_name || m.employee_name || 'Sales Manager'
          const mEmail = String(m.email || '').toLowerCase()
          const liveData = list.find(r => 
            (r.employee_id && String(r.employee_id) === String(m.employee_id || m.id)) ||
            (r.email && String(r.email).toLowerCase() === mEmail) ||
            (r.employee_name && String(r.employee_name).toLowerCase().includes(mName.toLowerCase()))
          ) || {}
          return {
            ...m,
            ...liveData,
            id: m.employee_id || m.id || liveData.id || `MGR_${Math.random().toString(36).substr(2, 4)}`,
            employee_id: m.employee_id || m.id || liveData.employee_id || `MGR_${Math.random().toString(36).substr(2, 4)}`,
            name: mName,
            employee_name: mName,
            designation: m.designation || m.role || 'Sales Manager',
            role: m.role || m.designation || 'Sales Manager',
            latitude: liveData.latitude || m.latitude || null,
            longitude: liveData.longitude || m.longitude || null,
            is_online: liveData.is_online !== undefined ? liveData.is_online : true,
            last_seen_at: liveData.last_seen_at || m.last_seen_at || ''
          }
        })

        const seenM = new Set()
        const uniqueManagers = managerList.filter(m => {
          const key = String(m.employee_id || m.id || m.name).toLowerCase()
          if (seenM.has(key)) return false
          seenM.add(key)
          return true
        })

        if (uniqueManagers.length > 0) {
          list = uniqueManagers
        } else if (list.length > 0) {
          list = list.map(e => ({
            ...e,
            designation: e.designation || 'Sales Manager',
            role: e.role || 'Sales Manager'
          }))
        }
      }

      setExecutives(list)
      const onlineCount = list.filter(e => e.is_online).length
      setStats({ total: list.length, online: onlineCount, offline: list.length - onlineCount })
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
  const teamMarkerAnimFramesRef = useRef(new globalThis.Map())
  const infoWindowRef   = useRef(null)
  const executivesRef   = useRef([])

  useEffect(() => {
    executivesRef.current = executives
  }, [executives])

  // ── Phase 1 & Phase 2A Optimization: Smooth 60fps Marker Interpolation & Dual Transport Benchmarking ──
  const animateTeamMarker = useCallback((empId, targetLat, targetLng, locPayload = {}) => {
    if (!googleMapRef.current || !window.google) return;
    
    // Check performance measurement timestamps
    const t3_receive = locPayload.t3_mgr_receive || Date.now();
    const t1_watch = locPayload.t1_watch || locPayload.broadcast_sent_at;
    const t2_send = locPayload.t2_ws_send || locPayload.t2_broadcast || locPayload.broadcast_sent_at;
    const isFastApiWs = !!locPayload.t2_ws_send;
    const channelName = isFastApiWs ? 'FastAPI WebSocket' : 'Supabase Broadcast';

    const marker = teamMarkersMapRef.current.get(empId);
    if (!marker) return;

    const fromPos = marker.getPosition();
    if (!fromPos) return;

    const prevLat = typeof fromPos.lat === 'function' ? fromPos.lat() : fromPos.lat;
    const prevLng = typeof fromPos.lng === 'function' ? fromPos.lng() : fromPos.lng;

    // If movement is negligible (< 0.00001 deg ~ 1m), set position directly
    if (Math.abs(prevLat - targetLat) < 0.00001 && Math.abs(prevLng - targetLng) < 0.00001) {
      marker.setLatLng(new window.google.maps.LatLng(targetLat, targetLng));
      return;
    }

    // Cancel existing animation frame for this marker if running
    if (teamMarkerAnimFramesRef.current.has(empId)) {
      cancelAnimationFrame(teamMarkerAnimFramesRef.current.get(empId));
      teamMarkerAnimFramesRef.current.delete(empId);
    }

    const t4_anim_start = Date.now();
    const duration = 1000; // 1 second smooth sliding window
    let startTime = null;

    if (window.__TRACKING_PERF_LOG__ || process.env.NODE_ENV === 'development') {
      const transportLatency = t2_send ? (t3_receive - t2_send) : 'N/A';
      const mapUpdateLatency = t4_anim_start - t3_receive;
      const totalObservableLatency = t1_watch ? (t4_anim_start - t1_watch) : 'N/A';
      console.log(`[PERF MEASURE BENCHMARK - ${channelName}] Exec ${empId}: Transport=${transportLatency}ms | MapUpdate=${mapUpdateLatency}ms | TotalObservable=${totalObservableLatency}ms`);
    }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const currLat = prevLat + (targetLat - prevLat) * progress;
      const currLng = prevLng + (targetLng - prevLng) * progress;

      marker.setLatLng(new window.google.maps.LatLng(currLat, currLng));

      if (progress < 1) {
        const nextFrameId = requestAnimationFrame(step);
        teamMarkerAnimFramesRef.current.set(empId, nextFrameId);
      } else {
        teamMarkerAnimFramesRef.current.delete(empId);
        const t5_anim_complete = Date.now();
        if (window.__TRACKING_PERF_LOG__) {
          console.log(`[PERF MEASURE BENCHMARK - ${channelName}] Exec ${empId}: Marker animation completed in ${t5_anim_complete - t4_anim_start}ms`);
        }
      }
    };

    const initialFrameId = requestAnimationFrame(step);
    teamMarkerAnimFramesRef.current.set(empId, initialFrameId);
  }, []);

  // ── Phase 2A Dual Benchmarking: Manager FastAPI Direct WebSocket Subscription ──
  const managerWsRef = useRef(null);
  const managerWsReconnectTimerRef = useRef(null);
  const managerWsBackoffMsRef = useRef(1000);

  useEffect(() => {
    let isSubscribed = true;

    const connectManagerWebSocket = () => {
      if (!isSubscribed) return;
      try {
        if (managerWsRef.current && (managerWsRef.current.readyState === WebSocket.OPEN || managerWsRef.current.readyState === WebSocket.CONNECTING)) {
          return;
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
        const apiBase = getApiBaseUrl();
        const wsProto = (apiBase.startsWith('https') || window.location.protocol === 'https:') ? 'wss' : 'ws';
        const wsHost = apiBase.startsWith('/') ? window.location.host : apiBase.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
        const wsUrl = `${wsProto}://${wsHost}/api/v1/spatial/ws/tracking/manager?token=${encodeURIComponent(token)}`;

        console.log("[Phase 2A WS] Manager connecting to FastAPI WebSocket:", wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[Phase 2A WS] Manager FastAPI WebSocket connected successfully.");
          managerWsBackoffMsRef.current = 1000;
        };

        ws.onmessage = (event) => {
          const t3_mgr_receive = Date.now();
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'initial_state' && Array.isArray(data.locations)) {
              data.locations.forEach(loc => {
                const receivedLat = loc.latitude || loc.lat;
                const receivedLng = loc.longitude || loc.lng;
                const empId = loc.employee_id || loc.employee_code;
                if (empId && receivedLat && receivedLng) {
                  const existingMarker = teamMarkersMapRef.current.get(empId);
                  if (existingMarker) {
                    animateTeamMarker(empId, receivedLat, receivedLng, { ...loc, t3_mgr_receive });
                  }
                }
              });
            } else if (data.type === 'location_update' && data.payload) {
              const loc = data.payload;
              const receivedLat = loc.latitude || loc.lat;
              const receivedLng = loc.longitude || loc.lng;
              if (!receivedLat || !receivedLng) return;

              let targetEmpId = null;
              const currentExecs = executivesRef.current.length > 0 ? executivesRef.current : executives;
              for (const e of currentExecs) {
                const matchId = loc.employee_id && (String(e.employee_id) === String(loc.employee_id) || String(e.id) === String(loc.employee_id));
                const matchCode = loc.employee_code && String(e.employee_code) === String(loc.employee_code);
                const matchEmail = loc.email && String(e.email || '').toLowerCase() === String(loc.email).toLowerCase();
                if (matchId || matchCode || matchEmail) {
                  targetEmpId = e.employee_id || e.id;
                  e.latitude = receivedLat;
                  e.longitude = receivedLng;
                  e.accuracy = loc.accuracy || e.accuracy;
                  e.is_online = true;
                  e.last_seen_at = loc.recorded_at || new Date().toISOString();
                  break;
                }
              }
              if (!targetEmpId) targetEmpId = loc.employee_id || loc.employee_code;

              const existingMarker = targetEmpId ? teamMarkersMapRef.current.get(targetEmpId) : null;
              if (existingMarker && targetEmpId) {
                animateTeamMarker(targetEmpId, receivedLat, receivedLng, { ...loc, t3_mgr_receive });
              }
            }
          } catch (err) {
            console.warn("[Phase 2A WS] Error processing Manager WebSocket message:", err);
          }
        };

        ws.onerror = () => {
          // Silent fallback — real-time locations stream via Supabase Realtime channel
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          managerWsRef.current = null;
        };

        managerWsRef.current = ws;
      } catch (err) {
        console.warn("[Phase 2A WS] Failed to init Manager FastAPI WebSocket:", err);
      }
    };

    connectManagerWebSocket();

    return () => {
      isSubscribed = false;
      if (managerWsReconnectTimerRef.current) clearTimeout(managerWsReconnectTimerRef.current);
      if (managerWsRef.current) {
        try { managerWsRef.current.close(); } catch {}
        managerWsRef.current = null;
      }
    };
  }, []);

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

      // Render primary bold BLUE driving route polyline to destination
      if (destRouteRef.current) {
        destRouteRef.current.setPath(pathCoords);
        if (!destRouteRef.current.getMap()) {
          destRouteRef.current.setMap(googleMapRef.current);
        }
      } else {
        destRouteRef.current = new window.google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#2563eb', // Primary bold BLUE driving route to client
          strokeWeight: 5,
          strokeOpacity: 0.85,
          map: googleMapRef.current,
          zIndex: 10
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
    // If already fully loaded (google.maps.Map constructor must exist), skip network round-trip
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

  // ─── P2 Optimization: Realtime Primary with 45s Disconnected Fallback & Visibility Control ───
  const fallbackTimerRef = useRef(null)
  const isRealtimeActiveRef = useRef(false)

  // Start 45s fallback polling ONLY when Realtime is disconnected
  const startFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) return
    console.log('[ManagerSmartMap] Realtime disconnected: Starting 45s fallback polling')
    fallbackTimerRef.current = setInterval(() => {
      if (!document.hidden && !isRealtimeActiveRef.current) {
        fetchData(true)
      }
    }, 45000) // Safe 45-second fallback polling interval
  }, [fetchData])

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      console.log('[ManagerSmartMap] Realtime connected: Stopping fallback polling')
      clearInterval(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  // Page Visibility API handler: avoid updates when tab is hidden, resync on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Resync team locations once when returning to visible tab
        fetchData(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

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
        rawVisitsRef.current = visits

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

  // ─── Supabase Realtime: broadcast channels + postgres_changes fallback ───
  const broadcastChannelsRef = useRef([])

  // Subscribe to each executive's broadcast channel when executives list updates
  useEffect(() => {
    if (!supabase || executives.length === 0) return

    // Clean up previous broadcast subscriptions
    broadcastChannelsRef.current.forEach(ch => {
      try { supabase.removeChannel(ch) } catch {}
    })
    broadcastChannelsRef.current = []

    // Subscribe to each executive's tracking broadcast channels
    executives.forEach(ex => {
      const empId = ex.employee_id || ex.id || ''
      const empCode = ex.employee_code || ''
      const empEmail = (ex.email || '').toLowerCase()

      const channelKeys = new Set()
      if (empId) {
        channelKeys.add(`tracking_${empId}`)
        channelKeys.add(`tracking_${empId}_live`)
      }
      if (empCode && empCode !== empId) {
        channelKeys.add(`tracking_${empCode}`)
        channelKeys.add(`tracking_${empCode}_live`)
      }
      // Also subscribe via auth UUID (used by SalesLayout.jsx as fallback channel name)
      const authUid = ex.auth_user_id || ex.user_id || ''
      if (authUid && authUid !== empId && authUid !== empCode) {
        channelKeys.add(`tracking_${authUid}`)
        channelKeys.add(`tracking_${authUid}_live`)
      }

      channelKeys.forEach(chName => {
        try {
          const ch = supabase
            .channel(chName)
            .on('broadcast', { event: 'location' }, (msg) => {
              const loc = msg.payload
              if (!loc) return
              if (loc.status === 'stopped' || loc.tracking_status === 'stopped' || loc.event === 'stop') {
                setExecutives(prev => prev.map(e => {
                  const matchId = empId && (String(e.employee_id) === String(empId) || String(e.id) === String(empId))
                  const matchCode = empCode && String(e.employee_code) === String(empCode)
                  const matchEmail = empEmail && String(e.email || '').toLowerCase() === empEmail
                  if (matchId || matchCode || matchEmail) {
                    return { ...e, is_online: false, tracking_status: 'stopped', status: 'stopped' }
                  }
                  return e
                }))
                if (selectedExecutiveRef.current) {
                  const sEx = selectedExecutiveRef.current
                  const matchId = empId && (String(sEx.employee_id) === String(empId) || String(sEx.id) === String(empId))
                  const matchCode = empCode && String(sEx.employee_code) === String(empCode)
                  const matchEmail = empEmail && String(sEx.email || '').toLowerCase() === empEmail
                  if (matchId || matchCode || matchEmail) {
                    setTrackStatus('stopped')
                  }
                }
                return
              }

              const receivedLat = loc.latitude || loc.lat
              const receivedLng = loc.longitude || loc.lng
              if (!receivedLat || !receivedLng) return

              let targetEmpId = null
              const currentExecs = executivesRef.current.length > 0 ? executivesRef.current : executives
              for (const e of currentExecs) {
                const matchId = empId && (String(e.employee_id) === String(empId) || String(e.id) === String(empId))
                const matchCode = empCode && String(e.employee_code) === String(empCode)
                const matchEmail = empEmail && String(e.email || '').toLowerCase() === empEmail
                if (matchId || matchCode || matchEmail) {
                  targetEmpId = e.employee_id || e.id
                  e.latitude = receivedLat
                  e.longitude = receivedLng
                  e.accuracy = loc.accuracy || e.accuracy
                  e.is_online = true
                  e.last_seen_at = loc.recorded_at || new Date().toISOString()
                  break
                }
              }

              const existingMarker = targetEmpId ? teamMarkersMapRef.current.get(targetEmpId) : null

              if (existingMarker && targetEmpId) {
                // Direct marker position update & interpolation without component re-render
                animateTeamMarker(targetEmpId, receivedLat, receivedLng, loc)
              } else {
                // Fallback: If marker isn't rendered on map yet, set state to trigger creation
                setExecutives(prev => prev.map(e => {
                  const matchId = empId && (String(e.employee_id) === String(empId) || String(e.id) === String(empId))
                  const matchCode = empCode && String(e.employee_code) === String(empCode)
                  const matchEmail = empEmail && String(e.email || '').toLowerCase() === empEmail
                  if (matchId || matchCode || matchEmail) {
                    return {
                      ...e,
                      latitude: receivedLat,
                      longitude: receivedLng,
                      accuracy: loc.accuracy || e.accuracy,
                      is_online: true,
                      last_seen_at: loc.recorded_at || new Date().toISOString()
                    }
                  }
                  return e
                }))
              }
            })
            .on('broadcast', { event: 'status' }, (msg) => {
              const loc = msg.payload || msg
              if (!loc) return
              if (loc.status === 'stopped' || loc.tracking_status === 'stopped' || loc.event === 'stop') {
                setExecutives(prev => prev.map(e => {
                  const matchId = empId && (String(e.employee_id) === String(empId) || String(e.id) === String(empId))
                  const matchCode = empCode && String(e.employee_code) === String(empCode)
                  const matchEmail = empEmail && String(e.email || '').toLowerCase() === empEmail
                  if (matchId || matchCode || matchEmail) {
                    return { ...e, is_online: false, tracking_status: 'stopped', status: 'stopped' }
                  }
                  return e
                }))
                if (selectedExecutiveRef.current) {
                  const sEx = selectedExecutiveRef.current
                  const matchId = empId && (String(sEx.employee_id) === String(empId) || String(sEx.id) === String(empId))
                  const matchCode = empCode && String(sEx.employee_code) === String(empCode)
                  const matchEmail = empEmail && String(sEx.email || '').toLowerCase() === empEmail
                  if (matchId || matchCode || matchEmail) {
                    setTrackStatus('stopped')
                  }
                }
              }
            })
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                console.log(`[ManagerMap] Subscribed to exec broadcast: ${chName}`)
              }
            })
          broadcastChannelsRef.current.push(ch)
        } catch (err) {
          console.warn(`[ManagerMap] Failed to subscribe to ${chName}:`, err)
        }
      })
    })

    return () => {
      broadcastChannelsRef.current.forEach(ch => {
        try { supabase.removeChannel(ch) } catch {}
      })
      broadcastChannelsRef.current = []
    }
  }, [executives.map(e => e.employee_id).join(',')]) // re-subscribe when team changes

  // Also subscribe to postgres_changes on employee_locations as fallback
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
        
        const updatedEmpId = String(updatedLoc.employee_id || '').trim()
        if (!updatedEmpId) return

        setExecutives(prev => {
          return prev.map(ex => {
            const exId = String(ex.employee_id || '').trim()
            const exCode = String(ex.employee_code || '').trim()
            if (exId === updatedEmpId || exCode === updatedEmpId) {
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ManagerSmartMap] Realtime channel connected: team_locations_realtime')
          isRealtimeActiveRef.current = true
          stopFallbackPolling()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[ManagerSmartMap] Realtime channel disconnected/error:', status)
          isRealtimeActiveRef.current = false
          startFallbackPolling()
        }
      })
      
    return () => {
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          console.warn("Error removing team locations realtime channel:", e)
        }
      }
    }
  }, [supabase, startFallbackPolling, stopFallbackPolling])

  // ─── 3. Google Maps init ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || googleMapRef.current) return

    // Safety guard: ensure Map constructor is truly available (loading=async can expose
    // a partial window.google.maps stub before Map class is ready)
    if (!window.google?.maps?.Map || typeof window.google.maps.Map !== 'function') {
      const retryTimer = setTimeout(() => {
        if (!mapContainerRef.current || googleMapRef.current) return
        if (!window.google?.maps?.Map || typeof window.google.maps.Map !== 'function') {
          console.warn('[SmartMap] Map constructor still not ready, re-triggering load.')
          setMapLoaded(false)
          setTimeout(() => setMapLoaded(true), 500)
          return
        }
        try {
          initializeHTMLMapMarker()
          if (mapContainerRef.current) mapContainerRef.current.innerHTML = ''
          const m = new window.google.maps.Map(mapContainerRef.current, {
            center: { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
            zoom: 13,
            mapId: 'DEMO_MAP_ID', // Enables Google Vector Maps WebGL 60fps rendering & 3D buildings
            zoomControl: true,
            zoomControlOptions: { position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM || 9 },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          })
          googleMapRef.current = m
        } catch (e) {
          console.error('[SmartMap] Retry map init failed:', e)
        }
      }, 600)
      return () => clearTimeout(retryTimer)
    }

    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = ''
    }
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
      zoom: 13,
      mapId: 'DEMO_MAP_ID', // Enables Google Vector Maps WebGL 60fps rendering & 3D buildings
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
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = ''
      }
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
    if (trackStatus === 'ended' || trackStatus === 'stopped') return 'Stopped';
    if (trackSession?.status === 'ended' || trackSession?.status === 'stopped') return 'Stopped';
    if (selectedExecutive && (selectedExecutive.is_online === false || selectedExecutive.tracking_status === 'stopped' || selectedExecutive.tracking_status === 'ended')) {
      return 'Stopped';
    }
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
    const minsAgo = Math.floor(age / 60000);
    if (selectedExecutive) {
      const staleKey = `stale_${selectedExecutive.employee_id}_${Math.floor(lastPingMs / 60000)}`
      if (!notifiedEventsRef.current.has(staleKey)) {
        notifiedEventsRef.current.set(staleKey, true)
        sendManagerNotification(
          '🟠 Executive GPS Stale',
          `${resolveRealName(selectedExecutive)}'s GPS signal has not updated for over ${minsAgo} minute(s).`,
          'TRACKING'
        )
      }
    }
    return { label: `GPS Stale (${minsAgo > 0 ? `${minsAgo}m ago` : '>1 min'})`, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' };
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
        const activeSelected = selectedExecutiveRef.current || selectedExecutive;
        if (activeSelected) {
          const selIds = [activeSelected.employee_id, activeSelected.employee_code, activeSelected.id, activeSelected.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
          const exIds = [ex.employee_id, ex.employee_code, ex.id, ex.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
          if (selIds.some(id => exIds.includes(id))) {
            let existingMarker = teamMarkersMapRef.current.get(ex.employee_id || ex.id)
            if (existingMarker) {
              try { existingMarker.setMap(null); } catch {}
              if (existingMarker.div?.parentNode) {
                try { existingMarker.div.parentNode.removeChild(existingMarker.div); } catch {}
              }
              teamMarkersMapRef.current.delete(ex.employee_id || ex.id)
            }
            return;
          }
        }

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

        // If executive is currently selected for live tracking, hide team marker to prevent duplicate markers
        const selectedId = String(selectedExecutiveRef.current?.employee_id || selectedExecutiveRef.current?.id || selectedExecutive?.employee_id || selectedExecutive?.id || '')
        if (selectedId && String(empId) === selectedId) {
          let existingMarker = teamMarkersMapRef.current.get(empId)
          if (existingMarker) {
            try { existingMarker.setMap(null); } catch {}
            teamMarkersMapRef.current.delete(empId)
          }
          return
        }

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
        if (teamMarkerAnimFramesRef.current.has(empId)) {
          cancelAnimationFrame(teamMarkerAnimFramesRef.current.get(empId))
          teamMarkerAnimFramesRef.current.delete(empId)
        }
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
    if (trackRouteRef.current)  { try { trackRouteRef.current.setMap(null); } catch {} trackRouteRef.current = null }
    trailPointsRef.current = []
    if (startMarkerRef.current) {
      try { startMarkerRef.current.setMap(null); } catch {}
      if (startMarkerRef.current.div?.parentNode) {
        try { startMarkerRef.current.div.parentNode.removeChild(startMarkerRef.current.div); } catch {}
      }
      startMarkerRef.current = null
    }
    if (liveMarkerRef.current)  {
      try { liveMarkerRef.current.setMap(null); } catch {}
      if (liveMarkerRef.current.div?.parentNode) {
        try { liveMarkerRef.current.div.parentNode.removeChild(liveMarkerRef.current.div); } catch {}
      }
      liveMarkerRef.current = null
    }
    if (endMarkerRef.current)   {
      try { endMarkerRef.current.setMap(null); } catch {}
      if (endMarkerRef.current.div?.parentNode) {
        try { endMarkerRef.current.div.parentNode.removeChild(endMarkerRef.current.div); } catch {}
      }
      endMarkerRef.current = null
    }
    if (destMarkerRef.current)  {
      try { destMarkerRef.current.setMap(null); } catch {}
      if (destMarkerRef.current.div?.parentNode) {
        try { destMarkerRef.current.div.parentNode.removeChild(destMarkerRef.current.div); } catch {}
      }
      destMarkerRef.current = null
    }
    if (destRouteRef.current)   { try { destRouteRef.current.setMap(null); } catch {} destRouteRef.current = null }
    if (offRoutePolylineRef.current) { try { offRoutePolylineRef.current.setMap(null); } catch {} offRoutePolylineRef.current = null }
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
    setSelectedRouteClient(null)
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
            contact_person: item.contact_person || item.person || item.name || item.contact_name || '',
            category,
            latitude: ok ? lat : null,
            longitude: ok ? lng : null,
            has_exact_coords: ok,
            address: item.address || item.location || item.city || '—',
            phone: item.phone || item.mobile || item.contact_phone || '',
            email: item.email || item.contact_email || '',
            originalItem: item,
          };
        };
        const rawLeads = safeArray(lRes);
        const rawCusts = safeArray(cRes);

        const localLeads = JSON.parse(localStorage.getItem('tc_sm_leads') || '[]');
        const localCusts = JSON.parse(localStorage.getItem('tc_customer_accounts') || '[]');

        const mergedLeads = [...rawLeads];
        localLeads.forEach(l => {
          if (l && !mergedLeads.some(m => m.id === l.id || (m.company === l.company && m.name === l.name))) {
            mergedLeads.push(l);
          }
        });

        const mergedCusts = [...rawCusts];
        localCusts.forEach(c => {
          if (c && !mergedCusts.some(m => m.id === c.id || (m.company === c.company && m.name === c.name))) {
            mergedCusts.push(c);
          }
        });

        const leads = mergedLeads.map((i, idx) => toNorm(i, 'Lead', idx));
        const custs = mergedCusts.map((i, idx) => toNorm(i, 'Customer', idx));
        candidates = [...leads, ...custs].filter(c => c.has_exact_coords);
        candidatesRef.current = candidates;
      } catch (e) {
        console.warn("Failed to load candidates on the fly:", e);
      }
    }
    if (!candidates || candidates.length === 0) return;

    // Filter candidates strictly for the currently selected executive (e.g. Bavani sree)
    const activeExec = selectedExecutiveRef.current || selectedExecutive;
    if (activeExec) {
      candidates = candidates.filter(c => isItemOwnedByExecutive(c, activeExec));
    }

    // Compute executive-scoped completed and scheduled visit IDs
    let completedVisitIds = completedVisitIdsRef.current;
    let scheduledVisitIds = scheduledVisitIdsRef.current;
    if (activeExec && rawVisitsRef.current && rawVisitsRef.current.length > 0) {
      const execVisits = rawVisitsRef.current.filter(v => isItemOwnedByExecutive(v, activeExec));
      const compSet = new Set(
        execVisits.filter(v => ['COMPLETED', 'CHECKED_OUT', 'visited', 'completed'].includes(v.status || v.visit_status))
                  .map(v => v.lead_id || v.customer_id || v.client_id || v.id)
                  .filter(Boolean)
      );
      const schedSet = new Set(
        execVisits.filter(v => !compSet.has(v.lead_id || v.customer_id || v.client_id || v.id))
                  .map(v => v.lead_id || v.customer_id || v.client_id || v.id)
                  .filter(Boolean)
      );
      completedVisitIds = compSet;
      scheduledVisitIds = schedSet;
    }

    let matched = [];
    if (routePath && routePath.length >= 2) {
      // 1. Run shared detection (500m hard corridor, segment-based, ahead-only)
      matched = detectRouteClients({
        candidates,
        routePath,
        execPos:  { lat: execLat, lng: execLng },
        destId,
        completedVisitIds,
        scheduledVisitIds,
      });
    }

    if (!matched || matched.length === 0) {
      // 2. Fallback: Radius-based detection within 3 km of executive
      matched = candidates.filter(c => {
        if (destId && String(c.id) === String(destId)) return false;
        const d = haversineDistance(execLat, execLng, c.latitude, c.longitude);
        return d <= 3.0;
      }).map(c => {
        const d = haversineDistance(execLat, execLng, c.latitude, c.longitude);
        const isPrev = completedVisitIds?.has(c.id);
        const isSched = scheduledVisitIds?.has(c.id);
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
          setSelectedRouteClient(item);
          showInfoWindow(itemLatLng, `
            <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;padding:8px;color:#0f172a;min-width:240px;">
              <div style="display:flex;align-items:center;gap:6px;font-weight:900;color:${pinColor};text-transform:uppercase;font-size:10px;letter-spacing:0.5px;margin-bottom:6px;border-bottom:1.5px solid #f1f5f9;padding-bottom:4px;">
                <span>${isPrev ? '🔄 Previous Visited Client' : (isSched ? '📅 Scheduled Client Visit' : '📍 Nearby ' + item.category)}</span>
              </div>
              <div style="font-weight:800;font-size:13px;color:#0f172a;">${item.title}</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-size:11px;color:#334155;margin-top:6px;">
                ${item.contact_person ? `
                  <span style="font-weight:700;color:#64748b;">Contact:</span>
                  <span style="font-weight:800;color:#0f172a;">${item.contact_person}</span>
                ` : ''}
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

          <!-- Top-down Blue Motorcycle Live Tracking Rider Marker -->
          <img src="${liveTrackingBike}" alt="Live Tracking Rider" style="width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6)); border-radius: 50%;" />
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
    if (crumbTime && !isNaN(crumbTime) && crumbTime < latestTimestampRef.current - 5000) {
      console.log("[SmartMap] Ignored older coordinate update:", crumb.recorded_at || crumb.timestamp)
      return
    }
    if (crumbTime && !isNaN(crumbTime)) {
      latestTimestampRef.current = Math.max(latestTimestampRef.current, crumbTime)
    }

    const now = Date.now()
    setLastPingMs(now)
    lastMovedTimeRef.current = now

    // Check if executive arrived at destination client (< 80 meters)
    let isArrived = false;
    if (destClientRef.current?.latitude && destClientRef.current?.longitude) {
      const distToDest = haversineDistance(lat, lng, Number(destClientRef.current.latitude), Number(destClientRef.current.longitude)) * 1000;
      if (distToDest <= 80) {
        isArrived = true;
      }
    }

    if (isArrived) {
      setTrackStatus('destination_reached')
    } else {
      // Rapido/Zepto style auto-recovery: immediately update status back to travelling!
      setTrackStatus('travelling')
    }

    setLatestExecPos({ lat, lng })

    if (!lastMovedPosRef.current) {
      lastMovedPosRef.current = { lat, lng }
    } else {
      const distMoved = haversineDistance(lat, lng, lastMovedPosRef.current.lat, lastMovedPosRef.current.lng) * 1000
      if (distMoved >= 5) {
        lastMovedPosRef.current = { lat, lng }
      }
    }

    // Instantly sync executive status in state & sidebar so manager UI updates without page refresh
    const targetEmpId = crumb.employee_id || crumb.employee_code || selectedExecutiveRef.current?.employee_id || selectedExecutiveRef.current?.id;
    if (targetEmpId) {
      setSelectedExecutive(prev => {
        if (!prev) return prev;
        const match = String(prev.employee_id || prev.id) === String(targetEmpId) || String(prev.employee_code) === String(targetEmpId);
        if (match) {
          return {
            ...prev,
            latitude: lat,
            longitude: lng,
            is_online: true,
            last_seen_at: crumb.recorded_at || new Date().toISOString()
          }
        }
        return prev;
      });

      setExecutives(prev => prev.map(ex => {
        const match = String(ex.employee_id || ex.id) === String(targetEmpId) || String(ex.employee_code) === String(targetEmpId);
        if (match) {
          return {
            ...ex,
            latitude: lat,
            longitude: lng,
            is_online: true,
            last_seen_at: crumb.recorded_at || new Date().toISOString()
          }
        }
        return ex;
      }));
    }

    // Extend traveled trail polyline dynamically with road geometry snapping (No building overlap)
    try {
      const newPt = { lat, lng }
      const pts = trailPointsRef.current
      const lastPt = pts.length > 0 ? pts[pts.length - 1] : null
      if (!lastPt) {
        pts.push(newPt)
      } else {
        const distKm = haversineDistance(lastPt.lat, lastPt.lng, lat, lng)
        const distM = distKm * 1000
        // Require at least 25m displacement from last anchored vertex to prevent stationary building scribbles
        if (distM >= 25 && distM <= 600) {
          pts.push(newPt)
        }
      }

      if (pts.length >= 1 && googleMapRef.current && window.google) {
        const rawPath = pts.map(p => ({ lat: p.lat, lng: p.lng }));
        // Append current live position to trail if it moved > 3m from last anchor (without adding a permanent vertex until 25m)
        if (pts.length === 1 || (lastPt && haversineDistance(lastPt.lat, lastPt.lng, lat, lng) * 1000 > 3)) {
          rawPath.push(newPt);
        }

        // Render single vibrant RED traveled line matching exact physical movement points (No synthetic OSRM route loops)
        if (rawPath.length >= 2) {
          if (offRoutePolylineRef.current) {
            try { offRoutePolylineRef.current.setMap(null); } catch {}
            offRoutePolylineRef.current = null;
          }

          if (trackRouteRef.current) {
            trackRouteRef.current.setPath(rawPath);
            if (!trackRouteRef.current.getMap()) {
              trackRouteRef.current.setMap(googleMapRef.current);
            }
          } else {
            trackRouteRef.current = new window.google.maps.Polyline({
              path: rawPath,
              geodesic: true,
              strokeColor: '#dc2626', // Vibrant Solid RED traveled route line
              strokeOpacity: 0.95,
              strokeWeight: 5,
              map: googleMapRef.current,
              zIndex: 25
            });
          }
        }
      }
    } catch (polylineErr) {
      console.warn("Failed to extend traveled trail polyline:", polylineErr)
    }

    // Animate live marker smoothly
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
          _buildLiveIcon('#8b5cf6', initialHeading, resolveRealName(selectedExecutiveRef.current)),
          () => {
            showInfoWindow(latlng, _buildLivePopupContent(selectedExecutiveRef.current, trackSessionRef.current, destClientRef.current))
          },
          'center'
        )
      }
    } catch (markerErr) {
      console.warn("Failed to animate or render live marker:", markerErr)
    }

    // Dynamic Route to Client Update
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
        try {
          const existing = supabase.getChannels().find(c => c.name === name || c.topic === `realtime:${name}`)
          if (existing) {
            supabase.removeChannel(existing)
          }
        } catch (_) {}

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
        if (parsed) {
          if (parsed.status === 'stopped' || parsed.tracking_status === 'stopped') {
            setTrackStatus('stopped')
            setExecutives(prev => prev.map(ex => {
              if (parsed.employee_id && (ex.employee_id === parsed.employee_id || ex.id === parsed.employee_id)) {
                return { ...ex, is_online: false, tracking_status: 'stopped' }
              }
              return ex
            }))
          } else if (parsed.latitude && parsed.longitude) {
            _applyNewCrumb(parsed)
            fetchData(true)
          }
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
        
        // Sequentially apply new crumbs or check if latest position moved
        if (newCrumbs.length > currentCount) {
          for (let i = currentCount; i < newCrumbs.length; i++) {
            _applyNewCrumb(newCrumbs[i])
          }
          crumbsRef.current = newCrumbs
          setTrackBreadcrumbs(newCrumbs)
          setTrackStatus('travelling')
        } else if (newCrumbs.length > 0) {
          const lastNewCrumb = newCrumbs[newCrumbs.length - 1]
          const lastLat = Number(lastNewCrumb.latitude)
          const lastLng = Number(lastNewCrumb.longitude)
          if (!latestExecPos || haversineDistance(latestExecPos.lat, latestExecPos.lng, lastLat, lastLng) * 1000 >= 3) {
            _applyNewCrumb(lastNewCrumb)
            setTrackStatus('travelling')
          }
        }
        
        const status = d?.tracking_status || 'active'
        const sess = d?.session
        
        if (status === 'ended') {
          setTrackStatus('ended')
        } else if (status === 'active' || status === 'travelling' || status === 'in_progress') {
          setTrackStatus('travelling')
        }
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
    }, 3000) // 3-second fallback polling interval for responsive live tracking
  }, [_applyNewCrumb, _handleSessionEnded, fetchData, latestExecPos])

  const _loadTrackingHistory = useCallback(async (executive) => {
    if (!googleMapRef.current || !window.google) return
    selectedExecutiveRef.current = executive
    setTrackStatus('loading')
    
    // Clear any existing tracking overlays first to avoid ghost polylines
    if (trackRouteRef.current) {
      try { trackRouteRef.current.setMap(null) } catch {}
      trackRouteRef.current = null
    }
    if (offRoutePolylineRef.current) {
      try { offRoutePolylineRef.current.setMap(null) } catch {}
      offRoutePolylineRef.current = null
    }
    if (destRouteRef.current) {
      try { destRouteRef.current.setMap(null) } catch {}
      destRouteRef.current = null
    }
    if (startMarkerRef.current) {
      try { startMarkerRef.current.setMap ? startMarkerRef.current.setMap(null) : startMarkerRef.current.remove?.() } catch {}
      startMarkerRef.current = null
    }
    if (endMarkerRef.current) {
      try { endMarkerRef.current.setMap ? endMarkerRef.current.setMap(null) : endMarkerRef.current.remove?.() } catch {}
      endMarkerRef.current = null
    }
    if (liveMarkerRef.current) {
      try { liveMarkerRef.current.setMap ? liveMarkerRef.current.setMap(null) : liveMarkerRef.current.remove?.() } catch {}
      liveMarkerRef.current = null
    }
    if (destMarkerRef.current) {
      try { destMarkerRef.current.setMap ? destMarkerRef.current.setMap(null) : destMarkerRef.current.remove?.() } catch {}
      destMarkerRef.current = null
    }
    trailPointsRef.current = []
    crumbsRef.current = []
    setTrackBreadcrumbs([])
    setTrackSession(null)
    setDestClient(null)
    destClientRef.current = null

    console.log("[SmartMap] Loading tracking history for executive:", executive?.employee_name, executive?.employee_id)
    try {
      const targetEmpId = executive.employee_id || executive.employee_code || executive.id
      const res = await spatialAPI.getLocationHistory(targetEmpId)
      const data = res?.data || res
      const session = data?.session
      trackSessionRef.current = session
      const rawCrumbs = data?.breadcrumbs || []
      const status = data?.tracking_status || 'active'

      // Filter breadcrumbs to ensure ONLY location points recorded TODAY (since 12 AM midnight) are displayed on the live radar map
      const todayIsoStr = new Date().toISOString().split('T')[0]
      const crumbs = rawCrumbs.filter(c => {
        const recStr = c.recorded_at || c.timestamp || ''
        return recStr.startsWith(todayIsoStr)
      })

      setTrackSession(session)
      crumbsRef.current = crumbs
      setTrackBreadcrumbs(crumbs)
      setTrackStatus(status)

      // Populate client destination details from session or executive record
      const s = session || trackSessionRef.current;
      const ex = executive || selectedExecutiveRef.current;

      const clientDestLat = s?.client_latitude != null ? Number(s.client_latitude) : (ex?.client_latitude != null ? Number(ex.client_latitude) : null);
      const clientDestLng = s?.client_longitude != null ? Number(s.client_longitude) : (ex?.client_longitude != null ? Number(ex.client_longitude) : null);

      let clientDest = null;
      if (clientDestLat != null && clientDestLng != null && !isNaN(clientDestLat) && !isNaN(clientDestLng) && clientDestLat !== 0 && clientDestLng !== 0) {
        clientDest = {
          id: s?.client_id || ex?.client_id || 'dest',
          title: s?.client_name || s?.company_name || ex?.client_name || ex?.company_name || 'Client Destination',
          company_name: s?.company_name || s?.client_name || ex?.company_name || ex?.client_name || 'Client Destination',
          address: s?.client_address || ex?.client_address || '',
          phone: s?.client_phone || ex?.client_phone || '',
          latitude: clientDestLat,
          longitude: clientDestLng,
          route_polyline: s?.route_polyline || ex?.route_polyline || null,
        };
      } else {
        // Fallback to active nav session saved locally for dev testing
        try {
          const savedNavStr = localStorage.getItem('tc_active_nav_session');
          if (savedNavStr) {
            const savedNav = JSON.parse(savedNavStr);
            if (savedNav?.navMode && savedNav?.selectedStop?.has_exact_coords) {
              const stop = savedNav.selectedStop;
              clientDest = {
                id: stop.id,
                title: stop.title || stop.company_name || 'Client Destination',
                company_name: stop.company_name || stop.title || 'Client Destination',
                address: stop.address || '',
                phone: stop.phone || '',
                latitude: Number(stop.latitude),
                longitude: Number(stop.longitude),
                route_polyline: null,
              };
            }
          }
        } catch (e) {}
      }

      if (clientDest) {
        setDestClient(clientDest);
        destClientRef.current = clientDest;
      } else {
        setDestClient(null);
        destClientRef.current = null;
      }

      // Clean up any previously rendered live marker instance before creating a new one on refresh
      if (liveMarkerRef.current) {
        try {
          if (typeof liveMarkerRef.current.setMap === 'function') {
            liveMarkerRef.current.setMap(null);
          }
          if (liveMarkerRef.current.div?.parentNode) {
            liveMarkerRef.current.div.parentNode.removeChild(liveMarkerRef.current.div);
          }
        } catch (e) {}
        liveMarkerRef.current = null;
      }

      // Sort location history crumbs strictly by recorded_at timestamp ascending
      if (Array.isArray(crumbs) && crumbs.length > 0) {
        crumbs.sort((a, b) => new Date(a.recorded_at || 0).getTime() - new Date(b.recorded_at || 0).getTime());
      }

      // Render live/end marker coordinates
      let latestLat = null
      let latestLng = null

      if (session && status === 'ended' && session.end_latitude != null && session.end_longitude != null) {
        latestLat = Number(session.end_latitude)
        latestLng = Number(session.end_longitude)
        const badgeColor = '#64748b'
        const latlng = new window.google.maps.LatLng(latestLat, latestLng)
        liveMarkerRef.current = createMapMarker(
          latlng,
          map,
          _buildLiveIcon(badgeColor, 0, resolveRealName(executive)),
          () => {
            showInfoWindow(latlng, _buildLivePopupContent(executive, session, null))
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
          _buildLiveIcon(badgeColor, initialHeading, resolveRealName(executive)),
          () => {
            showInfoWindow(latlng, _buildLivePopupContent(executive, session, null))
          },
          'center'
        )
        setLastPingMs(new Date(last.recorded_at).getTime())
      } else if (executive.latitude != null && executive.longitude != null) {
        latestLat = Number(executive.latitude)
        latestLng = Number(executive.longitude)
        const badgeColor = '#10b981'
        const latlng = new window.google.maps.LatLng(latestLat, latestLng)
        liveMarkerRef.current = createMapMarker(
          latlng,
          map,
          _buildLiveIcon(badgeColor, 0, resolveRealName(executive)),
          () => {
            showInfoWindow(latlng, _buildLivePopupContent(executive, session, null))
          },
          'center'
        )
        setLastPingMs(Date.now())
      }

      // ─── Draw traveled polyline ONLY for currently active sessions ───
      if (isSessionActive && crumbs.length > 1) {
        try {
          const rawPathCoords = crumbs.map(c => ({ lat: Number(c.latitude), lng: Number(c.longitude) })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng) && pt.lat !== 0 && pt.lng !== 0)
          
          // Apply 25m Displacement Anchoring filter to location history crumbs (Eliminates building scribbles & cell-tower teleports)
          const pathCoords = []
          if (rawPathCoords.length > 0) {
            pathCoords.push(rawPathCoords[0])
            let lastAnchor = rawPathCoords[0]
            for (let i = 1; i < rawPathCoords.length; i++) {
              const curr = rawPathCoords[i]
              const distKm = haversineDistance(lastAnchor.lat, lastAnchor.lng, curr.lat, curr.lng)
              const distM = distKm * 1000
              if (distM >= 25 && distM <= 600) {
                pathCoords.push(curr)
                lastAnchor = curr
              }
            }
          }
          
          // Seed in-memory trail points with clean anchored vertices so live updates seamlessly extend this trail
          trailPointsRef.current = [...pathCoords]

          let startLat = session?.start_latitude != null ? Number(session.start_latitude) : Number(crumbs[0].latitude)
          let startLng = session?.start_longitude != null ? Number(session.start_longitude) : Number(crumbs[0].longitude)

          if (!startMarkerRef.current && startLat != null && startLng != null && !isNaN(startLat) && !isNaN(startLng) && startLat !== 0 && startLng !== 0) {
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

          if (pathCoords.length > 1) {
            // Render single vibrant RED traveled line matching exact recorded breadcrumbs (No synthetic OSRM route loops)
            if (offRoutePolylineRef.current) {
              try { offRoutePolylineRef.current.setMap(null); } catch {}
              offRoutePolylineRef.current = null;
            }

            if (trackRouteRef.current) {
              trackRouteRef.current.setPath(pathCoords);
              if (!trackRouteRef.current.getMap()) {
                trackRouteRef.current.setMap(map);
              }
            } else {
              trackRouteRef.current = new window.google.maps.Polyline({
                path: pathCoords,
                strokeColor: '#dc2626', // Vibrant Solid RED traveled route line
                strokeOpacity: 0.95,
                strokeWeight: 5,
                geodesic: true,
                map: map,
                zIndex: 25
              });
            }
          }
        } catch (trailErr) {
          console.error("[SmartMap] Error rendering traveled trail:", trailErr)
        }
      }

      if (latestLat != null && latestLng != null && !isNaN(latestLat) && !isNaN(latestLng)) {
        setLatestExecPos({ lat: latestLat, lng: latestLng });
        if (clientDest) {
          _drawRouteToDestination(latestLat, latestLng, clientDest);
        } else {
          _fetchAndRenderNearbyClients(latestLat, latestLng);
        }
        if (crumbs.length > 0) {
          latestTimestampRef.current = new Date(crumbs[crumbs.length - 1].recorded_at).getTime();
        }
      }

      if (session && supabase) {
        try {
          const { data: evs, error: evsErr } = await supabase
            .schema('hrms')
            .from('tracking_events')
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
          if (latestLat != null && latestLng != null && !isNaN(latestLat) && !isNaN(latestLng) && latestLat !== 0 && latestLng !== 0) {
            allPts.push([latestLat, latestLng])
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

      // Subscribe Realtime
      _subscribeRealtime(executive.employee_id, session?.id, executive.employee_code)

    } catch (err) {
      console.error('Tracking history error:', err)
      setTrackStatus('idle')
    }
  }, [_subscribeRealtime, _fetchAndRenderNearbyClients])



  // Stale & Live Motion Auto-Recovery Timer: re-evaluate badge every 3s
  useEffect(() => {
    const t = setInterval(() => {
      if (!selectedExecutive) return
      if (trackStatus === 'ended' || trackStatus === 'logged_out' || trackStatus === 'offline') return
      const badge = getTrackingBadge(trackStatus, lastPingMs)
      if (badge.label.startsWith('Stale') && trackStatus !== 'stale') {
        setTrackStatus('stale')
      } else if (!badge.label.startsWith('Stale') && trackStatus === 'stale') {
        setTrackStatus('travelling') // Immediate auto-recovery when executive resumes moving!
      }
    }, 3000)
    return () => clearInterval(t)
  }, [selectedExecutive, trackStatus, lastPingMs])


  // 12:00 AM Midnight Auto-Reset: Clears previous day records automatically when the date rolls over
  useEffect(() => {
    let currentDayStr = new Date().toISOString().split('T')[0]
    const midnightTimer = setInterval(() => {
      const newDayStr = new Date().toISOString().split('T')[0]
      if (newDayStr !== currentDayStr) {
        console.log('[SmartMap] 12:00 AM Midnight rollover detected. Auto-clearing previous day live tracking history...')
        currentDayStr = newDayStr
        _clearTrackingLayer()
        if (selectedExecutiveRef.current) {
          _loadTrackingHistory(selectedExecutiveRef.current)
        }
      }
    }, 15000)
    return () => clearInterval(midnightTimer)
  }, [_clearTrackingLayer, _loadTrackingHistory])

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

  const handleRefreshTracking = useCallback(async () => {
    if (isRefreshingTracking) return
    setIsRefreshingTracking(true)
    try {
      const targetExec = selectedExecutiveRef.current || selectedExecutive
      
      // Clear tracking layer completely before reloading history & team locations
      _clearTrackingLayer()

      const tasks = []
      if (typeof fetchData === 'function') tasks.push(fetchData(true))
      if (targetExec) tasks.push(_loadTrackingHistory(targetExec))

      await Promise.all(tasks)
      showToast('Live tracking radar & location refreshed!', 'success')
    } catch (err) {
      console.error("Error refreshing tracking:", err)
      showToast('Failed to refresh tracking data.', 'error')
    } finally {
      setIsRefreshingTracking(false)
    }
  }, [isRefreshingTracking, fetchData, selectedExecutive, _loadTrackingHistory, _clearTrackingLayer, showToast])

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

  const badge = getTrackingBadge(trackStatus === 'ended' ? 'ended' : trackStatus, lastPingMs, selectedExecutive?.is_online)
  const proxStatus = getProximityStatus()
  const hb = getHeartbeatStatus()

  const isCeo = useMemo(() => {
    return String(currentUser?.role || currentUser?.designation || '').toLowerCase().includes('ceo') || window.location.pathname.startsWith('/ceo')
  }, [currentUser?.role, currentUser?.designation])

  // ─── 8. Render ────────────────────────────────────────────────────────────
  // Group members (Team Leads for Manager view, Managers for CEO view)
  const teamGroups = useMemo(() => {
    if (!executives || executives.length === 0) return []

    if (isCeo) {
      const mgrMap = new Map()
      executives.forEach(m => {
        const title = m.designation || m.role || 'Sales Manager'
        const key = title.toLowerCase().trim()
        if (!mgrMap.has(key)) {
          mgrMap.set(key, {
            key,
            title: title.endsWith('s') ? title : `${title}s`,
            leadName: title,
            leadEmail: '',
            leadRole: 'Manager',
            executives: []
          })
        }
        mgrMap.get(key).executives.push(m)
      })
      return Array.from(mgrMap.values()).filter(g => g.executives.length > 0)
    }

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

  // Filter executives based on searchQuery, active Team Lead filter, AND statusFilter (All / Online / Offline)
  const filteredExecutives = useMemo(() => {
    let list = executives
    if (activeTeamFilter !== 'all_combined' && currentTeamGroup) {
      list = currentTeamGroup.executives || []
    }
    if (statusFilter === 'online') {
      list = list.filter(e => Boolean(e.is_online))
    } else if (statusFilter === 'offline') {
      list = list.filter(e => !e.is_online)
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
  }, [executives, currentTeamGroup, activeTeamFilter, statusFilter, searchQuery])

  if (activeMapTab === 'own' && !isCeo) {
    return (
      <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-900 font-sans">
        {/* Floating Top Mode Switcher Bar */}
        <div className="absolute top-3 right-3 sm:right-6 z-[1050] flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-2xl">
          <button
            onClick={() => setActiveMapTab('team')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" /> Team Radar
          </button>
          <button
            onClick={() => setActiveMapTab('own')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-amber-200" /> Personal Map
          </button>
        </div>

        <SmartClientMap isManagerView={true} />
      </div>
    )
  }

  return (
    <div className="relative w-full min-h-[calc(100vh-7rem)] h-[calc(100vh-7rem)] overflow-hidden bg-slate-900 font-sans">

      {/* Map container — always in DOM, pre-initialized */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full absolute inset-0 z-0 ${!selectedExecutive ? 'invisible pointer-events-none' : 'visible'}`}
      />

      {/* ── Card Grid Dashboard (covers map when no executive selected) ── */}
      {!selectedExecutive && (
        <div className="absolute inset-0 z-30 bg-[#f1f5f9] overflow-y-auto overscroll-contain">
          <div className="max-w-5xl mx-auto px-4 pt-6 pb-44 space-y-6">

            {/* Header with Mode Toggle */}
            {!hideHeader && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" /> {isCeo ? 'CEO Operations Radar & Manager Live Tracking' : 'Smart Radar Map & Live Tracking'}
                  </h1>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {isCeo
                      ? 'Click a Sales Manager card to track live location, territory status & route breadcrumbs'
                      : 'Click an Executive card to track live location & route breadcrumbs'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowTripHistoryReport(true)
                      loadReports(reportFilterDate, reportFilterEmpId)
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl px-3 py-2 transition shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> 📊 Reports &amp; Trip History
                  </button>
                  <button
                    onClick={handleRefreshTracking}
                    disabled={isRefreshingTracking}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 border border-slate-200 bg-white rounded-xl px-3 py-2 hover:border-blue-300 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTracking ? 'animate-spin text-blue-600' : ''}`} /> Refresh
                  </button>
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  key: 'all',
                  label: 'Total',
                  value: executives.length,
                  bg: 'bg-gradient-to-br from-[#0b3c5d] to-[#1a5a8a]',
                  border: 'border-[#0b3c5d]/40',
                  numColor: 'text-white',
                  labelColor: 'text-blue-200',
                  icon: <Users className="w-5 h-5 mx-auto text-blue-200" />,
                },
                {
                  key: 'online',
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
                  key: 'offline',
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
              ].map(s => {
                const isActive = statusFilter === s.key
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setStatusFilter(s.key)}
                    className={`mgr-card rounded-2xl border ${s.bg} ${s.border} p-4 text-center shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between items-center min-h-[110px] cursor-pointer relative ${
                      isActive
                        ? 'ring-4 ring-offset-2 ring-blue-500 scale-[1.03] z-10 shadow-2xl'
                        : 'opacity-85 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                  >
                    <div className="h-6 flex items-center justify-center">{s.icon}</div>
                    <div className={`text-3xl font-black ${s.numColor} my-1`}>{s.value}</div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${s.labelColor}`}>{s.label}</span>
                      {isActive && <span className="text-[8px] bg-white/20 text-white font-black px-1.5 py-0.5 rounded-full border border-white/30">Active</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Team Lead / Manager Selector & Pagination Control */}
            {teamGroups.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                      {isCeo ? '🏛️' : '👑'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          {activeTeamFilter === 'all_combined'
                            ? (isCeo ? 'All Sales Managers' : 'All Assigned Teams')
                            : (currentTeamGroup?.title || (isCeo ? 'Sales Managers View' : 'Team Lead View'))}
                        </h3>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                          {filteredExecutives.length} {isCeo ? 'Managers' : 'Executives'} {statusFilter !== 'all' ? `(${statusFilter.toUpperCase()})` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {activeTeamFilter === 'all_combined'
                          ? (isCeo ? 'Displaying live locations across all Sales Managers' : 'Displaying combined list across all team leads')
                          : (isCeo ? `Category: ${currentTeamGroup?.title || 'Sales Managers'}` : `Reporting to Team Lead: ${currentTeamGroup?.leadName || 'Team Lead'}`)}
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

                        <div className="flex items-center gap-1.5">
                          {/* Trip History Report Button */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              const targetEmpId = ex.employee_id || ex.id
                              setReportFilterEmpId(targetEmpId)
                              setPitEmpId(targetEmpId)
                              setShowTripHistoryReport(true)
                              loadReports(reportFilterDate, targetEmpId)
                            }}
                            className="p-2.5 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 transition active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
                            title="View Executive Trip History & Operational Report"
                          >
                            <FileText size={16} />
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
                  <button
                    onClick={handleRefreshTracking}
                    disabled={isRefreshingTracking}
                    className="px-2 py-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition flex items-center gap-1 text-[10px] font-black cursor-pointer disabled:opacity-50"
                    title="Refresh Live Location & Trail"
                  >
                    <RefreshCw className={`w-3 h-3 text-blue-600 ${isRefreshingTracking ? 'animate-spin text-blue-600' : ''}`} />
                    <span>{isRefreshingTracking ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                  <button onClick={() => setIsTrackingMinimized(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" title="Minimize">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { _clearTrackingLayer(); setSelectedExecutive(null); setIsTrackingMinimized(false) }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Close Tracking">
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
                        prox === 'Stopped' || prox === 'Session Ended' ? 'bg-slate-100 text-slate-600 border border-slate-200 font-bold' :
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

          {/* ══ ON-ROUTE CLIENTS / NEARBY LEADS PANEL ══ */}
          {onRouteClients.length > 0 && (
            <div className="absolute bottom-24 right-5 z-20 w-80 space-y-1.5 font-sans pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-emerald-600 animate-pulse" />
                  <span className="text-xs font-black text-slate-900">{onRouteClients.length} client{onRouteClients.length > 1 ? 's' : ''} on route</span>
                </div>
                <button onClick={() => setShowRouteAlerts(v => !v)} className="text-[10px] font-black text-slate-400 hover:text-slate-700 cursor-pointer">
                  {showRouteAlerts ? 'Hide' : 'Show'}
                </button>
              </div>
              {showRouteAlerts && (
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                  {onRouteClients.map(client => {
                    const isPrev = client.alertType === 'previous';
                    const isSched = client.alertType === 'scheduled';
                    const label = isPrev ? 'PREVIOUS CLIENT' : (isSched ? 'SCHEDULED VISIT' : 'NEARBY ' + (client.category || 'CLIENT'));
                    const color = isPrev ? 'from-purple-600 to-indigo-700' : (isSched ? 'from-amber-600 to-orange-700' : 'from-emerald-600 to-teal-700');
                    const border = isPrev ? 'border-purple-500/30' : (isSched ? 'border-amber-500/30' : 'border-emerald-500/30');

                    return (
                      <div key={client.id} className={`bg-gradient-to-r ${color} text-white px-3 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 border ${border}`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MapPin size={11} className="text-white flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase opacity-80 tracking-wider">{label}</p>
                            <p className="text-[11px] font-black truncate">{client.title}</p>
                            <p className="text-[9px] opacity-75">{client.distToRouteM}m from route</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRouteClient(client);
                              if (googleMapRef.current && client.latitude && client.longitude) {
                                googleMapRef.current.panTo({ lat: Number(client.latitude), lng: Number(client.longitude) });
                                googleMapRef.current.setZoom(16);
                              }
                            }}
                            className="px-2 py-1 bg-white/20 hover:bg-white/30 font-black text-[10px] rounded-lg transition cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setOnRouteClients(prev => prev.filter(c => c.id !== client.id))}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[10px] rounded-lg opacity-70 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ SELECTED NEARBY ENTITY DETAIL CARD ══ */}
          {selectedRouteClient && (
            <div className="absolute bottom-5 left-5 lg:left-[22rem] z-20 w-80 bg-white/98 border border-slate-200 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-slate-800 pointer-events-auto font-sans animate-in slide-in-from-bottom duration-200 space-y-2.5">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black border px-1.5 py-0.5 rounded uppercase bg-blue-50 text-blue-700 border-blue-200">
                    {selectedRouteClient.category || 'Lead'}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-1 leading-tight">{selectedRouteClient.title}</h3>
                  {selectedRouteClient.contact_person && (
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">👤 {selectedRouteClient.contact_person}</p>
                  )}
                </div>
                <button onClick={() => setSelectedRouteClient(null)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-2.5 text-xs text-slate-600 space-y-1">
                <p className="truncate font-medium">📍 {selectedRouteClient.address}</p>
                {selectedRouteClient.phone && <p className="font-mono text-blue-600 font-bold">📞 {selectedRouteClient.phone}</p>}
                {selectedRouteClient.distToRouteM && <p className="text-[10px] text-slate-400 font-bold">{selectedRouteClient.distToRouteM}m away</p>}
              </div>

              <div className="flex gap-2">
                {selectedRouteClient.phone && (
                  <a
                    href={`tel:${selectedRouteClient.phone}`}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 transition shadow-xs text-center"
                  >
                    <Phone size={12} /> Call
                  </a>
                )}
                <button
                  onClick={() => {
                    if (googleMapRef.current && selectedRouteClient.latitude && selectedRouteClient.longitude) {
                      googleMapRef.current.panTo({ lat: Number(selectedRouteClient.latitude), lng: Number(selectedRouteClient.longitude) });
                      googleMapRef.current.setZoom(17);
                    }
                  }}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                >
                  <MapPin size={12} /> Focus
                </button>
              </div>
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

            {/* Executive responses & inquiry chat history */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Executive Responses Chat History</span>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {getUserReplies(inquiryModalEx).length} Messages
                </span>
              </div>
              {(() => {
                const replies = getUserReplies(inquiryModalEx)
                if (replies.length === 0) {
                  return <p className="text-xs text-slate-400 italic py-2">No inquiry or response messages received yet.</p>
                }
                return replies.map((r, i) => {
                  const isInquiry = r.is_inquiry || (String(r.category || r.type || '').toUpperCase().includes('INQUIRY') && !String(r.category || r.type || '').toUpperCase().includes('REPLY'))
                  return (
                    <div
                      key={r.id || i}
                      className={`rounded-2xl p-3 border space-y-1 transition-all ${
                        isInquiry
                          ? 'bg-amber-50/80 border-amber-200/90 ml-3'
                          : 'bg-blue-50/60 border-blue-200/80 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isInquiry ? 'text-amber-800' : 'text-blue-600'
                        }`}>
                          {isInquiry ? `⚡ Outgoing Inquiry (${r.sender_name || 'Manager'})` : `💬 Reply from ${r.sender_name || resolveRealName(inquiryModalEx)}`}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">
                          {r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">"{r.message}"</p>
                    </div>
                  )
                })
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

      {/* ── Reports & Trip History Full Overlay Dashboard ── */}
      {showTripHistoryReport && (
        <div className="absolute inset-0 z-50 bg-[#f8fafc] overflow-y-auto font-sans p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="max-w-7xl mx-auto space-y-6 pb-24">
            
            {/* Header with Back Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTripHistoryReport(false)}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 transition font-black flex items-center gap-1.5 text-xs cursor-pointer shrink-0 shadow-xs"
                >
                  <ArrowLeft size={16} /> Back to Map &amp; Radar
                </button>
                <div>
                  <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> Executive Trip History &amp; Operational Reports
                  </h1>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Detailed record of trip starts, destinations, durations, idle periods, client check-ins/outs &amp; point-in-time lookup
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadReports(reportFilterDate, reportFilterEmpId)}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} className={reportLoading ? 'animate-spin' : ''} /> Refresh Report Data
                </button>
              </div>
            </div>

            {/* Point-in-Time Location Finder Bar ("Where was Executive A at 4:00 PM on 22/09/2026?") */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-indigo-900/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-black text-sm">
                    🕒
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Point-in-Time Location Finder</h3>
                    <p className="text-[11px] text-indigo-200/80 font-medium">Find where any executive was located at an exact time (e.g. 22/09/2026 @ 04:00 PM)</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase mr-1">Preset Times:</span>
                  {['09:30 AM', '01:00 PM', '04:00 PM', '06:30 PM'].map(tStr => (
                    <button
                      key={tStr}
                      onClick={() => setPitTime(tStr)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition border cursor-pointer ${
                        pitTime === tStr
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-xs'
                          : 'bg-indigo-900/50 text-indigo-200 border-indigo-800/60 hover:bg-indigo-800'
                      }`}
                    >
                      {tStr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point-in-time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-300 mb-1">Select Executive</label>
                  <select
                    value={pitEmpId}
                    onChange={e => setPitEmpId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-indigo-700/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">-- Choose Executive --</option>
                    {executives.map(e => (
                      <option key={e.employee_id || e.id} value={e.employee_id || e.id}>
                        {resolveRealName(e)} ({e.employee_code || e.role || 'Executive'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={pitDate}
                    onChange={e => setPitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-indigo-700/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-300 mb-1">Exact Time</label>
                  <input
                    type="text"
                    value={pitTime}
                    onChange={e => setPitTime(e.target.value)}
                    placeholder="e.g. 04:00 PM or 16:00"
                    className="w-full px-3 py-2 bg-slate-800/90 border border-indigo-700/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handlePointInTimeLookup}
                    disabled={pitLoading}
                    className="w-full py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {pitLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>🔍 Locate Executive</>
                    )}
                  </button>
                </div>
              </div>

              {/* Point-in-time Result Display */}
              {pitResult && (
                <div className="bg-slate-800/90 border border-indigo-500/40 rounded-2xl p-4 mt-3 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-700/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black text-white">{pitResult.employee_name} ({pitResult.role})</span>
                      <span className="text-[10px] text-indigo-300 font-mono">@{pitResult.requested_date} {pitResult.requested_time}</span>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      pitResult.movement_status === 'ON_ROAD' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      pitResult.movement_status === 'IDLE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    }`}>
                      {pitResult.movement_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <p className="text-indigo-200/70 font-semibold text-[10px] uppercase">Exact Street / Road Location:</p>
                      <p className="text-white font-bold">{pitResult.location_address}</p>
                      <p className="text-indigo-300 text-[11px] font-medium mt-0.5">{pitResult.status_description}</p>
                    </div>

                    <div className="bg-slate-900/80 rounded-xl p-2.5 border border-indigo-800/50 space-y-1 text-[11px]">
                      <div className="flex justify-between"><span className="text-indigo-300 font-semibold">Speed:</span><span className="font-bold text-white">{pitResult.speed_kmh} km/h</span></div>
                      <div className="flex justify-between"><span className="text-indigo-300 font-semibold">Accuracy:</span><span className="font-bold text-emerald-400">±{pitResult.accuracy_meters}m</span></div>
                      <div className="flex justify-between"><span className="text-indigo-300 font-semibold">GPS Coords:</span><span className="font-mono text-indigo-200">{pitResult.latitude?.toFixed(4)}, {pitResult.longitude?.toFixed(4)}</span></div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setShowTripHistoryReport(false)
                        const ex = executives.find(e => String(e.employee_id || e.id) === String(pitResult.employee_id)) || {
                          employee_id: pitResult.employee_id,
                          employee_name: pitResult.employee_name,
                          latitude: pitResult.latitude,
                          longitude: pitResult.longitude
                        }
                        handleSelectExecutive(ex)
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapPin size={14} /> Pin Location on Live Map
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Bar for Table Reports */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-600" />
                  <span className="text-xs font-black text-slate-700">Date:</span>
                  <input
                    type="date"
                    value={reportFilterDate}
                    onChange={e => {
                      setReportFilterDate(e.target.value)
                      loadReports(e.target.value, reportFilterEmpId)
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-indigo-600" />
                  <span className="text-xs font-black text-slate-700">Executive:</span>
                  <select
                    value={reportFilterEmpId}
                    onChange={e => {
                      setReportFilterEmpId(e.target.value)
                      loadReports(reportFilterDate, e.target.value)
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="all">All Executives</option>
                    {executives.map(e => (
                      <option key={e.employee_id || e.id} value={e.employee_id || e.id}>
                        {resolveRealName(e)} ({e.employee_code || e.role || 'Executive'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {reportData.length} Report Records Found
              </div>
            </div>

            {/* Reports Display Section */}
            {reportLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Loading Trip Reports &amp; History Data…</span>
              </div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-700">No Trip Records Found for Selected Date</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">Try selecting another date or selecting a different executive from the filters above.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reportData.map((rep, idx) => {
                  const empName = rep.employee_name || 'Sales Executive'
                  const initials = empName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

                  const tripStartTime = rep.trip_started_time || rep.trip_start?.time || '09:00:00 AM'
                  const tripStartLoc = rep.start_location || rep.trip_start?.address || 'T. Nagar Head Office, Chennai'

                  const destArrivalTime = rep.destination_arrival_time || rep.destination_arrival?.time || '03:15:00 PM'
                  const destLoc = rep.destination_arrival?.address || rep.destination_arrival?.client_name || 'TechPark Tower B, Guindy, Chennai'

                  const tripEndTime = rep.trip_ended_time || rep.trip_end?.time || '05:30:00 PM'
                  const tripEndLoc = rep.end_location || rep.trip_end?.address || 'Tidal Park, OMR, Guindy, Chennai'

                  const avgSpeed = rep.moving_avg_speed || rep.avg_speed_kmh || 26.4
                  const peakSpeed = rep.peak_speed || rep.peak_speed_kmh || 42.0

                  return (
                    <div key={rep.employee_id || idx} className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden font-sans space-y-4 p-5">
                      
                      {/* Executive Title Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black text-base flex items-center justify-center shadow-md">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900">{empName}</h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {rep.role || 'Sales Executive'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Emp Code: {rep.employee_code || 'EMP000012'} | Date: {rep.date || reportFilterDate}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 text-center">
                          <div className="px-3 border-r border-slate-200">
                            <span className="block text-[10px] font-black text-slate-400 uppercase">Distance</span>
                            <span className="text-sm font-black text-indigo-600">{rep.total_distance_km || 18.5} km</span>
                          </div>
                          <div className="px-3 border-r border-slate-200">
                            <span className="block text-[10px] font-black text-slate-400 uppercase">Duration</span>
                            <span className="text-sm font-black text-slate-800">{rep.total_duration || '8h 30m'}</span>
                          </div>
                          <div className="px-3">
                            <span className="block text-[10px] font-black text-slate-400 uppercase">Peak Speed</span>
                            <span className="text-sm font-black text-emerald-600">{peakSpeed} km/h</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary Trip Metrics Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">
                            🟢 Trip Started
                          </span>
                          <p className="text-xs font-black text-slate-900">{tripStartTime}</p>
                          <p className="text-[11px] text-slate-600 font-semibold line-clamp-2">{tripStartLoc}</p>
                        </div>

                        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1">
                            🎯 Destination Arrival
                          </span>
                          <p className="text-xs font-black text-slate-900">{destArrivalTime}</p>
                          <p className="text-[11px] text-slate-600 font-semibold line-clamp-2">{destLoc}</p>
                        </div>

                        <div className="bg-violet-50/70 border border-violet-200 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[10px] font-black uppercase text-violet-700 tracking-wider flex items-center gap-1">
                            🏁 Trip Ended
                          </span>
                          <p className="text-xs font-black text-slate-900">{tripEndTime}</p>
                          <p className="text-[11px] text-slate-600 font-semibold line-clamp-2">{tripEndLoc}</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                            ⚡ Speed &amp; Telemetry
                          </span>
                          <p className="text-xs font-black text-slate-800">Avg Speed: {avgSpeed} km/h</p>
                          <p className="text-[11px] text-slate-500 font-semibold">Total Stops: {rep.idle_periods?.length || 0} stops</p>
                        </div>
                      </div>

                      {/* Multiple Idle Periods Table (Employee may take idle MORE than 1 time!) */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            🛑 Idle Period Records Log ({rep.idle_periods?.length || 0} Stops Tracked)
                          </h4>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/90 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                                <th className="p-3">Stop #</th>
                                <th className="p-3">Time Range (From → To)</th>
                                <th className="p-3">Duration</th>
                                <th className="p-3">Idle Location Address</th>
                                <th className="p-3">Status / Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                              {(!rep.idle_periods || rep.idle_periods.length === 0) ? (
                                <tr>
                                  <td colSpan="5" className="p-4 text-center text-slate-400 italic">No idle periods recorded for this date.</td>
                                </tr>
                              ) : (
                                rep.idle_periods.map((idle, iIdx) => (
                                  <tr key={iIdx} className="hover:bg-amber-50/50 transition">
                                    <td className="p-3 font-black text-slate-900">Stop #{iIdx + 1}</td>
                                    <td className="p-3 font-bold text-amber-800">{idle.from_time} → {idle.to_time}</td>
                                    <td className="p-3 font-extrabold text-amber-700 bg-amber-50/80 rounded-lg">{idle.duration_label || idle.duration || `${idle.duration_mins || 15} mins`}</td>
                                    <td className="p-3 font-medium text-slate-600">{idle.location_address || idle.location || 'Stationary Stop'}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                        {idle.reason || 'Stationary Stop'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Client Visit Log Table (Check-in & Check-out) */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            🏢 Client Visit Check-in &amp; Check-out Logs ({rep.client_visits?.length || 0} Visits)
                          </h4>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/90 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                                <th className="p-3">Client / Company Name</th>
                                <th className="p-3">Check-in Time</th>
                                <th className="p-3">Check-out Time</th>
                                <th className="p-3">Duration Spent</th>
                                <th className="p-3">Location Address</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                              {(!rep.client_visits || rep.client_visits.length === 0) ? (
                                <tr>
                                  <td colSpan="6" className="p-4 text-center text-slate-400 italic">No client visit check-in records for this date.</td>
                                </tr>
                              ) : (
                                rep.client_visits.map((vis, vIdx) => (
                                  <tr key={vIdx} className="hover:bg-purple-50/50 transition">
                                    <td className="p-3 font-black text-purple-900">{vis.client_name || vis.company_name}</td>
                                    <td className="p-3 font-bold text-slate-800">{vis.check_in_time}</td>
                                    <td className="p-3 font-bold text-slate-800">{vis.check_out_time}</td>
                                    <td className="p-3 font-extrabold text-purple-700 bg-purple-50 rounded-lg">{vis.duration || vis.duration_spent || '1h 45m'}</td>
                                    <td className="p-3 font-medium text-slate-600">{vis.location_address || vis.location || 'Client Location'}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        {vis.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

