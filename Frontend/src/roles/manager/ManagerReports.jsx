import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Award,
  Calendar,
  TrendingUp,
  DollarSign,
  UserCheck,
  FileText,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  RefreshCw,
  Send,
  PhoneCall,
  UserPlus,
  Star,
  Target,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table,
  Eye,
  X,
} from 'lucide-react'
import { hrmsAPI, reportAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

const DEFAULT_EOD_REPORTS = []

export default function ManagerReports() {
  const { showToast } = useToast()

  // View Mode State: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('cards')

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [selectedSE, setSelectedSE] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedDate, setSelectedDate] = useState('05/08/2026')

  // Expanded report cards state & modal state
  const [expandedCards, setExpandedCards] = useState({})
  const [ackComments, setAckComments] = useState({})
  const [selectedReportModal, setSelectedReportModal] = useState(null)

  // EOD Reports List
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [executives, setExecutives] = useState([])

  const resolveEmployeeCode = (seName, seEmail, rawCode) => {
    if (rawCode && String(rawCode).trim() !== '' && String(rawCode).trim() !== 'EMP000012') {
      return String(rawCode).trim();
    }

    const n = (seName || '').toLowerCase().trim()
    const e = (seEmail || '').toLowerCase().trim()

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

    return 'EMP000012'
  }

  const formatDateToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  }

  const findMatchingLog = (empCode, seEmail, seName, reportDate, logList) => {
    if (!Array.isArray(logList)) return null;
    const normalizedReportDate = formatDateToYYYYMMDD(reportDate);
    if (!normalizedReportDate) return null;

    return logList.find((log) => {
      const logDate = formatDateToYYYYMMDD(log.attendance_date || log.date || log.created_at);
      if (logDate !== normalizedReportDate) return false;

      const logEmpCode = String(log.employee_id || log.employee_code || log.emp_code || '').toLowerCase().trim();
      const logEmail = String(log.email || '').toLowerCase().trim();
      const logName = String(log.name || log.employee_name || '').toLowerCase().trim();

      const targetEmpCode = String(empCode || '').toLowerCase().trim();
      const targetEmail = String(seEmail || '').toLowerCase().trim();
      const targetName = String(seName || '').toLowerCase().trim();

      if (targetEmpCode && logEmpCode && targetEmpCode === logEmpCode) return true;
      if (targetEmail && logEmail && targetEmail === logEmail) return true;
      if (targetName && logName && (logName.includes(targetName) || targetName.includes(logName))) return true;

      // First name fallback match
      const targetFirstName = targetName.split(/\s+/)[0];
      const logFirstName = logName.split(/\s+/)[0];
      if (targetFirstName && logFirstName && targetFirstName.length > 2 && targetFirstName === logFirstName) return true;

      return false;
    });
  }

  const formatTelemetryTime = (raw) => {
    if (!raw || raw === '—' || raw === 'None' || raw === 'N/A') return null
    try {
      const s = String(raw).trim()
      if (s.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) return s
      if (s.includes('T') || s.includes('-')) {
        const d = new Date(s)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      }
      const match = s.match(/(\d{1,2}):(\d{2})/)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = match[2]
        const ampm = h >= 12 ? 'PM' : 'AM'
        h = h % 12 || 12
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`
      }
      return s
    } catch {
      return raw
    }
  }

  const calculateDuration = (inTimeStr, outTimeStr) => {
    try {
      if (!inTimeStr) return '—'
      const now = new Date()
      const parseTime = (timeStr) => {
        if (!timeStr || timeStr === '—' || timeStr === 'In Progress (Active)') return null
        const d = new Date(timeStr)
        if (!isNaN(d.getTime())) return d
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
        if (match) {
          let h = parseInt(match[1], 10)
          const m = parseInt(match[2], 10)
          const ampm = match[3] ? match[3].toUpperCase() : ''
          if (ampm === 'PM' && h < 12) h += 12
          if (ampm === 'AM' && h === 12) h = 0
          const res = new Date(now)
          res.setHours(h, m, 0, 0)
          return res
        }
        return null
      }

      const tIn = parseTime(inTimeStr)
      const tOut = parseTime(outTimeStr) || now
      if (!tIn) return '—'

      const diffMs = tOut - tIn
      if (diffMs < 0) return '—'
      const diffMins = Math.floor(diffMs / 60000)
      const h = Math.floor(diffMins / 60)
      const m = diffMins % 60
      return `${h}h ${m}m`
    } catch {
      return '—'
    }
  }

  const getTelemetryForReport = (r, attLogs = []) => {
    let loginTime = r.loginTime && r.loginTime !== '—' && r.loginTime !== 'None' && r.loginTime !== 'N/A' ? formatTelemetryTime(r.loginTime) : null
    let loginLocation = r.loginLocation && r.loginLocation !== '—' && r.loginLocation !== 'None' && r.loginLocation !== 'N/A' ? r.loginLocation : null
    let logoutTime = r.logoutTime && r.logoutTime !== '—' && r.logoutTime !== 'None' && r.logoutTime !== 'N/A' ? formatTelemetryTime(r.logoutTime) : null
    let logoutLocation = r.logoutLocation && r.logoutLocation !== '—' && r.logoutLocation !== 'None' && r.logoutLocation !== 'N/A' ? r.logoutLocation : null
    let dayLogs = []

    if (Array.isArray(attLogs) && attLogs.length > 0) {
      const repDateStr = formatDateToYYYYMMDD(r.date)
      const targetEmpCode = String(r.employee_code || r.employee_id || '').toLowerCase().trim()
      const targetEmail = String(r.executiveEmail || r.email || '').toLowerCase().trim()
      const targetName = String(r.executive || r.name || '').toLowerCase().trim()

      dayLogs = attLogs.filter((log) => {
        const logDate = formatDateToYYYYMMDD(log.attendance_date || log.date || log.created_at || log.check_in_time)
        if (repDateStr && logDate && logDate !== repDateStr) return false

        const logEmpCode = String(log.employee_id || log.employee_code || log.emp_code || log.user_id || '').toLowerCase().trim()
        const logEmail = String(log.email || log.user_email || '').toLowerCase().trim()
        const logName = String(log.name || log.employee_name || '').toLowerCase().trim()

        if (targetEmpCode && logEmpCode && targetEmpCode === logEmpCode) return true
        if (targetEmail && logEmail && targetEmail === logEmail) return true
        if (targetName && logName && (logName.includes(targetName) || targetName.includes(logName))) return true

        const targetFirstName = targetName.split(/\s+/)[0]
        const logFirstName = logName.split(/\s+/)[0]
        if (targetFirstName && logFirstName && targetFirstName.length > 2 && targetFirstName === logFirstName) return true

        return false
      })

      if (dayLogs.length > 0) {
        // 1. FIRST LOGIN ON THAT DAY
        const firstLog = dayLogs[0]
        const rawIn = firstLog.check_in_time || firstLog.punch_in_time || firstLog.clockIn || firstLog.loginTime || firstLog.login_time
        if (!loginTime && rawIn) {
          loginTime = formatTelemetryTime(rawIn)
        }
        if (!loginLocation) {
          loginLocation = firstLog.check_in_address || firstLog.loginLocation || firstLog.location || firstLog.work_location || firstLog.gpsLocation
        }

        // 2. LAST LOGOUT ON THAT DAY
        const logsWithOut = dayLogs.filter(l => l.check_out_time || l.punch_out_time || l.clockOut || (l.logoutTime && l.logoutTime !== '—' && l.logoutTime !== 'N/A'))
        if (logsWithOut.length > 0) {
          const lastLog = logsWithOut[logsWithOut.length - 1]
          const rawOut = lastLog.check_out_time || lastLog.punch_out_time || lastLog.clockOut || lastLog.logoutTime
          if (rawOut) {
            logoutTime = formatTelemetryTime(rawOut)
          }
          logoutLocation = lastLog.check_out_address || lastLog.logoutLocation || lastLog.location || lastLog.gpsLocation || loginLocation
        } else {
          if (!logoutTime) {
            logoutTime = 'In Progress (Active)'
            logoutLocation = loginLocation || 'Active at Field Site'
          }
        }
      }
    }

    if (!loginTime) loginTime = '09:00 AM'
    if (!loginLocation) loginLocation = 'Office / Field Check-In'
    if (!logoutTime) logoutTime = '06:00 PM'
    if (!logoutLocation) logoutLocation = loginLocation || 'Office / Field Site'

    return { loginTime, loginLocation, logoutTime, logoutLocation, dayLogs }
  }

  const normalizeReport = (r, idx = 0, attLogs = []) => {
    if (!r) return null
    const seName = r.executive || r.executiveName || r.assigned_to || r.name || 'Abi hastro'
    const seEmail = r.executiveEmail || r.assigned_to_email || r.email || 'abi@gmail.com'
    const empCode = resolveEmployeeCode(seName, seEmail, r.employee_code || r.employee_id)
    const repDate = r.date || '05/08/2026'

    const telemetry = getTelemetryForReport({ ...r, executive: seName, executiveEmail: seEmail, employee_code: empCode, date: repDate }, attLogs)

    return {
      id: r.id || `eod_${1001 + idx}`,
      executive: seName,
      executiveEmail: seEmail,
      employee_code: empCode,
      designation: r.designation || 'Sales Executive',
      date: repDate,
      submittedAt: r.submittedAt || r.time || '05:30 PM',
      loginTime: telemetry.loginTime,
      logoutTime: telemetry.logoutTime,
      loginLocation: telemetry.loginLocation,
      logoutLocation: telemetry.logoutLocation,
      sessions: telemetry.dayLogs || [],
      status: r.status || 'Submitted',
      callsMade: parseInt(r.callsMade || r.calls || 0),
      visitsCompleted: parseInt(r.visitsCompleted || r.visits || 0),
      leadsGenerated: parseInt(r.leadsGenerated || r.leads || 0),
      clientsInterested: parseInt(r.clientsInterested || r.interested || 0),
      followupsScheduled: parseInt(r.followupsScheduled || r.followups || 0),
      dealsClosed: parseInt(r.dealsClosed || r.deals || 0),
      highlights: r.highlights || r.keyHighlights || 'Completed daily field client meetings.',
      blockers: (() => {
        const b = r.blockers || r.issues || 'None'
        if (typeof b === 'string' && (b.startsWith('Executive:') || b.startsWith('Email:') || b.startsWith('EMP:') || b.startsWith('Manager:'))) {
          return 'None'
        }
        return b
      })(),
      nextDayPlan: r.nextDayPlan || r.tomorrowPlan || 'Follow up with interested client accounts.',
      photo: r.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seName}`,
      phone: r.phone || '+91 98765 43210',
      managerAck: !!r.managerAck,
      managerComment: r.managerComment || '',
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    let combined = []
    let attLogs = []

    try {
      const apiRes = await reportAPI.getEODReports()
      const apiData = Array.isArray(apiRes) ? apiRes : (apiRes?.data || [])
      if (Array.isArray(apiData)) {
        combined = [...combined, ...apiData]
      }
    } catch (e) {
      console.error("Error fetching EOD reports from API", e)
    }

    try {
      const attRes = await attendanceAPI.getLogs()
      attLogs = Array.isArray(attRes) ? attRes : (attRes?.data || [])
      setAttendanceLogs(attLogs)
    } catch (e) {
      console.error("Error fetching attendance logs", e)
    }

    const keys = ['tc_eod_reports', 'tc_se_daily_reports', 'tc_daily_work_reports']
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

    const normalizedLocal = combined.map((r, idx) => normalizeReport(r, idx, attLogs)).filter(Boolean)

    const map = new Map()
    DEFAULT_EOD_REPORTS.forEach((d) => map.set(`${d.executive}_${d.date}`, d))
    normalizedLocal.forEach((l) => map.set(`${l.executive}_${l.date}`, l))

    const finalArr = Array.from(map.values())
    setReports(finalArr)
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('user') || localStorage.getItem('tc_user')
      return u ? JSON.parse(u) : {}
    } catch (e) { return {} }
  }

  const getAssignedExecutivesList = (rawEmployees) => {
    const mgrUser = getStoredUser()
    const mgrEmail = (mgrUser.email || '').toLowerCase().trim()
    const mgrId = (mgrUser.id || mgrUser.employee_id || mgrUser.user_id || '').toLowerCase().trim()
    const mgrName = (mgrUser.name || mgrUser.full_name || '').toLowerCase().trim()

    let assignedSet = new Set()
    try {
      const assignMap = JSON.parse(localStorage.getItem('tc_manager_assignments') || '{}')
      Object.keys(assignMap).forEach((key) => {
        const kLower = key.toLowerCase().trim()
        if (kLower === mgrEmail || kLower === mgrId || (mgrName && kLower.includes(mgrName.split(' ')[0]))) {
          const list = assignMap[key] || []
          list.forEach((item) => assignedSet.add(String(item).toLowerCase().trim()))
        }
      })
    } catch (e) {}

    const assignedOnly = rawEmployees.filter((e) => {
      const rId = String(e.reporting_manager_id || e.manager_id || '').toLowerCase().trim()
      const rEmail = String(e.reporting_manager_email || e.manager_email || '').toLowerCase().trim()
      const rName = String(e.reporting_manager_name || e.manager_name || '').toLowerCase().trim()
      const eId = String(e.id || e.employee_id || '').toLowerCase().trim()
      const eEmail = String(e.email || '').toLowerCase().trim()
      const eCode = String(e.employee_code || e.emp_code || '').toLowerCase().trim()

      const isReportingManagerMatch =
        (rEmail && mgrEmail && (rEmail === mgrEmail || rEmail.includes(mgrEmail))) ||
        (rId && mgrId && (rId === mgrId || rId.includes(mgrId))) ||
        (rName && mgrName && (rName.includes(mgrName.split(' ')[0]) || mgrName.includes(rName.split(' ')[0])))

      const isAssignmentMapMatch = assignedSet.has(eId) || assignedSet.has(eEmail) || assignedSet.has(eCode)

      return isReportingManagerMatch || isAssignmentMapMatch
    })

    return assignedOnly
  }

  useEffect(() => {
    hrmsAPI.getEmployees().then((res) => {
      const raw = Array.isArray(res) ? res : res?.data || []
      if (raw && raw.length > 0) {
        const execsOnly = getAssignedExecutivesList(raw)
        if (execsOnly.length > 0) {
          setExecutives(
            execsOnly.map((e, idx) => ({
              id: e.id || e.employee_id || `se_${idx}`,
              name: e.name || e.full_name || 'Sales Executive',
              email: e.email || '',
              employee_code: e.employee_code || e.employee_id || e.emp_code || 'EMP000012',
            }))
          )
          return
        }
      }
      fallbackLoadExecs()
    }).catch(() => fallbackLoadExecs())
  }, [])

  const fallbackLoadExecs = () => {
    try {
      const savedUsersStr = localStorage.getItem('tc_app_users')
      if (savedUsersStr) {
        const parsed = JSON.parse(savedUsersStr)
        const execsOnly = getAssignedExecutivesList(parsed)
        if (execsOnly.length > 0) {
          setExecutives(
            execsOnly.map((u, idx) => ({
              id: u.id || `se_${idx}`,
              name: u.name || u.full_name || 'Sales Executive',
              email: u.email || '',
              employee_code: u.employee_code || u.employee_id || u.emp_code || 'EMP000012',
            }))
          )
          return
        }
      }
    } catch (e) {}
    setExecutives([])
  }

  const toggleExpandCard = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAcknowledgeReport = (id) => {
    const comment = ackComments[id] || 'Report acknowledged by Sales Manager.'
    const updated = reports.map((r) => (r.id === id ? { ...r, managerAck: true, managerComment: comment } : r))
    setReports(updated)

    try {
      localStorage.setItem('tc_eod_reports', JSON.stringify(updated))
    } catch (e) {}

    showToast(`Acknowledged Daily Work Report for ${id}!`, 'success')
  }

  // Filtering Calculation
  const filteredReports = reports.filter((r) => {
    if (!r) return false

    // Check if the report belongs to one of the manager's assigned executives
    const matchesExecutiveScope = executives.some((exec) => {
      const execEmail = (exec.email || '').toLowerCase().trim()
      const execCode = (exec.employee_code || '').toLowerCase().trim()
      const execName = (exec.name || '').toLowerCase().trim()

      const repEmail = (r.executiveEmail || r.executive_email || '').toLowerCase().trim()
      const repCode = (r.employee_code || r.employee_id || '').toLowerCase().trim()
      const repName = (r.executive || r.executive_name || '').toLowerCase().trim()

      return (
        (execEmail && repEmail === execEmail) ||
        (execCode && repCode === execCode) ||
        (execName && repName.includes(execName))
      )
    })

    if (executives.length > 0 && !matchesExecutiveScope) {
      return false
    }

    const q = search.toLowerCase().trim()
    const seName = (r.executive || '').toLowerCase()
    const seCode = (r.employee_code || '').toLowerCase()
    const high = (r.highlights || '').toLowerCase()
    const block = (r.blockers || '').toLowerCase()
    const plan = (r.nextDayPlan || '').toLowerCase()

    const matchesSearch = !q || seName.includes(q) || seCode.includes(q) || high.includes(q) || block.includes(q) || plan.includes(q)
    const matchesStatus = selectedStatus === 'All' || String(r.status).toLowerCase() === selectedStatus.toLowerCase()

    let matchesSE = selectedSE === 'All'
    if (!matchesSE) {
      const target = selectedSE.toLowerCase()
      matchesSE = seName.includes(target) || (r.executiveEmail || '').toLowerCase().includes(target) || seCode.includes(target)
    }

    return matchesSearch && matchesStatus && matchesSE
  })

  // Aggregated Totals
  const totalCalls = filteredReports.reduce((acc, curr) => acc + curr.callsMade, 0)
  const totalVisits = filteredReports.reduce((acc, curr) => acc + curr.visitsCompleted, 0)
  const totalNewLeads = filteredReports.reduce((acc, curr) => acc + curr.leadsGenerated, 0)
  const totalInterested = filteredReports.reduce((acc, curr) => acc + curr.clientsInterested, 0)
  const totalFollowups = filteredReports.reduce((acc, curr) => acc + curr.followupsScheduled, 0)
  const totalDeals = filteredReports.reduce((acc, curr) => acc + curr.dealsClosed, 0)

  return (
    <div className="space-y-5 text-slate-900 font-sans pb-12">
      {/* ── HEADER ── Clean, Flat, Simplified ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" /> Team EOD Attendance Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review daily check-in/check-out logs, GPS telemetry, active session durations, and status reports for your sales executives.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="mgr-card flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Attendance Logs
        </button>
      </div>

      {/* ── FILTERS & SEARCH CONTROL BAR ── Clean Flat Inline Strip ──────────── */}
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100 flex-shrink-0">
        {/* Sales Executive Filter */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Executive:</span>
          <select
            value={selectedSE}
            onChange={(e) => {
              setSelectedSE(e.target.value)
              setSearch('')
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 focus:outline-none cursor-pointer font-bold rounded-lg px-2.5 py-1.5 text-xs transition"
          >
            <option value="All">All Executives</option>
            {executives.map((ex) => (
              <option key={ex.id || ex.email} value={ex.name}>
                {ex.name} ({ex.employee_code || 'EMP'})
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter picker */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer text-slate-700"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search executive name, employee code..."
            className="w-full h-8 bg-slate-100 rounded-lg pl-8 pr-3 text-xs text-slate-900 focus:outline-none font-semibold placeholder-slate-400"
          />
        </div>

        {/* Reset */}
        {(selectedSE !== 'All' || search) && (
          <button
            onClick={() => {
              setSelectedSE('All')
              setSearch('')
            }}
            className="mgr-card text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer transition shrink-0"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* ── ATTENDANCE DATA TABLE ── Clean, Flat, Borderless Feel ─────────────────── */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
        <table className="w-full text-left text-xs text-slate-750 min-w-[1000px]">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px] tracking-wider">
            <tr>
              <th className="px-5 py-4">Sales Executive</th>
              <th className="px-5 py-4">Employee Code</th>
              <th className="px-5 py-4">Report Date</th>
              <th className="px-5 py-4">First Check-In (Log-in)</th>
              <th className="px-5 py-4">Last Check-Out (Log-out)</th>
              <th className="px-5 py-4">Active Duration</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-16 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                  Loading team attendance reports...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-16 text-slate-400 font-bold text-xs">
                  No attendance records found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const liveTel = getTelemetryForReport(report, attendanceLogs)
                const duration = calculateDuration(liveTel.loginTime, liveTel.logoutTime)

                return (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/60 transition"
                  >
                    <td className="px-5 py-4 font-black text-slate-900 text-sm">
                      {report.executive}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-500 text-xs">
                      {report.employee_code || 'EMP0012'}
                    </td>
                    <td className="px-5 py-4 text-slate-800">
                      {report.date}
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <div className="font-bold text-slate-800">{liveTel.loginTime}</div>
                      <div className="text-[10px] text-slate-400 truncate" title={liveTel.loginLocation}>
                        {liveTel.loginLocation}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <div className="font-bold text-slate-800">{liveTel.logoutTime}</div>
                      <div className="text-[10px] text-slate-400 truncate" title={liveTel.logoutLocation}>
                        {liveTel.logoutLocation}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-700">
                      {duration}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          report.managerAck
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : 'bg-teal-50 text-teal-950 border border-teal-200'
                        }`}
                      >
                        {report.managerAck ? 'Acknowledged' : 'Submitted'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedReportModal(report)}
                        className="mgr-card px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] cursor-pointer transition flex items-center gap-1 ml-auto inline-flex"
                      >
                        <Eye size={12} /> View Telemetry
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── ATTENDANCE SESSIONS DETAILS MODAL ───────────────────────────────── */}
      {selectedReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedReportModal.employee_code || 'EMP0012'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{selectedReportModal.executive}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-600" /> GPS Attendance Log ({selectedReportModal.date})
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-650 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Attendance Sessions List */}
            <div className="space-y-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Logged check-in / check-out sessions</span>
              
              {(() => {
                const liveTel = getTelemetryForReport(selectedReportModal, attendanceLogs)
                const sessions = liveTel.dayLogs || []

                if (sessions.length > 0) {
                  return (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {sessions.map((sess, idx) => {
                        const sIn = sess.check_in_time || sess.punch_in_time || sess.clockIn || sess.loginTime || sess.login_time
                        const sOut = sess.check_out_time || sess.punch_out_time || sess.clockOut || sess.logoutTime || sess.logout_time
                        const inFmt = formatTelemetryTime(sIn)
                        const outFmt = formatTelemetryTime(sOut) || (sIn ? 'In Progress (Active)' : '—')
                        const locIn = sess.check_in_address || sess.loginLocation || sess.location || 'Office / Field Site'
                        const locOut = sess.check_out_address || sess.logoutLocation || sess.location || (sIn ? 'Active / Field Site' : '—')
                        const dur = calculateDuration(sIn, sOut)
                        
                        return (
                          <div
                            key={sess.id || idx}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row justify-between md:items-center gap-2 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-700 flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold shrink-0">🟢 In:</span>
                                <div>
                                  <span className="font-bold text-slate-900">{inFmt}</span>
                                  <p className="text-[10px] text-slate-450 italic mt-0.5" title={locIn}>{locIn}</p>
                                </div>
                              </div>
                              <div className="font-semibold text-slate-750 flex items-start gap-1.5 pt-1">
                                <span className="text-rose-600 font-bold shrink-0">🔴 Out:</span>
                                <div>
                                  <span className="font-bold text-slate-900">{outFmt}</span>
                                  <p className="text-[10px] text-slate-450 italic mt-0.5" title={locOut}>{locOut}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg shrink-0 text-center font-mono text-[10px] h-fit">
                              ⏱️ {dur}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                return (
                  <div className="text-slate-400 font-semibold italic text-center py-6 bg-slate-50 border border-slate-200 rounded-xl">
                    No attendance sessions logged for this day.
                  </div>
                )
              })()}
            </div>

            {/* Acknowledge feedback segment */}
            <div className="border-t border-slate-100 pt-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Manager Review</span>
                {selectedReportModal.managerAck && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ✓ Acknowledged
                  </span>
                )}
              </div>

              {selectedReportModal.managerAck && selectedReportModal.managerComment && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 italic">
                  "{selectedReportModal.managerComment}"
                </div>
              )}

              {!selectedReportModal.managerAck && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={ackComments[selectedReportModal.id] || ''}
                    onChange={(e) => setAckComments({ ...ackComments, [selectedReportModal.id]: e.target.value })}
                    placeholder="Enter feedback or acknowledgement comments..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-medium"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        handleAcknowledgeReport(selectedReportModal.id)
                        setSelectedReportModal(null)
                      }}
                      className="mgr-card px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      Acknowledge Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
