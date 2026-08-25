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

  const normalizeReport = (r, idx = 0, attLogs = []) => {
    if (!r) return null
    const seName = r.executive || r.executiveName || r.assigned_to || r.name || 'Abi hastro'
    const seEmail = r.executiveEmail || r.assigned_to_email || r.email || 'abi@gmail.com'
    const empCode = resolveEmployeeCode(seName, seEmail, r.employee_code || r.employee_id)

    const repDate = r.date || '05/08/2026'

    const loginTime = r.loginTime && r.loginTime !== '—' && r.loginTime !== 'None' ? r.loginTime : 'N/A';
    const logoutTime = r.logoutTime && r.logoutTime !== '—' && r.logoutTime !== 'None' ? r.logoutTime : 'N/A';
    const loginLocation = r.loginLocation && r.loginLocation !== '—' && r.loginLocation !== 'None' ? r.loginLocation : 'N/A';
    const logoutLocation = r.logoutLocation && r.logoutLocation !== '—' && r.logoutLocation !== 'None' ? r.logoutLocation : 'N/A';

    return {
      id: r.id || `eod_${1001 + idx}`,
      executive: seName,
      executiveEmail: seEmail,
      employee_code: empCode,
      designation: r.designation || 'Sales Executive',
      date: repDate,
      submittedAt: r.submittedAt || r.time || '05:30 PM',
      loginTime,
      logoutTime,
      loginLocation,
      logoutLocation,
      status: r.status || 'Submitted',
      callsMade: parseInt(r.callsMade || r.calls || 0),
      visitsCompleted: parseInt(r.visitsCompleted || r.visits || 0),
      leadsGenerated: parseInt(r.leadsGenerated || r.leads || 0),
      clientsInterested: parseInt(r.clientsInterested || r.interested || 0),
      followupsScheduled: parseInt(r.followupsScheduled || r.followups || 0),
      dealsClosed: parseInt(r.dealsClosed || r.deals || 0),
      highlights: r.highlights || r.keyHighlights || 'Completed daily field client meetings.',
      blockers: (() => {
        const b = r.blockers || r.issues || 'None';
        if (typeof b === 'string' && (b.startsWith('Executive:') || b.startsWith('Email:') || b.startsWith('EMP:') || b.startsWith('Manager:'))) {
          return 'None';
        }
        return b;
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
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-amber-300">
              SALES MANAGER PORTAL
            </span>
            <span className="text-slate-400 text-xs font-semibold">Real-Time Team Auditing</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mt-1">
            <Users className="w-7 h-7 text-[#b45309]" /> Team & EOD Daily Work Reports
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Review daily activity numbers, calls, site visits, new leads, key wins, blockers, and tomorrow's plan submitted by your Sales Executives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Card & Table View Toggle Options */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#b45309] shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} /> Cards View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#b45309] shadow-2xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table size={14} /> Table View
            </button>
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#b45309] font-extrabold text-xs border border-amber-300 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh EOD Reports
          </button>
        </div>
      </div>

      {/* ── TOP 6 EOD SUMMARY METRICS (MATCHES SE DAILY REPORT FIELDS) ─────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Calls Made */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase text-slate-600">Calls Made</span>
            <PhoneCall size={16} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">{totalCalls}</h2>
          <p className="text-[10px] text-slate-500 font-semibold">Total Client Calls</p>
        </div>

        {/* 2. Visits Completed */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase text-emerald-800">Visits Completed</span>
            <MapPin size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-emerald-950">{totalVisits}</h2>
          <p className="text-[10px] text-emerald-700 font-semibold">Site Demos & Meetings</p>
        </div>

        {/* 3. New Leads */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase text-indigo-800">New Leads</span>
            <UserPlus size={16} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-indigo-950">{totalNewLeads}</h2>
          <p className="text-[10px] text-indigo-700 font-semibold">Prospects Created</p>
        </div>

        {/* 4. Clients Interested */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase text-amber-900">Interested Clients</span>
            <Star size={16} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-amber-950">{totalInterested}</h2>
          <p className="text-[10px] text-amber-800 font-semibold">High Potential Prospects</p>
        </div>

        {/* 5. Follow-ups Scheduled */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase text-sky-800">Follow-ups</span>
            <Clock size={16} className="text-sky-600" />
          </div>
          <h2 className="text-2xl font-black text-sky-950">{totalFollowups}</h2>
          <p className="text-[10px] text-sky-700 font-semibold">Next Action Items</p>
        </div>

        {/* 6. Deals Closed (Won) */}
        <div className="bg-gradient-to-b from-[#b45309] to-amber-800 text-white p-3.5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center justify-between text-amber-200">
            <span className="text-[10px] font-black uppercase tracking-wider">Deals Closed (Won)</span>
            <Target size={16} />
          </div>
          <h2 className="text-2xl font-black">{totalDeals}</h2>
          <p className="text-[10px] text-amber-100 font-semibold">Deals Converted</p>
        </div>
      </div>

      {/* ── FILTERS & SEARCH CONTROL BAR ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Executive Name, Employee Code, Highlights, Blockers, Tomorrow Plan..."
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          {/* Sales Executive Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
            <span className="text-slate-500">Sales Executive:</span>
            <select
              value={selectedSE}
              onChange={(e) => setSelectedSE(e.target.value)}
              className="bg-transparent text-amber-950 focus:outline-none cursor-pointer font-black max-w-[220px] truncate"
            >
              <option value="All">All Executives (Team EOD)</option>
              {executives.map((ex) => (
                <option key={ex.id || ex.email} value={ex.name}>
                  [{ex.employee_code || 'EMP'}] {ex.name} ({ex.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-bold"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted EOD</option>
              <option value="Pending">Pending EOD</option>
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-slate-500">Report Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-semibold text-[11px]"
            />
          </div>

          {/* Reset Filters Button */}
          {(selectedSE !== 'All' || selectedStatus !== 'All' || search) && (
            <button
              onClick={() => {
                setSelectedSE('All')
                setSelectedStatus('All')
                setSearch('')
              }}
              className="text-[11px] font-extrabold text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── CONDITIONAL RENDERING: CARDS VIEW VS TABLE VIEW ──────────────────── */}
      {viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-semibold">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#b45309] mb-2" />
              Loading team EOD daily work reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-semibold">
              No EOD daily work reports match your selected search or filter criteria.
            </div>
          ) : (
            filteredReports.map((report) => {
              const isExpanded = expandedCards[report.id] !== false

              return (
                <div
                  key={report.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 transition hover:border-amber-300"
                >
                  {/* Sales Executive Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={report.photo}
                        alt={report.executive}
                        className="w-12 h-12 rounded-2xl object-cover border border-amber-300 bg-amber-50"
                        onError={(e) => {
                          e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Executive'
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            [{report.employee_code || 'EMP000012'}]
                          </span>
                          <h3 className="text-base font-black text-slate-900">{report.executive}</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {report.designation} · {report.executiveEmail} · {report.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Report Date</span>
                        <span className="text-xs font-mono font-black text-slate-800">{report.date} ({report.submittedAt})</span>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          report.status === 'Submitted'
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {report.status}
                      </span>

                      <button
                        onClick={() => toggleExpandCard(report.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* TODAY'S NUMBERS */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">TODAY'S NUMBERS</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                        <span className="text-[10px] font-extrabold text-slate-500 block uppercase">Calls Made</span>
                        <p className="text-xl font-black text-slate-900">{report.callsMade}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-0.5">
                        <span className="text-[10px] font-extrabold text-emerald-800 block uppercase">Visits Completed</span>
                        <p className="text-xl font-black text-emerald-950">{report.visitsCompleted}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-0.5">
                        <span className="text-[10px] font-extrabold text-indigo-800 block uppercase">New Leads</span>
                        <p className="text-xl font-black text-indigo-950">{report.leadsGenerated}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-0.5">
                        <span className="text-[10px] font-extrabold text-amber-900 block uppercase">Clients Interested</span>
                        <p className="text-xl font-black text-amber-950">{report.clientsInterested}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-0.5">
                        <span className="text-[10px] font-extrabold text-sky-800 block uppercase">Follow-ups</span>
                        <p className="text-xl font-black text-sky-950">{report.followupsScheduled}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-xs space-y-0.5">
                        <span className="text-[10px] font-black text-amber-100 block uppercase">Deals Closed</span>
                        <p className="text-xl font-black">{report.dealsClosed}</p>
                      </div>
                    </div>
                  </div>

                  {/* WORK DETAILS */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                        <span className="text-[10px] font-extrabold uppercase text-slate-500 block">KEY HIGHLIGHTS / WINS TODAY</span>
                        <p className="text-slate-800 font-medium leading-relaxed">{report.highlights}</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1 text-xs">
                        <span className="text-[10px] font-extrabold uppercase text-rose-800 block">BLOCKERS / ISSUES</span>
                        <p className="text-rose-950 font-medium leading-relaxed">{report.blockers}</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1 text-xs">
                        <span className="text-[10px] font-extrabold uppercase text-amber-900 block">TOMORROW'S PLAN</span>
                        <p className="text-amber-950 font-medium leading-relaxed">{report.nextDayPlan}</p>
                      </div>

                      {/* MANAGER ACKNOWLEDGEMENT */}
                      <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Sales Manager Review & Feedback</span>
                          {report.managerAck && (
                            <span className="text-[10px] font-extrabold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                              ✓ Report Acknowledged
                            </span>
                          )}
                        </div>

                        {report.managerAck && report.managerComment && (
                          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-xs text-amber-200 italic">
                            "{report.managerComment}"
                          </div>
                        )}

                        {!report.managerAck && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={ackComments[report.id] || ''}
                              onChange={(e) => setAckComments({ ...ackComments, [report.id]: e.target.value })}
                              placeholder="Enter encouragement, instructions, or feedback for executive..."
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 font-medium"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleAcknowledgeReport(report.id)}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                              >
                                <CheckCircle size={14} /> Acknowledge EOD Report
                              </button>
                            </div>
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
        /* TABLE VIEW (13 COLUMNS) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[1250px]">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3.5">Report Date</th>
                  <th className="px-3.5 py-3.5">SE Code</th>
                  <th className="px-3.5 py-3.5">Sales Executive Name</th>
                  <th className="px-3.5 py-3.5">Calls Made</th>
                  <th className="px-3.5 py-3.5">Visits Done</th>
                  <th className="px-3.5 py-3.5">New Leads</th>
                  <th className="px-3.5 py-3.5">Interested</th>
                  <th className="px-3.5 py-3.5">Follow-ups</th>
                  <th className="px-3.5 py-3.5">Deals Closed</th>
                  <th className="px-3.5 py-3.5">Attendance</th>
                  <th className="px-3.5 py-3.5">Key Highlights</th>
                  <th className="px-3.5 py-3.5">Status</th>
                  <th className="px-3.5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="13" className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#b45309] mb-2" />
                      Loading team EOD daily work reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="text-center py-12 text-slate-400 font-semibold">
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
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-800">{report.date}</td>
                      <td className="px-3.5 py-3 font-mono font-black text-amber-955">
                        <span className="bg-amber-100 text-amber-955 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                          [{report.employee_code || 'EMP000012'}]
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-extrabold text-slate-900">{report.executive}</td>
                      <td className="px-3.5 py-3 font-black text-slate-800">{report.callsMade}</td>
                      <td className="px-3.5 py-3 font-black text-emerald-700">{report.visitsCompleted}</td>
                      <td className="px-3.5 py-3 font-black text-indigo-700">{report.leadsGenerated}</td>
                      <td className="px-3.5 py-3 font-black text-amber-700">{report.clientsInterested}</td>
                      <td className="px-3.5 py-3 font-black text-sky-700">{report.followupsScheduled}</td>
                      <td className="px-3.5 py-3 font-black text-amber-900">{report.dealsClosed}</td>
                      <td className="px-3.5 py-3 text-[11px] font-bold text-slate-700">
                        <div>🟢 {report.loginTime || '—'}</div>
                        <div className="text-slate-500">🔴 {report.logoutTime || '—'}</div>
                      </td>
                      <td className="px-3.5 py-3 max-w-[200px]">
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">"{report.highlights}"</p>
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            report.managerAck
                              ? 'bg-emerald-100 text-emerald-955 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {report.managerAck ? 'Acknowledged' : 'Submitted'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedReportModal(report)
                          }}
                          className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] shadow-xs cursor-pointer transition flex items-center gap-1 ml-auto"
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

      {/* ── VIEW REPORT MODAL FOR TABLE VIEW ───────────────────────────────── */}
      {selectedReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    [{selectedReportModal.employee_code || 'EMP000012'}]
                  </span>
                  <span className="text-xs font-black text-slate-900">{selectedReportModal.executive}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#b45309]" /> EOD Daily Work Report ({selectedReportModal.date})
                </h3>
              </div>
              <button onClick={() => setSelectedReportModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* Attendance & Telemetry Box in Modal */}
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
                  <span className="text-xs font-black text-emerald-700">🟢 Log In: {selectedReportModal.loginTime || '—'}</span>
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={13} className="text-emerald-600 shrink-0" /> {selectedReportModal.loginLocation || '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-xs font-black text-rose-700">🔴 Log Out: {selectedReportModal.logoutTime || '—'}</span>
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={13} className="text-rose-600 shrink-0" /> {selectedReportModal.logoutLocation || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Numbers Badges */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400">Calls Made</span>
                <p className="font-black text-slate-900 text-base">{selectedReportModal.callsMade}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800">Visits Done</span>
                <p className="font-black text-emerald-950 text-base">{selectedReportModal.visitsCompleted}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-800">New Leads</span>
                <p className="font-black text-indigo-950 text-base">{selectedReportModal.leadsGenerated}</p>
              </div>
            </div>

            {/* Highlights, Blockers, Plan */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500">Key Highlights / Wins Today</span>
              <p className="text-slate-800 font-medium">{selectedReportModal.highlights}</p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-rose-800">Blockers / Issues</span>
              <p className="text-rose-950 font-medium">{selectedReportModal.blockers}</p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
              <span className="text-[10px] font-extrabold uppercase text-amber-900">Tomorrow's Plan</span>
              <p className="text-amber-950 font-medium">{selectedReportModal.nextDayPlan}</p>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => handleAcknowledgeReport(selectedReportModal.id)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs"
              >
                Acknowledge EOD Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
