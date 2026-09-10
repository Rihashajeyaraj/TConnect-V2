import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  FileText,
  DollarSign,
  Flame,
  Zap,
  Snowflake,
  XCircle,
  Eye,
  RefreshCw,
  X,
  Navigation,
  FileCheck,
  User,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { visitAPI, hrmsAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { formatDate, parseDateInput } from '../../utils/dateUtils.js'

export default function ManagerVisits() {
  const { showToast } = useToast()

  // API State
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState([])
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [attendanceLoaded, setAttendanceLoaded] = useState(false)
  const [summary, setSummary] = useState({
    scheduled_today: 0,
    completed_today: 0,
    pending_visits: 0,
    missed_visits: 0,
    converted_customers: 0,
    followups: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
  })

  // Executive List State
  const [executives, setExecutives] = useState([])

  // Filter & Search State
  const [search, setSearch] = useState('')
  const [selectedSE, setSelectedSE] = useState('All')
  const [customSEInput, setCustomSEInput] = useState('')
  const [selectedVisitStatus, setSelectedVisitStatus] = useState('All')
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateFilterTab, setDateFilterTab] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'This Month' | 'Custom'

  const handleLinearDateFilter = (tab) => {
    setDateFilterTab(tab)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (tab === 'Today') {
      setFromDate(todayStr)
      setToDate(todayStr)
    } else if (tab === 'Yesterday') {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const yestStr = yest.toISOString().split('T')[0]
      setFromDate(yestStr)
      setToDate(yestStr)
    } else if (tab === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstDayStr = firstDay.toISOString().split('T')[0]
      setFromDate(firstDayStr)
      setToDate(todayStr)
    } else if (tab === 'All' || tab === 'Custom') {
      setFromDate('')
      setToDate('')
    }
    setPage(1)
  }

  // Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Full Audit Modal State
  const [selectedAuditModal, setSelectedAuditModal] = useState(null)

  // Load Sales Executives from HRMS API or localStorage
  useEffect(() => {
    hrmsAPI
      .getEmployees()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || []
        if (raw && raw.length > 0) {
          const execsOnly = raw.filter(
            (u) =>
              (u.role && u.role.toLowerCase().includes('exec')) ||
              (u.designation && u.designation.toLowerCase().includes('exec')) ||
              u.role === 'Sales Executive'
          )
          if (execsOnly.length > 0) {
            setExecutives(
              execsOnly.map((e, idx) => ({
                id: e.id || e.employee_id || `se_${idx}`,
                name: e.name || e.full_name || 'Sales Executive',
                email: e.email || '',
                employee_code: e.employee_code || e.employee_id || e.emp_code || `EMP${String(idx + 101).padStart(3, '0')}`,
              }))
            )
            return
          }
        }
        fallbackLoadExecutives()
      })
      .catch(() => fallbackLoadExecutives())
  }, [])

  useEffect(() => {
    attendanceAPI.getLogs()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        setAttendanceLogs(raw)
        setAttendanceLoaded(true)
      })
      .catch(() => {
        setAttendanceLoaded(true)
      })
  }, [])

  const fallbackLoadExecutives = () => {
    try {
      const savedUsersStr = localStorage.getItem('tc_app_users')
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr)
        const execsOnly = parsed.filter(
          (u) =>
            u.role?.toLowerCase().includes('exec') ||
            u.role?.toLowerCase().includes('sales') ||
            u.role === 'Sales Executive'
        )
        if (execsOnly.length > 0) {
          setExecutives(
            execsOnly.map((u, idx) => ({
              id: u.id || `se_${idx}`,
              name: u.name || u.full_name || 'Sales Executive',
              email: u.email || '',
              employee_code: u.employee_code || u.employee_id || u.emp_code || `EMP${String(idx + 101).padStart(3, '0')}`,
            }))
          )
          return
        }
      }
    } catch (e) {}

    setExecutives([
      { id: 'se_1', name: 'Abi hastro', email: 'abi@gmail.com', employee_code: 'EMP000012' },
      { id: 'se_2', name: 'Ananya Roy', email: 'ananya.roy@tconnect.com', employee_code: 'EMP-102' },
      { id: 'se_3', name: 'Karthik Raja', email: 'karthik.raja@tconnect.com', employee_code: 'EMP-103' },
      { id: 'se_4', name: 'Priya Sharma', email: 'priya.sharma@tconnect.com', employee_code: 'EMP-104' },
      { id: 'se_5', name: 'Ashwini E', email: 'ashwini@tconnect.com', employee_code: 'EMP-105' },
      { id: 'se_6', name: 'Rajesh Kumar', email: 'rajesh.k@tconnect.com', employee_code: 'EMP-106' },
    ])
  }

  const resolveEmployeeCode = (seName, seEmail, rawCode) => {
    const n = (seName || '').toLowerCase().trim()
    const e = (seEmail || '').toLowerCase().trim()

    // 1. Search in executives list
    const found = executives.find((ex) => {
      const exEmail = (ex.email || '').toLowerCase().trim()
      const exName = (ex.name || ex.full_name || '').toLowerCase().trim()
      const exUser = exEmail.includes('@') ? exEmail.split('@')[0] : exName.split(' ')[0]

      return (
        (exEmail && (e === exEmail || e.includes(exEmail))) ||
        (exName && (n.includes(exName) || exName.includes(n))) ||
        (exUser && exUser.length >= 2 && (e.includes(exUser) || n.includes(exUser)))
      )
    })

    if (found && (found.employee_code || found.employee_id || found.emp_code)) {
      return found.employee_code || found.employee_id || found.emp_code
    }

    // 2. Search in tc_app_users from localStorage
    try {
      const appUsers = JSON.parse(localStorage.getItem('tc_app_users') || '[]')
      const matchedUser = appUsers.find((u) => {
        const uMail = (u.email || '').toLowerCase()
        const uName = (u.name || u.full_name || '').toLowerCase()
        return (uMail && e === uMail) || (uName && n.includes(uName))
      })
      if (matchedUser && (matchedUser.employee_code || matchedUser.employee_id || matchedUser.emp_code)) {
        return matchedUser.employee_code || matchedUser.employee_id || matchedUser.emp_code
      }
    } catch (err) {}

    if (rawCode && rawCode !== 'EMP-101' && !rawCode.startsWith('EMP10')) {
      return rawCode
    }

    return 'EMP000012'
  }

  const isSEAbsentOnDate = (seEmailOrName, visitDate) => {
    if (!attendanceLoaded || !visitDate) return false
    
    const targetDateStr = formatDate(visitDate)
    const identifier = String(seEmailOrName || '').toLowerCase().trim()
    if (!identifier) return false

    // Filter logs for this executive on this particular day
    const execLogs = attendanceLogs.filter((log) => {
      const logEmpCode = String(log.employee_id || log.employee_code || log.emp_code || log.user_id || '').toLowerCase().trim()
      const logEmail = String(log.email || log.user_email || '').toLowerCase().trim()
      const logName = String(log.name || log.employee_name || '').toLowerCase().trim()
      
      const emailMatch = logEmail && (identifier === logEmail || logEmail.includes(identifier) || identifier.includes(logEmail))
      const nameMatch = logName && (identifier === logName || logName.includes(identifier) || identifier.includes(logName))

      if (!(emailMatch || nameMatch)) return false

      // Match the date
      const logDateStr = formatDate(log.attendance_date || log.date || log.created_at || log.check_in_time)
      return logDateStr === targetDateStr
    })

    if (execLogs.length === 0) {
      // Past or today date with no logs means absent
      const visitD = parseDateInput(visitDate)
      if (visitD) {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        if (visitD.getTime() > today.getTime()) {
          return false
        }
      }
      return true
    }

    const hasPresent = execLogs.some((l) => {
      const status = String(l.status || '').toLowerCase().trim()
      return status === 'present' || status === 'late' || status === 'half day' || status === 'half-day'
    })

    return !hasPresent
  }

  const normalizeVisit = (v, idx = 0) => {
    if (!v) return null
    const id = v.id || v.visit_id || `VST-${1001 + idx}`
    const seName = v.assigned_to || v.assignedTo || v.executive || v.executiveName || v.sales_executive_name || v.employee_name || 'Sales Executive'
    const seEmail = v.assigned_to_email || v.assignedToEmail || v.executiveEmail || v.email || ''
    const empCode = resolveEmployeeCode(seName, seEmail, v.employee_code || v.employee_id || v.emp_code)

    let rawSchedDate = v.visit_date || v.visitDate || v.scheduledDate || v.date || ''
    if (!rawSchedDate && v.created_at) {
      rawSchedDate = String(v.created_at).split('T')[0]
    }
    if (!rawSchedDate) {
      rawSchedDate = new Date().toISOString().split('T')[0]
    }

    const rawSchedTime = v.visit_time || v.visitTime || v.scheduledTime || v.time || '10:00 AM'
    const purposeStr = v.purpose || v.products_discussed || v.product || v.visit_purpose || 'Site Visit / Product Demo'
    const locationStr = v.gps_location || v.location || v.address || v.city || 'Chennai'

    return {
      id: id,
      visit_id: id,
      lead_id: v.lead_id || v.leadId || v.lead_code || v.leadNumber || `LD-${1001 + idx}`,
      customer_name: v.customer_name || v.customerName || v.customer || v.clientName || v.client || v.company || v.company_name || v.title || 'Prospect Client',
      company: v.company || v.company_name || v.customer_name || v.customerName || v.customer || v.client || 'Prospect Client',
      poc_name: v.poc_name || v.pocName || v.contact_person || v.contactPerson || v.person || v.contact || 'Point of Contact',
      poc_mobile: v.poc_mobile || v.pocPhone || v.phone || v.mobile || v.contact_phone || '+91 98765 43210',
      poc_email: v.poc_email || v.email || v.contact_email || 'client@enterprise.com',
      employee_code: empCode,
      assigned_to: seName,
      assigned_to_email: seEmail,
      visit_date: rawSchedDate,
      visit_time: rawSchedTime,
      scheduledDate: rawSchedDate,
      scheduledTime: rawSchedTime,
      purpose: purposeStr,
      visit_purpose: purposeStr,
      products_discussed: purposeStr,
      discussion_summary: v.discussion_summary || v.notes || v.remarks || purposeStr,
      gps_location: locationStr,
      location: locationStr,
      check_in_time: v.check_in_time || v.checkInTime || null,
      check_out_time: v.check_out_time || v.checkOutTime || null,
      duration: v.duration || v.meetingDuration || '',
      visit_status: v.visit_status || v.status || 'Scheduled',
      customer_requirements: v.customer_requirements || 'Requires enterprise solution.',
      competitor_info: v.competitor_info || '',
      estimated_order_value: v.estimated_order_value || v.value || '₹4,50,000',
      customer_feedback: v.customer_feedback || '',
      next_action: v.next_action || 'Follow up with client',
      lead_status: v.lead_status || 'Follow Up Required',
      lead_priority: v.lead_priority || v.priority || 'Hot',
      remarks: v.remarks || v.notes || v.remark || 'Site visit logged by sales executive.',
      created_at: v.created_at || null,
    }
  }

  const getLocalStorageVisits = () => {
    let combined = []
    const keys = ['tc_sales_visits', 'tc_sm_visits', 'tc_visits', 'tc_scheduled_visits']
    keys.forEach((k) => {
      try {
        const itemStr = localStorage.getItem(k)
        if (itemStr) {
          const parsed = JSON.parse(itemStr)
          if (Array.isArray(parsed) && parsed.length > 0) {
            combined = [...combined, ...parsed]
          }
        }
      } catch (e) {}
    })
    return combined.map((v, idx) => normalizeVisit(v, idx)).filter(Boolean)
  }

  // Fetch Field Visit Audit Data from backend API and LocalStorage
  const fetchTeamAuditData = async () => {
    if (!visits || visits.length === 0) {
      setLoading(true)
    }
    const timer = setTimeout(() => setLoading(false), 2500)
    try {
      const params = {}
      if (selectedSE !== 'All') params.sales_executive_id = selectedSE
      if (selectedVisitStatus !== 'All') params.visit_status = selectedVisitStatus
      if (selectedLeadStatus !== 'All') params.lead_status = selectedLeadStatus
      if (selectedPriority !== 'All') params.priority = selectedPriority
      if (search) params.search = search
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      params.page = page
      params.limit = limit

      let apiVisits = []
      try {
        const res = await visitAPI.getTeamAudit(params)
        const data = res?.data || res || {}
        if (data.visits && Array.isArray(data.visits) && data.visits.length > 0) {
          apiVisits = data.visits.map((v, idx) => normalizeVisit(v, idx))
        }
      } catch (err) {}

      const localVisits = getLocalStorageVisits()

      // Merge API and LocalStorage visits using Map
      const map = new Map()
      apiVisits.forEach((v) => map.set(v.id, v))
      localVisits.forEach((v) => {
        if (!map.has(v.id)) {
          map.set(v.id, v)
        }
      })

      const combined = Array.from(map.values())
      setVisits(combined)
      calculateLocalSummary(combined)
    } catch (err) {
      const localVisits = getLocalStorageVisits()
      setVisits(localVisits)
      calculateLocalSummary(localVisits)
    } finally {
      setLoading(false)
    }
  }

  const getYYYYMMDD = (dStr) => {
    if (!dStr) return ''
    let str = String(dStr).trim().split('T')[0].split(' ')[0]
    if (str.includes('/')) {
      const parts = str.split('/')
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        } else if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        }
      }
    }
    return str
  }

  const calculateLocalSummary = (visitArr) => {
    const todayStr = new Date().toISOString().split('T')[0]

    let scheduledToday = 0
    let completedToday = 0
    let pendingVisits = 0
    let missedVisits = 0
    let converted = 0
    let followups = 0
    let hot = 0
    let warm = 0
    let cold = 0

    visitArr.forEach((x) => {
      const vDate = getYYYYMMDD(x.visit_date || x.scheduledDate || x.date)
      const statusStr = String(x.visit_status || x.status || '').toLowerCase()
      const isCompleted = statusStr.includes('complete')
      const isMissedStatus = statusStr.includes('miss') || statusStr.includes('cancel')

      if (isCompleted) {
        completedToday++
      } else if ((vDate && vDate < todayStr) || isMissedStatus) {
        missedVisits++
      } else {
        // Scheduled today or future date, not completed -> Pending
        pendingVisits++
      }

      // Today's Scheduled Visits count ONLY visits whose date is TODAY
      if (vDate === todayStr || (!vDate && statusStr.includes('schedule'))) {
        scheduledToday++
      }

      if (String(x.lead_status || '').toLowerCase().includes('convert')) converted++
      if (String(x.lead_status || '').toLowerCase().includes('follow')) followups++
      if (String(x.lead_priority || x.priority || '').toLowerCase().includes('hot')) hot++
      if (String(x.lead_priority || x.priority || '').toLowerCase().includes('warm')) warm++
      if (String(x.lead_priority || x.priority || '').toLowerCase().includes('cold')) cold++
    })

    setSummary({
      scheduled_today: scheduledToday,
      completed_today: completedToday,
      pending_visits: pendingVisits,
      missed_visits: missedVisits,
      converted_customers: converted,
      followups: followups,
      hot_leads: hot,
      warm_leads: warm,
      cold_leads: cold,
    })
  }

  useEffect(() => {
    fetchTeamAuditData()
  }, [selectedSE, selectedVisitStatus, selectedLeadStatus, selectedPriority, fromDate, toDate, page, limit])

  // Filtered calculation
  const filteredVisits = visits.filter((v) => {
    if (!v) return false
    const q = search.toLowerCase().trim()
    const cName = (v.customer_name || v.company || v.title || '').toLowerCase()
    const poc = (v.poc_name || v.person || '').toLowerCase()
    const vId = (v.visit_id || v.id || '').toLowerCase()
    const lId = (v.lead_id || v.lead_code || '').toLowerCase()
    const seName = (v.assigned_to || v.executive || '').toLowerCase()
    const seEmail = (v.assigned_to_email || v.email || '').toLowerCase()
    const seCode = (v.employee_code || v.employee_id || '').toLowerCase()

    const matchesSearch =
      !q ||
      cName.includes(q) ||
      poc.includes(q) ||
      vId.includes(q) ||
      lId.includes(q) ||
      seName.includes(q) ||
      seEmail.includes(q) ||
      seCode.includes(q)

    const matchesVisitStatus = selectedVisitStatus === 'All' || String(v.visit_status || v.status || '').toLowerCase().includes(selectedVisitStatus.toLowerCase())
    const matchesLeadStatus = selectedLeadStatus === 'All' || String(v.lead_status || '').toLowerCase().includes(selectedLeadStatus.toLowerCase())
    const matchesPriority = selectedPriority === 'All' || String(v.lead_priority || v.priority || '').toLowerCase().includes(selectedPriority.toLowerCase())

    let matchesSE = selectedSE === 'All'
    if (selectedSE === 'Other') {
      if (!customSEInput.trim()) {
        matchesSE = true
      } else {
        const q = customSEInput.toLowerCase().trim()
        matchesSE = seName.includes(q) || seEmail.includes(q) || seCode.includes(q)
      }
    } else if (!matchesSE) {
      const targetVal = selectedSE.toLowerCase().trim()
      const targetUser = targetVal.includes('@') ? targetVal.split('@')[0] : targetVal
      const targetClean = targetUser.replace(/[^a-z0-9]/g, '')

      matchesSE =
        seEmail === targetVal ||
        seName === targetVal ||
        seCode === targetVal ||
        (targetClean.length >= 2 && (seEmail.includes(targetClean) || seName.includes(targetClean) || seCode.includes(targetClean)))

      if (!matchesSE) {
        const foundExec = executives.find(
          (ex) =>
            (ex.email && ex.email.toLowerCase() === targetVal) ||
            (ex.name && ex.name.toLowerCase() === targetVal) ||
            (ex.employee_code && ex.employee_code.toLowerCase() === targetVal)
        )
        if (foundExec) {
          const exEmail = (foundExec.email || '').toLowerCase()
          const exName = (foundExec.name || '').toLowerCase()
          const exCode = (foundExec.employee_code || '').toLowerCase()
          const exUser = exEmail.includes('@') ? exEmail.split('@')[0] : exName.split(' ')[0]

          matchesSE =
            (exEmail && (seEmail === exEmail || seEmail.includes(exEmail))) ||
            (exName && (seName.includes(exName) || exName.includes(seName))) ||
            (exCode && (seCode === exCode || seCode.includes(exCode))) ||
            (exUser && exUser.length >= 2 && (seEmail.includes(exUser) || seName.includes(exUser)))
        }
      }
    }

    return matchesSearch && matchesVisitStatus && matchesLeadStatus && matchesPriority && matchesSE
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredVisits.length / limit) || 1
  const paginatedVisits = filteredVisits.slice((page - 1) * limit, page * limit)

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Field Visit & Audit
          </h1>
        </div>

        <button
          onClick={fetchTeamAuditData}
          className="mgr-card flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Visit Audit
        </button>
      </div>

      {/* ── TOP FIELD VISIT SUMMARY CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Today's Scheduled Visits */}
        <div className="bg-gradient-to-b from-[#fffbeb] to-white border border-mgr-primary-300 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-primary-900">Today's Scheduled</span>
          <h2 className="text-2xl font-black text-slate-900">{summary.scheduled_today}</h2>
          <p className="text-[10px] text-slate-500 font-semibold">Scheduled Appointments</p>
        </div>

        {/* 2. Today's Completed Visits */}
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Completed Visits</span>
          <h2 className="text-2xl font-black text-emerald-950">{summary.completed_today}</h2>
          <p className="text-[10px] text-emerald-700 font-semibold">Form Submitted & Verified</p>
        </div>

        {/* 3. Pending Visits */}
        <div className="bg-mgr-primary-50 border border-mgr-primary-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-primary-900">Pending Visits</span>
          <h2 className="text-2xl font-black text-mgr-primary-950">{summary.pending_visits}</h2>
          <p className="text-[10px] text-mgr-primary-800 font-semibold">Checked-In / Live</p>
        </div>

        {/* 4. Missed Visits */}
        <div className="bg-slate-50 border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Missed Visits</span>
          <h2 className="text-2xl font-black text-slate-800">{summary.missed_visits}</h2>
          <p className="text-[10px] text-slate-500 font-semibold">Unattended Schedule</p>
        </div>

        {/* 5. Follow Ups Required */}
        <div className="bg-mgr-secondary-50 border border-mgr-secondary-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-mgr-secondary-800">Follow Ups Required</span>
          <h2 className="text-2xl font-black text-mgr-secondary-950">{summary.followups}</h2>
          <p className="text-[10px] text-mgr-secondary-700 font-semibold">Next Stage Action</p>
        </div>
      </div>

      {/* ── FILTERS & SEARCH CONTROL BAR ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sales Executive Filter (Left Side with 'Other' Manual Search Option) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shrink-0">
            <span className="text-slate-500">Sales Executive:</span>
            <select
              value={selectedSE}
              onChange={(e) => {
                setSelectedSE(e.target.value)
                if (e.target.value !== 'Other') setCustomSEInput('')
                setPage(1)
              }}
              className="mgr-card bg-transparent text-mgr-primary-950 focus:outline-none cursor-pointer font-black max-w-[240px] truncate"
            >
              <option value="All">All Executives (Team Audit)</option>
              {executives.map((ex) => (
                <option key={ex.email || ex.id} value={ex.email || ex.name}>
                  [{ex.employee_code || 'EMP-101'}] {ex.name || ex.full_name} ({ex.email})
                </option>
              ))}
              <option value="Other">✏️ Other (Manual Type & Search...)</option>
            </select>

            {selectedSE === 'Other' && (
              <input
                type="text"
                value={customSEInput}
                onChange={(e) => {
                  setCustomSEInput(e.target.value)
                  setPage(1)
                }}
                placeholder="Type SE Name, Email, Code..."
                className="bg-white border border-mgr-primary-400 rounded-lg px-2.5 py-1 text-xs font-bold text-mgr-primary-950 focus:outline-none focus:border-mgr-primary-600 w-[200px] shadow-2xs"
                autoFocus
              />
            )}
          </div>

          {/* Search Box (Right Side) */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search Customer, Company, Visit ID, Lead ID, SE Name, EMP Code..."
              className="w-full h-10 bg-slate-50 border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:border-mgr-primary-500 font-semibold"
            />
          </div>
        </div>

        {/* Linear Date Quick-Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Visit Status */}
          <div className="flex items-center gap-1.5 bg-slate-50 border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">Visit Status:</span>
            <select
              value={selectedVisitStatus}
              onChange={(e) => {
                setSelectedVisitStatus(e.target.value)
                setPage(1)
              }}
              className="mgr-card bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold"
            >
              <option value="All">All Visit Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending / In Progress</option>
              <option value="MISSED">Missed / Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-mgr-primary-50/70 p-1 rounded-xl border border-mgr-primary-300">
            <span className="text-[11px] font-black text-mgr-primary-950 px-2">Date Filter:</span>
            {['All', 'Today', 'Yesterday', 'This Month', 'Custom'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleLinearDateFilter(tab)}
                className={`mgr-card px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  dateFilterTab === tab
                    ? 'bg-mgr-primary-700 text-white shadow-2xs'
                    : 'text-mgr-primary-950 hover:bg-mgr-primary-100'
                }`}
              >
                {tab === 'All' ? 'All Time' : tab}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker Inputs (Only visible when Custom is selected) */}
          {dateFilterTab === 'Custom' && (
            <div className="flex items-center gap-2 bg-mgr-primary-50 border border-mgr-primary-300 rounded-xl px-3 py-1.5 font-bold">
              <span className="text-mgr-primary-900 font-extrabold">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mgr-card bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
              />
              <span className="text-mgr-primary-900 font-extrabold ml-1">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mgr-card bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
              />
            </div>
          )}

          {/* Reset Filters Button */}
          {(selectedSE !== 'All' || selectedVisitStatus !== 'All' || selectedLeadStatus !== 'All' || selectedPriority !== 'All' || search || fromDate || toDate) && (
            <button
              onClick={() => {
                setSelectedSE('All')
                setSelectedVisitStatus('All')
                setSelectedLeadStatus('All')
                setSelectedPriority('All')
                setSearch('')
                setFromDate('')
                setToDate('')
                setPage(1)
              }}
              className="mgr-card text-[11px] font-extrabold text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── FIELD VISIT AUDIT TABLE ─────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800 min-w-[1000px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700">
                <th className="px-5 py-4.5">Company Name</th>
                <th className="px-5 py-4.5">Sales Executive Name</th>
                <th className="px-5 py-4.5">Visit Date & Time</th>
                <th className="px-5 py-4.5">Visit Status</th>
                <th className="px-5 py-4.5">Discussion Summary</th>
                <th className="px-5 py-4.5">Lead Priority</th>
                <th className="px-5 py-4.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-mgr-primary-600 mb-3" />
                    <span className="text-sm font-bold">Loading Field Visit & Audit reports from Supabase...</span>
                  </td>
                </tr>
              ) : paginatedVisits.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400 font-bold text-sm">
                    No field visit audit records match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedVisits.map((visit, idx) => (
                  <tr key={visit.id || visit.visit_id || idx} className="hover:bg-mgr-primary-50/50 transition-colors">
                    {/* 1. Company Name */}
                    <td className="px-5 py-4.5 font-black text-slate-900 text-sm sm:text-base">
                      {visit.company || visit.customer_name || 'Enterprise Ltd'}
                    </td>

                    {/* 2. SE Name */}
                    <td className="px-5 py-4.5 font-black text-slate-900 text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <span>{visit.assigned_to || visit.assignedTo || visit.executive || 'Sales Executive'}</span>
                        {(String(visit.visit_status || visit.status || '').toLowerCase().includes('miss') || String(visit.visit_status || visit.status || '').toLowerCase().includes('cancel')) &&
                         isSEAbsentOnDate(visit.assigned_to_email || visit.assigned_to, visit.visit_date) && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                            Absent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Combined Visit Date & Time */}
                    <td className="px-5 py-4.5 font-mono text-xs sm:text-sm font-bold text-slate-800">
                      <span className="text-slate-900">{visit.visit_date || visit.date || '2026-08-05'}</span>
                      <span className="text-mgr-primary-800 font-black ml-1.5">• {visit.visit_time || visit.time || '10:30 AM'}</span>
                    </td>

                    {/* 4. Visit Status */}
                    <td className="px-5 py-4.5">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                          String(visit.visit_status || visit.status || '').toLowerCase().includes('complete')
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : String(visit.visit_status || visit.status || '').toLowerCase().includes('schedule')
                            ? 'bg-mgr-primary-100 text-mgr-primary-900 border border-mgr-primary-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {visit.visit_status || visit.status || 'SCHEDULED'}
                      </span>
                    </td>

                    {/* 5. Discussion Summary */}
                    <td className="px-5 py-4.5 max-w-[220px]">
                      <p className="text-xs sm:text-sm text-slate-700 font-semibold line-clamp-2 italic">
                        "{visit.discussion_summary || visit.purpose || 'Site visit completed.'}"
                      </p>
                    </td>

                    {/* 6. Lead Priority */}
                    <td className="px-5 py-4.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                          String(visit.lead_priority || visit.priority || '').toLowerCase().includes('hot')
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : String(visit.lead_priority || visit.priority || '').toLowerCase().includes('warm')
                            ? 'bg-mgr-primary-100 text-mgr-primary-900 border border-mgr-primary-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {String(visit.lead_priority || visit.priority || '').toLowerCase().includes('hot') ? '🔥 Hot' : String(visit.lead_priority || visit.priority || '').toLowerCase().includes('warm') ? '⚡ Warm' : '❄️ Cold'}
                      </span>
                    </td>

                    {/* 7. Action -> View Full Audit */}
                    <td className="px-5 py-4.5 text-right">
                      <button
                        onClick={() => setSelectedAuditModal(visit)}
                        className="mgr-card px-3.5 py-2 rounded-xl bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white font-black text-xs shadow-xs cursor-pointer transition flex items-center gap-1.5 ml-auto active:scale-95"
                      >
                        <Eye size={14} /> View Full Audit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ────────────────────────────────────────── */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <div>
            Showing <span className="text-slate-900 font-black">{paginatedVisits.length}</span> of <span className="text-slate-900 font-black">{filteredVisits.length}</span> Total Visits
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW FULL AUDIT MODAL & INTERACTIVE TIMELINE ────────────────────── */}
      {selectedAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-mgr-primary-800 bg-mgr-primary-50 px-2.5 py-0.5 rounded-full border border-mgr-primary-200">
                    {selectedAuditModal.visit_status || selectedAuditModal.status || 'COMPLETED'} Audit Log
                  </span>
                  <span className="text-[10px] font-mono font-black text-mgr-primary-900 bg-mgr-primary-100 px-2 py-0.5 rounded border border-mgr-primary-300">
                    #{selectedAuditModal.visit_id || selectedAuditModal.id}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-[#b45309]" /> {selectedAuditModal.customer_name || selectedAuditModal.company}
                </h3>
              </div>
              <button onClick={() => setSelectedAuditModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* SE & Customer Information */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-mgr-primary-50/50 border border-mgr-primary-200/80 space-y-1 relative">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Sales Executive Information</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] bg-mgr-primary-100 text-mgr-primary-950 border border-mgr-primary-300 px-1 py-0.2 rounded font-mono font-black">
                    [{selectedAuditModal.employee_code || 'EMP-101'}]
                  </span>
                  <p className="font-black text-mgr-primary-900 text-sm">{selectedAuditModal.assigned_to || selectedAuditModal.executive || 'Sales Executive'}</p>
                </div>
                <p className="text-slate-500 font-mono text-[11px]">{selectedAuditModal.assigned_to_email || 'executive@tconnect.com'}</p>
                {(String(selectedAuditModal.visit_status || '').toLowerCase().includes('miss') || String(selectedAuditModal.visit_status || '').toLowerCase().includes('cancel')) &&
                 isSEAbsentOnDate(selectedAuditModal.assigned_to_email || selectedAuditModal.assigned_to, selectedAuditModal.visit_date) && (
                  <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                    Absent on Visit Date
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-mgr-primary-50/50 border border-mgr-primary-200/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Customer POC Details</span>
                <p className="font-black text-slate-900 text-sm">{selectedAuditModal.poc_name || 'Point of Contact'}</p>
                <p className="text-slate-700 font-semibold">{selectedAuditModal.poc_mobile || '+91 98765 43210'}</p>
                <p className="text-emerald-700 font-black text-xs mt-1">Est. Order Value: {selectedAuditModal.estimated_order_value || '₹4,50,000'}</p>
              </div>
            </div>

            {/* Schedule, Check-in & GPS Location */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Scheduled Date & Time</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedAuditModal.visit_date || '2026-08-05'} ({selectedAuditModal.visit_time || '10:30 AM'})</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Check-In / Out Duration</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedAuditModal.check_in_time || '10:30 AM'} - {selectedAuditModal.check_out_time || '11:15 AM'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-mgr-primary-50 border border-mgr-primary-200">
                <span className="text-[10px] font-bold text-mgr-primary-800">GPS Location Telemetry</span>
                <p className="font-mono font-bold text-mgr-primary-950 mt-0.5 truncate">{selectedAuditModal.gps_location || 'Chennai - Anna Salai'}</p>
              </div>
            </div>

            {/* Discussion & Product Info */}
            <div className="p-3 rounded-2xl bg-mgr-primary-50/60 border border-mgr-primary-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-mgr-primary-900">Products Discussed & Customer Requirements</span>
              <p className="font-extrabold text-mgr-primary-950">{selectedAuditModal.products_discussed || 'TwiteConnect Field CRM Suite'}</p>
              <p className="text-slate-700 font-medium text-[11px] mt-1">{selectedAuditModal.customer_requirements || 'Requires multi-device licenses and daily automated EOD report workflows.'}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Discussion Summary & Remarks</span>
              <p className="font-medium text-slate-700 leading-relaxed italic">
                "{selectedAuditModal.discussion_summary || selectedAuditModal.remarks || 'Meeting completed with client decision makers.'}"
              </p>
            </div>

            {/* ── COMPLETE AUDIT TIMELINE (REQUIRED BUSINESS FLOW) ──────────── */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-mgr-primary-400">Complete Field Visit Audit Timeline</span>
              <div className="flex items-center justify-between text-[11px] font-bold relative">
                <div className="flex flex-col items-center space-y-1 text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">✓</div>
                  <span className="text-slate-300">Scheduled</span>
                </div>
                <div className="flex flex-col items-center space-y-1 text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">✓</div>
                  <span className="text-slate-300">Checked In</span>
                </div>
                <div className="flex flex-col items-center space-y-1 text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">✓</div>
                  <span className="text-slate-300">Meeting Completed</span>
                </div>
                <div className="flex flex-col items-center space-y-1 text-center">
                  <div className="w-6 h-6 rounded-full bg-mgr-primary-400 text-slate-950 flex items-center justify-center font-black text-xs">✓</div>
                  <span className="text-mgr-primary-300 font-extrabold">Form Submitted</span>
                </div>
                <div className="flex flex-col items-center space-y-1 text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">★</div>
                  <span className="text-emerald-400 font-extrabold">{selectedAuditModal.lead_status || 'Follow Up Created'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAuditModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-xs"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
