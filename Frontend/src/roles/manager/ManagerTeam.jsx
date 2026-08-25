// Sales Manager Team & Reports Module
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
  XCircle,
} from 'lucide-react'
import { hrmsAPI, reportAPI, attendanceAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'

const DEFAULT_EOD_REPORTS = []

export default function ManagerTeam() {
  const { showToast } = useToast()

  // View Mode State: 'table' (default) or 'cards'
  const [viewMode, setViewMode] = useState('table')

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [selectedSE, setSelectedSE] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedDateFilter, setSelectedDateFilter] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom Date'
  const [customDateInput, setCustomDateInput] = useState('')

  // Expanded report cards state & modal state
  const [expandedCards, setExpandedCards] = useState({})
  const [ackComments, setAckComments] = useState({})
  const [selectedReportModal, setSelectedReportModal] = useState(null)

  // EOD Reports List & Executives
  const [reports, setReports] = useState([])
  const [executives, setExecutives] = useState([])
  const [loading, setLoading] = useState(true)

  // Team Leave & Permission Requests State
  const [teamLeaveRequests, setTeamLeaveRequests] = useState([])
  const [activeTab, setActiveTab] = useState(null) // 'attendance' | 'permissions' | null
  const [attendanceLogs, setAttendanceLogs] = useState([])

  // Filter leave requests to only include assigned executives and exclude manager/admin/ceo requests
  const filteredLeaveRequests = React.useMemo(() => {
    return teamLeaveRequests.filter((req) => {
      if (!req) return false
      const reqRole = String(req.role || "").toLowerCase();
      // Exclude manager, admin, ceo requests
      if (reqRole.includes("manager") || reqRole.includes("admin") || reqRole.includes("ceo")) {
        return false;
      }

      const reqEmail = String(req.executive_email || req.email || "").toLowerCase().trim();
      const reqCode = String(req.employee_code || "").toLowerCase().trim();
      const reqName = String(req.executive_name || req.employee_name || "").toLowerCase().trim();

      // Check if matches assigned team
      return executives.some((ex) => {
        const exEmail = String(ex.email || "").toLowerCase().trim();
        const exCode = String(ex.employee_code || "").toLowerCase().trim();
        const exName = String(ex.name || "").toLowerCase().trim();
        return (
          (exEmail && reqEmail === exEmail) ||
          (exCode && reqCode === exCode) ||
          (exName && (reqName.includes(exName) || exName.includes(reqName)))
        );
      });
    });
  }, [teamLeaveRequests, executives])

  useEffect(() => {
    attendanceAPI.getLeaveRequests()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        if (Array.isArray(raw)) setTeamLeaveRequests(raw)
      })
      .catch(() => null)
  }, [])

  const handleUpdateLeaveStatus = async (reqId, newStatus) => {
    const comment = ackComments[reqId] || `Leave request ${newStatus.toLowerCase()} by Sales Manager.`

    try {
      await attendanceAPI.updateLeaveStatus(reqId, newStatus, comment)
      setTeamLeaveRequests((prev) => prev.map((r) => (r.id === reqId || r.leave_id === reqId ? { ...r, status: newStatus, manager_comment: comment } : r)))
      showToast(`Leave request ${newStatus.toLowerCase()} successfully!`, newStatus === "Approved" ? "success" : "info")
    } catch (err) {
      showToast(`Failed to update leave status: ${err?.message || 'Server Error'}`, "error")
    }
  }

  const getStoredUser = () => {
    try {
      const u = localStorage.getItem('user') || localStorage.getItem('tc_user')
      return u ? JSON.parse(u) : {}
    } catch (e) { return {} }
  }

  // Helper to filter ONLY assigned executives under current manager
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
    } catch (err) { }

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

  const getTelemetryForReport = (r, attLogs = []) => {
    let loginTime = r.loginTime && r.loginTime !== '—' && r.loginTime !== 'None' && r.loginTime !== 'N/A' ? formatTelemetryTime(r.loginTime) : null
    let loginLocation = r.loginLocation && r.loginLocation !== '—' && r.loginLocation !== 'None' && r.loginLocation !== 'N/A' ? r.loginLocation : null
    let logoutTime = r.logoutTime && r.logoutTime !== '—' && r.logoutTime !== 'None' && r.logoutTime !== 'N/A' ? formatTelemetryTime(r.logoutTime) : null
    let logoutLocation = r.logoutLocation && r.logoutLocation !== '—' && r.logoutLocation !== 'None' && r.logoutLocation !== 'N/A' ? r.logoutLocation : null

    if (Array.isArray(attLogs) && attLogs.length > 0) {
      const repDateStr = formatDateToYYYYMMDD(r.date)
      const targetEmpCode = String(r.employee_code || r.employee_id || '').toLowerCase().trim()
      const targetEmail = String(r.executiveEmail || r.email || '').toLowerCase().trim()
      const targetName = String(r.executive || r.name || '').toLowerCase().trim()

      const dayLogs = attLogs.filter((log) => {
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

    return { loginTime, loginLocation, logoutTime, logoutLocation }
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
      seRemarks: r.seRemarks || r.se_remarks || r.remarks || r.executiveRemarks || 'Completed all daily field client activities.',
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
      if (Array.isArray(apiData)) combined = [...combined, ...apiData]
    } catch (e) { console.error("Error fetching EOD reports", e) }

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
      } catch (e) { }
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

  const toggleExpandCard = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAcknowledgeReport = async (id) => {
    const comment = ackComments[id] || 'Report acknowledged by Sales Manager.'
    const updated = reports.map((r) => (r.id === id ? { ...r, managerAck: true, managerComment: comment, status: 'Acknowledged' } : r))
    setReports(updated)

    try {
      await reportAPI.acknowledgeEODReport(id, { comment })
      localStorage.setItem('tc_eod_reports', JSON.stringify(updated))
      showToast(`Acknowledged Daily Work Report for ${id}!`, 'success')
    } catch (e) {
      showToast(`Error acknowledging report: ${e.message}`, 'error')
    }
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

    let matchesDate = true
    const reportDateStr = (r.date || r.submittedAt || '').trim()
    const today = new Date()
    const todayISO = today.toISOString().split('T')[0]
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    if (selectedDateFilter === 'Today') {
      matchesDate = reportDateStr.includes(todayISO) || reportDateStr === 'Today' || reportDateStr.includes(today.toLocaleDateString('en-GB'))
    } else if (selectedDateFilter === 'Yesterday') {
      matchesDate = reportDateStr.includes(yesterdayISO) || reportDateStr === 'Yesterday' || reportDateStr.includes(yesterday.toLocaleDateString('en-GB'))
    } else if (selectedDateFilter === 'This Week') {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      try {
        const rDateObj = new Date(reportDateStr)
        matchesDate = !isNaN(rDateObj.getTime()) && rDateObj >= sevenDaysAgo
      } catch { matchesDate = true }
    } else if (selectedDateFilter === 'This Month') {
      const curMonth = today.toISOString().slice(0, 7)
      matchesDate = reportDateStr.includes(curMonth) || reportDateStr.includes('August')
    } else if (selectedDateFilter === 'Custom Date' && customDateInput) {
      matchesDate = reportDateStr.includes(customDateInput)
    }

    return matchesSearch && matchesStatus && matchesSE && matchesDate
  })

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* ── TWO COMPACT KPI CARDS: ATTENDANCE & PERMISSIONS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* CARD 1: Attendance */}
        <div
          onClick={() => setActiveTab('attendance')}
          className="p-4 rounded-2xl border bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              EOD Attendance
            </p>
            <h3 className="text-xl font-black text-slate-900">{filteredReports.length} Reports</h3>
            <p className="text-[10px] font-semibold text-slate-400">
              Click to view attendance & work logs
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* CARD 2: Permissions */}
        <div
          onClick={() => setActiveTab('permissions')}
          className="p-4 rounded-2xl border bg-white text-slate-800 border-slate-200 hover:border-amber-500 hover:bg-amber-50/20 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98]"
        >
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Leave & Permissions
            </p>
            <h3 className="text-xl font-black text-slate-900">
              {filteredLeaveRequests.filter(r => r.status === 'Pending').length} Pending
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">
              Click to view team leave requests
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── ATTENDANCE DETAILS MODAL POPUP ───────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl max-w-6xl w-full p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" /> Team EOD Attendance Reports
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  View check-in/out times, EOD summaries, and submission history.
                </p>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Header controls (Cards/Table view selector) */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#ca8a04]" /> EOD Daily Work Reports
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'cards' ? 'bg-[#ca8a04] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid size={14} /> Cards View
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'table' ? 'bg-[#ca8a04] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Table size={14} /> Table View
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-1.5 text-xs font-bold text-slate-700">
                  <span className="text-slate-500">Sales Executive:</span>
                  <select
                    value={selectedSE}
                    onChange={(e) => setSelectedSE(e.target.value)}
                    className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-black text-xs"
                  >
                    <option value="All">All Executives (Combined Sum)</option>
                    {executives.map((ex) => (
                      <option key={ex.id || ex.email} value={ex.name}>
                        {ex.name} ({ex.employee_code || 'EMP'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['All', 'Submitted', 'Acknowledged'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        selectedStatus === status
                          ? 'bg-[#ca8a04] text-white border-[#ca8a04] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Employee Code, Executive Name, Remarks..."
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#ca8a04] placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 bg-amber-50/60 p-0.5 rounded-xl border border-amber-300">
                    <span className="text-[10px] font-black text-amber-955 px-2 uppercase">Date Filter:</span>
                    {['All', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom Date'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedDateFilter(tab)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                          selectedDateFilter === tab
                            ? 'bg-[#ca8a04] text-white shadow-2xs'
                            : 'text-amber-955 hover:bg-amber-100'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {selectedDateFilter === 'Custom Date' && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5">
                      <span className="text-amber-900 font-extrabold text-[11px]">Select Date:</span>
                      <input
                        type="date"
                        value={customDateInput}
                        onChange={(e) => setCustomDateInput(e.target.value)}
                        className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold text-xs"
                      />
                    </div>
                  )}
                </div>

                {(selectedSE !== 'All' || selectedStatus !== 'All' || selectedDateFilter !== 'All' || search) && (
                  <button
                    onClick={() => {
                      setSelectedSE('All')
                      setSelectedStatus('All')
                      setSelectedDateFilter('All')
                      setSearch('')
                      setCustomDateInput('')
                    }}
                    className="text-xs font-extrabold text-rose-700 hover:underline cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            </div>

            {/* List/Table View Rendering */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                  <div className="col-span-full py-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#ca8a04] mb-3" />
                    <span className="text-sm font-black text-slate-700">Fetching team EOD daily work reports...</span>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-500 font-bold text-sm bg-white border border-slate-200 rounded-3xl">
                    No EOD daily work reports match your selected criteria.
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const isExpanded = !!expandedCards[report.id]
                    return (
                      <div
                        key={report.id}
                        className={`bg-white border rounded-3xl p-5 space-y-4 transition hover:shadow-md ${
                          isExpanded ? 'border-amber-500/80 shadow-md ring-1 ring-amber-500/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <span className="bg-amber-100 text-amber-955 border border-amber-300 px-1.5 py-0.5 rounded font-mono font-black text-[9px] uppercase tracking-wider">
                              {report.employee_code || 'EMP-112'}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm mt-1">{report.executive}</h4>
                            <p className="text-[10px] font-semibold text-slate-400">{report.designation || 'Sales Executive'}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              report.managerAck
                                ? 'bg-emerald-100 text-emerald-955 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {report.managerAck ? 'Acknowledged' : 'Submitted'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-[9px] font-bold text-slate-400 block">Calls</span>
                            <span className="font-black text-slate-800 text-sm">{report.callsMade}</span>
                          </div>
                          <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200">
                            <span className="text-[9px] font-bold text-emerald-80 block">Visits</span>
                            <span className="font-black text-emerald-955 text-sm">{report.visitsCompleted}</span>
                          </div>
                          <div className="bg-indigo-50/60 p-2 rounded-xl border border-indigo-200">
                            <span className="text-[9px] font-bold text-indigo-800 block">Leads</span>
                            <span className="font-black text-indigo-950 text-sm">{report.leadsGenerated}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-2xl border border-slate-200 text-[10px] font-semibold text-slate-700">
                          <p className="flex items-center gap-1.5 truncate">
                            <span className="text-emerald-700 font-bold shrink-0">In:</span> {report.loginLocation}
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <span className="text-rose-700 font-bold shrink-0">Out:</span> {report.logoutLocation}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleExpandCard(report.id)}
                          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 transition flex items-center justify-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Collapse Report <ChevronUp size={12} />
                            </>
                          ) : (
                            <>
                              Expand Full EOD Report <ChevronDown size={12} />
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="space-y-4 pt-3 border-t border-slate-100 text-xs animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                                <span className="text-[9px] font-bold text-amber-955 block">Interested</span>
                                <span className="font-black text-sm">{report.clientsInterested}</span>
                              </div>
                              <div className="bg-sky-50 p-2 rounded-xl border border-sky-200">
                                <span className="text-[9px] font-bold text-sky-800 block">Follow-ups</span>
                                <span className="font-black text-sm">{report.followupsScheduled}</span>
                              </div>
                              <div className="bg-yellow-555 text-white p-2 rounded-xl shadow-xs">
                                <span className="text-[9px] font-bold text-amber-100 block">Won</span>
                                <span className="font-black text-sm">{report.dealsClosed}</span>
                              </div>
                            </div>

                            <div className="space-y-1 bg-sky-50/50 p-3 rounded-2xl border border-sky-200 text-xs">
                              <span className="text-[10px] font-black text-sky-800 uppercase">Remarks / Notes</span>
                              <p className="font-medium text-slate-700 italic">"{report.seRemarks}"</p>
                            </div>

                            <div className="space-y-2">
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Highlights</span>
                                <p className="text-slate-800 font-semibold leading-relaxed mt-0.5">{report.highlights}</p>
                              </div>
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                                <span className="text-[9px] font-extrabold uppercase text-rose-900 block">Blockers</span>
                                <p className="text-rose-955 font-semibold leading-relaxed mt-0.5">{report.blockers}</p>
                              </div>
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <span className="text-[9px] font-extrabold uppercase text-amber-900 block">Tomorrow Plan</span>
                                <p className="text-amber-955 font-semibold leading-relaxed mt-0.5">{report.nextDayPlan}</p>
                              </div>
                            </div>

                            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                              <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                                <span>Manager Comments & Ack</span>
                                {report.managerAck && <span className="text-emerald-400">✓ Acknowledged</span>}
                              </div>
                              {report.managerAck && report.managerComment && (
                                <p className="text-[11px] text-amber-200 italic font-semibold">"{report.managerComment}"</p>
                              )}
                              {!report.managerAck && (
                                <div className="space-y-2.5">
                                  <input
                                    type="text"
                                    value={ackComments[report.id] || ''}
                                    onChange={(e) => setAckComments({ ...ackComments, [report.id]: e.target.value })}
                                    placeholder="Enter comments..."
                                    className="w-full bg-slate-850 border border-slate-750 rounded-xl p-2.5 text-[11px] text-white focus:outline-none focus:border-amber-400 font-semibold"
                                  />
                                  <button
                                    onClick={() => handleAcknowledgeReport(report.id)}
                                    className="w-full py-2 bg-[#ca8a04] hover:bg-[#a16207] text-white font-extrabold text-xs rounded-xl shadow-xs transition"
                                  >
                                    Acknowledge Report
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5">Emp Id</th>
                        <th className="px-5 py-3.5">Emp Name</th>
                        <th className="px-5 py-3.5">Attendance</th>
                        <th className="px-5 py-3.5 text-right">View Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="text-center py-12 text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                            Loading team EOD daily work reports...
                          </td>
                        </tr>
                      ) : filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-12 text-slate-400 font-semibold">
                            No EOD daily work reports match your selected criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map((report) => (
                          <tr
                            key={report.id}
                            onClick={() => setSelectedReportModal(report)}
                            className="hover:bg-amber-50/40 transition cursor-pointer"
                          >
                            <td className="px-5 py-3 font-mono font-bold text-slate-800">{report.date}</td>
                            <td className="px-5 py-3 font-mono font-black text-amber-955">
                              <span className="bg-amber-100 text-amber-955 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                                [{report.employee_code || 'EMP000012'}]
                              </span>
                            </td>
                            <td className="px-5 py-3 font-extrabold text-slate-900">{report.executive}</td>
                            <td className="px-5 py-3 text-[11px] font-bold text-slate-700">
                              <div>🟢 {report.loginTime}</div>
                              <div className="text-slate-500">🔴 {report.logoutTime}</div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedReportModal(report)
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition flex items-center gap-1.5 ml-auto"
                              >
                                <Eye size={12} /> View Full Report
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PERMISSIONS DETAILS MODAL POPUP ──────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl max-w-6xl w-full p-6 space-y-4 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#ca8a04]" /> Team Leave & Permission Requests
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Approve or Reject Leave & Permission requests submitted by assigned Sales Executives.
                </p>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-100 pb-3">
                <button
                  onClick={() => {
                    attendanceAPI.getLeaveRequests().then((res) => {
                      const raw = Array.isArray(res) ? res : (res?.data || [])
                      if (Array.isArray(raw)) setTeamLeaveRequests(raw)
                    })
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-955 border border-amber-300 font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Refresh Requests
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold text-slate-800 min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-700">
                      <th className="px-4 py-3.5">Executive Name</th>
                      <th className="px-4 py-3.5">Request Type</th>
                      <th className="px-4 py-3.5">Date & Slot</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Current Status</th>
                      <th className="px-4 py-3.5 text-right">Approve / Reject Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredLeaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-10 text-slate-500 font-bold text-sm bg-slate-50/50">
                          No leave or permission requests currently pending for your team.
                        </td>
                      </tr>
                    ) : (
                      filteredLeaveRequests.map((req, idx) => (
                        <tr key={req.id || idx} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3.5 font-black text-slate-900 text-sm">
                            {req.executive_name || req.executive || "Sales Executive"}
                            <div className="text-[10px] text-slate-400 font-extrabold font-mono">[{req.employee_code || "EMP000012"}]</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black border ${
                              req.leave_type?.includes("Half")
                                ? "bg-amber-100 text-amber-955 border-amber-300"
                                : req.leave_type?.includes("Permission")
                                  ? "bg-sky-100 text-sky-955 border-sky-300"
                                  : "bg-emerald-100 text-emerald-955 border-emerald-300"
                            }`}>
                              {req.leave_type || "Leave Request"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            <div>📅 {req.start_date} {req.end_date && req.end_date !== req.start_date ? `to ${req.end_date}` : ""}</div>
                            <div className="text-[10px] text-slate-400 font-extrabold mt-0.5">({req.duration || "Full Day"})</div>
                          </td>
                          <td className="px-4 py-3.5 max-w-[240px]">
                            <p className="text-slate-600 font-medium leading-relaxed italic">"{req.reason || "No reason specified."}"</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              req.status === "Approved"
                                ? "bg-emerald-100 text-emerald-955 border-emerald-300"
                                : req.status === "Rejected"
                                  ? "bg-rose-100 text-rose-955 border-rose-300"
                                  : "bg-amber-100 text-amber-900 border-amber-300"
                            }`}>
                              {req.status === "Approved"
                                ? "✓ Approved"
                                : req.status === "Rejected"
                                  ? "✗ Rejected"
                                  : "⏳ Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-y-1">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateLeaveStatus(req.id || req.leave_id, "Approved")}
                                disabled={req.status === "Approved"}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-2xs transition cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 size={14} /> Approve
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(req.id || req.leave_id, "Rejected")}
                                disabled={req.status === "Rejected"}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs shadow-2xs transition cursor-pointer flex items-center gap-1"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL EOD DETAIL MODAL popup ── */}
      {selectedReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 lg:p-7 space-y-6 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black text-[#ca8a04] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    [{selectedReportModal.employee_code || 'EMP000012'}]
                  </span>
                  <span className="text-base font-black text-slate-900">{selectedReportModal.executive}</span>
                  <span className="text-xs text-slate-400 font-semibold">• {selectedReportModal.designation}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5 pt-1">
                  <FileText className="w-6 h-6 text-[#ca8a04]" /> EOD Daily Work Report ({selectedReportModal.date})
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Attendance & Telemetry Box in Modal */}
            {(() => {
              const liveTel = getTelemetryForReport(selectedReportModal, attendanceLogs)
              return (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Clock size={16} className="text-[#ca8a04]" /> Log-In / Log-Out GPS Telemetry
                    </span>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-955 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      GPS Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-black text-emerald-700">🟢 Log In: {liveTel.loginTime}</span>
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5 truncate" title={liveTel.loginLocation}>
                        <MapPin size={13} className="text-emerald-600 shrink-0" /> {liveTel.loginLocation}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-black text-rose-700">🔴 Log Out: {liveTel.logoutTime}</span>
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5 truncate" title={liveTel.logoutLocation}>
                        <MapPin size={13} className="text-rose-600 shrink-0" /> {liveTel.logoutLocation}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Numbers Badges (Airy 6-col Grid) */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">Activity Numbers</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Calls</span>
                  <p className="font-black text-slate-900 text-lg">{selectedReportModal.callsMade}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-805 uppercase">Visits</span>
                  <p className="font-black text-emerald-955 text-lg">{selectedReportModal.visitsCompleted}</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-805 uppercase">Leads</span>
                  <p className="font-black text-indigo-955 text-lg">{selectedReportModal.leadsGenerated}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-amber-900 uppercase">Interested</span>
                  <p className="font-black text-amber-955 text-lg">{selectedReportModal.clientsInterested}</p>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-sky-800 uppercase">Follow-ups</span>
                  <p className="font-black text-sky-955 text-lg">{selectedReportModal.followupsScheduled}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#ca8a04] text-white shadow-sm space-y-0.5">
                  <span className="text-[10px] font-bold text-amber-100 uppercase">Won Deals</span>
                  <p className="font-black text-lg">{selectedReportModal.dealsClosed}</p>
                </div>
              </div>
            </div>

            {/* SE REMARKS */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-1.5 text-xs">
              <span className="text-xs font-black uppercase text-sky-900 flex items-center gap-1.5">
                <MessageSquare size={15} className="text-sky-600" /> SE REMARKS / DAILY NOTES
              </span>
              <p className="text-sky-955 font-semibold italic bg-white p-3 rounded-xl border border-sky-100">
                "{selectedReportModal.seRemarks}"
              </p>
            </div>

            {/* Highlights, Blockers, Plan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Highlights</span>
                <p className="text-slate-800 font-semibold leading-relaxed">{selectedReportModal.highlights}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-rose-800 block">Blockers</span>
                <p className="text-rose-955 font-semibold leading-relaxed">{selectedReportModal.blockers}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-900 block">Tomorrow Plan</span>
                <p className="text-amber-955 font-semibold leading-relaxed">{selectedReportModal.nextDayPlan}</p>
              </div>
            </div>

            {/* Review feedback inside the details modal */}
            <div className="pt-3 border-t border-slate-100">
              {selectedReportModal.managerAck ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-xs font-black text-emerald-955">✓ Acknowledged with remarks:</span>
                  <span className="text-xs font-semibold text-emerald-850 italic">"{selectedReportModal.managerComment || 'No comment provided'}"</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
                  <input
                    type="text"
                    value={ackComments[selectedReportModal.id] || ''}
                    onChange={(e) => setAckComments({ ...ackComments, [selectedReportModal.id]: e.target.value })}
                    placeholder="Enter acknowledgment comments or notes..."
                    className="flex-1 sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-amber-400 font-semibold"
                  />
                  <button
                    onClick={() => {
                      handleAcknowledgeReport(selectedReportModal.id)
                      setSelectedReportModal(null)
                    }}
                    className="px-6 py-2.5 bg-[#ca8a04] hover:bg-[#a16207] text-white font-black text-xs rounded-xl shadow-md shadow-yellow-600/20 cursor-pointer transition flex items-center justify-center gap-2 shrink-0"
                  >
                    <CheckCircle size={15} /> Acknowledge EOD Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
